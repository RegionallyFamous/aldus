<?php
declare(strict_types=1);
/**
 * Layout assembly handlers, block registration, and admin hookups.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
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
	$cache_key    = 'aldus_asm_' . substr(
		md5(
			wp_json_encode( compact( 'tokens', 'items', 'personality', 'reroll_count', 'custom_styles', 'section_label', 'active_theme', 'post_id' ) )
		),
		0,
		20
	);
	$cached_response = get_transient( $cache_key );
	if ( false !== $cached_response && is_array( $cached_response ) ) {
		return rest_ensure_response( $cached_response );
	}

	// Cache miss — compute all expensive theme values now.
	$palette    = aldus_get_theme_palette();
	$font_sizes = aldus_get_theme_font_sizes();
	$gradients  = aldus_get_theme_gradients();

	// Derive a per-personality seed so renderer variants differ across personalities.
	$personality_keys = array_keys( aldus_anchor_tokens() );
	$seed_index       = array_search( $personality, $personality_keys, true );
	$base_seed        = ( false !== $seed_index ) ? (int) $seed_index : 0;

	// Mix in reroll_count so that repeated re-rolls with the same token sequence
	// still produce different block variant picks.
	$layout_seed = $base_seed + $reroll_count * 37;

	// Precompute shared theme values so each renderer call doesn't repeat this work.
	$theme_ctx = array(
		'dark'     => aldus_pick_dark( $palette ),
		'light'    => aldus_pick_light( $palette ),
		'accent'   => aldus_pick_accent( $palette ),
		'large'    => aldus_pick_large_font( $font_sizes ),
		'medium'   => aldus_pick_medium_font( $font_sizes ),
		'gradient' => aldus_pick_gradient( $gradients ),
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
		if ( ! empty( $token_markup ) ) {
			$stripped_text = trim( wp_strip_all_tags( $token_markup ) );
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

	if ( '' === trim( $markup ) ) {
		$fallback_markup = aldus_render_fallback_markup( $items );
		if ( '' !== trim( $fallback_markup ) ) {
			$markup   = $fallback_markup;
			$sections = array(
				array(
					'token'  => 'fallback:generic',
					'blocks' => $fallback_markup,
				),
			);
		} else {
			aldus_record_assembly_error( $personality );
			return new WP_Error( 'empty_markup', __( 'Could not build markup for this layout. Try again.', 'aldus' ), array( 'status' => 422 ) );
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
		$fallback_markup = aldus_render_fallback_markup( $items );
		if ( '' !== trim( $fallback_markup ) ) {
			$markup   = $fallback_markup;
			$sections = array(
				array(
					'token'  => 'fallback:generic',
					'blocks' => $fallback_markup,
				),
			);
		} else {
			aldus_record_assembly_error( $personality );
			return new WP_Error( 'empty_markup', __( 'Could not build markup for this layout. Try again.', 'aldus' ), array( 'status' => 422 ) );
		}
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
	set_transient( $cache_key, $response_data, 5 * MINUTE_IN_SECONDS );

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
			$button_url  = '' !== $url ? $url : '#';
			$button_html = '<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="' . esc_url( $button_url ) . '">' . esc_html( $content ) . '</a></div>';
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
// Analytics — personality usage counters
// ---------------------------------------------------------------------------

/**
 * Increments the per-personality usage counter stored in wp_options.
 *
 * All counters are stored in a single `aldus_usage` option (an associative
 * array keyed by personality name) instead of one option per personality.
 * This keeps wp_options tidy: 1 row instead of 16+.
 * Fires the `aldus_layout_chosen` action so third-party code can hook in.
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response|WP_Error
 */
function aldus_handle_record_use( WP_REST_Request $request ): WP_REST_Response|WP_Error {
	$personality = sanitize_text_field( $request->get_param( 'personality' ) );

	if ( empty( $personality ) ) {
		return new WP_Error( 'missing_personality', __( 'Personality is required.', 'aldus' ), array( 'status' => 400 ) );
	}

	// Validate against the known personality list (including filtered additions).
	// This prevents arbitrary key injection into the consolidated option.
	$known = array_keys( aldus_anchor_tokens() );
	if ( ! in_array( $personality, $known, true ) ) {
		return new WP_Error( 'unknown_personality', __( 'Unknown personality.', 'aldus' ), array( 'status' => 400 ) );
	}

	$stats                = get_option( 'aldus_usage', array() );
	$stats[ $personality ] = ( isset( $stats[ $personality ] ) ? (int) $stats[ $personality ] : 0 ) + 1;
	$new_count            = $stats[ $personality ];
	$saved                = update_option( 'aldus_usage', $stats, false );

	if ( ! $saved ) {
		// update_option returns false when the value is unchanged or on DB failure.
		// Analytics is best-effort — proceed regardless.
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( "Aldus: could not update usage counter for {$personality}" );
		}
	}

	// Allow external hooks to react (e.g. third-party analytics integrations).
	do_action( 'aldus_layout_chosen', $personality );

	return rest_ensure_response(
		array(
			'success' => true,
			'count'   => $new_count,
		)
	);
}

