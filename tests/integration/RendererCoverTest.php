<?php
declare(strict_types=1);

/**
 * Integration tests for aldus_block_cover() in includes/templates.php.
 *
 * Requires a real WordPress installation (WP_UnitTestCase).
 * Run with: vendor/bin/phpunit -c phpunit-integration.xml.dist
 *
 * Function signature:
 *   aldus_block_cover( Aldus_Content_Distributor $dist, string $color_slug,
 *                      int $dim_ratio, string $font_size, bool $is_light = false,
 *                      string $name = '', int $variant = 0, int $post_id = 0 ): string
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
		$result = aldus_block_cover( $dist, 'dark', 60, 'large', false, 'Cover Section' );

		$this->assertStringContainsString( 'wp-block-cover', $result );
		$this->assertStringContainsString( 'alignfull', $result );
	}

	public function test_cover_output_starts_with_block_comment(): void {
		$dist   = $this->make_dist( [ 'headline', 'image' ] );
		$result = aldus_block_cover( $dist, 'dark', 60, 'large', false, 'Cover' );

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

		$result = aldus_block_cover( $dist, 'dark', 60, 'large', false, 'Cover' );

		$this->assertStringNotContainsString( '<script>', $result );
		$this->assertStringContainsString( 'Clean Title', $result );
	}

	public function test_cover_returns_string_without_image(): void {
		$dist   = $this->make_dist( [ 'headline', 'paragraph' ] );
		$result = aldus_block_cover( $dist, 'dark', 60, 'large', false, 'Cover' );

		$this->assertIsString( $result );
	}

	public function test_cover_output_is_parseable_as_blocks(): void {
		$dist   = $this->make_dist( [ 'headline', 'paragraph', 'image' ] );
		$result = aldus_block_cover( $dist, 'dark', 60, 'large', false, 'Cover' );

		$parsed = parse_blocks( $result );
		$real   = array_filter( $parsed, fn( $b ) => ! empty( $b['blockName'] ) );

		$this->assertNotEmpty( $real, 'Output must parse into at least one named block' );
		$this->assertSame( 'core/cover', $real[0]['blockName'] ?? null );
	}

	public function test_cover_light_variant_produces_different_classes(): void {
		$dist_dark  = $this->make_dist( [ 'headline', 'image' ] );
		$dist_light = $this->make_dist( [ 'headline', 'image' ] );

		$dark_result  = aldus_block_cover( $dist_dark, 'dark', 60, 'large', false, 'Cover' );
		$light_result = aldus_block_cover( $dist_light, 'light', 30, 'large', true, 'Cover' );

		// The two variants differ in their overlay color classes.
		$this->assertNotSame( $dark_result, $light_result );
	}

	// -----------------------------------------------------------------------
	// cover:minimal — aldus_block_cover_minimal()
	// -----------------------------------------------------------------------

	/**
	 * @return Aldus_Content_Distributor
	 */
	private function dist_headline_only(): Aldus_Content_Distributor {
		return new Aldus_Content_Distributor( [
			[
				'type'    => 'headline',
				'content' => 'Minimal cover headline',
				'url'     => '',
				'id'      => 'h-only',
				'mediaId' => 0,
			],
		] );
	}

	public function test_cover_minimal_returns_markup_with_headline(): void {
		$dist   = $this->dist_headline_only();
		$result = aldus_block_cover_minimal( $dist, 'dark', 'large', 'Minimal Cover', null, false );

		$this->assertNotSame( '', $result );
		$this->assertStringContainsString( 'wp-block-cover', $result );
		$this->assertStringContainsString( 'has-white-color', $result );
		$this->assertStringContainsString( 'Minimal cover headline', $result );

		$parsed = parse_blocks( $result );
		$named  = array_values( array_filter( $parsed, fn( $b ) => ! empty( $b['blockName'] ) ) );
		$this->assertSame( 'core/cover', $named[0]['blockName'] ?? null );
		$this->assertStringContainsString( 'overlayColor', $result );
	}

	public function test_cover_minimal_returns_empty_without_headline(): void {
		$empty = new Aldus_Content_Distributor( [
			[
				'type'    => 'paragraph',
				'content' => 'Only a paragraph',
				'url'     => '',
				'id'      => 'p1',
				'mediaId' => 0,
			],
		] );

		$result = aldus_block_cover_minimal( $empty, 'dark', 'large', 'Minimal Cover', null, false );
		$this->assertSame( '', $result );
	}

	public function test_cover_minimal_is_light_uses_black_text_not_white(): void {
		$dist = $this->dist_headline_only();

		$light_bg = aldus_block_cover_minimal( $dist, 'light', 'large', '', null, true );
		$this->assertStringContainsString( 'has-black-color', $light_bg );
		$this->assertStringNotContainsString( 'has-white-color', $light_bg );

		$dist2  = $this->dist_headline_only();
		$dark_t = aldus_block_cover_minimal( $dist2, 'dark', 'large', '', null, false );
		$this->assertStringContainsString( 'has-white-color', $dark_t );
	}

	// -----------------------------------------------------------------------
	// Variant 4 manifesto — no useFeaturedImage in serialized attrs
	// -----------------------------------------------------------------------

	public function test_cover_manifesto_variant_4_omits_use_featured_image_when_post_has_thumbnail(): void {
		if ( ! defined( 'DIR_TESTDATA' ) || ! is_readable( DIR_TESTDATA . '/images/canola.jpg' ) ) {
			$this->markTestSkipped( 'DIR_TESTDATA image fixture not available.' );
		}

		$editor_id = self::factory()->user->create( [ 'role' => 'editor' ] );
		wp_set_current_user( $editor_id );

		$post_id = self::factory()->post->create(
			[
				'post_status'  => 'publish',
				'post_author'  => $editor_id,
				'post_title'   => 'Manifesto post',
				'post_content' => '',
			]
		);

		$attach_id = self::factory()->attachment->create_upload_object(
			DIR_TESTDATA . '/images/canola.jpg',
			$post_id
		);
		set_post_thumbnail( $post_id, $attach_id );

		$dist = new Aldus_Content_Distributor( [
			[
				'type'    => 'headline',
				'content' => 'Manifesto headline only',
				'url'     => '',
				'id'      => 'mh1',
				'mediaId' => 0,
			],
		] );

		$result = aldus_block_cover( $dist, 'dark', 20, 'large', false, 'Manifesto', 4, $post_id );

		$this->assertNotSame( '', $result );
		$this->assertStringNotContainsString(
			'useFeaturedImage',
			$result,
			'Manifesto variant must not serialize useFeaturedImage even when a featured image exists'
		);

		$parsed = parse_blocks( $result );
		$named  = array_values( array_filter( $parsed, fn( $b ) => ! empty( $b['blockName'] ) ) );
		$this->assertSame( 'core/cover', $named[0]['blockName'] ?? null );
	}
}
