<?php
declare(strict_types=1);
/**
 * Public personality registry — always loaded so themes can call
 * register_aldus_personality() on init without pulling in the REST/assemble stack.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

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
