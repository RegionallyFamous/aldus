<?php
declare(strict_types=1);

namespace Aldus\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Regression tests for aldus_validate_block_markup() heuristics.
 */
class ValidateBlocksTest extends TestCase {

	public static function setUpBeforeClass(): void {
		parent::setUpBeforeClass();
		if ( ! function_exists( 'aldus_validate_block_markup' ) ) {
			require_once ALDUS_PATH . 'includes/validate-blocks.php';
		}
	}

	public function test_has_border_color_utility_does_not_require_has_text_color(): void {
		$markup = '<!-- wp:group {"className":"has-border-color"} -->'
			. '<div class="wp-block-group has-border-color"></div>'
			. '<!-- /wp:group -->';

		$errors = aldus_validate_block_markup( $markup );
		$this->assertNotContains(
			"Has text color class without 'has-text-color' pair.",
			$errors,
			'The has-border-color utility must not be treated as a text color preset.'
		);
	}

	public function test_border_color_presets_do_not_require_has_text_color(): void {
		// has-primary-border-color must not be mistaken for a text color preset
		// (slug "primary-border" ends with -border before -color).
		$markup = '<!-- wp:pullquote {"className":"has-primary-border-color"} -->'
			. '<figure class="wp-block-pullquote has-primary-border-color"></figure>'
			. '<!-- /wp:pullquote -->';

		$errors = aldus_validate_block_markup( $markup );
		$this->assertNotContains(
			"Has text color class without 'has-text-color' pair.",
			$errors,
			'Border color classes should not trigger the text-color pairing rule.'
		);
	}

	public function test_text_color_still_requires_has_text_color(): void {
		$markup = '<!-- wp:paragraph {"textColor":"contrast"} -->'
			. '<p class="has-contrast-color">Hello</p>'
			. '<!-- /wp:paragraph -->';

		$errors = aldus_validate_block_markup( $markup );
		$this->assertContains(
			"Has text color class without 'has-text-color' pair.",
			$errors
		);
	}
}
