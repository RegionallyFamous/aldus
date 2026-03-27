<?php
declare(strict_types=1);

/**
 * Integration tests for aldus_activate() in aldus.php.
 *
 * Run with: vendor/bin/phpunit -c phpunit-integration.xml.dist
 */
class ActivationTest extends WP_UnitTestCase {

	public function tear_down(): void {
		delete_option( 'aldus_version' );
		delete_transient( 'aldus_activation_redirect' );
		parent::tear_down();
	}

	public function test_activate_sets_version_on_first_install(): void {
		delete_option( 'aldus_version' );

		aldus_activate();

		$this->assertSame( ALDUS_VERSION, get_option( 'aldus_version' ) );
	}

	public function test_activate_updates_version_when_stored_version_is_older(): void {
		update_option( 'aldus_version', '0.0.1', false );

		aldus_activate();

		$this->assertSame( ALDUS_VERSION, get_option( 'aldus_version' ) );
	}
}
