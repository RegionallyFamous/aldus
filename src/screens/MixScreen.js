/**
 * MixingScreen — three-zone section-level layout mixer.
 *
 * LEFT:   Vertical timeline — miniature wireframe tiles per section,
 *         each bordered in the personality's color. Click to select.
 *         Shuffle button randomises every section at once.
 * RIGHT:  Alternatives grid — wireframe cards showing how other
 *         personalities render the selected section.
 * BOTTOM: Live composite preview — full-width wireframe of the
 *         current mix, updating in real time.
 */

import {
	useState,
	useMemo,
	useRef,
	useEffect,
	useCallback,
} from '@wordpress/element';
import { Button, Flex } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { shuffle as shuffleIcon } from '@wordpress/icons';

import { LayoutWireframe } from '../components/LayoutWireframe.js';

// ---------------------------------------------------------------------------
// Personality → accent colour map
// ---------------------------------------------------------------------------
const PERSONALITY_COLORS = {
	Dispatch: '#c0392b',
	Folio: '#27ae60',
	Stratum: '#8e44ad',
	Broadside: '#d35400',
	Manifesto: '#2c3e50',
	Nocturne: '#1a237e',
	Tribune: '#f39c12',
	Overture: '#16a085',
	Codex: '#7f8c8d',
	Dusk: '#34495e',
	Broadsheet: '#e67e22',
	Solstice: '#b0bec5',
	Mirage: '#9b59b6',
	Ledger: '#2ecc71',
	Mosaic: '#e74c3c',
	Prism: '#3498db',
};

function personalityColor( label ) {
	return PERSONALITY_COLORS[ label ] ?? '#999';
}

// ---------------------------------------------------------------------------
// Human-readable labels for token identifiers
// ---------------------------------------------------------------------------
const TOKEN_HUMAN_LABELS = {
	'cover:dark': 'Dark hero',
	'cover:light': 'Light hero',
	'cover:minimal': 'Minimal hero',
	'cover:split': 'Split hero',
	'columns:2-equal': 'Two columns',
	'columns:28-72': 'Sidebar columns',
	'columns:3-equal': 'Three columns',
	'columns:4-equal': 'Four columns',
	'media-text:left': 'Image left',
	'media-text:right': 'Image right',
	'group:dark-full': 'Dark section',
	'group:accent-full': 'Accent section',
	'group:light-full': 'Light section',
	'group:border-box': 'Bordered section',
	'group:gradient-full': 'Gradient section',
	'pullquote:wide': 'Pull quote',
	'pullquote:full-solid': 'Bold pull quote',
	'pullquote:centered': 'Centered quote',
	'heading:h1': 'Heading 1',
	'heading:h2': 'Heading 2',
	'heading:h3': 'Heading 3',
	'heading:display': 'Display heading',
	'heading:kicker': 'Kicker heading',
	paragraph: 'Paragraph',
	'paragraph:dropcap': 'Drop cap paragraph',
	'paragraph:lead': 'Lead paragraph',
	'image:wide': 'Wide image',
	'image:full': 'Full-width image',
	quote: 'Quote',
	'quote:attributed': 'Attributed quote',
	'buttons:cta': 'Call to action',
	'spacer:small': 'Small spacer',
	'spacer:large': 'Spacer',
	'spacer:xlarge': 'Large spacer',
	separator: 'Separator',
	list: 'List',
	'fallback:generic': 'Fallback layout',
};

function tokenHumanLabel( token ) {
	return TOKEN_HUMAN_LABELS[ token ] ?? token;
}

// ---------------------------------------------------------------------------
// SectionTile — one row in the left timeline
// ---------------------------------------------------------------------------
function SectionTile( { section, index, isActive, isFlipping, onClick } ) {
	const color = personalityColor( section._label );
	const classes = [
		'aldus-mix-section-tile',
		isActive ? 'is-active' : '',
		isFlipping ? 'is-flipping' : '',
	]
		.filter( Boolean )
		.join( ' ' );

	return (
		<button
			className={ classes }
			style={ { borderLeftColor: color } }
			onClick={ () => onClick( index ) }
			aria-pressed={ isActive }
			title={ `${ section._label } — ${ tokenHumanLabel(
				section.token
			) }` }
		>
			<div className="aldus-mix-tile-wireframe" aria-hidden="true">
				<LayoutWireframe tokens={ [ section.token ] } />
			</div>
			<span className="aldus-mix-tile-label">
				{ tokenHumanLabel( section.token ) }
			</span>
		</button>
	);
}

