<?php
declare(strict_types=1);
/**
 * Block markup validation utilities.
 *
 * Checks that serialize_block() output matches what WordPress core block
 * save() functions expect. Used by unit tests and at runtime in WP_DEBUG mode.
 *
 * Classes that must NOT appear in saved post_content are those injected by
 * WordPress at render time via wp_render_layout_support_flag(). Core block
 * save() functions never output them, so the block validator flags any markup
 * that contains them as invalid.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Classes that WordPress injects at render time via wp_render_layout_support_flag().
 * These must NEVER appear in saved post_content.
 */
const ALDUS_RENDER_TIME_CLASSES = array(
	'is-layout-flow',
	'is-layout-constrained',
	'is-layout-flex',
	'is-layout-grid',
	'has-global-padding',
);

/**
 * Regex patterns that match render-time-only compound classes.
 * e.g. wp-block-columns-is-layout-flex, wp-block-group-is-layout-constrained.
 */
const ALDUS_RENDER_TIME_PATTERNS = array(
	'/wp-block-[a-z]+-is-layout-[a-z]+/',
	'/wp-container-[a-z0-9]+/',
	'/wp-elements-[a-z0-9]+/',
);

/**
 * Validates a serialized block string for common issues that cause "invalid block" warnings.
 *
 * Returns an array of error messages. Empty array means the markup is valid.
 *
 * @param string $markup Serialized block markup from serialize_block().
 * @return list<string> Error messages.
 */
function aldus_validate_block_markup( string $markup ): array {
	$errors = array();

	// 1. Check for render-time-only classes.
	foreach ( ALDUS_RENDER_TIME_CLASSES as $class ) {
		if ( str_contains( $markup, $class ) ) {
			$errors[] = "Contains render-time-only class: '{$class}'. This class is added by WordPress at render time and must not appear in saved markup.";
		}
	}
	foreach ( ALDUS_RENDER_TIME_PATTERNS as $pattern ) {
		if ( preg_match( $pattern, $markup, $matches ) ) {
			$errors[] = "Contains render-time-only class pattern: '{$matches[0]}'.";
		}
	}

	// 2. Check for unpaired background color classes.
	if ( preg_match( '/has-[a-z0-9-]+-background-color/', $markup ) && ! str_contains( $markup, 'has-background' ) ) {
		$errors[] = "Has background-color class without 'has-background' pair.";
	}

	// 3. Check for unpaired text color classes (skip separator which uses both).
	if ( preg_match( '/has-[a-z0-9-]+-color(?!-)/', $markup )
		&& ! str_contains( $markup, 'has-text-color' )
		&& ! str_contains( $markup, 'wp-block-separator' )
	) {
		$errors[] = "Has text color class without 'has-text-color' pair.";
	}

	// 4. Check for spaces after colons in style attributes (WordPress uses minified CSS).
	if ( preg_match( '/style="[^"]*[a-z]:\s/', $markup ) ) {
		$errors[] = "Style attribute contains spaces after colons. WordPress uses minified CSS: 'padding-top:2em' not 'padding-top: 2em'.";
	}

	// 5. Check for shorthand padding (WordPress always uses longhand).
	if ( preg_match( '/style="[^"]*(?<![a-z-])padding:[^"]*"/', $markup ) ) {
		$errors[] = "Style attribute uses shorthand 'padding:'. WordPress uses longhand: padding-top, padding-right, padding-bottom, padding-left.";
	}

	// 6. Check for shorthand margin (WordPress always uses longhand).
	if ( preg_match( '/style="[^"]*(?<![a-z-])margin:[^"]*"/', $markup ) ) {
		$errors[] = "Style attribute uses shorthand 'margin:'. WordPress uses longhand.";
	}

	// 7. Check button class order: wp-element-button must be last.
	if ( preg_match( '/wp-element-button\s+[a-z]/', $markup ) ) {
		$errors[] = "'wp-element-button' must be the last class on button link elements.";
	}

	// 8. Check that wp-block-button__link is paired with wp-element-button.
	if ( str_contains( $markup, 'wp-block-button__link' ) && ! str_contains( $markup, 'wp-element-button' ) ) {
		$errors[] = "'wp-block-button__link' must be paired with 'wp-element-button'.";
	}

	// 9. Check for trailing semicolons in style attributes (WordPress omits them).
	if ( preg_match( '/style="[^"]*;\s*"/', $markup ) ) {
		$errors[] = 'Style attribute has trailing semicolon. WordPress omits the final semicolon.';
	}

	return $errors;
}

/**
 * Validates an entire assembled markup string (the full response from aldus_handle_assemble).
 *
 * Parses the markup into blocks, validates each one, and prefixes every error
 * message with the block name so the caller can identify the source.
 *
 * @param string $markup Full serialized markup from aldus_handle_assemble().
 * @return list<string> All validation errors across all blocks.
 */
function aldus_validate_assembled_markup( string $markup ): array {
	if ( ! function_exists( 'parse_blocks' ) || ! function_exists( 'serialize_block' ) ) {
		return array(); // WordPress not available — skip silently.
	}

	$blocks = parse_blocks( $markup );
	$errors = array();

	foreach ( $blocks as $block ) {
		if ( empty( $block['blockName'] ) ) {
			continue; // Skip freeform/empty blocks.
		}
		$block_markup = serialize_block( $block );
		$block_errors = aldus_validate_block_markup( $block_markup );
		foreach ( $block_errors as $error ) {
			$errors[] = "[{$block['blockName']}] {$error}";
		}
	}

	return $errors;
}
