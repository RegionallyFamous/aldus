/**
 * BuildingScreen — the main content-building UI screen.
 * Includes all sub-components: OnboardingTooltip, EmptyState, AddContentPopover,
 * CompletenessHints, ScanAllWireframes, QuickPeek, itemsToBlocks, ContentMinimap.
 */

import {
	useState,
	useCallback,
	useRef,
	useMemo,
	useEffect,
} from '@wordpress/element';
import { Button, Notice, Popover, Spinner, Icon } from '@wordpress/components';
import { BlockPreview } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import { parse as parseBlocks } from '@wordpress/blocks';
import { __, sprintf, _n } from '@wordpress/i18n';
import { close, plus } from '@wordpress/icons';
import { ACTIVE_PERSONALITIES } from '../data/personalities.js';
import {
	HINT_TYPE_LABELS,
	HINT_TYPE_OUTCOMES,
	TOKEN_CONTENT_REQUIREMENTS,
} from '../data/tokens.js';
import {
	PRIMARY_CONTENT_TYPES,
	SECONDARY_CONTENT_TYPES,
} from '../data/content-types.js';
import { PRESETS } from '../data/presets.js';
import { PACK_META } from '../sample-data/index.js';

const DEFAULT_PACK_INDEX = 0;
import { uid } from '../lib/uid.js';
import { safeIcon } from '../utils/safeIcon';
import { ContentItem } from './ContentItem.js';
import { StyleNoteField, SavedSessions } from './SavedSessions.js';
import { LayoutWireframe } from './LayoutWireframe.js';

// ---------------------------------------------------------------------------
// Screen: Building
// ---------------------------------------------------------------------------

