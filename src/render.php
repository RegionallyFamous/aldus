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
 * If the block has no inner blocks yet (user is still in the building state),
 * $content is empty and we return nothing on the front end.
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
	if ( is_admin() ) {
		return sprintf(
			'<div class="wp-block-aldus-layout-generator"><p>%s</p></div>',
			esc_html__( 'Aldus block inserted. If the full editor UI does not appear, refresh the editor.', 'aldus' )
		);
	}
	return '';
}

$aldus_personality = sanitize_html_class( $attributes['insertedPersonality'] ?? '' );

printf(
	'<div class="aldus-layout" data-personality="%s">%s</div>',
	esc_attr( $aldus_personality ),
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $aldus_content is WP-rendered inner block HTML, already safe.
	$aldus_content
);
