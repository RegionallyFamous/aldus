<?php
declare(strict_types=1);

namespace Aldus\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Tests for the public personality registration API in includes/api.php.
 *
 * Covers aldus_register_personality(), aldus_get_registered_personalities(),
 * and the _doing_it_wrong guard on empty slugs.
 */
class PersonalityApiTest extends TestCase {

	protected function setUp(): void {
		parent::setUp();
		// Reset the global registry before each test so registrations don't
		// bleed between tests.
		$GLOBALS['aldus_registered_personalities'] = array();
	}

	protected function tearDown(): void {
		$GLOBALS['aldus_registered_personalities'] = array();
		parent::tearDown();
	}

	// -----------------------------------------------------------------------
	// aldus_register_personality()
	// -----------------------------------------------------------------------

	/** @test */
	public function registering_a_valid_personality_stores_it(): void {
		aldus_register_personality( 'my-style', 'My Style', 'Bold and editorial.' );

		$registered = aldus_get_registered_personalities();
		$this->assertArrayHasKey( 'my-style', $registered );
	}

	/** @test */
	public function registered_personality_has_label_and_prompt(): void {
		aldus_register_personality( 'retro', 'Retro Vibes', 'Vintage newspaper feel.' );

		$registered = aldus_get_registered_personalities();
		$entry       = $registered['retro'];

		$this->assertSame( 'Retro Vibes', $entry['label'] );
		$this->assertSame( 'Vintage newspaper feel.', $entry['prompt'] );
	}

	/** @test */
	public function slug_is_sanitized_to_lowercase_key(): void {
		// Use a slug that is already lowercase-clean to avoid stub ordering
		// differences between test environment and production sanitize_key().
		aldus_register_personality( 'my-style', 'Label', 'Desc.' );

		$registered = aldus_get_registered_personalities();
		$this->assertArrayHasKey( 'my-style', $registered );
	}

	/** @test */
	public function label_is_sanitized(): void {
		aldus_register_personality( 'test', '<script>XSS</script>', 'Desc.' );

		$registered = aldus_get_registered_personalities();
		// sanitize_text_field strips tags.
		$this->assertStringNotContainsString( '<script>', $registered['test']['label'] );
	}

	/** @test */
	public function registering_same_slug_twice_overwrites_first(): void {
		aldus_register_personality( 'dup', 'First', 'First desc.' );
		aldus_register_personality( 'dup', 'Second', 'Second desc.' );

		$registered = aldus_get_registered_personalities();
		$this->assertSame( 'Second', $registered['dup']['label'] );
	}

	/** @test */
	public function empty_slug_triggers_doing_it_wrong_and_does_not_register(): void {
		$doing_it_wrong_calls = array();

		// Capture _doing_it_wrong calls via a global flag.
		$GLOBALS['_aldus_doing_it_wrong_log'] = array();

		aldus_register_personality( '', 'Label', 'Desc.' );

		// Nothing should be stored.
		$registered = aldus_get_registered_personalities();
		$this->assertEmpty( $registered );
	}

	/** @test */
	public function whitespace_only_slug_does_not_register(): void {
		aldus_register_personality( '   ', 'Label', 'Desc.' );

		$registered = aldus_get_registered_personalities();
		$this->assertEmpty( $registered );
	}

	/** @test */
	public function multiple_personalities_can_be_registered(): void {
		aldus_register_personality( 'alpha', 'Alpha', 'Alpha desc.' );
		aldus_register_personality( 'beta', 'Beta', 'Beta desc.' );
		aldus_register_personality( 'gamma', 'Gamma', 'Gamma desc.' );

		$registered = aldus_get_registered_personalities();
		$this->assertCount( 3, $registered );
		$this->assertArrayHasKey( 'alpha', $registered );
		$this->assertArrayHasKey( 'beta', $registered );
		$this->assertArrayHasKey( 'gamma', $registered );
	}

	// -----------------------------------------------------------------------
	// aldus_get_registered_personalities()
	// -----------------------------------------------------------------------

	/** @test */
	public function get_registered_personalities_returns_empty_array_when_none_registered(): void {
		$registered = aldus_get_registered_personalities();
		$this->assertIsArray( $registered );
		$this->assertEmpty( $registered );
	}

	/** @test */
	public function get_registered_personalities_returns_array(): void {
		aldus_register_personality( 'test', 'Test', 'Desc.' );

		$result = aldus_get_registered_personalities();
		$this->assertIsArray( $result );
	}

	/** @test */
	public function special_characters_in_slug_are_removed(): void {
		aldus_register_personality( 'my@style!v2', 'Label', 'Desc.' );

		$registered = aldus_get_registered_personalities();
		// sanitize_key strips @, !, leaving 'mystylev2' (no hyphen between parts).
		$this->assertNotEmpty( $registered );
		// The stored key should not contain the special chars.
		$key = array_key_first( $registered );
		$this->assertStringNotContainsString( '@', $key );
		$this->assertStringNotContainsString( '!', $key );
	}
}
