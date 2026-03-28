<?php
declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
/**
 * Server-side render callback for the Aldus block.
 *
 * Aldus always operates in wrapper mode: the block stays in the editor tree
 * and generated blocks are inserted as inner blocks. $content holds the
 * serialised inner block markup rendered by WordPress. We wrap it in a
 * semantic <div> carrying the personality name as a data attribute, which
 * enables per-personality CSS and the Interactivity API store to target it
 * without class-name collisions.
 *
 * get_block_wrapper_attributes() is called so that every block support the
 * user configures in the editor — margin, padding, background colour, border,
 * shadow, min-height — is applied on the frontend.  It also adds the canonical
 * wp-block-aldus-layout-generator class, keeping it in sync with the
 * selectors.root entry in block.json.
 *
 * If the block has no inner blocks yet (user is still in the building state),
 * $content is empty and we render nothing on the front end.
 *
 * @param array<string, mixed> $attributes Block attributes.
 * @param string               $content    Inner block content (empty while building).
 * @param WP_Block             $block      Block instance (unused).
 */

// phpcs:ignore VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable -- $block required by WP callback signature.
$aldus_content = trim( $content );

if ( '' === $aldus_content ) {
	// Editor-only fallback: if the JS edit UI fails to mount for any reason,
	// avoid rendering an entirely invisible block in the editor canvas.
	// Note: use printf() not return sprintf() — WP captures this file via
	// ob_start()/ob_get_clean(), so only printed output is captured.
	if ( is_admin() ) {
		printf(
			'<div class="wp-block-aldus-layout-generator"><p>%s</p></div>',
			esc_html__( 'Aldus block inserted. If the full editor UI does not appear, refresh the editor.', 'aldus' )
		);
	}
	return;
}

$aldus_personality = sanitize_html_class( $attributes['insertedPersonality'] ?? '' );
$wrapper_extra     = array( 'class' => 'aldus-layout' );
if ( $aldus_personality !== '' ) {
	$wrapper_extra['data-personality'] = $aldus_personality;
}
$wrapper_attributes = get_block_wrapper_attributes( $wrapper_extra );

printf(
	'<div %s>%s</div>',
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns pre-escaped HTML attribute string.
	$wrapper_attributes,
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $aldus_content is WP-rendered inner block HTML, already safe.
	$aldus_content
);
