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
if ( ! defined( 'ALDUS_BUILD_HASH' ) ) {
	define( 'ALDUS_BUILD_HASH', 'phpunit' );
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

if ( ! function_exists( 'is_wp_error' ) ) {
	function is_wp_error( mixed $thing ): bool {
		return $thing instanceof WP_Error;
	}
}

// WordPress time constants (seconds).
if ( ! defined( 'MINUTE_IN_SECONDS' ) ) {
	define( 'MINUTE_IN_SECONDS', 60 );
}
if ( ! defined( 'HOUR_IN_SECONDS' ) ) {
	define( 'HOUR_IN_SECONDS', 3600 );
}
if ( ! defined( 'DAY_IN_SECONDS' ) ) {
	define( 'DAY_IN_SECONDS', 86400 );
}
if ( ! defined( 'WEEK_IN_SECONDS' ) ) {
	define( 'WEEK_IN_SECONDS', 604800 );
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

if ( ! function_exists( 'wp_using_ext_object_cache' ) ) {
	function wp_using_ext_object_cache(): bool {
		return false;
	}
}

if ( ! function_exists( 'get_post_type' ) ) {
	function get_post_type( int|null $post = null ): string|false {
		return 'post';
	}
}

// ---------------------------------------------------------------------------
// Transient store — backed by an in-memory array for fast unit tests.
// Tests can reset $GLOBALS['_aldus_test_transients'] in setUp() to start clean.
// ---------------------------------------------------------------------------

if ( ! function_exists( 'get_transient' ) ) {
	function get_transient( string $transient ): mixed {
		$store = $GLOBALS['_aldus_test_transients'] ?? array();
		$entry = $store[ $transient ] ?? null;
		if ( null === $entry ) {
			return false;
		}
		if ( $entry['expiry'] > 0 && $entry['expiry'] < time() ) {
			unset( $GLOBALS['_aldus_test_transients'][ $transient ] );
			return false;
		}
		return $entry['value'];
	}
}

if ( ! function_exists( 'set_transient' ) ) {
	function set_transient( string $transient, mixed $value, int $expiration = 0 ): bool {
		if ( ! isset( $GLOBALS['_aldus_test_transients'] ) ) {
			$GLOBALS['_aldus_test_transients'] = array();
		}
		$GLOBALS['_aldus_test_transients'][ $transient ] = array(
			'value'  => $value,
			'expiry' => $expiration > 0 ? time() + $expiration : 0,
		);
		return true;
	}
}

if ( ! function_exists( 'delete_transient' ) ) {
	function delete_transient( string $transient ): bool {
		unset( $GLOBALS['_aldus_test_transients'][ $transient ] );
		return true;
	}
}

if ( ! function_exists( 'get_current_user_id' ) ) {
	function get_current_user_id(): int {
		return $GLOBALS['_aldus_test_current_user_id'] ?? 1;
	}
}

if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( array $path = [] ): array {
		return [];
	}
}

if ( ! function_exists( 'wp_get_global_styles' ) ) {
	function wp_get_global_styles( array $path = [], array $context = [] ): mixed {
		return [];
	}
}

if ( ! function_exists( 'get_stylesheet' ) ) {
	function get_stylesheet(): string {
		return 'test-theme';
	}
}

if ( ! function_exists( 'wp_get_theme' ) ) {
	function wp_get_theme( string $stylesheet = '' ): object {
		return new class {
			public function get( string $field ): string {
				return match ( $field ) {
					'Version' => '1.0',
					default   => '',
				};
			}
		};
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

if ( ! function_exists( 'serialize_block' ) ) {
	/**
	 * Minimal serialize_block stub for unit tests.
	 * Concatenates innerContent strings, substituting serialized inner blocks
	 * for null placeholders (the same logic as the WP core function).
	 *
	 * @param array $block Parsed block array.
	 * @return string Serialized block HTML.
	 */
	function serialize_block( array $block ): string {
		$inner_block_index = 0;
		$html              = '';
		foreach ( $block['innerContent'] as $chunk ) {
			if ( null === $chunk ) {
				$html .= serialize_block( $block['innerBlocks'][ $inner_block_index++ ] );
			} else {
				$html .= $chunk;
			}
		}

		if ( empty( $block['blockName'] ) ) {
			return $html;
		}

		$attrs        = $block['attrs'] ?? [];
		$attrs_string = empty( $attrs ) ? '' : ' ' . json_encode( $attrs, JSON_UNESCAPED_UNICODE );
		return "<!-- wp:{$block['blockName']}{$attrs_string} -->{$html}<!-- /wp:{$block['blockName']} -->";
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

if ( ! function_exists( 'do_action' ) ) {
	function do_action( string $hook, mixed ...$args ): void {}
}

if ( ! function_exists( 'get_option' ) ) {
	function get_option( string $option, mixed $default = false ): mixed {
		return $GLOBALS['_aldus_test_options'][ $option ] ?? $default;
	}
}

if ( ! function_exists( 'update_option' ) ) {
	function update_option( string $option, mixed $value, bool|string $autoload = true ): bool {
		if ( ! isset( $GLOBALS['_aldus_test_options'] ) ) {
			$GLOBALS['_aldus_test_options'] = array();
		}
		$GLOBALS['_aldus_test_options'][ $option ] = $value;
		return true;
	}
}

if ( ! function_exists( 'rest_ensure_response' ) ) {
	function rest_ensure_response( mixed $data ): \WP_REST_Response {
		return new \WP_REST_Response( $data, 200 );
	}
}

if ( ! function_exists( 'rest_authorization_required_code' ) ) {
	function rest_authorization_required_code(): int {
		return 401;
	}
}

if ( ! function_exists( 'current_user_can' ) ) {
	function current_user_can( string $capability ): bool {
		return $GLOBALS['_aldus_test_can'][ $capability ] ?? true;
	}
}

if ( ! function_exists( 'wp_cache_incr' ) ) {
	function wp_cache_incr( string $key, int $offset = 1, string $group = '' ): int|false {
		return false; // Force transient path in tests.
	}
}

if ( ! function_exists( 'add_action' ) ) {
	function add_action( string $hook, callable $callback, int $priority = 10, int $accepted_args = 1 ): bool {
		return true;
	}
}

if ( ! function_exists( 'add_filter' ) ) {
	function add_filter( string $hook, callable $callback, int $priority = 10, int $accepted_args = 1 ): bool {
		return true;
	}
}

if ( ! function_exists( 'register_rest_route' ) ) {
	function register_rest_route( string $namespace, string $route, array $args = array() ): bool {
		return true;
	}
}

if ( ! function_exists( '_doing_it_wrong' ) ) {
	function _doing_it_wrong( string $function, string $message, string $version ): void {}
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

if ( ! class_exists( 'WP_Block_Styles_Registry' ) ) {
	class WP_Block_Styles_Registry {
		private static ?self $instance = null;
		private array $registered      = [];

		public static function get_instance(): self {
			if ( null === self::$instance ) {
				self::$instance = new self();
			}
			return self::$instance;
		}

		public function register( string $block_name, array $style ): bool {
			$this->registered[ $block_name ][] = $style;
			return true;
		}

		/** @return list<array{name:string,label:string}> */
		public function get_registered_styles_for_block( string $block_name ): array {
			return $this->registered[ $block_name ] ?? [];
		}

		public function reset(): void {
			$this->registered = [];
		}
	}
}

// Load the files under test — mirrors the require chain in aldus_init().
// Foundation
require_once ALDUS_PATH . 'includes/sanitize.php';
require_once ALDUS_PATH . 'includes/api-personality.php';
require_once ALDUS_PATH . 'includes/tokens.php';
require_once ALDUS_PATH . 'includes/theme.php';
require_once ALDUS_PATH . 'includes/class-content-distributor.php';
// Configuration
require_once ALDUS_PATH . 'includes/personality.php';
require_once ALDUS_PATH . 'includes/block-html.php';
require_once ALDUS_PATH . 'includes/serialize.php';
// Renderers
require_once ALDUS_PATH . 'includes/renderers/cover.php';
require_once ALDUS_PATH . 'includes/renderers/columns.php';
require_once ALDUS_PATH . 'includes/renderers/group.php';
require_once ALDUS_PATH . 'includes/renderers/media-text.php';
require_once ALDUS_PATH . 'includes/renderers/pullquote.php';
require_once ALDUS_PATH . 'includes/renderers/heading.php';
require_once ALDUS_PATH . 'includes/renderers/text.php';
require_once ALDUS_PATH . 'includes/renderers/media.php';
require_once ALDUS_PATH . 'includes/renderers/structure.php';
require_once ALDUS_PATH . 'includes/renderers/layout.php';
require_once ALDUS_PATH . 'includes/render-router.php';
require_once ALDUS_PATH . 'includes/block-tree.php';
// API layer
require_once ALDUS_PATH . 'includes/class-rest-controller.php';
require_once ALDUS_PATH . 'includes/api.php';
require_once ALDUS_PATH . 'includes/api-assemble.php';
