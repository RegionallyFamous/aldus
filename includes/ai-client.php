<?php
declare(strict_types=1);
/**
 * WP 7.0 AI Client — server-side generation endpoint.
 *
 * Registers /aldus/v1/ai-generate, a REST route that proxies a prompt to the
 * WordPress AI Client (wp_ai_client_prompt, introduced in WP 7.0). This
 * provides a server-side fallback for editors whose browsers cannot run
 * WebGPU (e.g. Safari without WebGPU flag, or mobile devices).
 *
 * The endpoint:
 *   - Requires the prompt_ai capability (guarded — safely absent before WP 7.0).
 *   - Returns 501 when wp_ai_client_prompt() is not available or no provider
 *     is configured, so callers can gracefully degrade.
 *   - Accepts a 'schema' param for JSON-constrained generation when the
 *     provider supports it.
 *
 * The JavaScript caller (useAldusGeneration) reads
 * window.__aldusCapabilities.serverAI before deciding whether to invoke this
 * endpoint. That flag is set to true only when both the capability and the
 * function exist.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'rest_api_init', 'aldus_register_ai_endpoint' );

/**
 * Registers the /aldus/v1/ai-generate REST route.
 */
function aldus_register_ai_endpoint(): void {
	register_rest_route(
		'aldus/v1',
		'/ai-generate',
		array(
			'methods'             => 'POST',
			'callback'            => 'aldus_handle_ai_generate',
			'permission_callback' => static function (): bool {
				// prompt_ai is a WP 7.0+ capability; falls back to false on older versions.
				return current_user_can( 'prompt_ai' );
			},
			'args'                => array(
				'prompt' => array(
					'required'          => true,
					'type'              => 'string',
					'sanitize_callback' => 'sanitize_text_field',
					'validate_callback' => static function ( $value ): bool {
						return is_string( $value ) && strlen( $value ) > 0;
					},
				),
				'schema' => array(
					'required' => false,
					'type'     => 'object',
					'default'  => null,
				),
			),
		)
	);
}

/**
 * Handles POST /aldus/v1/ai-generate.
 *
 * Passes the prompt to the WP AI Client and returns the generated text or
 * JSON as a REST response. Returns a WP_Error with status 501 when the AI
 * Client is unavailable.
 *
 * @param WP_REST_Request $request Incoming REST request.
 * @return WP_REST_Response|WP_Error
 */
function aldus_handle_ai_generate( WP_REST_Request $request ): WP_REST_Response|WP_Error {
	if ( ! function_exists( 'wp_ai_client_prompt' ) ) {
		return new WP_Error(
			'no_ai_client',
			__( 'WordPress AI Client is not available on this server.', 'aldus' ),
			array( 'status' => 501 )
		);
	}

	$builder = wp_ai_client_prompt();

	if ( ! $builder->is_supported_for_text_generation() ) {
		return new WP_Error(
			'no_provider',
			__( 'No AI provider is configured on this WordPress installation.', 'aldus' ),
			array( 'status' => 501 )
		);
	}

	$prompt = $request->get_param( 'prompt' );
	$schema = $request->get_param( 'schema' );

	$generation = $builder->generate_text( $prompt );

	if ( null !== $schema ) {
		$generation = $generation->as_json_response( $schema );
	}

	$result = $generation->execute();

	return rest_ensure_response(
		array(
			'choices' => array(
				array(
					'message' => array(
						'content' => is_string( $result ) ? $result : wp_json_encode( $result ),
						'role'    => 'assistant',
					),
				),
			),
		)
	);
}
