<?php
declare(strict_types=1);

namespace Aldus\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Tests for helper functions in includes/block-html.php.
 *
 * These pure functions produce CSS class strings and inline style attributes
 * that must exactly match what WordPress core block save() functions emit.
 */
class BlockHtmlTest extends TestCase {

	// -----------------------------------------------------------------------
	// aldus_columns_classes()
	// -----------------------------------------------------------------------

	/** @test */
	public function columns_classes_stacked(): void {
		$result = aldus_columns_classes( true );
		$this->assertStringContainsString( 'wp-block-columns', $result );
		// Render-time classes must not appear in saved markup.
		$this->assertStringNotContainsString( 'is-layout-flex', $result );
		$this->assertStringNotContainsString( 'wp-block-columns-is-layout-flex', $result );
		$this->assertStringNotContainsString( 'is-not-stacked-on-mobile', $result );
	}

	/** @test */
	public function columns_classes_not_stacked(): void {
		$result = aldus_columns_classes( false );
		$this->assertStringContainsString( 'is-not-stacked-on-mobile', $result );
		// Render-time classes must not appear in saved markup.
		$this->assertStringNotContainsString( 'is-layout-flex', $result );
		$this->assertStringNotContainsString( 'wp-block-columns-is-layout-flex', $result );
	}

	// -----------------------------------------------------------------------
	// aldus_column_classes()
	// -----------------------------------------------------------------------

	/** @test */
	public function column_classes_base_class_only(): void {
		$result = aldus_column_classes();
		$this->assertStringContainsString( 'wp-block-column', $result );
		// Render-time classes must not appear in saved markup.
		$this->assertStringNotContainsString( 'is-layout-flow', $result );
		$this->assertStringNotContainsString( 'wp-block-column-is-layout-flow', $result );
	}

	/** @test */
	public function column_classes_with_background_slug(): void {
		$result = aldus_column_classes( 'primary' );
		$this->assertStringContainsString( 'has-primary-background-color', $result );
		$this->assertStringContainsString( 'has-background', $result );
		$this->assertStringNotContainsString( 'is-layout-flow', $result );
	}

	// -----------------------------------------------------------------------
	// aldus_buttons_classes()
	// -----------------------------------------------------------------------

	/** @test */
	public function buttons_classes_base_class_only(): void {
		$result = aldus_buttons_classes();
		$this->assertStringContainsString( 'wp-block-buttons', $result );
		// Render-time classes must not appear in saved markup.
		$this->assertStringNotContainsString( 'is-layout-flex', $result );
		$this->assertStringNotContainsString( 'wp-block-buttons-is-layout-flex', $result );
	}

	// -----------------------------------------------------------------------
	// aldus_cover_bg_classes()
	// -----------------------------------------------------------------------

	/** @test */
	public function cover_bg_classes_contains_dim_ratio(): void {
		$result = aldus_cover_bg_classes( 'black', 60 );
		$this->assertStringContainsString( 'has-background-dim-60', $result );
		$this->assertStringContainsString( 'has-background-dim', $result );
		$this->assertStringContainsString( 'wp-block-cover__background', $result );
	}

	/** @test */
	public function cover_dim_ratio_50_omits_numeric_dim_class(): void {
		$result = aldus_cover_bg_classes( 'black', 50 );
		$this->assertStringNotContainsString( 'has-background-dim-50', $result );
		$this->assertStringContainsString( 'has-background-dim', $result );
	}

	/** @test */
	public function cover_dim_ratio_45_matches_gutenberg_bucket(): void {
		$result = aldus_cover_dim_ratio_class( 45 );
		$this->assertSame( 'has-background-dim-50', $result );
	}

	/** @test */
	public function cover_bg_classes_contains_color_slug(): void {
		$result = aldus_cover_bg_classes( 'primary', 100 );
		$this->assertStringContainsString( 'has-primary-background-color', $result );
	}

	// -----------------------------------------------------------------------
	// aldus_column_style()
	// -----------------------------------------------------------------------

	/** @test */
	public function column_style_contains_flex_basis(): void {
		$result = aldus_column_style( '33.33%' );
		$this->assertStringContainsString( 'flex-basis', $result );
		$this->assertStringContainsString( '33.33%', $result );
	}

	/** @test */
	public function column_style_for_28_percent(): void {
		$result = aldus_column_style( '28%' );
		$this->assertStringContainsString( '28%', $result );
	}

	/** @test */
	public function column_style_empty_string_produces_no_style(): void {
		$result = aldus_column_style( '' );
		$this->assertSame( '', $result );
	}

	// -----------------------------------------------------------------------
	// aldus_group_classes()
	// -----------------------------------------------------------------------

	/** @test */
	public function group_classes_contains_wp_block_group(): void {
		$result = aldus_group_classes( 'constrained' );
		$this->assertStringContainsString( 'wp-block-group', $result );
		// Render-time classes must not appear in saved markup.
		$this->assertStringNotContainsString( 'is-layout-constrained', $result );
		$this->assertStringNotContainsString( 'wp-block-group-is-layout-constrained', $result );
	}

	/** @test */
	public function group_classes_flow_layout_no_render_time_classes(): void {
		$result = aldus_group_classes( 'flow' );
		$this->assertStringContainsString( 'wp-block-group', $result );
		$this->assertStringNotContainsString( 'is-layout-flow', $result );
		$this->assertStringNotContainsString( 'wp-block-group-is-layout-flow', $result );
	}

