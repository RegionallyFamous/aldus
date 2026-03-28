<?php
declare(strict_types=1);

namespace Aldus\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Validates that generated block markup is free of render-time-only classes.
 *
 * WordPress injects layout classes (is-layout-*, wp-block-*-is-layout-*) at
 * render time via wp_render_layout_support_flag(). Core block save() functions
 * never emit these classes, so they must not appear in the serialized markup
 * that Aldus produces. If they do, the editor's block validator will flag every
 * inserted block as invalid.
 *
 * The full Dispatch layout validation test calls aldus_handle_assemble() directly
 * (same handler as POST /aldus/v1/assemble) so it runs in the stubbed bootstrap.
 */
class BlockMarkupTest extends TestCase {

	/** @var \Aldus_Content_Distributor */
	private static \Aldus_Content_Distributor $dist;

	/** @var list<array{slug:string,color:string}> */
	private static array $palette;

	/** @var list<array{slug:string}> */
	private static array $font_sizes;

	public static function setUpBeforeClass(): void {
		parent::setUpBeforeClass();

		// Load the validation utilities if not already loaded.
		if ( ! function_exists( 'aldus_validate_block_markup' ) ) {
			require_once ALDUS_PATH . 'includes/validate-blocks.php';
		}

		// Build a minimal content distributor with representative sample content.
		self::$dist = new \Aldus_Content_Distributor(
			array(
				array( 'type' => 'heading',   'content' => 'Sample Headline for Block Markup Test' ),
				array( 'type' => 'paragraph', 'content' => 'First paragraph with enough text to be interesting and realistic for layout.' ),
				array( 'type' => 'paragraph', 'content' => 'Second paragraph providing supporting detail for the heading above.' ),
				array( 'type' => 'image',     'content' => '', 'url' => 'https://example.com/test-image.jpg' ),
				array( 'type' => 'button',    'content' => 'Call to Action', 'url' => 'https://example.com' ),
				array( 'type' => 'list',      'content' => "Item one\nItem two\nItem three" ),
			),
			array() // No custom styles.
		);

		self::$palette = array(
			array( 'slug' => 'base',       'color' => '#ffffff' ),
			array( 'slug' => 'contrast',   'color' => '#000000' ),
			array( 'slug' => 'primary',    'color' => '#0070f3' ),
			array( 'slug' => 'secondary',  'color' => '#ff4081' ),
			array( 'slug' => 'accent',     'color' => '#f59e0b' ),
			array( 'slug' => 'tertiary',   'color' => '#6b7280' ),
		);

		self::$font_sizes = array(
			array( 'slug' => 'small' ),
			array( 'slug' => 'medium' ),
			array( 'slug' => 'large' ),
			array( 'slug' => 'x-large' ),
		);
	}

	// -----------------------------------------------------------------------
	// Data providers
	// -----------------------------------------------------------------------

	/**
	 * Provides each render-time-only layout class string.
	 *
	 * @return array<string, array{string}>
	 */
	public static function renderTimeClassProvider(): array {
		return array(
			'is-layout-flow'        => array( 'is-layout-flow' ),
			'is-layout-constrained' => array( 'is-layout-constrained' ),
			'is-layout-flex'        => array( 'is-layout-flex' ),
			'is-layout-grid'        => array( 'is-layout-grid' ),
		);
	}

	/**
	 * Provides every token recognized by aldus_render_block_token().
	 *
	 * @return array<string, array{string}>
	 */
	public static function allTokensProvider(): array {
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
	 * No token's rendered output may contain the given render-time class.
	 *
	 * The data provider supplies each class string individually. The test
	 * iterates over all valid tokens internally so failures identify both the
	 * offending token and the specific class.
	 *
	 * @dataProvider renderTimeClassProvider
	 */
	public function test_no_render_time_classes_in_generated_markup( string $render_time_class ): void {
		foreach ( aldus_valid_tokens() as $token ) {
			$markup = aldus_render_block_token(
				$token,
				self::$dist,
				self::$palette,
				self::$font_sizes,
				0,
				0,
				array()
			);

			$this->assertStringNotContainsString(
				$render_time_class,
				$markup,
				"Token '{$token}' rendered markup contains render-time class '{$render_time_class}'. " .
				'WordPress injects this class at render time — it must not appear in saved post_content.'
			);
		}
	}

	/**
	 * @dataProvider allTokensProvider
	 */
	public function test_all_tokens_pass_validation( string $token ): void {
		$markup = aldus_render_block_token(
			$token,
			self::$dist,
			self::$palette,
			self::$font_sizes,
			0,
			0,
			array()
		);

		if ( trim( $markup ) === '' ) {
			// Some tokens produce empty output when content is unavailable.
			$this->addToAssertionCount( 1 );
			return;
		}

		$errors = aldus_validate_block_markup( $markup );

		$this->assertEmpty(
			$errors,
			"Token '{$token}' produced invalid markup:\n" . implode( "\n", $errors )
		);
	}

	/**
	 * Each token individually must not contain any compound render-time class
	 * matching the pattern wp-block-*-is-layout-*.
	 *
	 * @dataProvider allTokensProvider
	 */
	public function test_no_compound_render_time_classes( string $token ): void {
		$markup = aldus_render_block_token(
			$token,
			self::$dist,
			self::$palette,
			self::$font_sizes,
			0,
			0,
			array()
		);

		$this->assertDoesNotMatchRegularExpression(
			'/wp-block-[a-z]+-is-layout-[a-z]+/',
			$markup,
			"Token '{$token}' rendered markup contains a compound render-time layout class."
		);
	}

	// -----------------------------------------------------------------------
	// Full assemble handler (aldus_handle_assemble — no HTTP stack required)
	// -----------------------------------------------------------------------

	/**
	 * A full assembled Dispatch layout must pass validation.
	 */
	public function test_full_dispatch_layout_passes_validation(): void {
		$request = new \WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( array(
			'personality' => 'Dispatch',
			'tokens'      => array( 'cover:dark', 'columns:2-equal', 'separator', 'paragraph' ),
			'items'       => array(
				array( 'type' => 'heading',   'content' => 'Breaking: Full Dispatch Layout Test' ),
				array( 'type' => 'paragraph', 'content' => 'This is a real REST request to assemble a layout for integration validation.' ),
			),
		) );

		$response = aldus_handle_assemble( $request );
		$this->assertInstanceOf( \WP_REST_Response::class, $response, 'Assemble must return WP_REST_Response' );
		$data = $response->get_data();

		$this->assertArrayHasKey( 'blocks', $data, 'Response must contain blocks markup' );
		$markup = (string) $data['blocks'];
		$this->assertNotEmpty( $markup, 'Assembled markup must not be empty' );
		$this->assertArrayHasKey( 'blocks_tree', $data );
		$this->assertIsArray( $data['blocks_tree'] );

		$errors = aldus_validate_assembled_markup( $markup );
		$this->assertEmpty(
			$errors,
			"Full Dispatch layout failed validation:\n" . implode( "\n", $errors )
		);
	}
}
