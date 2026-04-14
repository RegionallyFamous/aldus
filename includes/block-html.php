<?php
declare(strict_types=1);
/**
 * Block HTML class and style helpers.
 *
 * Pure functions that produce the exact CSS class strings and inline styles
 * that WordPress's core block save() functions generate for a given set of
 * attributes.  Every structural class string in templates.php calls one of
 * these helpers so that a single edit here fixes the whole codebase when
 * WordPress changes a serialisation rule, and so that validate-blocks.php
 * can verify correctness without running WordPress.
 *
 * Rules are derived from WordPress 6.9 core block save() functions.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ---------------------------------------------------------------------------
// core/columns
// ---------------------------------------------------------------------------

/**
 * Returns the class string for the root <div> of a core/columns block.
 *
 * WordPress adds is-layout-flex and wp-block-columns-is-layout-flex at
 * render time via wp_render_layout_support_flag() — they must not appear
 * in saved innerContent markup.
 *
 * @param bool $stacked_on_mobile When false the "is-not-stacked-on-mobile" class is appended.
 */
function aldus_columns_classes( bool $stacked_on_mobile ): string {
	$base = 'wp-block-columns';
	return $stacked_on_mobile ? $base : $base . ' is-not-stacked-on-mobile';
}

// ---------------------------------------------------------------------------
// core/column
// ---------------------------------------------------------------------------

/**
 * Returns the class string for the inner <div> of a core/column block.
 *
 * WordPress adds is-layout-flow and wp-block-column-is-layout-flow at
 * render time — they must not appear in saved innerContent markup.
 *
 * @param string $bg_slug Optional background color slug.
 *                        When provided, has-background classes are appended.
 */
function aldus_column_classes( string $bg_slug = '' ): string {
	$base = 'wp-block-column';
	if ( $bg_slug !== '' ) {
		$safe  = sanitize_html_class( $bg_slug );
		$base .= " has-{$safe}-background-color has-background";
	}
	return $base;
}

/**
 * Returns the inline style value for a core/column <div>.
 *
 * @param string $width_pct Percentage width including the % sign, e.g. "50%".
 *                          Pass empty string to produce no style.
 */
function aldus_column_style( string $width_pct = '' ): string {
	return $width_pct !== '' ? "flex-basis:{$width_pct}" : '';
}

// ---------------------------------------------------------------------------
// core/cover
// ---------------------------------------------------------------------------

/**
 * Matches Gutenberg `isContentPositionCenter()` (cover/shared.js).
 */
function aldus_cover_is_content_position_center( string $content_position ): bool {
	$cp = strtolower( trim( $content_position ) );
	return '' === $cp || 'center center' === $cp || 'center' === $cp;
}

/**
 * Position classes for the cover root div (empty when center — the default in core save()).
 */
function aldus_cover_position_extra_classes( string $content_position ): string {
	if ( aldus_cover_is_content_position_center( $content_position ) ) {
		return '';
	}
	$slug = str_replace( ' ', '-', trim( $content_position ) );
	return 'has-custom-content-position is-position-' . $slug;
}

/**
 * `is-light` on the cover root when isDark is false (matches cover save.js clsx).
 *
 * @param array<string, mixed> $attrs Block attrs including optional isDark.
 * @return string ` is-light` or ''.
 */
function aldus_cover_is_light_class( array $attrs ): string {
	return ( isset( $attrs['isDark'] ) && false === $attrs['isDark'] ) ? ' is-light' : '';
}

/**
 * Returns the class string for the root <div> of a core/cover block.
 *
 * @param string $align            'full' or 'wide'.
 * @param string $content_position Space-separated position value, e.g. 'center center'
 *                                  or 'bottom left'. Pass '' to omit position classes.
 */
function aldus_cover_root_classes( string $align = 'full', string $content_position = '' ): string {
	$base = "wp-block-cover align{$align}";
	if ( $content_position !== '' ) {
		$extra = aldus_cover_position_extra_classes( $content_position );
		if ( '' !== $extra ) {
			$base .= ' ' . $extra;
		}
	}
	return $base;
}

