<?php
declare(strict_types=1);
/**
 * Tests for the theme design system expansion functions added to includes/theme.php.
 *
 * Covers: aldus_get_theme_shadows(), aldus_pick_shadow(),
 *         aldus_get_theme_font_families(), aldus_get_theme_heading_font_slug(),
 *         aldus_get_theme_element_styles(), aldus_get_theme_block_styles(),
 *         aldus_get_theme_cover_overlay(),
 *         aldus_get_theme_section_styles(), aldus_pick_section_style().
 */

use PHPUnit\Framework\TestCase;

class ThemeDesignSystemTest extends TestCase {

	// -------------------------------------------------------------------------
	// Helpers
	// -------------------------------------------------------------------------

	/**
	 * Override the wp_get_global_settings stub to return fixture data.
	 * Uses a static variable in the global function; the real stub always
	 * returns [] so we monkey-patch via runkit or by re-declaring in the
	 * test namespace... Instead we rely on wp_cache_get returning false and
	 * wp_get_global_settings returning the fixture via parameter-inspection.
	 *
	 * Since we cannot easily override the global stub, we test the pure
	 * helper functions (pickers + selectors) directly with fixture arrays,
	 * and test the reader functions' graceful-empty behaviour via the stub.
	 */
	private function flush_static_caches(): void {
		// The static $map / $scale vars inside the functions are reset by
		// calling wp_cache_delete, but since our stub always returns false
		// for wp_cache_get, re-running the function re-executes the computation
		// path.  Nothing to reset for these pure-picker tests.
	}

	// -------------------------------------------------------------------------
	// Shadow presets
	// -------------------------------------------------------------------------

	public function test_get_theme_shadows_returns_array(): void {
		// With the default stub (wp_get_global_settings returns []), the function
		// should return an empty array gracefully.
		$result = aldus_get_theme_shadows();
		$this->assertIsArray( $result );
	}

	public function test_pick_shadow_soft_prefers_natural(): void {
		$presets = array(
			array( 'slug' => 'natural', 'shadow' => '0 2px 6px rgba(0,0,0,0.1)' ),
			array( 'slug' => 'deep',    'shadow' => '0 8px 30px rgba(0,0,0,0.4)' ),
		);
		$result = aldus_pick_shadow( $presets, 'soft' );
		$this->assertSame( 'var(--wp--preset--shadow--natural)', $result );
	}

	public function test_pick_shadow_deep_prefers_deep(): void {
		$presets = array(
			array( 'slug' => 'natural', 'shadow' => '0 2px 6px rgba(0,0,0,0.1)' ),
			array( 'slug' => 'deep',    'shadow' => '0 8px 30px rgba(0,0,0,0.4)' ),
		);
		$result = aldus_pick_shadow( $presets, 'deep' );
		$this->assertSame( 'var(--wp--preset--shadow--deep)', $result );
	}

	public function test_pick_shadow_returns_empty_when_no_presets(): void {
		$result = aldus_pick_shadow( array(), 'soft' );
		$this->assertSame( '', $result );
	}

	public function test_pick_shadow_falls_back_to_first_preset(): void {
		$presets = array(
			array( 'slug' => 'custom-shadow', 'shadow' => '0 4px 12px rgba(0,0,0,0.15)' ),
		);
		$result = aldus_pick_shadow( $presets, 'soft' );
		$this->assertSame( 'var(--wp--preset--shadow--custom-shadow)', $result );
	}

	public function test_pick_shadow_returns_var_reference_not_css_value(): void {
		$presets = array(
			array( 'slug' => 'natural', 'shadow' => '0 2px 6px rgba(0,0,0,0.1)' ),
		);
		$result = aldus_pick_shadow( $presets, 'soft' );
		$this->assertStringStartsWith( 'var(--wp--preset--shadow--', $result );
		$this->assertStringEndsWith( ')', $result );
	}

	// -------------------------------------------------------------------------
	// Font families
	// -------------------------------------------------------------------------

	public function test_get_theme_font_families_returns_array(): void {
		$result = aldus_get_theme_font_families();
		$this->assertIsArray( $result );
	}

