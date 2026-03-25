<?php
declare(strict_types=1);

namespace Aldus\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Tests for aldus_sanitize_item() in includes/api.php.
 */
class SanitizeItemTest extends TestCase {

	// -----------------------------------------------------------------------
	// Valid items
	// -----------------------------------------------------------------------

	/** @test */
	public function valid_paragraph_item_passes(): void {
		$result = aldus_sanitize_item( [
			'type'    => 'paragraph',
			'content' => 'Hello world',
			'url'     => '',
			'id'      => 'abc-123',
		] );

		$this->assertSame( 'paragraph', $result['type'] );
		$this->assertSame( 'Hello world', $result['content'] );
		$this->assertSame( '', $result['url'] );
		$this->assertSame( 'abc-123', $result['id'] );
	}

	/** @test */
	public function valid_image_item_passes_with_url(): void {
		$result = aldus_sanitize_item( [
			'type'    => 'image',
			'content' => 'Alt text',
			'url'     => 'https://example.com/image.jpg',
			'id'      => 'img-1',
			'mediaId' => 42,
		] );

		$this->assertSame( 'image', $result['type'] );
		$this->assertSame( 'https://example.com/image.jpg', $result['url'] );
		$this->assertSame( 42, $result['mediaId'] );
	}

	// -----------------------------------------------------------------------
	// Type validation
	// -----------------------------------------------------------------------

	/** @test */
	public function invalid_type_returns_empty_type(): void {
		$result = aldus_sanitize_item( [
			'type'    => 'not-a-real-type',
			'content' => 'Content',
			'url'     => '',
		] );

		$this->assertSame( '', $result['type'] );
		$this->assertSame( '', $result['content'] );
	}

	/** @test */
	public function all_valid_content_types_are_accepted(): void {
		$valid_types = [
			'headline', 'subheading', 'paragraph', 'quote',
			'image', 'cta', 'list', 'video', 'table', 'gallery',
		];

		foreach ( $valid_types as $type ) {
			$result = aldus_sanitize_item( [ 'type' => $type, 'content' => 'x', 'url' => '' ] );
			$this->assertSame( $type, $result['type'], "Type '{$type}' should be accepted" );
		}
	}

	// -----------------------------------------------------------------------
	// Content sanitization
	// -----------------------------------------------------------------------

	/** @test */
	public function html_tags_are_stripped_from_content(): void {
		$result = aldus_sanitize_item( [
			'type'    => 'paragraph',
			'content' => '<script>alert("xss")</script>Hello',
			'url'     => '',
		] );

		$this->assertStringNotContainsString( '<script>', $result['content'] );
		$this->assertStringContainsString( 'Hello', $result['content'] );
	}

	/** @test */
	public function content_is_truncated_to_max_length(): void {
		$long    = str_repeat( 'a', 6000 );
		$result  = aldus_sanitize_item( [ 'type' => 'paragraph', 'content' => $long, 'url' => '' ] );

		$this->assertLessThanOrEqual( ALDUS_MAX_CONTENT_LENGTH, mb_strlen( $result['content'] ) );
	}

	// -----------------------------------------------------------------------
	// URL sanitization
	// -----------------------------------------------------------------------

	/** @test */
	public function javascript_url_is_rejected(): void {
		$result = aldus_sanitize_item( [
			'type'    => 'image',
			'content' => '',
			'url'     => 'javascript:alert(1)',
		] );

		$this->assertSame( '', $result['url'], 'javascript: URL must be stripped' );
	}

	/** @test */
	public function valid_https_url_passes(): void {
		$result = aldus_sanitize_item( [
			'type' => 'image',
			'content' => '',
			'url'  => 'https://example.com/photo.jpg',
		] );

		$this->assertSame( 'https://example.com/photo.jpg', $result['url'] );
	}

	// -----------------------------------------------------------------------
	// Non-array input
	// -----------------------------------------------------------------------

	/** @test */
	public function non_array_returns_empty_item(): void {
		$result = aldus_sanitize_item( 'not an array' );

		$this->assertSame( '', $result['type'] );
		$this->assertSame( '', $result['content'] );
		$this->assertSame( '', $result['url'] );
	}

	/** @test */
	public function null_returns_empty_item(): void {
		$result = aldus_sanitize_item( null );

		$this->assertSame( '', $result['type'] );
	}

	// -----------------------------------------------------------------------
	// Gallery-specific fields
	// -----------------------------------------------------------------------

	/** @test */
	public function gallery_urls_are_sanitized(): void {
		$result = aldus_sanitize_item( [
			'type'    => 'gallery',
			'content' => '',
			'url'     => '',
			'urls'    => [
				'https://example.com/img1.jpg',
				'javascript:alert(1)',
				'https://example.com/img2.jpg',
			],
		] );

		$this->assertCount( 2, $result['urls'], 'javascript: URL should be removed' );
		$this->assertContains( 'https://example.com/img1.jpg', $result['urls'] );
		$this->assertContains( 'https://example.com/img2.jpg', $result['urls'] );
	}

	/** @test */
	public function gallery_urls_are_capped_at_twenty(): void {
		$urls   = array_map( fn( $i ) => "https://example.com/{$i}.jpg", range( 1, 30 ) );
		$result = aldus_sanitize_item( [
			'type' => 'gallery',
			'content' => '',
			'url'  => '',
			'urls' => $urls,
		] );

		$this->assertLessThanOrEqual( 20, count( $result['urls'] ) );
	}

	/** @test */
	public function non_array_urls_field_is_ignored(): void {
		$result = aldus_sanitize_item( [
			'type' => 'gallery',
			'content' => '',
			'url'  => '',
			'urls' => 'not-an-array',
		] );

		$this->assertArrayNotHasKey( 'urls', $result );
	}
}
