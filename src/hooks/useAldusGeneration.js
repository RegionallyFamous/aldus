/**
 * useAldusGeneration — layout generation flow.
 *
 * Orchestrates the full generation pipeline:
 *   1. Lazy-initialise the WebLLM engine (delegated to useAldusEngine)
 *   2. Run token inference in parallel for all active personalities
 *   3. POST each token sequence to /aldus/v1/assemble
 *   4. Return the assembled layouts array
 *
 * Extracted from the monolithic Edit component so the generation flow can be
 * reasoned about and eventually integration-tested with mocked API responses.
 *
 * @param {Object}   options
 * @param {Function} options.initEngine          From useAldusEngine.
 * @param {Function} options.destroyEngine       From useAldusEngine.
 * @param {Function} options.inferTokens         Pure function: engine × personality × manifest → tokens.
 * @param {Function} options.enforceAnchors      Pure function: personality × tokens → tokens.
 * @param {Array}    options.activePersonalities Filtered personality objects.
 * @param {Function} options.onScreenChange      setScreen callback.
 * @param {Function} options.onLayoutsReady      Called with the assembled layouts array.
 * @param {Function} options.onProgress          Called with { done, total, lastLabel }.
 * @param {Function} options.onError             Called with an error code string.
 * @param {Function} options.speak               @wordpress/a11y speak().
 * @return {{ runGenerate: Function, isGenerating: boolean }}
 */

import { useState, useCallback, useRef } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { __, sprintf } from '@wordpress/i18n';
import { speak } from '@wordpress/a11y';
import { dispatch as wpDispatch } from '@wordpress/data';

export function useAldusGeneration( {
	initEngine,
	destroyEngine,
	inferTokens,
	enforceAnchors,
	activePersonalities,
	onScreenChange,
	onLayoutsReady,
	onProgress,
	onError,
} ) {
	const [ isGenerating, setIsGenerating ] = useState( false );
	// Ref-based guard prevents re-entrant calls even when the state setter has
	// not yet flushed (avoids the race condition where two rapid calls both see
	// isGenerating === false before the first setIsGenerating(true) propagates).
	const isGeneratingRef = useRef( false );

	// Tracks how many times each personality has been re-rolled so the PHP
	// variant picker produces different results even when the token sequence is identical.
	const rerollCountsRef = useRef( {} );

	/**
	 * Runs the full generation pipeline.
	 *
	 * @param {Object}   params
	 * @param {Array}    params.items         Current content items.
	 * @param {string}   params.styleNote     Optional free-text style direction.
	 * @param {Object}   [params.postContext] Post title/excerpt for prompt enrichment.
	 * @param {string[]} params.enabledLabels Personality names enabled in sidebar.
	 * @param {string}   [params.pinned]      Personality to always include first.
	 */
	const runGenerate = useCallback(
		async ( { items, styleNote, postContext, enabledLabels, pinned } ) => {
			if ( isGeneratingRef.current ) {
				return;
			}
			isGeneratingRef.current = true;
			setIsGenerating( true );

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

			try {
				// Step 1: initialise/download the engine.
				const engine = await initEngine();
				onScreenChange( 'loading' );

				// Step 2: run token inference in parallel, passing previous personality
				// sequences as diversity hints.
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
							styleNote,
							postContext,
							items,
							previousSequences
						);
					} )
				);

				const tokenResults = tokenSettled.map( ( result, i ) =>
					result.status === 'fulfilled'
						? result.value
						: enforceAnchors( personalities[ i ], [] )
				);

				// Step 3: assemble block markup for each token sequence.
				onProgress( {
					done: 0,
					total: personalities.length,
					lastLabel: null,
				} );

				const assembleSettled = await Promise.allSettled(
					tokenResults.map( async ( tokens, i ) => {
						const label = personalities[ i ].name;
						const rerollCount =
							rerollCountsRef.current[ label ] ?? 0;
						try {
							return await apiFetch( {
								path: '/aldus/v1/assemble',
								method: 'POST',
								data: {
									items,
									personality: label,
									tokens,
									reroll_count: rerollCount,
								},
							} );
						} finally {
							onProgress( ( p ) => ( {
								...p,
								done: p.done + 1,
								lastLabel: label,
							} ) );
						}
					} )
				);

				const assembled = assembleSettled
					.filter(
						( r ) =>
							r.status === 'fulfilled' &&
							r.value?.success &&
							r.value?.blocks
					)
					.map( ( r ) => ( {
						label: r.value.label,
						blocks: r.value.blocks,
						tokens: r.value.tokens ?? [],
						sections: r.value.sections ?? [],
					} ) );

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
				onScreenChange( 'results' );
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
				destroyEngine();

				let code = 'llm_parse_failed';
				if (
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
				isGeneratingRef.current = false;
				setIsGenerating( false );
			}
		},
		[
			initEngine,
			destroyEngine,
			inferTokens,
			enforceAnchors,
			activePersonalities,
			onScreenChange,
			onLayoutsReady,
			onProgress,
			onError,
		]
	);

	/**
	 * Increments the re-roll counter for a personality so repeated re-rolls
	 * with the same token sequence produce different block variant picks.
	 *
	 * @param {string} label Personality name.
	 */
	const incrementRerollCount = useCallback( ( label ) => {
		rerollCountsRef.current[ label ] =
			( rerollCountsRef.current[ label ] ?? 0 ) + 1;
	}, [] );

	return { runGenerate, isGenerating, incrementRerollCount };
}
