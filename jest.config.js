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
};
