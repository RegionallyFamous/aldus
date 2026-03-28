<?php
declare(strict_types=1);
/**
 * Standalone block HTML validator.
 *
 * Verifies that the class strings and inline styles produced by the helper
 * functions in includes/block-html.php match what WordPress's block save()
 * functions emit.  Runs without a WordPress install.
 *
 * Usage:
 *   php tests/validate-blocks.php
 *
 * Exit codes:
 *   0 = all assertions passed
 *   1 = one or more assertions failed
 */

// ---------------------------------------------------------------------------
// Stub WordPress functions used by block-html.php and templates.php
// ---------------------------------------------------------------------------

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/../' );
}

/**
 * Sanitises a value for use as an HTML class name.
 * Mirrors the WordPress implementation for the subset of slugs we use.
 */
function sanitize_html_class( string $class, string $fallback = '' ): string {
	$class = preg_replace( '/[^a-zA-Z0-9_-]/', '', $class );
	return $class !== '' ? $class : $fallback;
}

/**
 * Escapes a string for use inside HTML attribute values.
 */
function esc_attr( string $text ): string {
	return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
}

/**
 * Escapes a string for HTML output.
 */
function esc_html( string $text ): string {
	return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
}

/**
 * Returns a sanitised URL (no-op for our test purposes).
 */
function esc_url( string $url ): string {
	return $url;
}

/**
 * serialize_block stub — returns the innerContent string(s) concatenated so
 * we can inspect the raw HTML.
 *
 * @param array $block
 * @return string
 */
function serialize_block( array $block ): string {
	$html = '';
	foreach ( $block['innerContent'] as $chunk ) {
		if ( null === $chunk ) {
			continue;
		}
		$html .= $chunk;
	}
	return $html;
}

// ---------------------------------------------------------------------------
// Load helpers (no WordPress required)
// ---------------------------------------------------------------------------

require_once __DIR__ . '/../includes/block-html.php';

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

$pass  = 0;
$fail  = 0;
$errors = [];

/**
 * Asserts that $haystack contains the substring $needle.
 */
function check_contains( string $label, string $haystack, string $needle ): void {
	global $pass, $fail, $errors;
	if ( str_contains( $haystack, $needle ) ) {
		$pass++;
	} else {
		$fail++;
		$errors[] = "FAIL [{$label}]: expected to find '{$needle}' in:\n  {$haystack}";
	}
}

/**
 * Asserts that $haystack does NOT contain the substring $needle.
 */
function check_not_contains( string $label, string $haystack, string $needle ): void {
	global $pass, $fail, $errors;
	if ( ! str_contains( $haystack, $needle ) ) {
		$pass++;
	} else {
		$fail++;
		$errors[] = "FAIL [{$label}]: expected NOT to find '{$needle}' in:\n  {$haystack}";
	}
}

/**
 * Asserts that $actual equals $expected exactly.
 */
function check_equals( string $label, mixed $actual, mixed $expected ): void {
	global $pass, $fail, $errors;
	if ( $actual === $expected ) {
		$pass++;
	} else {
		$fail++;
		$errors[] = "FAIL [{$label}]:\n  expected: '{$expected}'\n  actual  : '{$actual}'";
	}
}

// ===========================================================================
// GROUP 1: core/columns helpers
// ===========================================================================

$stacked     = aldus_columns_classes( true );
$not_stacked = aldus_columns_classes( false );

check_contains( 'columns/stacked: base classes',        $stacked,     'wp-block-columns' );
check_not_contains( 'columns/stacked: no is-layout-flex',   $stacked, 'is-layout-flex' );
check_not_contains( 'columns/stacked: no is-layout-suffix', $stacked, 'wp-block-columns-is-layout-flex' );
check_not_contains( 'columns/stacked: no not-stacked',      $stacked, 'is-not-stacked-on-mobile' );

check_contains( 'columns/not-stacked: base classes',        $not_stacked, 'wp-block-columns' );
check_contains( 'columns/not-stacked: not-stacked class',   $not_stacked, 'is-not-stacked-on-mobile' );
check_not_contains( 'columns/not-stacked: no is-layout',    $not_stacked, 'is-layout-flex' );

