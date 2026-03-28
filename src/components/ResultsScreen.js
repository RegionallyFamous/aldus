/**
 * ResultsScreen — grid of generated layout cards for the user to choose from.
 * LayoutCard — individual card with wireframe preview and action overlay.
 */

import {
	useState,
	useCallback,
	useRef,
	useMemo,
	useEffect,
	useLayoutEffect,
} from '@wordpress/element';
import {
	Button,
	Modal,
	Spinner,
	TextControl,
	Flex,
} from '@wordpress/components';
import { BlockPreview } from '@wordpress/block-editor';
import { dispatch as wpDispatch } from '@wordpress/data';
import { blocksFromAssemblePayload } from '../lib/blocksFromAssemblePayload.js';
import { __, sprintf, _n } from '@wordpress/i18n';
import {
	seen,
	copy,
	reusableBlock,
	undo,
	starEmpty,
	starFilled,
	layout as layoutIcon,
} from '@wordpress/icons';
import {
	computeBestMatches,
	tokenShortLabel,
	scorePersonalityFit,
} from '../data/tokens.js';
import { ACTIVE_PERSONALITIES } from '../data/personalities.js';
import { LAYOUT_TAGLINES } from '../data/ui-strings.js';
import { LayoutWireframe } from './LayoutWireframe.js';
import { safeIcon } from '../utils/safeIcon';

/**
 * @param {Array}  items       Layout entries in visual order.
 * @param {number} columnCount Measured column count from the CSS grid.
 * @return {Array<Array>} Layout rows for `role="row"` wrappers.
 */
function chunkIntoRows( items, columnCount ) {
	const cols = Math.max( 1, columnCount );
	/** @type {Array<Array>} */
	const rows = [];
	for ( let i = 0; i < items.length; i += cols ) {
		rows.push( items.slice( i, i + cols ) );
	}
	return rows;
}

