<?php
declare(strict_types=1);

namespace Aldus\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Tests for aldus_prune_unavailable_tokens() in includes/tokens.php.
 */
class PruneTokensTest extends TestCase {

	private const DISPATCH = 'Dispatch';

	/** @test */
	public function removes_image_tokens_without_image(): void {
		// image:wide is not a Dispatch anchor — pruned when no image is available.
		// image:full is a Nocturne anchor and is kept for that personality even without image.
		$tokens   = [ 'heading:h1', 'image:wide', 'paragraph' ];
		$manifest = [ 'headline' => 1, 'paragraph' => 1 ];
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest, self::DISPATCH );

		$this->assertNotContains( 'image:wide', $result );
		$this->assertContains( 'heading:h1', $result );
		$this->assertContains( 'paragraph', $result );
	}

	/** @test */
	public function removes_quote_tokens_without_quote(): void {
		$tokens   = [ 'paragraph', 'quote' ];
		$manifest = [ 'paragraph' => 3 ]; // no quote
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest, self::DISPATCH );

		$this->assertNotContains( 'quote', $result );
		$this->assertContains( 'paragraph', $result );
	}

	/** @test */
	public function keeps_quote_tokens_when_quote_present(): void {
		$tokens   = [ 'paragraph', 'quote' ];
		$manifest = [ 'paragraph' => 2, 'quote' => 1 ];
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest, self::DISPATCH );

		$this->assertContains( 'quote', $result );
	}

	/** @test */
	public function removes_gallery_tokens_without_gallery(): void {
		$tokens   = [ 'paragraph', 'gallery:2-col' ];
		$manifest = [ 'paragraph' => 2 ];
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest, self::DISPATCH );

		$this->assertNotContains( 'gallery:2-col', $result );
	}

	/** @test */
	public function removes_video_tokens_without_video(): void {
		$tokens   = [ 'paragraph', 'video:hero', 'video:section' ];
		$manifest = [ 'paragraph' => 2 ];
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest, self::DISPATCH );

		$this->assertNotContains( 'video:hero', $result );
		$this->assertNotContains( 'video:section', $result );
	}

	/** @test */
	public function removes_table_tokens_without_table(): void {
		$tokens   = [ 'paragraph', 'table:data' ];
		$manifest = [ 'paragraph' => 2 ];
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest, self::DISPATCH );

		$this->assertNotContains( 'table:data', $result );
	}

	/** @test */
	public function keeps_anchor_tokens_even_without_content(): void {
		// cover:dark is an anchor for Dispatch — should survive pruning even
		// if there's no 'image' in the manifest.
		$tokens   = [ 'cover:dark', 'image:wide' ];
		$manifest = []; // no content at all
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest, self::DISPATCH );

		$this->assertContains( 'cover:dark', $result );
		$this->assertNotContains( 'image:wide', $result );
	}

	/** @test */
	public function returns_empty_array_from_empty_tokens(): void {
		$result = aldus_prune_unavailable_tokens( [], [], self::DISPATCH );
		$this->assertSame( [], $result );
	}

	/** @test */
	public function preserves_structural_tokens_with_no_requirements(): void {
		$tokens   = [ 'paragraph', 'separator', 'spacer:small', 'spacer:large', 'heading:h2' ];
		$manifest = [];
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest, self::DISPATCH );

		$this->assertContains( 'paragraph', $result );
		$this->assertContains( 'separator', $result );
		$this->assertContains( 'spacer:small', $result );
		$this->assertContains( 'heading:h2', $result );
	}

	/** @test */
	public function removes_code_block_for_dispatch_when_manifest_has_no_code(): void {
		$tokens   = [ 'paragraph', 'code:block' ];
		$manifest = [ 'paragraph' => 2 ];
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest, self::DISPATCH );

		$this->assertNotContains( 'code:block', $result );
		$this->assertContains( 'paragraph', $result );
	}

	/** @test */
	public function keeps_code_block_for_codex_when_manifest_has_no_code(): void {
		$tokens   = [ 'paragraph', 'code:block' ];
		$manifest = [ 'paragraph' => 2 ];
		$result   = aldus_prune_unavailable_tokens( $tokens, $manifest, 'Codex' );

		$this->assertContains( 'code:block', $result );
		$this->assertContains( 'paragraph', $result );
	}
}
