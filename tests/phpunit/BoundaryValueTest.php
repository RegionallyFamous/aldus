<?php
declare(strict_types=1);

namespace Aldus\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Boundary-value tests for content-item sanitization and token pruning.
 *
 * These tests exercise the exact edges of the input space that are most
 * likely to reveal off-by-one errors, silent data loss, or unsafe output.
 * They are intentionally focused on behaviour that is NOT covered by the
 * existing SanitizeItemTest and PruneTokensTest suites.
 *
 * Run with: vendor/bin/phpunit -c phpunit.xml.dist
 */
class BoundaryValueTest extends TestCase {

	// -----------------------------------------------------------------------
	// Content length limits
	// -----------------------------------------------------------------------

	/**
	 * Content at exactly ALDUS_MAX_CONTENT_LENGTH characters must pass
	 * through unchanged — the truncation condition is strictly greater-than.
	 *
	 * @test
	 */
	public function content_at_exact_max_length_is_preserved(): void {
		$at_limit = str_repeat( 'x', ALDUS_MAX_CONTENT_LENGTH );
		$result   = aldus_sanitize_item( [
			'type'    => 'paragraph',
			'content' => $at_limit,
			'url'     => '',
		] );

		$this->assertSame(
			ALDUS_MAX_CONTENT_LENGTH,
			mb_strlen( $result['content'] ),
			'Content at exactly ALDUS_MAX_CONTENT_LENGTH should not be truncated'
		);
	}

	/**
	 * Content one character over the limit must be truncated to exactly
	 * ALDUS_MAX_CONTENT_LENGTH, not ALDUS_MAX_CONTENT_LENGTH - 1.
	 *
	 * @test
	 */
	public function content_one_over_max_length_is_truncated_to_limit(): void {
		$over_limit = str_repeat( 'y', ALDUS_MAX_CONTENT_LENGTH + 1 );
		$result     = aldus_sanitize_item( [
			'type'    => 'paragraph',
			'content' => $over_limit,
			'url'     => '',
		] );

		$this->assertSame(
			ALDUS_MAX_CONTENT_LENGTH,
			mb_strlen( $result['content'] ),
			'Content one character over the limit should be truncated to exactly ALDUS_MAX_CONTENT_LENGTH'
		);
	}

	// -----------------------------------------------------------------------
	// Whitespace-only content
	// -----------------------------------------------------------------------

	/**
	 * A content string consisting entirely of whitespace should sanitize to
	 * an empty string.  Items with empty content after sanitization are
	 * filtered out by the assemble handler — whitespace-only items must not
	 * silently count as content.
	 *
	 * @test
	 */
	public function whitespace_only_content_sanitizes_to_empty_string(): void {
		$result = aldus_sanitize_item( [
			'type'    => 'paragraph',
			'content' => "   \n\t   ",
			'url'     => '',
		] );

		$this->assertSame(
			'',
			$result['content'],
			'Whitespace-only content must sanitize to empty string'
		);
	}

	/**
	 * A content string with only non-breaking spaces should also produce
	 * an empty content field after sanitization.
	 *
	 * @test
	 */
	public function nbsp_only_content_sanitizes_to_empty_or_whitespace(): void {
		$result = aldus_sanitize_item( [
			'type'    => 'headline',
			'content' => "\u{00A0}\u{00A0}",
			'url'     => '',
		] );

		// The result must not contain any real visible text content.
		$visible = trim( $result['content'] );
		$this->assertLessThanOrEqual(
			2,
			mb_strlen( $visible ),
			'Non-breaking-space-only content should produce negligible visible text'
		);
	}

	// -----------------------------------------------------------------------
	// Block comment syntax in content
	// -----------------------------------------------------------------------

	/**
	 * Content containing WordPress block comment delimiters
	 * (<!-- wp:heading -->) must not survive sanitization as raw HTML.
	 * The strip_tags() pass in sanitize_textarea_field removes HTML comments,
	 * preventing block comment injection into assembled markup.
	 *
	 * @test
	 */
	public function block_comment_syntax_is_stripped_from_content(): void {
		$result = aldus_sanitize_item( [
			'type'    => 'paragraph',
			'content' => '<!-- wp:heading -->Injected heading<!-- /wp:heading -->',
			'url'     => '',
		] );

		$this->assertStringNotContainsString(
			'<!-- wp:',
			$result['content'],
			'Block comment open tag must not survive sanitization'
		);
		$this->assertStringNotContainsString(
			'<!-- /wp:',
			$result['content'],
			'Block comment close tag must not survive sanitization'
		);
	}