// ===========================================================================
// GROUP 2: core/column helpers
// ===========================================================================

$col_plain = aldus_column_classes();
check_contains( 'column/plain: base class',              $col_plain, 'wp-block-column' );
check_not_contains( 'column/plain: no is-layout-flow',   $col_plain, 'is-layout-flow' );
check_not_contains( 'column/plain: no layout suffix',    $col_plain, 'wp-block-column-is-layout-flow' );
check_not_contains( 'column/plain: no bg',               $col_plain, 'has-background' );

$col_bg = aldus_column_classes( 'primary' );
check_contains( 'column/bg: bg color class',         $col_bg, 'has-primary-background-color' );
check_contains( 'column/bg: has-background',         $col_bg, 'has-background' );

$col_bg_special = aldus_column_classes( 'vivid-cyan-blue' );
check_contains( 'column/bg-special: sanitized slug', $col_bg_special, 'has-vivid-cyan-blue-background-color' );

// column style
check_equals( 'column/style-50',   aldus_column_style( '50%' ), 'flex-basis:50%' );
check_equals( 'column/style-28',   aldus_column_style( '28%' ), 'flex-basis:28%' );
check_equals( 'column/style-72',   aldus_column_style( '72%' ), 'flex-basis:72%' );
check_equals( 'column/style-empty', aldus_column_style( '' ),   '' );

// ===========================================================================
// GROUP 3: core/cover helpers
// ===========================================================================

// root classes
$cover_full = aldus_cover_root_classes( 'full' );
check_contains( 'cover/root-full: base',  $cover_full, 'wp-block-cover' );
check_contains( 'cover/root-full: align', $cover_full, 'alignfull' );
check_not_contains( 'cover/root-full: no position', $cover_full, 'is-position' );

$cover_center = aldus_cover_root_classes( 'full', 'center center' );
// Gutenberg omits position classes for the default (center) content position.
check_not_contains( 'cover/root-center: no custom position', $cover_center, 'has-custom-content-position' );
check_not_contains( 'cover/root-center: no is-position', $cover_center, 'is-position-center-center' );

$cover_bottom_left = aldus_cover_root_classes( 'full', 'bottom left' );
check_contains( 'cover/root-bottomleft: slug', $cover_bottom_left, 'is-position-bottom-left' );

// background span classes
$cover_bg = aldus_cover_bg_classes( 'black', 50 );
check_contains( 'cover/bg: base class',       $cover_bg, 'wp-block-cover__background' );
check_contains( 'cover/bg: color class',      $cover_bg, 'has-black-background-color' );
// Gutenberg dimRatioToClass(50) is null — no has-background-dim-50 slug.
check_not_contains( 'cover/bg: dim50 omits numeric slug', $cover_bg, 'has-background-dim-50' );
check_contains( 'cover/bg: dim class',        $cover_bg, 'has-background-dim' );

$cover_bg_45 = aldus_cover_bg_classes( 'black', 45 );
check_contains( 'cover/bg-45: buckets to dim-50', $cover_bg_45, 'has-background-dim-50' );

$cover_bg_100 = aldus_cover_bg_classes( 'vivid-red', 100 );
check_contains( 'cover/bg-100: dim-100',      $cover_bg_100, 'has-background-dim-100' );

// inner container — WP 6.9 removed the is-layout-* classes; only the base class remains.
$cover_inner = aldus_cover_inner_classes();
check_equals( 'cover/inner: exact value',        $cover_inner, 'wp-block-cover__inner-container' );
check_not_contains( 'cover/inner: no layout',    $cover_inner, 'is-layout-constrained' );
check_not_contains( 'cover/inner: no suffix',    $cover_inner, 'wp-block-cover-is-layout-constrained' );

// ===========================================================================
// GROUP 4: core/group helpers
// ===========================================================================

