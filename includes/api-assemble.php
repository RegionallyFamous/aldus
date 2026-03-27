<?php
declare(strict_types=1);
/**
 * Layout assembly endpoint — /assemble handler, fallback renderer, error tracking.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ---------------------------------------------------------------------------
// Session theme context
// ---------------------------------------------------------------------------

/**
 * Returns the assembled theme context array, computed once per PHP process.
 *
 * PHP-FPM reuses worker processes across multiple HTTP requests, so caching
 * the palette/fonts/gradients in a static variable means the object-cache
 * round-trips are only paid for the first request that a given worker handles.
 * Requests within the same concurrency-4 batch that share a worker skip the
 * 11 wp_cache_get calls entirely.
 *
 * The static is intentionally NOT cleared when the theme changes: that is a
 * deploy-level event and any running worker will finish its in-flight requests
 * before being recycled.
 *
 * @return array{
 *   palette:        array,
 *   font_sizes:     array,
 *   gradients:      array,
 *   shadows:        array,
 *   font_families:  array,
 *   heading_font:   string|null,
 *   cover_overlay:  string|null,
 *   section_styles: array,
 *   dark:           string,
 *   light:          string,
 *   accent:         string,
 *   large:          string,
 *   medium:         string,
 *   gradient:       string,
 *   shadow_soft:    string,
 *   shadow_deep:    string
 * }
 */
function aldus_get_session_theme_context(): array {
	static $ctx = null;
	if ( null !== $ctx ) {
		return $ctx;
	}
	$palette        = aldus_get_theme_palette();
	$font_sizes     = aldus_get_theme_font_sizes();
	$gradients      = aldus_get_theme_gradients();
	$shadows        = aldus_get_theme_shadows();
	$font_families  = aldus_get_theme_font_families();
	$heading_font   = aldus_get_theme_heading_font_slug();
	$cover_overlay  = aldus_get_theme_cover_overlay();
	$section_styles = aldus_get_theme_section_styles();
	$ctx            = array(
		'palette'        => $palette,
		'font_sizes'     => $font_sizes,
		'gradients'      => $gradients,
		'shadows'        => $shadows,
		'font_families'  => $font_families,
		'heading_font'   => $heading_font,
		'cover_overlay'  => $cover_overlay,
		'section_styles' => $section_styles,
		'dark'           => aldus_pick_dark( $palette ),
		'light'          => aldus_pick_light( $palette ),
		'accent'         => aldus_pick_accent( $palette ),
		'large'          => aldus_pick_large_font( $font_sizes ),
		'medium'         => aldus_pick_medium_font( $font_sizes ),
		'gradient'       => aldus_pick_gradient( $gradients ),
		'shadow_soft'    => aldus_pick_shadow( $shadows, 'soft' ),
		'shadow_deep'    => aldus_pick_shadow( $shadows, 'deep' ),
	);
	return $ctx;
}

// ---------------------------------------------------------------------------
// Assemble handler
// ---------------------------------------------------------------------------

/**
 * /assemble handler — assembles block markup from a pre-computed token list.
 * No LLM call here; the browser ran the model and sent us the result.
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response|WP_Error
 */
