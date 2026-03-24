/**
 * Aldus custom webpack config.
 * Extends @wordpress/scripts defaults and adds asyncWebAssembly support,
 * which is required by @mlc-ai/web-llm's WASM runtime.
 */

const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
	experiments: {
		...( defaultConfig.experiments ?? {} ),
		asyncWebAssembly: true,
	},
};