/**
 * Matches Gutenberg `dimRatioToClass()` (packages/block-library/src/cover/shared.js):
 * 50 → no numeric class; otherwise `has-background-dim-{10 * round(ratio/10)}`.
 *
 * @param int $dim_ratio 0–100 overlay opacity percentage.
 * @return string e.g. `has-background-dim-40`, or '' when the numeric class is omitted (dim 50).
 */
function aldus_cover_dim_ratio_class( int $dim_ratio ): string {
	if ( 50 === $dim_ratio ) {
		return '';
	}
	$bucket = (int) ( 10 * round( $dim_ratio / 10 ) );
	return 'has-background-dim-' . $bucket;
}

/**
 * Returns the class string for the <span> background overlay inside a core/cover block.
 *
 * @param string $color_slug Theme color slug for the overlay.
 * @param int    $dim_ratio  0–100 overlay opacity percentage.
 */
function aldus_cover_bg_classes( string $color_slug, int $dim_ratio ): string {
	$safe      = sanitize_html_class( $color_slug );
	$dim_extra = aldus_cover_dim_ratio_class( $dim_ratio );
	$dim_part  = '' !== $dim_extra ? $dim_extra . ' ' : '';
	return "wp-block-cover__background has-{$safe}-background-color {$dim_part}has-background-dim";
}

/**
 * Full markup for the overlay <span> inside core/cover (matches cover save.js).
 *
 * With `overlayColor`, core adds `has-{slug}-background-color`. With only
 * `customOverlayColor` or `customGradient` (theme.json block overlay), colour
 * is applied via inline `style` — not a palette class.
 *
 * @param array<string, mixed> $attrs core/cover block attributes.
 */
function aldus_cover_background_span_html( array $attrs ): string {
	$dim_ratio = isset( $attrs['dimRatio'] ) ? (int) $attrs['dimRatio'] : 100;
	$dim_extra = aldus_cover_dim_ratio_class( $dim_ratio );

	$overlay_slug = isset( $attrs['overlayColor'] ) && is_string( $attrs['overlayColor'] ) ? $attrs['overlayColor'] : '';
	$custom_color = isset( $attrs['customOverlayColor'] ) && is_string( $attrs['customOverlayColor'] ) ? $attrs['customOverlayColor'] : '';
	$custom_grad  = isset( $attrs['customGradient'] ) && is_string( $attrs['customGradient'] ) ? $attrs['customGradient'] : '';

	$classes = array( 'wp-block-cover__background' );
	if ( '' !== $overlay_slug ) {
		$safe      = sanitize_html_class( $overlay_slug );
		$classes[] = "has-{$safe}-background-color";
	}
	if ( '' !== $dim_extra ) {
		$classes[] = trim( $dim_extra );
	}
	$classes[] = 'has-background-dim';

	$class_str = implode( ' ', array_filter( $classes ) );

	$style_parts = array();
	if ( '' !== $custom_grad ) {
		$style_parts[] = 'background:' . esc_attr( $custom_grad );
	} elseif ( '' === $overlay_slug && '' !== $custom_color ) {
		if ( preg_match( '/\b(?:linear|radial|conic)-gradient\s*\(/i', $custom_color ) ) {
			$style_parts[] = 'background:' . esc_attr( $custom_color );
		} else {
			$style_parts[] = 'background-color:' . esc_attr( $custom_color );
		}
	}

	$style_attr = array() !== $style_parts ? ' style="' . implode( ';', $style_parts ) . '"' : '';

	return '<span aria-hidden="true" class="' . esc_attr( $class_str ) . '"' . $style_attr . '></span>';
}

/**
 * Compiles a block `style` attribute array to inline CSS for saved innerContent.
 * Resolves `var:preset|spacing|*` to `var(--wp--preset--spacing--*)` like useBlockProps.save().
 *
 * @param array<string, mixed> $style Block `style` attribute (spacing, border, shadow, …).
 * @return string Minified declaration string without a wrapping selector, or ''.
 */
