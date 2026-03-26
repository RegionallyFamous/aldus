/**
 * Jest configuration for Aldus unit tests.
 *
 * Extends the @wordpress/scripts preset so wp.data, wp.blocks, and other
 * WordPress globals are available in tests without a full browser.
 */
const defaultConfig = require( '@wordpress/scripts/config/jest-unit.config' );

module.exports = {
	...defaultConfig,
	testMatch: [
		'<rootDir>/src/__tests__/**/*.test.js',
		'<rootDir>/src/__tests__/**/*.test.ts',
	],
	testPathIgnorePatterns: [ '/node_modules/', '/build/', '/tests/e2e/' ],
	// Intercept WordPress deprecation console.error calls and turn them into
	// test failures so deprecated API usage is caught in CI automatically.
	setupFilesAfterEnv: [
		'<rootDir>/src/__tests__/setup/no-wp-deprecations.js',
	],
	// Transforms are inherited from @wordpress/scripts — no overrides needed.

	// ---------------------------------------------------------------------------
	// Coverage configuration
	// ---------------------------------------------------------------------------

	// Collect coverage from all JS/TS source files, excluding test infrastructure,
	// the compiled frontend interactivity bundle, and sample data fixtures.
	collectCoverageFrom: [
		'src/**/*.{js,ts}',
		'!src/__tests__/**',
		'!src/frontend/**',
		'!src/sample-data/**',
	],

	// Emit lcov (for Codecov upload) and human-readable text summaries.
	coverageReporters: [ 'lcov', 'text', 'text-summary' ],

	// Coverage floor — CI fails when any metric drops below these thresholds.
	// Ratchet upward 5 % per release by updating alongside the version bump in
	// scripts/release.js.
	coverageThreshold: {
		global: {
			statements: 60,
			branches: 55,
			functions: 60,
			lines: 60,
		},
	},
};
