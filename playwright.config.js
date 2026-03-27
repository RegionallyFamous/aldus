/**
 * Playwright configuration for Aldus end-to-end tests.
 *
 * Auth strategy: the "setup" project (auth.setup.js) logs in once and writes
 * tests/e2e/.auth.json.  All other projects declare `dependencies: ['setup']`
 * so that file is always present before tests start.
 *
 * @see tests/e2e/auth.setup.js
 */

const path = require( 'path' );
const { defineConfig, devices } = require( '@playwright/test' );

const AUTH_FILE = path.join( __dirname, 'tests/e2e/.auth.json' );

module.exports = defineConfig( {
	testDir: './tests/e2e',
	globalSetup: './tests/e2e/global.setup.js',
	fullyParallel: false,
	forbidOnly: !! process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	timeout: 60000,
	reporter: process.env.CI ? 'github' : 'list',

	use: {
		baseURL: process.env.WP_BASE_URL ?? 'http://localhost:8888',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		viewport: { width: 1280, height: 720 },
	},

	projects: [
		// ── Auth setup ────────────────────────────────────────────────────────
		// Logs in once and saves the session; all other projects depend on this.
		{
			name: 'setup',
			testMatch: '**/auth.setup.js',
		},

		// ── Main test suite ───────────────────────────────────────────────────
		{
			name: 'chromium',
			use: {
				...devices[ 'Desktop Chrome' ],
				storageState: AUTH_FILE,
			},
			dependencies: [ 'setup' ],
		},
	],
} );