// ---------------------------------------------------------------------------
// AltCard — one card in the right alternatives grid
// ---------------------------------------------------------------------------
function AltCard( { section, isSelected, isSwapping, onSwap } ) {
	const color = personalityColor( section._label );
	const classes = [
		'aldus-mix-alt-card',
		isSelected ? 'is-selected' : '',
		isSwapping ? 'is-swapping' : '',
	]
		.filter( Boolean )
		.join( ' ' );

	return (
		<button className={ classes } onClick={ onSwap }>
			<div className="aldus-mix-alt-card-preview" aria-hidden="true">
				<LayoutWireframe tokens={ [ section.token ] } />
			</div>
			<div className="aldus-mix-alt-footer">
				<span
					className="aldus-mix-personality-dot"
					style={ { backgroundColor: color } }
					aria-hidden="true"
				/>
				<span className="aldus-mix-alt-name">{ section._label }</span>
			</div>
		</button>
	);
}

// ---------------------------------------------------------------------------
// MixingScreen
// ---------------------------------------------------------------------------

/**
 * @param {Object}   props
 * @param {Array}    props.layouts  Assembled layout objects with sections.
 * @param {Function} props.onInsert Called with combined block markup string.
 * @param {Function} props.onBack   Returns to the results screen.
 */
export function MixingScreen( { layouts, onInsert, onBack } ) {
	// Use the layout with the most sections as the starting mix.
	const baseLayout = useMemo(
		() =>
			[ ...layouts ].sort(
				( a, b ) =>
					( b.sections?.length ?? 0 ) - ( a.sections?.length ?? 0 )
			)[ 0 ],
		[ layouts ]
	);

	const buildSlots = ( layout ) =>
		( layout?.sections ?? [] ).map( ( s ) => ( {
			...s,
			_label: layout.label,
		} ) );

	const [ mixSlots, setMixSlots ] = useState( () =>
		buildSlots( baseLayout )
	);
	const [ activeSlot, setActiveSlot ] = useState( 0 );
	// Per-slot flip animation flags.
	const [ flippingSlots, setFlippingSlots ] = useState( () => [] );
	// Per-slot swap animation flag (index of card being swapped out).
	const [ swappingSlot, setSwappingSlot ] = useState( null );

	// Reset slots if layouts changes (e.g. a re-roll fires while on this screen).
	const prevBaseRef = useRef( baseLayout );
	useEffect( () => {
		if ( baseLayout !== prevBaseRef.current ) {
			prevBaseRef.current = baseLayout;
			setMixSlots( buildSlots( baseLayout ) );
			setActiveSlot( 0 );
		}
	}, [ baseLayout ] ); // eslint-disable-line react-hooks/exhaustive-deps

	// Build a lookup of all sections per token type across all layouts.
	const sectionsByToken = useMemo( () => {
		const map = {};
		for ( const layout of layouts ) {
			for ( const section of layout.sections ?? [] ) {
				if ( ! map[ section.token ] ) {
					map[ section.token ] = [];
				}
				map[ section.token ].push( {
					...section,
					_label: layout.label,
				} );
			}
		}
		return map;
	}, [ layouts ] );

	const activeSection = mixSlots[ activeSlot ];
	const alternatives = activeSection
		? sectionsByToken[ activeSection.token ] ?? []
		: [];

	const swapSlot = useCallback( ( slotIdx, section ) => {
		setSwappingSlot( slotIdx );
		setTimeout( () => {
			setMixSlots( ( prev ) => {
				const next = [ ...prev ];
				next[ slotIdx ] = section;
				return next;
			} );
			setSwappingSlot( null );
		}, 200 );
	}, [] );

	const handleShuffle = useCallback( () => {
		setMixSlots( ( prev ) => {
			const next = [ ...prev ];
			prev.forEach( ( slot, i ) => {
				const alts = sectionsByToken[ slot.token ];
				if ( alts && alts.length > 1 ) {
					// Pick a random alt that differs from the current one.
					const others = alts.filter(
						( a ) => a._label !== slot._label
					);
					const pool = others.length > 0 ? others : alts;
					next[ i ] =
						pool[ Math.floor( Math.random() * pool.length ) ];
				}
				// Stagger the flip animation per slot.
				setTimeout( () => {
					setFlippingSlots( ( f ) => [ ...f, i ] );
					setTimeout( () => {
						setFlippingSlots( ( f ) =>
							f.filter( ( idx ) => idx !== i )
						);
					}, 150 );
				}, i * 80 );
			} );
			return next;
		} );
	}, [ sectionsByToken ] );

	const handleInsert = () => {
		const combined = mixSlots.map( ( s ) => s.blocks ).join( '\n' );
		onInsert( combined );
	};

	const uniquePersonalities = new Set( mixSlots.map( ( s ) => s._label ) )
		.size;

	return (
		<div className="aldus-mixing">
			{ /* Header — unchanged */ }
			<Flex
				align="center"
				justify="space-between"
				className="aldus-mixing-header"
			>
				<div>
					<span className="aldus-results-title">
						{ __( 'Mix sections', 'aldus' ) }
					</span>
					<span className="aldus-results-count">
						{ sprintf(
							/* translators: 1: number of sections, 2: number of layouts */
							__( '%1$d sections from %2$d layouts', 'aldus' ),
							mixSlots.length,
							uniquePersonalities
						) }
					</span>
				</div>
				<Flex gap={ 2 }>
					<Button
						variant="primary"
						size="small"
						onClick={ handleInsert }
					>
						{ __( 'Insert this mix', 'aldus' ) }
					</Button>
					<Button variant="tertiary" size="small" onClick={ onBack }>
						{ __( 'Back to layouts', 'aldus' ) }
					</Button>
				</Flex>
			</Flex>

			{ /* Three-zone body */ }
			<div className="aldus-mixing-body">
				{ /* LEFT: Vertical timeline */ }
				<div className="aldus-mix-timeline">
					{ mixSlots.map( ( section, i ) => (
						<SectionTile
							key={ i }
							section={ section }
							index={ i }
							isActive={ activeSlot === i }
							isFlipping={ flippingSlots.includes( i ) }
							onClick={ setActiveSlot }
						/>
					) ) }
					<Button
						className="aldus-mix-shuffle"
						variant="tertiary"
						size="small"
						icon={ shuffleIcon }
						onClick={ handleShuffle }
					>
						{ __( 'Shuffle', 'aldus' ) }
					</Button>
				</div>

				{ /* RIGHT: Alternatives grid */ }
				<div className="aldus-mix-alts-zone">
					<p className="aldus-mix-alts-header">
						{ activeSection
							? sprintf(
									/* translators: %s is a human-readable section name like "Dark hero" */
									__( 'Swap "%s" with:', 'aldus' ),
									tokenHumanLabel( activeSection.token )
							  )
							: __( 'Select a section to swap it', 'aldus' ) }
					</p>
					<div className="aldus-mix-alts-grid">
						{ alternatives.map( ( section, i ) => {
							const isSelected =
								mixSlots[ activeSlot ]?._label ===
								section._label;
							return (
								<AltCard
									key={ i }
									section={ section }
									isSelected={ isSelected }
									isSwapping={
										swappingSlot === activeSlot &&
										isSelected
									}
									onSwap={ () =>
										swapSlot( activeSlot, section )
									}
								/>
							);
						} ) }
					</div>
				</div>
			</div>

			{ /* BOTTOM: Live composite preview */ }
			<div
				className="aldus-mix-composite"
				aria-label={ __( 'Layout preview', 'aldus' ) }
			>
				<div className="aldus-mix-composite-inner">
					<LayoutWireframe
						tokens={ mixSlots.map( ( s ) => s.token ) }
					/>
				</div>
				<div className="aldus-mix-composite-fade" aria-hidden="true" />
			</div>
		</div>
	);
}
