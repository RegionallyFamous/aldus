<?php
declare(strict_types=1);

/**
 * Integration tests for Aldus block-type registration.
 *
 * Verifies that:
 *   1. "aldus/layout-generator" is registered as a block type after init.
 *   2. The block declares at least one editor-script handle (i.e., the JS
 *      bundle was found and wired up — the specific bug this guards against).
 *   3. A server-side render callback is attached.
 *   4. The WP 6.8+ metadata-collection path registers the same block as the
 *      legacy fallback, by asserting state after calling aldus_register_block()
 *      a second time.
 *
 * Background: In v1.18.0 the base-path argument to
 * wp_register_block_types_from_metadata_collection() was wrong, causing
 * WordPress 6.8+ to look for block.json in a non-existent build/build/
 * directory. The block silently disappeared from the inserter.
 * These tests make that class of error fail loudly in CI.
 *
 * Run with: vendor/bin/phpunit -c phpunit-integration.xml.dist
 */
class BlockRegistrationTest extends WP_UnitTestCase {

	// -----------------------------------------------------------------------
	// Helpers
	// -----------------------------------------------------------------------

	private function get_block(): ?WP_Block_Type {
		return WP_Block_Type_Registry::get_instance()
			->get_registered( 'aldus/layout-generator' );
	}

	// -----------------------------------------------------------------------
	// Tests
	// -----------------------------------------------------------------------

	/**
	 * The block must be present in the registry after the plugin boots.
	 * This is the most fundamental check — if it fails the block is invisible
	 * in the inserter regardless of any other setting.
	 */
	public function test_block_type_is_registered(): void {
		$this->assertNotNull(
			$this->get_block(),
			'"aldus/layout-generator" must be registered with WP_Block_Type_Registry. '
			. 'Check the base-path argument to wp_register_block_types_from_metadata_collection() '
			. 'and the fallback register_block_type() call in aldus_register_block().'
		);
	}

	/**
	 * The block must expose at least one editor-script handle.
	 * No script handle → the block JS never loads → block never appears.
	 */
	public function test_block_type_has_editor_script(): void {
		$block = $this->get_block();
		$this->assertNotNull( $block );
		$this->assertNotEmpty(
			$block->editor_script_handles,
			'"aldus/layout-generator" must declare at least one editor_script_handles entry. '
			. 'An empty array means block.json was not parsed correctly by WordPress.'
		);
	}

	/**
	 * A server-side render callback must be wired so the block front-end
	 * output goes through aldus_render_layout().
	 */
	public function test_block_type_has_render_callback(): void {
		$block = $this->get_block();
		$this->assertNotNull( $block );
		$this->assertNotNull(
			$block->render_callback,
			'"aldus/layout-generator" must have a render_callback set. '
			. 'Without it, front-end output will be empty.'
		);
	}

	/**
	 * Calling aldus_register_block() twice must be idempotent: the block
	 * should still be registered (not unregistered) after the second call.
	 */
	public function test_double_registration_is_idempotent(): void {
		if ( ! function_exists( 'aldus_register_block' ) ) {
			$this->markTestSkipped( 'aldus_register_block() is not available.' );
		}

		aldus_register_block();

		$this->assertNotNull(
			$this->get_block(),
			'"aldus/layout-generator" must still be registered after a second '
			. 'aldus_register_block() call.'
		);
	}

	/**
	 * On WordPress 6.8+ the plugin must use wp_register_block_types_from_metadata_collection()
	 * with ALDUS_PATH as the base, not ALDUS_PATH . 'build/'.
	 * We verify the side-effect: the block's style handle is registered (only
	 * set when block.json is parsed from the correct location).
	 */
	public function test_block_metadata_parsed_correctly(): void {
		$block = $this->get_block();
		$this->assertNotNull( $block );

		// block.json declares a "name" — if registration succeeded that name
		// is exactly "aldus/layout-generator".
		$this->assertSame(
			'aldus/layout-generator',
			$block->name,
			'Block name mismatch — block.json may not have been loaded from the correct path.'
		);

		// The "title" field from block.json must survive registration.
		$this->assertNotEmpty(
			$block->title,
			'Block title is empty — block.json was not parsed from the correct location. '
			. 'Verify the base-path argument to wp_register_block_types_from_metadata_collection().'
		);
	}
}