// ---------------------------------------------------------------------------
// Public API — register_aldus_personality()
// ---------------------------------------------------------------------------

/** @var array<string, array{label: string, prompt: string}> */
$aldus_registered_personalities = array();

/**
 * Register a custom personality from a theme or plugin.
 *
 * The registered personality appears in the Aldus editor alongside the
 * built-in sixteen. Call this function on or after the `init` hook.
 *
 * @param string $slug            Unique machine-readable identifier.
 * @param string $label           Human-readable name shown in the editor UI.
 * @param string $prompt_fragment One-sentence style description appended to
 *                                the LLM prompt for this personality.
 */
function aldus_register_personality( string $slug, string $label, string $prompt_fragment ): void {
	global $aldus_registered_personalities;

	$safe_slug = sanitize_key( $slug );
	if ( '' === $safe_slug ) {
		_doing_it_wrong( __FUNCTION__, 'Personality slug must be a non-empty string.', '1.6.0' );
		return;
	}

	$aldus_registered_personalities[ $safe_slug ] = array(
		'label'  => sanitize_text_field( $label ),
		'prompt' => sanitize_text_field( $prompt_fragment ),
	);
}

/**
 * Returns all personalities registered via register_aldus_personality().
 *
 * @return array<string, array{label: string, prompt: string}>
 */
function aldus_get_registered_personalities(): array {
	global $aldus_registered_personalities;
	return (array) $aldus_registered_personalities;
}

// ---------------------------------------------------------------------------
// GET /aldus/v1/config — public configuration endpoint
// ---------------------------------------------------------------------------

/**
 * Registers the GET /aldus/v1/config endpoint.
 *
 * Called from aldus_register_rest_routes() via the rest_api_init hook.
 */
function aldus_register_config_route(): void {
	register_rest_route(
		'aldus/v1',
		'/config',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'aldus_handle_config',
			'permission_callback' => static function () {
				/**
				 * Filters the capability required to access GET /aldus/v1/config.
				 *
				 * Defaults to 'edit_posts'. Tighten to 'edit_theme_options' on
				 * multisite installations where Contributors should not see theme
				 * configuration details.
				 *
				 * @param string $capability WordPress capability slug.
				 */
				return current_user_can(
					apply_filters( 'aldus_config_capability', 'edit_posts' )
				);
			},
		)
	);
}
add_action( 'rest_api_init', 'aldus_register_config_route' );

/**
 * Handles GET /aldus/v1/config.
 *
 * Returns the current Aldus configuration: plugin version, all available
 * personalities (built-in + registered), and active theme layout settings.
 *
 * @return WP_REST_Response
 */
function aldus_handle_config(): WP_REST_Response {
	// Built-in personalities from the anchor map.
	$builtin       = array_keys( aldus_anchor_tokens() );
	$personalities = array_map(
		static function ( string $name ) {
			return array(
				'slug'   => sanitize_key( strtolower( str_replace( ' ', '-', $name ) ) ),
				'label'  => $name,
				'source' => 'builtin',
			);
		},
		$builtin
	);

	// Personalities registered via register_aldus_personality().
	foreach ( aldus_get_registered_personalities() as $slug => $data ) {
		$personalities[] = array(
			'slug'   => $slug,
			'label'  => $data['label'],
			'source' => 'registered',
		);
	}

	return rest_ensure_response(
		array(
			'version'       => ALDUS_VERSION,
			'personalities' => $personalities,
			'theme'         => array(
				'contentSize' => aldus_theme_content_size(),
				'wideSize'    => aldus_theme_wide_size(),
				'spacing'     => array(
					'sm' => aldus_theme_spacing( 'sm' ),
					'md' => aldus_theme_spacing( 'md' ),
					'lg' => aldus_theme_spacing( 'lg' ),
					'xl' => aldus_theme_spacing( 'xl' ),
				),
			),
		)
	);
}


// ---------------------------------------------------------------------------
// Block registration — moved from aldus.php
// ---------------------------------------------------------------------------

function aldus_register_block_category( mixed $categories ): mixed {
	if ( ! is_array( $categories ) ) {
		return $categories;
	}
	return array_merge(
		array(
			array(
				'slug'  => 'aldus',
				'title' => __( 'Aldus', 'aldus' ),
				'icon'  => 'table-col-after',
			),
		),
		$categories
	);
}

