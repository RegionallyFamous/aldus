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
		$this->assertStringContainsString( 'is-layout-flex', $result );
		$this->assertStringNotContainsString( 'is-not-stacked-on-mobile', $result );
	}

	/** @test */
	public function columns_classes_not_stacked(): void {
		$result = aldus_columns_classes( false );
		$this->assertStringContainsString( 'is-not-stacked-on-mobile', $result );
	}

	// -----------------------------------------------------------------------
	// aldus_cover_overlay_style()
	// -----------------------------------------------------------------------

	/** @test */
	public function cover_overlay_style_returns_opacity_string(): void {
		$result = aldus_cover_overlay_style( 0.5 );
		$this->assertStringContainsString( 'opacity', $result );
		$this->assertStringContainsString( '0.5', $result );
	}

	/** @test */
	public function cover_overlay_style_default_opacity(): void {
		$result = aldus_cover_overlay_style();
		$this->assertNotEmpty( $result );
		$this->assertIsString( $result );
	}

	// -----------------------------------------------------------------------
	// aldus_column_width_style()
	// -----------------------------------------------------------------------

	/** @test */
	public function column_width_style_contains_flex_basis(): void {
		$result = aldus_column_width_style( '33.33%' );
		$this->assertStringContainsString( 'flex-basis', $result );
		$this->assertStringContainsString( '33.33%', $result );
	}

	/** @test */
	public function column_width_style_for_28_percent(): void {
		$result = aldus_column_width_style( '28%' );
		$this->assertStringContainsString( '28%', $result );
	}

	// -----------------------------------------------------------------------
	// aldus_group_classes()
	// -----------------------------------------------------------------------

	/** @test */
	public function group_classes_contains_wp_block_group(): void {
		$result = aldus_group_classes( 'full' );
		$this->assertStringContainsString( 'wp-block-group', $result );
	}

	/** @test */
	public function group_classes_full_width_contains_alignfull(): void {
		$result = aldus_group_classes( 'full' );
		$this->assertStringContainsString( 'alignfull', $result );
	}

	// -----------------------------------------------------------------------
	// aldus_cover_classes()
	// -----------------------------------------------------------------------

	/** @test */
	public function cover_classes_contains_wp_block_cover(): void {
		$result = aldus_cover_classes( 'black', false );
		$this->assertStringContainsString( 'wp-block-cover', $result );
	}

	/** @test */
	public function cover_classes_with_color_slug(): void {
		$result = aldus_cover_classes( 'primary', false );
		$this->assertStringContainsString( 'primary', $result );
	}
}
