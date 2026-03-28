<?php
declare(strict_types=1);
/**
 * Aldus_REST_Controller — WP_REST_Controller subclass and route registration.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ---------------------------------------------------------------------------
// WP_REST_Controller — structured REST API class
// ---------------------------------------------------------------------------

/**
 * REST API controller for all Aldus endpoints.
 *
 * Extends WP_REST_Controller to provide structured route handling,
 * a formal JSON Schema via get_item_schema(), and canonical prepare_item_for_response().
 *
 * Routes:
 *   POST /aldus/v1/assemble    — assembles block markup from a token sequence
 *   POST /aldus/v1/record-use  — increments the per-personality usage counter
 */
class Aldus_REST_Controller extends WP_REST_Controller {

	/** @var self|null */
	private static ?self $instance = null;

	/**
	 * Boots the controller singleton and calls register_routes() on rest_api_init.
	 *
	 * Called from aldus_register_rest_routes() which is hooked to rest_api_init.
	 */
	public static function init(): void {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		self::$instance->register_routes();
	}

	public function __construct() {
		$this->namespace = 'aldus/v1';
		$this->rest_base = 'assemble';
	}

	/**
	 * Registers all REST routes for the Aldus plugin.
	 */
	public function register_routes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'assemble' ),
					'permission_callback' => array( $this, 'assemble_permissions_check' ),
					'args'                => $this->get_assemble_args(),
				),
				'schema' => array( $this, 'get_item_schema' ),
			)
		);

		// Lightweight analytics endpoint — increments a per-personality use counter.
		register_rest_route(
			$this->namespace,
			'/record-use',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'record_use' ),
				'permission_callback' => array( $this, 'assemble_permissions_check' ),
				'args'                => array(
					'personality' => array(
						'required'          => true,
						'type'              => 'string',
						'maxLength'         => 64,
						'sanitize_callback' => 'sanitize_text_field',
						'description'       => 'Personality name to record usage for.',
					),
				),
			)
		);
	}

	/**
	 * Permission check for the assemble endpoint — requires edit_posts capability.
	 *
	 * NOTE: Rate limiting is intentionally NOT done here. WordPress may call the
	 * permission callback more than once per request (e.g. during route matching
	 * and again during dispatch).  Incrementing a counter in a function that runs
	 * multiple times per request would cause the effective limit to be lower than
	 * intended.  The rate limiter lives in assemble() instead.
	 *
	 * @param WP_REST_Request $request Full request object.
	 * @return true|WP_Error
	 */
	public function assemble_permissions_check( WP_REST_Request $request ): true|WP_Error {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You do not have permission to assemble layouts.', 'aldus' ),
				array( 'status' => rest_authorization_required_code() )
			);
		}

		// Reject requests that are not JSON-encoded. WordPress's REST layer
		// accepts both application/json and form-encoded bodies; an explicit
		// check here prevents edge cases where a misconfigured client submits
		// form data that passes sanitisation but produces unexpected results.
		$content_type = $request->get_content_type();
		if ( $content_type && ! str_contains( $content_type['value'] ?? '', 'json' ) ) {
			return new WP_Error(
				'invalid_content_type',
				__( 'Request must use application/json content type.', 'aldus' ),
				array( 'status' => 415 )
			);
		}

		return true;
	}

	/**
	 * Increments and checks the per-user rate limit.
	 *
	 * Must only be called from the request callback (not the permission callback)
	 * to avoid double-counting.
	 *
	 * Per-user rate limiter: 60 requests per 60-second fixed window.
	 *
	 * "Fixed window" means the 60-second clock starts on the FIRST request and
	 * does not reset with each subsequent request.  This prevents the accumulation
	 * that occurs when set_transient() resets the TTL on every write.
	 *
	 * External object cache (memcached/redis): wp_cache_incr() is atomic and
	 * naturally supports fixed windows — the key is created with a TTL on the
	 * first call and incremented without touching the TTL thereafter.
	 *
	 * Transient fallback: we store { count, window_start } together so we can
	 * compute the remaining TTL and never extend the window past its original
	 * 60-second boundary.
	 *
	 * @return true|WP_Error  true if within limit; WP_Error 429 if exceeded.
	 */
	private function check_rate_limit(): true|WP_Error {
		// Delegate to the standalone helper so the AI endpoint can share the
		// same algorithm without duplicating code.
		return aldus_check_rate_limit( 60 );
	}

	/**
	 * Returns the route argument definitions for /assemble.
	 *
	 * @return array<string, mixed>
	 */
	private function get_assemble_args(): array {
		return array(
			'items'         => array(
				'required'          => true,
				'description'       => 'Content items to place into the layout.',
				'type'              => 'array',
				'minItems'          => 1,
				'maxItems'          => 80,
				'items'             => array(
					'type'       => 'object',
					'required'   => array( 'type' ),
					'properties' => array(
						'type'     => array(
							'type' => 'string',
							'enum' => array( 'headline', 'subheading', 'paragraph', 'quote', 'image', 'cta', 'list', 'video', 'table', 'gallery', 'code', 'details' ),
						),
						'id'       => array( 'type' => 'string' ),
						'content'  => array( 'type' => 'string' ),
						'url'      => array(
							'type'   => 'string',
							'format' => 'uri',
						),
						'mediaId'  => array( 'type' => 'integer' ),
						'urls'     => array(
							'type'  => 'array',
							'items' => array(
								'type'   => 'string',
								'format' => 'uri',
							),
						),
						'mediaIds' => array(
							'type'  => 'array',
							'items' => array( 'type' => 'integer' ),
						),
					),
				),
				// sanitize_callback retained for deep value sanitization.
				'sanitize_callback' => function ( $items ) {
					if ( ! is_array( $items ) ) {
						return array();
					}
					return array_map( 'aldus_sanitize_item', $items );
				},
			),
			'personality'   => array(
				'required'          => true,
				'type'              => 'string',
				'enum'              => array_keys( aldus_anchor_tokens() ),
				'sanitize_callback' => 'sanitize_text_field',
				'description'       => 'Layout personality name (e.g. Dispatch, Tribune, Folio).',
			),
			'tokens'        => array(
				'required'          => true,
				'description'       => 'Ordered list of block token strings.',
				'type'              => 'array',
				'minItems'          => 1,
				'maxItems'          => 30,
				'items'             => array( 'type' => 'string' ),
				// Custom validator for token allow-list enforcement (not expressible in JSON Schema).
				'validate_callback' => 'aldus_validate_tokens_arg',
			),
			'reroll_count'  => array(
				'required'          => false,
				'type'              => 'integer',
				'minimum'           => 0,
				'maximum'           => 999,
				'default'           => 0,
				'description'       => 'Incremented on each re-roll so variant picks change even when the token sequence is identical.',
				'sanitize_callback' => 'absint',
			),
			'post_id'       => array(
				'required'          => false,
				'type'              => 'integer',
				'minimum'           => 0,
				'default'           => 0,
				'description'       => 'Current post ID; used to enable useFeaturedImage on cover blocks when no image item is provided.',
				'sanitize_callback' => 'absint',
			),
			'custom_styles' => array(
				'required'             => false,
				'type'                 => 'object',
				'default'              => array(),
				'description'          => 'Map of block type → registered style names detected in the editor (e.g. {"pullquote":["plain","default"]}).',
				'additionalProperties' => array(
					'type'  => 'array',
					'items' => array( 'type' => 'string' ),
				),
				'sanitize_callback'    => function ( $val ) {
					if ( ! is_array( $val ) ) {
						return array();
					}
					// Only accept block types that Aldus renderers actually use.
					// This prevents an attacker from sending a large map of fake
					// block types, and caps style entries per block at 10 to bound
					// array size through the render pipeline.
					$known_block_types = array(
						'pullquote',
						'image',
						'button',
						'quote',
						'heading',
						'paragraph',
						'cover',
						'columns',
						'separator',
						'spacer',
					);
					$out = array();
					foreach ( $val as $block_type => $styles ) {
						$safe_type = sanitize_key( $block_type );
						if ( in_array( $safe_type, $known_block_types, true ) && is_array( $styles ) ) {
							$out[ $safe_type ] = array_map( 'sanitize_key', array_slice( $styles, 0, 10 ) );
						}
					}
					return $out;
				},
			),
			'section_label' => array(
				'required'          => false,
				'type'              => 'string',
				'default'           => '',
				'maxLength'         => 60,
				'description'       => 'AI-generated 1–3 word label for the narrow column of columns:28-72 when no subheading is available.',
				'sanitize_callback' => 'sanitize_text_field',
			),
		);
	}

	/**
	 * Returns the JSON Schema for the /assemble response item.
	 *
	 * Registered as the 'schema' callback on the route so that
	 * OPTIONS /aldus/v1/assemble returns a self-describing schema.
	 *
	 * @return array<string, mixed>
	 */
	public function get_item_schema(): array {
		if ( $this->schema ) {
			return $this->add_additional_fields_schema( $this->schema );
		}

		$this->schema = array(
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'aldus-layout',
			'type'       => 'object',
			'properties' => array(
				'success'  => array(
					'description' => 'Whether the assembly succeeded.',
					'type'        => 'boolean',
					'context'     => array( 'view' ),
					'readonly'    => true,
				),
				'label'    => array(
					'description' => 'The personality name used to assemble this layout.',
					'type'        => 'string',
					'context'     => array( 'view' ),
					'readonly'    => true,
				),
				'blocks'   => array(
					'description' => 'Serialized WordPress block markup ready for insertion into the editor.',
					'type'        => 'string',
					'context'     => array( 'view' ),
					'readonly'    => true,
				),
				'tokens'   => array(
					'description' => 'Final ordered token list after anchor enforcement.',
					'type'        => 'array',
					'items'       => array( 'type' => 'string' ),
					'context'     => array( 'view' ),
					'readonly'    => true,
				),
				'sections' => array(
					'description' => 'Per-token section breakdown for Mix & Match.',
					'type'        => 'array',
					'items'       => array(
						'type'       => 'object',
						'properties' => array(
							'token'  => array( 'type' => 'string' ),
							'blocks' => array( 'type' => 'string' ),
						),
					),
					'context'     => array( 'view' ),
					'readonly'    => true,
				),
			),
		);

		return $this->add_additional_fields_schema( $this->schema );
	}

	/**
	 * Prepares the assembled layout for the REST response.
	 *
	 * @param array<string, mixed> $item    Raw assembled layout data.
	 * @param WP_REST_Request      $request Request object.
	 * @return WP_REST_Response
	 */
	public function prepare_item_for_response( $item, $request ): WP_REST_Response {
		$data   = array();
		$schema = $this->get_item_schema();
		$props  = array_keys( $schema['properties'] ?? array() );

		foreach ( $props as $prop ) {
			if ( array_key_exists( $prop, $item ) ) {
				$data[ $prop ] = $item[ $prop ];
			}
		}

		$response = rest_ensure_response( $data );
		$response->add_links(
			array(
				'self' => array(
					'href' => rest_url( $this->namespace . '/' . $this->rest_base ),
				),
			)
		);

		return $response;
	}

	/**
	 * Handles POST /aldus/v1/assemble.
	 *
	 * @param WP_REST_Request $request Full request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function assemble( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$rate_check = $this->check_rate_limit();
		if ( is_wp_error( $rate_check ) ) {
			return $rate_check;
		}
		return aldus_handle_assemble( $request );
	}

	/**
	 * Handles POST /aldus/v1/record-use.
	 *
	 * @param WP_REST_Request $request Full request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function record_use( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		return aldus_handle_record_use( $request );
	}
}

/**
 * Standalone per-user rate limiter callable from any REST handler.
 *
 * Uses the same fixed-window algorithm as the class method so all Aldus
 * endpoints share the same logic.  The transient / cache key is scoped to
 * the current user so different users never interfere with each other.
 *
 * @param int    $limit   Maximum requests allowed per 60-second window.
 * @param string $tk_suffix Optional cache-key suffix to isolate limits per
 *                           endpoint (e.g. 'ai' for the AI generate route).
 * @return true|WP_Error true if within limit; WP_Error 429 if exceeded.
 */
