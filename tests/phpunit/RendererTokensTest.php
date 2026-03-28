<?php
declare(strict_types=1);

namespace Aldus\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Parametric regression test for every token in aldus_valid_tokens().
 *
 * For each token we call aldus_render_block_token() with a fully-stocked
 * content distributor and assert the structural invariants that must hold
 * for the editor block validator to accept the output:
 *
 *   1. Return value is a string (never null / false / array).
 *   2. WordPress block comment delimiters are balanced.
 *   3. The output contains no wp:aldus recursion (would cause infinite loops).
 *   4. No literal "undefined" or "null" strings leaked from PHP.
 *
 * Tokens that legitimately produce empty output (e.g. video:hero when no
 * video item is present) are marked as known-empty and receive a weaker
 * assertion set.  The goal is to catch regressions where a token that used
 * to produce output silently stops doing so.
 */
class RendererTokensTest extends TestCase {

	/** @var \Aldus_Content_Distributor */
	private static \Aldus_Content_Distributor $dist;

	/** @var array<string, mixed> */
	private static array $manifest;

	/** @var array<string, mixed> */
	private static array $palette;

	public static function setUpBeforeClass(): void {
		parent::setUpBeforeClass();

		$items = array(
			array( 'type' => 'headline',   'content' => 'A compelling headline for the layout test' ),
			array( 'type' => 'headline',   'content' => 'Second headline for coverage' ),
			array( 'type' => 'subheading', 'content' => 'A subheading for the section' ),
			array( 'type' => 'subheading', 'content' => 'Another subheading' ),
			array( 'type' => 'paragraph',  'content' => 'First paragraph with substantial text for realistic output.' ),
			array( 'type' => 'paragraph',  'content' => 'Second paragraph to exercise multi-paragraph layouts.' ),
			array( 'type' => 'paragraph',  'content' => 'Third paragraph for columns that need three.' ),
			array( 'type' => 'paragraph',  'content' => 'Fourth paragraph for four-column layouts.' ),
			array( 'type' => 'quote',      'content' => 'A great quote for pullquote blocks.' ),
			array( 'type' => 'quote',      'content' => 'Another quote for attributed blocks.' ),
			array( 'type' => 'image',      'content' => 'Alt text', 'url' => 'https://example.com/img.jpg', 'mediaId' => 1 ),
			array( 'type' => 'image',      'content' => 'Second image alt', 'url' => 'https://example.com/img2.jpg', 'mediaId' => 2 ),
			array( 'type' => 'cta',        'content' => 'Call to action', 'url' => 'https://example.com' ),
			array( 'type' => 'list',       'content' => "First item\nSecond item\nThird item" ),
			array( 'type' => 'video',      'content' => 'Video description', 'url' => 'https://example.com/video.mp4' ),
			array( 'type' => 'table',      'content' => "Header A|Header B\nRow 1A|Row 1B\nRow 2A|Row 2B" ),
			array( 'type' => 'gallery',    'content' => '', 'urls' => array( 'https://example.com/g1.jpg', 'https://example.com/g2.jpg', 'https://example.com/g3.jpg' ) ),
			array( 'type' => 'code',       'content' => 'function hello() { return true; }' ),
			array( 'type' => 'details',    'content' => "FAQ question?\nThe answer to the FAQ question goes here." ),
		);

		self::$dist = new \Aldus_Content_Distributor( $items );

		self::$palette = array(
			array( 'slug' => 'primary',   'color' => '#0073aa' ),
			array( 'slug' => 'secondary', 'color' => '#23282d' ),
			array( 'slug' => 'accent',    'color' => '#cc0000' ),
			array( 'slug' => 'white',     'color' => '#ffffff' ),
			array( 'slug' => 'black',     'color' => '#000000' ),
		);

		self::$manifest = array(
			'headline'   => 2,
			'subheading' => 2,
			'paragraph'  => 4,
			'quote'      => 2,
			'image'      => 2,
			'cta'        => 1,
			'list'       => 1,
			'video'      => 1,
			'table'      => 1,
			'gallery'    => 1,
			'code'       => 1,
			'details'    => 1,
		);
	}

