<?php
declare(strict_types=1);

namespace Aldus\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Tests for the low-level block serialisation helpers in includes/serialize.php.
 *
 * All functions produce canonical WordPress block comment markup, so the
 * assertions check for block delimiters, class attributes, and binding
 * metadata rather than full byte-for-byte equality (which would be fragile
 * against whitespace changes).
 */
class SerializeTest extends TestCase {

	// -----------------------------------------------------------------------
	// aldus_serialize_heading()
	// -----------------------------------------------------------------------

	/** @test */
	public function heading_produces_core_heading_block(): void {
		$result = aldus_serialize_heading( 'Hello World', 2 );
		// serialize_block() outputs the full block name incl. namespace.
		$this->assertStringContainsString( '<!-- wp:core/heading', $result );
		$this->assertStringContainsString( '<!-- /wp:core/heading -->', $result );
		$this->assertStringContainsString( 'Hello World', $result );
	}

	/** @test */
	public function heading_sets_correct_level_attribute(): void {
		$result = aldus_serialize_heading( 'Title', 3 );
		$this->assertStringContainsString( '"level":3', $result );
		$this->assertStringContainsString( '<h3 ', $result );
	}

	/** @test */
	public function heading_clamps_level_below_1_to_1(): void {
		$result = aldus_serialize_heading( 'Text', 0 );
		$this->assertStringContainsString( '"level":1', $result );
		$this->assertStringContainsString( '<h1 ', $result );
	}

	/** @test */
	public function heading_clamps_level_above_6_to_6(): void {
		$result = aldus_serialize_heading( 'Text', 99 );
		$this->assertStringContainsString( '"level":6', $result );
		$this->assertStringContainsString( '<h6 ', $result );
	}

	/** @test */
	public function heading_accepts_levels_1_through_6(): void {
		for ( $level = 1; $level <= 6; $level++ ) {
			$result = aldus_serialize_heading( 'Test', $level );
			$this->assertStringContainsString( "\"level\":{$level}", $result, "Level {$level} attribute missing" );
			$this->assertStringContainsString( "<h{$level} ", $result, "h{$level} tag missing" );
		}
	}

	/** @test */
	public function heading_merges_extra_attrs(): void {
		$result = aldus_serialize_heading( 'Text', 2, array( 'textAlign' => 'center' ) );
		$this->assertStringContainsString( '"textAlign":"center"', $result );
	}

	/** @test */
	public function heading_adds_bindings_metadata_when_item_id_given(): void {
		$result = aldus_serialize_heading( 'Title', 2, array(), 'item-abc-123' );
		$this->assertStringContainsString( '"metadata"', $result );
		$this->assertStringContainsString( '"bindings"', $result );
		// JSON-encoded output escapes forward slashes as \/.
		$this->assertStringContainsString( 'aldus', $result );
		$this->assertStringContainsString( 'item-abc-123', $result );
	}

	/** @test */
	public function heading_omits_metadata_when_no_item_id(): void {
		$result = aldus_serialize_heading( 'Title', 2 );
		$this->assertStringNotContainsString( '"metadata"', $result );
		$this->assertStringNotContainsString( '"bindings"', $result );
	}

	/** @test */
	public function heading_output_ends_with_double_newline(): void {
		$result = aldus_serialize_heading( 'Title', 1 );
		$this->assertStringEndsWith( "\n\n", $result );
	}

	// -----------------------------------------------------------------------
	// aldus_serialize_paragraph()
	// -----------------------------------------------------------------------

	/** @test */
	public function paragraph_produces_core_paragraph_block(): void {
		$result = aldus_serialize_paragraph( 'Some text.' );
		$this->assertStringContainsString( '<!-- wp:core/paragraph', $result );
		$this->assertStringContainsString( '<!-- /wp:core/paragraph -->', $result );
		$this->assertStringContainsString( 'Some text.', $result );
	}

	/** @test */
	public function paragraph_adds_drop_cap_class_when_requested(): void {
		$result = aldus_serialize_paragraph( 'Text.', true );
		$this->assertStringContainsString( 'has-drop-cap', $result );
		$this->assertStringContainsString( '"dropCap":true', $result );
	}

	/** @test */
	public function paragraph_has_no_drop_cap_by_default(): void {
		$result = aldus_serialize_paragraph( 'Text.' );
		$this->assertStringNotContainsString( 'has-drop-cap', $result );
		$this->assertStringNotContainsString( 'dropCap', $result );
	}

	/** @test */
	public function paragraph_adds_bindings_metadata_when_item_id_given(): void {
		$result = aldus_serialize_paragraph( 'Text.', false, 'item-xyz' );
		$this->assertStringContainsString( '"metadata"', $result );
		$this->assertStringContainsString( 'aldus', $result );
		$this->assertStringContainsString( 'item-xyz', $result );
	}

