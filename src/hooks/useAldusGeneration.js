/**
 * useAldusGeneration — layout generation flow.
 *
 * Orchestrates the full generation pipeline:
 *   1. Lazy-initialise the WebLLM engine (delegated to useAldusEngine)
 *   2. Pre-generation: style direction, personality recommendation, content hints
 *   3. Run token inference in parallel for all active personalities
 *   4. Post-generation: coverage scoring, layout description, section labels
 *   5. POST each token sequence to /aldus/v1/assemble
 *   6. Return the assembled layouts array
 *
 * Extracted from the monolithic Edit component so the generation flow can be
 * reasoned about and eventually integration-tested with mocked API responses.
 *
 * @param {Object}   options
 * @param {Function} options.initEngine             From useAldusEngine.
 * @param {Function} options.destroyEngine          From useAldusEngine.
 * @param {Function} options.inferTokens            Pure function: engine × personality × manifest → tokens.
 * @param {Function} options.enforceAnchors         Pure function: personality × tokens → tokens.
 * @param {Function} options.inferStyleDirection    Intelligence: manifest → style string.
 * @param {Function} options.scoreCoverage          Intelligence: manifest × tokens → unused types.
 * @param {Function} options.inferLayoutDescription Intelligence: personality × tokens → description.
 * @param {Function} options.inferSectionLabel      Intelligence: engine × preview → section label.
 * @param {Function} options.recommendPersonalities Intelligence: manifest × personalities → top 3 names.
 * @param {Function} options.analyzeContentHints    Intelligence: manifest × items → hint strings.
 * @param {Array}    options.activePersonalities    Filtered personality objects.
 * @param {Function} options.onScreenChange         setScreen callback.
 * @param {Function} options.onLayoutsReady         Called with the assembled layouts array.
 * @param {Function} options.onProgress             Called with { done, total, lastLabel }.
 * @param {Function} options.onError                Called with an error code string.
 * @param {Function} options.onErrorDetail          Called with the raw Error for technical details panel.
 * @param {Function} options.onStyleDetected        Called with the inferred style string.
 * @param {Function} options.onRecommendationsReady Called with string[] of recommended names.
 * @param {Function} options.onHintsReady           Called with string[] of content hints.
 * @return {{ runGenerate: Function, isGenerating: boolean, incrementRerollCount: Function }}
 */