function aldus_handle_assemble( WP_REST_Request $request ): WP_REST_Response|WP_Error {
	$start_time = microtime( true );

	// Fast-path: check a raw-input cache key BEFORE any sanitization or anchor
	// enforcement.  On re-rolls and re-generations the browser sends identical JSON,
	// so this saves ~91 lines of PHP work per request on cache hits.
	// TTL is 4 minutes — slightly shorter than the post-sanitization key (5 min) so
	// stale raw entries always expire first.
	$raw_items       = $request->get_param( 'items' );
	$raw_personality = $request->get_param( 'personality' );
	$raw_tokens      = $request->get_param( 'tokens' );
	$raw_reroll      = (int) $request->get_param( 'reroll_count' );
	$raw_post_id     = (int) $request->get_param( 'post_id' );
	$raw_theme       = get_stylesheet();
	$raw_build_hash  = defined( 'ALDUS_BUILD_HASH' ) ? ALDUS_BUILD_HASH : '';
	// Including the user ID in both cache keys prevents cross-user cache
	// poisoning: a malicious authenticated user could craft items/tokens that
	// produce harmful markup, cache it, and have another user on the same post
	// hit the same key.  Per-user keys make that impossible at the cost of a
	// lower cache-hit rate on multi-author sites.
	$raw_user_id   = get_current_user_id();
	$raw_cache_key = 'aldus_raw_' . substr(
		md5(
			wp_json_encode(
				compact(
					'raw_items',
					'raw_personality',
					'raw_tokens',
					'raw_reroll',
					'raw_post_id',
					'raw_theme',
					'raw_build_hash',
					'raw_user_id'
				)
			)
		),
		0,
		20
	);
	$raw_cached    = get_transient( $raw_cache_key );
	if ( false !== $raw_cached && is_array( $raw_cached ) ) {
		return rest_ensure_response( $raw_cached );
	}

	// Items arrive pre-sanitized by the route's sanitize_callback. Re-run sanitization
	// here as defense-in-depth: this guards against any path that bypasses the REST
	// layer (e.g. direct PHP calls in tests or future internal callers).
	$items       = array_values(
		array_filter(
			array_map(
				'aldus_sanitize_item',
				(array) $request->get_param( 'items' )
			),
			fn( $item ) => is_array( $item ) && ! empty( $item['type'] )
		)
	);
	$personality = $request->get_param( 'personality' );
	// Sanitize each token; filter out any that reduced to empty strings.
	$tokens = array_values(
		array_filter(
			array_map( 'aldus_sanitize_token', (array) $request->get_param( 'tokens' ) )
		)
	);

	// Build manifest so anchor-enforcement knows what content is available.
	$manifest = array();
	foreach ( $items as $item ) {
		if ( ! is_array( $item ) || empty( $item['type'] ) ) {
			continue;
		}
		$manifest[ $item['type'] ] = ( $manifest[ $item['type'] ] ?? 0 ) + 1;
	}

	// Enforce structural anchors for this personality (same logic as /generate).
	$tokens = aldus_enforce_anchors( $personality, $tokens, $manifest );

	if ( empty( $tokens ) ) {
		return new WP_Error( 'empty_tokens', __( 'No valid tokens after anchor enforcement.', 'aldus' ), array( 'status' => 400 ) );
	}

	/**
	 * Filter the pruned token sequence for a personality just before block rendering.
	 *
	 * @param string[] $tokens      Ordered, pruned token list.
	 * @param string   $personality Personality name (e.g. "Dispatch").
	 * @param array    $items       Sanitized content items.
	 */
	$tokens = (array) apply_filters( 'aldus_tokens_before_render', $tokens, $personality, $items );
	// Re-sanitize after filter — third-party code could inject arbitrary strings.
	$valid_set = array_flip( aldus_valid_tokens() );
	$tokens    = array_values(
		array_filter(
			array_map( 'aldus_sanitize_token', $tokens ),
			fn( string $t ) => $t !== '' && isset( $valid_set[ $t ] )
		)
	);

	// Read cheap request params early so they are available for the cache key.
	$reroll_count  = (int) $request->get_param( 'reroll_count' );
	$custom_styles = (array) $request->get_param( 'custom_styles' );
	$section_label = sanitize_text_field( (string) $request->get_param( 'section_label' ) );
	$post_id       = (int) $request->get_param( 'post_id' );

	// Filter tokens based on which theme appearance tools are enabled.
	// This prevents Aldus from generating blocks the user can't edit within
	// their theme's declared constraints.  Done before the cache key so the
	// filtered token list is what gets hashed.
	$appearance = aldus_get_theme_appearance_tools();
	if ( ! $appearance['border_width'] ) {
		$tokens = array_values( array_diff( $tokens, array( 'group:border-box' ) ) );
	}
	if ( ! $appearance['color_background'] ) {
		$no_bg_tokens = array( 'group:dark', 'group:accent', 'group:light-alt', 'group:gradient-full' );
		$tokens       = array_values( array_diff( $tokens, $no_bg_tokens ) );
	}

	// Check assembly cache BEFORE any expensive theme work (palette, fonts, gradients,
	// style rules). Cache hits skip all of that computation entirely.
	// TTL: 5 minutes. Key includes every input that affects the output, including the
	// active theme (get_stylesheet) and post_id so theme switches and per-post
	// featured images never serve stale markup.
	$active_theme = get_stylesheet();
	// Including ALDUS_BUILD_HASH (injected by the build script) invalidates
	// cached markup whenever the renderer output format changes, even if the
	// plugin version number stays the same (e.g. during local development).
	$build_hash      = defined( 'ALDUS_BUILD_HASH' ) ? ALDUS_BUILD_HASH : '';
	$user_id         = get_current_user_id();
	$cache_key       = 'aldus_asm_' . substr(
		md5(
			wp_json_encode(
				compact(
					'tokens',
					'items',
					'personality',
					'reroll_count',
					'custom_styles',
					'section_label',
					'active_theme',
					'post_id',
					'build_hash',
					'user_id'
				)
			)
		),
		0,
		20
	);
	$cached_response = get_transient( $cache_key );
	if ( false !== $cached_response && is_array( $cached_response ) ) {
		return rest_ensure_response( $cached_response );
	}

	// Cache miss — load theme context (static-cached per process) and render.
	$session_theme = aldus_get_session_theme_context();
	$palette       = $session_theme['palette'];
	$font_sizes    = $session_theme['font_sizes'];
	$gradients     = $session_theme['gradients'];

	// Derive a per-personality seed so renderer variants differ across personalities.
	$personality_keys = array_keys( aldus_anchor_tokens() );
	$seed_index       = array_search( $personality, $personality_keys, true );
	$base_seed        = ( false !== $seed_index ) ? (int) $seed_index : 0;

	// Mix in reroll_count so that repeated re-rolls with the same token sequence
	// still produce different block variant picks.
	$layout_seed = $base_seed + $reroll_count * 37;

	// Precompute shared theme values from the session context.
	$theme_ctx = array(
		'dark'           => $session_theme['dark'],
		'light'          => $session_theme['light'],
		'accent'         => $session_theme['accent'],
		'large'          => $session_theme['large'],
		'medium'         => $session_theme['medium'],
		'gradient'       => $session_theme['gradient'],
		'shadow_soft'    => $session_theme['shadow_soft'],
		'shadow_deep'    => $session_theme['shadow_deep'],
		'heading_font'   => $session_theme['heading_font'],
		'cover_overlay'  => $session_theme['cover_overlay'],
		'section_styles' => $session_theme['section_styles'],
	);

	$style_rules   = aldus_personality_style_rules();
	$style_ctx     = $style_rules[ $personality ] ?? array();
	$token_weights = aldus_token_weights();

	$use_bindings = true;

	$dist = new Aldus_Content_Distributor( $items );
	$dist->prepare();

	// Build the static parts of context once; only rhythm changes per token.
	$base_context = array(
		'theme'         => $theme_ctx,
		'style'         => $style_ctx,
		'manifest'      => $manifest,
		'use_bindings'  => $use_bindings,
		'custom_styles' => $custom_styles,
		'post_id'       => $post_id,
		'section_label' => $section_label,
	);

	$markup     = '';
	$sections   = array();
	$prev_heavy = false;
	foreach ( $tokens as $index => $token ) {
		$context           = $base_context;
		$context['rhythm'] = array( 'prev_heavy' => $prev_heavy );
		$token_markup      = aldus_render_block_token( $token, $dist, $palette, $font_sizes, $index, $layout_seed, $context );

		// Skip tokens that produced markup with no visible text AND no visual
		// block type (image, cover, gallery, etc.).  This prevents empty
		// placeholders — e.g. a cover rendered without an image or headline —
		// from silently inflating the layout with invisible whitespace.
		// HTML comments (<!-- ... -->) are stripped before the text check because
		// wp_strip_all_tags() does not remove them, so a comment-only string
		// would pass the empty check and add an invisible spacer section.
		// Short-circuit: markup longer than 100 chars always has visible content —
		// a Cover block with inner blocks is typically 500+ chars, so the strip
		// and regex are only needed for suspiciously short output.
		if ( ! empty( $token_markup ) && strlen( $token_markup ) < 100 ) {
			$stripped_text = trim(
				wp_strip_all_tags(
					preg_replace( '/<!--.*?-->/s', '', $token_markup )
				)
			);
			$has_visual    = (bool) preg_match(
				'/wp-block-(?:image|cover|gallery|embed|video|separator|spacer)/',
				$token_markup
			);
			if ( '' === $stripped_text && ! $has_visual ) {
				continue;
			}
		}

		$markup .= $token_markup;
		// Trim once and reuse to avoid double trim() per iteration.
		$token_markup_trimmed = ltrim( $token_markup );
		if ( '' !== $token_markup_trimmed ) {
			$sections[] = array(
				'token'  => $token,
				'blocks' => $token_markup,
			);
			$weight     = $token_weights[ $token ] ?? 'reading';
			$prev_heavy = ( 'heavy' === $weight || 'visual' === $weight );
		}
	}

	// Guard: all token renderers ran but every section contains only whitespace
	// or HTML comments with no visible text and no visual block.  This catches
	// the case where the pruning system strips all meaningful tokens leaving only
	// spacers, producing a layout that renders as blank whitespace.
	if ( ! empty( $sections ) ) {
		$visible_sections = array_filter(
			$sections,
			static function ( array $s ): bool {
				// Short-circuit: long markup always has visible content.
				if ( strlen( $s['blocks'] ) >= 100 ) {
					return true;
				}
				$stripped   = trim(
					wp_strip_all_tags(
						preg_replace( '/<!--.*?-->/s', '', $s['blocks'] )
					)
				);
				$has_visual = (bool) preg_match(
					'/wp-block-(?:image|cover|gallery|embed|video)/',
					$s['blocks']
				);
				return '' !== $stripped || $has_visual;
			}
		);
		if ( empty( $visible_sections ) ) {
			aldus_record_assembly_error( $personality );
			return new WP_Error(
				'empty_visual_layout',
				__( 'This style produced no visible content for your items. Try a different style or add more content.', 'aldus' ),
				array( 'status' => 422 )
			);
		}
	}

	if ( '' === trim( $markup ) ) {
		// The token sequence produced no output for the given items (e.g. a
		// 'gallery' token with no image items, or a 'paragraph' token with
		// only 'details' items).  Rather than failing immediately, fall back
		// to a simple block-per-item rendering so the caller always gets
		// usable markup.  Only return 422 if even the fallback is empty.
		$markup = aldus_render_fallback_markup( $items );
		if ( '' === trim( $markup ) ) {
			aldus_record_assembly_error( $personality );
			return new WP_Error(
				'empty_layout',
				__( 'This style couldn\'t arrange your content well. Try a different style or add more content.', 'aldus' ),
				array( 'status' => 422 )
			);
		}
	}

	/**
	 * Filter the fully assembled block markup string for a layout.
	 *
	 * Must return a non-empty string of serialized WordPress block markup.
	 * Returning an empty string will cause a 422 error to be returned to the client.
	 *
	 * @param string   $markup      Serialized block markup ready for insertion.
	 * @param string   $personality Personality name.
	 * @param array    $items       Sanitized content items.
	 */
	$markup = (string) apply_filters( 'aldus_assembled_blocks', $markup, $personality, $items );
	// Guard against filters that zero out the markup.
	if ( '' === trim( $markup ) ) {
		aldus_record_assembly_error( $personality );
		return new WP_Error(
			'empty_layout',
			__( 'This style couldn\'t arrange your content well. Try a different style or add more content.', 'aldus' ),
			array( 'status' => 422 )
		);
	}

	/**
	 * Fires after a layout has been successfully assembled and is about to be returned.
	 *
	 * Useful for analytics, logging, or caching assembled layouts.
	 *
	 * @param string   $personality Personality name.
	 * @param string[] $tokens      Final token list used.
	 * @param string   $markup      Assembled block markup.
	 */
	do_action( 'aldus_layout_generated', $personality, $tokens, $markup );

	$response_data = array(
		'success'   => true,
		'label'     => $personality,
		'blocks'    => $markup,
		'tokens'    => $tokens,
		'sections'  => $sections,
		'timing_ms' => round( ( microtime( true ) - $start_time ) * 1000, 1 ),
	);

	// In WP_DEBUG mode, validate the markup and log any issues before caching.
	if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
		require_once ALDUS_PATH . 'includes/validate-blocks.php';
		$validation_errors = aldus_validate_assembled_markup( $markup );
		if ( ! empty( $validation_errors ) ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( 'Aldus block validation errors for ' . $personality . ":\n" . implode( "\n", $validation_errors ) );
		}
	}

	// Cache the assembled response for 5 minutes to serve repeat requests instantly.
	// Also populate the raw-input cache (4 min) so future identical requests are
	// served before any sanitization work runs.
	set_transient( $cache_key, $response_data, 5 * MINUTE_IN_SECONDS );
	set_transient( $raw_cache_key, $response_data, 4 * MINUTE_IN_SECONDS );

	return rest_ensure_response( $response_data );
}


