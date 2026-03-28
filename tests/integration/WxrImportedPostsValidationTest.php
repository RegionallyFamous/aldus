<?php
declare(strict_types=1);

/**
 * Validates every post/page body in a WXR export using aldus_validate_assembled_markup().
 *
 * Fixture: tests/fixtures/wxr/aldus-test-content.xml (override with ALDUS_WXR_FIXTURE).
 *
 * @group wxr
 */
class WxrImportedPostsValidationTest extends WP_UnitTestCase {

	public function set_up(): void {
		parent::set_up();
		if ( ! function_exists( 'aldus_validate_assembled_markup' ) ) {
			require_once ALDUS_PATH . 'includes/validate-blocks.php';
		}
	}

	/**
	 * Resolve WXR path: env ALDUS_WXR_FIXTURE, then default committed fixture.
	 */
	private static function resolve_wxr_path(): ?string {
		$env = getenv( 'ALDUS_WXR_FIXTURE' );
		if ( false !== $env && '' !== trim( $env ) ) {
			$candidate = trim( $env );
			if ( is_file( $candidate ) ) {
				return $candidate;
			}
			$rel = rtrim( ALDUS_PATH, "/\\" ) . DIRECTORY_SEPARATOR . ltrim( str_replace( '/', DIRECTORY_SEPARATOR, $candidate ), DIRECTORY_SEPARATOR );
			if ( is_file( $rel ) ) {
				return $rel;
			}

			return null;
		}

		$default = rtrim( ALDUS_PATH, "/\\" ) . DIRECTORY_SEPARATOR . 'tests' . DIRECTORY_SEPARATOR . 'fixtures' . DIRECTORY_SEPARATOR . 'wxr' . DIRECTORY_SEPARATOR . 'aldus-test-content.xml';

		return is_file( $default ) ? $default : null;
	}

	public function test_wxr_export_posts_pass_aldus_markup_validation(): void {
		require_once __DIR__ . '/WxrFixtureReader.php';

		$path = self::resolve_wxr_path();
		if ( null === $path ) {
			$this->markTestSkipped(
				'No WXR fixture: set ALDUS_WXR_FIXTURE or add tests/fixtures/wxr/aldus-test-content.xml'
			);
		}

		$rows = Aldus_Wxr_Fixture_Reader::parse_file( $path );
		$this->assertNotEmpty( $rows, "WXR produced no post/page rows: {$path}" );

		$failures = array();

		foreach ( $rows as $row ) {
			$content = $row['content'];
			if ( '' === trim( $content ) ) {
				continue;
			}

			$errors = aldus_validate_assembled_markup( $content );
			if ( array() !== $errors ) {
				$failures[] = sprintf(
					"[%s | %s | %s]\n  - %s",
					$row['key'],
					$row['type'],
					$row['title'],
					implode( "\n  - ", $errors )
				);
			}
		}

		$this->assertSame(
			array(),
			$failures,
			"aldus_validate_assembled_markup failed for " . count( $failures ) . " item(s):\n\n"
			. implode( "\n\n", $failures )
		);
	}
}
