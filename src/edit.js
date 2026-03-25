/**
 * Aldus — Block Compositor
 * edit.js — block editor UI with in-browser WebLLM inference.
 *
 * Flow:
 *   1. User builds content items (popover inserter).
 *   2. "Make it happen" → initialize WebLLM engine (download once, cached).
 *   3. Run parallel inferences (one per active personality).
 *   4. Call PHP /aldus/v1/assemble for each sequence → block markup.
 *   5. Show layout cards with hover-overlay selection. User picks one.
 */

import { useState, useEffect, useRef, useCallback } from '@wordpress/element';
import {
	inferStyleDirection,
	scoreCoverage,
	inferLayoutDescription,
	recommendPersonalities,
	analyzeContentHints,
	inferSectionLabel,
} from './lib/intelligence.js';
import { robustParse } from './lib/robustParse.js';
import { batchAssemble } from './lib/batchAssemble.js';
import { isValidAssembleResponse } from './lib/api-utils.js';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	BlockControls,
	useSettings,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	Button,
	CheckboxControl,
	ConfirmDialog,
	Modal,
	Notice,
	ToggleControl,
	Spinner,
	PanelBody,
	ToolbarGroup,
	ToolbarButton,
} from '@wordpress/components';
import {
	useDispatch,
	useSelect,
	dispatch as wpDispatch,
} from '@wordpress/data';
import { useEntityProp } from '@wordpress/core-data';
import { doAction } from '@wordpress/hooks';
import apiFetch from '@wordpress/api-fetch';
import { parse as parseBlocks } from '@wordpress/blocks';
import { __, sprintf, _n } from '@wordpress/i18n';
import { speak } from '@wordpress/a11y';
import {
	useShortcut,
	store as keyboardShortcutsStore,
} from '@wordpress/keyboard-shortcuts';
import { store as preferencesStore } from '@wordpress/preferences';
import {
	close,
	undo,
	help,
	replace as refreshIcon,
	unlock as unlockIcon,
} from '@wordpress/icons';
import {
	PACK_META,
	packToItems,
	loadPackContent,
} from './sample-data/index.js';
import { safeIcon } from './utils/safeIcon';
import { useAldusEngine } from './hooks/useAldusEngine.js';
import { useAldusGeneration } from './hooks/useAldusGeneration.js';
import { useAldusItems } from './hooks/useAldusItems.js';
import { DownloadingScreen } from './screens/DownloadingScreen.js';
import { LoadingScreen } from './screens/LoadingScreen.js';
import { ErrorScreen } from './screens/ErrorScreen.js';
import { MixingScreen } from './screens/MixScreen.js';
import { VALID_TOKENS_SET } from './data/tokens.js';
import { ACTIVE_PERSONALITIES } from './data/personalities.js';
import { PRESETS } from './data/presets.js';
import { LAYOUT_TAGLINES, LOADING_MESSAGES } from './data/ui-strings.js';
import { buildPersonalityPrompt, enforceAnchors } from './lib/prompts.js';
import { ResultsScreen } from './components/ResultsScreen.js';
import { BuildingScreen } from './components/BuildScreen.js';

import './editor.scss';

// ---------------------------------------------------------------------------
// Strings
// ---------------------------------------------------------------------------

// ERROR_MESSAGES moved to src/screens/ErrorScreen.js

// TOKEN_HUMAN_LABELS and tokenHumanLabel moved to src/screens/MixScreen.js

// ---------------------------------------------------------------------------
// WebLLM helpers
// ---------------------------------------------------------------------------

const hasWebGPU = () =>
	typeof navigator !== 'undefined' &&
	typeof navigator.gpu !== 'undefined' &&
	navigator.gpu !== null;

async function inferTokens(
	engine,
	personality,
	manifest,
	styleNote = '',
	postContext = null,
	items = [],
	previousSequences = []
) {
	const prompt = buildPersonalityPrompt(
		personality,
		manifest,
		styleNote,
		postContext,
		items,
		previousSequences
	);

	// Strict personalities (creativity: 0) benefit from lower temperature — they
	// have fixed anchor positions and should follow examples closely. Loose
	// personalities (creativity: 1) get higher temperature for more surprise.
	const temperature = personality.creativity === 1 ? 0.95 : 0.6;

	const completion = await engine.chat.completions.create( {
		messages: [ { role: 'user', content: prompt } ],
		temperature,
		max_tokens: 256,
		stream: false,
	} );

	const raw = completion.choices[ 0 ]?.message?.content ?? '{}';

	const parsed = robustParse( raw );
	if ( window?.aldusDebug && Object.keys( parsed ).length === 0 ) {
		// eslint-disable-next-line no-console
		console.debug( '[Aldus] token parse produced empty result. Raw:', raw );
	}

	const rawTokens = Array.isArray( parsed?.tokens ) ? parsed.tokens : [];

	// Trim whitespace and normalise case before filtering so the model
	// emitting " headline " or "Headline" still matches the token set.
	const clean = rawTokens
		.filter( ( t ) => typeof t === 'string' )
		.map( ( t ) => t.trim().toLowerCase() )
		.filter( ( t ) => VALID_TOKENS_SET.has( t ) );

	// If the LLM produced no usable tokens, fall back to the personality's
	// first example sequence so the user always gets a fully-styled layout
	// rather than bare anchor-only markup.
	if ( clean.length === 0 ) {
		const fallback =
			personality.exampleSequences?.[ 0 ] ?? personality.anchors ?? [];
		return enforceAnchors( personality, fallback );
	}

	return enforceAnchors( personality, clean );
}

// ---------------------------------------------------------------------------
// Edit component
// ---------------------------------------------------------------------------

// JS build version — must match ALDUS_VERSION in aldus.php.
// Set by the release script; used only for the mismatch warning below.
const ALDUS_JS_VERSION = '1.12.0';