/**
 * Renders a single sanitized item as a generic core block.
 *
 * This is a safety net for cases where the chosen token sequence cannot
 * produce any markup for the current item mix.
 *
 * @param array<string, mixed> $item Sanitized item.
 * @return string Serialized block markup.
 */
function aldus_render_fallback_item( array $item ): string {
	$type    = sanitize_key( (string) ( $item['type'] ?? '' ) );
	$content = trim( (string) ( $item['content'] ?? '' ) );
	$url     = esc_url( (string) ( $item['url'] ?? '' ) );

	// All cases use serialize_block() so block comment delimiters are generated
	// canonically (correct attribute JSON encoding, escaped -- sequences, etc.).
	switch ( $type ) {
		case 'headline':
			if ( '' === $content ) {
				return '';
			}
			return serialize_block(
				array(
					'blockName'    => 'core/heading',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<h2 class="wp-block-heading">' . esc_html( $content ) . '</h2>' ),
				)
			);

		case 'subheading':
			if ( '' === $content ) {
				return '';
			}
			return serialize_block(
				array(
					'blockName'    => 'core/heading',
					'attrs'        => array( 'level' => 3 ),
					'innerBlocks'  => array(),
					'innerContent' => array( '<h3 class="wp-block-heading">' . esc_html( $content ) . '</h3>' ),
				)
			);

		case 'paragraph':
		case 'details':
			if ( '' === $content ) {
				return '';
			}
			return serialize_block(
				array(
					'blockName'    => 'core/paragraph',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<p>' . esc_html( $content ) . '</p>' ),
				)
			);

		case 'quote':
			if ( '' === $content ) {
				return '';
			}
			return serialize_block(
				array(
					'blockName'    => 'core/quote',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<blockquote class="wp-block-quote"><p>' . esc_html( $content ) . '</p></blockquote>' ),
				)
			);

		case 'image':
			if ( '' === $url ) {
				return '';
			}
			return serialize_block(
				array(
					'blockName'    => 'core/image',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<figure class="wp-block-image"><img src="' . $url . '" alt="' . esc_attr( $content ) . '"/></figure>' ),
				)
			);

		case 'cta':
			if ( '' === $content ) {
				return '';
			}
			$button_url   = '' !== $url ? $url : '#';
			$button_html  = '<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="' . esc_url( $button_url ) . '">' . esc_html( $content ) . '</a></div>';
			$button_block = array(
				'blockName'    => 'core/button',
				'attrs'        => array(),
				'innerBlocks'  => array(),
				'innerContent' => array( $button_html ),
			);
			return serialize_block(
				array(
					'blockName'    => 'core/buttons',
					'attrs'        => array(),
					'innerBlocks'  => array( $button_block ),
					'innerContent' => array( '<div class="wp-block-buttons">', null, '</div>' ),
				)
			);

		case 'list':
			$lines = preg_split( '/\r\n|\r|\n/', $content ) ?: array();
			$lines = array_values( array_filter( array_map( 'trim', $lines ) ) );
			if ( empty( $lines ) ) {
				return '';
			}
			$list_items = implode(
				'',
				array_map(
					static fn( string $line ): string => '<li>' . esc_html( $line ) . '</li>',
					$lines
				)
			);
			return serialize_block(
				array(
					'blockName'    => 'core/list',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<ul class="wp-block-list">' . $list_items . '</ul>' ),
				)
			);

		case 'video':
			if ( '' === $url ) {
				return '';
			}
			return serialize_block(
				array(
					'blockName'    => 'core/embed',
					'attrs'        => array(
						'url'  => $url,
						'type' => 'video',
					),
					'innerBlocks'  => array(),
					'innerContent' => array( '<figure class="wp-block-embed is-type-video"><div class="wp-block-embed__wrapper">' . esc_html( $url ) . '</div></figure>' ),
				)
			);

		case 'table':
			if ( '' === $content ) {
				return '';
			}
			return serialize_block(
				array(
					'blockName'    => 'core/preformatted',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<pre class="wp-block-preformatted">' . esc_html( $content ) . '</pre>' ),
				)
			);

		case 'gallery':
			$gallery_urls = array();
			if ( isset( $item['urls'] ) && is_array( $item['urls'] ) ) {
				$gallery_urls = array_values(
					array_filter(
						array_map(
							static fn( string $gallery_url ): string => esc_url( $gallery_url ),
							$item['urls']
						)
					)
				);
			}
			if ( empty( $gallery_urls ) && '' !== $url ) {
				$gallery_urls = array( $url );
			}
			if ( empty( $gallery_urls ) ) {
				return '';
			}
			$images = implode(
				'',
				array_map(
					static fn( string $gallery_url ): string => '<figure class="wp-block-image size-large"><img src="' . esc_url( $gallery_url ) . '" alt=""/></figure>',
					array_slice( $gallery_urls, 0, 6 )
				)
			);
			return serialize_block(
				array(
					'blockName'    => 'core/gallery',
					'attrs'        => array(
						'columns'   => 3,
						'imageCrop' => true,
					),
					'innerBlocks'  => array(),
					'innerContent' => array( '<figure class="wp-block-gallery has-nested-images columns-default is-cropped">' . $images . '</figure>' ),
				)
			);

		case 'code':
			if ( '' === $content ) {
				return '';
			}
			return serialize_block(
				array(
					'blockName'    => 'core/code',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<pre class="wp-block-code"><code>' . esc_html( $content ) . '</code></pre>' ),
				)
			);

		default:
			return '';
	}
}

