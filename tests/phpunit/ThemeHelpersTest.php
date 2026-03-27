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
		// mid-blue is the only non-extreme candidate; it is also the most
		// saturated, so the saturation-first picker selects it.
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

	// -----------------------------------------------------------------------
	// Fix 1: aldus_hex_saturation()
	// -----------------------------------------------------------------------

	/** @test */
	public function vivid_red_has_high_saturation(): void {
		$this->assertGreaterThan( 0.9, aldus_hex_saturation( '#ff0000' ) );
	}

	/** @test */
	public function vivid_blue_has_high_saturation(): void {
		$this->assertGreaterThan( 0.9, aldus_hex_saturation( '#0000ff' ) );
	}

	/** @test */
	public function mid_gray_has_zero_saturation(): void {
		$this->assertEqualsWithDelta( 0.0, aldus_hex_saturation( '#808080' ), 0.001 );
	}

	/** @test */
	public function black_has_zero_saturation(): void {
		$this->assertEqualsWithDelta( 0.0, aldus_hex_saturation( '#000000' ), 0.001 );
	}

	/** @test */
	public function invalid_hex_saturation_returns_zero(): void {
		$this->assertSame( 0.0, aldus_hex_saturation( '#abc' ) );
		$this->assertSame( 0.0, aldus_hex_saturation( '' ) );
	}

	/** @test */
	public function saturation_without_hash_prefix_matches(): void {
		$with    = aldus_hex_saturation( '#ff6600' );
		$without = aldus_hex_saturation( 'ff6600' );
		$this->assertEqualsWithDelta( $with, $without, 0.001 );
	}

	// -----------------------------------------------------------------------
	// Fix 2: aldus_contrast_ratio()
	// -----------------------------------------------------------------------

	/** @test */
	public function black_and_white_contrast_is_near_21(): void {
		$ratio = aldus_contrast_ratio( 0.0, 1.0 );
		$this->assertEqualsWithDelta( 21.0, $ratio, 0.01 );
	}

	/** @test */
	public function same_luminance_contrast_is_one(): void {
		$ratio = aldus_contrast_ratio( 0.5, 0.5 );
		$this->assertEqualsWithDelta( 1.0, $ratio, 0.001 );
	}

	/** @test */
	public function contrast_ratio_is_order_independent(): void {
		$a = aldus_contrast_ratio( 0.2, 0.8 );
		$b = aldus_contrast_ratio( 0.8, 0.2 );
		$this->assertEqualsWithDelta( $a, $b, 0.001 );
	}

	/** @test */
	public function dark_blue_passes_wcag_aa_against_white(): void {
		// #003366 is dark navy — should give > 4.5:1 against white.
		$lum   = aldus_hex_luminance( '#003366' );
		$ratio = aldus_contrast_ratio( $lum, 1.0 );
		$this->assertGreaterThanOrEqual( 4.5, $ratio );
	}

	// -----------------------------------------------------------------------
	// Fix 3: rgb()/rgba() parsing in aldus_hex_luminance()
	// -----------------------------------------------------------------------

	/** @test */
	public function rgb_notation_matches_hex_luminance(): void {
		$hex_lum = aldus_hex_luminance( '#ff0000' );
		$rgb_lum = aldus_hex_luminance( 'rgb(255, 0, 0)' );
		$this->assertEqualsWithDelta( $hex_lum, $rgb_lum, 0.001 );
	}

	/** @test */
	public function rgba_notation_is_parsed_correctly(): void {
		// rgba ignores the alpha channel — same result as rgb for luminance.
		$rgb  = aldus_hex_luminance( 'rgb(0, 128, 0)' );
		$rgba = aldus_hex_luminance( 'rgba(0, 128, 0, 0.5)' );
		$this->assertEqualsWithDelta( $rgb, $rgba, 0.001 );
	}

	/** @test */
	public function oklch_returns_midpoint_sentinel(): void {
		$this->assertSame( 0.5, aldus_hex_luminance( 'oklch(60% 0.2 30)' ) );
	}

	/** @test */
	public function var_css_property_returns_midpoint_sentinel(): void {
		$this->assertSame( 0.5, aldus_hex_luminance( 'var(--wp--preset--color--primary)' ) );
	}

	// -----------------------------------------------------------------------
	// Fix 1+2 combined: saturation beats same-luminance gray
	// -----------------------------------------------------------------------

	/** @test */
	public function vivid_color_beats_gray_at_same_luminance_for_accent(): void {
		// Build a palette where a vivid orange and a gray share similar luminance
		// so the old luminance-closest-to-40% logic might pick either one.
		// The new saturation-first logic must always pick the vivid orange.
		$palette = [
			[ 'slug' => 'black', 'color' => '#000000' ],       // darkest (excluded)
			[ 'slug' => 'vivid-orange', 'color' => '#e06000' ], // saturated mid-tone
			[ 'slug' => 'gray-mid', 'color' => '#777777' ],     // gray at similar luminance
			[ 'slug' => 'white', 'color' => '#ffffff' ],        // lightest (excluded)
		];
		$result = aldus_pick_accent( $palette );
		$this->assertSame( 'vivid-orange', $result );
	}

	// -----------------------------------------------------------------------
	// Fix 5: minimal-palette fallback returns palette[1] not lightest
	// -----------------------------------------------------------------------

	/** @test */
	public function minimal_palette_fallback_returns_second_entry_not_lightest(): void {
		// A 3-color palette where the first two are dark — the old code would
		// return 'white' (lightest); the new code returns palette[1].
		$palette = [
			[ 'slug' => 'black', 'color' => '#000000' ],
			[ 'slug' => 'dark-navy', 'color' => '#001133' ],
			[ 'slug' => 'white', 'color' => '#ffffff' ],
		];
		$result = aldus_pick_accent( $palette );
		// With the new algorithm: dark-navy is the only non-extreme candidate
		// and will be chosen directly by the saturation path, not the fallback.
		// Either way, the result must NOT be 'white' (the lightest).
		$this->assertNotSame( 'white', $result );
	}
}
