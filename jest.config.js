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
	// Module resolution
	// ---------------------------------------------------------------------------

	// @wordpress/* packages use package.json `exports` maps. Under Jest's
	// coverage transform the conditional exports resolution can fail because
	// the coverage instrumentation runs in a different resolution context.
	// Using require.resolve() pins each package to its actual CJS entry point
	// at config-load time, using standard Node.js module resolution so the
	// path is always correct regardless of the installed package version.
	moduleNameMapper: {
		...defaultConfig.moduleNameMapper,
		'^@wordpress/api-fetch$': require.resolve( '@wordpress/api-fetch' ),
		'^@wordpress/i18n$': require.resolve( '@wordpress/i18n' ),
	},

	// ---------------------------------------------------------------------------
	// Coverage configuration
	// ---------------------------------------------------------------------------

	// Collect coverage only from src/lib — the pure-logic layer that can be
	// executed in a Node.js / jsdom environment.  React components, hooks,
	// screens, and edit.js all depend on browser-only WordPress block-editor
	// APIs (useSelect, useDispatch, BlockControls, WebGPU, etc.) and produce
	// 0 % coverage even when they compile cleanly; including them skews the
	// global metrics to near-zero and makes the threshold meaningless.
	collectCoverageFrom: [
		'src/lib/**/*.{js,ts}',
		'!src/__tests__/**',
		'!src/frontend/**',
	],

	// Emit lcov (for Codecov upload) and human-readable text summaries.
	coverageReporters: [ 'lcov', 'text', 'text-summary' ],

	// Coverage floor scoped to src/lib/** — ratchet upward as new lib tests
	// are added.  Current baseline: api-utils 100 %, batchAssemble ~90 %,
	// intelligence ~70 %, robustParse ~85 %, uid 100 %, prompts 0 % (logic
	// inlined in promptBuilder.test.js pending export refactor).
	coverageThreshold: {
		global: {
			statements: 55,
			branches: 45,
			functions: 55,
			lines: 55,
		},
	},
};
