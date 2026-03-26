<?php
declare(strict_types=1);
/**
 * Block Bindings source and post meta registration for Aldus.
 *
 * When a user generates a layout with "Store items in post meta" enabled,
 * the content items are written to _aldus_items post meta alongside the
 * inserted blocks. Each bound block carries a bindings attribute pointing
 * to its item by ID, and this source resolves that ID back to the actual
 * content at render time.
 *
 * This allows editing an item's value in post meta to live-update every
 * block in the layout that references it, without re-running generation.
 *
 * Requires WordPress 6.5+ for register_block_bindings_source(). A
 * function_exists() guard keeps the plugin activatable on WP 6.4.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'init', 'aldus_register_meta_and_bindings', 20 );

/**
 * Registers the _aldus_items post meta field and the aldus/item binding source.
 *
 * Priority 20 so it runs after core's default 'init' callbacks have set up
 * the REST API infrastructure we depend on for show_in_rest.
 */
function aldus_register_meta_and_bindings(): void {
	// Register the meta field on all standard content post types.
	// Registering per type (rather than with '' which targets every CPT) prevents
	// accidental exposure on third-party post types that may have their own REST
	// security rules. The auth_callback provides an additional capability gate.
	$post_types = (array) apply_filters( 'aldus_meta_post_types', array( 'post', 'page' ) );
	foreach ( $post_types as $post_type ) {
		register_post_meta(
			$post_type,
			'_aldus_items',
			array(
				'type'              => 'string',
				'description'       => 'JSON-encoded array of Aldus content items bound to this post\'s layout.',
				'single'            => true,
				'show_in_rest'      => true,
				'auth_callback'     => fn() => current_user_can( 'edit_posts' ),
				'sanitize_callback' => 'aldus_sanitize_items_meta',
			)
		);

		// Stores the client IDs of container blocks locked to content-only mode
		// so the lock can be restored across editor sessions.
		register_post_meta(
			$post_type,
			'_aldus_locked_blocks',
			array(
				'type'              => 'string',
				'description'       => 'JSON-encoded array of block client IDs locked to content-only editing mode by Aldus.',
				'single'            => true,
				'show_in_rest'      => true,
				'auth_callback'     => fn() => current_user_can( 'edit_posts' ),
				'sanitize_callback' => static function ( $value ) {
					if ( ! is_string( $value ) || '' === $value ) {
						return '[]';
					}
					$decoded = json_decode( $value, true );
					if ( ! is_array( $decoded ) ) {
						return '[]';
					}
					// Allow only arrays of UUID-shaped strings (block client IDs).
					$ids = array_filter(
						$decoded,
						static function ( $id ) {
							return is_string( $id ) && preg_match( '/^[0-9a-f\-]{10,64}$/i', $id );
						}
					);
					return wp_json_encode( array_values( $ids ) );
				},
			)
		);

		// Stores a JSON array of the last 20 layout history entries for the UX history panel.
		register_post_meta(
			$post_type,
			'_aldus_layout_history',
			array(
				'type'              => 'string',
				'description'       => 'JSON-encoded array of Aldus layout history entries for this post.',
				'single'            => true,
				'default'           => '[]',
				'show_in_rest'      => true,
				'auth_callback'     => fn() => current_user_can( 'edit_posts' ),
				'sanitize_callback' => 'sanitize_text_field',
			)
		);
	}

	// Block Bindings API requires WP 6.5+.
	if ( ! function_exists( 'register_block_bindings_source' ) ) {
		return;
	}

	register_block_bindings_source(
		'aldus/item',
		array(
			'label'              => __( 'Aldus content item', 'aldus' ),
			'get_value_callback' => 'aldus_bindings_get_value',
			'uses_context'       => array( 'postId', 'postType' ),
		)
	);
}

/**
 * Sanitizes the _aldus_items meta value before storage.
 *
 * Decodes, validates each item against the same rules as the REST sanitizer,
 * then re-encodes. Returns an empty JSON array on any failure so the meta is
 * always valid JSON and never stores raw user input verbatim.
 *
 * @param string $value Raw meta value (expected to be a JSON string).
 * @return string Sanitized JSON string.
 */
function aldus_sanitize_items_meta( string $value ): string {
	try {
		$decoded = json_decode( $value, true, 8, JSON_THROW_ON_ERROR );
	} catch ( \JsonException $e ) {
		return '[]';
	}
	if ( ! is_array( $decoded ) ) {
		return '[]';
	}
	$clean = array_values(
		array_filter(
			array_map( 'aldus_sanitize_item', $decoded ),
			fn( $item ) => is_array( $item ) && ! empty( $item['type'] )
		)
	);
	return wp_json_encode( $clean ) ?: '[]';
}

/**
 * Block Bindings get_value callback for the aldus/item source.
 *
 * Called by WordPress core for every bound block attribute at render time.
 * Looks up the item by ID from _aldus_items post meta and returns the
 * attribute value the block needs.
 *
 * Binding args shape:
 *   { "id": "abc123", "field": "content" }
 *   { "id": "abc123", "field": "url" }     ← used for core/image url and alt bindings
 *
 * @param array<string, mixed> $source_args  The 'args' from the block's bindings attribute.
 * @param WP_Block             $block_instance The block being rendered.
 * @return string|null The resolved value, or null when the item cannot be found.
 */
function aldus_bindings_get_value( array $source_args, WP_Block $block_instance ): ?string {
	$post_id = (int) ( $block_instance->context['postId'] ?? get_the_ID() );
	if ( ! $post_id ) {
		return null;
	}

	$item_id = sanitize_key( $source_args['id'] ?? '' );
	if ( ! $item_id ) {
		return null;
	}

	// Only expose fields that Aldus explicitly writes to bound blocks.
	// Allowlisting prevents accidental exposure of future item keys.
	$field = sanitize_key( $source_args['field'] ?? 'content' );
	if ( ! in_array( $field, array( 'content', 'url' ), true ) ) {
		return null;
	}

	static $cache = array();
	if ( ! isset( $cache[ $post_id ] ) ) {
		// Evict the oldest entry once the per-request cache exceeds 50 posts to
		// prevent unbounded memory growth on admin pages that render many posts.
		if ( count( $cache ) >= 50 ) {
			reset( $cache );
			unset( $cache[ key( $cache ) ] );
		}
		$raw = get_post_meta( $post_id, '_aldus_items', true );
		try {
			$list = $raw ? json_decode( $raw, true, 8, JSON_THROW_ON_ERROR ) : array();
		} catch ( \JsonException $e ) {
			$list = array();
		}
		// Index by item ID so each subsequent lookup is O(1) instead of O(n).
		$map = array();
		foreach ( (array) $list as $entry ) {
			if ( is_array( $entry ) && isset( $entry['id'] ) ) {
				// Key through sanitize_key so lookups from get_value_callback (which
				// also use sanitize_key) always find the right entry regardless of
				// how the ID was originally stored.
				$map[ sanitize_key( (string) $entry['id'] ) ] = $entry;
			}
		}
		$cache[ $post_id ] = $map;
	}

	$item = $cache[ $post_id ][ $item_id ] ?? null;
	if ( $item === null ) {
		return null;
	}
	return isset( $item[ $field ] ) ? (string) $item[ $field ] : null;
}