function aldus_check_rate_limit( int $limit = 60, string $tk_suffix = '' ): true|WP_Error {
	$user_id = get_current_user_id();
	$suffix  = $tk_suffix !== '' ? "_{$tk_suffix}" : '';
	$tk      = "aldus_rl_{$user_id}{$suffix}";

	if ( wp_using_ext_object_cache() ) {
		$count = wp_cache_incr( $tk, 1, 'aldus' );
		if ( false === $count ) {
			wp_cache_set( $tk, 1, 'aldus', MINUTE_IN_SECONDS );
			$count = 1;
		}
	} else {
		$stored = get_transient( $tk );
		if ( false === $stored ) {
			$count = 1;
			set_transient(
				$tk,
				array(
					'c' => $count,
					's' => time(),
				),
				MINUTE_IN_SECONDS
			);
		} else {
			$count     = (int) ( $stored['c'] ?? (int) $stored ) + 1;
			$start     = (int) ( $stored['s'] ?? ( time() - MINUTE_IN_SECONDS ) );
			$remaining = max( 1, $start + MINUTE_IN_SECONDS - time() );
			set_transient(
				$tk,
				array(
					'c' => $count,
					's' => $start,
				),
				$remaining
			);
		}
	}

	if ( $count > $limit ) {
		return new WP_Error(
			'rate_limited',
			__( 'Too many requests. Wait a moment and try again.', 'aldus' ),
			array( 'status' => 429 )
		);
	}

	return true;
}
