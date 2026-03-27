module.exports = {
	root: true,
	extends: [ 'plugin:@wordpress/eslint-plugin/recommended' ],
	env: {
		browser: true,
	},
	rules: {
		// @wordpress/* packages are WordPress runtime externals — they are not
		// installed as local npm deps, so the import resolver cannot find them.
		'import/no-unresolved': [ 'error', { ignore: [ '^@wordpress/' ] } ],

		// ── WordPress deprecation guards ──────────────────────────────────────

		// Block imports of __experimental* and __unstable* exports from any
		// @wordpress package. These are not covered by semver and can vanish in
		// any release. Add a specific allow-list entry here if you genuinely
		// need one and understand the risk.
		'@wordpress/no-unsafe-wp-apis': 'error',

		// Warn when a @wordpress/components control is missing the opt-in prop
		// required for the new 40 px default height. Affects: Button, SelectControl,
		// TextControl, NumberControl, ComboboxControl, and ~20 others.
		'@wordpress/components-no-missing-40px-size-prop': 'warn',

		// Warn when a component scheduled for deprecation is used (e.g.
		// __experimentalZStack from @wordpress/components).
		'@wordpress/use-recommended-components': 'warn',

		// ── Deprecated WordPress data / REST APIs ─────────────────────────────
		// Each entry below corresponds to a WP core API that was removed or
		// renamed. Add new entries here whenever WP publishes a deprecation notice
		// so future code never re-introduces the old pattern.
		'no-restricted-syntax': [
			'error',
			// WP 6.9: select('core').getMediaItems() → getEntityRecords('postType','attachment',…)
			{
				selector:
					"CallExpression[callee.property.name='getMediaItems']",
				message:
					"getMediaItems() is removed in WP 6.9. Use getEntityRecords('postType', 'attachment', { … }) instead.",
			},
			// WP 6.9: select('core').getAuthors() → getEntityRecords('root','user',…)
			{
				selector: "CallExpression[callee.property.name='getAuthors']",
				message:
					"getAuthors() is removed in WP 6.9. Use getEntityRecords('root', 'user', { … }) instead.",
			},
		],
	},
	overrides: [
		{
			// Jest test files — enable Jest globals (describe, it, expect, etc.)
			files: [ 'src/__tests__/**/*.js', 'tests/e2e/**/*.js' ],
			env: {
				jest: true,
				node: true,
			},
		},
	],
};
