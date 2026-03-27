/**
 * Playwright global setup — runs once before any test file.
 *
 * Clears WordPress transients from the wp-env Docker instance so that the
 * Aldus per-user rate limiter (60 req/min stored as a transient) starts at
 * zero.  Without this, repeated local test runs within the same 60-second
 * window accumulate counts across sessions and trigger 429s.
 *
 * This has no effect in CI because each CI run starts a fresh Docker
 * container; the call is harmless there.
 */

'use strict';

const { spawnSync } = require( 'child_process' );
const path = require( 'path' );

module.exports = async function globalSetup() {
	const projectRoot = path.resolve( __dirname, '..', '..' );

	const result = spawnSync(
		'npx',
		[ 'wp-env', 'run', 'cli', 'wp', 'transient', 'delete', '--all' ],
		{
			cwd: projectRoot,
			// Inherit PATH from parent process so npx is found.
			env: process.env,
			// Let output pass through to console so failures are visible.
			stdio: 'inherit',
			// Use shell on all platforms to ensure PATH resolution works.
			shell: true,
		}
	);

	if ( result.status !== 0 ) {
		// Log but don't throw — tests can still run; they may hit 429 in the
		// unlikely case the rate window is saturated from a previous run, but
		// in CI each run has a fresh container.
		console.warn(
			'[global setup] wp transient delete failed (exit',
			result.status,
			'). Rate-limit transient may not have been cleared.'
		);
	}
};
