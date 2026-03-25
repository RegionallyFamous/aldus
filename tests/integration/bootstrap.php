<?php
declare(strict_types=1);
/**
 * PHPUnit bootstrap for Aldus integration tests.
 *
 * Requires the WordPress test suite. Install it first:
 *
 *   bash bin/install-wp-tests.sh wp_tests root root 127.0.0.1 latest
 *
 * Or set WP_TESTS_DIR to point at an existing install.
 */

$wp_tests_dir = getenv( 'WP_TESTS_DIR' );

if ( ! $wp_tests_dir ) {
	$wp_tests_dir = rtrim( sys_get_temp_dir(), '/\\' ) . '/wordpress-tests-lib';
}

if ( ! is_dir( $wp_tests_dir . '/includes' ) ) {
	echo "ERROR: WordPress test suite not found at {$wp_tests_dir}.\n";
	echo "Run: bash bin/install-wp-tests.sh wp_tests root '' 127.0.0.1 latest\n";
	exit( 1 );
}

define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
define( 'ALDUS_VERSION', '1.0.0-test' );
define( 'ALDUS_PATH', dirname( __DIR__, 2 ) . '/' );
define( 'ALDUS_URL', 'http://localhost/' );
define( 'ALDUS_MAX_CONTENT_LENGTH', 5000 );

require_once $wp_tests_dir . '/includes/functions.php';

tests_add_filter(
	'muplugins_loaded',
	static function (): void {
		require dirname( __DIR__, 2 ) . '/aldus.php';
	}
);

require_once $wp_tests_dir . '/includes/bootstrap.php';
