<?php
declare(strict_types=1);

/**
 * Telemetry REST endpoint — client-side error reporting.
 *
 * Provides a best-effort fire-and-forget endpoint that the block editor calls
 * whenever it transitions to an error screen.  Counts are stored as a single
 * WordPress option so they are visible in the /health endpoint alongside the
 * PHP-side assembly error counts.
 *
 * This endpoint is intentionally minimal: it accepts only a pre-defined set of
 * event types and sanitised error codes, stores counts, and returns nothing
 * useful to the caller.  It is never used for any user-facing feature.
 *
 * The endpoint is gated behind edit_posts so it is only callable by logged-in
 * users who already have access to the block editor.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the /aldus/v1/telemetry REST route.
 */
function aldus_register_telemetry_route(): void {
	register_rest_route(
		'aldus/v1',
		'/telemetry',
		array(
			'methods'             => 'POST',
			'callback'            => 'aldus_handle_telemetry',
			'permission_callback' => static function (): bool {
				return current_user_can( 'edit_posts' );
			},
			'args'                => array(
				'event' => array(
					'required'          => true,
					'type'              => 'string',
					'enum'              => array( 'client_error' ),
					'validate_callback' => 'rest_validate_request_arg',
					'sanitize_callback' => 'sanitize_key',
				),
				'code'  => array(
					'required'          => true,
					'type'              => 'string',
					// Allow only the codes that the block editor actually reports via
					// reportError(). Any other string is rejected before it can write
					// to wp_options.
					'enum'              => array(
						'timeout',
						'connection_failed',
						'parse_failed',
						'llm_parse_failed',
						'unexpected_error',
						'corrupt_markup',
						'insert_failed',
						'no_layouts',
						'api_error',
						'unknown',
					),
					'validate_callback' => 'rest_validate_request_arg',
					'sanitize_callback' => 'sanitize_key',
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'aldus_register_telemetry_route' );

/**
 * Handles POST /aldus/v1/telemetry.
 *
 * Atomically increments a per-code counter stored as an individual option
 * (`aldus_client_error_{$code}`) using a direct SQL UPDATE.  The previous
 * implementation stored all codes in a single array option, which required a
 * non-atomic read–modify–write cycle that could lose increments under
 * concurrent requests.  Per-code options allow InnoDB row-locking to
 * serialise each increment correctly.
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response
 */
function aldus_handle_telemetry( WP_REST_Request $request ): WP_REST_Response {
	global $wpdb;

	$code = sanitize_key( (string) $request->get_param( 'code' ) );

	if ( '' === $code ) {
		return rest_ensure_response( array( 'ok' => false ) );
	}

	$option_name = 'aldus_client_error_' . $code;

	$updated = $wpdb->query(
		$wpdb->prepare(
			"UPDATE {$wpdb->options}
			 SET    option_value = CAST( option_value AS UNSIGNED ) + 1
			 WHERE  option_name  = %s",
			$option_name
		)
	);

	if ( ! $updated ) {
		// First occurrence for this code — add_option is a no-op on duplicate
		// inserts so concurrent first-hits are handled gracefully.
		add_option( $option_name, 1, '', false );
	} else {
		// The raw SQL UPDATE bypasses WP's in-memory option cache. Clear the
		// cache entry so subsequent get_option() calls read the fresh DB value.
		wp_cache_delete( $option_name, 'options' );
	}

	return rest_ensure_response( array( 'ok' => true ) );
}
