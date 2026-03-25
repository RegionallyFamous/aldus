<?php
declare(strict_types=1);

namespace Aldus\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Tests for aldus_sanitize_token() in includes/api.php.
 */
class SanitizeTokenTest extends TestCase {

	// -----------------------------------------------------------------------
	// Valid inputs
	// -----------------------------------------------------------------------

	/** @test */
	public function valid_simple_token_passes_unchanged(): void {
		$this->assertSame( 'paragraph', aldus_sanitize_token( 'paragraph' ) );
	}

	/** @test */
	public function valid_compound_token_passes_unchanged(): void {
		$this->assertSame( 'cover:dark', aldus_sanitize_token( 'cover:dark' ) );
		$this->assertSame( 'columns:28-72', aldus_sanitize_token( 'columns:28-72' ) );
		$this->assertSame( 'media-text:left', aldus_sanitize_token( 'media-text:left' ) );
		$this->assertSame( 'paragraph:dropcap', aldus_sanitize_token( 'paragraph:dropcap' ) );
		$this->assertSame( 'heading:h1', aldus_sanitize_token( 'heading:h1' ) );
		$this->assertSame( 'buttons:cta', aldus_sanitize_token( 'buttons:cta' ) );
	}

	// -----------------------------------------------------------------------
	// Case normalisation
	// -----------------------------------------------------------------------

	/** @test */
	public function uppercase_letters_are_lowercased(): void {
		$this->assertSame( 'cover:dark', aldus_sanitize_token( 'Cover:Dark' ) );
		$this->assertSame( 'paragraph', aldus_sanitize_token( 'PARAGRAPH' ) );
	}

	// -----------------------------------------------------------------------
	// Character stripping
	// -----------------------------------------------------------------------

	/** @test */
	public function spaces_are_stripped(): void {
		$this->assertSame( 'coverdark', aldus_sanitize_token( 'cover dark' ) );
	}

	/** @test */
	public function non_allowlist_characters_are_stripped(): void {
		// The allowlist is [a-z0-9:_\-]; angle brackets, quotes, parens, null bytes are stripped.
		// Note: letters from stripped tags remain (e.g. "script" from "<script>").
		$this->assertStringNotContainsString( '<', aldus_sanitize_token( 'cover:dark<script>' ) );
		$this->assertStringNotContainsString( '"', aldus_sanitize_token( 'cover:dark"onload' ) );
		$this->assertStringNotContainsString( '(', aldus_sanitize_token( 'cover:dark(1)' ) );
		$this->assertStringNotContainsString( '=', aldus_sanitize_token( 'cover=dark' ) );
		// Null bytes are stripped.
		$result = aldus_sanitize_token( "cover\0dark" );
		$this->assertStringNotContainsString( "\0", $result );
	}

	/** @test */
	public function slashes_are_stripped(): void {
		$this->assertSame( 'coverdark', aldus_sanitize_token( 'cover/dark' ) );
		$this->assertSame( 'coverdark', aldus_sanitize_token( 'cover\\dark' ) );
	}

	// -----------------------------------------------------------------------
	// Edge cases
	// -----------------------------------------------------------------------

	/** @test */
	public function empty_string_returns_empty_string(): void {
		$this->assertSame( '', aldus_sanitize_token( '' ) );
	}

	/** @test */
	public function numeric_input_is_cast_to_string(): void {
		$this->assertSame( '123', aldus_sanitize_token( 123 ) );
		$this->assertSame( '456', aldus_sanitize_token( 456 ) );
	}

	/** @test */
	public function null_input_returns_empty_string(): void {
		$this->assertSame( '', aldus_sanitize_token( null ) );
	}

	/** @test */
	public function array_input_produces_string_output(): void {
		// PHP casts arrays to the string 'Array'; lowercase letters pass the allowlist.
		// The important guarantee is that the function returns a string, not an exception.
		$result = @aldus_sanitize_token( [] ); // suppress Array-to-string notice in PHP 8.
		$this->assertIsString( $result );
	}

	/** @test */
	public function boolean_input_is_handled(): void {
		$this->assertSame( '1', aldus_sanitize_token( true ) );
		$this->assertSame( '', aldus_sanitize_token( false ) );
	}
}