$group_c = aldus_group_classes();
check_contains( 'group/constrained: base',             $group_c, 'wp-block-group' );
check_not_contains( 'group/constrained: no layout',    $group_c, 'is-layout-constrained' );
check_not_contains( 'group/constrained: no suffix',    $group_c, 'wp-block-group-is-layout-constrained' );
check_not_contains( 'group/constrained: no align',     $group_c, 'alignfull' );

$group_flow = aldus_group_classes( 'flow' );
check_not_contains( 'group/flow: no layout',   $group_flow, 'is-layout-flow' );
check_not_contains( 'group/flow: no suffix',   $group_flow, 'wp-block-group-is-layout-flow' );

$group_full = aldus_group_classes( 'constrained', 'full' );
check_contains( 'group/full: alignfull',       $group_full, 'alignfull' );

$group_bg = aldus_group_classes( 'constrained', '', 'primary' );
check_contains( 'group/bg: bg color',          $group_bg, 'has-primary-background-color' );
check_contains( 'group/bg: has-background',    $group_bg, 'has-background' );

$group_gradient = aldus_group_classes( 'constrained', 'full', '', '', 'vivid-sunset' );
check_contains( 'group/gradient: alignfull',     $group_gradient, 'alignfull' );
check_contains( 'group/gradient: gradient-bg',   $group_gradient, 'has-vivid-sunset-gradient-background' );
check_contains( 'group/gradient: has-background', $group_gradient, 'has-background' );
check_not_contains( 'group/gradient: no solid-bg', $group_gradient, 'has-vivid-sunset-background-color' );

// ===========================================================================
// GROUP 5: core/buttons and core/button helpers
// ===========================================================================

$buttons = aldus_buttons_classes();
check_contains( 'buttons: base',             $buttons, 'wp-block-buttons' );
check_not_contains( 'buttons: no flex',      $buttons, 'is-layout-flex' );
check_not_contains( 'buttons: no suffix',    $buttons, 'wp-block-buttons-is-layout-flex' );

$btn_link = aldus_button_link_classes();
check_contains( 'button-link: base',        $btn_link, 'wp-block-button__link' );
check_contains( 'button-link: wp-element',  $btn_link, 'wp-element-button' );

$btn_link_extra = aldus_button_link_classes( 'has-white-color has-text-color' );
check_contains( 'button-link/extra: base',  $btn_link_extra, 'wp-block-button__link' );
check_contains( 'button-link/extra: extra', $btn_link_extra, 'has-white-color' );

// ===========================================================================
// GROUP 6: core/media-text helpers
// ===========================================================================

$mt_left = aldus_media_text_classes( 'left', true );
check_contains( 'media-text/left: base',       $mt_left, 'wp-block-media-text' );
check_contains( 'media-text/left: stacked',    $mt_left, 'is-stacked-on-mobile' );
check_not_contains( 'media-text/left: no-right', $mt_left, 'has-media-on-the-right' );

$mt_right = aldus_media_text_classes( 'right', false );
check_contains( 'media-text/right: right-class', $mt_right, 'has-media-on-the-right' );
check_not_contains( 'media-text/right: no-stack', $mt_right, 'is-stacked-on-mobile' );

$mt_full = aldus_media_text_classes( 'left', true, 'full' );
check_contains( 'media-text/full: align',      $mt_full, 'alignfull' );

// media-text style — WP 6.9 uses `auto` not `1fr` for the flexible column.
check_equals( 'media-text/style-50',       aldus_media_text_style( 50, 'left' ),  '' );
check_equals( 'media-text/style-38-left',  aldus_media_text_style( 38, 'left' ),  'grid-template-columns:38% auto' );
check_equals( 'media-text/style-38-right', aldus_media_text_style( 38, 'right' ), 'grid-template-columns:auto 38%' );

// ===========================================================================
// GROUP 7: Integration — verify helpers produce strings usable in HTML attrs
// ===========================================================================

// Build a sample columns div and verify the full class attr is correct.
// Layout classes (is-layout-flex etc.) are injected by WordPress at render
// time and must not appear in saved markup.
$sample_cols_html = '<div class="' . aldus_columns_classes( false ) . '">';
check_contains( 'integration/columns: base class', $sample_cols_html,
	'class="wp-block-columns is-not-stacked-on-mobile"' );
