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
	ConfirmDialog,
	Modal,
	Spinner,
	Tooltip,
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
	PACK_META,
	packToItems,
	loadPackContent,
} from './sample-data/index.js';
import {
	safeIcon,
	closeIcon as close,
	undoIcon as undo,
	helpIcon as help,
	refreshIcon,
	unlockIcon,
} from './utils/icons';
import { useAldusEngine } from './hooks/useAldusEngine.js';
import { useAldusGeneration } from './hooks/useAldusGeneration.js';
import { useAldusItems } from './hooks/useAldusItems.js';
import { DownloadingScreen } from './screens/DownloadingScreen.js';
import { LoadingScreen } from './screens/LoadingScreen.js';
import { ErrorScreen } from './screens/ErrorScreen.js';
import { MixingScreen } from './screens/MixScreen.js';
import { VALID_TOKENS_SET } from './data/tokens.js';
import { PERSONALITIES, ACTIVE_PERSONALITIES } from './data/personalities.js';
import { PRESETS } from './data/presets.js';
import { LOADING_MESSAGES } from './data/ui-strings.js';
import { buildPersonalityPrompt, enforceAnchors } from './lib/prompts.js';
import { ResultsScreen } from './components/ResultsScreen.js';
import { BuildingScreen } from './components/BuildScreen.js';
import { LayoutWireframe } from './components/LayoutWireframe.js';
import { ALDUS_JS_VERSION, SCREEN } from './constants.js';

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
// Shared constants (module-level, safe to reference inside the component)
// ---------------------------------------------------------------------------

/**
 * Block types that should be locked to content-only editing after insertion.
 * Defined once here to avoid duplicate Set literals across the component.
 */
const LOCKABLE_CONTAINER_TYPES = new Set( [
	'core/group',
	'core/columns',
	'core/column',
	'core/cover',
	'core/media-text',
	'core/buttons',
] );

// ---------------------------------------------------------------------------
// Block markup validation (development helper)
// ---------------------------------------------------------------------------

/**
 * Checks parsed blocks for render-time-only classes that would cause
 * "invalid block" warnings in the editor. Logs warnings to the console.
 * These classes are injected by WordPress at render time and must not
 * appear in saved post_content.
 *
 * @param {Array}  blocks Parsed block objects from parseBlocks().
 * @param {number} depth  Recursion depth (internal use).
 * @return {string[]} Warning messages.
 */
function validateParsedBlocks( blocks, depth = 0 ) {
	const warnings = [];
	const RENDER_TIME_CLASSES = [
		'is-layout-flow',
		'is-layout-constrained',
		'is-layout-flex',
		'is-layout-grid',
	];
	for ( const block of blocks ) {
		if ( ! block?.name ) {
			continue;
		}
		const html = block.originalContent || '';
		for ( const cls of RENDER_TIME_CLASSES ) {
			if ( html.includes( cls ) ) {
				warnings.push(
					`${ block.name }: contains render-time class "${ cls }"`
				);
			}
		}
		const m = html.match( /wp-block-[a-z]+-is-layout-[a-z]+/ );
		if ( m ) {
			warnings.push(
				`${ block.name }: contains render-time class "${ m[ 0 ] }"`
			);
		}
		if ( block.innerBlocks?.length ) {
			warnings.push(
				...validateParsedBlocks( block.innerBlocks, depth + 1 )
			);
		}
	}
	return warnings;
}

// ---------------------------------------------------------------------------
// Edit component
// ---------------------------------------------------------------------------