	public function test_get_theme_heading_font_slug_returns_null_when_global_styles_stubbed(): void {
		// The bootstrap stub for wp_get_global_styles always returns [].
		// Calling wp_get_global_styles(['elements','heading','typography','fontFamily'])
		// on an empty array means no heading font is defined → should return null.
		$result = aldus_get_theme_heading_font_slug();
		$this->assertNull( $result );
	}

	// -------------------------------------------------------------------------
	// Element / block styles
	// -------------------------------------------------------------------------

	public function test_get_theme_element_styles_returns_array_for_heading(): void {
		$result = aldus_get_theme_element_styles( 'heading' );
		$this->assertIsArray( $result );
	}

	public function test_get_theme_element_styles_returns_empty_for_blank_element(): void {
		$result = aldus_get_theme_element_styles( '' );
		$this->assertSame( array(), $result );
	}

	public function test_get_theme_block_styles_returns_array_for_cover(): void {
		$result = aldus_get_theme_block_styles( 'core/cover' );
		$this->assertIsArray( $result );
	}

	public function test_get_theme_block_styles_returns_empty_for_blank_block(): void {
		$result = aldus_get_theme_block_styles( '' );
		$this->assertSame( array(), $result );
	}

	public function test_get_theme_cover_overlay_returns_null_when_no_theme_styles(): void {
		// With the stub, no block styles are defined → overlay should be null.
		$result = aldus_get_theme_cover_overlay();
		$this->assertNull( $result );
	}

	// -------------------------------------------------------------------------
	// Section styles
	// -------------------------------------------------------------------------

	public function test_get_theme_section_styles_returns_array(): void {
		$result = aldus_get_theme_section_styles();
		$this->assertIsArray( $result );
	}

	public function test_get_theme_section_styles_empty_when_registry_has_no_group_styles(): void {
		// The registry stub starts empty for core/group.
		$result = aldus_get_theme_section_styles();
		$this->assertSame( array(), $result );
	}

	public function test_get_theme_section_styles_returns_registered_styles(): void {
		$registry = WP_Block_Styles_Registry::get_instance();
		$registry->register(
			'core/group',
			array(
				'name'  => 'dark-section',
				'label' => 'Dark Section',
			)
		);

		$result = aldus_get_theme_section_styles();

		// Clean up.
		$registry->reset();

		$this->assertCount( 1, $result );
		$this->assertSame( 'dark-section', $result[0]['name'] );
		$this->assertSame( 'Dark Section', $result[0]['label'] );
	}

	public function test_pick_section_style_returns_null_when_no_styles(): void {
		$result = aldus_pick_section_style( array(), 'dark' );
		$this->assertNull( $result );
	}

	public function test_pick_section_style_matches_dark_by_label_keyword(): void {
		$styles = array(
			array( 'name' => 'dark-mode', 'label' => 'Dark Mode' ),
			array( 'name' => 'light-style', 'label' => 'Light Style' ),
		);
		$result = aldus_pick_section_style( $styles, 'dark' );
		$this->assertSame( 'dark-mode', $result );
	}

	public function test_pick_section_style_matches_accent_by_name_keyword(): void {
		$styles = array(
			array( 'name' => 'vibrant-accent', 'label' => 'Vibrant' ),
			array( 'name' => 'plain',          'label' => 'Plain' ),
		);
		$result = aldus_pick_section_style( $styles, 'accent' );
		$this->assertSame( 'vibrant-accent', $result );
	}

	public function test_pick_section_style_returns_null_when_no_keyword_match(): void {
		$styles = array(
			array( 'name' => 'foo', 'label' => 'Foo' ),
			array( 'name' => 'bar', 'label' => 'Bar' ),
		);
		$result = aldus_pick_section_style( $styles, 'dark' );
		$this->assertNull( $result );
	}

	public function test_pick_section_style_matches_contrast_keyword_for_dark(): void {
		$styles = array(
			array( 'name' => 'high-contrast', 'label' => 'High Contrast' ),
		);
		$result = aldus_pick_section_style( $styles, 'dark' );
		$this->assertSame( 'high-contrast', $result );
	}
}