/**
 * Adds action links to the plugin row on the Plugins admin page.
 *
 * @param mixed $links Existing action links (array expected).
 * @return mixed
 */
function aldus_plugin_action_links( mixed $links ): mixed {
	if ( ! is_array( $links ) ) {
		return $links;
	}
	$welcome    = sprintf(
		'<a href="%s">%s</a>',
		esc_url( admin_url( 'admin.php?page=aldus-welcome' ) ),
		__( 'About', 'aldus' )
	);
	$how_to_use = sprintf(
		'<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>',
		'https://github.com/RegionallyFamous/aldus/wiki',
		__( 'Docs', 'aldus' )
	);
	return array_merge(
		array(
			'welcome'    => $welcome,
			'how_to_use' => $how_to_use,
		),
		$links
	);
}

/**
 * Issues _doing_it_wrong() notices if third-party code has attached callbacks
 * to Aldus filter hooks that may be renamed or removed in a future release.
 *
 * This is a no-op for all current hooks (none have been deprecated yet) but
 * establishes the pattern so that future renames can warn developers cleanly.
 */
function aldus_check_deprecated_filters(): void {
	/**
	 * Map of deprecated hook name => message describing the replacement.
	 * Populate this array when a hook is renamed or removed.
	 *
	 * Example:
	 * 'aldus_old_hook' => 'Use aldus_new_hook instead. See https://github.com/RegionallyFamous/aldus/wiki for migration notes.',
	 *
	 * @var array<string, string>
	 */
	$deprecated = array();

	foreach ( $deprecated as $hook => $message ) {
		if ( has_filter( $hook ) ) {
			// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $hook is an internal hook name, not user input.
			_doing_it_wrong(
				$hook,
				esc_html( $message ),
				'1.0.0'
			);
			// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
		}
	}
}

/**
 * Registers the Aldus block type, frontend style, and WebLLM assets.
 *
 * Reads block metadata from build/block.json (generated by @wordpress/scripts).
 * Also hooks aldus_webllm_modulepreload onto admin_head so the model chunk
 * starts downloading as soon as the editor opens.
 */
function aldus_register_block(): void {
	$build_path = ALDUS_PATH . 'build';
	if ( ! is_dir( $build_path ) || ! file_exists( $build_path . '/block.json' ) ) {
		return;
	}

	// Block registration — tiered by WP version for maximum efficiency.
	//   WP 6.8+: one call registers all blocks from the manifest, no separate
	//            register_block_type() needed (eliminates per-block filesystem reads).
	//   WP 6.7:  register metadata collection first, then register_block_type() still required.
	//   WP ≤ 6.6 or no manifest: plain register_block_type().
	$manifest = $build_path . '/blocks-manifest.php';
	if ( function_exists( 'wp_register_block_types_from_metadata_collection' ) && file_exists( $manifest ) ) {
		wp_register_block_types_from_metadata_collection( $build_path, $manifest );
	} elseif ( function_exists( 'wp_register_block_metadata_collection' ) && file_exists( $manifest ) ) {
		wp_register_block_metadata_collection( $build_path, $manifest );
		register_block_type( $build_path );
	} else {
		register_block_type( $build_path );
	}

	// Load a minimal frontend stylesheet only on pages that contain this block.
	// Passing 'path' lets WordPress inline the stylesheet above the fold rather
	// than emitting a <link> tag, which avoids a render-blocking request for
	// the small number of pages where this fires.
	wp_enqueue_block_style(
		'aldus/layout-generator',
		array(
			'handle' => 'aldus-frontend',
			'src'    => ALDUS_URL . 'build/frontend.css',
			'ver'    => ALDUS_VERSION,
			'path'   => ALDUS_PATH . 'build/frontend.css',
		)
	);

	// Defer the editor script — it is large and has no dependency that requires
	// synchronous execution.  The 'strategy' data key is respected by WP 6.3+.
	wp_script_add_data( 'aldus-aldus-layout-generator-editor-script', 'strategy', 'defer' );

	// Emit a modulepreload hint for the WebLLM runtime chunk so it starts
	// downloading as soon as the block editor is opened, before the user clicks
	// "Make it happen".
	add_action( 'admin_head', 'aldus_webllm_modulepreload' );

	// Register the WebLLM runtime as a native Script Module (WP 6.5+).
	// The edit.js dynamic import() checks for window.__aldusScriptModules and
	// uses the module URL from there when available, falling back to the webpack
	// chunk for older WordPress versions.
	if ( function_exists( 'wp_register_script_module' ) ) {
		wp_register_script_module(
			'@aldus/webllm-runtime',
			ALDUS_URL . 'build/692.js',
			array(),
			ALDUS_VERSION
		);

		// Register the front-end Interactivity API store (WP 6.5+).
		// block.json declares this via viewScriptModule so WordPress loads it
		// automatically on pages that contain an Aldus-generated block.
		if ( file_exists( ALDUS_PATH . 'build/frontend-interactivity.js' ) ) {
			wp_register_script_module(
				'@aldus/interactivity',
				ALDUS_URL . 'build/frontend-interactivity.js',
				array( '@wordpress/interactivity' ),
				ALDUS_VERSION
			);
		}
		// Surface the module URL to the editor script via an inline script.
		wp_add_inline_script(
			'aldus-aldus-layout-generator-editor-script',
			'window.__aldusScriptModules = window.__aldusScriptModules || {};' .
			' window.__aldusScriptModules["@aldus/webllm-runtime"] = ' .
			wp_json_encode( ALDUS_URL . 'build/692.js' ) . ';',
			'before'
		);
	}

	// Load block CSS only when the block is present on the page rather than
	// unconditionally on every front-end request (WP 6.8+).
	add_filter( 'should_load_block_assets_on_demand', '__return_true' );
}

