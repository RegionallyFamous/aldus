<?php
declare(strict_types=1);

namespace Aldus\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Tests for aldus_enforce_anchors() in includes/api.php.
 */
class EnforceAnchorsTest extends TestCase {

	// -----------------------------------------------------------------------
	// Dispatch (strict personality)
	// -----------------------------------------------------------------------

	/** @test */
	public function dispatch_prepends_missing_anchors(): void {
		$tokens   = [ 'paragraph', 'separator' ];
		$manifest = [ 'headline' => 1, 'paragraph' => 2, 'quote' => 1, 'cta' => 1 ];
		$result   = aldus_enforce_anchors( 'Dispatch', $tokens, $manifest );

		// Required anchors for Dispatch: cover:dark, pullquote:full-solid, buttons:cta.
		$this->assertContains( 'cover:dark', $result );
		$this->assertContains( 'pullquote:full-solid', $result );
		$this->assertContains( 'buttons:cta', $result );
	}

	/** @test */
	public function dispatch_does_not_duplicate_existing_anchors(): void {
		$tokens   = [ 'cover:dark', 'pullquote:full-solid', 'buttons:cta', 'paragraph' ];
		$manifest = [ 'headline' => 1, 'paragraph' => 1, 'quote' => 1, 'cta' => 1 ];
		$result   = aldus_enforce_anchors( 'Dispatch', $tokens, $manifest );

		$this->assertSame( 1, (int) array_count_values( $result )['cover:dark'] );
		$this->assertSame( 1, (int) array_count_values( $result )['pullquote:full-solid'] );
		$this->assertSame( 1, (int) array_count_values( $result )['buttons:cta'] );
	}

	/** @test */
	public function dispatch_strict_anchors_appear_at_front(): void {
		$tokens   = [ 'paragraph' ];
		$manifest = [ 'headline' => 1, 'paragraph' => 1, 'quote' => 1, 'cta' => 1 ];
		$result   = aldus_enforce_anchors( 'Dispatch', $tokens, $manifest );

		// For strict personalities, cover:dark (first required anchor) should be at position 0.
		$this->assertSame( 'cover:dark', $result[0] );
	}

	// -----------------------------------------------------------------------
	// Nocturne (loose personality)
	// -----------------------------------------------------------------------

	/** @test */
	public function nocturne_appends_missing_anchors_at_end(): void {
		$tokens   = [ 'paragraph', 'separator', 'heading:h2' ];
		$manifest = [ 'headline' => 1, 'paragraph' => 2, 'image' => 1 ];
		$result   = aldus_enforce_anchors( 'Nocturne', $tokens, $manifest );

		// Loose personalities have anchors appended — cover:dark and image:full
		// should follow the original tokens.
		$first_original = array_search( 'paragraph', $result, true );
		$cover_pos      = array_search( 'cover:dark', $result, true );
		$this->assertNotFalse( $cover_pos );
		$this->assertGreaterThan( $first_original, $cover_pos );
	}

	// -----------------------------------------------------------------------
	// Token pruning
	// -----------------------------------------------------------------------

	/** @test */
	public function prunes_non_anchor_image_tokens_when_no_image_in_manifest(): void {
		// image:wide is not a Dispatch anchor — enforce_anchors calls prune internally.
		$tokens   = [ 'heading:h1', 'image:wide', 'paragraph' ];
		$manifest = [ 'headline' => 1, 'paragraph' => 2 ]; // no image
		$result   = aldus_enforce_anchors( 'Dispatch', $tokens, $manifest );

		$this->assertNotContains( 'image:wide', $result );
	}

	/** @test */
	public function keeps_image_tokens_when_image_present(): void {
		$tokens   = [ 'heading:h1', 'image:wide', 'paragraph' ];
		$manifest = [ 'headline' => 1, 'paragraph' => 2, 'image' => 1 ];
		$result   = aldus_enforce_anchors( 'Dispatch', $tokens, $manifest );

		$this->assertContains( 'image:wide', $result );
	}

	// -----------------------------------------------------------------------
	// Edge cases
	// -----------------------------------------------------------------------

	/** @test */
	public function returns_array_for_unknown_personality(): void {
		$result = aldus_enforce_anchors( 'NonExistentPersonality', [], [] );
		$this->assertIsArray( $result );
	}

	/** @test */
	public function deduplicates_tokens(): void {
		$tokens   = [ 'paragraph', 'paragraph', 'separator' ];
		$manifest = [ 'paragraph' => 2 ];
		$result   = aldus_enforce_anchors( 'Solstice', $tokens, $manifest );

		$this->assertSame( 1, (int) array_count_values( $result )['paragraph'] );
	}
}
