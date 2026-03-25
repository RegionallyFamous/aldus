<?php
declare(strict_types=1);

namespace Aldus\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Tests for aldus_prune_unavailable_tokens() in includes/api.php.
 */
class PruneTokensTest extends TestCase {

	/** @test */
	public function removes_image_tokens_without_image(): void {
		$tokens   = [ 'heading:h1', 'image:wide', 'paragraph', 'image:full' ];
		$manifest = [ 'headline' => 1, 'paragraph' => 1 ];
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest );

		$this->assertNotContains( 'image:wide', $result );
		$this->assertNotContains( 'image:full', $result );
		$this->assertContains( 'heading:h1', $result );
		$this->assertContains( 'paragraph', $result );
	}

	/** @test */
	public function removes_quote_tokens_without_quote(): void {
		$tokens   = [ 'paragraph', 'pullquote:wide', 'pullquote:full-solid', 'quote' ];
		$manifest = [ 'paragraph' => 3 ]; // no quote
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest );

		$this->assertNotContains( 'pullquote:wide', $result );
		$this->assertNotContains( 'pullquote:full-solid', $result );
		$this->assertNotContains( 'quote', $result );
	}

	/** @test */
	public function keeps_quote_tokens_when_quote_present(): void {
		$tokens   = [ 'paragraph', 'pullquote:wide', 'quote' ];
		$manifest = [ 'paragraph' => 2, 'quote' => 1 ];
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest );

		$this->assertContains( 'pullquote:wide', $result );
		$this->assertContains( 'quote', $result );
	}

	/** @test */
	public function removes_gallery_tokens_without_gallery(): void {
		$tokens   = [ 'paragraph', 'gallery:2-col', 'gallery:3-col' ];
		$manifest = [ 'paragraph' => 2 ];
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest );

		$this->assertNotContains( 'gallery:2-col', $result );
		$this->assertNotContains( 'gallery:3-col', $result );
	}

	/** @test */
	public function removes_video_tokens_without_video(): void {
		$tokens   = [ 'paragraph', 'video:hero', 'video:section' ];
		$manifest = [ 'paragraph' => 2 ];
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest );

		$this->assertNotContains( 'video:hero', $result );
		$this->assertNotContains( 'video:section', $result );
	}

	/** @test */
	public function removes_table_tokens_without_table(): void {
		$tokens   = [ 'paragraph', 'table:data' ];
		$manifest = [ 'paragraph' => 2 ];
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest );

		$this->assertNotContains( 'table:data', $result );
	}

	/** @test */
	public function keeps_anchor_tokens_even_without_content(): void {
		// cover:dark is an anchor for Dispatch — should survive pruning even
		// if there's no 'image' in the manifest (anchors are never pruned).
		$tokens   = [ 'cover:dark', 'image:wide' ];
		$manifest = []; // no content at all
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest );

		// cover:dark is an anchor, must be kept.
		$this->assertContains( 'cover:dark', $result );
		// image:wide is not an anchor and needs 'image', so it is pruned.
		$this->assertNotContains( 'image:wide', $result );
	}

	/** @test */
	public function returns_empty_array_from_empty_tokens(): void {
		$result = aldus_prune_unavailable_tokens( [], [] );
		$this->assertSame( [], $result );
	}

	/** @test */
	public function preserves_structural_tokens_with_no_requirements(): void {
		$tokens   = [ 'paragraph', 'separator', 'spacer:small', 'spacer:large', 'heading:h2' ];
		$manifest = [];
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest );

		// These tokens have no content requirements and are never pruned.
		$this->assertContains( 'paragraph', $result );
		$this->assertContains( 'separator', $result );
		$this->assertContains( 'spacer:small', $result );
		$this->assertContains( 'heading:h2', $result );
	}
}
