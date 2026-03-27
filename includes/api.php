<?php
declare(strict_types=1);
/**
 * Core API handlers — analytics and public personality registry.
 *
 * Assembly, config, health, block registration, and admin hooks have been
 * extracted into dedicated files (api-assemble.php, api-config.php,
 * api-health.php, block-register.php, admin-hooks.php).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
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

	$stats                 = get_option( 'aldus_usage', array() );
	$stats[ $personality ] = ( isset( $stats[ $personality ] ) ? (int) $stats[ $personality ] : 0 ) + 1;
	$new_count             = $stats[ $personality ];
	$saved                 = update_option( 'aldus_usage', $stats, false );

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
