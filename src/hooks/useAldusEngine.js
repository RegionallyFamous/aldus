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
 * @param {Function} [options.onDownloadStall]  Called once if download makes no progress for 30 s.
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
	onDownloadStall,
} ) {
	const engineRef = useRef( null );
	const abortRef = useRef( null );
	// Stores the in-flight init Promise so concurrent callers await the same
	// initialisation rather than receiving null or starting a second download.
	const initPromiseRef = useRef( null );

	/**
	 * Initialises the WebLLM engine, downloading the model on first run.
	 *
	 * Returns the engine instance. If the engine is already initialised, the
	 * cached instance is returned immediately. If initialisation is already
	 * in-flight, all concurrent callers await the same Promise.
	 *
	 * @return {Promise<import('@mlc-ai/web-llm').MLCEngine>}
	 * @throws {Error} If the download is aborted or initialisation fails.
	 */
	const initEngine = useCallback( async () => {
		// Verify the cached engine is still healthy before reusing it.
		// An engine that previously errored may be set to a non-null but
		// non-functional value; check for the presence of a known method.
		if ( engineRef.current ) {
			const engine = engineRef.current;
			if ( typeof engine.chat?.completions?.create === 'function' ) {
				return engine;
			}
			// Engine is corrupt — clear it and re-init.
			engineRef.current = null;
			initPromiseRef.current = null;
		}

		// Deduplicate concurrent calls: return the in-flight promise so every
		// caller awaits the same download rather than triggering a second one.
		if ( initPromiseRef.current ) {
			return initPromiseRef.current;
		}

		const doInit = async () => {
			onDownloadStart?.();

			// Support the wp_register_script_module() path (WP 6.5+) where the
			// runtime URL is surfaced via window.__aldusScriptModules so the
			// module graph is managed by WordPress. Falls back to webpack import.
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

			// Stall detection: if progress does not advance for 30 s, fire the
			// optional onDownloadStall callback so the UI can show a notice.
			let lastProgressValue = -1;
			let lastProgressTime = Date.now();
			let stallFired = false;

			const engineOptions = {
				signal: dlController.signal,
				initProgressCallback: ( info ) => {
					const now = Date.now();
					const pct = info.progress ?? 0;

					if ( pct > lastProgressValue ) {
						lastProgressValue = pct;
						lastProgressTime = now;
					} else if (
						! stallFired &&
						now - lastProgressTime > 30_000
					) {
						stallFired = true;
						onDownloadStall?.();
					}

					onDownloadProgress?.( {
						progress: pct,
						text: info.text ?? '',
					} );
				},
			};

			try {
				// First attempt.
				try {
					engineRef.current = await CreateMLCEngine(
						MODEL_ID,
						engineOptions
					);
				} catch ( firstErr ) {
					// On transient GPU device-lost events the browser reallocates the
					// GPU context within a second or two. Retry once after a short
					// pause; re-throw everything else immediately.
					const isTransient =
						firstErr?.message
							?.toLowerCase()
							.includes( 'device lost' ) ||
						firstErr?.message
							?.toLowerCase()
							.includes( 'gpudevice' );
					if ( ! isTransient ) {
						throw firstErr;
					}
					await new Promise( ( r ) => setTimeout( r, 2000 ) );
					engineRef.current = await CreateMLCEngine(
						MODEL_ID,
						engineOptions
					);
				}
			} finally {
				abortRef.current = null;
			}

			onModelDownloaded?.();
			onDownloadDone?.();

			return engineRef.current;
		};

		initPromiseRef.current = doInit().finally( () => {
			initPromiseRef.current = null;
		} );

		return initPromiseRef.current;
	}, [
		onDownloadStart,
		onDownloadProgress,
		onDownloadDone,
		onModelDownloaded,
		onDownloadStall,
	] );

	/**
	 * Disposes the WebLLM engine, releasing GPU/VRAM, then clears the ref.
	 * Safe to call when no engine has been initialised.
	 */
	const destroyEngine = useCallback( async () => {
		const engine = engineRef.current;
		engineRef.current = null;
		initPromiseRef.current = null;
		if ( engine ) {
			try {
				// WebLLM exposes unload() to release model weights from VRAM.
				// Use it if available; fall back to destroy() for older versions.
				if ( typeof engine.unload === 'function' ) {
					await engine.unload();
				} else if ( typeof engine.destroy === 'function' ) {
					await engine.destroy();
				}
			} catch {
				// Disposal errors are non-fatal — the ref is already cleared.
			}
		}
	}, [] );

	return { engineRef, abortRef, initEngine, destroyEngine };
}
