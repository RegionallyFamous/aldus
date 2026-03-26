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

global $wpdb;

// All direct queries below are intentional: delete_option() and
// delete_post_meta() don't support wildcard patterns, and this is a one-time
// uninstall operation rather than a hot path.
// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

// Consolidated usage counter map (single option as of v1.17.0).
delete_option( 'aldus_usage' );

// Legacy per-personality usage counter rows (aldus_usage_dispatch etc.) created
// before v1.17.0 — remove any that remain on older installs.
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
		'aldus_usage_%'
	)
);

// Per-personality error counters written on assembly failure.
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
		'aldus_errors_%'
	)
);

// Assembled-layout transients and their timeout entries.
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
		'_transient_aldus_%'
	)
);
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
		'_transient_timeout_aldus_%'
	)
);

// Post meta stored by the block (content items, layout history, lock list).
$wpdb->query(
	"DELETE FROM {$wpdb->postmeta} WHERE meta_key IN ('_aldus_items','_aldus_locked_blocks','_aldus_layout_history')"
);

// User meta (dismissed notice tracking).
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$wpdb->usermeta} WHERE meta_key = %s",
		'aldus_dismissed_notice_version'
	)
);

// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching

wp_cache_flush();
