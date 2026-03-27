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
		'@testing-library/jest-dom',
	],
	// Transforms are inherited from @wordpress/scripts — no overrides needed.

	// ---------------------------------------------------------------------------
	// Module resolution
	// ---------------------------------------------------------------------------

	// @wordpress/* packages that are not direct dependencies are mapped to
	// manual mocks in __mocks__/@wordpress/. This avoids require.resolve()
	// calls at config-load time that fail when the package is only a
	// transitive dependency and may not be hoisted into node_modules.
	moduleNameMapper: {
		...defaultConfig.moduleNameMapper,
		'^@wordpress/api-fetch$': '<rootDir>/__mocks__/@wordpress/api-fetch.js',
		'^@wordpress/i18n$': '<rootDir>/__mocks__/@wordpress/i18n.js',
		// Component-layer mocks to avoid ESM issues with deep WP package deps.
		'^@wordpress/element$': '<rootDir>/__mocks__/@wordpress/element.js',
		'^@wordpress/components$': '<rootDir>/__mocks__/@wordpress/components.js',
		'^@wordpress/block-editor$': '<rootDir>/__mocks__/@wordpress/block-editor.js',
		'^@wordpress/compose$': '<rootDir>/__mocks__/@wordpress/compose.js',
		'^@wordpress/data$': '<rootDir>/__mocks__/@wordpress/data.js',
		'^@wordpress/icons$': '<rootDir>/__mocks__/@wordpress/icons.js',
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
		'src/data/**/*.{js,ts}',
		'src/utils/**/*.{js,ts}',
		'src/hooks/useAldusItems.js',
		'src/components/AldusErrorBoundary.js',
		'!src/__tests__/**',
		'!src/frontend/**',
	],

	// Emit lcov (for Codecov upload) and human-readable text summaries.
	coverageReporters: [ 'lcov', 'text', 'text-summary' ],

	// Coverage floors — raised to reflect the comprehensive test suite.
	// Measured baseline (2026-03): statements 77%, branches 71%, functions 75%, lines 77%.
	// Thresholds are set 5 percentage points below baseline so that adding new
	// uncovered code files doesn't immediately break CI, while still enforcing
	// that the covered-logic layer stays well-tested.
	coverageThreshold: {
		global: {
			statements: 70,
			branches: 65,
			functions: 70,
			lines: 70,
		},
		// Individual file floors for the most critical pure-logic modules.
		'./src/lib/prompts.js': {
			statements: 95,
			branches: 85,
			functions: 95,
			lines: 95,
		},
		'./src/lib/similarity.js': {
			statements: 100,
			branches: 100,
			functions: 100,
			lines: 100,
		},
		'./src/lib/api-utils.js': {
			statements: 95,
			branches: 95,
			functions: 95,
			lines: 95,
		},
		'./src/components/AldusErrorBoundary.js': {
			statements: 95,
			branches: 95,
			functions: 95,
			lines: 95,
		},
	},
};
