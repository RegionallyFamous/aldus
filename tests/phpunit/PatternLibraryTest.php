<?php
declare(strict_types=1);

namespace Aldus\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Tests for the Aldus expanded pattern library (includes/pattern-library.php).
 */
class PatternLibraryTest extends TestCase {

	/**
	 * @before
	 */
	protected function requirePatternLibrary(): void {
		$path = dirname( __DIR__, 2 ) . '/includes/pattern-library.php';
		if ( ! function_exists( 'aldus_get_pattern_definitions' ) ) {
			require_once $path;
		}
	}

	/** @test */
	public function pattern_definitions_returns_exactly_seventeen_patterns(): void {
		$defs = aldus_get_pattern_definitions();
		$this->assertCount( 17, $defs, 'Expected exactly 17 pattern definitions.' );
	}

	/** @test */
	public function all_patterns_have_required_fields(): void {
		foreach ( aldus_get_pattern_definitions() as $i => $def ) {
			$this->assertArrayHasKey( 'slug', $def, "Pattern $i is missing 'slug'." );
			$this->assertArrayHasKey( 'title', $def, "Pattern $i is missing 'title'." );
			$this->assertArrayHasKey( 'content', $def, "Pattern $i is missing 'content'." );

			$this->assertNotEmpty( $def['slug'], "Pattern $i has an empty slug." );
			$this->assertNotEmpty( $def['title'], "Pattern $i has an empty title." );
			$this->assertNotEmpty( $def['content'], "Pattern $i has empty content." );
		}
	}

	/** @test */
	public function all_pattern_slugs_are_unique(): void {
		$slugs = array_column( aldus_get_pattern_definitions(), 'slug' );
		$unique = array_unique( $slugs );
		$this->assertCount(
			count( $slugs ),
			$unique,
			'Duplicate pattern slugs detected: ' . implode( ', ', array_diff_assoc( $slugs, $unique ) )
		);
	}

	/** @test */
	public function all_pattern_content_is_valid_block_comment_markup(): void {
		foreach ( aldus_get_pattern_definitions() as $def ) {
			// Every pattern content must contain at least one block comment.
			$this->assertStringContainsString(
				'<!-- wp:',
				$def['content'],
				"Pattern '{$def['slug']}' content does not contain any block markup."
			);
			// Ensure opening and closing comment counts are balanced (simple heuristic).
			$opens  = substr_count( $def['content'], '<!-- wp:' );
			$closes = substr_count( $def['content'], '<!-- /wp:' );
			$this->assertGreaterThanOrEqual(
				1,
				$opens,
				"Pattern '{$def['slug']}' has no opening block comments."
			);
			// Closing tags should not exceed opening tags.
			$this->assertLessThanOrEqual(
				$opens,
				$closes,
				"Pattern '{$def['slug']}' has more closing comments than opening ones."
			);
		}
	}

	/** @test */
	public function pattern_categories_are_distributed_across_five_groups(): void {
		$slugs    = array_column( aldus_get_pattern_definitions(), 'slug' );
		$prefixes = array_unique(
			array_map(
				static function ( string $slug ): string {
					return explode( '-', $slug )[0];
				},
				$slugs
			)
		);
		$this->assertGreaterThanOrEqual(
			5,
			count( $prefixes ),
			'Expected patterns from at least 5 prefix/category groups.'
		);
	}

	/** @test */
	public function all_builder_functions_are_callable(): void {
		$functions = array(
			'aldus_pattern_hero_dark_cover',
			'aldus_pattern_hero_light_split',
			'aldus_pattern_hero_minimal_headline',
			'aldus_pattern_content_article_intro',
			'aldus_pattern_content_feature_pull',
			'aldus_pattern_content_two_column_text',
			'aldus_pattern_content_cta_section',
			'aldus_pattern_media_image_text_left',
			'aldus_pattern_media_image_text_right',
			'aldus_pattern_media_full_width_image',
			'aldus_pattern_media_gallery_three_column',
			'aldus_pattern_typography_display_opening',
			'aldus_pattern_typography_kicker_headline',
			'aldus_pattern_typography_centered_pullquote',
			'aldus_pattern_structural_dark_section',
			'aldus_pattern_structural_three_column_features',
			'aldus_pattern_structural_separator_spacer',
		);
		foreach ( $functions as $fn ) {
			$this->assertTrue(
				function_exists( $fn ),
				"Builder function '$fn' is not defined."
			);
			$result = $fn();
			$this->assertIsString( $result, "$fn() should return a string." );
			$this->assertNotEmpty( $result, "$fn() returned an empty string." );
		}
	}
}
