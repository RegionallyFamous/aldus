<?php
declare(strict_types=1);
/**
 * Configuration endpoint — GET /aldus/v1/config.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ---------------------------------------------------------------------------
// GET /aldus/v1/config — public configuration endpoint
// ---------------------------------------------------------------------------

/**
 * Registers the GET /aldus/v1/config endpoint.
 *
 * Called from aldus_register_rest_routes() via the rest_api_init hook.
 */
function aldus_register_config_route(): void {
	register_rest_route(
		'aldus/v1',
		'/config',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'aldus_handle_config',
			'permission_callback' => static function () {
				/**
				 * Filters the capability required to access GET /aldus/v1/config.
				 *
				 * Defaults to 'edit_posts'. Tighten to 'edit_theme_options' on
				 * multisite installations where Contributors should not see theme
				 * configuration details.
				 *
				 * @param string $capability WordPress capability slug.
				 */
				return current_user_can(
					apply_filters( 'aldus_config_capability', 'edit_posts' )
				);
			},
		)
	);
}
add_action( 'rest_api_init', 'aldus_register_config_route' );

/**
 * Handles GET /aldus/v1/config.
 *
 * Returns the current Aldus configuration: plugin version, all available
 * personalities (built-in + registered), and active theme layout settings.
 *
 * @return WP_REST_Response
 */
function aldus_handle_config(): WP_REST_Response {
	// Built-in personalities from the anchor map.
	$builtin       = array_keys( aldus_anchor_tokens() );
	$personalities = array_map(
		static function ( string $name ) {
			return array(
				'slug'   => sanitize_key( strtolower( str_replace( ' ', '-', $name ) ) ),
				'label'  => $name,
				'source' => 'builtin',
			);
		},
		$builtin
	);

	// Personalities registered via register_aldus_personality().
	foreach ( aldus_get_registered_personalities() as $slug => $data ) {
		$personalities[] = array(
			'slug'   => $slug,
			'label'  => $data['label'],
			'source' => 'registered',
		);
	}

	return rest_ensure_response(
		array(
			'version'       => ALDUS_VERSION,
			'personalities' => $personalities,
			'theme'         => array(
				'contentSize' => aldus_theme_content_size(),
				'wideSize'    => aldus_theme_wide_size(),
				'spacing'     => array(
					'sm' => aldus_theme_spacing( 'sm' ),
					'md' => aldus_theme_spacing( 'md' ),
					'lg' => aldus_theme_spacing( 'lg' ),
					'xl' => aldus_theme_spacing( 'xl' ),
				),
			),
		)
	);
}
