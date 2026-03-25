<?php
declare(strict_types=1);
/**
 * PHPUnit bootstrap for Aldus unit tests.
 *
 * Defines the WordPress stubs needed so the includes/ files can be loaded
 * without a full WordPress installation. This keeps the tests fast and
 * runnable in CI without a database.
 */

// Minimal ABSPATH so the ABSPATH guards in includes/ pass.
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/../../' );
}
if ( ! defined( 'ALDUS_VERSION' ) ) {
	define( 'ALDUS_VERSION', '1.0.0-test' );
}
if ( ! defined( 'ALDUS_PATH' ) ) {
	define( 'ALDUS_PATH', __DIR__ . '/../../' );
}
if ( ! defined( 'ALDUS_URL' ) ) {
	define( 'ALDUS_URL', 'http://localhost/' );
}
if ( ! defined( 'ALDUS_MAX_CONTENT_LENGTH' ) ) {
	define( 'ALDUS_MAX_CONTENT_LENGTH', 5000 );
}

// ---------------------------------------------------------------------------
// Minimal WordPress function stubs for unit tests.
// Only the functions called by the files under test are stubbed.
// ---------------------------------------------------------------------------

if ( ! function_exists( 'apply_filters' ) ) {
	function apply_filters( string $hook, mixed $value, mixed ...$args ): mixed {
		return $value;
	}
}

if ( ! function_exists( 'sanitize_key' ) ) {
	function sanitize_key( string $key ): string {
		return strtolower( preg_replace( '/[^a-z0-9_\-]/', '', $key ) );
	}
}

if ( ! function_exists( 'sanitize_text_field' ) ) {
	function sanitize_text_field( string $str ): string {
		return trim( strip_tags( $str ) );
	}
}

if ( ! function_exists( 'sanitize_textarea_field' ) ) {
	function sanitize_textarea_field( string $str ): string {
		return trim( $str );
	}
}

if ( ! function_exists( 'sanitize_html_class' ) ) {
	function sanitize_html_class( string $class ): string {
		return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( $class ) );
	}
}

if ( ! function_exists( 'esc_url_raw' ) ) {
	function esc_url_raw( string $url ): string {
		return filter_var( $url, FILTER_SANITIZE_URL ) ?: '';
	}
}

if ( ! function_exists( 'absint' ) ) {
	function absint( mixed $val ): int {
		return abs( (int) $val );
	}
}

if ( ! function_exists( 'wp_cache_get' ) ) {
	function wp_cache_get( string $key, string $group = '' ): mixed {
		return false;
	}
}

if ( ! function_exists( 'wp_cache_set' ) ) {
	function wp_cache_set( string $key, mixed $value, string $group = '', int $expire = 0 ): bool {
		return true;
	}
}

if ( ! function_exists( '__' ) ) {
	function __( string $text, string $domain = 'default' ): string {
		return $text;
	}
}

if ( ! class_exists( 'WP_Error' ) ) {
	class WP_Error {
		public string $code;
		public string $message;
		public function __construct( string $code = '', string $message = '', mixed $data = null ) {
			$this->code    = $code;
			$this->message = $message;
		}
		public function get_error_code(): string { return $this->code; }
	}
}

// Load the files under test.
require_once ALDUS_PATH . 'includes/block-html.php';
require_once ALDUS_PATH . 'includes/api.php';
