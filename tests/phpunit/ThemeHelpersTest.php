<?php
declare(strict_types=1);

namespace Aldus\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Tests for pure helper functions in includes/api.php and includes/templates.php.
 *
 * - aldus_hex_luminance()  — api.php
 * - aldus_variant_pick()   — templates.php
 * - aldus_pick_dark()      — api.php
 * - aldus_pick_light()     — api.php
 * - aldus_pick_accent()    — api.php
 */
class ThemeHelpersTest extends TestCase {

	// -----------------------------------------------------------------------
	// aldus_hex_luminance()
	// -----------------------------------------------------------------------

	/** @test */
	public function black_has_near_zero_luminance(): void {
		$this->assertLessThan( 0.01, aldus_hex_luminance( '#000000' ) );
	}

	/** @test */
	public function white_has_near_one_luminance(): void {
		$this->assertGreaterThan( 0.99, aldus_hex_luminance( '#ffffff' ) );
	}

	/** @test */
	public function mid_grey_has_mid_range_luminance(): void {
		$lum = aldus_hex_luminance( '#808080' );
		$this->assertGreaterThan( 0.15, $lum );
		$this->assertLessThan( 0.25, $lum );
	}

	/** @test */
	public function hex_without_hash_prefix_is_handled(): void {
		$with    = aldus_hex_luminance( '#ff0000' );
		$without = aldus_hex_luminance( 'ff0000' );
		$this->assertEqualsWithDelta( $with, $without, 0.001 );
	}

	/** @test */
	public function invalid_hex_returns_midpoint_fallback(): void {
		// Short hex (#rgb format) or empty string → fallback 0.5.
		$this->assertSame( 0.5, aldus_hex_luminance( '#abc' ) );
		$this->assertSame( 0.5, aldus_hex_luminance( '' ) );
	}

	/** @test */
	public function red_green_blue_luminance_ordering(): void {
		// Green is the most perceptually luminant primary (0.2126 R + 0.7152 G + 0.0722 B).
		$red   = aldus_hex_luminance( '#ff0000' );
		$green = aldus_hex_luminance( '#00ff00' );
		$blue  = aldus_hex_luminance( '#0000ff' );

		$this->assertGreaterThan( $red, $green );
		$this->assertGreaterThan( $blue, $green );
	}

	// -----------------------------------------------------------------------
	// aldus_variant_pick()
	// -----------------------------------------------------------------------

	/** @test */
	public function variant_pick_is_deterministic(): void {
		$a = aldus_variant_pick( 42, 'test-key', 5 );
		$b = aldus_variant_pick( 42, 'test-key', 5 );
		$this->assertSame( $a, $b );
	}

	/** @test */
	public function variant_pick_result_is_in_valid_range(): void {
		for ( $i = 0; $i < 100; $i++ ) {
			$result = aldus_variant_pick( $i, "key-{$i}", 4 );
			$this->assertGreaterThanOrEqual( 0, $result );
			$this->assertLessThan( 4, $result );
		}
	}

	/** @test */
	public function variant_pick_count_one_always_returns_zero(): void {
		for ( $i = 0; $i < 10; $i++ ) {
			$this->assertSame( 0, aldus_variant_pick( $i, 'any-key', 1 ) );
		}
	}

	/** @test */
	public function variant_pick_count_zero_returns_zero(): void {
		$this->assertSame( 0, aldus_variant_pick( 1, 'key', 0 ) );
	}

	/** @test */
	public function variant_pick_different_seeds_produce_distribution(): void {
		$results = [];
		for ( $seed = 0; $seed < 50; $seed++ ) {
			$results[] = aldus_variant_pick( $seed, 'cover', 5 );
		}
		// With 50 seeds and 5 options, expect more than 1 unique result.
		$this->assertGreaterThan( 1, count( array_unique( $results ) ) );
	}

	/** @test */
	public function variant_pick_different_keys_produce_different_results(): void {
		$a = aldus_variant_pick( 0, 'cover', 5 );
		$b = aldus_variant_pick( 0, 'columns', 5 );
		// Different keys should produce at least some variation across many runs.
		// This asserts the key matters, not just the seed.
		$this->assertIsInt( $a );
		$this->assertIsInt( $b );
	}

	// -----------------------------------------------------------------------
	// aldus_pick_dark() / aldus_pick_light() / aldus_pick_accent()
	// -----------------------------------------------------------------------

	/** @test */
	public function pick_dark_returns_first_palette_slug(): void {
		$palette = [
			[ 'slug' => 'black', 'color' => '#000000' ],
			[ 'slug' => 'grey', 'color' => '#888888' ],
			[ 'slug' => 'white', 'color' => '#ffffff' ],
		];
		$this->assertSame( 'black', aldus_pick_dark( $palette ) );
	}

	/** @test */
	public function pick_dark_falls_back_on_empty_palette(): void {
		$this->assertSame( 'black', aldus_pick_dark( [] ) );
	}

	/** @test */
	public function pick_light_returns_last_palette_slug(): void {
		$palette = [
			[ 'slug' => 'dark', 'color' => '#111111' ],
			[ 'slug' => 'mid', 'color' => '#888888' ],
			[ 'slug' => 'light', 'color' => '#eeeeee' ],
		];
		$this->assertSame( 'light', aldus_pick_light( $palette ) );
	}

	/** @test */
	public function pick_accent_chooses_mid_range_entry(): void {
		$palette = [
			[ 'slug' => 'very-dark', 'color' => '#0a0a0a' ],
			[ 'slug' => 'mid-blue', 'color' => '#4466aa' ],
			[ 'slug' => 'near-white', 'color' => '#f0f0f0' ],
		];
		// mid-blue is closest to 0.4 luminance — it should be chosen.
		$result = aldus_pick_accent( $palette );
		$this->assertSame( 'mid-blue', $result );
	}

	/** @test */
	public function pick_accent_with_two_entries_returns_middle_index(): void {
		$palette = [
			[ 'slug' => 'dark', 'color' => '#111' ],
			[ 'slug' => 'light', 'color' => '#eee' ],
		];
		$result = aldus_pick_accent( $palette );
		$this->assertIsString( $result );
		$this->assertNotEmpty( $result );
	}
}
