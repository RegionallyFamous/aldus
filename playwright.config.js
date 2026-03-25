/**
 * Playwright configuration for Aldus end-to-end tests.
 *
 * Tests run against the @wordpress/env local development server.
 * Start the environment first with `npm run env:start`, then run `npm run test:e2e`.
 */

const { defineConfig, devices } = require( '@playwright/test' );

module.exports = defineConfig( {
	testDir: './tests/e2e',
	fullyParallel: false, // WordPress tests must run sequentially to share editor state.
	forbidOnly: !! process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: process.env.CI ? 'github' : 'list',

	use: {
		baseURL: process.env.WP_BASE_URL ?? 'http://localhost:8888',
		trace: 'on-first-retry',
		viewport: { width: 1280, height: 720 },
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices[ 'Desktop Chrome' ] },
		},
	],
} );