check_not_contains( 'integration/columns: no layout class', $sample_cols_html,
	'is-layout-flex' );

// Build a sample cover inner div and verify it.
$sample_cover_inner = '<div class="' . aldus_cover_inner_classes() . '">';
check_contains( 'integration/cover-inner: full attr', $sample_cover_inner,
	'class="wp-block-cover__inner-container"' );

// Build a sample buttons div.
$sample_buttons = '<div class="' . aldus_buttons_classes() . '">';
check_contains( 'integration/buttons: base class', $sample_buttons,
	'class="wp-block-buttons"' );
check_not_contains( 'integration/buttons: no layout class', $sample_buttons,
	'is-layout-flex' );

// Build a sample button link — WP 6.9 places wp-element-button at the end.
$sample_btn_link = '<a class="' . aldus_button_link_classes() . '" href="#">Click</a>';
check_contains( 'integration/button-link: full attr', $sample_btn_link,
	'class="wp-block-button__link wp-element-button"' );

$sample_btn_link_extra = '<a class="' . aldus_button_link_classes( 'has-accent-6-color has-text-color' ) . '" href="#">Click</a>';
check_contains( 'integration/button-link/extra: order', $sample_btn_link_extra,
	'class="wp-block-button__link has-accent-6-color has-text-color wp-element-button"' );

// ===========================================================================
// aldus_cover_min_height() — adaptive minHeight logic
// ===========================================================================

// Short headline (≤ 40 chars) → 480px.
check_equals( 'cover/height: empty string defaults', aldus_cover_min_height( '' ), 420 );
check_equals( 'cover/height: short headline ≤40',   aldus_cover_min_height( 'Short headline.' ), 480 );
check_equals( 'cover/height: short headline exactly 40', aldus_cover_min_height( str_repeat( 'a', 40 ) ), 480 );
// Medium headline (41–80 chars) → 420px (the factory default).
check_equals( 'cover/height: medium headline 41-80', aldus_cover_min_height( str_repeat( 'a', 41 ) ), 420 );
check_equals( 'cover/height: medium headline exactly 80', aldus_cover_min_height( str_repeat( 'a', 80 ) ), 420 );
// Long headline (> 80 chars) → 360px.
check_equals( 'cover/height: long headline >80',    aldus_cover_min_height( str_repeat( 'a', 81 ) ), 360 );
// Custom default (used by product-hero and minimal cover variants).
check_equals( 'cover/height: custom default empty', aldus_cover_min_height( '', 520 ), 520 );
check_equals( 'cover/height: short with default 520', aldus_cover_min_height( 'Hi', 520 ), 480 );
// Style string helper.
check_equals( 'cover/height-style: short', aldus_cover_min_height_style( 'Hi' ), 'min-height:480px' );
check_equals( 'cover/height-style: long',  aldus_cover_min_height_style( str_repeat( 'a', 90 ) ), 'min-height:360px' );
// Px helper.
check_equals( 'cover/height-px: medium',   aldus_cover_min_height_px( str_repeat( 'a', 60 ) ), '420px' );
// Density shifts empty fallback and tier heights.
check_equals( 'cover/height: airy empty', aldus_cover_min_height( '', 420, 'airy' ), 560 );
check_equals( 'cover/height: dense empty', aldus_cover_min_height( '', 420, 'dense' ), 280 );
check_equals( 'cover/height: short airy bias', aldus_cover_min_height( 'Hi', 420, 'airy' ), 560 );
check_equals( 'cover/height: short dense bias', aldus_cover_min_height( 'Hi', 420, 'dense' ), 400 );

// ===========================================================================
// Summary
// ===========================================================================

$total = $pass + $fail;

echo "\n";
echo "Block HTML Validator\n";
echo "====================\n";
echo "Tests: {$total}  |  Passed: {$pass}  |  Failed: {$fail}\n\n";

if ( $fail > 0 ) {
	foreach ( $errors as $err ) {
		echo $err . "\n\n";
	}
	exit( 1 );
}

echo "All assertions passed.\n\n";
exit( 0 );
