import {
	registerBlockType,
	createBlock,
	registerBlockVariation,
} from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import { useSelect, useDispatch } from '@wordpress/data';
import { registerPlugin } from '@wordpress/plugins';
import { PluginBlockSettingsMenuItem } from '@wordpress/editor';
import metadata from './block.json';
import Edit from './edit';
import save from './save';
import { AldusErrorBoundary } from './components/AldusErrorBoundary';
import { uid as generateId } from './lib/uid.js'; // eslint-disable-line no-unused-vars
import {
	extractPlainText,
	extractItemFromBlock,
} from './lib/extract-helpers.js';
import './components/PluginRegistration';

// Re-export for use in block transforms and external code.
export { extractPlainText, extractItemFromBlock };

registerBlockType( metadata.name, {
	edit: ( props ) => (
		<AldusErrorBoundary>
			<Edit { ...props } />
		</AldusErrorBoundary>
	),
	save,
	deprecations: [
		{
			// v1.19.0 and earlier: save() returned null, so inner blocks were
			// never serialised to the database. The block was stored as a
			// self-closing comment; the Detach button was the only path to
			// frontend rendering. Recognising this deprecated form lets
			// WordPress auto-recover existing posts on the next edit + save.
			save: () => null,
		},
	],
	transforms: {
		/**
		 * Transform TO core/group — graceful escape hatch.
		 * Inserts a blank group so the user can place content manually.
		 */
		to: [
			{
				type: 'block',
				blocks: [ 'core/group' ],
				transform: () =>
					createBlock( 'core/group', {
						layout: { type: 'constrained' },
					} ),
			},
		],
		from: [
			/**
			 * Transform FROM core/group — re-layout existing grouped content.
			 */
			{
				type: 'block',
				blocks: [ 'core/group' ],
				transform: ( _, innerBlocks ) => {
					const items = innerBlocks
						.flatMap( extractItemFromBlock )
						.filter( Boolean );
					return createBlock( metadata.name, { savedItems: items } );
				},
			},
			/**
			 * Transform FROM a multi-block selection — lets users select any
			 * combination of content blocks and convert them to Aldus items in
			 * one action. isMultiBlock fires when 2+ matching blocks are selected.
			 */
			{
				type: 'block',
				isMultiBlock: true,
				blocks: [
					'core/heading',
					'core/paragraph',
					'core/image',
					'core/pullquote',
					'core/quote',
					'core/list',
					'core/button',
					'core/buttons',
					'core/video',
					'core/audio',
					'core/file',
					'core/embed',
					'core/html',
					'core/freeform',
					'core/table',
					'core/gallery',
					'core/code',
					'core/preformatted',
					'core/verse',
					'core/details',
					'core/columns',
					'core/group',
					'core/cover',
					'core/media-text',
					'core/row',
					'core/stack',
				],
				transform: ( blocksArray ) => {
					const items = blocksArray
						.flatMap( extractItemFromBlock )
						.filter( Boolean );
					return createBlock( metadata.name, { savedItems: items } );
				},
			},
		],
	},
} );

// ---------------------------------------------------------------------------
// Block Variations — Quick Start presets in the inserter
//
// NOTE: block.json sets "multiple": false, so block variations share the same
// constraint — only one Aldus block per page. Variations are most useful for
// the first (and often only) Aldus insertion: user opens inserter on an empty
// page, picks "Blog Post — Aldus", and gets pre-filled placeholder content.
//
// TODO: enabledPersonalities lists here must stay in sync with the personality
// names exported from PERSONALITIES in edit.js (which mirror PHP aldus_anchor_tokens()).
// If a personality is renamed or removed, update all lists below to match.
// ---------------------------------------------------------------------------

registerBlockVariation( metadata.name, {
	name: 'aldus/blog-post',
	title: __( 'Blog Post — Aldus', 'aldus' ),
	description: __( 'Aldus pre-loaded for a typical blog post.', 'aldus' ),
	icon: 'edit',
	isDefault: false,
	scope: [ 'inserter' ],
	attributes: {
		savedItems: [
			{
				id: '1',
				type: 'headline',
				content: 'The Afternoon Everything Changed',
				url: '',
			},
			{
				id: '2',
				type: 'paragraph',
				content:
					'It started with a question nobody in the room wanted to answer. Not because it was hard — because the answer meant admitting that everything we\u2019d built for the last eighteen months was pointing in the wrong direction.',
				url: '',
			},
			{
				id: '3',
				type: 'paragraph',
				content:
					'What happened next took six weeks, two whiteboards, and a conversation in a parking lot that probably should have happened a year earlier. This is that story.',
				url: '',
			},
			{ id: '4', type: 'image', content: '', url: '' },
		],
		enabledPersonalities: [ 'Dispatch', 'Tribune', 'Folio', 'Stratum' ],
	},
} );