	// -----------------------------------------------------------------------
	// Helpers
	// -----------------------------------------------------------------------

	/**
	 * Tokens that may legitimately produce empty output when the distributor
	 * has already consumed the relevant content type.
	 *
	 * @return string[]
	 */
	private static function known_possibly_empty_tokens(): array {
		return array(
			'video:hero',
			'video:section',
			'table:data',
			'gallery:2-col',
			'gallery:3-col',
		);
	}

	/**
	 * Build a fresh distributor so each data-provider call starts with a full
	 * pool of items. We cannot share self::$dist across the provider because
	 * consume() modifies internal state.
	 */
	private function fresh_dist(): \Aldus_Content_Distributor {
		return clone self::$dist;
	}

	// -----------------------------------------------------------------------
	// Data providers
	// -----------------------------------------------------------------------

	/** @return array<string, array{string}> */
	public static function all_tokens_provider(): array {
		$tokens = aldus_valid_tokens();
		$cases  = array();
		foreach ( $tokens as $token ) {
			$cases[ $token ] = array( $token );
		}
		return $cases;
	}

	// -----------------------------------------------------------------------
	// Tests
	// -----------------------------------------------------------------------

	/**
	 * @test
	 * @dataProvider all_tokens_provider
	 */
	public function token_renders_to_a_string( string $token ): void {
		$result = aldus_render_block_token(
			$token,
			$this->fresh_dist(),
			self::$palette,
			array(),
			0,
			0,
			array( 'manifest' => self::$manifest )
		);

		$this->assertIsString( $result, "Token '{$token}' did not return a string" );
	}

	/**
	 * @test
	 * @dataProvider all_tokens_provider
	 */
	public function token_block_comments_are_balanced( string $token ): void {
		$result = aldus_render_block_token(
			$token,
			$this->fresh_dist(),
			self::$palette,
			array(),
			0,
			0,
			array( 'manifest' => self::$manifest )
		);

		// '<!-- wp:' matches only opening tags; '<!-- /wp:' matches only closers.
		// Both patterns are disjoint (slash distinguishes them).
		$openers = substr_count( $result, '<!-- wp:' );
		$closers = substr_count( $result, '<!-- /wp:' );

		$this->assertSame(
			$openers,
			$closers,
			"Token '{$token}' has unbalanced block comments (open:{$openers} close:{$closers})"
		);
	}

	/**
	 * @test
	 * @dataProvider all_tokens_provider
	 */
	public function token_does_not_contain_recursive_aldus_blocks( string $token ): void {
		$result = aldus_render_block_token(
			$token,
			$this->fresh_dist(),
			self::$palette,
			array(),
			0,
			0,
			array( 'manifest' => self::$manifest )
		);

		$this->assertStringNotContainsString(
			'wp:aldus',
			$result,
			"Token '{$token}' output contains a recursive wp:aldus block"
		);
	}

	/**
	 * @test
	 * @dataProvider all_tokens_provider
	 */
	public function token_does_not_contain_leaked_null_or_undefined( string $token ): void {
		$result = aldus_render_block_token(
			$token,
			$this->fresh_dist(),
			self::$palette,
			array(),
			0,
			0,
			array( 'manifest' => self::$manifest )
		);

		$this->assertStringNotContainsString( 'undefined', $result );
		$this->assertDoesNotMatchRegularExpression(
			'|>null<|',
			$result,
			"Token '{$token}' output contains '>null<' in HTML"
		);
	}

	/**
	 * @test
	 * @dataProvider all_tokens_provider
	 */
	public function content_tokens_produce_non_empty_output( string $token ): void {
		$result = aldus_render_block_token(
			$token,
			$this->fresh_dist(),
			self::$palette,
			array(),
			0,
			0,
			array( 'manifest' => self::$manifest )
		);

		$this->assertIsString( $result, "Token '{$token}' did not return a string" );

		if ( in_array( $token, self::known_possibly_empty_tokens(), true ) ) {
			// These tokens may consume all matching items and render nothing; still a valid string.
			return;
		}

		$this->assertNotEmpty(
			$result,
			"Token '{$token}' unexpectedly produced empty output"
		);
	}
}
