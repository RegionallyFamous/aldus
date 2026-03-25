<?php
declare(strict_types=1);
/**
 * Registers Aldus personality block style variations for core blocks.
 *
 * Each style maps one of the six most visually distinct Aldus personalities
 * onto core block types (Cover, Group, Pullquote, Columns). Users see these
 * as named options in the block Styles panel, so the Aldus vocabulary
 * extends beyond the generator block itself.
 *
 * Styles are backed by CSS rules injected via aldus_inject_theme_json()
 * in aldus.php using CSS custom properties that are already available from
 * the same theme.json injection.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'init', 'aldus_register_personality_styles', 15 );

/**
 * Registers personality-named block style variations on four core block types.
 *
 * Priority 15 ensures this runs after core's own 'init' priority-10 callbacks
 * that register the target block types.
 */
function aldus_register_personality_styles(): void {
	$personalities = array(
		'dispatch' => __( 'Aldus: Dispatch', 'aldus' ),
		'folio'    => __( 'Aldus: Folio', 'aldus' ),
		'nocturne' => __( 'Aldus: Nocturne', 'aldus' ),
		'codex'    => __( 'Aldus: Codex', 'aldus' ),
		'solstice' => __( 'Aldus: Solstice', 'aldus' ),
		'dusk'     => __( 'Aldus: Dusk', 'aldus' ),
	);

	$target_blocks = array(
		'core/cover',
		'core/group',
		'core/pullquote',
		'core/columns',
	);

	foreach ( $target_blocks as $block_type ) {
		foreach ( $personalities as $slug => $label ) {
			register_block_style(
				$block_type,
				array(
					'name'  => "aldus-{$slug}",
					'label' => $label,
				)
			);
		}
	}
}