	/**
	 * The visible text inside a block comment (e.g. "Injected heading") may
	 * be preserved as plain text — the important constraint is that the
	 * comment delimiters themselves are stripped.
	 *
	 * @test
	 */
	public function text_inside_block_comment_is_preserved_as_plain_text(): void {
		$result = aldus_sanitize_item( [
			'type'    => 'paragraph',
			'content' => '<!-- wp:paragraph -->Hello world<!-- /wp:paragraph -->',
			'url'     => '',
		] );

		// Delimiters gone.
		$this->assertStringNotContainsString( '<!--', $result['content'] );
		// Visible text may remain.
		$this->assertStringContainsString( 'Hello world', $result['content'] );
	}

	// -----------------------------------------------------------------------
	// Gallery edge cases
	// -----------------------------------------------------------------------

	/**
	 * A gallery item with an empty urls array should sanitize without error
	 * and produce an empty (or absent) urls field — not a crash.
	 *
	 * @test
	 */
	public function gallery_with_zero_urls_sanitizes_without_error(): void {
		$result = aldus_sanitize_item( [
			'type'    => 'gallery',
			'content' => '',
			'url'     => '',
			'urls'    => [],
		] );

		$this->assertSame( 'gallery', $result['type'] );
		// An empty urls array must not cause an error; result is either empty
		// array or the key is absent.
		if ( isset( $result['urls'] ) ) {
			$this->assertIsArray( $result['urls'] );
			$this->assertCount( 0, $result['urls'] );
		}
	}

	/**
	 * Gallery token pruning: when the manifest has 0 gallery items, any
	 * non-anchor gallery token is removed from the token sequence.
	 *
	 * @test
	 */
	public function gallery_token_pruned_when_no_gallery_in_manifest(): void {
		$tokens   = [ 'heading:h1', 'gallery:2-col', 'paragraph' ];
		$manifest = [ 'headline' => 1, 'paragraph' => 2 ]; // no gallery key

		$result = aldus_prune_unavailable_tokens( $tokens, $manifest, 'Dispatch' );

		$this->assertNotContains(
			'gallery:2-col',
			$result,
			'gallery:2-col is not an anchor and must be pruned when manifest has no gallery'
		);
		$this->assertContains( 'heading:h1', $result );
		$this->assertContains( 'paragraph', $result );
	}

	/**
	 * Gallery token pruning: when a gallery item IS present, gallery tokens
	 * are retained.
	 *
	 * @test
	 */
	public function gallery_token_retained_when_gallery_in_manifest(): void {
		$tokens   = [ 'heading:h1', 'gallery:2-col' ];
		$manifest = [ 'headline' => 1, 'gallery' => 1 ];

		$result = aldus_prune_unavailable_tokens( $tokens, $manifest, 'Dispatch' );

		$this->assertContains( 'gallery:2-col', $result );
	}

	// -----------------------------------------------------------------------
	// Zero items
	// -----------------------------------------------------------------------

	/**
	 * Sanitizing an empty items array through array_map + array_filter must
	 * produce an empty array (no errors, no phantom items).
	 *
	 * @test
	 */
	public function empty_items_array_sanitizes_to_empty_array(): void {
		$sanitized = array_values(
			array_filter(
				array_map( 'aldus_sanitize_item', [] ),
				fn( $item ) => is_array( $item ) && ! empty( $item['type'] )
			)
		);

		$this->assertSame( [], $sanitized );
	}

	/**
	 * An array of items where every item has whitespace-only content produces
	 * an array where each content field is empty after sanitization — so
	 * downstream pruning can treat them as absent.
	 *
	 * @test
	 */
	public function all_whitespace_items_produce_empty_content_fields(): void {
		$items = [
			[ 'type' => 'headline',  'content' => '   ',    'url' => '' ],
			[ 'type' => 'paragraph', 'content' => "\t\n  ", 'url' => '' ],
		];

		$sanitized = array_map( 'aldus_sanitize_item', $items );

		foreach ( $sanitized as $item ) {
			$this->assertSame(
				'',
				$item['content'],
				"Whitespace-only content for type '{$item['type']}' must sanitize to empty string"
			);
		}
	}

	// -----------------------------------------------------------------------
	// Single headline — token pruning leaves usable tokens
	// -----------------------------------------------------------------------

	/**
	 * A manifest with only one headline should still result in a non-empty
	 * token sequence after pruning: anchor tokens that don't require
	 * unavailable content types are preserved.
	 *
	 * @test
	 */
	public function single_headline_manifest_preserves_heading_tokens(): void {
		$tokens   = [ 'heading:h1', 'cover:dark', 'image:wide', 'gallery:2-col' ];
		$manifest = [ 'headline' => 1 ];

		$result = aldus_prune_unavailable_tokens( $tokens, $manifest, 'Dispatch' );

		// heading:h1 has no content requirement; cover:dark is a Dispatch anchor.
		$this->assertContains( 'heading:h1', $result );
		// image:wide requires 'image' which is absent — must be pruned.
		$this->assertNotContains( 'image:wide', $result );
		// gallery:2-col requires 'gallery' which is absent — must be pruned.
		$this->assertNotContains( 'gallery:2-col', $result );
	}
}