function aldus_block_inline_style_from_style_attr( array $style ): string {
	if ( ! function_exists( 'wp_style_engine_get_styles' ) || array() === $style ) {
		return '';
	}
	$out = wp_style_engine_get_styles( $style );
	$css = '';
	if ( ! empty( $out['css'] ) ) {
		$css = (string) $out['css'];
	} elseif ( ! empty( $out['declarations'] ) && class_exists( 'WP_Style_Engine' ) ) {
		$css = (string) WP_Style_Engine::compile_css( $out['declarations'], '' );
	}
	// aldus_validate_block_markup rule 9: saved style attrs omit the final semicolon.
	return '' === $css ? '' : rtrim( $css, ';' );
}

/**
 * Returns the class string for the inner container <div> of a core/cover block.
 *
 * WordPress 6.9 removed the is-layout-* classes from the inner container;
 * the save() function now emits only the base class.
 */
function aldus_cover_inner_classes(): string {
	return 'wp-block-cover__inner-container';
}

// ---------------------------------------------------------------------------
// core/group
// ---------------------------------------------------------------------------

/**
 * Returns the class string for the root <div> of a core/group block.
 *
 * The $layout_type parameter is kept for backward compatibility with all
 * callers but is no longer interpolated into the class string. WordPress
 * adds is-layout-{type} and wp-block-group-is-layout-{type} at render
 * time via wp_render_layout_support_flag(). The layout type must still be
 * included in the block's attrs array (e.g. 'layout' => ['type' => 'constrained']).
 *
 * @param string $layout_type    'constrained' or 'flow' — stored in block attrs only.
 * @param string $align          'full', 'wide', or '' for no alignment class.
 * @param string $bg_slug        Theme background color slug, or ''.
 * @param string $text_slug      Theme text color slug, or ''.
 * @param string $gradient_slug  Theme gradient preset slug, or ''.
 */
function aldus_group_classes(
	string $layout_type = 'constrained',
	string $align = '',
	string $bg_slug = '',
	string $text_slug = '',
	string $gradient_slug = ''
): string {
	$classes = 'wp-block-group';
	if ( $align !== '' ) {
		$classes .= " align{$align}";
	}
	if ( $bg_slug !== '' ) {
		$safe     = sanitize_html_class( $bg_slug );
		$classes .= " has-{$safe}-background-color has-background";
	}
	if ( $text_slug !== '' ) {
		$safe     = sanitize_html_class( $text_slug );
		$classes .= " has-{$safe}-color has-text-color";
	}
	if ( $gradient_slug !== '' ) {
		$safe     = sanitize_html_class( $gradient_slug );
		$classes .= " has-{$safe}-gradient-background has-background";
	}
	return $classes;
}

// ---------------------------------------------------------------------------
// core/buttons
// ---------------------------------------------------------------------------

/**
 * Returns the class string for the root <div> of a core/buttons block.
 *
 * WordPress adds is-layout-flex and wp-block-buttons-is-layout-flex at
 * render time — they must not appear in saved innerContent markup. The
 * layout config belongs in the block's attrs array only.
 */
function aldus_buttons_classes(): string {
	return 'wp-block-buttons';
}

// ---------------------------------------------------------------------------
// core/button
// ---------------------------------------------------------------------------

/**
 * Returns the class string for the <a> element inside a core/button block.
 *
 * WordPress 6.9 places wp-element-button at the END of the class list, after
 * any colour / utility classes.
 *
 * @param string $extra Additional classes to insert before wp-element-button (space-separated), or ''.
 */
function aldus_button_link_classes( string $extra = '' ): string {
	$base = 'wp-block-button__link';
	if ( $extra !== '' ) {
		return "{$base} {$extra} wp-element-button";
	}
	return "{$base} wp-element-button";
}

// ---------------------------------------------------------------------------
// core/heading
// ---------------------------------------------------------------------------

/**
 * Typography class for a preset font-family slug (matches core/heading save).
 *
 * When `fontFamily` is set on the block attrs, the saved `<h1>`–`<h6>` includes
 * `has-{slug}-font-family` so client validation matches serialized innerContent.
 *
 * @param string|null $slug Theme.json font-family preset slug, or null/empty for none.
 * @return string Leading space + class, or ''.
 */
function aldus_heading_font_family_class( ?string $slug ): string {
	if ( null === $slug || '' === $slug ) {
		return '';
	}
	return ' has-' . sanitize_html_class( $slug ) . '-font-family';
}