export default function Edit( { clientId, attributes, setAttributes } ) {
	const blockProps = useBlockProps( {
		className: 'wp-block-aldus-layout-generator',
		style: {
			display: 'block',
		},
	} );

	const {
		enabledPersonalities,
		savedItems,
		styleNote,
		useMeta,
		wrapperMode,
	} = attributes;

	// Warn once if the PHP plugin version and the JS build version are out of
	// sync — this usually means the browser is serving a stale cached bundle
	// after a plugin update. Console-only; no UI disruption.
	useEffect( () => {
		const phpVer = window.__aldusPhpVersion;
		if ( phpVer && phpVer !== ALDUS_JS_VERSION ) {
			// eslint-disable-next-line no-console
			console.warn(
				`[Aldus] Version mismatch: PHP=${ phpVer }, JS=${ ALDUS_JS_VERSION }. ` +
					'Try clearing your browser cache (Ctrl+Shift+R / Cmd+Shift+R).'
			);
		}
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	// State machine: 'building' | 'downloading' | 'loading' | 'results' | 'confirming' | 'mixing' | 'inserted' | 'error' | 'no-gpu'
	const [ screen, setScreen ] = useState( 'building' );
	const [ layouts, setLayouts ] = useState( [] );
	const [ errorCode, setErrorCode ] = useState( '' );
	const [ errorDetail, setErrorDetail ] = useState( null ); // raw error for technical details
	const [ retryCount, setRetryCount ] = useState( 0 );
	const [ msgIndex, setMsgIndex ] = useState( 0 );
	const [ msgVisible, setMsgVisible ] = useState( true );
	const [ dlProgress, setDlProgress ] = useState( { progress: 0, text: '' } );
	const [ dlStalled, setDlStalled ] = useState( false );
	const [ buildingMode, setBuildingMode ] = useState( 'content' ); // 'content' | 'preview'
	const [ isPreview, setIsPreview ] = useState( false );
	const [ activePreviewPack, setActivePreviewPack ] = useState( null );
	const [ rerollingLabel, setRerollingLabel ] = useState( null );
	const [ rerollErrors, setRerollErrors ] = useState( {} ); // label → true while error pill visible
	const [ genProgress, setGenProgress ] = useState( { done: 0, total: 0 } );
	const [ confirmAction, setConfirmAction ] = useState( null ); // null | 'startOver' | 'regenerate'
	const [ showHelp, setShowHelp ] = useState( false );
	const [ showPersonalityWarning, setShowPersonalityWarning ] =
		useState( false );
	// When the user clicks "Try with my content" from a pack preview card, we
	// pin that personality so generation leads with it.
	const [ pinnedPersonality, setPinnedPersonality ] = useState( null );

	// Intelligence signals — set during generation, cleared on start-over.
	// autoStyle: string inferred from content manifest (e.g. "text-heavy editorial").
	// recommendedPersonalities: string[] of top-3 personality names for this content.
	// contentHints: string[] of actionable suggestions shown as dismissible pills.
	const [ autoStyle, setAutoStyle ] = useState( '' );
	const [ recommendedPersonalities, setRecommendedPersonalities ] = useState(
		[]
	);
	const [ contentHints, setContentHints ] = useState( [] );

	// Onboarding: show three sequential tooltips for first-time users.
	// null = already onboarded; 0/1/2 = active step index.
	const [ onboardingStep, setOnboardingStep ] = useState( () =>
		typeof window !== 'undefined' &&
		window.localStorage.getItem( 'aldus_onboarded' )
			? null
			: 0
	);
	const advanceOnboarding = useCallback( () => {
		setOnboardingStep( ( step ) => {
			if ( step === null ) {
				return null;
			}
			if ( step >= 2 ) {
				window.localStorage.setItem( 'aldus_onboarded', '1' );
				return null;
			}
			return step + 1;
		} );
	}, [] );

	const lastFocusRef = useRef( null );
	const lastPackRef = useRef( null ); // stores last pack used for preview re-roll
	// Always-current refs so the confirming useEffect reads the latest values even
	// when it runs inside a stale closure (deps = [screen]).
	const useMetaRef = useRef( useMeta );
	const wrapperModeRef = useRef( wrapperMode );
	useEffect( () => {
		useMetaRef.current = useMeta;
	} );
	useEffect( () => {
		wrapperModeRef.current = wrapperMode;
	} );
	const personalityWarningTimerRef = useRef( null );
	const rerollErrorTimersRef = useRef( {} ); // label → timer id, so stale timers are cleared
	const {
		replaceBlocks,
		replaceInnerBlocks,
		selectBlock,
		setBlockEditingMode,
	} = useDispatch( blockEditorStore );
	const { registerShortcut } = useDispatch( keyboardShortcutsStore );

	// Read live theme colors from the editor settings store — no PHP round-trip needed.
	const [ themeColorPalette ] = useSettings( 'color.palette' );
	const themeColors = Array.isArray( themeColorPalette )
		? themeColorPalette
		: [];

	// Detect custom block styles registered in the editor for key block types.
	// These are passed to the PHP assembler so it can apply native theme styles
	// (e.g. is-style-plain on pullquotes) instead of Aldus defaults.
	const customBlockStyles = useSelect( ( select ) => {
		const fn = select( 'core/blocks' ).getBlockStyles;
		if ( ! fn ) {
			return {};
		}
		return {
			pullquote: ( fn( 'core/pullquote' ) ?? [] ).map( ( s ) => s.name ),
			image: ( fn( 'core/image' ) ?? [] ).map( ( s ) => s.name ),
			button: ( fn( 'core/button' ) ?? [] ).map( ( s ) => s.name ),
		};
	}, [] );

	// Remember across page loads whether the model has ever been downloaded.
	const hasDownloadedModel = useSelect(
		( select ) =>
			select( preferencesStore ).get( 'aldus', 'hasDownloadedModel' ) ??
			false,
		[]
	);

	const { set: setPref } = useDispatch( preferencesStore );
	const markAldusUsed = useCallback( () => {
		setPref( 'aldus', 'hasUsedAldus', true );
	}, [ setPref ] );

	// Read post context for LLM prompt enrichment, personality auto-sort, and cover fallback.
	const { postTitle, postType, postId } = useSelect( ( select ) => {
		const editor = select( 'core/editor' );
		return {
			postTitle: editor?.getEditedPostAttribute( 'title' ) ?? '',
			postType: editor?.getCurrentPostType() ?? 'post',
			postId: editor?.getEditedPostAttribute( 'id' ) ?? null,
		};
	}, [] );

	// Entity prop hook for writing _aldus_items to post meta when useMeta is on.
	// The setter is only called on layout accept; reading the meta is not needed here.
	const [ , setMeta ] = useEntityProp( 'postType', postType, 'meta' );

	// Read existing editor blocks for the "Import from this page" feature.
	const editorBlocks = useSelect(
		( select ) => select( 'core/block-editor' ).getBlocks(),
		[]
	);

	// Register keyboard shortcuts into the WP shortcuts registry (shows in Shift+Alt+H dialog).
	useEffect( () => {
		registerShortcut( {
			name: 'aldus/generate',
			category: 'block',
			description: __( 'Generate layouts', 'aldus' ),
			keyCombination: { modifier: 'primary', character: 'Enter' },
		} );
		registerShortcut( {
			name: 'aldus/cancel',
			category: 'block',
			description: __( 'Cancel / go back to building', 'aldus' ),
			keyCombination: { character: 'Escape' },
		} );
		registerShortcut( {
			name: 'aldus/regen',
			category: 'block',
			description: __( 'Regenerate layouts', 'aldus' ),
			keyCombination: { modifier: 'primaryShift', character: 'r' },
		} );
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	const noWebGPU = ! hasWebGPU();

	// ---------------------------------------------------------------------------
	// Hook: items CRUD, attribute persistence, undo/redo sync
	// ---------------------------------------------------------------------------

	const {
		items,
		itemsRef,
		setItems,
		addItem,
		updateItem,
		removeItem,
		reorderItems,
		moveItem,
		loadPreset: loadPresetItems,
	} = useAldusItems( {
		savedItems,
		setAttributes,
		markAldusUsed,
		lastFocusRef,
	} );

	// Wrap the hook's loadPreset to also transition back to the building screen.
	const loadPreset = useCallback(
		( preset ) => {
			loadPresetItems( preset );
			setScreen( 'building' );
		},
		[ loadPresetItems ]
	);

	// ---------------------------------------------------------------------------
	// Hook: WebLLM engine lifecycle
	// ---------------------------------------------------------------------------

	const onDownloadStart = useCallback( () => {
		setScreen( 'downloading' );
		setDlProgress( { progress: 0, text: '' } );
		setDlStalled( false );
	}, [] );

	const onDownloadProgress = useCallback(
		( { progress, text } ) => setDlProgress( { progress, text } ),
		[]
	);

	const onModelDownloaded = useCallback( () => {
		wpDispatch( preferencesStore ).set(
			'aldus',
			'hasDownloadedModel',
			true
		);
	}, [] );

	const onDownloadStall = useCallback( () => setDlStalled( true ), [] );

	const { engineRef, abortRef, initEngine, destroyEngine } = useAldusEngine( {
		onDownloadStart,
		onDownloadProgress,
		onModelDownloaded,
		onDownloadStall,
	} );

	// ---------------------------------------------------------------------------
	// Hook: generation pipeline
	// ---------------------------------------------------------------------------

	const onLayoutsReady = useCallback(
		( assembled ) => setLayouts( assembled ),
		[]
	);
	const onGenProgress = useCallback(
		( { done, total, lastLabel } ) =>
			setGenProgress( { done, total, lastLabel } ),
		[]
	);
	const onStyleDetected = useCallback(
		( style ) => setAutoStyle( style ),
		[]
	);
	const onRecommendationsReady = useCallback(
		( recs ) => setRecommendedPersonalities( recs ),
		[]
	);
	const onHintsReady = useCallback(
		( hints ) => setContentHints( hints ),
		[]
	);
	const onErrorDetail = useCallback( ( err ) => setErrorDetail( err ), [] );
	const onGenerationError = useCallback( ( code ) => {
		setErrorCode( code );
		setRetryCount( ( c ) => c + 1 );
		setScreen( 'error' );
	}, [] );

	const { runGenerate, isGenerating, incrementRerollCount, resetRetry } =
		useAldusGeneration( {
			initEngine,
			destroyEngine,
			inferTokens,
			enforceAnchors,
			inferStyleDirection,
			scoreCoverage,
			inferLayoutDescription,
			inferSectionLabel,
			recommendPersonalities,
			analyzeContentHints,
			activePersonalities: ACTIVE_PERSONALITIES,
			onScreenChange: setScreen,
			onLayoutsReady,
			onProgress: onGenProgress,
			onError: onGenerationError,
			onErrorDetail,
			onStyleDetected,
			onRecommendationsReady,
			onHintsReady,
		} );

	const setStyleNote = useCallback(
		( val ) => setAttributes( { styleNote: val } ),
		[ setAttributes ]
	);

	// Clear transient UI timers on unmount.
	useEffect( () => {
		const rerollTimers = rerollErrorTimersRef;
		const personalityTimer = personalityWarningTimerRef;
		return () => {
			if ( personalityTimer.current ) {
				clearTimeout( personalityTimer.current );
			}
			Object.values( rerollTimers.current ).forEach( clearTimeout );
		};
	}, [] );

	// Cycle loading messages with fade transition
	useEffect( () => {
		if ( screen !== 'loading' ) {
			return;
		}
		let innerTimerId = null;
		const id = setInterval( () => {
			setMsgVisible( false );
			innerTimerId = setTimeout( () => {
				setMsgIndex( ( i ) => ( i + 1 ) % LOADING_MESSAGES.length );
				setMsgVisible( true );
			}, 300 );
		}, 2200 );
		return () => {
			clearInterval( id );
			if ( innerTimerId !== null ) {
				clearTimeout( innerTimerId );
			}
		};
	}, [ screen ] );

	// Apply chosen layout — delayed by 400ms to allow the confirmation animation to play.
	useEffect( () => {
		if ( screen !== 'confirming' ) {
			return;
		}
		const chosen = layouts.find( ( l ) => l._chosen );
		if ( ! chosen ) {
			return;
		}
		let newBlocks;
		try {
			newBlocks = parseBlocks( chosen.blocks ).filter( ( b ) => b?.name );
		} catch ( e ) {
			newBlocks = [];
		}
		if ( newBlocks.length > 0 ) {
			const timerId = setTimeout( () => {
				// Read latest items / useMeta from refs to avoid stale closure values
				// (this effect intentionally only re-runs when screen changes).
				const latestItems = itemsRef.current;
				const latestUseMeta = useMetaRef.current;
				if ( latestUseMeta ) {
					try {
						setMeta( {
							_aldus_items: JSON.stringify( latestItems ),
						} );
					} catch ( metaErr ) {
						if ( window?.aldusDebug ) {
							// eslint-disable-next-line no-console
							console.error( '[Aldus] setMeta failed:', metaErr );
						}
					}
				}
				const usingWrapper = wrapperModeRef.current;

				if ( usingWrapper ) {
					// Wrapper mode: blocks become inner blocks of the Aldus container.
					// The block stays in the tree so render.php can wrap the output
					// with a semantic <div data-personality="…"> on the front end.
					replaceInnerBlocks( clientId, newBlocks, false );
					setAttributes( {
						insertedPersonality: chosen.label,
					} );
					setScreen( 'inserted' );
					wpDispatch( 'core/notices' ).createSuccessNotice(
						__(
							'Layout loaded as inner blocks. Use toolbar to redesign or detach.',
							'aldus'
						),
						{
							type: 'snackbar',
							id: 'aldus-insert-wrapper',
						}
					);
				} else {
					// Classic mode: replace the Aldus block with the generated blocks.
					replaceBlocks( clientId, newBlocks );
					// Move editor focus to the first inserted block so keyboard users land
					// somewhere meaningful after picking a layout (item 20 — accessibility).
					const firstBlock = newBlocks[ 0 ];
					if ( firstBlock?.clientId ) {
						selectBlock( firstBlock.clientId );
						// Also move DOM focus so keyboard navigation starts at the right block.
						requestAnimationFrame( () => {
							document
								.querySelector(
									`[data-block="${ firstBlock.clientId }"]`
								)
								?.focus();
						} );
					}

					// Lock container block structure so the user can freely edit
					// content (text, images, links) without accidentally breaking
					// the layout by dragging, deleting, or rearranging containers.
					const CONTAINER_TYPES = new Set( [
						'core/group',
						'core/columns',
						'core/column',
						'core/cover',
						'core/media-text',
						'core/buttons',
					] );
					const lockedIds = [];
					const lockContainers = ( blocks ) => {
						for ( const block of blocks ) {
							if ( CONTAINER_TYPES.has( block.name ) ) {
								setBlockEditingMode(
									block.clientId,
									'contentOnly'
								);
								lockedIds.push( block.clientId );
							}
							if ( block.innerBlocks?.length ) {
								lockContainers( block.innerBlocks );
							}
						}
					};
					lockContainers( newBlocks );

					wpDispatch( 'core/notices' ).createSuccessNotice(
						__(
							'Layout inserted. Structure locked — edit content freely.',
							'aldus'
						),
						{
							actions: [
								{
									label: __( 'Unlock structure', 'aldus' ),
									onClick: () => {
										lockedIds.forEach( ( id ) =>
											wpDispatch(
												blockEditorStore
											).setBlockEditingMode(
												id,
												'default'
											)
										);
									},
								},
								{
									label: __( 'Undo', 'aldus' ),
									onClick: () =>
										wpDispatch( 'core/editor' ).undo(),
								},
							],
							type: 'snackbar',
							id: 'aldus-insert-undo',
						}
					);
				}

				/**
				 * Fires after an Aldus layout has been inserted into the editor.
				 *
				 * Action: 'aldus.layoutInserted'
				 *
				 * @param {Object}   data
				 * @param {string}   data.label       Personality name.
				 * @param {string[]} data.tokens      Token sequence used.
				 * @param {Object[]} data.blocks      Parsed block objects.
				 * @param {boolean}  data.wrapperMode Whether wrapper mode was used.
				 */
				doAction( 'aldus.layoutInserted', {
					label: chosen.label,
					tokens: chosen.tokens ?? [],
					blocks: newBlocks,
					wrapperMode: usingWrapper,
				} );
			}, 400 );
			return () => clearTimeout( timerId );
		}
		setErrorCode( 'api_error' );
		setRetryCount( ( c ) => c + 1 );
		setScreen( 'error' );
	}, [ screen ] ); // eslint-disable-line react-hooks/exhaustive-deps

	// Preview path — skips LLM entirely; uses personality.fullSequence directly.
	const runPreview = useCallback(
		async ( pack ) => {
			lastPackRef.current = pack; // stored for per-card re-roll
			setLayouts( [] );
			setIsPreview( false );
			setScreen( 'loading' );
			setMsgIndex( 0 );
			setMsgVisible( true );

			try {
				const personalities = ACTIVE_PERSONALITIES.filter( ( p ) =>
					enabledPersonalities.includes( p.name )
				);

				// Lazily load the full pack content (dynamically imported chunk),
				// then flatten once — all personality requests share the same items array.
				const fullPack = await loadPackContent( pack.id );
				lastPackRef.current = fullPack ?? pack; // update ref with full content for re-roll
				const packItems = packToItems( fullPack ?? pack );

				setGenProgress( {
					done: 0,
					total: personalities.length,
					lastLabel: null,
				} );

				const previewJobs = personalities.map( ( p ) => {
					const seqs =
						p.exampleSequences?.length > 0
							? p.exampleSequences
							: [ p.anchors ];
					return {
						label: p.name,
						data: {
							items: packItems,
							personality: p.name,
							tokens: seqs[
								Math.floor( Math.random() * seqs.length )
							],
							use_bindings: useMeta,
							custom_styles: customBlockStyles,
						},
					};
				} );

				const previewResponses = await batchAssemble(
					previewJobs,
					( done, total, lastLabel ) =>
						setGenProgress( { done, total, lastLabel } )
				);

				const assembled = previewResponses
					.filter( isValidAssembleResponse )
					.map( ( r ) => ( {
						label: r.label,
						blocks: r.blocks,
						tokens: r.tokens ?? [],
						sections: r.sections ?? [],
					} ) );

				if ( assembled.length === 0 ) {
					setErrorCode( 'no_layouts' );
					setRetryCount( ( c ) => c + 1 );
					setScreen( 'error' );
					speak(
						__(
							'No layouts generated. Try adding more content.',
							'aldus'
						),
						'assertive'
					);
					return;
				}

				setActivePreviewPack( pack );
				setIsPreview( true );
				setLayouts( assembled );
				setScreen( 'results' );
				speak(
					sprintf(
						/* translators: %d: number of generated layouts */
						__( '%d layouts ready.', 'aldus' ),
						assembled.length
					),
					'assertive'
				);
			} catch ( err ) {
				// loadPackContent or a network error before allSettled — reset to error screen.
				setErrorCode( 'api_error' );
				setRetryCount( ( c ) => c + 1 );
				setScreen( 'error' );
				if ( window?.aldusDebug ) {
					// eslint-disable-next-line no-console
					console.error( '[Aldus] runPreview failed:', err );
				}
			}
		},
		[ enabledPersonalities, useMeta ] // eslint-disable-line react-hooks/exhaustive-deps
	);

	// Per-card re-roll — regenerates one layout slot without clearing the rest.
	const rerollLayout = useCallback(
		async ( label ) => {
			const personality = ACTIVE_PERSONALITIES.find(
				( p ) => p.name === label
			);
			if ( ! personality ) {
				return;
			}
			setRerollingLabel( label );
			// Increment per-personality reroll counter so variant picks change even
			// when the token sequence is identical to the previous roll.
			const rerollCount = incrementRerollCount( label );
			try {
				let result;
				if ( isPreview && lastPackRef.current ) {
					// Pick a random exampleSequences entry for variety on each re-roll.
					// Guard: never index an empty seqs array.
					const seqs =
						personality.exampleSequences?.length > 0
							? personality.exampleSequences
							: [ personality.anchors ];
					const seqIndex = Math.floor( Math.random() * seqs.length );
					result = await apiFetch( {
						path: '/aldus/v1/assemble',
						method: 'POST',
						data: {
							items: packToItems( lastPackRef.current ),
							personality: personality.name,
							tokens: seqs[ seqIndex ],
							reroll_count: rerollCount,
							use_bindings: false,
							custom_styles: customBlockStyles,
							post_id: postId || 0,
						},
					} );
				} else {
					if ( ! engineRef.current ) {
						setRerollErrors( ( prev ) => ( {
							...prev,
							[ label ]: true,
						} ) );
						if ( rerollErrorTimersRef.current[ label ] ) {
							clearTimeout(
								rerollErrorTimersRef.current[ label ]
							);
						}
						rerollErrorTimersRef.current[ label ] = setTimeout(
							() => {
								delete rerollErrorTimersRef.current[ label ];
								setRerollErrors( ( prev ) => {
									const next = { ...prev };
									delete next[ label ];
									return next;
								} );
							},
							3000
						);
						return;
					}
					const manifest = {};
					for ( const item of items ) {
						manifest[ item.type ] =
							( manifest[ item.type ] ?? 0 ) + 1;
					}
					const tokens = await inferTokens(
						engineRef.current,
						personality,
						manifest,
						styleNote,
						null,
						items
					);
					result = await apiFetch( {
						path: '/aldus/v1/assemble',
						method: 'POST',
						data: {
							items,
							personality: personality.name,
							tokens,
							reroll_count: rerollCount,
							use_bindings: useMeta,
							custom_styles: customBlockStyles,
							post_id: postId || 0,
						},
					} );
				}
				if ( result?.success && result?.blocks ) {
					setLayouts( ( prev ) =>
						prev.map( ( l ) =>
							l.label === label
								? {
										...l,
										blocks: result.blocks,
										tokens: result.tokens ?? l.tokens,
										sections: result.sections ?? l.sections,
								  }
								: l
						)
					);
				}
			} catch ( err ) {
				if ( window?.aldusDebug ) {
					// eslint-disable-next-line no-console
					console.error( '[Aldus] rerollLayout failed:', err );
				}
				setRerollErrors( ( prev ) => ( { ...prev, [ label ]: true } ) );
				if ( rerollErrorTimersRef.current[ label ] ) {
					clearTimeout( rerollErrorTimersRef.current[ label ] );
				}
				rerollErrorTimersRef.current[ label ] = setTimeout( () => {
					delete rerollErrorTimersRef.current[ label ];
					setRerollErrors( ( prev ) => ( {
						...prev,
						[ label ]: false,
					} ) );
				}, 3000 );
			} finally {
				setRerollingLabel( null );
			}
		},
		[ isPreview, items, styleNote, useMeta, postId, incrementRerollCount ] // eslint-disable-line react-hooks/exhaustive-deps
	);

	const generate = useCallback( () => {
		if ( ! hasWebGPU() ) {
			setScreen( 'no-gpu' );
			return;
		}
		resetRetry(); // restore the one-retry allowance for each user-triggered generation
		setLayouts( [] );
		setMsgIndex( 0 );
		setMsgVisible( true );
		const siteName = window.__aldusSite?.name ?? '';
		const siteDesc = window.__aldusSite?.description ?? '';
		const siteStr = siteName
			? `Site: ${ siteName }${ siteDesc ? ` — ${ siteDesc }` : '' }`
			: '';
		const postStr = postTitle
			? `Post titled "${ postTitle }" (post type: ${ postType })`
			: '';
		const context =
			[ siteStr, postStr ].filter( Boolean ).join( '. ' ) || null;
		// If a personality was pinned via "Try with my content", sort it to the
		// front so results lead with the user's chosen personality.
		let orderedPersonalities = enabledPersonalities;
		if (
			pinnedPersonality &&
			enabledPersonalities.includes( pinnedPersonality )
		) {
			orderedPersonalities = [
				pinnedPersonality,
				...enabledPersonalities.filter(
					( p ) => p !== pinnedPersonality
				),
			];
		}
		runGenerate( {
			items,
			styleNote,
			postContext: context,
			enabledLabels: orderedPersonalities,
			useBindings: useMeta,
			customStyles: customBlockStyles,
			postId: postId || 0,
		} );
	}, [
		items,
		enabledPersonalities,
		pinnedPersonality,
		styleNote,
		postTitle,
		postType,
		useMeta,
		customBlockStyles,
		postId,
		runGenerate,
		resetRetry,
	] );

	const regenerate = generate;

	// Auto-trigger generation when the block was created via a block transform.
	// When the user selects blocks and uses "Transform to Aldus", the resulting
	// block already has savedItems populated. Detect this on first render and
	// fire generate() automatically — two clicks from "I have blocks" to layouts.
	// The ref guard prevents re-triggering on subsequent renders.
	const hasAutoGeneratedRef = useRef( false );
	useEffect( () => {
		if (
			items.length > 0 &&
			screen === 'building' &&
			! hasAutoGeneratedRef.current
		) {
			hasAutoGeneratedRef.current = true;
			const timer = setTimeout( generate, 300 );
			return () => clearTimeout( timer );
		}
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	const chooseLayout = useCallback(
		( label ) => {
			setLayouts( ( prev ) =>
				prev.map( ( l ) => ( { ...l, _chosen: l.label === label } ) )
			);
			setScreen( 'confirming' );

			// Analytics: fire the action hook and POST a lightweight counter update.
			const chosen = layouts.find( ( l ) => l.label === label );
			const tokenSeq = chosen?.tokens ?? [];
			doAction( 'aldus.layout_chosen', {
				personality: label,
				tokens: tokenSeq,
			} );
			// Fire-and-forget — failure is non-fatal.
			apiFetch( {
				path: '/aldus/v1/record-use',
				method: 'POST',
				data: { personality: label },
			} ).catch( ( err ) => {
				if ( window?.aldusDebug ) {
					// eslint-disable-next-line no-console
					console.debug( '[Aldus] record-use failed:', err );
				}
			} );
		},
		[ layouts ]
	);

	const startOver = useCallback( () => {
		setScreen( 'building' );
		setLayouts( [] );
		setPinnedPersonality( null );
		setIsPreview( false );
		setBuildingMode( 'content' );
		setAutoStyle( '' );
		setRecommendedPersonalities( [] );
		setContentHints( [] );
	}, [] );

	// "Try with my content" — called from a pack preview LayoutCard.
	// Pins the personality and sends the user to the content tab.
	const tryWithMyContent = useCallback( ( personalityLabel ) => {
		setPinnedPersonality( personalityLabel );
		setScreen( 'building' );
		setBuildingMode( 'content' );
		setLayouts( [] );
	}, [] );

	// Confirm-guarded variants for button-triggered actions on the results screen.
	const requestStartOver = useCallback( () => {
		if ( screen === 'results' && layouts.length > 0 ) {
			setConfirmAction( 'startOver' );
		} else {
			startOver();
		}
	}, [ screen, layouts.length, startOver ] );

	const requestRegenerate = useCallback( () => {
		if ( layouts.length > 0 ) {
			setConfirmAction( 'regenerate' );
		} else {
			regenerate();
		}
	}, [ layouts.length, regenerate ] );

	// Abort an in-progress download or loading operation and return to building.
	const abortGenerate = useCallback( () => {
		if ( abortRef.current ) {
			abortRef.current();
			abortRef.current = null;
		}
		destroyEngine();
		setScreen( 'building' );
	}, [ destroyEngine ] ); // eslint-disable-line react-hooks/exhaustive-deps

	const startMixing = useCallback( () => setScreen( 'mixing' ), [] );

	const backToResults = useCallback( () => setScreen( 'results' ), [] );

	// Keyboard shortcut handlers — guards ensure they only fire on the relevant screen.
	useShortcut(
		'aldus/generate',
		useCallback(
			( event ) => {
				if ( screen !== 'building' || items.length === 0 ) {
					return;
				}
				event.preventDefault();
				generate();
			},
			[ screen, items.length, generate ]
		)
	);
	useShortcut(
		'aldus/cancel',
		useCallback(
			( event ) => {
				if (
					screen !== 'downloading' &&
					screen !== 'loading' &&
					screen !== 'results' &&
					screen !== 'error'
				) {
					return;
				}
				event.preventDefault();
				if ( screen === 'downloading' || screen === 'loading' ) {
					abortGenerate();
				} else {
					startOver();
				}
			},
			[ screen, startOver, abortGenerate ]
		)
	);
	useShortcut(
		'aldus/regen',
		useCallback(
			( event ) => {
				if ( screen !== 'results' ) {
					return;
				}
				event.preventDefault();
				regenerate();
			},
			[ screen, regenerate ]
		)
	);

	const insertMix = useCallback(
		( combinedBlocks ) => {
			let newBlocks;
			try {
				newBlocks = parseBlocks( combinedBlocks ).filter(
					( b ) => b?.name
				);
			} catch ( e ) {
				newBlocks = [];
			}
			if ( newBlocks.length > 0 ) {
				replaceBlocks( clientId, newBlocks );
				// Move editor focus to the first inserted block (item 20 — accessibility).
				const firstBlock = newBlocks[ 0 ];
				if ( firstBlock?.clientId ) {
					selectBlock( firstBlock.clientId );
					requestAnimationFrame( () => {
						document
							.querySelector(
								`[data-block="${ firstBlock.clientId }"]`
							)
							?.focus();
					} );
				}
				// Lock container structure so only content (text/images) is editable.
				const MIX_CONTAINER_TYPES = new Set( [
					'core/group',
					'core/columns',
					'core/column',
					'core/cover',
					'core/media-text',
					'core/buttons',
				] );
				const mixLockedIds = [];
				const lockMixContainers = ( blocks ) => {
					for ( const block of blocks ) {
						if ( MIX_CONTAINER_TYPES.has( block.name ) ) {
							setBlockEditingMode(
								block.clientId,
								'contentOnly'
							);
							mixLockedIds.push( block.clientId );
						}
						if ( block.innerBlocks?.length ) {
							lockMixContainers( block.innerBlocks );
						}
					}
				};
				lockMixContainers( newBlocks );
				wpDispatch( 'core/notices' ).createSuccessNotice(
					__(
						'Layout inserted. Structure locked — edit content freely.',
						'aldus'
					),
					{
						actions: [
							{
								label: __( 'Unlock structure', 'aldus' ),
								onClick: () => {
									mixLockedIds.forEach( ( id ) =>
										wpDispatch(
											blockEditorStore
										).setBlockEditingMode( id, 'default' )
									);
								},
							},
							{
								label: __( 'Undo', 'aldus' ),
								onClick: () =>
									wpDispatch( 'core/editor' ).undo(),
							},
						],
						type: 'snackbar',
						id: 'aldus-insert-undo',
					}
				);
			} else {
				setErrorCode( 'api_error' );
				setRetryCount( ( c ) => c + 1 );
				setScreen( 'error' );
			}
		},
		[ clientId, replaceBlocks, selectBlock, setBlockEditingMode ]
	);

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	return (
		<>
			<InspectorControls>
				{ /* Insertion mode — persistent wrapper vs. classic replace */ }
				<PanelBody
					title={ __( 'Insertion mode', 'aldus' ) }
					initialOpen={ false }
				>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Persistent wrapper', 'aldus' ) }
						help={
							wrapperMode
								? __(
										'Aldus block stays in the tree. Generated blocks are inner blocks — you can redesign without losing them.',
										'aldus'
								  )
								: __(
										'Aldus block replaces itself after you pick a layout. The block is gone from the tree.',
										'aldus'
								  )
						}
						checked={ !! wrapperMode }
						onChange={ ( value ) =>
							setAttributes( { wrapperMode: value } )
						}
					/>
				</PanelBody>
				{ /* Pass 8: Quick start presets panel */ }
				<PanelBody
					title={ __( 'Quick start', 'aldus' ) }
					initialOpen={ true }
				>
					<p className="aldus-panel-hint">
						{ __(
							'Load a starting point and edit from there.',
							'aldus'
						) }
					</p>
					{ PRESETS.map( ( preset ) => (
						<Button
							__next40pxDefaultSize
							key={ preset.id }
							variant="secondary"
							className="aldus-preset-btn"
							onClick={ () => loadPreset( preset ) }
						>
							<span className="aldus-preset-name">
								{ preset.name }
							</span>
							<span className="aldus-preset-desc">
								{ preset.description }
							</span>
						</Button>
					) ) }
				</PanelBody>
				<PanelBody
					title={ __( 'Layout styles', 'aldus' ) }
					initialOpen={ false }
				>
					<p className="aldus-panel-hint">
						{ __(
							'Choose which personalities generate layouts for you.',
							'aldus'
						) }
					</p>
					{ showPersonalityWarning && (
						<Notice
							status="warning"
							isDismissible={ false }
							className="aldus-personality-warning"
						>
							{ __(
								'At least one personality is required.',
								'aldus'
							) }
						</Notice>
					) }
					{ [
						{
							label: __( 'Dramatic', 'aldus' ),
							names: [
								'Dispatch',
								'Nocturne',
								'Manifesto',
								'Dusk',
							],
						},
						{
							label: __( 'Editorial', 'aldus' ),
							names: [
								'Folio',
								'Codex',
								'Ledger',
								'Broadsheet',
								'Tribune',
							],
						},
						{
							label: __( 'Structural', 'aldus' ),
							names: [ 'Stratum', 'Solstice', 'Prism', 'Mosaic' ],
						},
						{
							label: __( 'Atmospheric', 'aldus' ),
							names: [ 'Mirage', 'Overture', 'Broadside' ],
						},
					].map( ( group ) => (
						<div
							key={ group.label }
							className="aldus-personality-group"
						>
							<p className="aldus-personality-group-label">
								{ group.label }
							</p>
							{ group.names.map( ( name ) => {
								const checked =
									enabledPersonalities.includes( name );
								const tagline = LAYOUT_TAGLINES[ name ] ?? '';
								const isRecommended =
									recommendedPersonalities.includes( name );
								return (
									<CheckboxControl
										key={ name }
										label={
											isRecommended ? (
												<>
													{ name }{ ' ' }
													<span className="aldus-personality-recommended">
														{ __(
															'Recommended',
															'aldus'
														) }
													</span>
												</>
											) : (
												name
											)
										}
										help={ tagline }
										checked={ checked }
										onChange={ ( next ) => {
											const updated = next
												? [
														...enabledPersonalities,
														name,
												  ]
												: enabledPersonalities.filter(
														( n ) => n !== name
												  );
											if ( updated.length > 0 ) {
												setAttributes( {
													enabledPersonalities:
														updated,
												} );
												setShowPersonalityWarning(
													false
												);
												if (
													personalityWarningTimerRef.current
												) {
													clearTimeout(
														personalityWarningTimerRef.current
													);
													personalityWarningTimerRef.current =
														null;
												}
											} else {
												setShowPersonalityWarning(
													true
												);
												if (
													personalityWarningTimerRef.current
												) {
													clearTimeout(
														personalityWarningTimerRef.current
													);
												}
												personalityWarningTimerRef.current =
													setTimeout( () => {
														setShowPersonalityWarning(
															false
														);
														personalityWarningTimerRef.current =
															null;
													}, 2500 );
											}
										} }
										__nextHasNoMarginBottom
									/>
								);
							} ) }
						</div>
					) ) }
					{ themeColors.length > 0 && (
						<div className="aldus-theme-colors">
							<p className="aldus-panel-hint">
								{ __(
									'Aldus uses these colors in your layouts:',
									'aldus'
								) }
							</p>
							<div className="aldus-theme-color-swatches">
								{ themeColors.slice( 0, 10 ).map( ( color ) => (
									<span
										key={ color.slug }
										className="aldus-theme-color-swatch"
										style={ {
											backgroundColor: color.color,
										} }
										title={ color.name ?? color.slug }
									/>
								) ) }
							</div>
							<p className="aldus-theme-colors-caption">
								{ __(
									'Dark sections use the darkest color; accent sections use the most vivid.',
									'aldus'
								) }
							</p>
						</div>
					) }
				</PanelBody>
				<PanelBody
					title={ __( 'Content storage', 'aldus' ) }
					initialOpen={ false }
				>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Store items in post meta', 'aldus' ) }
						help={ __(
							'Saves your content items alongside the layout so you can update them later without re-running generation.',
							'aldus'
						) }
						checked={ useMeta }
						onChange={ ( val ) =>
							setAttributes( { useMeta: val } )
						}
					/>
				</PanelBody>
			</InspectorControls>

			{ ( screen === 'results' || screen === 'loading' ) && (
				<BlockControls group="other">
					<ToolbarGroup>
						{ screen === 'results' && (
							<ToolbarButton
								icon={ safeIcon( undo ) }
								label={ __( 'Regenerate', 'aldus' ) }
								onClick={ requestRegenerate }
							/>
						) }
						<ToolbarButton
							icon={ safeIcon( close ) }
							label={ __( 'Start fresh', 'aldus' ) }
							onClick={ requestStartOver }
						/>
					</ToolbarGroup>
				</BlockControls>
			) }
			<BlockControls group="other">
				<ToolbarGroup>
					<ToolbarButton
						icon={ safeIcon( help ) }
						label={ __( 'How Aldus works', 'aldus' ) }
						onClick={ () => setShowHelp( true ) }
					/>
				</ToolbarGroup>
			</BlockControls>

			<div { ...blockProps }>
				{ /* Pass 6: screen wrapper for fade-in animation */ }
				{ screen === 'building' && (
					<div className="aldus-screen">
						<BuildingScreen
							items={ items }
							setItems={ setItems }
							addItem={ addItem }
							updateItem={ updateItem }
							removeItem={ removeItem }
							moveItem={ moveItem }
							reorderItems={ reorderItems }
							generate={ generate }
							isGenerating={ isGenerating }
							hasEngine={ !! engineRef.current }
							hasDownloadedModel={ hasDownloadedModel }
							lastFocusRef={ lastFocusRef }
							buildingMode={ buildingMode }
							setBuildingMode={ setBuildingMode }
							onPreview={ runPreview }
							styleNote={ styleNote }
							onStyleNoteChange={ setStyleNote }
							noWebGPU={ noWebGPU }
							editorBlocks={ editorBlocks }
							pinnedPersonality={ pinnedPersonality }
							onClearPinnedPersonality={ () =>
								setPinnedPersonality( null )
							}
							loadPreset={ loadPreset }
							onboardingStep={ onboardingStep }
							onOnboardingNext={ advanceOnboarding }
							contentHints={ contentHints }
							onDismissHint={ ( hint ) =>
								setContentHints( ( prev ) =>
									prev.filter( ( h ) => h !== hint )
								)
							}
						/>
					</div>
				) }
				{ screen === 'downloading' && (
					<div className="aldus-screen">
						<DownloadingScreen
							progress={ dlProgress }
							onAbort={ abortGenerate }
						/>
						{ dlStalled && (
							<div className="aldus-stall-notice">
								<p>
									{ __(
										'Download seems stuck. Check your connection or try refreshing.',
										'aldus'
									) }
								</p>
								<Button
									variant="link"
									onClick={ () => setDlStalled( false ) }
									className="aldus-stall-dismiss"
								>
									{ __( 'Dismiss', 'aldus' ) }
								</Button>
							</div>
						) }
					</div>
				) }
				{ screen === 'loading' && (
					<div className="aldus-screen">
						<LoadingScreen
							message={ LOADING_MESSAGES[ msgIndex ] }
							msgVisible={ msgVisible }
							onAbort={ abortGenerate }
							genProgress={ genProgress }
						/>
					</div>
				) }
				{ screen === 'results' && (
					<div className="aldus-screen">
						<ResultsScreen
							layouts={ layouts }
							chooseLayout={ chooseLayout }
							startOver={ requestStartOver }
							regenerate={ requestRegenerate }
							isPreview={ isPreview }
							onReroll={ rerollLayout }
							rerollingLabel={ rerollingLabel }
							rerollErrors={ rerollErrors }
							onMix={ startMixing }
							onTryWithContent={
								isPreview ? tryWithMyContent : null
							}
							items={ items }
							packs={ PACK_META }
							activePreviewPack={ activePreviewPack }
							onSwitchPack={ runPreview }
							autoStyle={ autoStyle }
						/>
					</div>
				) }
				{ screen === 'mixing' && (
					<div className="aldus-screen">
						<MixingScreen
							layouts={ layouts }
							onInsert={ insertMix }
							onBack={ backToResults }
						/>
					</div>
				) }
				{ screen === 'confirming' && (
					<div className="aldus-screen">
						<ConfirmingScreen
							label={
								layouts.find( ( l ) => l._chosen )?.label ?? ''
							}
						/>
					</div>
				) }
				{ screen === 'inserted' && (
					<InsertedScreen
						onRedesign={ () => setScreen( 'results' ) }
						onDetach={ () => {
							const innerBlocks =
								wp.data
									.select( blockEditorStore )
									.getBlock( clientId )?.innerBlocks ?? [];
							replaceBlocks( clientId, innerBlocks );
						} }
					/>
				) }
				{ screen === 'error' && (
					<div className="aldus-screen">
						<ErrorScreen
							code={ errorCode }
							retryCount={ retryCount }
							errorDetail={ errorDetail }
							onRetry={ () => setScreen( 'building' ) }
							onRegenerate={ regenerate }
						/>
					</div>
				) }
				{ confirmAction && (
					<ConfirmDialog
						onConfirm={ () => {
							if ( confirmAction === 'startOver' ) {
								startOver();
							} else {
								regenerate();
							}
							setConfirmAction( null );
						} }
						onCancel={ () => setConfirmAction( null ) }
					>
						{ confirmAction === 'startOver'
							? sprintf(
									/* translators: %d is the number of layouts that will be discarded */
									_n(
										'Clear %d layout and start over?',
										'Clear all %d layouts and start over?',
										layouts.length,
										'aldus'
									),
									layouts.length
							  )
							: sprintf(
									/* translators: %d is the number of layouts that will be replaced */
									_n(
										'Regenerate and replace your %d layout with new ones?',
										'Regenerate and replace your %d layouts with new ones?',
										layouts.length,
										'aldus'
									),
									layouts.length
							  ) }
					</ConfirmDialog>
				) }
				{ showHelp && (
					<Modal
						title={ __( 'How Aldus works', 'aldus' ) }
						onRequestClose={ () => setShowHelp( false ) }
						className="aldus-help-modal"
					>
						<div className="aldus-help-steps">
							<div className="aldus-help-step">
								<span className="aldus-help-step-number">
									1
								</span>
								<div>
									<strong>
										{ __( "Add what you've got", 'aldus' ) }
									</strong>
									<p>
										{ __(
											"A headline, some body text, an image, a quote — whatever the page needs. Don't worry about layout.",
											'aldus'
										) }
									</p>
								</div>
							</div>
							<div className="aldus-help-step">
								<span className="aldus-help-step-number">
									2
								</span>
								<div>
									<strong>
										{ __(
											'Aldus does the design part',
											'aldus'
										) }
									</strong>
									<p>
										{ __(
											'It tries your content in sixteen different layout styles — editorial, cinematic, minimal, bold — each with its own structure and mood.',
											'aldus'
										) }
									</p>
								</div>
							</div>
							<div className="aldus-help-step">
								<span className="aldus-help-step-number">
									3
								</span>
								<div>
									<strong>
										{ __( 'Pick, edit, publish', 'aldus' ) }
									</strong>
									<p>
										{ __(
											'Choose the one that fits. It becomes real WordPress blocks you can edit, rearrange, or build on. No lock-in.',
											'aldus'
										) }
									</p>
								</div>
							</div>
						</div>
						<p className="aldus-help-tip">
							{ __(
								'Tip: Use the "Browse styles" tab to preview layouts instantly — no download needed.',
								'aldus'
							) }
						</p>
						<div className="aldus-help-shortcuts">
							<strong className="aldus-help-shortcuts-title">
								{ __( 'Keyboard shortcuts', 'aldus' ) }
							</strong>
							<ul className="aldus-help-shortcut-list">
								<li>
									<kbd className="aldus-kbd">⌘↵</kbd>
									<span>
										{ __( 'Generate layouts', 'aldus' ) }
									</span>
								</li>
								<li>
									<kbd className="aldus-kbd">⇧⌘R</kbd>
									<span>
										{ __( 'Regenerate layouts', 'aldus' ) }
									</span>
								</li>
								<li>
									<kbd className="aldus-kbd">Esc</kbd>
									<span>
										{ __( 'Cancel / go back', 'aldus' ) }
									</span>
								</li>
							</ul>
						</div>
					</Modal>
				) }
			</div>
		</>
	);
}

// ---------------------------------------------------------------------------
// Screen: Confirming
// ---------------------------------------------------------------------------

/**
 * Inserted (wrapper mode) screen.
 *
 * Renders the inner blocks as editable content and exposes Redesign / Detach
 * toolbar buttons. The Aldus block stays in the tree so its PHP render callback
 * can output the .aldus-layout semantic wrapper on the front end.
 *
 * @param {Object}   props
 * @param {Function} props.onRedesign Callback to go back to the results screen.
 * @param {Function} props.onDetach   Callback to unwrap inner blocks and remove Aldus.
 */
function InsertedScreen( { onRedesign, onDetach } ) {
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'aldus-wrapper-inner' },
		{ templateLock: 'contentOnly' }
	);
	return (
		<>
			<BlockControls>
				<ToolbarGroup>
					<ToolbarButton
						icon={ safeIcon( refreshIcon ) }
						label={ __( 'Redesign with Aldus', 'aldus' ) }
						onClick={ onRedesign }
					/>
					<ToolbarButton
						icon={ safeIcon( unlockIcon ) }
						label={ __( 'Detach from Aldus', 'aldus' ) }
						onClick={ onDetach }
					/>
				</ToolbarGroup>
			</BlockControls>
			<div { ...innerBlocksProps } />
		</>
	);
}

function ConfirmingScreen( { label } ) {
	return (
		<div className="aldus-confirming" aria-live="polite">
			{ label ? (
				<>
					<span className="aldus-confirming-name" aria-hidden="true">
						{ label }
					</span>
					<span className="aldus-confirming-sub">
						{ sprintf(
							/* translators: %s is the personality name, e.g. "Dispatch". */
							__( 'Making it %s…', 'aldus' ),
							label
						) }
					</span>
				</>
			) : (
				<>
					<Spinner />
					<span>{ __( 'Dropping it in…', 'aldus' ) }</span>
				</>
			) }
		</div>
	);
}