/**
 * Builds generic fallback markup from sanitized items.
 *
 * @param array<int, array<string, mixed>> $items Sanitized items.
 * @return string Serialized block markup.
 */
function aldus_render_fallback_markup( array $items ): string {
	$blocks = array();
	foreach ( $items as $item ) {
		$block = aldus_render_fallback_item( $item );
		if ( '' !== trim( $block ) ) {
			$blocks[] = $block;
		}
	}

	return implode( "\n", $blocks );
}

// ---------------------------------------------------------------------------
// Error rate tracking
// ---------------------------------------------------------------------------

/**
 * Increments the per-personality assembly error counter stored in wp_options.
 *
 * Counter key format: `aldus_errors_{name}` (e.g. `aldus_errors_dispatch`).
 * Errors are exposed by the /health endpoint so unusual failure rates are
 * visible without digging through server logs.
 *
 * @param string $personality Personality name.
 */
/**
 * Atomically increments the assembly error counter for a given personality.
 *
 * Uses a direct SQL UPDATE (CAST + 1) instead of the non-atomic
 * get_option / update_option pattern.  Under 4-concurrent requests hitting
 * the same personality, a read–modify–write cycle loses increments; a single
 * UPDATE to the options row is serialised by InnoDB row-locking.
 *
 * Falls back to add_option on the first occurrence (when the row doesn't
 * exist yet and UPDATE affects 0 rows).
 */
function aldus_record_assembly_error( string $personality ): void {
	global $wpdb;
	$key     = 'aldus_errors_' . strtolower( sanitize_html_class( $personality ) );
	$updated = $wpdb->query(
		$wpdb->prepare(
			"UPDATE {$wpdb->options}
			 SET    option_value = CAST( option_value AS UNSIGNED ) + 1
			 WHERE  option_name  = %s",
			$key
		)
	);
	if ( ! $updated ) {
		// Row doesn't exist yet — add_option is safe here: if two concurrent
		// requests both pass the $updated === 0 check, the second add_option
		// is a no-op (WordPress ignores duplicate option inserts).
		add_option( $key, 1, '', false );
	}
}
