/**
 * MixingScreen — section-level layout mixer.
 *
 * Lets the user combine sections from different generated layouts.
 * Sections are shown in a recipe strip; clicking a slot reveals
 * alternatives from all other personalities.
 */

import { useState, useMemo, useRef, useEffect } from '@wordpress/element';
import { Button, Flex } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { BlockPreview } from '@wordpress/block-editor';
import { parse as parseBlocks } from '@wordpress/blocks';

// Human-readable labels for token identifiers shown in the recipe strip.
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

function MixAltButton( { section, isSelected, onSwap } ) {
	const previewBlocks = useMemo( () => {
		try {
			return parseBlocks( section.blocks ?? '' ).filter(
				( b ) => b?.name
			);
		} catch ( e ) {
			return [];
		}
	}, [ section.blocks ] );
	return (
		<button
			className={ `aldus-mix-alt${ isSelected ? ' is-selected' : '' }` }
			onClick={ onSwap }
		>
			<div className="aldus-mix-alt-preview" aria-hidden="true">
				<BlockPreview blocks={ previewBlocks } viewportWidth={ 300 } />
			</div>
			<strong>{ section._label }</strong>
		</button>
	);
}

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

	const swapSlot = ( slotIdx, section ) => {
		setMixSlots( ( prev ) => {
			const next = [ ...prev ];
			next[ slotIdx ] = section;
			return next;
		} );
	};

	const handleInsert = () => {
		const combined = mixSlots.map( ( s ) => s.blocks ).join( '\n' );
		onInsert( combined );
	};

	return (
		<div className="aldus-mixing">
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
							new Set( mixSlots.map( ( s ) => s._label ) ).size
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

			{ /* Item 16: Recipe strip showing personality:token per slot */ }
			<div
				className="aldus-mix-recipe-strip"
				aria-label={ __( 'Current mix recipe', 'aldus' ) }
			>
				{ mixSlots.map( ( section, i ) => (
					<button
						key={ i }
						className={ `aldus-mix-recipe-pill${
							activeSlot === i ? ' is-active' : ''
						}` }
						onClick={ () => setActiveSlot( i ) }
					>
						<span className="aldus-mix-recipe-source">
							{ section._label }
						</span>
						<span className="aldus-mix-recipe-token">
							{ tokenHumanLabel( section.token ) }
						</span>
					</button>
				) ) }
			</div>

			{ /* Item 17: Alternatives grid below the recipe strip */ }
			<div className="aldus-mixing-alts-section">
				<p className="aldus-section-label">
					{ activeSection
						? sprintf(
								/* translators: %s is a human-readable section name like "Dark hero" */
								__(
									'Replace "%s" with a version from…',
									'aldus'
								),
								tokenHumanLabel( activeSection.token )
						  )
						: __( 'Select a section above to swap it', 'aldus' ) }
				</p>
				<div className="aldus-mix-alts-grid">
					{ alternatives.map( ( section, i ) => {
						const isSelected =
							mixSlots[ activeSlot ]?._label === section._label;
						return (
							<MixAltButton
								key={ i }
								section={ section }
								isSelected={ isSelected }
								onSwap={ () => swapSlot( activeSlot, section ) }
							/>
						);
					} ) }
				</div>
			</div>
		</div>
	);
}