registerBlockVariation( metadata.name, {
	name: 'aldus/landing-page',
	title: __( 'Landing Page — Aldus', 'aldus' ),
	description: __( 'Aldus pre-loaded for a landing page.', 'aldus' ),
	icon: 'welcome-view-site',
	isDefault: false,
	scope: [ 'inserter' ],
	attributes: {
		savedItems: [
			{
				id: '1',
				type: 'headline',
				content: 'Build Something People Actually Use',
				url: '',
			},
			{
				id: '2',
				type: 'subheading',
				content: 'From first idea to first customer in one tool',
				url: '',
			},
			{
				id: '3',
				type: 'paragraph',
				content:
					'Most tools promise to save you time. This one promises to save you from building the wrong thing. Start with what your users need, prototype it in hours, and ship it before the enthusiasm wears off.',
				url: '',
			},
			{ id: '4', type: 'image', content: '', url: '' },
			{
				id: '5',
				type: 'cta',
				content: 'Start building \u2014 free',
				url: '#',
			},
		],
		enabledPersonalities: [ 'Overture', 'Manifesto', 'Broadside', 'Dusk' ],
	},
} );

registerBlockVariation( metadata.name, {
	name: 'aldus/feature-story',
	title: __( 'Feature Story — Aldus', 'aldus' ),
	description: __( 'Aldus pre-loaded for a feature article.', 'aldus' ),
	icon: 'format-aside',
	isDefault: false,
	scope: [ 'inserter' ],
	attributes: {
		savedItems: [
			{
				id: '1',
				type: 'headline',
				content: 'The Train That Goes Nowhere on Purpose',
				url: '',
			},
			{
				id: '2',
				type: 'quote',
				content:
					'The destination was never the point. The point was the four hours between departure and arrival where nobody could reach us.',
				url: '',
			},
			{
				id: '3',
				type: 'paragraph',
				content:
					'The overnight train from Belgrade to Bar has been running since 1976. It crosses 435 bridges and passes through 254 tunnels. It is never on time. Nobody who rides it cares.',
				url: '',
			},
			{
				id: '4',
				type: 'paragraph',
				content:
					'We rode it three times in two weeks. Each time the landscape revealed something the previous trip had hidden \u2014 a gorge that only catches light at sunset, a village that appears for exactly forty seconds between two tunnels, a river that changes color depending on which direction you\u2019re traveling.',
				url: '',
			},
			{ id: '5', type: 'image', content: '', url: '' },
		],
		enabledPersonalities: [ 'Folio', 'Nocturne', 'Broadsheet', 'Codex' ],
	},
} );

registerBlockVariation( metadata.name, {
	name: 'aldus/product-pitch',
	title: __( 'Product Pitch — Aldus', 'aldus' ),
	description: __(
		'Aldus pre-loaded for a product pitch or feature announcement.',
		'aldus'
	),
	icon: 'cart',
	isDefault: false,
	scope: [ 'inserter' ],
	attributes: {
		savedItems: [
			{
				id: '1',
				type: 'headline',
				content: 'Your Data. Your Rules. No Exceptions.',
				url: '',
			},
			{
				id: '2',
				type: 'paragraph',
				content:
					'We built this because every alternative required trusting someone who had a financial incentive to read your files. We removed the incentive. What\u2019s left is a tool that does its job and minds its own business.',
				url: '',
			},
			{
				id: '3',
				type: 'list',
				content:
					'End-to-end encryption on every file, every time\n' +
					'Zero-knowledge architecture \u2014 we can\u2019t see your data even if we wanted to\n' +
					'Open-source clients you can audit yourself\n' +
					'Works offline after the first sync',
				url: '',
			},
			{
				id: '4',
				type: 'cta',
				content: 'Try it free \u2014 no credit card',
				url: '#',
			},
		],
		enabledPersonalities: [ 'Ledger', 'Broadside', 'Tribune', 'Solstice' ],
	},
} );

