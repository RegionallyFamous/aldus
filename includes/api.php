<?php
declare(strict_types=1);
/**
 * Core API handlers — analytics (record-use). Personality registration lives in
 * api-personality.php so it can load without the REST/assemble dependency chain.
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