export function BuildingScreen( {
	items,
	setItems,
	addItem,
	updateItem,
	removeItem,
	moveItem,
	reorderItems,
	generate,
	isGenerating,
	hasEngine,
	hasDownloadedModel,
	lastFocusRef,
	buildingMode,
	setBuildingMode,
	onPreview,
	styleNote,
	onStyleNoteChange,
	noWebGPU,
	editorBlocks,
	pinnedPersonality,
	onClearPinnedPersonality,
	loadPreset,
	onboardingStep,
	onOnboardingNext,
	contentHints = [],
	onDismissHint,
} ) {
	const dragIdRef = useRef( null );
	const removeTimerRef = useRef( null );
	const emptyWarningTimerRef = useRef( null );
	const hasAutoFiredPreviewRef = useRef( false );
	useEffect( () => {
		if ( buildingMode === 'preview' && ! hasAutoFiredPreviewRef.current ) {
			hasAutoFiredPreviewRef.current = true;
			onPreview( PACK_META[ DEFAULT_PACK_INDEX ] );
		} else if ( buildingMode !== 'preview' ) {
			hasAutoFiredPreviewRef.current = false;
		}
	}, [ buildingMode, onPreview ] );
	const [ dragging, setDragging ] = useState( null );
	const [ dragOver, setDragOver ] = useState( null );
	const [ removingId, setRemovingId ] = useState( null ); // Pass 6: exit animation
	const [ hasReordered, setHasReordered ] = useState( false );
	const [ showEmptyWarning, setShowEmptyWarning ] = useState( false );
	const canGenerate = items.length > 0;
	const hasEmptyItems = items.some(
		( i ) =>
			! i.content.trim() &&
			i.type !== 'image' &&
			i.type !== 'gallery' &&
			i.type !== 'video'
	);

	// Clear pending timers on unmount.
	useEffect( () => {
		return () => {
			if ( emptyWarningTimerRef.current ) {
				clearTimeout( emptyWarningTimerRef.current );
			}
		};
	}, [] );

	const importFromEditor = useCallback( () => {
		const newItems = [];

		const walk = ( blocks ) => {
			for ( const block of blocks ) {
				const name = block.name ?? '';
				const attrs = block.attributes ?? {};
				const inner = block.innerContent ?? [];
				const text = inner
					.filter( Boolean )
					.join( '' )
					.replace( /<[^>]*>/g, ' ' )
					.replace( /\s+/g, ' ' )
					.trim();

				if ( name === 'core/heading' && text ) {
					newItems.push( {
						type:
							( attrs.level ?? 2 ) <= 1
								? 'headline'
								: 'subheading',
						content: text,
					} );
				} else if ( name === 'core/paragraph' && text ) {
					newItems.push( { type: 'paragraph', content: text } );
				} else if (
					name === 'core/image' &&
					( attrs.url || attrs.src )
				) {
					newItems.push( {
						type: 'image',
						content: attrs.alt ?? '',
						url: attrs.url ?? attrs.src ?? '',
					} );
				} else if (
					name === 'core/quote' ||
					name === 'core/pullquote'
				) {
					const qText = ( block.innerBlocks ?? [] )
						.flatMap( ( b ) => b.innerContent ?? [] )
						.filter( Boolean )
						.join( '' )
						.replace( /<[^>]*>/g, ' ' )
						.replace( /\s+/g, ' ' )
						.trim();
					if ( qText ) {
						newItems.push( { type: 'quote', content: qText } );
					}
				} else if ( name === 'core/list' ) {
					const listText = ( block.innerBlocks ?? [] )
						.flatMap( ( b ) => b.innerContent ?? [] )
						.filter( Boolean )
						.join( '\n' )
						.replace( /<[^>]*>/g, '' )
						.replace( /\s+/g, ' ' )
						.trim();
					if ( listText ) {
						newItems.push( { type: 'list', content: listText } );
					}
				} else if ( name === 'core/buttons' ) {
					const btnText = ( block.innerBlocks ?? [] )
						.flatMap( ( b ) => b.innerContent ?? [] )
						.filter( Boolean )
						.join( '' )
						.replace( /<[^>]*>/g, '' )
						.replace( /\s+/g, ' ' )
						.trim();
					if ( btnText ) {
						newItems.push( {
							type: 'cta',
							content: btnText,
							url:
								block.innerBlocks?.[ 0 ]?.attributes?.url ??
								'#',
						} );
					}
				} else {
					walk( block.innerBlocks ?? [] );
				}
			}
		};

		walk( editorBlocks );

		if ( newItems.length > 0 ) {
			setItems( ( prev ) => [
				...prev,
				...newItems.map( ( i ) => ( {
					id: uid(),
					url: '',
					...i,
				} ) ),
			] );
		}
	}, [ editorBlocks, setItems ] );

	// Clear the removal timer if BuildingScreen unmounts mid-animation.
	useEffect( () => {
		return () => {
			if ( removeTimerRef.current ) {
				clearTimeout( removeTimerRef.current );
			}
		};
	}, [] );

	// Pass 6: animate removal before unmounting
	const handleRemove = useCallback(
		( id ) => {
			setRemovingId( id );
			removeTimerRef.current = setTimeout( () => {
				removeItem( id );
				setRemovingId( null );
			}, 150 );
		},
		[ removeItem ]
	);

	const handleDragStart = useCallback( ( id ) => {
		dragIdRef.current = id;
		requestAnimationFrame( () => setDragging( id ) );
	}, [] );

	const handleDragEnd = useCallback( () => {
		dragIdRef.current = null;
		setDragging( null );
		setDragOver( null );
	}, [] );

	const handleDragOver = useCallback( ( e, id ) => {
		if ( ! dragIdRef.current || dragIdRef.current === id ) {
			return;
		}
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		setDragOver( id );
	}, [] );

	const handleDrop = useCallback(
		( e, targetId ) => {
			e.preventDefault();
			const fromId = dragIdRef.current;
			if ( fromId && fromId !== targetId ) {
				reorderItems( fromId, targetId );
				setHasReordered( true );
			}
			dragIdRef.current = null;
			setDragging( null );
			setDragOver( null );
		},
		[ reorderItems ]
	);

	const handleGenerate = useCallback( () => {
		if ( hasEmptyItems ) {
			setShowEmptyWarning( true );
			if ( emptyWarningTimerRef.current ) {
				clearTimeout( emptyWarningTimerRef.current );
			}
			emptyWarningTimerRef.current = setTimeout( () => {
				setShowEmptyWarning( false );
				emptyWarningTimerRef.current = null;
			}, 4000 );
		}
		generate();
	}, [ hasEmptyItems, generate ] );

	return (
		<div className="aldus-builder">
			<header className="aldus-header">
				<div className="aldus-header-top">
					<span
						className="aldus-stamp"
						aria-label={ __( 'Aldus', 'aldus' ) }
					>
						aldus
					</span>
					{ buildingMode === 'content' && items.length > 0 && (
						<span className="aldus-item-count">
							{ sprintf(
								/* translators: %d is the number of content pieces added */
								_n(
									'%d piece',
									'%d pieces',
									items.length,
									'aldus'
								),
								items.length
							) }
						</span>
					) }
					<div className="aldus-header-actions">
						<SavedSessions
							items={ items }
							styleNote={ styleNote }
							onLoad={ ( loadedItems, loadedStyleNote ) => {
								setItems(
									loadedItems.map( ( i ) => ( {
										...i,
										id: uid(),
									} ) )
								);
								if ( loadedStyleNote !== undefined ) {
									onStyleNoteChange( loadedStyleNote );
								}
							} }
						/>
					</div>
				</div>

				{ /* Mode tabs */ }
				<div className="aldus-mode-tabs" role="tablist">
					<button
						role="tab"
						aria-selected={ buildingMode === 'content' }
						className={ `aldus-mode-tab ${
							buildingMode === 'content' ? 'is-active' : ''
						}` }
						onClick={ () => setBuildingMode( 'content' ) }
					>
						{ __( 'Your content', 'aldus' ) }
					</button>
					<button
						role="tab"
						aria-selected={ buildingMode === 'preview' }
						className={ `aldus-mode-tab ${
							buildingMode === 'preview' ? 'is-active' : ''
						}` }
						onClick={ () => setBuildingMode( 'preview' ) }
					>
						{ __( 'Browse styles', 'aldus' ) }
					</button>
				</div>
			</header>

			{ buildingMode === 'content' && (
				<>
					{ noWebGPU && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'Your browser doesn\'t support WebGPU — you can still browse sample layouts in the "Browse styles" tab.',
								'aldus'
							) }
						</Notice>
					) }
					{ items.length === 0 && (
						<EmptyState
							onAdd={ addItem }
							editorBlocks={ editorBlocks }
							onImportFromEditor={ importFromEditor }
							onLoadPreset={ loadPreset }
							showOnboarding={ onboardingStep === 0 }
							onOnboardingNext={ onOnboardingNext }
						/>
					) }

					{ items.length > 0 && (
						<>
							<p className="aldus-section-label">
								{ __( 'Your content', 'aldus' ) }
							</p>
							<div
								className="aldus-item-list"
								role="list"
								aria-label={ __( 'Content items', 'aldus' ) }
							>
								{ items.map( ( item, index ) => (
									<ContentItem
										key={ item.id }
										item={ item }
										index={ index }
										total={ items.length }
										shouldFocus={
											lastFocusRef.current === item.id
										}
										onUpdate={ ( patch ) =>
											updateItem( item.id, patch )
										}
										onRemove={ () =>
											handleRemove( item.id )
										}
										onMoveUp={ () =>
											moveItem( item.id, -1 )
										}
										onMoveDown={ () =>
											moveItem( item.id, 1 )
										}
										onDragStart={ () =>
											handleDragStart( item.id )
										}
										onDragEnd={ handleDragEnd }
										onDragOver={ ( e ) =>
											handleDragOver( e, item.id )
										}
										onDragLeave={ () =>
											setDragOver( null )
										}
										onDrop={ ( e ) =>
											handleDrop( e, item.id )
										}
										isDragging={ dragging === item.id }
										isDragOver={
											dragOver === item.id &&
											dragging !== item.id
										}
										isRemoving={ removingId === item.id }
									/>
								) ) }
							</div>
							{ items.length >= 3 && ! hasReordered && (
								<p className="aldus-reorder-hint">
									{ __(
										'Drag the handle ↕ to reorder items.',
										'aldus'
									) }
								</p>
							) }
						</>
					) }

					{ items.length > 0 && (
						<CompletenessHints items={ items } onAdd={ addItem } />
					) }

					{ items.length > 0 && <ContentMinimap items={ items } /> }

					{ /* Item 3: Trailing + button replaces the dedicated Add content row */ }
					{ items.length > 0 && (
						<div className="aldus-add-after-list">
							<AddContentPopover onAdd={ addItem } isInline />
						</div>
					) }

					{ items.length > 0 && (
						<OnboardingTooltip
							show={ onboardingStep === 1 }
							text={ __(
								'Add optional style hints — "minimal", "bold CTA", "image-forward" — or pick a chip. These guide the layout model.',
								'aldus'
							) }
							onDismiss={ onOnboardingNext }
						>
							<StyleNoteField
								value={ styleNote }
								onChange={ onStyleNoteChange }
							/>
						</OnboardingTooltip>
					) }

					{ showEmptyWarning && (
						<Notice
							status="warning"
							isDismissible={ false }
							className="aldus-empty-content-warning"
						>
							{ __(
								'Some items have no content yet — fill them in for better results.',
								'aldus'
							) }
						</Notice>
					) }

					{ pinnedPersonality && (
						<div className="aldus-pinned-personality">
							<span>
								{ sprintf(
									/* translators: %s: personality name */
									__(
										'Leading with %s when you generate',
										'aldus'
									),
									pinnedPersonality
								) }
							</span>
							<Button
								icon={ safeIcon( close ) }
								label={ __( 'Remove focus', 'aldus' ) }
								size="small"
								onClick={ onClearPinnedPersonality }
							/>
						</div>
					) }

					{ /* Item 19: QuickPeek compact strip — just above the generate button */ }
					{ items.length > 0 && <QuickPeek items={ items } /> }

					{ items.length > 0 && (
						<OnboardingTooltip
							show={ onboardingStep === 2 }
							text={ __(
								'Hit "Make it happen" to see sixteen layout options for your content. The AI model downloads once (~200 MB) and is cached in your browser forever.',
								'aldus'
							) }
							onDismiss={ onOnboardingNext }
						>
							<div className="aldus-generate-row">
								<Button
									__next40pxDefaultSize
									variant="primary"
									onClick={ handleGenerate }
									disabled={
										! canGenerate ||
										isGenerating ||
										noWebGPU
									}
									className="aldus-generate-btn"
								>
									{ isGenerating && <Spinner /> }
									{ ! isGenerating &&
										( noWebGPU
											? __( 'Requires WebGPU', 'aldus' )
											: __(
													'Make it happen',
													'aldus'
											  ) ) }
									{ ! isGenerating && ! noWebGPU && (
										<kbd className="aldus-kbd">⌘↵</kbd>
									) }
								</Button>
								{ ! hasEngine &&
									canGenerate &&
									! hasDownloadedModel && (
										<span className="aldus-hint aldus-hint--download">
											{ __(
												'First run downloads a small AI model (~200 MB, one time only). After that, Aldus works instantly — even offline.',
												'aldus'
											) }
										</span>
									) }
							</div>
						</OnboardingTooltip>
					) }
				</>
			) }
			{ contentHints.length > 0 && (
				<div className="aldus-hint-pills">
					{ contentHints.map( ( hint ) => (
						<span key={ hint } className="aldus-hint-pill">
							{ hint }
							<button
								type="button"
								className="aldus-hint-pill-dismiss"
								aria-label={ __( 'Dismiss hint', 'aldus' ) }
								onClick={ () => onDismissHint?.( hint ) }
							>
								&times;
							</button>
						</span>
					) ) }
				</div>
			) }
		</div>
	);
}