registerBlockVariation( metadata.name, {
	name: 'aldus/visual-portfolio',
	title: __( 'Visual Portfolio \u2014 Aldus', 'aldus' ),
	description: __(
		'Aldus pre-loaded for a visual portfolio or gallery page.',
		'aldus'
	),
	icon: 'format-gallery',
	isDefault: false,
	scope: [ 'inserter' ],
	attributes: {
		savedItems: [
			{
				id: '1',
				type: 'headline',
				content: 'Selected Work, 2023\u20132025',
				url: '',
			},
			{
				id: '2',
				type: 'paragraph',
				content:
					'A collection of projects from the last two years \u2014 brand identities, editorial layouts, and the occasional thing that started as a napkin sketch and ended up on a billboard.',
				url: '',
			},
			{ id: '3', type: 'gallery', content: '', url: '', urls: [] },
			{ id: '4', type: 'cta', content: 'Get in touch', url: '#' },
		],
		enabledPersonalities: [ 'Mosaic', 'Prism', 'Nocturne', 'Mirage' ],
	},
} );

registerBlockVariation( metadata.name, {
	name: 'aldus/product-comparison',
	title: __( 'Product Comparison \u2014 Aldus', 'aldus' ),
	description: __(
		'Aldus pre-loaded with a comparison table and pitch.',
		'aldus'
	),
	icon: 'editor-table',
	isDefault: false,
	scope: [ 'inserter' ],
	attributes: {
		savedItems: [
			{
				id: '1',
				type: 'headline',
				content: 'How We Stack Up',
				url: '',
			},
			{
				id: '2',
				type: 'table',
				content:
					'Feature,Us,Them\n' +
					'Price,$9/mo,$29/mo\n' +
					'Storage,Unlimited,10 GB\n' +
					'Support,Human,Chatbot\n' +
					'Data privacy,Zero-knowledge,"Trust us"',
				url: '',
			},
			{
				id: '3',
				type: 'paragraph',
				content:
					'We could have made this table longer. We didn\u2019t need to.',
				url: '',
			},
			{ id: '4', type: 'cta', content: 'Switch today', url: '#' },
		],
		enabledPersonalities: [ 'Ledger', 'Tribune', 'Broadsheet', 'Solstice' ],
	},
} );

// ---------------------------------------------------------------------------
// "Redesign with Aldus" — block settings menu item
//
// Appears in the Options (⋮) menu of any compatible block when that block can
// be meaningfully converted into Aldus content items. Selecting it replaces
// the block(s) with a new Aldus block pre-loaded with the extracted items.
// ---------------------------------------------------------------------------

/** Block types whose content can be extracted into Aldus items. */
const REDESIGNABLE_BLOCKS = new Set( [
	'core/heading',
	'core/paragraph',
	'core/image',
	'core/quote',
	'core/list',
	'core/buttons',
	'core/embed',
	'core/table',
	'core/gallery',
	'core/code',
	'core/preformatted',
	'core/verse',
	'core/details',
	'core/group',
	'core/columns',
] );

function RedesignWithAldusMenuItem() {
	const { selectedBlocks } = useSelect( ( select ) => {
		const { getSelectedBlock, getMultiSelectedBlocks } =
			select( 'core/block-editor' );
		const multi = getMultiSelectedBlocks();
		const single = getSelectedBlock();
		let blocks = multi;
		if ( multi.length === 0 ) {
			blocks = single ? [ single ] : [];
		}
		return { selectedBlocks: blocks };
	}, [] );

	const { replaceBlocks } = useDispatch( 'core/block-editor' );

	// Only show the menu item for compatible, non-Aldus blocks.
	const eligible = selectedBlocks.filter(
		( b ) => b && REDESIGNABLE_BLOCKS.has( b.name )
	);
	if (
		eligible.length === 0 ||
		selectedBlocks.some( ( b ) => b?.name === metadata.name )
	) {
		return null;
	}

	function handleRedesign() {
		const items = eligible
			.flatMap( ( b ) => extractItemFromBlock( b ) )
			.filter( Boolean );
		const aldusBlock = createBlock( metadata.name, {
			savedItems: items,
		} );
		replaceBlocks(
			eligible.map( ( b ) => b.clientId ),
			[ aldusBlock ]
		);
	}

	return (
		<PluginBlockSettingsMenuItem
			label={ __( 'Redesign with Aldus', 'aldus' ) }
			icon="art"
			onClick={ handleRedesign }
		/>
	);
}

registerPlugin( 'aldus-redesign', { render: RedesignWithAldusMenuItem } );
