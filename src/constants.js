/**
 * Aldus plugin-wide constants.
 *
 * Centralises values that appear in multiple files so there is one place
 * to update them during a release:
 *   - ALDUS_JS_VERSION   — must stay in sync with ALDUS_VERSION in aldus.php
 *   - SCREEN_*           — string literals for the edit.js state machine
 */

/**
 * JavaScript build version.
 *
 * The release script bumps this alongside ALDUS_VERSION in aldus.php.
 * The Edit component checks window.__aldusPhpVersion against this value
 * and warns when they diverge (stale browser cache after an update).
 */
export const ALDUS_JS_VERSION = '1.14.0';

/**
 * Screen state identifiers for the Edit component's state machine.
 *
 * State flow:
 *   BUILDING → DOWNLOADING? → LOADING → RESULTS → CONFIRMING → (back to BUILDING)
 *   Any state → ERROR | NO_GPU
 *   RESULTS → MIXING → RESULTS
 */
export const SCREEN = {
	BUILDING: 'building',
	DOWNLOADING: 'downloading',
	LOADING: 'loading',
	RESULTS: 'results',
	CONFIRMING: 'confirming',
	MIXING: 'mixing',
	INSERTED: 'inserted',
	ERROR: 'error',
	NO_GPU: 'no-gpu',
};
