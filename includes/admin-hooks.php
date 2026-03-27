<?php
declare(strict_types=1);
/**
 * Admin hooks — block category, plugin action links, deprecated filter checks.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ---------------------------------------------------------------------------
// Block category + plugin links + deprecated filter guard
// ---------------------------------------------------------------------------

/**
 * Prepends the Aldus block category to the inserter category list.
 *
 * @param mixed $categories Existing categories (array expected).
 * @return mixed
 */
function aldus_register_block_category( mixed $categories ): mixed {
	if ( ! is_array( $categories ) ) {
		return $categories;
	}
	return array_merge(
		array(
			array(
				'slug'  => 'aldus',
				'title' => __( 'Aldus', 'aldus' ),
				'icon'  => 'table-col-after',
			),
		),
		$categories
	);
}

/**
 * Adds action links to the plugin row on the Plugins admin page.
 *
 * @param mixed $links Existing action links (array expected).
 * @return mixed
 */
function aldus_plugin_action_links( mixed $links ): mixed {
	if ( ! is_array( $links ) ) {
		return $links;
	}
	$welcome    = sprintf(
		'<a href="%s">%s</a>',
		esc_url( admin_url( 'admin.php?page=aldus-welcome' ) ),
		__( 'About', 'aldus' )
	);
	$how_to_use = sprintf(
		'<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>',
		'https://github.com/RegionallyFamous/aldus/wiki',
		__( 'Docs', 'aldus' )
	);
	return array_merge(
		array(
			'welcome'    => $welcome,
			'how_to_use' => $how_to_use,
		),
		$links
	);
}

/**
 * Issues _doing_it_wrong() notices if third-party code has attached callbacks
 * to Aldus filter hooks that may be renamed or removed in a future release.
 *
 * This is a no-op for all current hooks (none have been deprecated yet) but
 * establishes the pattern so that future renames can warn developers cleanly.
 */
function aldus_check_deprecated_filters(): void {
	/**
	 * Map of deprecated hook name => message describing the replacement.
	 * Populate this array when a hook is renamed or removed.
	 *
	 * Example:
	 * 'aldus_old_hook' => 'Use aldus_new_hook instead. See https://github.com/RegionallyFamous/aldus/wiki for migration notes.',
	 *
	 * @var array<string, string>
	 */
	$deprecated = array();

	foreach ( $deprecated as $hook => $message ) {
		if ( has_filter( $hook ) ) {
			// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $hook is an internal hook name, not user input.
			_doing_it_wrong(
				$hook,
				esc_html( $message ),
				'1.0.0'
			);
			// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
		}
	}
}
