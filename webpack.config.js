/**
 * Aldus custom webpack config.
 * Extends @wordpress/scripts defaults and adds asyncWebAssembly support,
 * which is required by @mlc-ai/web-llm's WASM runtime.
 *
 * In @wordpress/scripts ≥ 27, `defaultConfig.entry` is an async function
 * rather than a plain object. We must preserve it as a function and await
 * the default entries before merging in our own custom entry point.
 */

const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
	entry: async () => {
		const defaultEntries =
			typeof defaultConfig.entry === 'function'
				? await defaultConfig.entry()
				: defaultConfig.entry ?? {};
		return {
			...defaultEntries,
			// Compiles src/frontend.scss → build/frontend.css.
			// Referenced by the 'style' key in block.json and by wp_enqueue_block_style()
			// in aldus_register_block(). Loads only on pages that contain the block.
			frontend: './src/frontend.scss',
			// Compiles the Interactivity API store → build/frontend-interactivity.js.
			// Registered as a Script Module in aldus_register_block() and declared
			// via viewScriptModule in block.json so WP loads it only on pages with
			// Aldus blocks. Requires @wordpress/interactivity (WP 6.5+).
			'frontend-interactivity': './src/frontend/interactivity.js',
		};
	},
	experiments: {
		...( defaultConfig.experiments ?? {} ),
		asyncWebAssembly: true,
	},
};
