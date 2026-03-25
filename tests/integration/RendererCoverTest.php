<?php
declare(strict_types=1);

/**
 * Integration tests for aldus_block_cover() in includes/templates.php.
 *
 * Requires a real WordPress installation (WP_UnitTestCase).
 * Run with: vendor/bin/phpunit -c phpunit-integration.xml.dist
 */
class RendererCoverTest extends WP_UnitTestCase {

	// -----------------------------------------------------------------------
	// Helper
	// -----------------------------------------------------------------------

	/**
	 * @param list<string> $types
	 * @return Aldus_Content_Distributor
	 */
	private function make_dist( array $types ): Aldus_Content_Distributor {
		$items = [];
		foreach ( $types as $type ) {
			$items[] = [
				'type'    => $type,
				'content' => "Sample {$type} content for testing.",
				'url'     => 'image' === $type ? 'https://example.com/test.jpg' : '',
				'id'      => uniqid( "{$type}-", true ),
				'mediaId' => 0,
			];
		}
		return new Aldus_Content_Distributor( $items );
	}

	// -----------------------------------------------------------------------
	// Tests
	// -----------------------------------------------------------------------

	public function test_cover_dark_contains_cover_block_markup(): void {
		$dist   = $this->make_dist( [ 'headline', 'paragraph', 'image' ] );
		$result = aldus_block_cover( $dist, 'dark', 'primary', 'large', 'Cover Section', 0 );

		$this->assertStringContainsString( 'wp-block-cover', $result );
		$this->assertStringContainsString( 'alignfull', $result );
	}

	public function test_cover_output_starts_with_block_comment(): void {
		$dist   = $this->make_dist( [ 'headline', 'image' ] );
		$result = aldus_block_cover( $dist, 'dark', 'contrast', 'large', 'Cover', 0 );

		$this->assertStringStartsWith( '<!-- wp:cover', $result );
	}

	public function test_cover_escapes_user_content(): void {
		$dist = new Aldus_Content_Distributor( [
			[
				'type'    => 'headline',
				'content' => '<script>alert("xss")</script>Clean Title',
				'url'     => '',
				'id'      => 'h-1',
				'mediaId' => 0,
			],
			[
				'type'    => 'image',
				'content' => '',
				'url'     => 'https://example.com/test.jpg',
				'id'      => 'img-1',
				'mediaId' => 0,
			],
		] );

		$result = aldus_block_cover( $dist, 'dark', 'primary', 'large', 'Cover', 0 );

		$this->assertStringNotContainsString( '<script>', $result );
		$this->assertStringContainsString( 'Clean Title', $result );
	}

	public function test_cover_returns_string_without_image(): void {
		$dist = $this->make_dist( [ 'headline', 'paragraph' ] );
		$result = aldus_block_cover( $dist, 'dark', 'primary', 'large', 'Cover', 0 );

		$this->assertIsString( $result );
	}

	public function test_cover_output_is_parseable_as_blocks(): void {
		$dist   = $this->make_dist( [ 'headline', 'paragraph', 'image' ] );
		$result = aldus_block_cover( $dist, 'dark', 'primary', 'large', 'Cover', 0 );

		$parsed = parse_blocks( $result );
		$real   = array_filter( $parsed, fn( $b ) => ! empty( $b['blockName'] ) );

		$this->assertNotEmpty( $real, 'Output must parse into at least one named block' );
		$this->assertSame( 'core/cover', $real[0]['blockName'] ?? null );
	}

	public function test_cover_light_variant_produces_different_classes(): void {
		$dist_dark  = $this->make_dist( [ 'headline', 'image' ] );
		$dist_light = $this->make_dist( [ 'headline', 'image' ] );

		$dark_result  = aldus_block_cover( $dist_dark, 'dark', 'contrast', 'large', 'Cover', 0 );
		$light_result = aldus_block_cover( $dist_light, 'light', 'base', 'large', 'Cover', 0 );

		// The two variants differ in their overlay color classes.
		$this->assertNotSame( $dark_result, $light_result );
	}
}