export function ResultsScreen( {
	layouts,
	chooseLayout,
	startOver,
	regenerate,
	isPreview,
	onReroll,
	rerollingLabel,
	rerollErrors,
	onMix,
	onTryWithContent,
	items = [],
	packs = [],
	activePreviewPack = null,
	onSwitchPack,
	autoStyle = '',
	beforeBlocks = [],
	filteredPersonalitiesCount = 0,
	showAllStyles = null,
	onRequestLayoutDescription = null,
} ) {
	const hasSections = layouts.some( ( l ) => l.sections?.length > 0 );
	const [ isCompact, setIsCompact ] = useState( layouts.length >= 8 );
	const [ filterText, setFilterText ] = useState( '' );
	const [ favorites, setFavorites ] = useState( [] );

	// Roving tabindex state for role="grid" arrow-key navigation (item 21).
	const [ focusedCardIndex, setFocusedCardIndex ] = useState( 0 );
	const gridRef = useRef( null );

	const handleGridKeyDown = useCallback(
		( event ) => {
			if ( ! gridRef.current ) {
				return;
			}
			const cards = Array.from(
				gridRef.current.querySelectorAll(
					'.aldus-card[role="gridcell"]'
				)
			);
			if ( cards.length === 0 ) {
				return;
			}
			// Derive column count from CSS grid at runtime so it works at any viewport.
			const colCount =
				Math.round(
					gridRef.current.offsetWidth /
						( cards[ 0 ].offsetWidth || 1 )
				) || 1;
			const current = focusedCardIndex;

			let next = current;
			if ( event.key === 'ArrowRight' ) {
				next = Math.min( current + 1, cards.length - 1 );
			} else if ( event.key === 'ArrowLeft' ) {
				next = Math.max( current - 1, 0 );
			} else if ( event.key === 'ArrowDown' ) {
				next = Math.min( current + colCount, cards.length - 1 );
			} else if ( event.key === 'ArrowUp' ) {
				next = Math.max( current - colCount, 0 );
			} else if ( event.key === 'Home' ) {
				next = 0;
			} else if ( event.key === 'End' ) {
				next = cards.length - 1;
			} else {
				return;
			}

			event.preventDefault();
			setFocusedCardIndex( next );
			cards[ next ]?.focus();
		},
		[ focusedCardIndex ]
	);

	const toggleFavorite = useCallback( ( label ) => {
		setFavorites( ( prev ) =>
			prev.includes( label )
				? prev.filter( ( l ) => l !== label )
				: [ ...prev, label ]
		);
	}, [] );

	// Personalities whose anchor content types are fully met by the user's items.
	const bestMatchSet = useMemo(
		() =>
			isPreview
				? new Set()
				: computeBestMatches( items, ACTIVE_PERSONALITIES ),
		[ items, isPreview ]
	);

	// Feature 2: Score personality fit and surface top-3 as recommendation badges.
	const manifest = useMemo( () => {
		const m = {};
		for ( const item of items ) {
			if ( item.type ) {
				m[ item.type ] = ( m[ item.type ] ?? 0 ) + 1;
			}
		}
		return m;
	}, [ items ] );

	const recommendedSet = useMemo( () => {
		if ( isPreview || layouts.length === 0 ) {
			return new Set();
		}
		const scores = scorePersonalityFit(
			layouts,
			manifest,
			ACTIVE_PERSONALITIES
		);
		const ranked = [ ...scores.entries() ]
			.filter( ( [ , score ] ) => score >= 0.8 )
			.sort( ( a, b ) => b[ 1 ] - a[ 1 ] )
			.slice( 0, 3 )
			.map( ( [ label ] ) => label );
		return new Set( ranked );
	}, [ layouts, manifest, isPreview ] );

	// Feature 3: Before/after compare state.
	const [ compareLayout, setCompareLayout ] = useState( null );
	const [ showBefore, setShowBefore ] = useState( false );
	const compareBlocks = useMemo( () => {
		if ( ! compareLayout ) {
			return [];
		}
		return blocksFromAssemblePayload( compareLayout );
	}, [ compareLayout ] );

	// Track re-roll completion to flash the updated card.
	const [ justRerolledLabel, setJustRerolledLabel ] = useState( null );
	const prevRerollingLabelRef = useRef( null );
	useEffect( () => {
		if ( rerollingLabel ) {
			prevRerollingLabelRef.current = rerollingLabel;
		} else if ( prevRerollingLabelRef.current ) {
			const finished = prevRerollingLabelRef.current;
			prevRerollingLabelRef.current = null;
			setJustRerolledLabel( finished );
			const t = setTimeout( () => setJustRerolledLabel( null ), 500 );
			return () => clearTimeout( t );
		}
	}, [ rerollingLabel ] );

	const visibleLayouts = useMemo( () => {
		const q = filterText.trim().toLowerCase();
		const filtered = q
			? layouts.filter( ( l ) =>
					( l.label + ' ' + ( LAYOUT_TAGLINES[ l.label ] ?? '' ) )
						.toLowerCase()
						.includes( q )
			  )
			: layouts;
		// Float favorited cards to the top.
		if ( favorites.length === 0 ) {
			return filtered;
		}
		const favSet = new Set( favorites );
		return [
			...filtered.filter( ( l ) => favSet.has( l.label ) ),
			...filtered.filter( ( l ) => ! favSet.has( l.label ) ),
		];
	}, [ layouts, filterText, favorites ] );

	const [ gridColumnCount, setGridColumnCount ] = useState( 2 );

	const measureGridColumns = useCallback( () => {
		const root = gridRef.current;
		if ( ! root ) {
			return;
		}
		const card = root.querySelector( '.aldus-card[role="gridcell"]' );
		if ( ! card ) {
			return;
		}
		const w = root.offsetWidth;
		const cw = card.offsetWidth || 1;
		const next = Math.max( 1, Math.round( w / cw ) );
		setGridColumnCount( ( prev ) => ( prev === next ? prev : next ) );
	}, [] );

	useLayoutEffect( () => {
		measureGridColumns();
		const root = gridRef.current;
		if ( ! root || typeof ResizeObserver === 'undefined' ) {
			return undefined;
		}
		const ro = new ResizeObserver( () => {
			measureGridColumns();
		} );
		ro.observe( root );
		return () => {
			ro.disconnect();
		};
	}, [ measureGridColumns, visibleLayouts.length, isCompact ] );

	return (
		<>
			<div className="aldus-results">
				<div className="aldus-results-sticky">
					<Flex
						align="center"
						justify="space-between"
						className="aldus-results-header"
					>
						<div>
							<span className="aldus-results-title">
								{ isPreview
									? __(
											'See what Aldus does with real content. Switch themes to try all styles.',
											'aldus'
									  )
									: __(
											'Your content, every which way. Pick the one that fits.',
											'aldus'
									  ) }
							</span>
							{ autoStyle && ! isPreview && (
								<p className="aldus-style-hint">
									{ sprintf(
										/* translators: %s: detected content style direction */
										__( 'Detected style: %s', 'aldus' ),
										autoStyle
									) }
								</p>
							) }
							<span className="aldus-results-count">
								{ sprintf(
									/* translators: %d is the number of layouts generated */
									_n(
										'%d layout',
										'%d layouts',
										layouts.length,
										'aldus'
									),
									layouts.length
								) }
							</span>
						</div>
						<Flex gap={ 2 }>
							{ layouts.length >= 8 && (
								<Button
									variant="tertiary"
									size="small"
									onClick={ () =>
										setIsCompact( ( v ) => ! v )
									}
								>
									{ isCompact
										? __( 'Detailed', 'aldus' )
										: __( 'Compact', 'aldus' ) }
								</Button>
							) }
							{ hasSections && (
								<Button
									variant="secondary"
									size="small"
									icon={ safeIcon( layoutIcon ) }
									onClick={ onMix }
								>
									{ __( 'Mix sections', 'aldus' ) }
								</Button>
							) }
							{ filteredPersonalitiesCount > 0 &&
								showAllStyles && (
									<Button
										variant="tertiary"
										size="small"
										onClick={ showAllStyles }
									>
										{ sprintf(
											/* translators: %d: number of hidden styles */
											__(
												'Show %d more styles',
												'aldus'
											),
											filteredPersonalitiesCount
										) }
									</Button>
								) }
							{ ! isPreview && (
								<Button
									variant="secondary"
									size="small"
									onClick={ regenerate }
								>
									{ __( 'Regenerate', 'aldus' ) }
									<kbd className="aldus-kbd">⇧⌘R</kbd>
								</Button>
							) }
							<Button
								variant="secondary"
								size="small"
								onClick={ startOver }
							>
								{ isPreview
									? __( 'Back to building', 'aldus' )
									: __( 'Start fresh', 'aldus' ) }
							</Button>
						</Flex>
					</Flex>
					{ isPreview && packs.length > 0 && (
						<div
							className="aldus-pack-pills"
							role="group"
							aria-label={ __( 'Switch pack', 'aldus' ) }
						>
							{ packs.map( ( p ) => (
								<button
									key={ p.id }
									className={ `aldus-pack-pill${
										p.id === activePreviewPack?.id
											? ' is-active'
											: ''
									}` }
									onClick={ () => onSwitchPack( p ) }
									aria-pressed={
										p.id === activePreviewPack?.id
									}
									style={
										p.id === activePreviewPack?.id
											? {
													background:
														p.palette.accent,
													borderColor:
														p.palette.accent,
											  }
											: {}
									}
									title={ p.description }
								>
									{ p.emoji && (
										<span
											className="aldus-pack-pill-emoji"
											aria-hidden="true"
										>
											{ p.emoji }
										</span>
									) }
									{ p.label }
								</button>
							) ) }
						</div>
					) }
					<p className="aldus-results-hint">
						{ hasSections
							? __(
									'Pick a layout below, or use Mix sections to combine parts from different personalities.',
									'aldus'
							  )
							: __(
									'Pick a layout below — click "Use this one" on any card.',
									'aldus'
							  ) }
					</p>
					{ layouts.length >= 8 && (
						<div className="aldus-results-filter">
							<TextControl
								label={ __( 'Filter layouts', 'aldus' ) }
								hideLabelFromVision
								value={ filterText }
								placeholder={ __(
									'Filter by personality…',
									'aldus'
								) }
								onChange={ setFilterText }
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							{ filterText && (
								<Button
									icon={ safeIcon( close ) }
									label={ __( 'Clear filter', 'aldus' ) }
									size="small"
									className="aldus-results-filter-clear"
									onClick={ () => setFilterText( '' ) }
								/>
							) }
						</div>
					) }
					{ favorites.length >= 2 && (
						<p className="aldus-favorites-hint">
							{ sprintf(
								/* translators: %d: number of favorited layouts */
								__(
									'You have %d favorites — mix their sections?',
									'aldus'
								),
								favorites.length
							) }{ ' ' }
							{ hasSections && (
								<button
									className="aldus-favorites-mix-link"
									onClick={ onMix }
								>
									{ __( 'Compare favorites →', 'aldus' ) }
								</button>
							) }
						</p>
					) }
				</div>
				{ /* end aldus-results-sticky */ }
				<div
					ref={ gridRef }
					className={ `aldus-grid${
						isCompact ? ' is-compact' : ''
					}` }
					role="grid"
					tabIndex={ -1 }
					aria-label={ __( 'Layout options', 'aldus' ) }
					onKeyDown={ handleGridKeyDown }
				>
					{ visibleLayouts.length > 0 ? (
						chunkIntoRows( visibleLayouts, gridColumnCount ).map(
							( rowLayouts, rowIndex ) => (
								<div
									key={ `aldus-grid-row-${ rowIndex }` }
									role="row"
									className="aldus-grid__row"
								>
									{ rowLayouts.map( ( layout, colIndex ) => {
										const index =
											rowIndex * gridColumnCount +
											colIndex;
										return (
											<LayoutCard
												key={ layout.label }
												layout={ layout }
												index={ index }
												isCompact={ isCompact }
												onChoose={ () =>
													chooseLayout( layout.label )
												}
												onReroll={
													onReroll
														? () =>
																onReroll(
																	layout.label
																)
														: null
												}
												isRerolling={
													rerollingLabel ===
													layout.label
												}
												hasRerollError={
													!! rerollErrors?.[
														layout.label
													]
												}
												justRerolled={
													justRerolledLabel ===
													layout.label
												}
												isBestMatch={ bestMatchSet.has(
													layout.label
												) }
												isRecommended={ recommendedSet.has(
													layout.label
												) }
												isFavorited={ favorites.includes(
													layout.label
												) }
												onToggleFavorite={ () =>
													toggleFavorite(
														layout.label
													)
												}
												onTryWithContent={
													onTryWithContent
														? () =>
																onTryWithContent(
																	layout.label
																)
														: null
												}
												onCompare={
													beforeBlocks.length > 0
														? () => {
																setCompareLayout(
																	layout
																);
																setShowBefore(
																	false
																);
														  }
														: null
												}
												items={ items }
												tabIndex={
													index === focusedCardIndex
														? 0
														: -1
												}
												onFocus={ () =>
													setFocusedCardIndex( index )
												}
												onRequestLayoutDescription={
													isPreview
														? null
														: onRequestLayoutDescription
												}
											/>
										);
									} ) }
								</div>
							)
						)
					) : (
						<p className="aldus-results-filter-empty">
							{ __(
								'No personalities match that name.',
								'aldus'
							) }
						</p>
					) }
				</div>
			</div>

			{ /* Feature 3: Before/after compare modal */ }
			{ compareLayout && (
				<Modal
					title={ sprintf(
						/* translators: %s is the personality/layout name */
						__( 'Compare: %s vs. current page', 'aldus' ),
						compareLayout.label
					) }
					onRequestClose={ () => setCompareLayout( null ) }
					size="large"
					className="aldus-compare-modal"
				>
					<div className="aldus-compare-toggle">
						<button
							className={ `aldus-compare-tab${
								! showBefore ? ' is-active' : ''
							}` }
							onClick={ () => setShowBefore( false ) }
						>
							{ compareLayout.label }
						</button>
						<button
							className={ `aldus-compare-tab${
								showBefore ? ' is-active' : ''
							}` }
							onClick={ () => setShowBefore( true ) }
						>
							{ __( 'Current page', 'aldus' ) }
						</button>
					</div>
					<div className="aldus-compare-preview">
						{ ! showBefore && (
							<BlockPreview
								blocks={ compareBlocks }
								viewportWidth={ 1200 }
							/>
						) }
						{ showBefore && beforeBlocks.length > 0 && (
							<BlockPreview
								blocks={ beforeBlocks }
								viewportWidth={ 1200 }
							/>
						) }
						{ showBefore && beforeBlocks.length === 0 && (
							<p className="aldus-compare-empty">
								{ __(
									'No existing page content to compare.',
									'aldus'
								) }
							</p>
						) }
					</div>
				</Modal>
			) }
		</>
	);
}

