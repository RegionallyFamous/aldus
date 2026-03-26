/**
 * Playwright configuration for Aldus end-to-end tests.
 *
 * Tests run against the @wordpress/env local development server.
 * Start the environment first with `npm run env:start`, then run `npm run test:e2e`.
 *
 * Auth strategy: global-setup.js logs in once and saves the session to
 * tests/e2e/.auth.json; every test file reuses those cookies automatically.
 */

const { defineConfig, devices } = require( '@playwright/test' );

module.exports = defineConfig( {
	testDir: './tests/e2e',
	globalSetup: './tests/e2e/global-setup.js',
	fullyParallel: false, // WordPress tests must run sequentially to share editor state.
	forbidOnly: !! process.env.CI,
	retries: process.env.CI ? 1 : 0, // 1 retry keeps total time reasonable.
	workers: 1,
	timeout: 60000, // 60 s per test.
	reporter: process.env.CI ? 'github' : 'list',

	use: {
		baseURL: process.env.WP_BASE_URL ?? 'http://localhost:8888',
		storageState: 'tests/e2e/.auth.json', // Auth cookies from global setup.
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		viewport: { width: 1280, height: 720 },
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices[ 'Desktop Chrome' ] },
		},
	],
} );
