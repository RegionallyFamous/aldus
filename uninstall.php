<?php
declare(strict_types=1);
/**
 * Runs when the plugin is deleted from wp-admin.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Remove per-personality usage counters written by /aldus/v1/record-use.
// Sessions live in browser localStorage only — nothing else to clean up.
global $wpdb;
// Direct query is necessary here: delete_option() doesn't support wildcard
// patterns, and this is a one-time uninstall operation rather than a hot path.
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
		'aldus_usage_%'
	)
);
wp_cache_flush();