// ---------------------------------------------------------------------------
// core/media-text
// ---------------------------------------------------------------------------

/**
 * Returns the class string for the root <div> of a core/media-text block.
 *
 * @param string $position           'left' or 'right'.
 * @param bool   $stacked            Whether to add 'is-stacked-on-mobile'.
 * @param string $align              'full', 'wide', or '' for no alignment class.
 * @param string $vertical_alignment 'center', 'top', 'bottom', or '' for none.
 *                                   Must match the `verticalAlignment` block attr.
 */
function aldus_media_text_classes(
	string $position = 'left',
	bool $stacked = true,
	string $align = '',
	string $vertical_alignment = ''
): string {
	$classes = 'wp-block-media-text';
	if ( 'right' === $position ) {
		$classes .= ' has-media-on-the-right';
	}
	if ( $stacked ) {
		$classes .= ' is-stacked-on-mobile';
	}
	if ( $vertical_alignment !== '' ) {
		$classes .= " is-vertically-aligned-{$vertical_alignment}";
	}
	if ( $align !== '' ) {
		$classes .= " align{$align}";
	}
	return $classes;
}

// ---------------------------------------------------------------------------
// cover minHeight
// ---------------------------------------------------------------------------

/**
 * Returns an adaptive minHeight (px) for a core/cover block based on the
 * headline character count.
 *
 * Short headlines (≤ 40 chars) need more breathing room; long headlines need
 * less vertical space to avoid the text floating in a void.
 *
 * @param string       $headline_text The raw (un-escaped) headline string.
 * @param int          $fallback      Fallback when $headline_text is empty and $density is null.
 * @param string|null  $density       Personality density: airy / balanced / dense — shifts tier heights.
 */
function aldus_cover_min_height( string $headline_text, int $fallback = 420, ?string $density = null ): int {
	// mb_strlen for accurate character count with multi-byte (non-Latin) headlines.
	$len = mb_strlen( $headline_text );
	if ( $len === 0 ) {
		if ( null !== $density ) {
			return match ( $density ) {
				'airy' => 560,
				'dense' => 280,
				default => 420,
			};
		}
		return $fallback;
	}
	$bias = match ( $density ?? '' ) {
		'airy' => 80,
		'dense' => -80,
		default => 0,
	};
	if ( $len <= 40 ) {
		return max( 260, 480 + $bias );
	}
	if ( $len <= 80 ) {
		return max( 260, 420 + $bias );
	}
	return max( 240, 360 + $bias );
}

/**
 * Returns an adaptive minHeight (px) for a core/cover block based on the
 * headline character count.
 *
 * Returns the value formatted as a px string for use in block attrs.
 *
 * @param string $headline_text The raw (un-escaped) headline string.
 * @param int          $fallback Fallback when empty and $density is null.
 * @param string|null  $density  Optional personality density.
 */
function aldus_cover_min_height_px( string $headline_text, int $fallback = 420, ?string $density = null ): string {
	return aldus_cover_min_height( $headline_text, $fallback, $density ) . 'px';
}

/**
 * Returns an adaptive minHeight (px) for a core/cover block based on the
 * headline character count.
 *
 * Returns the value as a CSS style string for use in innerContent.
 *
 * @param string $headline_text The raw (un-escaped) headline string.
 * @param int          $fallback Fallback when empty and $density is null.
 * @param string|null  $density  Optional personality density.
 */
function aldus_cover_min_height_style( string $headline_text, int $fallback = 420, ?string $density = null ): string {
	return 'min-height:' . aldus_cover_min_height( $headline_text, $fallback, $density ) . 'px';
}

/**
 * Returns the grid-template-columns inline style value for a core/media-text block.
 * Returns '' (no style needed) when $media_width is 50 (the default equal split).
 *
 * @param int    $media_width Column width percentage for the media area.
 * @param string $position    'left' or 'right', determines grid column order.
 */
function aldus_media_text_style( int $media_width = 50, string $position = 'left' ): string {
	if ( 50 === $media_width ) {
		return '';
	}
	if ( 'right' === $position ) {
		return "grid-template-columns:auto {$media_width}%";
	}
	return "grid-template-columns:{$media_width}% auto";
}
