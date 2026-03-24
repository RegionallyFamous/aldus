<?php
/**
 * Runs when the plugin is deleted from wp-admin.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Aldus stores no server-side options. Sessions live in browser localStorage only.
