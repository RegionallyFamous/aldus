<?php
declare(strict_types=1);
/**
 * Templates — content moved to split files.
 *
 * This file has been split into:
 *   includes/class-content-distributor.php
 *   includes/personality.php
 *   includes/render-router.php
 *   includes/serialize.php
 *   includes/renderers/
 *   includes/theme.php  (theme helpers that were here)
 *
 * All require_once calls now live in aldus_init() in aldus.php.
 * This file is kept as a zero-byte placeholder for backward compatibility
 * with any direct includes; it will be removed in a future version.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
