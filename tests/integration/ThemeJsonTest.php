<?php
declare(strict_types=1);

/**
 * Integration tests for aldus_inject_theme_json() in includes/theme.php.
 *
 * Verifies that the filter injects the expected Aldus-specific spacing presets
 * and CSS custom properties into the active theme's theme.json data.
 *
 * Requires a real WordPress installation (WP_UnitTestCase + WP_Theme_JSON_Data).
 * Run with: vendor/bin/phpunit -c phpunit-integration.xml.dist
 */
class ThemeJsonTest extends WP_UnitTestCase {

	// -----------------------------------------------------------------------
	// Helpers
	// -----------------------------------------------------------------------

	/**
	 * Builds a minimal WP_Theme_JSON_Data object with an empty-but-valid schema.
	 *
	 * @return WP_Theme_JSON_Data
	 */
	private function make_theme_json_data(): WP_Theme_JSON_Data {
		return new WP_Theme_JSON_Data(
			[
				'version'  => 3,
				'settings' => [],
				'styles'   => [],
			],
			'theme'
		);
	}

	/**
	 * Extracts a flat list of spacing size entries from get_data() output.
	 *
	 * WordPress 6.6 changed the internal storage so that preset arrays (including
	 * spacingSizes) are keyed by origin inside WP_Theme_JSON::get_raw_data(), which
	 * is what WP_Theme_JSON_Data::get_data() calls.  The structure becomes:
	 *
	 *   settings.spacing.spacingSizes = [ 'theme' => [...], 'default' => [...] ]
	 *
	 * instead of the pre-6.6 flat indexed array.  This helper normalises both
	 * formats so the tests work across WP 6.4 through the latest release.
	 *
	 * @param array $data  Return value of WP_Theme_JSON_Data::get_data().
	 * @return array Flat list of spacing-size preset entries (each has slug/size/name).
	 */
	private function get_flat_spacing_sizes( array $data ): array {
		$raw = $data['settings']['spacing']['spacingSizes'] ?? [];
		if ( empty( $raw ) ) {
			return [];
		}
		// If the first element is itself a list of presets (not a single preset),
		// we are looking at the origin-keyed format: merge all origins together.
		$first = reset( $raw );
		if ( is_array( $first ) && ! isset( $first['slug'] ) ) {
			return array_merge( ...array_values( $raw ) );
		}
		return $raw;
	}

	// -----------------------------------------------------------------------
	// Test: filter returns a WP_Theme_JSON_Data-compatible object
	// -----------------------------------------------------------------------

	public function test_filter_returns_theme_json_data_object(): void {
		$input  = $this->make_theme_json_data();
		$result = aldus_inject_theme_json( $input );

		$this->assertInstanceOf(
			WP_Theme_JSON_Data::class,
			$result,
			'aldus_inject_theme_json() must return a WP_Theme_JSON_Data instance.'
		);
	}

	// -----------------------------------------------------------------------
	// Test: passes non-WP_Theme_JSON_Data values through unchanged
	// -----------------------------------------------------------------------

	public function test_non_theme_json_data_is_passed_through(): void {
		$non_object = [ 'version' => 3 ];
		$result     = aldus_inject_theme_json( $non_object );

		$this->assertSame(
			$non_object,
			$result,
			'Non-WP_Theme_JSON_Data values must be passed through unchanged.'
		);
	}

	// -----------------------------------------------------------------------
	// Test: spacing presets are injected
	// -----------------------------------------------------------------------

	public function test_aldus_spacing_presets_are_injected(): void {
		$input  = $this->make_theme_json_data();
		$result = aldus_inject_theme_json( $input );

		$spacing_sizes = $this->get_flat_spacing_sizes( $result->get_data() );

		// At least one Aldus spacing preset must be present.
		$aldus_slugs = array_column( $spacing_sizes, 'slug' );
		$this->assertContains(
			'aldus-section',
			$aldus_slugs,
			'Spacing preset "aldus-section" must be injected.'
		);
		$this->assertContains(
			'aldus-gap',
			$aldus_slugs,
			'Spacing preset "aldus-gap" must be injected.'
		);
		$this->assertContains(
			'aldus-tight',
			$aldus_slugs,
			'Spacing preset "aldus-tight" must be injected.'
		);
	}

	// -----------------------------------------------------------------------
	// Test: spacing preset sizes are correct
	// -----------------------------------------------------------------------

	public function test_aldus_spacing_preset_sizes_are_correct(): void {
		$input  = $this->make_theme_json_data();
		$result = aldus_inject_theme_json( $input );

		$spacing_sizes = $this->get_flat_spacing_sizes( $result->get_data() );

		// Index by slug for easy lookup.
		$by_slug = [];
		foreach ( $spacing_sizes as $preset ) {
			if ( isset( $preset['slug'] ) ) {
				$by_slug[ $preset['slug'] ] = $preset;
			}
		}

		$this->assertSame(
			'80px',
			$by_slug['aldus-section']['size'] ?? null,
			'"aldus-section" spacing size must be 80px.'
		);
		$this->assertSame(
			'40px',
			$by_slug['aldus-gap']['size'] ?? null,
			'"aldus-gap" spacing size must be 40px.'
		);
		$this->assertSame(
			'20px',
			$by_slug['aldus-tight']['size'] ?? null,
			'"aldus-tight" spacing size must be 20px.'
		);
	}

	// -----------------------------------------------------------------------
	// Test: CSS custom properties are injected via styles.css
	// -----------------------------------------------------------------------

	public function test_custom_properties_are_injected(): void {
		$input  = $this->make_theme_json_data();
		$result = aldus_inject_theme_json( $input );

		$data = $result->get_data();
		$css  = $data['styles']['css'] ?? '';

		$this->assertStringContainsString(
			'--aldus-section-spacing',
			$css,
			'CSS custom property --aldus-section-spacing must be injected.'
		);
		$this->assertStringContainsString(
			'--aldus-gap',
			$css,
			'CSS custom property --aldus-gap must be injected.'
		);
		$this->assertStringContainsString(
			'--aldus-tight',
			$css,
			'CSS custom property --aldus-tight must be injected.'
		);
		$this->assertStringContainsString(
			'--aldus-overlay-dark',
			$css,
			'CSS custom property --aldus-overlay-dark must be injected.'
		);
	}

	// -----------------------------------------------------------------------
	// Test: filter is hooked to wp_theme_json_data_theme
	// -----------------------------------------------------------------------

	public function test_filter_is_hooked_to_wp_theme_json_data_theme(): void {
		$this->assertGreaterThan(
			0,
			has_filter( 'wp_theme_json_data_theme', 'aldus_inject_theme_json' ),
			'aldus_inject_theme_json must be registered on the wp_theme_json_data_theme filter.'
		);
	}

	// -----------------------------------------------------------------------
	// Test: applying the filter hook produces the same result as direct call
	// -----------------------------------------------------------------------

	public function test_filter_hook_produces_same_result_as_direct_call(): void {
		$input        = $this->make_theme_json_data();
		$direct       = aldus_inject_theme_json( $input );
		$via_filter   = apply_filters( 'wp_theme_json_data_theme', $this->make_theme_json_data() );

		$this->assertSame(
			$direct->get_data(),
			$via_filter->get_data(),
			'Applying the filter hook must produce the same data as calling the function directly.'
		);
	}
}
