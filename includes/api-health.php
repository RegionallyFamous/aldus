<?php
declare(strict_types=1);
/**
 * Health check endpoint — GET /aldus/v1/health.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ---------------------------------------------------------------------------
// Health check endpoint
// ---------------------------------------------------------------------------

/**
 * Registers the GET /aldus/v1/health endpoint.
 */
function aldus_register_health_route(): void {
	register_rest_route(
		'aldus/v1',
		'/health',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'aldus_handle_health',
			'permission_callback' => static function () {
				return current_user_can( 'manage_options' );
			},
		)
	);
}

/**
 * Handles GET /aldus/v1/health.
 *
 * Returns plugin version, server environment, object-cache status, theme
 * configuration summary, personality count, and per-personality error rates.
 * Requires manage_options so it is accessible only to site administrators.
 *
 * @return WP_REST_Response
 */
function aldus_handle_health(): WP_REST_Response {
	$personalities = array_keys( aldus_anchor_tokens() );

	// Build per-personality error counts from stored options.
	$error_counts = array();
	foreach ( $personalities as $name ) {
		$key = 'aldus_errors_' . strtolower( sanitize_html_class( $name ) );
		$n   = (int) get_option( $key, 0 );
		if ( $n > 0 ) {
			$error_counts[ $name ] = $n;
		}
	}

	// Build client-side error counts from the per-code options written by the
	// telemetry endpoint (aldus_client_error_{$code}).  The known error codes
	// mirror the ERROR_MESSAGES keys in src/screens/ErrorScreen.js.
	$client_error_codes  = array(
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
	);
	$client_error_counts = array();
	foreach ( $client_error_codes as $code ) {
		$n = (int) get_option( 'aldus_client_error_' . $code, 0 );
		if ( $n > 0 ) {
			$client_error_counts[ $code ] = $n;
		}
	}

	return rest_ensure_response(
		array(
			'version'             => ALDUS_VERSION,
			'php'                 => PHP_VERSION,
			'wp'                  => get_bloginfo( 'version' ),
			'object_cache'        => (bool) wp_using_ext_object_cache(),
			'theme'               => get_stylesheet(),
			'palette_size'        => count( aldus_get_theme_palette() ),
			'font_sizes'          => count( aldus_get_theme_font_sizes() ),
			'personalities'       => count( $personalities ),
			'error_counts'        => $error_counts,
			'client_error_counts' => $client_error_counts,
		)
	);
}
