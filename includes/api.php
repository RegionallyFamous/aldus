<?php
declare(strict_types=1);
/**
 * REST API endpoints — layout assembly.
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
			[
				[
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'assemble' ],
					'permission_callback' => [ $this, 'assemble_permissions_check' ],
					'args'                => $this->get_assemble_args(),
				],
				'schema' => [ $this, 'get_item_schema' ],
			]
		);

		// Lightweight analytics endpoint — increments a per-personality use counter.
		register_rest_route(
			$this->namespace,
			'/record-use',
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'record_use' ],
				'permission_callback' => [ $this, 'assemble_permissions_check' ],
				'args'                => [
					'personality' => [
						'required'          => true,
						'type'              => 'string',
						'maxLength'         => 64,
						'sanitize_callback' => 'sanitize_text_field',
						'description'       => 'Personality name to record usage for.',
					],
				],
			]
		);
	}

	/**
	 * Permission check for the assemble endpoint — requires edit_posts capability
	 * and enforces a per-user rate limit of 60 requests per minute.
	 *
	 * @param WP_REST_Request $request Full request object.
	 * @return true|WP_Error
	 */
	public function assemble_permissions_check( WP_REST_Request $request ): true|WP_Error {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You do not have permission to assemble layouts.', 'aldus' ),
				[ 'status' => rest_authorization_required_code() ]
			);
		}

		// Per-user rate limiter: 60 requests per minute.
		// Uses atomic wp_cache_incr() when an external object cache (memcached/redis)
		// is available to prevent race-condition bypasses. Falls back to transients
		// on single-server installs where the non-atomic window is negligible.
		$user_id = get_current_user_id();
		$tk      = "aldus_rl_{$user_id}";
		if ( wp_using_ext_object_cache() ) {
			$count = wp_cache_incr( $tk, 1, 'aldus' );
			if ( false === $count ) {
				// Key did not exist yet — prime it with a TTL.
				wp_cache_set( $tk, 1, 'aldus', MINUTE_IN_SECONDS );
				$count = 1;
			}
		} else {
			$count = (int) get_transient( $tk );
			if ( $count < 60 ) {
				set_transient( $tk, $count + 1, MINUTE_IN_SECONDS );
			}
		}
		if ( $count > 60 ) {
			return new WP_Error(
				'rate_limited',
				__( 'Too many requests. Wait a moment and try again.', 'aldus' ),
				[ 'status' => 429 ]
			);
		}

		return true;
	}

	/**
	 * Returns the route argument definitions for /assemble.
	 *
	 * @return array<string, mixed>
	 */
	private function get_assemble_args(): array {
		return [
			'items'       => [
				'required'    => true,
				'description' => 'Content items to place into the layout.',
				'type'        => 'array',
				'minItems'    => 1,
				'maxItems'    => 80,
				'items'       => [
					'type'       => 'object',
					'required'   => [ 'type' ],
					'properties' => [
						'type'    => [
							'type' => 'string',
							'enum' => [ 'headline', 'subheading', 'paragraph', 'quote', 'image', 'cta', 'list', 'video', 'table', 'gallery' ],
						],
						'id'      => [ 'type' => 'string' ],
						'content' => [ 'type' => 'string' ],
						'url'     => [ 'type' => 'string', 'format' => 'uri' ],
					'mediaId'  => [ 'type' => 'integer' ],
					'urls'     => [ 'type' => 'array', 'items' => [ 'type' => 'string', 'format' => 'uri' ] ],
					'mediaIds' => [ 'type' => 'array', 'items' => [ 'type' => 'integer' ] ],
					],
				],
				// sanitize_callback retained for deep value sanitization.
				'sanitize_callback' => function ( $items ) {
					if ( ! is_array( $items ) ) {
						return [];
					}
					return array_map( 'aldus_sanitize_item', $items );
				},
			],
			'personality' => [
				'required'          => true,
				'type'              => 'string',
				'enum'              => array_keys( aldus_anchor_tokens() ),
				'sanitize_callback' => 'sanitize_text_field',
				'description'       => 'Layout personality name (e.g. Dispatch, Tribune, Folio).',
			],
			'tokens'      => [
				'required'          => true,
				'description'       => 'Ordered list of block token strings.',
				'type'              => 'array',
				'minItems'          => 1,
				'maxItems'          => 30,
				'items'             => [ 'type' => 'string' ],
				// Custom validator for token allow-list enforcement (not expressible in JSON Schema).
				'validate_callback' => 'aldus_validate_tokens_arg',
			],
			'reroll_count' => [
				'required'          => false,
				'type'              => 'integer',
				'minimum'           => 0,
				'maximum'           => 999,
				'default'           => 0,
				'description'       => 'Incremented on each re-roll so variant picks change even when the token sequence is identical.',
				'sanitize_callback' => 'absint',
			],
			'use_bindings' => [
				'required'    => false,
				'type'        => 'boolean',
				'default'     => false,
				'description' => 'When true, generated blocks include Block Bindings attrs referencing _aldus_items post meta by item ID.',
			],
		];
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

		$this->schema = [
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'aldus-layout',
			'type'       => 'object',
			'properties' => [
				'success' => [
					'description' => 'Whether the assembly succeeded.',
					'type'        => 'boolean',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'label'   => [
					'description' => 'The personality name used to assemble this layout.',
					'type'        => 'string',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'blocks'  => [
					'description' => 'Serialized WordPress block markup ready for insertion into the editor.',
					'type'        => 'string',
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'tokens'  => [
					'description' => 'Final ordered token list after anchor enforcement.',
					'type'        => 'array',
					'items'       => [ 'type' => 'string' ],
					'context'     => [ 'view' ],
					'readonly'    => true,
				],
				'sections' => [
					'description' => 'Per-token section breakdown for Mix & Match.',
					'type'        => 'array',
					'items'       => [
						'type'       => 'object',
						'properties' => [
							'token'  => [ 'type' => 'string' ],
							'blocks' => [ 'type' => 'string' ],
						],
					],
					'context'  => [ 'view' ],
					'readonly' => true,
				],
			],
		];

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
		$data    = [];
		$schema  = $this->get_item_schema();
		$props   = array_keys( $schema['properties'] ?? [] );

		foreach ( $props as $prop ) {
			if ( array_key_exists( $prop, $item ) ) {
				$data[ $prop ] = $item[ $prop ];
			}
		}

		$response = rest_ensure_response( $data );
		$response->add_links( [
			'self' => [
				'href' => rest_url( $this->namespace . '/' . $this->rest_base ),
			],
		] );

		return $response;
	}

	/**
	 * Handles POST /aldus/v1/assemble.
	 *
	 * @param WP_REST_Request $request Full request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function assemble( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		return aldus_handle_assemble( $request );
	}

	/**
	 * Handles POST /aldus/v1/record-use.
	 *
	 * @param WP_REST_Request $request Full request object.
	 * @return WP_REST_Response
	 */
	public function record_use( WP_REST_Request $request ): WP_REST_Response {
		return aldus_handle_record_use( $request );
	}
}

/**
 * Bootstraps the REST controller.
 *
 * Hooked to rest_api_init. Instantiates Aldus_REST_Controller and
 * calls register_routes() so all endpoints are registered with WordPress.
 */
function aldus_register_rest_routes(): void {
	Aldus_REST_Controller::init();
}

/**
 * Returns every token string recognised by aldus_render_block_token().
 *
 * @return list<string>
 */
function aldus_valid_tokens(): array {
	static $cached = null;
	if ( null !== $cached ) {
		return $cached;
	}
	$tokens = [
		// Covers
		'cover:dark',
		'cover:light',
		'cover:minimal',
		'cover:split',
		// Columns
		'columns:2-equal',
		'columns:28-72',
		'columns:3-equal',
		'columns:4-equal',
		// Media
		'media-text:left',
		'media-text:right',
		// Groups
		'group:dark-full',
		'group:light-full',
		'group:accent-full',
		'group:border-box',
		'group:gradient-full',
		// Pull quotes
		'pullquote:wide',
		'pullquote:full-solid',
		'pullquote:centered',
		// Headings
		'heading:h1',
		'heading:h2',
		'heading:h3',
		'heading:display',
		'heading:kicker',
		// Paragraphs
		'paragraph',
		'paragraph:dropcap',
		// Images
		'image:wide',
		'image:full',
		// Quotes
		'quote',
		'quote:attributed',
		// Structure
		'list',
		'separator',
		'spacer:small',
		'spacer:large',
		'spacer:xlarge',
		'buttons:cta',
		// Video
		'video:hero',
		'video:section',
		// Table
		'table:data',
		// Gallery
		'gallery:2-col',
		'gallery:3-col',
	];

	/**
	 * Filter the list of valid layout tokens.
	 *
	 * Add entries here to register custom tokens handled by an `aldus_tokens_before_render` filter.
	 *
	 * @param string[] $tokens List of valid token strings.
	 */
	$cached = (array) apply_filters( 'aldus_valid_tokens', $tokens );
	return $cached;
}

/**
 * Validates the tokens argument for /assemble.
 *
 * @param mixed $value
 * @return bool|WP_Error
 */
function aldus_validate_tokens_arg( mixed $value ): bool|WP_Error {
	if ( ! is_array( $value ) || empty( $value ) ) {
		return new WP_Error( 'invalid_tokens', __( 'Tokens must be a non-empty array.', 'aldus' ), [ 'status' => 400 ] );
	}
	if ( count( $value ) > 30 ) {
		return new WP_Error( 'too_many_tokens', __( 'Maximum 30 tokens allowed.', 'aldus' ), [ 'status' => 400 ] );
	}
	$valid = aldus_valid_tokens();
	foreach ( $value as $token ) {
		$sanitized = aldus_sanitize_token( is_string( $token ) ? $token : '' );
		if ( ! in_array( $sanitized, $valid, true ) ) {
			return new WP_Error(
				'invalid_token',
				/* translators: %s: the unrecognised token string */
				sprintf( __( 'Unrecognised token: %s', 'aldus' ), sanitize_text_field( (string) $token ) ),
				[ 'status' => 400 ]
			);
		}
	}
	return true;
}

/**
 * /assemble handler — assembles block markup from a pre-computed token list.
 * No LLM call here; the browser ran the model and sent us the result.
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response|WP_Error
 */
function aldus_handle_assemble( WP_REST_Request $request ): WP_REST_Response|WP_Error {
	// Items arrive pre-sanitized by the route's sanitize_callback. Re-run sanitization
	// here as defense-in-depth: this guards against any path that bypasses the REST
	// layer (e.g. direct PHP calls in tests or future internal callers).
	$items = array_values(
		array_filter(
			array_map(
				'aldus_sanitize_item',
				(array) $request->get_param( 'items' )
			),
			fn( $item ) => is_array( $item ) && ! empty( $item['type'] )
		)
	);
	$personality = $request->get_param( 'personality' );
	// Sanitize each token; filter out any that reduced to empty strings.
	$tokens = array_values(
		array_filter(
			array_map( 'aldus_sanitize_token', (array) $request->get_param( 'tokens' ) )
		)
	);

	// Build manifest so anchor-enforcement knows what content is available.
	$manifest = [];
	foreach ( $items as $item ) {
		if ( ! is_array( $item ) || empty( $item['type'] ) ) {
			continue;
		}
		$manifest[ $item['type'] ] = ( $manifest[ $item['type'] ] ?? 0 ) + 1;
	}

	// Enforce structural anchors for this personality (same logic as /generate).
	$tokens = aldus_enforce_anchors( $personality, $tokens, $manifest );

	if ( empty( $tokens ) ) {
		return new WP_Error( 'empty_tokens', __( 'No valid tokens after anchor enforcement.', 'aldus' ), [ 'status' => 400 ] );
	}

	/**
	 * Filter the pruned token sequence for a personality just before block rendering.
	 *
	 * @param string[] $tokens      Ordered, pruned token list.
	 * @param string   $personality Personality name (e.g. "Dispatch").
	 * @param array    $items       Sanitized content items.
	 */
	$tokens = (array) apply_filters( 'aldus_tokens_before_render', $tokens, $personality, $items );
	// Re-sanitize after filter — third-party code could inject arbitrary strings.
	$valid_set = array_flip( aldus_valid_tokens() );
	$tokens    = array_values(
		array_filter(
			array_map( 'aldus_sanitize_token', $tokens ),
			fn( string $t ) => $t !== '' && isset( $valid_set[ $t ] )
		)
	);

	// Fetch theme data for block styling — computed once, shared across all tokens.
	$palette    = aldus_get_theme_palette();
	$font_sizes = aldus_get_theme_font_sizes();
	$gradients  = aldus_get_theme_gradients();

	// Derive a per-personality seed so renderer variants differ across personalities.
	$personality_keys = array_keys( aldus_anchor_tokens() );
	$seed_index       = array_search( $personality, $personality_keys, true );
	$base_seed        = ( false !== $seed_index ) ? (int) $seed_index : 0;

	// Mix in reroll_count so that repeated re-rolls with the same token sequence
	// still produce different block variant picks.
	$reroll_count = (int) $request->get_param( 'reroll_count' );
	$layout_seed  = $base_seed + $reroll_count * 37;

	// Precompute shared theme values so each renderer call doesn't repeat this work.
	$theme_ctx = [
		'dark'     => aldus_pick_dark( $palette ),
		'light'    => aldus_pick_light( $palette ),
		'accent'   => aldus_pick_accent( $palette ),
		'large'    => aldus_pick_large_font( $font_sizes ),
		'gradient' => aldus_pick_gradient( $gradients ),
	];

	$style_rules   = aldus_personality_style_rules();
	$style_ctx     = $style_rules[ $personality ] ?? [];
	$token_weights = aldus_token_weights();

	$use_bindings = (bool) $request->get_param( 'use_bindings' );

	$dist = new Aldus_Content_Distributor( $items );
	$dist->prepare();

	// Build the static parts of context once; only rhythm changes per token.
	$base_context = [
		'theme'        => $theme_ctx,
		'style'        => $style_ctx,
		'manifest'     => $manifest,
		'use_bindings' => $use_bindings,
	];

	$markup     = '';
	$sections   = [];
	$prev_heavy = false;
	foreach ( $tokens as $index => $token ) {
		$context           = $base_context;
		$context['rhythm'] = [ 'prev_heavy' => $prev_heavy ];
		$token_markup      = aldus_render_block_token( $token, $dist, $palette, $font_sizes, $index, $layout_seed, $context );
		$markup           .= $token_markup;
		// Trim once and reuse to avoid double trim() per iteration.
		$token_markup_trimmed = ltrim( $token_markup );
		if ( '' !== $token_markup_trimmed ) {
			$sections[] = [
				'token'  => $token,
				'blocks' => $token_markup,
			];
			$weight     = $token_weights[ $token ] ?? 'reading';
			$prev_heavy = ( 'heavy' === $weight || 'visual' === $weight );
		}
	}

	if ( '' === trim( $markup ) ) {
		return new WP_Error( 'empty_markup', __( 'Could not build markup for this layout. Try again.', 'aldus' ), [ 'status' => 422 ] );
	}

	/**
	 * Filter the fully assembled block markup string for a layout.
	 *
	 * Must return a non-empty string of serialized WordPress block markup.
	 * Returning an empty string will cause a 422 error to be returned to the client.
	 *
	 * @param string   $markup      Serialized block markup ready for insertion.
	 * @param string   $personality Personality name.
	 * @param array    $items       Sanitized content items.
	 */
	$markup = (string) apply_filters( 'aldus_assembled_blocks', $markup, $personality, $items );
	// Guard against filters that zero out the markup.
	if ( '' === trim( $markup ) ) {
		return new WP_Error( 'empty_markup', __( 'Could not build markup for this layout. Try again.', 'aldus' ), [ 'status' => 422 ] );
	}

	/**
	 * Fires after a layout has been successfully assembled and is about to be returned.
	 *
	 * Useful for analytics, logging, or caching assembled layouts.
	 *
	 * @param string   $personality Personality name.
	 * @param string[] $tokens      Final token list used.
	 * @param string   $markup      Assembled block markup.
	 */
	do_action( 'aldus_layout_generated', $personality, $tokens, $markup );

	return rest_ensure_response(
		[
			'success'  => true,
			'label'    => $personality,
			'blocks'   => $markup,
			'tokens'   => $tokens,
			'sections' => $sections,
		]
	);
}

/**
 * Sanitizes a single token string.
 *
 * Token names use lowercase letters, digits, colons, hyphens, and underscores
 * (e.g. "cover:dark", "columns:28-72"). sanitize_key() would strip the colon
 * and corrupt these names, so we use a custom allow-list regex instead.
 *
 * @param mixed $token
 * @return string
 */
function aldus_sanitize_token( mixed $token ): string {
	return preg_replace( '/[^a-z0-9:_\-]/', '', strtolower( (string) $token ) ) ?? '';
}

/** Maximum character length for a single content string. */
const ALDUS_MAX_CONTENT_LENGTH = 5000;

/** Content types the distributor and renderers understand. */
const ALDUS_VALID_ITEM_TYPES = [
	'headline', 'subheading', 'paragraph', 'quote',
	'image', 'cta', 'list', 'video', 'table', 'gallery',
];

/**
 * Sanitizes a single content item from the request.
 *
 * @param mixed $raw  Expected to be an array; non-arrays are rejected with an empty-type item.
 * @return array{type:string,content:string,url:string,id:string,mediaId:int}
 */
function aldus_sanitize_item( mixed $raw ): array {
	if ( ! is_array( $raw ) ) {
		return [ 'type' => '', 'content' => '', 'url' => '', 'id' => '', 'mediaId' => 0 ];
	}

	$type = sanitize_key( $raw['type'] ?? '' );
	// Reject items with unrecognised types early so they never reach the distributor.
	if ( ! in_array( $type, ALDUS_VALID_ITEM_TYPES, true ) ) {
		return [ 'type' => '', 'content' => '', 'url' => '', 'id' => '', 'mediaId' => 0 ];
	}

	$content = sanitize_textarea_field( $raw['content'] ?? '' );
	if ( mb_strlen( $content ) > ALDUS_MAX_CONTENT_LENGTH ) {
		$content = mb_substr( $content, 0, ALDUS_MAX_CONTENT_LENGTH );
	}

	$item = [
		'type'    => $type,
		'content' => $content,
		'url'     => esc_url_raw( $raw['url'] ?? '' ),
		'id'      => sanitize_text_field( (string) ( $raw['id'] ?? '' ) ),
		'mediaId' => absint( $raw['mediaId'] ?? 0 ),
	];

	// Gallery items carry an array of image URLs and optional attachment IDs.
	if ( isset( $raw['urls'] ) && is_array( $raw['urls'] ) ) {
		$item['urls'] = array_values(
			array_filter(
				array_map( 'esc_url_raw', array_slice( $raw['urls'], 0, 20 ) ),
				fn( $u ) => ! empty( $u )
			)
		);
	}
	if ( isset( $raw['mediaIds'] ) && is_array( $raw['mediaIds'] ) ) {
		$item['mediaIds'] = array_map( 'absint', array_slice( $raw['mediaIds'], 0, 20 ) );
	}

	return $item;
}

// ---------------------------------------------------------------------------
// Anchor enforcement — structural variety guarantee
// ---------------------------------------------------------------------------

/**
 * Per-personality required anchor tokens. If the LLM omits them, PHP inserts
 * them at the front of the sequence. This guarantees 8 structurally distinct
 * layouts even if the small model produces redundant output.
 *
 * Uses a static cache so the array is only built once per request regardless
 * of how many times it is called (anchor enforcement + pruning both call it).
 *
 * @return array<string,list<string>>
 */
function aldus_anchor_tokens(): array {
	static $map = null;
	if ( null !== $map ) {
		return $map;
	}
	$base = [
		// Original 8
		'Dispatch'    => [ 'cover:dark', 'pullquote:full-solid', 'buttons:cta' ],
		'Folio'       => [ 'columns:28-72', 'pullquote:wide' ],
		'Stratum'     => [ 'group:dark-full', 'group:light-full', 'group:accent-full' ],
		'Broadside'   => [ 'media-text:left', 'media-text:right', 'group:accent-full' ],
		'Manifesto'   => [ 'heading:h1', 'group:dark-full', 'columns:3-equal' ],
		'Nocturne'    => [ 'cover:dark', 'image:full' ],
		'Tribune'     => [ 'columns:3-equal', 'pullquote:full-solid' ],
		'Overture'    => [ 'cover:light', 'media-text:right', 'group:accent-full' ],
		// Phase 1 additions
		'Codex'       => [ 'heading:display', 'heading:kicker', 'group:border-box' ],
		'Dusk'        => [ 'cover:split', 'group:gradient-full' ],
		'Broadsheet'  => [ 'columns:4-equal', 'pullquote:centered' ],
		'Solstice'    => [ 'cover:minimal', 'columns:2-equal' ],
		'Mirage'      => [ 'group:gradient-full', 'pullquote:centered', 'cover:split' ],
		'Ledger'      => [ 'columns:2-equal', 'quote:attributed', 'group:border-box' ],
		// Gallery personalities
		'Mosaic'      => [ 'gallery:3-col', 'buttons:cta' ],
		'Prism'       => [ 'columns:3-equal', 'gallery:3-col' ],
	];

	/**
	 * Filter the personality anchor map.
	 *
	 * Add, remove, or modify personalities. Each key is a personality name; each
	 * value is an array of token strings that must appear in that personality's output.
	 *
	 * @param array<string, string[]> $personalities Personality name → required anchor tokens.
	 */
	$map = (array) apply_filters( 'aldus_personalities', $base );
	return $map;
}

/**
 * Ensures required anchor tokens are present in the sequence.
 *
 * Strict personalities (creativity=0): missing anchors are prepended, locking
 * the opening structure. Loose personalities (creativity=1): missing anchors
 * are appended at the end, letting the model's ordering stand.
 *
 * @param string        $label     Layout personality label.
 * @param list<string>  $tokens    LLM-returned token sequence.
 * @param array<string,int> $manifest Content type counts.
 * @return list<string>
 */
function aldus_enforce_anchors( string $label, array $tokens, array $manifest ): array {
	$anchors_map = aldus_anchor_tokens();
	$required    = $anchors_map[ $label ] ?? [];

	// High-creativity (loose) personalities: anchors may appear anywhere.
	// Loose personalities have anchors appended (they can lead with anything).
	// Folio is strict — its columns:28-72 anchor must open the layout.
	$loose_personalities = [ 'Stratum', 'Nocturne', 'Overture', 'Codex', 'Dusk', 'Solstice', 'Mirage', 'Mosaic' ];
	$is_loose            = in_array( $label, $loose_personalities, true );

	// Prune tokens that need content we don't have.
	$tokens = aldus_prune_unavailable_tokens( $tokens, $manifest );

	// Build a hash set for O(1) membership checks during anchor insertion.
	$token_set = array_flip( $tokens );

	if ( $is_loose ) {
		foreach ( $required as $anchor ) {
			if ( ! isset( $token_set[ $anchor ] ) ) {
				$tokens[]           = $anchor;
				$token_set[ $anchor ] = true;
			}
		}
	} else {
		foreach ( array_reverse( $required ) as $anchor ) {
			if ( ! isset( $token_set[ $anchor ] ) ) {
				array_unshift( $tokens, $anchor );
				$token_set[ $anchor ] = true;
			}
		}
	}

	// Deduplicate — keep first occurrence only (preserves LLM ordering).
	$seen   = [];
	$unique = [];
	foreach ( $tokens as $token ) {
		if ( ! isset( $seen[ $token ] ) ) {
			$seen[ $token ] = true;
			$unique[]       = $token;
		}
	}

	return $unique;
}

/**
 * Maps every token that requires a specific content type to that type.
 *
 * Tokens absent from this map (headings, paragraphs, separators, spacers)
 * have no content requirement and are never pruned. Anchor tokens that appear
 * here are still never pruned — see aldus_prune_unavailable_tokens().
 *
 * This is the single source of truth. Both aldus_prune_unavailable_tokens()
 * and Aldus_Content_Distributor::prepare() read from here.
 *
 * @return array<string, string>
 */
function aldus_token_content_requirements(): array {
	static $map = null;
	if ( null !== $map ) {
		return $map;
	}
	$map = [
		'cover:dark'           => 'image',
		'cover:light'          => 'image',
		'cover:split'          => 'image',
		'media-text:left'      => 'image',
		'media-text:right'     => 'image',
		'image:wide'           => 'image',
		'image:full'           => 'image',
		'pullquote:wide'       => 'quote',
		'pullquote:full-solid' => 'quote',
		'pullquote:centered'   => 'quote',
		'quote'                => 'quote',
		'quote:attributed'     => 'quote',
		'buttons:cta'          => 'cta',
		'list'                 => 'list',
		'video:hero'           => 'video',
		'video:section'        => 'video',
		'table:data'           => 'table',
		'gallery:2-col'        => 'gallery',
		'gallery:3-col'        => 'gallery',
	];
	return $map;
}

/**
 * Removes tokens that require content types absent from the manifest.
 * Anchor tokens are never pruned — renderers degrade gracefully on empty content.
 *
 * @param list<string>       $tokens
 * @param array<string,int>  $manifest
 * @return list<string>
 */
function aldus_prune_unavailable_tokens( array $tokens, array $manifest ): array {
	$anchor_maps = array_values( aldus_anchor_tokens() );
	// Build a hash set for O(1) anchor membership checks instead of O(n) in_array.
	$anchor_set   = $anchor_maps ? array_flip( array_unique( array_merge( ...$anchor_maps ) ) ) : [];
	$requirements = aldus_token_content_requirements();

	return array_values(
		array_filter(
			$tokens,
			function ( string $token ) use ( $manifest, $anchor_set, $requirements ) {
				if ( isset( $anchor_set[ $token ] ) ) {
					return true;
				}
				$required_type = $requirements[ $token ] ?? null;
				if ( $required_type && empty( $manifest[ $required_type ] ) ) {
					return false;
				}
				return true;
			}
		)
	);
}

// ---------------------------------------------------------------------------
// Theme helpers
// ---------------------------------------------------------------------------

/**
 * Returns the active theme's color palette, sorted by luminance.
 *
 * @return list<array{slug:string,color:string}>
 */
function aldus_get_theme_palette(): array {
	$cache_key = 'aldus_palette_' . ALDUS_VERSION;
	$cached    = wp_cache_get( $cache_key, 'aldus' );
	if ( false !== $cached ) {
		return (array) $cached;
	}

	$settings = wp_get_global_settings( [ 'color', 'palette' ] );
	if ( is_wp_error( $settings ) || ! is_array( $settings ) ) {
		$settings = [];
	}
	$palette = $settings['theme'] ?? $settings['default'] ?? [];

	if ( empty( $palette ) ) {
		$palette = [
			[ 'slug' => 'black',   'color' => '#000000' ],
			[ 'slug' => 'white',   'color' => '#ffffff' ],
			[ 'slug' => 'primary', 'color' => '#005f99' ],
		];
	} else {
		usort(
			$palette,
			fn( $a, $b ) => aldus_hex_luminance( $a['color'] ?? '#888' ) <=> aldus_hex_luminance( $b['color'] ?? '#888' )
		);
	}

	// TTL of one hour prevents stale theme data from persisting indefinitely on
	// long-lived object-cache backends (Redis, Memcached) when a theme is updated
	// without flushing the cache manually.
	wp_cache_set( $cache_key, $palette, 'aldus', HOUR_IN_SECONDS );
	return $palette;
}

/**
 * Returns the theme's registered font size presets.
 *
 * @return list<array{slug:string,size:string}>
 */
function aldus_get_theme_font_sizes(): array {
	$cache_key = 'aldus_font_sizes_' . ALDUS_VERSION;
	$cached    = wp_cache_get( $cache_key, 'aldus' );
	if ( false !== $cached ) {
		return (array) $cached;
	}

	$settings = wp_get_global_settings( [ 'typography', 'fontSizes' ] );
	if ( is_wp_error( $settings ) || ! is_array( $settings ) ) {
		$settings = [];
	}
	$sizes = $settings['theme'] ?? $settings['default'] ?? [];

	if ( empty( $sizes ) ) {
		$sizes = [
			[ 'slug' => 'large',     'size' => '1.5rem' ],
			[ 'slug' => 'x-large',   'size' => '2rem' ],
			[ 'slug' => 'xx-large',  'size' => '2.5rem' ],
		];
	}

	wp_cache_set( $cache_key, $sizes, 'aldus', HOUR_IN_SECONDS );
	return $sizes;
}

/**
 * Calculates relative luminance of a hex color string (for palette sorting).
 *
 * @param string $hex e.g. "#ff6600" or "ff6600"
 * @return float 0 (black) to 1 (white)
 */
function aldus_hex_luminance( string $hex ): float {
	$hex = ltrim( $hex, '#' );
	if ( strlen( $hex ) !== 6 ) {
		return 0.5;
	}
	$r = hexdec( substr( $hex, 0, 2 ) ) / 255;
	$g = hexdec( substr( $hex, 2, 2 ) ) / 255;
	$b = hexdec( substr( $hex, 4, 2 ) ) / 255;

	$linearize = fn( float $c ) => $c <= 0.03928 ? $c / 12.92 : ( ( $c + 0.055 ) / 1.055 ) ** 2.4;

	return 0.2126 * $linearize( $r ) + 0.7152 * $linearize( $g ) + 0.0722 * $linearize( $b );
}

/**
 * Returns the darkest palette slug (lowest luminance).
 *
 * @param list<array{slug:string,color:string}> $palette
 */
function aldus_pick_dark( array $palette ): string {
	return sanitize_html_class( $palette[0]['slug'] ?? 'black' );
}

/**
 * Returns the lightest palette slug (highest luminance).
 *
 * @param list<array{slug:string,color:string}> $palette
 */
function aldus_pick_light( array $palette ): string {
	$last = end( $palette );
	return sanitize_html_class( $last['slug'] ?? 'white' );
}

/**
 * Returns a mid-range palette slug to use as an accent.
 * Picks the entry closest to 40% luminance.
 *
 * @param list<array{slug:string,color:string}> $palette
 */
function aldus_pick_accent( array $palette ): string {
	if ( count( $palette ) < 3 ) {
		return sanitize_html_class( $palette[ (int) floor( count( $palette ) / 2 ) ]['slug'] ?? 'primary' );
	}
	$target = 0.4;
	$best   = $palette[0];
	$best_d = abs( aldus_hex_luminance( $best['color'] ?? '#000' ) - $target );
	foreach ( $palette as $entry ) {
		$d = abs( aldus_hex_luminance( $entry['color'] ?? '#000' ) - $target );
		if ( $d < $best_d ) {
			$best   = $entry;
			$best_d = $d;
		}
	}
	return sanitize_html_class( $best['slug'] ?? 'primary' );
}

/**
 * Returns the largest registered font size slug or a fallback.
 *
 * @param list<array{slug:string,size:string}> $font_sizes
 */
function aldus_pick_large_font( array $font_sizes ): string {
	if ( empty( $font_sizes ) ) {
		return 'x-large';
	}
	// Try to find a slug containing "large", "huge", "giant", "xl", "xxl".
	$hints = [ 'xx-large', 'xxlarge', 'huge', 'giant', 'x-large', 'xlarge', 'large' ];
	foreach ( $hints as $hint ) {
		foreach ( $font_sizes as $fs ) {
			if ( str_contains( strtolower( $fs['slug'] ?? '' ), $hint ) ) {
				return sanitize_html_class( $fs['slug'] );
			}
		}
	}
	// Fall back to the last (assumed largest).
	$last = end( $font_sizes );
	return sanitize_html_class( $last['slug'] ?? 'large' );
}

// ---------------------------------------------------------------------------
// Analytics — personality usage counters
// ---------------------------------------------------------------------------

/**
 * Increments the per-personality usage counter stored in wp_options.
 *
 * Counter key format: `aldus_usage_{name}` (e.g. `aldus_usage_dispatch`).
 * The value is a plain integer.  Fires the `aldus_layout_chosen` action so
 * third-party code can hook in without touching the REST endpoint.
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response
 */
function aldus_handle_record_use( WP_REST_Request $request ): WP_REST_Response {
	$personality = sanitize_text_field( $request->get_param( 'personality' ) );

	if ( empty( $personality ) ) {
		return new WP_Error( 'missing_personality', __( 'Personality is required.', 'aldus' ), [ 'status' => 400 ] );
	}

	// Validate against the known personality list (including filtered additions).
	// This prevents arbitrary option key proliferation from rogue authenticated requests.
	$known = array_keys( aldus_anchor_tokens() );
	if ( ! in_array( $personality, $known, true ) ) {
		return new WP_Error( 'unknown_personality', __( 'Unknown personality.', 'aldus' ), [ 'status' => 400 ] );
	}

	$option_key = 'aldus_usage_' . strtolower( sanitize_html_class( $personality ) );
	$current    = (int) get_option( $option_key, 0 );
	$saved      = update_option( $option_key, $current + 1, false );

	if ( ! $saved ) {
		// update_option returns false when the value is unchanged (already at current+1)
		// or on a DB write failure. Either way, proceed — analytics is best-effort.
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( "Aldus: could not update usage counter for {$option_key}" );
		}
	}

	// Allow external hooks to react (e.g. third-party analytics integrations).
	do_action( 'aldus_layout_chosen', $personality );

	return rest_ensure_response( [ 'success' => true, 'count' => $current + 1 ] );
}
