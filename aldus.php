<?php
declare(strict_types=1);
/**
 * Plugin Name:       Aldus — Layout Explorer
 * Plugin URI:        https://github.com/RegionallyFamous/aldus
 * Description:       You write it. Aldus designs it. Layout styles for your content — pick the one that fits, and it becomes real WordPress blocks.
 * Version:           1.24.2
 * Requires at least: 6.4
 * Requires PHP:      8.0
 * Author:            Regionally Famous
 * Author URI:        https://regionallyfamous.com
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       aldus
 * Domain Path:       /languages
 * Update URI:        https://github.com/RegionallyFamous/aldus
 * Requires Plugins:
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

defined( 'ALDUS_VERSION' ) || define( 'ALDUS_VERSION', '1.24.2' );
defined( 'ALDUS_PATH' ) || define( 'ALDUS_PATH', plugin_dir_path( __FILE__ ) );
defined( 'ALDUS_URL' ) || define( 'ALDUS_URL', plugin_dir_url( __FILE__ ) );
// Injected by the build script (bin/inject-build-hash.js) from the webpack
// content hash.  An empty string is safe: the cache key falls back to version
// + request params, which is correct for manual/dev builds.
defined( 'ALDUS_BUILD_HASH' ) || define( 'ALDUS_BUILD_HASH', '3e4ccfdfbfa69d2ad644' );

register_activation_hook( __FILE__, 'aldus_activate' );
register_deactivation_hook( __FILE__, 'aldus_deactivate' );

/**
 * Runs on plugin activation.
 *
 * Stores the installed version and sets a one-time redirect transient so
 * the first activation takes the user to the welcome page.
 */
function aldus_activate(): void {
	if ( ! get_option( 'aldus_version' ) ) {
		add_option( 'aldus_version', ALDUS_VERSION, '', false );
		set_transient( 'aldus_activation_redirect', true, 60 );
	} elseif ( get_option( 'aldus_version' ) !== ALDUS_VERSION ) {
		// Keep the stored version current on upgrades so migration hooks have
		// a reliable before/after reference point.
		update_option( 'aldus_version', ALDUS_VERSION, false );
	}
}

/**
 * Runs on plugin deactivation.
 */
function aldus_deactivate(): void {
	// Flush cached theme data so a subsequent activation (possibly after a
	// theme switch) always starts with fresh values.
	if ( function_exists( 'aldus_flush_theme_cache' ) ) {
		aldus_flush_theme_cache();
	}
}

add_action( 'plugins_loaded', 'aldus_init' );

/**
 * Loads all plugin files and registers WordPress hooks.
 *
 * Require order follows the dependency chain:
 *   Foundation → Configuration → Renderers → API layer → Admin
 */
function aldus_init(): void {
	// Core dependencies — always loaded on every request.
	require_once ALDUS_PATH . 'includes/sanitize.php';
	require_once ALDUS_PATH . 'includes/tokens.php';
	require_once ALDUS_PATH . 'includes/theme.php';
	require_once ALDUS_PATH . 'includes/personality.php';
	require_once ALDUS_PATH . 'includes/block-html.php';
	require_once ALDUS_PATH . 'includes/serialize.php';
	require_once ALDUS_PATH . 'includes/styles.php';
	require_once ALDUS_PATH . 'includes/bindings.php';
	require_once ALDUS_PATH . 'includes/class-content-distributor.php';
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
	require_once ALDUS_PATH . 'includes/class-rest-controller.php';
	require_once ALDUS_PATH . 'includes/api.php';
	require_once ALDUS_PATH . 'includes/api-assemble.php';
	require_once ALDUS_PATH . 'includes/api-config.php';
	require_once ALDUS_PATH . 'includes/api-health.php';
	require_once ALDUS_PATH . 'includes/api-telemetry.php';
	require_once ALDUS_PATH . 'includes/block-register.php';
	require_once ALDUS_PATH . 'includes/admin-hooks.php';
	require_once ALDUS_PATH . 'includes/ai-client.php';

	// Warn about deprecated filter usage (defined in api.php).
	aldus_check_deprecated_filters();

	// Tier 3 — admin only: block patterns and the admin welcome/settings page.
	if ( is_admin() ) {
		require_once ALDUS_PATH . 'includes/patterns.php';
		require_once ALDUS_PATH . 'includes/pattern-library.php';
		require_once ALDUS_PATH . 'includes/admin-page.php';
	}

	// Load text domain at priority 1 so it is available before register_block_type()
	// (priority 10) translates block.json title/description via __() in WP 6.7+.
	add_action(
		'init',
		static function (): void {
			load_plugin_textdomain( 'aldus', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
		},
		1
	);
	add_action( 'init', 'aldus_register_block' );
	add_action( 'rest_api_init', 'aldus_register_rest_routes' );

	// Flush cached theme data whenever the active theme or Customizer settings change.
	add_action( 'switch_theme', 'aldus_flush_theme_cache' );
	add_action( 'customize_save_after', 'aldus_flush_theme_cache' );
	// Also flush when a theme is updated via the admin so stale palette/font
	// caches don't persist until the 1-hour object-cache TTL expires.
	add_action(
		'upgrader_process_complete',
		static function ( $upgrader, $options ) {
			if (
				'update' === ( $options['action'] ?? '' ) &&
				'theme' === ( $options['type'] ?? '' )
			) {
				aldus_flush_theme_cache();
			}
		},
		10,
		2
	);

	// Inject Aldus spacing presets and CSS custom properties into the active theme's
	// theme.json data so generated layouts render consistently regardless of theme.
	add_filter( 'wp_theme_json_data_theme', 'aldus_inject_theme_json' );

	// Register the Aldus block pattern category inside init so the text domain
	// is loaded before __() is called (avoids _load_textdomain_just_in_time notice
	// in WordPress 6.7+).
	add_action(
		'init',
		static function (): void {
			register_block_pattern_category(
				'aldus',
				array(
					'label'       => __( 'Aldus', 'aldus' ),
					'description' => __( 'Layout styles from Aldus.', 'aldus' ),
				)
			);
		},
		2
	);

	// Register a custom block inserter category so Aldus appears in its own section.
	add_filter( 'block_categories_all', 'aldus_register_block_category' );

	// Add a "How to use" link to the plugin row on the Plugins admin page.
	add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'aldus_plugin_action_links' );

	// Redirect to welcome page on first activation.
	add_action( 'admin_init', 'aldus_maybe_redirect_to_welcome' );

	// Declare privacy policy content for the Tools > Privacy screen.
	add_action( 'admin_init', 'aldus_add_privacy_policy_content' );

	// Posts / pages list column showing Aldus usage.
	add_filter( 'manage_posts_columns', 'aldus_add_posts_column' );
	add_filter( 'manage_pages_columns', 'aldus_add_posts_column' );
	add_action( 'manage_posts_custom_column', 'aldus_render_posts_column', 10, 2 );
	add_action( 'manage_pages_custom_column', 'aldus_render_posts_column', 10, 2 );
}
