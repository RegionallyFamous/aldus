/**
 * useAldusEngine — WebLLM engine lifecycle management.
 *
 * Owns the engine ref, abort controller, and download-progress state.
 * Exposes an `initEngine` function that lazily downloads and initialises the
 * SmolLM2 model on first call, then returns the cached engine on subsequent calls.
 *
 * Extracted from the monolithic Edit component so engine lifecycle can be
 * reasoned about independently and eventually tested with a mocked engine.
 *
 * @param {Object}   options
 * @param {Function} options.onDownloadStart    Called when download begins.
 * @param {Function} options.onDownloadProgress Called with { progress, text } during download.
 * @param {Function} options.onDownloadDone     Called when the engine is ready.
 * @param {Function} options.onModelDownloaded  Called once on first successful download (for prefs).
 * @return {{
 *   engineRef: React.MutableRefObject,
 *   abortRef: React.MutableRefObject,
 *   initEngine: Function,
 *   destroyEngine: Function,
 * }}
 */

import { useRef, useCallback } from '@wordpress/element';

const MODEL_ID = 'SmolLM2-360M-Instruct-q4f16_1-MLC';

export function useAldusEngine( {
	onDownloadStart,
	onDownloadProgress,
	onDownloadDone,
	onModelDownloaded,
} ) {
	const engineRef = useRef( null );
	const abortRef = useRef( null );
	// Tracks in-flight init attempts; prevents concurrent initialisation if
	// initEngine() is called again before the first promise resolves.
	const initGenRef = useRef( 0 );

	/**
	 * Initialises the WebLLM engine, downloading the model on first run.
	 *
	 * Returns the engine instance. If the engine is already initialised, the
	 * cached instance is returned immediately with no download or progress calls.
	 *
	 * @return {Promise<import('@mlc-ai/web-llm').MLCEngine>}
	 * @throws {Error} If the download is aborted or initialisation fails.
	 */
	const initEngine = useCallback( async () => {
		if ( engineRef.current ) {
			return engineRef.current;
		}

		// Prevent re-entrant calls — if an init is already in-flight, bail out.
		if ( initGenRef.current > 0 ) {
			return null;
		}
		initGenRef.current += 1;

		onDownloadStart?.();

		// Support the wp_register_script_module() path (WP 6.5+) where the
		// runtime URL is surfaced via window.__aldusScriptModules so the module
		// graph is managed by WordPress. Falls back to the webpack dynamic import.
		let CreateMLCEngine;
		const scriptModuleUrl =
			window.__aldusScriptModules?.[ '@aldus/webllm-runtime' ];
		if ( scriptModuleUrl ) {
			// Validate that the module URL is same-origin before dynamic import
			// to prevent loading arbitrary third-party scripts.
			const isSameOrigin = ( () => {
				try {
					const parsed = new URL(
						scriptModuleUrl,
						window.location.href
					);
					return parsed.origin === window.location.origin;
				} catch {
					return false;
				}
			} )();
			if ( ! isSameOrigin ) {
				throw new Error(
					'[Aldus] WebLLM module URL origin mismatch — refusing to import.'
				);
			}
			const mod = await import(
				/* webpackIgnore: true */ scriptModuleUrl
			);
			CreateMLCEngine = mod.CreateMLCEngine;
		} else {
			( { CreateMLCEngine } = await import( '@mlc-ai/web-llm' ) );
		}

		const dlController = new AbortController();
		abortRef.current = () => dlController.abort();

		try {
			engineRef.current = await CreateMLCEngine( MODEL_ID, {
				signal: dlController.signal,
				initProgressCallback: ( info ) => {
					onDownloadProgress?.( {
						progress: info.progress ?? 0,
						text: info.text ?? '',
					} );
				},
			} );
		} finally {
			abortRef.current = null;
			initGenRef.current = Math.max( 0, initGenRef.current - 1 );
		}

		onModelDownloaded?.();
		onDownloadDone?.();

		return engineRef.current;
	}, [
		onDownloadStart,
		onDownloadProgress,
		onDownloadDone,
		onModelDownloaded,
	] );

	/**
	 * Destroys the engine reference (does not unload from browser cache).
	 */
	const destroyEngine = useCallback( () => {
		engineRef.current = null;
	}, [] );

	return { engineRef, abortRef, initEngine, destroyEngine };
}
