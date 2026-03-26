<?php
declare(strict_types=1);

/**
 * Integration tests for the aldus/item Block Bindings source.
 *
 * Verifies that:
 *   1. The binding source is registered with WordPress.
 *   2. The get_value callback resolves content from _aldus_items post meta.
 *   3. Unknown item IDs do not cause errors.
 *
 * Requires WordPress 6.5+ for WP_Block_Bindings_Registry and
 * register_block_bindings_source(). Tests are skipped on older versions.
 *
 * Run with: vendor/bin/phpunit -c phpunit-integration.xml.dist
 */
class BlockBindingsTest extends WP_UnitTestCase {

	// -----------------------------------------------------------------------
	// Helpers
	// -----------------------------------------------------------------------

	/**
	 * Skip the test if Block Bindings API is unavailable (WP < 6.5).
	 */
	private function require_block_bindings_api(): void {
		if (
			! class_exists( 'WP_Block_Bindings_Registry' ) ||
			! function_exists( 'register_block_bindings_source' )
		) {
			$this->markTestSkipped( 'WP_Block_Bindings_Registry requires WordPress 6.5+.' );
		}
	}

	// -----------------------------------------------------------------------
	// Test: binding source is registered
	// -----------------------------------------------------------------------

	public function test_bindings_source_is_registered(): void {
		$this->require_block_bindings_api();

		$registry   = WP_Block_Bindings_Registry::get_instance();
		$registered = $registry->get_registered( 'aldus/item' );

		$this->assertNotNull(
			$registered,
			'The "aldus/item" bindings source must be registered.'
		);
	}

	// -----------------------------------------------------------------------
	// Test: binding source resolves headline content from post meta
	// -----------------------------------------------------------------------

	public function test_bindings_source_resolves_headline_from_meta(): void {
		$this->require_block_bindings_api();

		$item_id      = 'test-headline-' . wp_generate_uuid4();
		$item_content = 'Binding Integration Test Headline';

		// Create a post and set the _aldus_items meta.
		$post_id = self::factory()->post->create( [ 'post_status' => 'publish' ] );
		update_post_meta(
			$post_id,
			'_aldus_items',
			wp_json_encode(
				[
					[
						'id'      => $item_id,
						'type'    => 'headline',
						'content' => $item_content,
						'url'     => '',
					],
				]
			)
		);

		// Build a heading block with a binding to this item's content.
		$block_markup = sprintf(
			'<!-- wp:heading {"metadata":{"bindings":{"content":{"source":"aldus/item","args":{"id":"%s","field":"content"}}}}} --><h2 class="wp-block-heading"></h2><!-- /wp:heading -->',
			esc_attr( $item_id )
		);

		// Provide the post context so the bindings callback can find the post meta.
		// parse_blocks() + render_block() with context requires WP 6.5+.
		global $post;
		$original_post = $post;
		// phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
		$post = get_post( $post_id );
		setup_postdata( $post );

		$parsed  = parse_blocks( $block_markup );
		$context = [ 'postId' => $post_id, 'postType' => 'post' ];
		$output  = '';
		foreach ( $parsed as $block ) {
			$output .= ( new WP_Block( $block, $context ) )->render();
		}

		// phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
		$post = $original_post;
		wp_reset_postdata();

		$this->assertStringContainsString(
			$item_content,
			$output,
			'The heading block output must contain the bound item content.'
		);
	}

	// -----------------------------------------------------------------------
	// Test: unknown item ID does not crash rendering
	// -----------------------------------------------------------------------

	public function test_bindings_source_returns_empty_for_unknown_id(): void {
		$this->require_block_bindings_api();

		$post_id = self::factory()->post->create( [ 'post_status' => 'publish' ] );
		update_post_meta(
			$post_id,
			'_aldus_items',
			wp_json_encode(
				[
					[
						'id'      => 'real-id',
						'type'    => 'headline',
						'content' => 'Real content',
						'url'     => '',
					],
				]
			)
		);

		$block_markup =
			'<!-- wp:heading {"metadata":{"bindings":{"content":{"source":"aldus/item","args":{"id":"non-existent-id","field":"content"}}}}} --><h2 class="wp-block-heading"></h2><!-- /wp:heading -->';

		global $post;
		$original_post = $post;
		// phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
		$post = get_post( $post_id );
		setup_postdata( $post );

		// This must not throw an exception.
		$parsed  = parse_blocks( $block_markup );
		$context = [ 'postId' => $post_id, 'postType' => 'post' ];
		$output  = '';
		foreach ( $parsed as $block ) {
			$output .= ( new WP_Block( $block, $context ) )->render();
		}

		// phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
		$post = $original_post;
		wp_reset_postdata();

		// The output should not contain "Real content" (wrong ID).
		$this->assertStringNotContainsString(
			'Real content',
			$output,
			'A non-existent item ID must not resolve to another item\'s content.'
		);

		// The output should still be valid HTML (no exceptions thrown).
		$this->assertStringContainsString( '<h2', $output );
	}

	// -----------------------------------------------------------------------
	// Test: get_value callback returns null when no post meta is set
	// -----------------------------------------------------------------------

	public function test_bindings_get_value_returns_null_when_no_meta(): void {
		$this->require_block_bindings_api();

		// Direct callback test — call aldus_bindings_get_value with a mock WP_Block.
		if ( ! function_exists( 'aldus_bindings_get_value' ) ) {
			$this->markTestSkipped( 'aldus_bindings_get_value function not available.' );
		}

		$post_id   = self::factory()->post->create( [ 'post_status' => 'publish' ] );
		$block_obj = new WP_Block(
			[
				'blockName'    => 'core/heading',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerHTML'    => '',
				'innerContent' => [],
			],
			[ 'postId' => $post_id, 'postType' => 'post' ]
		);

		$result = aldus_bindings_get_value(
			[ 'id' => 'missing-id', 'field' => 'content' ],
			$block_obj
		);

		$this->assertNull(
			$result,
			'aldus_bindings_get_value must return null when no post meta is set for the post.'
		);
	}
}