	/** @test */
	public function group_classes_full_align_adds_alignfull(): void {
		$result = aldus_group_classes( 'constrained', 'full' );
		$this->assertStringContainsString( 'alignfull', $result );
	}

	/** @test */
	public function group_classes_with_bg_slug_adds_color_classes(): void {
		$result = aldus_group_classes( 'constrained', '', 'contrast' );
		$this->assertStringContainsString( 'has-contrast-background-color', $result );
		$this->assertStringContainsString( 'has-background', $result );
	}

	// -----------------------------------------------------------------------
	// aldus_cover_root_classes()
	// -----------------------------------------------------------------------

	/** @test */
	public function cover_root_classes_contains_wp_block_cover(): void {
		$result = aldus_cover_root_classes( 'full' );
		$this->assertStringContainsString( 'wp-block-cover', $result );
		$this->assertStringContainsString( 'alignfull', $result );
	}

	/** @test */
	public function cover_root_classes_with_content_position(): void {
		$result = aldus_cover_root_classes( 'full', 'bottom left' );
		$this->assertStringContainsString( 'has-custom-content-position', $result );
		$this->assertStringContainsString( 'is-position-bottom-left', $result );
	}

	/** @test */
	public function cover_root_classes_center_omits_position_classes(): void {
		$result = aldus_cover_root_classes( 'full', 'center center' );
		$this->assertStringNotContainsString( 'has-custom-content-position', $result );
		$this->assertStringNotContainsString( 'is-position-center-center', $result );
		$this->assertStringContainsString( 'alignfull', $result );
	}

	/** @test */
	public function cover_root_classes_wide_align(): void {
		$result = aldus_cover_root_classes( 'wide' );
		$this->assertStringContainsString( 'alignwide', $result );
	}

	// -----------------------------------------------------------------------
	// aldus_cover_min_height_style()
	// -----------------------------------------------------------------------

	/** @test */
	public function cover_min_height_style_returns_min_height_property(): void {
		$result = aldus_cover_min_height_style( 'Short headline' );
		$this->assertStringContainsString( 'min-height:', $result );
		$this->assertStringContainsString( 'px', $result );
	}

	/** @test */
	public function cover_min_height_style_uses_default_for_empty_headline(): void {
		$result = aldus_cover_min_height_style( '', 380 );
		$this->assertSame( 'min-height:380px', $result );
	}

	/** @test */
	public function cover_min_height_adapts_to_short_headline(): void {
		$short = aldus_cover_min_height( 'Hi' );
		$long  = aldus_cover_min_height( str_repeat( 'a', 100 ) );
		$this->assertGreaterThan( $long, $short, 'Short headlines should get more vertical space' );
	}

	// -----------------------------------------------------------------------
	// aldus_media_text_classes()
	// -----------------------------------------------------------------------

	/** @test */
	public function media_text_classes_left_default(): void {
		$result = aldus_media_text_classes( 'left' );
		$this->assertStringContainsString( 'wp-block-media-text', $result );
		$this->assertStringNotContainsString( 'has-media-on-the-right', $result );
	}

	/** @test */
	public function media_text_classes_right_position(): void {
		$result = aldus_media_text_classes( 'right' );
		$this->assertStringContainsString( 'has-media-on-the-right', $result );
	}

	/** @test */
	public function media_text_classes_stacked_on_mobile(): void {
		$result = aldus_media_text_classes( 'left', true );
		$this->assertStringContainsString( 'is-stacked-on-mobile', $result );
	}

	// -----------------------------------------------------------------------
	// aldus_button_link_classes()
	// -----------------------------------------------------------------------

	/** @test */
	public function button_link_classes_ends_with_wp_element_button(): void {
		$result = aldus_button_link_classes();
		$this->assertStringEndsWith( 'wp-element-button', $result );
	}

	/** @test */
	public function button_link_classes_with_extra_classes(): void {
		$result = aldus_button_link_classes( 'has-primary-color has-text-color' );
		$this->assertStringContainsString( 'has-primary-color', $result );
		$this->assertStringEndsWith( 'wp-element-button', $result );
	}

	// -----------------------------------------------------------------------
	// aldus_heading_font_family_class()
	// -----------------------------------------------------------------------

	/** @test */
	public function heading_font_family_class_empty_when_no_slug(): void {
		$this->assertSame( '', aldus_heading_font_family_class( null ) );
		$this->assertSame( '', aldus_heading_font_family_class( '' ) );
	}

	/** @test */
	public function heading_font_family_class_matches_preset_pattern(): void {
		$result = aldus_heading_font_family_class( 'heading-font' );
		$this->assertSame( ' has-heading-font-font-family', $result );
	}

	// -----------------------------------------------------------------------
	// aldus_cover_background_span_html()
	// -----------------------------------------------------------------------

	/** @test */
	public function cover_background_span_palette_includes_color_class(): void {
		$html = aldus_cover_background_span_html(
			array(
				'overlayColor' => 'black',
				'dimRatio'     => 60,
			)
		);
		$this->assertStringContainsString( 'has-black-background-color', $html );
		$this->assertStringNotContainsString( 'background-color:', $html );
	}

	/** @test */
	public function cover_background_span_custom_overlay_uses_inline_style_not_palette_class(): void {
		$html = aldus_cover_background_span_html(
			array(
				'customOverlayColor' => '#FFFFFF',
				'dimRatio'           => 50,
			)
		);
		$this->assertStringContainsString( 'background-color:#FFFFFF', $html );
		$this->assertStringNotContainsString( 'has-black-background-color', $html );
		$this->assertStringContainsString( 'has-background-dim', $html );
	}
}