export default function Edit( { clientId, attributes, setAttributes } ) {
	const blockProps = useBlockProps( {
		className: 'wp-block-aldus-layout-generator',
		style: {
			display: 'block',
		},
	} );

	const { enabledPersonalities, savedItems, styleNote } = attributes;

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
	// When the user clicks "Try with my content" from a pack preview card, we
	// pin that personality so generation leads with it.
	const [ pinnedPersonality, setPinnedPersonality ] = useState( null );

	// Intelligence signals — set during generation, cleared on start-over.
	// autoStyle: string inferred from content manifest (e.g. "text-heavy editorial").
	// recommendedPersonalities: string[] of top-3 personality names for this content.
	// contentHints: string[] of actionable suggestions shown as dismissible pills.
	const [ autoStyle, setAutoStyle ] = useState( '' );
	// eslint-disable-next-line no-unused-vars
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

	// Entity prop hook for writing _aldus_items to post meta on every layout insertion.
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
			setScreen( SCREEN.BUILDING );
		},
		[ loadPresetItems ]
	);

	// ---------------------------------------------------------------------------
	// Hook: WebLLM engine lifecycle
	// ---------------------------------------------------------------------------

	const onDownloadStart = useCallback( () => {
		setScreen( SCREEN.DOWNLOADING );
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

	// Reactive flag: true once the WebLLM engine is initialised and ready.
	// Refs are not reactive, so we maintain this state alongside engineRef to
	// ensure components re-render when the engine becomes available.
	const [ isEngineReady, setIsEngineReady ] = useState( false );

	const { engineRef, abortRef, initEngine, destroyEngine } = useAldusEngine( {
		onDownloadStart,
		onDownloadProgress,
		onModelDownloaded: useCallback( () => {
			onModelDownloaded();
			setIsEngineReady( true );
		}, [ onModelDownloaded ] ),
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
		setScreen( SCREEN.ERROR );
	}, [] );

	// Wrap destroyEngine so any caller (abort, generation hook) also resets
	// the reactive isEngineReady flag that drives re-renders.
	const destroyEngineAndReset = useCallback( async () => {
		await destroyEngine();
		setIsEngineReady( false );
	}, [ destroyEngine ] );

	const { runGenerate, isGenerating, incrementRerollCount, resetRetry } =
		useAldusGeneration( {
			initEngine,
			destroyEngine: destroyEngineAndReset,
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
		return () => {
			Object.values( rerollTimers.current ).forEach( clearTimeout );
		};
	}, [] );

	// Cycle loading messages with fade transition
	useEffect( () => {
		if ( screen !== SCREEN.LOADING ) {
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
		if ( screen !== SCREEN.CONFIRMING ) {
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
		const validationWarnings = validateParsedBlocks( newBlocks );
		if ( validationWarnings.length > 0 ) {
			// eslint-disable-next-line no-console
			console.warn(
				'[Aldus] block validation warnings:',
				validationWarnings
			);
		}
		if ( newBlocks.length > 0 ) {
			const timerId = setTimeout( () => {
				// Always save items to meta so the user can redesign later.
				try {
					setMeta( {
						_aldus_items: JSON.stringify( itemsRef.current ),
					} );
				} catch ( metaErr ) {
					if ( window?.aldusDebug ) {
						// eslint-disable-next-line no-console
						console.error( '[Aldus] setMeta failed:', metaErr );
					}
				}

				// Always insert as inner blocks — the Aldus block stays in the
				// tree so the user can redesign without losing their content.
				replaceInnerBlocks( clientId, newBlocks, false );
				setAttributes( { insertedPersonality: chosen.label } );

				// Lock container structure so users edit content, not layout.
				const lockContainers = ( blocks ) => {
					for ( const block of blocks ) {
						if ( LOCKABLE_CONTAINER_TYPES.has( block.name ) ) {
							setBlockEditingMode(
								block.clientId,
								'contentOnly'
							);
						}
						if ( block.innerBlocks?.length ) {
							lockContainers( block.innerBlocks );
						}
					}
				};
				lockContainers( newBlocks );

				setScreen( SCREEN.INSERTED );

				wpDispatch( 'core/notices' ).createSuccessNotice(
					__(
						'Layout applied. Edit content — click Redesign anytime to try a different style.',
						'aldus'
					),
					{
						actions: [
							{
								label: __( 'Undo', 'aldus' ),
								onClick: () =>
									wpDispatch( 'core/editor' ).undo(),
							},
						],
						type: 'snackbar',
						id: 'aldus-insert-success',
					}
				);

				/**
				 * Fires after an Aldus layout has been inserted into the editor.
				 *
				 * Action: 'aldus.layoutInserted'
				 *
				 * @param {Object}   data
				 * @param {string}   data.label  Personality name.
				 * @param {string[]} data.tokens Token sequence used.
				 * @param {Object[]} data.blocks Parsed block objects.
				 */
				doAction( 'aldus.layoutInserted', {
					label: chosen.label,
					tokens: chosen.tokens ?? [],
					blocks: newBlocks,
				} );
			}, 400 );
			return () => clearTimeout( timerId );
		}
		setErrorCode( 'api_error' );
		setRetryCount( ( c ) => c + 1 );
		setScreen( SCREEN.ERROR );
	}, [ screen ] ); // eslint-disable-line react-hooks/exhaustive-deps

	// Preview path — skips LLM entirely; uses personality.fullSequence directly.
	const runPreview = useCallback(
		async ( pack ) => {
			lastPackRef.current = pack; // stored for per-card re-roll
			setLayouts( [] );
			setIsPreview( false );
			setScreen( SCREEN.LOADING );
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
							use_bindings: true,
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
					setScreen( SCREEN.ERROR );
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
				setScreen( SCREEN.RESULTS );
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
				setScreen( SCREEN.ERROR );
				if ( window?.aldusDebug ) {
					// eslint-disable-next-line no-console
					console.error( '[Aldus] runPreview failed:', err );
				}
			}
		},
		[ enabledPersonalities ] // eslint-disable-line react-hooks/exhaustive-deps
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
							use_bindings: true,
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
		[ isPreview, items, styleNote, postId, incrementRerollCount ] // eslint-disable-line react-hooks/exhaustive-deps
	);

	const generate = useCallback( () => {
		if ( ! hasWebGPU() ) {
			setScreen( SCREEN.NO_GPU );
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
			useBindings: true,
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
			screen === SCREEN.BUILDING &&
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
			setScreen( SCREEN.CONFIRMING );

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

	const togglePersonality = useCallback(
		( name ) => {
			const updated = enabledPersonalities.includes( name )
				? enabledPersonalities.filter( ( n ) => n !== name )
				: [ ...enabledPersonalities, name ];
			if ( updated.length > 0 ) {
				setAttributes( { enabledPersonalities: updated } );
			}
		},
		[ enabledPersonalities, setAttributes ]
	);

	const startOver = useCallback( () => {
		setScreen( SCREEN.BUILDING );
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
		setScreen( SCREEN.BUILDING );
		setBuildingMode( 'content' );
		setLayouts( [] );
	}, [] );

	// Confirm-guarded variants for button-triggered actions on the results screen.
	const requestStartOver = useCallback( () => {
		if ( screen === SCREEN.RESULTS && layouts.length > 0 ) {
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
		destroyEngineAndReset();
		setScreen( SCREEN.BUILDING );
	}, [ destroyEngineAndReset ] ); // eslint-disable-line react-hooks/exhaustive-deps

	const startMixing = useCallback( () => setScreen( SCREEN.MIXING ), [] );

	const backToResults = useCallback( () => setScreen( SCREEN.RESULTS ), [] );

	// Keyboard shortcut handlers — guards ensure they only fire on the relevant screen.
	useShortcut(
		'aldus/generate',
		useCallback(
			( event ) => {
				if ( screen !== SCREEN.BUILDING || items.length === 0 ) {
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
					screen !== SCREEN.DOWNLOADING &&
					screen !== SCREEN.LOADING &&
					screen !== SCREEN.RESULTS &&
					screen !== SCREEN.ERROR
				) {
					return;
				}
				event.preventDefault();
				if (
					screen === SCREEN.DOWNLOADING ||
					screen === SCREEN.LOADING
				) {
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
				if ( screen !== SCREEN.RESULTS ) {
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
				const mixLockedIds = [];
				const lockMixContainers = ( blocks ) => {
					for ( const block of blocks ) {
						if ( LOCKABLE_CONTAINER_TYPES.has( block.name ) ) {
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
				setScreen( SCREEN.ERROR );
			}
		},
		[ clientId, replaceBlocks, selectBlock, setBlockEditingMode ]
	);

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	const PERSONALITY_GROUPS = [
		{
			label: __( 'Dramatic', 'aldus' ),
			names: [ 'Dispatch', 'Nocturne', 'Manifesto', 'Dusk' ],
		},
		{
			label: __( 'Editorial', 'aldus' ),
			names: [ 'Folio', 'Codex', 'Ledger' ],
		},
		{
			label: __( 'Structural', 'aldus' ),
			names: [ 'Tribune', 'Broadsheet', 'Stratum', 'Broadside' ],
		},
		{
			label: __( 'Minimal', 'aldus' ),
			names: [ 'Solstice', 'Overture', 'Mirage' ],
		},
		{
			label: __( 'Visual', 'aldus' ),
			names: [ 'Mosaic', 'Prism' ],
		},
	];

	return (
		<>
			<InspectorControls>
				{ /* Quick start presets panel */ }
				<PanelBody
					title={ __( 'Quick start', 'aldus' ) }
					initialOpen={ false }
				>
					<p className="aldus-panel-hint">
						{ __(
							'Load a template and edit from there.',
							'aldus'
						) }
					</p>
					<div className="aldus-quickstart-list">
						{ PRESETS.map( ( preset ) => (
							<button
								key={ preset.id }
								className="aldus-quickstart-item"
								onClick={ () => loadPreset( preset ) }
							>
								<span className="aldus-quickstart-name">
									{ preset.name }
								</span>
								<span className="aldus-quickstart-desc">
									{ preset.description }
								</span>
							</button>
						) ) }
					</div>
				</PanelBody>
				{ /* Layout styles panel */ }
				<PanelBody
					title={ __( 'Layout styles', 'aldus' ) }
					initialOpen={ false }
				>
					<p className="aldus-panel-hint">
						{ sprintf(
							/* translators: 1: active count, 2: total count */
							__( '%1$d of %2$d styles active', 'aldus' ),
							enabledPersonalities.length,
							ACTIVE_PERSONALITIES.length
						) }
					</p>
					{ PERSONALITY_GROUPS.map( ( group ) => (
						<div key={ group.label } className="aldus-style-group">
							<span className="aldus-style-group-label">
								{ group.label }
							</span>
							<div className="aldus-style-group-pills">
								{ group.names.map( ( name ) => {
									const isActive =
										enabledPersonalities.includes( name );
									const personality = PERSONALITIES.find(
										( p ) => p.name === name
									);
									return (
										<Tooltip
											key={ name }
											text={
												personality?.description ?? ''
											}
										>
											<button
												className={ `aldus-style-pill${
													isActive ? ' is-active' : ''
												}` }
												onClick={ () =>
													togglePersonality( name )
												}
												aria-pressed={ isActive }
											>
												{ isActive && (
													<svg
														viewBox="0 0 12 12"
														width="10"
														height="10"
														className="aldus-style-pill-check"
													>
														<path
															d="M10 3L4.5 8.5 2 6"
															fill="none"
															stroke="currentColor"
															strokeWidth="1.5"
															strokeLinecap="round"
															strokeLinejoin="round"
														/>
													</svg>
												) }
												{ name }
											</button>
										</Tooltip>
									);
								} ) }
							</div>
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
			</InspectorControls>

			{ ( screen === SCREEN.RESULTS || screen === SCREEN.LOADING ) && (
				<BlockControls group="other">
					<ToolbarGroup>
						{ screen === SCREEN.RESULTS && (
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
				{ screen === SCREEN.BUILDING && (
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
							hasEngine={ isEngineReady }
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
				{ screen === SCREEN.DOWNLOADING && (
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
				{ screen === SCREEN.LOADING && (
					<div className="aldus-screen">
						<LoadingScreen
							message={ LOADING_MESSAGES[ msgIndex ] }
							msgVisible={ msgVisible }
							onAbort={ abortGenerate }
							genProgress={ genProgress }
						/>
					</div>
				) }
				{ screen === SCREEN.RESULTS && (
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
				{ screen === SCREEN.MIXING && (
					<div className="aldus-screen">
						<MixingScreen
							layouts={ layouts }
							onInsert={ insertMix }
							onBack={ backToResults }
						/>
					</div>
				) }
				{ screen === SCREEN.CONFIRMING && (
					<div className="aldus-screen">
						<ConfirmingScreen
							label={
								layouts.find( ( l ) => l._chosen )?.label ?? ''
							}
						/>
					</div>
				) }
				{ screen === SCREEN.INSERTED && (
					<InsertedScreen
						onRedesign={ () => setScreen( SCREEN.RESULTS ) }
						onDetach={ () => {
							const innerBlocks =
								wp.data
									.select( blockEditorStore )
									.getBlock( clientId )?.innerBlocks ?? [];
							replaceBlocks( clientId, innerBlocks );
						} }
						insertedPersonality={ attributes.insertedPersonality }
					/>
				) }
				{ screen === SCREEN.ERROR && (
					<div className="aldus-screen">
						<ErrorScreen
							code={ errorCode }
							retryCount={ retryCount }
							errorDetail={ errorDetail }
							onRetry={ () => setScreen( SCREEN.BUILDING ) }
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
						{ /* Steps — compact */ }
						<div className="aldus-help-steps">
							<div className="aldus-help-step">
								<span className="aldus-help-step-num">1</span>
								<div>
									<strong>
										{ __( "Add what you've got", 'aldus' ) }
									</strong>
									<p>
										{ __(
											'A headline, some text, an image — whatever the page needs.',
											'aldus'
										) }
									</p>
								</div>
							</div>
							<div className="aldus-help-step">
								<span className="aldus-help-step-num">2</span>
								<div>
									<strong>
										{ __( 'Aldus designs it', 'aldus' ) }
									</strong>
									<p>
										{ __(
											'Each with its own structure and mood — editorial, cinematic, minimal, bold.',
											'aldus'
										) }
									</p>
								</div>
							</div>
							<div className="aldus-help-step">
								<span className="aldus-help-step-num">3</span>
								<div>
									<strong>
										{ __(
											'Pick one and publish',
											'aldus'
										) }
									</strong>
									<p>
										{ __(
											'It becomes real blocks. Edit, rearrange, or redesign anytime.',
											'aldus'
										) }
									</p>
								</div>
							</div>
						</div>

						{ /* Visual: same content, four personalities */ }
						<div className="aldus-help-previews">
							<p className="aldus-help-previews-label">
								{ __(
									'Same content. Different energy.',
									'aldus'
								) }
							</p>
							<div className="aldus-help-previews-row">
								{ [
									'Dispatch',
									'Folio',
									'Nocturne',
									'Solstice',
								].map( ( name ) => {
									const p = PERSONALITIES.find(
										( x ) => x.name === name
									);
									return p ? (
										<div
											key={ name }
											className="aldus-help-preview-card"
										>
											<div className="aldus-help-preview-wireframe">
												<LayoutWireframe
													tokens={
														p
															.exampleSequences?.[ 0 ] ??
														p.anchors ??
														[]
													}
												/>
											</div>
											<span className="aldus-help-preview-name">
												{ name }
											</span>
										</div>
									) : null;
								} ) }
							</div>
						</div>

						{ /* Browse styles callout */ }
						<div className="aldus-help-callout">
							<strong>
								{ __(
									'Want to see it in action first?',
									'aldus'
								) }
							</strong>{ ' ' }
							{ __(
								'Switch to the "Browse styles" tab to preview every layout style with real content — no download needed.',
								'aldus'
							) }
						</div>

						{ /* Keyboard shortcuts — collapsed into a disclosure */ }
						<details className="aldus-help-shortcuts">
							<summary className="aldus-help-shortcuts-summary">
								{ __( 'Keyboard shortcuts', 'aldus' ) }
							</summary>
							<div className="aldus-help-shortcut-list">
								<div>
									<kbd className="aldus-kbd">⌘↵</kbd>{ ' ' }
									{ __( 'Generate', 'aldus' ) }
								</div>
								<div>
									<kbd className="aldus-kbd">⇧⌘R</kbd>{ ' ' }
									{ __( 'Regenerate', 'aldus' ) }
								</div>
								<div>
									<kbd className="aldus-kbd">Esc</kbd>{ ' ' }
									{ __( 'Cancel / go back', 'aldus' ) }
								</div>
							</div>
						</details>
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
 * @param {Function} props.onRedesign          Callback to go back to the results screen.
 * @param {Function} props.onDetach            Callback to unwrap inner blocks and remove Aldus.
 * @param {string}   props.insertedPersonality Name of the personality that was inserted.
 */
function InsertedScreen( { onRedesign, onDetach, insertedPersonality } ) {
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'aldus-wrapper-inner' },
		{ templateLock: 'contentOnly' }
	);
	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Aldus Layout', 'aldus' ) }>
					<p
						style={ {
							fontSize: '13px',
							color: '#757575',
							margin: '0 0 12px',
						} }
					>
						{ sprintf(
							/* translators: %s is the personality name */
							__( 'Current style: %s', 'aldus' ),
							insertedPersonality || __( 'Unknown', 'aldus' )
						) }
					</p>
					<Button
						variant="secondary"
						onClick={ onRedesign }
						style={ {
							width: '100%',
							justifyContent: 'center',
							marginBottom: '8px',
						} }
					>
						{ __( 'Redesign', 'aldus' ) }
					</Button>
					<Button
						variant="tertiary"
						isDestructive
						onClick={ onDetach }
						style={ { width: '100%', justifyContent: 'center' } }
					>
						{ __( 'Detach from Aldus', 'aldus' ) }
					</Button>
				</PanelBody>
			</InspectorControls>
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
