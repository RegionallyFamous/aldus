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
 * @param bool $stacked_on_mobile When false the "is-not-stacked-on-mobile" class is appended.
 */
function aldus_columns_classes( bool $stacked_on_mobile ): string {
	$base = 'wp-block-columns is-layout-flex wp-block-columns-is-layout-flex';
	return $stacked_on_mobile ? $base : $base . ' is-not-stacked-on-mobile';
}

// ---------------------------------------------------------------------------
// core/column
// ---------------------------------------------------------------------------

/**
 * Returns the class string for the inner <div> of a core/column block.
 *
 * @param string $bg_slug Optional background color slug.
 *                        When provided, has-background classes are appended.
 */
function aldus_column_classes( string $bg_slug = '' ): string {
	$base = 'wp-block-column is-layout-flow wp-block-column-is-layout-flow';
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
 * Returns the class string for the root <div> of a core/cover block.
 *
 * @param string $align            'full' or 'wide'.
 * @param string $content_position Space-separated position value, e.g. 'center center'
 *                                  or 'bottom left'. Pass '' to omit position classes.
 */
function aldus_cover_root_classes( string $align = 'full', string $content_position = '' ): string {
	$base = "wp-block-cover align{$align}";
	if ( $content_position !== '' ) {
		$slug  = str_replace( ' ', '-', $content_position );
		$base .= " has-custom-content-position is-position-{$slug}";
	}
	return $base;
}

/**
 * Returns the class string for the <span> background overlay inside a core/cover block.
 *
 * @param string $color_slug Theme color slug for the overlay.
 * @param int    $dim_ratio  0–100 overlay opacity percentage.
 */
function aldus_cover_bg_classes( string $color_slug, int $dim_ratio ): string {
	$safe = sanitize_html_class( $color_slug );
	return "wp-block-cover__background has-{$safe}-background-color has-background-dim-{$dim_ratio} has-background-dim";
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
 * @param string $layout_type    'constrained' or 'flow'.
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
	$classes = "wp-block-group is-layout-{$layout_type} wp-block-group-is-layout-{$layout_type}";
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
 */
function aldus_buttons_classes(): string {
	return 'wp-block-buttons is-layout-flex wp-block-buttons-is-layout-flex';
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
// core/media-text
// ---------------------------------------------------------------------------

/**
 * Returns the class string for the root <div> of a core/media-text block.
 *
 * @param string $position  'left' or 'right'.
 * @param bool   $stacked   Whether to add 'is-stacked-on-mobile'.
 * @param string $align     'full', 'wide', or '' for no alignment class.
 */
function aldus_media_text_classes(
	string $position = 'left',
	bool $stacked = true,
	string $align = ''
): string {
	$classes = 'wp-block-media-text';
	if ( 'right' === $position ) {
		$classes .= ' has-media-on-the-right';
	}
	if ( $stacked ) {
		$classes .= ' is-stacked-on-mobile';
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
 * @param string $headline_text The raw (un-escaped) headline string.
 * @param int    $default       Fallback value when $headline_text is empty.
 */
function aldus_cover_min_height( string $headline_text, int $default = 420 ): int {
	// mb_strlen for accurate character count with multi-byte (non-Latin) headlines.
	$len = mb_strlen( $headline_text );
	if ( $len === 0 ) {
		return $default;
	}
	if ( $len <= 40 ) {
		return 480;
	}
	if ( $len <= 80 ) {
		return 420;
	}
	return 360;
}

/**
 * Returns an adaptive minHeight (px) for a core/cover block based on the
 * headline character count.
 *
 * Returns the value formatted as a px string for use in block attrs.
 *
 * @param string $headline_text The raw (un-escaped) headline string.
 * @param int    $default       Fallback value when $headline_text is empty.
 */
function aldus_cover_min_height_px( string $headline_text, int $default = 420 ): string {
	return aldus_cover_min_height( $headline_text, $default ) . 'px';
}

/**
 * Returns an adaptive minHeight (px) for a core/cover block based on the
 * headline character count.
 *
 * Returns the value as a CSS style string for use in innerContent.
 *
 * @param string $headline_text The raw (un-escaped) headline string.
 * @param int    $default       Fallback value when $headline_text is empty.
 */
function aldus_cover_min_height_style( string $headline_text, int $default = 420 ): string {
	return 'min-height:' . aldus_cover_min_height( $headline_text, $default ) . 'px';
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