// ---------------------------------------------------------------------------
// Block editor capability settings
// ---------------------------------------------------------------------------

add_filter(
	'block_editor_settings_all',
	static function ( array $settings ): array {
		// Only editors and above can lock or unlock Aldus-generated layouts.
		// Contributors and authors see content-only editing and cannot add
		// new block-locking rules of their own.
		$settings['canLockBlocks'] = current_user_can( 'edit_others_posts' );
		return $settings;
	}
);

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
function aldus_record_assembly_error( string $personality ): void {
	$key     = 'aldus_errors_' . strtolower( sanitize_html_class( $personality ) );
	$current = (int) get_option( $key, 0 );
	update_option( $key, $current + 1, false );
}

// ---------------------------------------------------------------------------
// Health check endpoint
// ---------------------------------------------------------------------------

/**
 * Registers the GET /aldus/v1/health endpoint.
 */
function aldus_register_health_route(): void {
	register_rest_route(
		'aldus/v1',
		'/health',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'aldus_handle_health',
			'permission_callback' => static function () {
				return current_user_can( 'manage_options' );
			},
		)
	);
}
add_action( 'rest_api_init', 'aldus_register_health_route' );

/**
 * Handles GET /aldus/v1/health.
 *
 * Returns plugin version, server environment, object-cache status, theme
 * configuration summary, personality count, and per-personality error rates.
 * Requires manage_options so it is accessible only to site administrators.
 *
 * @return WP_REST_Response
 */
function aldus_handle_health(): WP_REST_Response {
	$personalities = array_keys( aldus_anchor_tokens() );

	// Build per-personality error counts from stored options.
	$error_counts = array();
	foreach ( $personalities as $name ) {
		$key = 'aldus_errors_' . strtolower( sanitize_html_class( $name ) );
		$n   = (int) get_option( $key, 0 );
		if ( $n > 0 ) {
			$error_counts[ $name ] = $n;
		}
	}

	return rest_ensure_response(
		array(
			'version'       => ALDUS_VERSION,
			'php'           => PHP_VERSION,
			'wp'            => get_bloginfo( 'version' ),
			'object_cache'  => wp_using_ext_object_cache(),
			'theme'         => get_stylesheet(),
			'palette_size'  => count( aldus_get_theme_palette() ),
			'font_sizes'    => count( aldus_get_theme_font_sizes() ),
			'personalities' => count( $personalities ),
			'error_counts'  => $error_counts,
		)
	);
}

// ---------------------------------------------------------------------------
// WebLLM module preload
// ---------------------------------------------------------------------------

/**
 * Emits <link rel="modulepreload"> and <link rel="prefetch"> hints for the
 * WebLLM runtime chunk so the browser starts fetching the model as soon as
 * the block editor opens — before the user clicks "Make it happen".
 *
 * Hooked onto admin_head by aldus_register_block().
 */
function aldus_webllm_modulepreload(): void {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( ! $screen || ! $screen->is_block_editor() ) {
		return;
	}
	$chunk_url = ALDUS_URL . 'build/692.js';
	// modulepreload for modern browsers; prefetch as fallback for older ones.
	printf(
		'<link rel="modulepreload" href="%1$s">' . "\n" .
		'<link rel="prefetch" as="script" href="%1$s">' . "\n",
		esc_url( $chunk_url )
	);
}
