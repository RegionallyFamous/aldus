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
