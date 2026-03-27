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

/**
 * Promotes "export not found" webpack warnings to hard errors so that
 * `npm run build` fails immediately when a named import doesn't exist in its
 * source module (e.g. importing a non-existent icon from @wordpress/icons).
 * Without this, webpack only emits a warning and the import silently becomes
 * undefined at runtime, which can crash React components.
 */
/**
 * Removes 0-byte .js sidecar files that webpack emits for CSS-only entry points
 * (e.g. admin: './src/admin.css' and frontend: './src/frontend.scss').
 * Without this, the build directory accumulates empty admin.js / frontend.js
 * files that are never enqueued and only cause confusion.
 */
class FilterEmptyJsPlugin {
	apply( compiler ) {
		compiler.hooks.emit.tapAsync(
			'FilterEmptyJsPlugin',
			( compilation, cb ) => {
				for ( const key of Object.keys( compilation.assets ) ) {
					if (
						key.endsWith( '.js' ) &&
						compilation.assets[ key ].size() === 0
					) {
						delete compilation.assets[ key ];
					}
				}
				cb();
			}
		);
	}
}

class PromoteMissingExportsPlugin {
	apply( compiler ) {
		compiler.hooks.afterCompile.tap(
			'PromoteMissingExportsPlugin',
			( compilation ) => {
				const missing = compilation.warnings.filter(
					( w ) =>
						w.message && w.message.includes( 'was not found in' )
				);
				missing.forEach( ( w ) => {
					compilation.errors.push( w );
					const i = compilation.warnings.indexOf( w );
					if ( i !== -1 ) {
						compilation.warnings.splice( i, 1 );
					}
				} );
			}
		);
	}
}

module.exports = {
	...defaultConfig,
	// Native webpack support for treating missing named exports as hard errors.
	// Works alongside PromoteMissingExportsPlugin as belt-and-suspenders.
	module: {
		...( defaultConfig.module ?? {} ),
		strictExportPresence: true,
	},
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
			// Compiles src/admin.css → build/admin.css.
			// Enqueued only on the Aldus welcome page via admin_enqueue_scripts.
			admin: './src/admin.css',
		};
	},
	experiments: {
		...( defaultConfig.experiments ?? {} ),
		asyncWebAssembly: true,
	},
	plugins: [
		...( defaultConfig.plugins ?? [] ),
		new PromoteMissingExportsPlugin(),
		new FilterEmptyJsPlugin(),
	],
};