// ---------------------------------------------------------------------------
// Onboarding tooltip — shown once to first-time users.
// ---------------------------------------------------------------------------

/**
 * Wraps a child element with a floating "Got it" tooltip for onboarding.
 *
 * @param {Object}   props
 * @param {boolean}  props.show      Whether the tooltip is currently active.
 * @param {string}   props.text      Descriptive text shown in the tooltip.
 * @param {Function} props.onDismiss Callback fired when the user dismisses.
 * @param {*}        props.children  The element to annotate.
 */
function OnboardingTooltip( { show, text, onDismiss, children } ) {
	if ( ! show ) {
		return children;
	}
	return (
		<div className="aldus-onboarding-anchor">
			{ children }
			<div className="aldus-onboarding-tooltip" role="status">
				<p className="aldus-onboarding-tooltip-text">{ text }</p>
				<button
					className="aldus-onboarding-tooltip-dismiss"
					onClick={ onDismiss }
				>
					{ __( 'Got it', 'aldus' ) }
				</button>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Pass 7: Empty state with content type grid
// ---------------------------------------------------------------------------

function EmptyState( {
	onAdd,
	editorBlocks,
	onImportFromEditor,
	onLoadPreset,
	showOnboarding = false,
	onOnboardingNext,
} ) {
	// Summarise the editor's existing block tree into a human-readable hint
	// shown beneath the import button, e.g. "4 headings · 6 paragraphs · 2 images".
	const editorBlocksSummary = useMemo( () => {
		if ( ! editorBlocks?.length ) {
			return '';
		}
		const counts = {
			heading: 0,
			paragraph: 0,
			image: 0,
			quote: 0,
			list: 0,
		};
		const walk = ( blocks ) => {
			for ( const b of blocks ) {
				if ( b.name === 'core/heading' ) {
					counts.heading++;
				} else if ( b.name === 'core/paragraph' ) {
					counts.paragraph++;
				} else if ( b.name === 'core/image' ) {
					counts.image++;
				} else if (
					b.name === 'core/quote' ||
					b.name === 'core/pullquote'
				) {
					counts.quote++;
				} else if ( b.name === 'core/list' ) {
					counts.list++;
				}
				if ( b.innerBlocks?.length ) {
					walk( b.innerBlocks );
				}
			}
		};
		walk( editorBlocks );
		return Object.entries( counts )
			.filter( ( [ , n ] ) => n > 0 )
			.map( ( [ type, n ] ) => `${ n } ${ type }${ n > 1 ? 's' : '' }` )
			.join( ' · ' );
	}, [ editorBlocks ] );

	const hasEditorContent = editorBlocks?.length > 0;

	return (
		<div className="aldus-empty">
			<p className="aldus-empty-headline">
				{ __( 'What do you want to say?', 'aldus' ) }
			</p>
			<p className="aldus-empty-sub">
				{ __(
					'Add your content, then Aldus shows you sixteen ways to arrange it.',
					'aldus'
				) }
			</p>

			{ hasEditorContent && (
				<div className="aldus-empty-import-wrap">
					<button
						className="aldus-empty-import-btn"
						onClick={ onImportFromEditor }
					>
						{ __( 'Import content from this page', 'aldus' ) }
					</button>
					{ editorBlocksSummary && (
						<p className="aldus-empty-import-summary">
							{ editorBlocksSummary }
						</p>
					) }
				</div>
			) }

			<div className="aldus-empty-divider">
				<span>
					{ hasEditorContent
						? __( 'or start with a template', 'aldus' )
						: __( 'Start with a template', 'aldus' ) }
				</span>
			</div>

			<div className="aldus-empty-preset-grid">
				{ PRESETS.map( ( preset ) => (
					<button
						key={ preset.id }
						className="aldus-empty-preset-card"
						onClick={ () => onLoadPreset?.( preset ) }
					>
						<strong className="aldus-empty-preset-card-name">
							{ preset.name }
						</strong>
						<span className="aldus-empty-preset-card-desc">
							{ preset.description }
						</span>
					</button>
				) ) }
			</div>

			<OnboardingTooltip
				show={ showOnboarding }
				text={ __(
					"Start by picking a template or adding content manually. Once you've added something, you'll be able to generate your layout.",
					'aldus'
				) }
				onDismiss={ onOnboardingNext }
			>
				<button
					className="aldus-empty-manual-link"
					onClick={ () => {
						onAdd?.( 'headline' );
						if ( showOnboarding ) {
							onOnboardingNext?.();
						}
					} }
				>
					{ __( 'Add content manually', 'aldus' ) }
				</button>
			</OnboardingTooltip>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Pass 1: AddContentPopover — replaces flat add-button row
// ---------------------------------------------------------------------------

function AddContentPopover( { onAdd, isInline = false } ) {
	const [ isOpen, setIsOpen ] = useState( false );
	const [ showSecondary, setShowSecondary ] = useState( false );
	const wrapRef = useRef( null );

	const renderTypeList = ( types, isSecondaryGroup = false ) =>
		types.map( ( t ) => (
			<button
				key={ t.type }
				className={ `aldus-inserter-item${
					isSecondaryGroup ? ' aldus-inserter-item--secondary' : ''
				}` }
				onClick={ () => {
					onAdd( t.type );
					setIsOpen( false );
					setShowSecondary( false );
				} }
			>
				<span className="aldus-inserter-icon">
					<Icon icon={ t.icon } size={ 20 } />
				</span>
				<span className="aldus-inserter-label">{ t.label }</span>
				<span className="aldus-inserter-desc">{ t.description }</span>
			</button>
		) );

	return (
		<div
			className={ `aldus-add-wrap${
				isInline ? ' aldus-add-wrap--inline' : ''
			}` }
			ref={ wrapRef }
		>
			<Button
				__next40pxDefaultSize
				icon={ safeIcon( plus ) }
				variant={ isInline ? 'tertiary' : 'secondary' }
				className={ `aldus-add-trigger${
					isInline ? ' aldus-add-trigger--inline' : ''
				}` }
				onClick={ () => {
					setIsOpen( ( v ) => ! v );
					setShowSecondary( false );
				} }
				aria-expanded={ isOpen }
				label={ isInline ? __( 'Add content', 'aldus' ) : undefined }
			>
				{ ! isInline && __( 'Add content', 'aldus' ) }
			</Button>
			{ isOpen && (
				<Popover
					anchor={ wrapRef.current }
					placement="bottom-start"
					onClose={ () => {
						setIsOpen( false );
						setShowSecondary( false );
					} }
					noArrow
				>
					<div className="aldus-inserter">
						{ renderTypeList( PRIMARY_CONTENT_TYPES ) }
						{ showSecondary ? (
							renderTypeList( SECONDARY_CONTENT_TYPES, true )
						) : (
							<button
								className="aldus-inserter-more"
								onClick={ () => setShowSecondary( true ) }
							>
								{ __( 'More types ▾', 'aldus' ) }
							</button>
						) }
					</div>
				</Popover>
			) }
		</div>
	);
}

// ---------------------------------------------------------------------------
// Completeness hints — tell the user which content types unlock more sections
// ---------------------------------------------------------------------------

function CompletenessHints( { items, onAdd } ) {
	const presentTypes = useMemo(
		() => new Set( items.map( ( i ) => i.type ) ),
		[ items ]
	);

	const hints = useMemo( () => {
		// Count how many distinct layouts contain a token requiring each missing content type.
		const layoutCounts = {};
		for ( const p of ACTIVE_PERSONALITIES ) {
			// Flatten all example sequences for this personality into a deduplicated token set.
			const allTokens = new Set( ( p.exampleSequences ?? [] ).flat() );
			const missingForThisPersonality = new Set();
			for ( const token of allTokens ) {
				const required = TOKEN_CONTENT_REQUIREMENTS[ token ];
				if ( required && ! presentTypes.has( required ) ) {
					missingForThisPersonality.add( required );
				}
			}
			for ( const type of missingForThisPersonality ) {
				layoutCounts[ type ] = ( layoutCounts[ type ] ?? 0 ) + 1;
			}
		}
		return Object.entries( layoutCounts )
			.sort( ( a, b ) => b[ 1 ] - a[ 1 ] )
			.slice( 0, 3 );
	}, [ presentTypes ] );

	if ( hints.length === 0 ) {
		return null;
	}

	return (
		<div
			className="aldus-hints"
			aria-label={ __( 'Content suggestions', 'aldus' ) }
		>
			{ hints.map( ( [ type ] ) => (
				<button
					key={ type }
					className="aldus-hint-pill"
					onClick={ () => onAdd( type ) }
				>
					<span className="aldus-hint-pill-plus">+</span>
					{ sprintf(
						/* translators: 1: content type label e.g. "Image", 2: outcome description */
						__( '%1$s → %2$s', 'aldus' ),
						HINT_TYPE_LABELS[ type ] ?? type,
						HINT_TYPE_OUTCOMES[ type ] ?? type
					) }
				</button>
			) ) }
		</div>
	);
}

// ---------------------------------------------------------------------------
// Scan-all wireframes — instant structural grid for all personalities
// ---------------------------------------------------------------------------

/**
 * Renders a 4-column grid of layout wireframes for every active personality
 * using their first exampleSequences entry.  No API call is made.
 */
function ScanAllWireframes() {
	// Sequences are chosen once when this panel mounts, not on every re-render.
	// Using useMemo with an empty dep array gives stable wireframes during the
	// user's inspection session; they see a fresh random pick each time they
	// open the panel (component unmounts/remounts on toggle).
	const sequences = useMemo(
		() =>
			ACTIVE_PERSONALITIES.map( ( p ) => {
				const seqs =
					p.exampleSequences?.length > 0
						? p.exampleSequences
						: [ p.anchors ];
				return seqs[ Math.floor( Math.random() * seqs.length ) ];
			} ),
		[] // eslint-disable-line react-hooks/exhaustive-deps
	);

	return (
		<div className="aldus-scan-all">
			<p className="aldus-scan-all-hint">
				{ __(
					'Structural previews — these show layout shape, not your content.',
					'aldus'
				) }
			</p>
			<div className="aldus-scan-all-grid">
				{ ACTIVE_PERSONALITIES.map( ( p, idx ) => (
					<div key={ p.name } className="aldus-scan-all-card">
						<LayoutWireframe tokens={ sequences[ idx ] } />
						<span className="aldus-scan-all-label">{ p.name }</span>
					</div>
				) ) }
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Quick peek — instant no-model personality preview with user content
// ---------------------------------------------------------------------------

function QuickPeek( { items } ) {
	const [ peekPersonality, setPeekPersonality ] = useState( null );
	const [ peekBlocks, setPeekBlocks ] = useState( null );
	const [ isPeeking, setIsPeeking ] = useState( false );
	const [ showScanAll, setShowScanAll ] = useState( false );
	const [ showAllPills, setShowAllPills ] = useState( false );
	// Monotonically increasing counter so stale responses from earlier requests
	// are discarded when a newer request is in flight.
	const peekRequestIdRef = useRef( 0 );

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

	// Pick 5 personalities to show in the compact strip.
	// Stabilised per-mount so the user sees the same set during their session.
	const compactPersonalities = useMemo( () => {
		const shuffled = [ ...ACTIVE_PERSONALITIES ].sort(
			() => Math.random() - 0.5
		);
		return shuffled.slice( 0, 5 );
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	const handlePeek = useCallback(
		async ( personality ) => {
			if ( isPeeking ) {
				return;
			}
			// Toggle off if the same personality is clicked again.
			if (
				peekPersonality &&
				peekPersonality.name === personality.name &&
				peekBlocks
			) {
				setPeekPersonality( null );
				setPeekBlocks( null );
				return;
			}
			const requestId = ++peekRequestIdRef.current;
			setPeekPersonality( personality );
			setPeekBlocks( null );
			setIsPeeking( true );
			try {
				const seqs =
					personality.exampleSequences?.length > 0
						? personality.exampleSequences
						: [ personality.anchors ];
				const seq = seqs[ Math.floor( Math.random() * seqs.length ) ];
				const result = await apiFetch( {
					path: '/aldus/v1/assemble',
					method: 'POST',
					data: {
						items,
						personality: personality.name,
						tokens: seq,
						custom_styles: customBlockStyles,
					},
				} );
				// Discard stale responses if a newer request has since been issued.
				if ( requestId !== peekRequestIdRef.current ) {
					return;
				}
				if ( result?.success && result?.blocks ) {
					setPeekBlocks( result.blocks );
				}
			} catch {
				if ( requestId === peekRequestIdRef.current ) {
					setPeekBlocks( null );
				}
			} finally {
				if ( requestId === peekRequestIdRef.current ) {
					setIsPeeking( false );
				}
			}
		},
		[ isPeeking, peekPersonality, peekBlocks, items, customBlockStyles ]
	);

	const parsedBlocks = useMemo( () => {
		if ( ! peekBlocks ) {
			return [];
		}
		try {
			return parseBlocks( peekBlocks ).filter( ( b ) => b?.name );
		} catch ( e ) {
			return [];
		}
	}, [ peekBlocks ] );

	const pillsToShow = showAllPills
		? ACTIVE_PERSONALITIES
		: compactPersonalities;

	return (
		<div className="aldus-quick-peek aldus-quick-peek--compact">
			<div className="aldus-peek-header">
				<span className="aldus-peek-label">
					{ __( 'Peek →', 'aldus' ) }
				</span>
				<div
					className="aldus-peek-chips"
					role="group"
					aria-label={ __( 'Personality quick peek', 'aldus' ) }
				>
					{ pillsToShow.map( ( p ) => (
						<button
							key={ p.name }
							className={ [
								'aldus-peek-chip',
								peekPersonality?.name === p.name
									? 'is-active'
									: '',
							]
								.filter( Boolean )
								.join( ' ' ) }
							onClick={ () => handlePeek( p ) }
							disabled={ isPeeking }
							title={ p.description }
						>
							{ p.name }
						</button>
					) ) }
					<button
						className="aldus-peek-more"
						onClick={ () => {
							setShowAllPills( ( v ) => ! v );
							setShowScanAll( false );
						} }
					>
						{ showAllPills
							? __( 'Less', 'aldus' )
							: __( 'All →', 'aldus' ) }
					</button>
				</div>
				{ ! showAllPills && (
					<button
						className={ [
							'aldus-scan-all-btn',
							showScanAll ? 'is-active' : '',
						]
							.filter( Boolean )
							.join( ' ' ) }
						onClick={ () => {
							setShowScanAll( ( v ) => ! v );
							setShowAllPills( false );
						} }
						title={ __(
							'See layout shapes for all personalities',
							'aldus'
						) }
					>
						{ showScanAll
							? __( 'Hide', 'aldus' )
							: __( 'Scan all', 'aldus' ) }
					</button>
				) }
			</div>
			{ showScanAll && <ScanAllWireframes /> }
			{ isPeeking && (
				<div className="aldus-peek-loading">
					<Spinner />
					<span>
						{ sprintf(
							/* translators: %s: personality name */
							__( 'Assembling %s…', 'aldus' ),
							peekPersonality?.name ?? ''
						) }
					</span>
				</div>
			) }
			{ peekBlocks && parsedBlocks.length > 0 && (
				<div className="aldus-peek-preview">
					<BlockPreview
						blocks={ parsedBlocks }
						viewportWidth={ 800 }
					/>
				</div>
			) }
		</div>
	);
}

// ---------------------------------------------------------------------------
// Content preview drawer — shows user items as raw block previews
// ---------------------------------------------------------------------------

function itemsToBlocks( items ) {
	return items
		.map( ( item ) => {
			switch ( item.type ) {
				case 'headline':
					return {
						name: 'core/heading',
						isValid: true,
						attributes: { level: 1, content: item.content ?? '' },
						innerBlocks: [],
					};
				case 'subheading':
					return {
						name: 'core/heading',
						isValid: true,
						attributes: { level: 2, content: item.content ?? '' },
						innerBlocks: [],
					};
				case 'paragraph':
					return {
						name: 'core/paragraph',
						isValid: true,
						attributes: { content: item.content ?? '' },
						innerBlocks: [],
					};
				case 'quote':
					return {
						name: 'core/quote',
						isValid: true,
						attributes: { value: item.content ?? '' },
						innerBlocks: [],
					};
				case 'image':
					return item.url
						? {
								name: 'core/image',
								isValid: true,
								attributes: { url: item.url, alt: '' },
								innerBlocks: [],
						  }
						: null;
				case 'list':
					return {
						name: 'core/paragraph',
						isValid: true,
						attributes: {
							content: `[List] ${ item.content ?? '' }`,
						},
						innerBlocks: [],
					};
				case 'cta':
					return {
						name: 'core/buttons',
						isValid: true,
						attributes: {},
						innerBlocks: [
							{
								name: 'core/button',
								isValid: true,
								attributes: { text: item.content ?? 'CTA' },
								innerBlocks: [],
							},
						],
					};
				case 'video':
					return item.url
						? {
								name: 'core/embed',
								isValid: true,
								attributes: {
									url: item.url,
									providerNameSlug: 'youtube',
								},
								innerBlocks: [],
						  }
						: null;
				case 'table':
					return {
						name: 'core/table',
						isValid: true,
						attributes: { caption: '' },
						innerBlocks: [],
					};
				case 'gallery':
					return ( item.urls ?? [] ).length > 0
						? {
								name: 'core/gallery',
								isValid: true,
								attributes: { columns: 2 },
								innerBlocks: ( item.urls ?? [] ).map(
									( url ) => ( {
										name: 'core/image',
										isValid: true,
										attributes: { url },
										innerBlocks: [],
									} )
								),
						  }
						: null;
				default:
					return null;
			}
		} )
		.filter( Boolean );
}

/**
 * Persistent minimap strip — a zoomed-out non-interactive preview of the user's
 * content items, always visible without requiring a click.
 *
 * @param {Object} props
 * @param {Array}  props.items Content items to preview.
 * @return {null|Element} The minimap or null when there is nothing to show.
 */
function ContentMinimap( { items } ) {
	const blocks = useMemo( () => itemsToBlocks( items ), [ items ] );
	if ( blocks.length === 0 ) {
		return null;
	}
	return (
		<div className="aldus-minimap" aria-hidden="true">
			<BlockPreview blocks={ blocks } viewportWidth={ 900 } />
		</div>
	);
}