	/** @test */
	public function paragraph_ends_with_double_newline(): void {
		$result = aldus_serialize_paragraph( 'Text.' );
		$this->assertStringEndsWith( "\n\n", $result );
	}

	// -----------------------------------------------------------------------
	// aldus_serialize_button()
	// -----------------------------------------------------------------------

	/** @test */
	public function button_produces_core_buttons_block(): void {
		$result = aldus_serialize_button( 'Click me', 'https://example.com', 'primary' );
		$this->assertStringContainsString( '<!-- wp:core/buttons', $result );
		$this->assertStringContainsString( '<!-- /wp:core/buttons -->', $result );
		$this->assertStringContainsString( '<!-- wp:core/button', $result );
		$this->assertStringContainsString( '<!-- /wp:core/button -->', $result );
	}

	/** @test */
	public function button_filled_variant_adds_background_color(): void {
		$result = aldus_serialize_button( 'Go', 'https://example.com', 'primary', 'filled' );
		$this->assertStringContainsString( 'has-primary-background-color', $result );
		$this->assertStringContainsString( 'has-white-color', $result );
	}

	/** @test */
	public function button_outline_variant_adds_outline_style(): void {
		$result = aldus_serialize_button( 'Go', 'https://example.com', 'primary', 'outline' );
		$this->assertStringContainsString( 'is-style-outline', $result );
		$this->assertStringContainsString( 'has-primary-color', $result );
	}

	/** @test */
	public function button_ghost_variant_uses_white_background(): void {
		$result = aldus_serialize_button( 'Go', 'https://example.com', 'primary', 'ghost', 'black' );
		$this->assertStringContainsString( 'has-white-background-color', $result );
	}

	/** @test */
	public function button_plain_variant_has_no_explicit_color_attrs(): void {
		$result = aldus_serialize_button( 'Go', 'https://example.com', '', 'plain' );
		$this->assertStringNotContainsString( 'has-background', $result );
	}

	/** @test */
	public function button_sets_width_attribute_when_non_zero(): void {
		$result = aldus_serialize_button( 'Go', 'https://example.com', 'primary', 'filled', 'black', '', 50 );
		$this->assertStringContainsString( '"width":50', $result );
	}

	/** @test */
	public function button_omits_width_attribute_when_zero(): void {
		$result = aldus_serialize_button( 'Go', 'https://example.com', 'primary' );
		$this->assertStringNotContainsString( '"width"', $result );
	}

	/** @test */
	public function button_adds_bindings_metadata_when_item_id_given(): void {
		$result = aldus_serialize_button( 'Go', 'https://example.com', 'primary', 'filled', 'black', 'item-btn' );
		$this->assertStringContainsString( 'aldus', $result );
		$this->assertStringContainsString( 'item-btn', $result );
	}

	/** @test */
	public function button_ends_with_double_newline(): void {
		$result = aldus_serialize_button( 'Go', 'https://example.com', 'primary' );
		$this->assertStringEndsWith( "\n\n", $result );
	}

	// -----------------------------------------------------------------------
	// aldus_serialize_list()
	// -----------------------------------------------------------------------

	/** @test */
	public function list_produces_core_list_block(): void {
		$result = aldus_serialize_list( array( 'Item A', 'Item B' ) );
		$this->assertStringContainsString( '<!-- wp:core/list', $result );
		$this->assertStringContainsString( '<!-- /wp:core/list -->', $result );
		$this->assertStringContainsString( '<!-- wp:core/list-item', $result );
	}

	/** @test */
	public function list_returns_empty_string_for_empty_array(): void {
		$result = aldus_serialize_list( array() );
		$this->assertSame( '', $result );
	}

	/** @test */
	public function list_renders_each_item_as_list_item_block(): void {
		$result = aldus_serialize_list( array( 'First', 'Second', 'Third' ) );
		$this->assertStringContainsString( 'First', $result );
		$this->assertStringContainsString( 'Second', $result );
		$this->assertStringContainsString( 'Third', $result );
	}

	/** @test */
	public function list_escapes_html_in_items(): void {
		$result = aldus_serialize_list( array( '<script>alert(1)</script>' ) );
		$this->assertStringNotContainsString( '<script>', $result );
		$this->assertStringContainsString( '&lt;script&gt;', $result );
	}

	/** @test */
	public function list_has_balanced_block_comments(): void {
		$result = aldus_serialize_list( array( 'A', 'B' ) );
		$open   = substr_count( $result, '<!-- wp:' );
		$close  = substr_count( $result, '<!-- /wp:' );
		$this->assertSame( $open, $close );
	}

	/** @test */
	public function list_renders_single_item(): void {
		$result = aldus_serialize_list( array( 'Only one' ) );
		$this->assertStringContainsString( 'Only one', $result );
		$this->assertNotEmpty( $result );
	}
}
