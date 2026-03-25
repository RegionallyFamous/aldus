<?php
declare(strict_types=1);
/**
 * Runs when the plugin is deleted from wp-admin.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Remove per-personality usage counters written by /aldus/v1/record-use.
// Sessions live in browser localStorage only — nothing else to clean up.
global $wpdb;
// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- table name cannot be parameterised; pattern is a static literal.
$wpdb->query(
	$wpdb->prepare(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
		'aldus_usage_%'
	)
);