export function LayoutCard( {
	layout,
	index,
	isCompact = false,
	onChoose,
	onReroll,
	isRerolling,
	hasRerollError,
	justRerolled,
	onTryWithContent,
	isBestMatch = false,
	isRecommended = false,
	isFavorited = false,
	onToggleFavorite,
	onCompare,
	items = [],
	tabIndex = -1,
	onFocus,
	onRequestLayoutDescription = null,
} ) {
	const [ isExpanded, setIsExpanded ] = useState( false );
	const tokensSig = ( layout.tokens ?? [] ).join( '\u0000' );
	const descRequestedKeyRef = useRef( '' );

	useEffect( () => {
		descRequestedKeyRef.current = '';
	}, [ layout.label, tokensSig ] );

	const tryRequestLayoutDescription = useCallback( () => {
		if ( ! onRequestLayoutDescription || layout.description ) {
			return;
		}
		if ( ! layout.tokens?.length ) {
			return;
		}
		const key = `${ layout.label }\u0000${ tokensSig }`;
		if ( descRequestedKeyRef.current === key ) {
			return;
		}
		descRequestedKeyRef.current = key;
		onRequestLayoutDescription( layout );
	}, [ layout, onRequestLayoutDescription, tokensSig ] );

	const pointerDescTimerRef = useRef( null );
	const clearPointerDescTimer = useCallback( () => {
		if ( pointerDescTimerRef.current ) {
			clearTimeout( pointerDescTimerRef.current );
			pointerDescTimerRef.current = null;
		}
	}, [] );
	const onCardPointerEnter = useCallback( () => {
		clearPointerDescTimer();
		pointerDescTimerRef.current = setTimeout( () => {
			pointerDescTimerRef.current = null;
			tryRequestLayoutDescription();
		}, 200 );
	}, [ clearPointerDescTimer, tryRequestLayoutDescription ] );

	useEffect( () => () => clearPointerDescTimer(), [ clearPointerDescTimer ] );

	useEffect( () => {
		if ( isExpanded ) {
			tryRequestLayoutDescription();
		}
	}, [ isExpanded, tryRequestLayoutDescription ] );
	const blocks = useMemo( () => {
		return blocksFromAssemblePayload( layout );
	}, [ layout.blocks, layout.blocks_tree ] );
	const tagline = layout.description || LAYOUT_TAGLINES[ layout.label ] || '';

	// Compute which user items appear in this layout's blocks (item 11).
	const consumedSet = useMemo( () => {
		if ( ! items.length || ! layout.blocks ) {
			return new Set();
		}
		const blocksStr = layout.blocks.toLowerCase();
		return new Set(
			items
				.filter(
					( item ) =>
						item.content?.trim() &&
						blocksStr.includes(
							item.content.trim().slice( 0, 20 ).toLowerCase()
						)
				)
				.map( ( item ) => item.id )
		);
	}, [ items, layout.blocks ] );

	return (
		<>
			<div
				className={ [
					'aldus-card',
					isRerolling ? 'is-rerolling' : '',
					justRerolled ? 'aldus-card--just-rerolled' : '',
				]
					.filter( Boolean )
					.join( ' ' ) }
				role="gridcell"
				tabIndex={ tabIndex }
				onPointerEnter={ onCardPointerEnter }
				onPointerLeave={ clearPointerDescTimer }
				onFocus={ ( event ) => {
					onFocus?.( event );
					tryRequestLayoutDescription();
				} }
				style={ { animationDelay: `${ index * 40 }ms` } }
			>
				<div className="aldus-card-preview">
					<div aria-hidden="true">
						{ isRerolling ? (
							<div className="aldus-card-rerolling">
								<Spinner />
							</div>
						) : (
							<LayoutWireframe tokens={ layout.tokens } />
						) }
					</div>
					<Button
						icon={ safeIcon( seen ) }
						label={ __( 'Expand preview', 'aldus' ) }
						size="small"
						className="aldus-card-expand-btn"
						onClick={ () => setIsExpanded( true ) }
					/>
					<div className="aldus-card-overlay">
						<Button
							__next40pxDefaultSize
							className="aldus-card-use-btn"
							onClick={ onChoose }
							aria-label={ sprintf(
								/* translators: %s is the layout name, e.g. "Editorial". */
								__( 'Use the %s layout', 'aldus' ),
								layout.label
							) }
						>
							{ __( 'Use this one', 'aldus' ) }
						</Button>
					</div>
					{ hasRerollError && (
						<div
							className="aldus-card-reroll-error"
							aria-live="polite"
						>
							{ __( "Couldn't refresh — try again", 'aldus' ) }
						</div>
					) }
				</div>
				<div className="aldus-card-footer">
					<div className="aldus-card-footer-row">
						<strong className="aldus-card-label">
							{ layout.label }
						</strong>
						<div className="aldus-card-footer-actions">
							{ isRecommended && ! isBestMatch && (
								<span
									className="aldus-card-badge"
									title={ __(
										'Recommended for your content mix.',
										'aldus'
									) }
								>
									{ __( '✦ Recommended', 'aldus' ) }
								</span>
							) }
							{ isBestMatch && (
								<span
									className="aldus-best-match-badge"
									title={ __(
										'This personality is a great match for your content.',
										'aldus'
									) }
								>
									{ __( '✓ Best match', 'aldus' ) }
								</span>
							) }
							{ onToggleFavorite && (
								<Button
									icon={
										isFavorited ? starFilled : starEmpty
									}
									label={
										isFavorited
											? __(
													'Remove from favorites',
													'aldus'
											  )
											: __( 'Add to favorites', 'aldus' )
									}
									size="small"
									className={ `aldus-card-favorite-btn${
										isFavorited ? ' is-favorited' : ''
									}` }
									onClick={ onToggleFavorite }
								/>
							) }
							{ onReroll && ! isRerolling && (
								<Button
									icon={ safeIcon( undo ) }
									label={ __(
										'Try a different arrangement for this personality',
										'aldus'
									) }
									size="small"
									className="aldus-card-reroll-btn"
									onClick={ onReroll }
								/>
							) }
							<Button
								icon={ safeIcon( copy ) }
								label={ __(
									'Copy blocks to clipboard',
									'aldus'
								) }
								size="small"
								className="aldus-card-copy-btn"
								onClick={ async () => {
									try {
										await navigator.clipboard.writeText(
											layout.blocks
										);
										wpDispatch(
											'core/notices'
										).createSuccessNotice(
											__(
												'Blocks copied to clipboard.',
												'aldus'
											),
											{
												type: 'snackbar',
												id: 'aldus-copy',
											}
										);
									} catch {
										// Clipboard write denied — silent fail.
									}
								} }
							/>
							{ onTryWithContent && (
								<Button
									icon={ safeIcon( reusableBlock ) }
									label={ __(
										'Try with my content',
										'aldus'
									) }
									size="small"
									className="aldus-card-try-btn"
									onClick={ onTryWithContent }
								/>
							) }
							{ onCompare && (
								<Button
									icon={ safeIcon( layoutIcon ) }
									label={ __(
										'Compare with current page',
										'aldus'
									) }
									size="small"
									className="aldus-card-compare-btn"
									onClick={ onCompare }
								/>
							) }
						</div>
					</div>
					{ tagline && ! isCompact && (
						<span className="aldus-card-tagline">{ tagline }</span>
					) }
					{ ! isCompact && layout.unusedTypes?.length > 0 && (
						<span className="aldus-coverage-badge">
							{ sprintf(
								/* translators: %d: number of unused content items */
								_n(
									'%d item unused',
									'%d items unused',
									layout.unusedTypes.length,
									'aldus'
								),
								layout.unusedTypes.length
							) }
						</span>
					) }
					{ items.length > 0 && (
						<div
							className="aldus-card-consumption"
							aria-label={ sprintf(
								/* translators: 1: used count, 2: total count */
								__(
									'%1$d of %2$d content pieces used',
									'aldus'
								),
								consumedSet.size,
								items.length
							) }
						>
							{ items.map( ( item ) => (
								<span
									key={ item.id }
									className={ `aldus-consumption-dot${
										consumedSet.has( item.id )
											? ' is-used'
											: ''
									}` }
									title={ item.type }
								/>
							) ) }
						</div>
					) }
				</div>
				{ layout.tokens?.length > 0 && (
					<div className="aldus-card-recipe" aria-hidden="true">
						{ layout.tokens.map( ( token, i ) => (
							<span key={ i } className="aldus-card-token">
								{ tokenShortLabel( token ) }
							</span>
						) ) }
					</div>
				) }
			</div>

			{ isExpanded && (
				<Modal
					title={ layout.label }
					onRequestClose={ () => setIsExpanded( false ) }
					size="large"
					className="aldus-preview-modal"
				>
					<div className="aldus-preview-modal-preview">
						<BlockPreview
							blocks={ blocks }
							viewportWidth={ 1200 }
							additionalStyles={ [
								{
									css: '.wp-block-cover { min-height: 300px !important; max-height: 500px !important; }',
								},
								{ css: 'body { padding: 0 !important; }' },
								{
									css: '.is-root-container { padding: 0 !important; }',
								},
								{
									css: '.block-editor-block-list__layout { padding: 0 !important; }',
								},
								{
									css: '.alignfull { margin-left: 0 !important; margin-right: 0 !important; }',
								},
								// Temporary: suppress validation warning UI while root cause (render-time layout classes) is fixed.
								{
									css: '.block-editor-warning { display: none !important; }',
								},
							] }
						/>
					</div>
					<div className="aldus-preview-modal-footer">
						<Button
							__next40pxDefaultSize
							variant="primary"
							onClick={ () => {
								onChoose();
								setIsExpanded( false );
							} }
						>
							{ __( 'Use this layout', 'aldus' ) }
						</Button>
						<Button
							__next40pxDefaultSize
							variant="secondary"
							onClick={ async () => {
								try {
									await navigator.clipboard.writeText(
										layout.blocks
									);
									wpDispatch(
										'core/notices'
									).createSuccessNotice(
										__(
											'Blocks copied to clipboard.',
											'aldus'
										),
										{ type: 'snackbar', id: 'aldus-copy' }
									);
								} catch {
									// Clipboard write denied — silent fail.
								}
							} }
						>
							{ __( 'Copy blocks', 'aldus' ) }
						</Button>
					</div>
				</Modal>
			) }
		</>
	);
}
