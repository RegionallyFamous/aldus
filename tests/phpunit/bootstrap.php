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
// ALDUS_MAX_CONTENT_LENGTH is defined as a constant in includes/api.php.
// Do not redefine it here to avoid the "Constant already defined" warning.

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
		return trim( strip_tags( $str ) );
	}
}

if ( ! function_exists( 'sanitize_html_class' ) ) {
	function sanitize_html_class( string $class ): string {
		return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( $class ) );
	}
}

if ( ! function_exists( 'esc_url_raw' ) ) {
	function esc_url_raw( string $url ): string {
		// Reject dangerous protocols — mirrors WordPress core behaviour.
		$trimmed  = trim( $url );
		$protocol = strtolower( (string) parse_url( $trimmed, PHP_URL_SCHEME ) );
		$allowed  = [ 'http', 'https', 'ftp', 'ftps', 'mailto', '' ];
		if ( $protocol !== '' && ! in_array( $protocol, $allowed, true ) ) {
			return '';
		}
		$sanitized = filter_var( $trimmed, FILTER_SANITIZE_URL );
		return $sanitized !== false ? $sanitized : '';
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

if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( array $path = [] ): array {
		return [];
	}
}

if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( string $text ): string {
		return htmlspecialchars( $text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( string $text ): string {
		return htmlspecialchars( $text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( string $url ): string {
		return filter_var( $url, FILTER_SANITIZE_URL ) ?: '';
	}
}

if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( mixed $data, int $options = 0, int $depth = 512 ): string|false {
		return json_encode( $data, $options, $depth );
	}
}

if ( ! function_exists( 'trailingslashit' ) ) {
	function trailingslashit( string $string ): string {
		return rtrim( $string, '/\\' ) . '/';
	}
}

if ( ! function_exists( 'wp_parse_args' ) ) {
	function wp_parse_args( mixed $args, array $defaults = [] ): array {
		if ( is_array( $args ) ) {
			return array_merge( $defaults, $args );
		}
		return $defaults;
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

if ( ! class_exists( 'WP_REST_Controller' ) ) {
	class WP_REST_Controller {
		protected string $namespace = '';
		protected string $rest_base = '';
		public function register_routes(): void {}
	}
}

if ( ! class_exists( 'WP_REST_Request' ) ) {
	class WP_REST_Request {
		private array $params = [];
		public function get_param( string $key ): mixed { return $this->params[ $key ] ?? null; }
		public function set_body_params( array $params ): void { $this->params = $params; }
	}
}

if ( ! class_exists( 'WP_REST_Response' ) ) {
	class WP_REST_Response {
		private mixed $data;
		private int $status;
		public function __construct( mixed $data = null, int $status = 200 ) {
			$this->data   = $data;
			$this->status = $status;
		}
		public function get_data(): mixed { return $this->data; }
		public function get_status(): int { return $this->status; }
	}
}

if ( ! class_exists( 'WP_REST_Server' ) ) {
	class WP_REST_Server {
		const CREATABLE  = 'POST';
		const READABLE   = 'GET';
		const EDITABLE   = 'POST, PUT, PATCH';
		const DELETABLE  = 'DELETE';
		const ALLMETHODS = 'GET, POST, PUT, PATCH, DELETE';
	}
}

// Load the files under test.
require_once ALDUS_PATH . 'includes/block-html.php';
require_once ALDUS_PATH . 'includes/api.php';
require_once ALDUS_PATH . 'includes/templates.php';
