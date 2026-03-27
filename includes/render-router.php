<?php
declare(strict_types=1);
/**
 * Token renderer dispatcher — maps token strings to renderer functions.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ---------------------------------------------------------------------------
// Token renderer dispatcher
// ---------------------------------------------------------------------------

/**
 * Renders a single block token into serialized WordPress block markup.
 * Returns an empty string if the token has no content to render.
 *
 * @param string                    $token
 * @param Aldus_Content_Distributor $dist
 * @param list<array{slug:string,color:string}> $palette
 * @param list<array{slug:string}>  $font_sizes
 * @param int                       $index        Position in the layout sequence.
 * @param int                       $layout_seed  Per-personality seed (0–N) for variant selection.
 * @param array                     $context      Optional art-direction context:
 *                                                  'theme'    — precomputed dark/light/accent/large/gradient
 *                                                  'style'    — personality art-direction rules
 *                                                  'rhythm'   — per-position rhythm hints
 *                                                  'manifest' — content-type counts for the whole request
 * @return string Serialized block markup.
 */
function aldus_render_block_token(
	string $token,
	Aldus_Content_Distributor $dist,
	array $palette,
	array $font_sizes,
	int $index = 0,
	int $layout_seed = 0,
	array $context = array()
): string {
	// Unpack precomputed theme values; fall back to live computation for
	// backward compatibility when called without a context.
	$theme         = $context['theme'] ?? array();
	$style         = $context['style'] ?? array();
	$rhythm        = $context['rhythm'] ?? array();
	$manifest      = $context['manifest'] ?? array();
	$use_bindings  = (bool) ( $context['use_bindings'] ?? false );
	$section_label = isset( $context['section_label'] ) ? (string) $context['section_label'] : '';

	$dark           = $theme['dark'] ?? aldus_pick_dark( $palette );
	$light          = $theme['light'] ?? aldus_pick_light( $palette );
	$accent         = $theme['accent'] ?? aldus_pick_accent( $palette );
	$large          = $theme['large'] ?? aldus_pick_large_font( $font_sizes );
	$gradient       = $theme['gradient'] ?? aldus_pick_gradient( aldus_get_theme_gradients() );
	$heading_font   = $theme['heading_font'] ?? null;
	$cover_overlay  = $theme['cover_overlay'] ?? null;
	$section_styles = $theme['section_styles'] ?? array();

	$s_align         = $style['align'] ?? 'left';
	$s_density       = $style['density'] ?? 'balanced';
	$s_contrast      = $style['contrast'] ?? 'medium';
	$s_accent        = $style['accent'] ?? 'restrained';
	$s_block_gap     = $style['blockGap'] ?? '1.5rem';
	$s_edges         = $style['edges'] ?? 'default';
	$s_separator     = $style['separator'] ?? 'wide';
	$s_interactivity = $style['interactivity'] ?? '';

	// Pre-compute Interactivity API data attribute strings.
	// Gated so the attributes are never emitted on WP < 6.5 where the
	// Interactivity API is not available.
	$wp_interactive_available = function_exists( 'wp_interactivity_data_wp_context' );

	// Parallax: applied to cover blocks.
	$ia_parallax = '';
	if ( $wp_interactive_available && str_contains( $s_interactivity, 'parallax' ) ) {
		$ia_parallax = ' data-wp-interactive="aldus"'
			. ' data-wp-on-window--scroll="actions.parallax"';
	}

	// Reveal on scroll: applied to full-width group sections.
	$ia_reveal = '';
	if ( $wp_interactive_available && str_contains( $s_interactivity, 'reveal' ) ) {
		$ia_reveal = ' data-wp-interactive="aldus"'
			. ' data-wp-on-window--scroll="actions.revealOnScroll"'
			. " data-wp-context='{\"revealed\":false}'"
			. ' style="opacity:0;transform:translateY(20px);'
			. 'transition:opacity 0.6s ease,transform 0.6s ease"';
	}

	// Count-up: applied to stat headings in row:stats blocks.
	$ia_countup = '';
	if ( $wp_interactive_available && str_contains( $s_interactivity, 'countup' ) ) {
		$ia_countup = ' data-wp-interactive="aldus"'
			. ' data-wp-watch="callbacks.countUp"'
			. " data-wp-context='{\"revealed\":false,\"counted\":false}'";
	}

	// Accordion: applied to details blocks.
	$ia_accordion = '';
	if ( $wp_interactive_available ) {
		$ia_accordion = ' data-wp-interactive="aldus"'
			. ' data-wp-watch="callbacks.animateDetails"';
	}

	// Compute border-radius from edges setting.
	$s_radius = '';
	if ( 'soft' === $s_edges ) {
		$s_radius = '8px';
	} elseif ( 'sharp' === $s_edges ) {
		$s_radius = '0';
	}

	$prev_heavy = $rhythm['prev_heavy'] ?? false;

	$has_quote = ( $manifest['quote'] ?? 0 ) > 0;
	$has_image = ( $manifest['image'] ?? 0 ) > 0;
	$has_list  = ( $manifest['list'] ?? 0 ) > 0;
	$has_cta   = ( $manifest['cta'] ?? 0 ) > 0;

	// Mixes layout_seed + index + personality style traits + rhythm context
	// so the same sequence looks visually different across personalities.
	$v_base  = $layout_seed + $index;
	$v_base += ( 'high' === $s_contrast ) ? 2 : 0;
	$v_base += ( 'centered' === $s_align ) ? 1 : 0;
	$v_base += ( 'airy' === $s_density ) ? 1 : 0;
	$v_base += $prev_heavy ? 3 : 0;

	$variant5 = aldus_variant_pick( $v_base, $token, 5 );
	$variant4 = aldus_variant_pick( $v_base, $token, 4 );
	$variant3 = aldus_variant_pick( $v_base, $token, 3 );
	$variant2 = aldus_variant_pick( $v_base, $token, 2 );

	switch ( $token ) {

		// ---- Cover blocks ----

		case 'cover:dark':
			// Content-aware: skip product-hero variant (3) if no CTA in manifest.
			$cv      = ( ! $has_cta && $variant5 === 3 ) ? 0 : $variant5;
			$post_id = (int) ( $context['post_id'] ?? 0 );
			return aldus_block_cover(
				$dist,
				$dark,
				60,
				$large,
				false,
				'Hero',
				$cv,
				$post_id,
				$ia_parallax,
				$s_radius,
				$heading_font,
				$cover_overlay
			);

		case 'cover:light':
			$cv      = ( ! $has_cta && $variant5 === 3 ) ? 1 : $variant5;
			$post_id = (int) ( $context['post_id'] ?? 0 );
			return aldus_block_cover(
				$dist,
				$light,
				30,
				$large,
				true,
				'Feature Cover',
				$cv,
				$post_id,
				$ia_parallax,
				$s_radius,
				$heading_font,
				null
			);

		case 'cover:minimal':
			$dark_hex = '';
			foreach ( $palette as $p ) {
				if ( ( $p['slug'] ?? '' ) === $dark ) {
					$dark_hex = $p['color'] ?? '';
					break;
				}
			}
			$is_light_dark = aldus_hex_luminance( $dark_hex ) > 0.5;
			return aldus_block_cover_minimal( $dist, $dark, $large, 'Minimal Cover', $heading_font, $is_light_dark );

		case 'cover:split':
			return aldus_block_cover_split( $dist, $large, 'Split Cover', $heading_font );

		// ---- Columns ----

		case 'columns:2-equal':
			// Content-aware: image pair only if images are in the manifest.
			$cv = ( ! $has_image && $variant5 === 4 ) ? 0 : $variant5;
			return aldus_block_columns_two_equal( $dist, 'Two Columns', $cv );

		case 'columns:28-72':
			// Alternate label side deterministically per occurrence using position + seed.
			$flip = (bool) aldus_variant_pick( $layout_seed, "28-72-flip:{$index}", 2 );
			return aldus_block_columns_asymmetric( $dist, $flip, 'Sidebar Layout', $variant3, $section_label );

		case 'columns:3-equal':
			return aldus_block_columns_three( $dist, $accent, 'Three Columns', $light );

		case 'columns:4-equal':
			return aldus_block_columns_four_equal( $dist, $accent, 'Four Columns' );

		// ---- Media-text ----

		case 'media-text:left':
			// Content-aware: list variant only if list content exists.
			$mv = ( ! $has_list && $variant4 === 3 ) ? 0 : $variant4;
			return aldus_block_media_text( $dist, 'left', 'Image Left', $mv );

		case 'media-text:right':
			$mv = ( ! $has_list && $variant4 === 3 ) ? 0 : $variant4;
			return aldus_block_media_text( $dist, 'right', 'Image Right', $mv );

		// ---- Group wrappers ----

		case 'group:dark-full':
			$dark_section_style = aldus_pick_section_style( $section_styles, 'dark' );
			return aldus_block_group(
				$dist,
				$dark,
				'white',
				true,
				'Dark Section',
				$variant3,
				$s_block_gap,
				$ia_reveal,
				$s_radius,
				$dark_section_style
			);

		case 'group:accent-full':
			$accent_section_style = aldus_pick_section_style( $section_styles, 'accent' );
			return aldus_block_group(
				$dist,
				$accent,
				'',
				false,
				'Accent Section',
				$variant3,
				$s_block_gap,
				$ia_reveal,
				$s_radius,
				$accent_section_style
			);

		case 'group:light-full':
			$light_section_style = aldus_pick_section_style( $section_styles, 'light' );
			return aldus_block_group(
				$dist,
				$light,
				'',
				false,
				'Light Section',
				$variant3,
				$s_block_gap,
				$ia_reveal,
				$s_radius,
				$light_section_style
			);

		case 'group:border-box':
			// Personality density: dense personalities prefer the CTA/list variant (1).
			$bv     = ( 'dense' === $s_density ) ? max( $variant2, 1 ) : $variant2;
			$shadow = $theme['shadow_soft'] ?? '';
			return aldus_block_group_border( $dist, 'Border Section', $bv, $s_block_gap, $shadow );

		case 'group:gradient-full':
			// Pronounced-accent personalities prefer the testimonial variant (1).
			$gv            = ( 'pronounced' === $s_accent && $has_quote ) ? 1 : $variant2;
			$gradient_shad = ( 'high' === $s_contrast && 'pronounced' === $s_accent )
				? ( $theme['shadow_deep'] ?? '' )
				: '';
			return aldus_block_group_gradient( $dist, $gradient, 'Gradient Section', $gv, $s_block_gap, $gradient_shad );

		// ---- Grid and row layouts ----

		case 'group:grid':
			return aldus_block_group_grid( $dist );

		case 'row:stats':
			return aldus_block_row_stats( $dist, $ia_countup );

		// ---- Pull quotes ----

		case 'pullquote:wide':
			return aldus_block_pullquote( $dist, $accent, 'solid-color', false, $context );

		case 'pullquote:full-solid':
			return aldus_block_pullquote( $dist, $dark, 'solid-color', true, $context );

		case 'pullquote:centered':
			return aldus_block_pullquote_centered( $dist );

		// ---- Headings ----

		case 'heading:h1':
			return aldus_block_heading( $dist, 1, 'headline', $use_bindings, '', $heading_font );

		case 'heading:h2':
			// High-contrast personalities get the theme's large font size on H2s for more drama.
			$h2_size = ( 'high' === $s_contrast ) ? ( $theme['large'] ?? '' ) : '';
			return aldus_block_heading( $dist, 2, 'subheading', $use_bindings, $h2_size, $heading_font );

		case 'heading:h3':
			return aldus_block_heading( $dist, 3, 'subheading', $use_bindings, '', $heading_font );

		case 'heading:display':
			return aldus_block_heading_display( $dist, $large, '', $heading_font );

		case 'heading:kicker':
			return aldus_block_heading_kicker( $dist, $large, '', $heading_font );

		// ---- Paragraphs ----

		case 'paragraph':
			return aldus_block_paragraph( $dist, false, $use_bindings );

		case 'paragraph:dropcap':
			return aldus_block_paragraph( $dist, true, $use_bindings );

		case 'paragraph:lead':
			return aldus_block_paragraph_lead( $dist, $theme );

		// ---- Images ----

		case 'image:wide':
			return aldus_block_image( $dist, 'wide', $s_radius );

		case 'image:full':
			return aldus_block_image( $dist, 'full', $s_radius );

		// ---- Quotes ----

		case 'quote':
			return aldus_block_quote( $dist );

		case 'quote:attributed':
			return aldus_block_quote_attributed( $dist );

		// ---- Lists ----

		case 'list':
			return aldus_block_list( $dist );

		// ---- Structural ----

		case 'separator':
			return aldus_block_separator( $accent, $s_separator );

		case 'spacer:small':
			$h = aldus_spacer_height( 'small' );
			return serialize_block(
				array(
					'blockName'    => 'core/spacer',
					'attrs'        => array( 'height' => $h ),
					'innerBlocks'  => array(),
					'innerContent' => array( "<div style=\"height:{$h}\" aria-hidden=\"true\" class=\"wp-block-spacer\"></div>" ),
				)
			) . "\n\n";

		case 'spacer:large':
			$h = aldus_spacer_height( 'large' );
			return serialize_block(
				array(
					'blockName'    => 'core/spacer',
					'attrs'        => array( 'height' => $h ),
					'innerBlocks'  => array(),
					'innerContent' => array( "<div style=\"height:{$h}\" aria-hidden=\"true\" class=\"wp-block-spacer\"></div>" ),
				)
			) . "\n\n";

		case 'spacer:xlarge':
			$h = aldus_spacer_height( 'xlarge' );
			return serialize_block(
				array(
					'blockName'    => 'core/spacer',
					'attrs'        => array( 'height' => $h ),
					'innerBlocks'  => array(),
					'innerContent' => array( "<div style=\"height:{$h}\" aria-hidden=\"true\" class=\"wp-block-spacer\"></div>" ),
				)
			) . "\n\n";

		case 'buttons:cta':
			return aldus_block_cta( $dist, $accent, $dark, $style, $use_bindings, false );

		// ---- Video ----

		case 'video:hero':
			return aldus_block_video_hero( $dist );

		case 'video:section':
			return aldus_block_video_section( $dist );

		// ---- Table ----

		case 'table:data':
			return aldus_block_table( $dist );

		// ---- Gallery ----

		case 'gallery:2-col':
			return aldus_block_gallery( $dist, 2, 'Gallery' );

		case 'gallery:3-col':
			return aldus_block_gallery( $dist, 3, 'Gallery' );

		// ---- FAQ / accordion ----

		case 'details:accordion':
			return aldus_block_details_accordion( $dist, $ia_accordion );

		// ---- Code ----

		case 'code:block':
			return aldus_block_code( $dist );

		default:
			return '';
	}
}
