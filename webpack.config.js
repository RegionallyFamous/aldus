/**
 * Aldus custom webpack config.
 * Extends @wordpress/scripts defaults and adds asyncWebAssembly support,
 * which is required by @mlc-ai/web-llm's WASM runtime.
 */

const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
	entry: {
		...defaultConfig.entry,
		// Compiles src/frontend.scss → build/frontend.css.
		// Referenced by the 'style' key in block.json and by wp_enqueue_block_style()
		// in aldus_register_block(). Loads only on pages that contain the block.
		frontend: './src/frontend.scss',
	},
	experiments: {
		...( defaultConfig.experiments ?? {} ),
		asyncWebAssembly: true,
	},
};