import { useState, useCallback, useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { speak } from '@wordpress/a11y';
import { dispatch as wpDispatch } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import { batchAssemble } from '../lib/batchAssemble.js';
import { isValidAssembleResponse } from '../lib/api-utils.js';
import { SCREEN } from '../constants.js';
import { computeCoverage } from '../data/tokens.js';

/**
 * Creates a server-side AI engine shim that delegates `chat.completions.create`
 * calls to the /aldus/v1/ai-generate REST endpoint.
 *
 * The shim implements the same interface as a WebLLM MLCEngine so that all
 * downstream intelligence functions (inferStyleDirection, inferTokens, etc.)
 * work without modification when WebGPU is unavailable.
 *
 * Only constructed when `window.__aldusCapabilities.serverAI` is true and
 * the local WebLLM engine fails to initialise.
 *
 * @return {Object} Engine shim with `chat.completions.create` method.
 */
function createServerEngineShim() {
	return {
		chat: {
			completions: {
				/**
				 * Proxies a chat completion request to the WP 7.0 AI Client.
				 *
				 * @param {Object} params          OpenAI-compatible request params.
				 * @param {Array}  params.messages Message array (uses last user message as prompt).
				 * @param {Object} [params.schema] Optional JSON schema for constrained output.
				 * @return {Promise<Object>} OpenAI-compatible completion response.
				 */
				async create( params ) {
					const lastUser = [ ...( params.messages ?? [] ) ]
						.reverse()
						.find( ( m ) => m.role === 'user' );
					const prompt = lastUser?.content ?? '';

					const response = await apiFetch( {
						path: '/aldus/v1/ai-generate',
						method: 'POST',
						data: {
							prompt,
							schema: params.response_format?.schema ?? null,
						},
					} );

					return response;
				},
			},
		},
	};
}

/**
 * Computes the Jaccard similarity between two token sequence arrays.
 *
 * Returns a value in [0, 1]: 1 means identical token sets, 0 means
 * completely disjoint. Used to detect when two personalities produce
 * layouts that are too visually similar.
 *
 * @param {string[]} a First token sequence.
 * @param {string[]} b Second token sequence.
 * @return {number} Similarity score.
 */
function jaccard( a, b ) {
	const setA = new Set( a );
	const setB = new Set( b );
	const intersection = [ ...setA ].filter( ( x ) => setB.has( x ) ).length;
	const union = new Set( [ ...setA, ...setB ] ).size;
	return union === 0 ? 0 : intersection / union;
}

export function useAldusGeneration( {
	initEngine,
	destroyEngine,
	inferTokens,
	enforceAnchors,
	inferStyleDirection,
	inferLayoutDescription,
	inferSectionLabel,
	recommendPersonalities,
	analyzeContentHints,
	activePersonalities,
	onScreenChange,
	onLayoutsReady,
	onProgress,
	onError,
	onErrorDetail,
	onStyleDetected,
	onRecommendationsReady,
	onHintsReady,
} ) {
	const [ isGenerating, setIsGenerating ] = useState( false );
	// Ref-based guard prevents re-entrant calls even when the state setter has
	// not yet flushed (avoids the race condition where two rapid calls both see
	// isGenerating === false before the first setIsGenerating(true) propagates).
	const isGeneratingRef = useRef( false );

	// Auto-retry: on first llm_parse_failed, silently retry with the same
	// params before surfacing the error to the UI.
	const autoRetryDoneRef = useRef( false );
	// Self-reference so the catch block can call runGenerate recursively
	// without circular-dependency issues in useCallback's dep array.
	const runGenerateRef = useRef( null );

	// Tracks how many times each personality has been re-rolled so the PHP
	// variant picker produces different results even when the token sequence is identical.
	const rerollCountsRef = useRef( {} );

	/**
	 * Runs the full generation pipeline.
	 *
	 * @param {Object}   params
	 * @param {Array}    params.items          Current content items.
	 * @param {string}   params.styleNote      Optional free-text style direction.
	 * @param {Object}   [params.postContext]  Post title/excerpt for prompt enrichment.
	 * @param {string[]} params.enabledLabels  Personality names enabled in sidebar.
	 * @param {string}   [params.pinned]       Personality to always include first.
	 * @param {boolean}  [params.useBindings]  Whether to bind blocks to post meta.
	 * @param {Object}   [params.customStyles] Custom block style slugs keyed by block type.
	 * @param {number}   [params.postId]       Current post ID for cover featured-image fallback.
	 */
	const runGenerate = useCallback(
		async ( {
			items,
			styleNote,
			postContext,
			enabledLabels,
			pinned,
			useBindings = false,
			customStyles = {},
			postId = 0,
		} ) => {
			if ( isGeneratingRef.current ) {
				return;
			}
			isGeneratingRef.current = true;
			setIsGenerating( true );
			let retrying = false;

			// Build the content manifest (type → count).
			const manifest = {};
			for ( const item of items ) {
				if ( item.type ) {
					manifest[ item.type ] = ( manifest[ item.type ] ?? 0 ) + 1;
				}
			}

			// Filter personalities to the enabled set, always placing pinned first.
			let personalities = activePersonalities.filter( ( p ) =>
				enabledLabels.includes( p.name )
			);
			if ( pinned ) {
				const pinnedP = personalities.find(
					( p ) => p.name === pinned
				);
				if ( pinnedP ) {
					personalities = [
						pinnedP,
						...personalities.filter( ( p ) => p.name !== pinned ),
					];
				}
			}

			// Tracks whether the engine was successfully initialised before any error.
			// Kept outside the try so it is accessible in the catch block.
			let engineWasReady = false;

			try {
				// Step 1: initialise the engine — local WebLLM first, server AI fallback.
				let engine;
				try {
					engine = await initEngine();
				} catch ( initError ) {
					// WebLLM failed (no WebGPU, download error, etc.).
					// Fall back to the WP 7.0 server-side AI if available.
					if ( window.__aldusCapabilities?.serverAI ) {
						engine = createServerEngineShim();
					} else {
						throw initError;
					}
				}
				engineWasReady = true;
				onScreenChange( SCREEN.LOADING );

				// Step 2: pre-generation intelligence.
				// Phase 2a — style + tone (single call, tone feeds recommendation).
				// Non-critical: failure produces safe empty defaults.
				const styleResult = await Promise.allSettled( [
					inferStyleDirection( engine, manifest, items ),
				] );
				const autoStyle =
					styleResult[ 0 ].status === 'fulfilled'
						? styleResult[ 0 ].value?.style ?? ''
						: '';
				const autoTone =
					styleResult[ 0 ].status === 'fulfilled'
						? styleResult[ 0 ].value?.tone ?? ''
						: '';
				onStyleDetected( autoStyle );

				// Phase 2b — recommendation (uses tone) + hints in parallel.
				const [ recommendResult, hintsResult ] =
					await Promise.allSettled( [
						recommendPersonalities(
							engine,
							manifest,
							personalities,
							autoTone
						),
						analyzeContentHints( engine, manifest, items ),
					] );

				onRecommendationsReady(
					recommendResult.status === 'fulfilled'
						? recommendResult.value?.recommended ?? []
						: []
				);
				onHintsReady(
					hintsResult.status === 'fulfilled'
						? hintsResult.value?.hints ?? []
						: []
				);

				// Prepend auto-detected style to any user-supplied style note.
				const effectiveStyle = [ autoStyle, styleNote ]
					.filter( Boolean )
					.join( ', ' );

				// Step 3: run token inference in parallel, passing previous
				// personality sequences as diversity hints.
				const tokenSettled = await Promise.allSettled(
					personalities.map( ( p, idx ) => {
						const previousSequences = personalities
							.slice( 0, idx )
							.map(
								( prev ) =>
									( prev.exampleSequences ?? [
										prev.anchors,
									] )[ 0 ]
							);
						return inferTokens(
							engine,
							p,
							manifest,
							effectiveStyle,
							postContext,
							items,
							previousSequences
						);
					} )
				);

				const tokenResults = tokenSettled.map( ( result, i ) => {
					if ( result.status === 'fulfilled' ) {
						return result.value;
					}
					// Inference failed — fall back to the personality's first example
					// sequence so the user still gets a meaningful layout.
					const p = personalities[ i ];
					const fallback =
						p.exampleSequences?.[ 0 ] ?? p.anchors ?? [];
					return enforceAnchors( p, fallback );
				} );

				// Step 3b: diversity pass — re-run sequences that are too similar.
				// Pairwise Jaccard similarity > 0.8 indicates the two personalities
				// produced nearly identical token sets. Re-running the later sequence
				// at an elevated temperature gives it more chance to diverge.
				const diversified = [ ...tokenResults ];
				for ( let i = 0; i < diversified.length; i++ ) {
					for ( let j = i + 1; j < diversified.length; j++ ) {
						if (
							jaccard( diversified[ i ], diversified[ j ] ) > 0.8
						) {
							const p = personalities[ j ];
							try {
								// eslint-disable-next-line no-await-in-loop
								diversified[ j ] = await inferTokens(
									engine,
									p,
									manifest,
									effectiveStyle,
									postContext,
									items,
									diversified.slice( 0, j ),
									1.2
								);
							} catch {
								// Re-run failed — keep the existing sequence.
							}
						}
					}
				}
				const finalTokenResults = diversified;

				// Step 4: post-generation intelligence — coverage, descriptions, and
				// the columns:28-72 section label (Folio's narrow label column).
				// All run in parallel; results are indexed by personality.
				// Coverage is computed deterministically — no LLM call needed.
				const coverageResults = finalTokenResults.map( ( tokens ) =>
					computeCoverage( manifest, tokens )
				);

				const [ descriptionSettled, labelSettled ] = await Promise.all(
					[
						Promise.allSettled(
							finalTokenResults.map( ( tokens, i ) =>
								inferLayoutDescription(
									engine,
									personalities[ i ],
									tokens
								)
							)
						),
						// Section label only fired when columns:28-72 is present and
						// a paragraph exists; resolves immediately with '' otherwise.
						Promise.allSettled(
							finalTokenResults.map( ( tokens ) => {
								if (
									! tokens.includes( 'columns:28-72' ) ||
									! inferSectionLabel
								) {
									return Promise.resolve( { label: '' } );
								}
								const firstPara = items.find(
									( it ) => it.type === 'paragraph'
								);
								if ( ! firstPara ) {
									return Promise.resolve( { label: '' } );
								}
								const preview = ( firstPara.content ?? '' )
									.trim()
									.split( /\s+/ )
									.slice( 0, 10 )
									.join( ' ' );
								return inferSectionLabel( engine, preview );
							} )
						),
					]
				);

				// Step 5: assemble block markup for each token sequence.
				onProgress( {
					done: 0,
					total: personalities.length,
					lastLabel: null,
				} );

				const assembleJobs = finalTokenResults.map( ( tokens, i ) => {
					const label = personalities[ i ].name;
					const rerollCount = rerollCountsRef.current[ label ] ?? 0;
					return {
						label,
						data: {
							items,
							personality: label,
							tokens,
							reroll_count: rerollCount,
							use_bindings: useBindings,
							custom_styles: customStyles,
							post_id: postId || 0,
							section_label:
								labelSettled[ i ]?.status === 'fulfilled'
									? labelSettled[ i ].value?.label ?? ''
									: '',
						},
					};
				} );

				const assembleResponses = await batchAssemble(
					assembleJobs,
					( done, total, lastLabel ) =>
						onProgress( { done, total, lastLabel } )
				);

				const assembled = assembleResponses
					.filter( isValidAssembleResponse )
					.map( ( r ) => {
						const personalityIdx = personalities.findIndex(
							( p ) => p.name === r.label
						);
						return {
							label: r.label,
							blocks: r.blocks,
							tokens: r.tokens ?? [],
							sections: r.sections ?? [],
							unusedTypes:
								personalityIdx >= 0
									? coverageResults[ personalityIdx ]
											?.unused ?? []
									: [],
							description:
								personalityIdx >= 0 &&
								descriptionSettled[ personalityIdx ]?.status ===
									'fulfilled'
									? descriptionSettled[ personalityIdx ].value
											?.description ?? ''
									: '',
						};
					} );

				if ( assembled.length === 0 ) {
					onError( 'no_layouts' );
					speak(
						__(
							'No layouts generated. Try adding more content.',
							'aldus'
						),
						'assertive'
					);
					return;
				}

				onLayoutsReady( assembled );
				onScreenChange( SCREEN.RESULTS );
				speak(
					sprintf(
						/* translators: %d: number of generated layouts */
						__( '%d layouts ready.', 'aldus' ),
						assembled.length
					),
					'assertive'
				);

				wpDispatch( 'core/notices' ).removeNotice(
					'aldus-connection-error'
				);
			} catch ( err ) {
				// Only destroy the engine if it never finished initialising.
				// If it was already running when the error occurred (inference or
				// assemble failure) it is still in a good state and can be reused.
				if ( ! engineWasReady ) {
					destroyEngine();
				}

				let code = 'llm_parse_failed';
				if (
					err?.message?.toLowerCase().includes( 'out of memory' ) ||
					err?.message?.toLowerCase().includes( 'oom' )
				) {
					code = 'out_of_memory';
				} else if (
					err?.message?.toLowerCase().includes( 'device lost' ) ||
					err?.message?.toLowerCase().includes( 'gpudevice' )
				) {
					code = 'gpu_device_lost';
				} else if (
					// eslint-disable-next-line no-undef
					err instanceof CompileError ||
					err?.message?.toLowerCase().includes( 'webassembly' )
				) {
					code = 'wasm_compile_failed';
				} else if ( err?.data?.status === 429 ) {
					code = 'rate_limited';
				} else if (
					err?.data?.status === 503 ||
					err?.code === 'fetch_error'
				) {
					code = 'connection_failed';
				} else if ( err?.data?.status === 504 ) {
					code = 'timeout';
				} else if (
					err?.data?.status >= 400 &&
					err?.data?.status < 600
				) {
					code = 'api_error';
				}

				// Auto-retry once on llm_parse_failed — the model occasionally emits
				// malformed JSON on the first attempt; a silent retry usually succeeds.
				// The autoRetryDoneRef guard prevents infinite retry loops.
				if (
					code === 'llm_parse_failed' &&
					! autoRetryDoneRef.current
				) {
					autoRetryDoneRef.current = true;
					retrying = true;
					isGeneratingRef.current = false; // allow re-entry for the retry
					runGenerateRef.current?.( {
						items,
						styleNote,
						postContext,
						enabledLabels,
						pinned,
						useBindings,
						customStyles,
						postId,
					} );
					return;
				}

				onErrorDetail?.( err );
				onError( code );
				speak(
					__( 'Layout generation failed.', 'aldus' ),
					'assertive'
				);

				if ( code === 'connection_failed' ) {
					wpDispatch( 'core/notices' ).createErrorNotice(
						__(
							'Aldus: could not reach the server. Check your connection and try again.',
							'aldus'
						),
						{
							id: 'aldus-connection-error',
							isDismissible: true,
						}
					);
				}
			} finally {
				// Skip cleanup when we are about to self-retry — the retry call
				// manages its own isGenerating lifecycle.
				if ( ! retrying ) {
					isGeneratingRef.current = false;
					setIsGenerating( false );
				}
			}
		},
		[
			initEngine,
			destroyEngine,
			inferTokens,
			enforceAnchors,
			inferStyleDirection,
			inferLayoutDescription,
			inferSectionLabel,
			recommendPersonalities,
			analyzeContentHints,
			activePersonalities,
			onScreenChange,
			onLayoutsReady,
			onProgress,
			onError,
			onErrorDetail,
			onStyleDetected,
			onRecommendationsReady,
			onHintsReady,
		]
	);

	// Keep self-reference current so the auto-retry branch can call runGenerate
	// without circular deps in the useCallback dep array.
	runGenerateRef.current = runGenerate;

	/**
	 * Increments the re-roll counter for a personality so repeated re-rolls
	 * with the same token sequence produce different block variant picks.
	 *
	 * @param {string} label Personality name.
	 * @return {number} The new count after incrementing.
	 */
	const incrementRerollCount = useCallback( ( label ) => {
		rerollCountsRef.current[ label ] =
			( rerollCountsRef.current[ label ] ?? 0 ) + 1;
		return rerollCountsRef.current[ label ];
	}, [] );

	/**
	 * Resets the auto-retry guard. Call before each user-triggered generation
	 * so the one-retry allowance is restored.
	 */
	const resetRetry = useCallback( () => {
		autoRetryDoneRef.current = false;
	}, [] );

	return { runGenerate, isGenerating, incrementRerollCount, resetRetry };
}
