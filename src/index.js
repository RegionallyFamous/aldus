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
import { uid as generateId } from './lib/uid.js';
import './components/PluginRegistration';

// ---------------------------------------------------------------------------
// Block extraction helper — converts a single block into zero or more Aldus
// content items. Shared by the core/group and isMultiBlock from-transforms.
// ---------------------------------------------------------------------------

const VIDEO_HOSTS = /youtube\.com|youtu\.be|vimeo\.com/i;

/**
 * Safely extracts a plain-text string from a block's content attribute.
 * In WordPress 6.x the attribute value may be a string or a RichText value object.
 *
 * @param {string|Object|*} content Block content attribute value.
 * @return {string} Plain text without HTML tags.
 */
function extractPlainText( content ) {
	if ( typeof content === 'string' ) {
		// Strip any embedded HTML (inline formatting, links, etc.) to plain text.
		return content.replace( /<[^>]*>/g, '' );
	}
	// RichText value object — use toHTMLString fallback or return empty.
	if ( content && typeof content === 'object' ) {
		const str = String( content.text ?? content.originalHTML ?? '' );
		return str.replace( /<[^>]*>/g, '' );
	}
	return '';
}

function extractItemFromBlock( block ) {
	if ( block.name === 'core/heading' ) {
		return [
			{
				id: generateId(),
				type: block.attributes.level === 1 ? 'headline' : 'subheading',
				content: extractPlainText( block.attributes.content ?? '' ),
				url: '',
			},
		];
	}
	if ( block.name === 'core/paragraph' ) {
		return [
			{
				id: generateId(),
				type: 'paragraph',
				content: extractPlainText( block.attributes.content ?? '' ),
				url: '',
			},
		];
	}
	if ( block.name === 'core/image' ) {
		return [
			{
				id: generateId(),
				type: 'image',
				content: '',
				url: block.attributes.url ?? '',
			},
		];
	}
	if ( block.name === 'core/quote' ) {
		return [
			{
				id: generateId(),
				type: 'quote',
				content: block.attributes.value ?? '',
				url: '',
			},
		];
	}
	if ( block.name === 'core/list' ) {
		// Join all list-item text into a single newline-separated string.
		const listText = ( block.innerBlocks ?? [] )
			.map( ( li ) => li.attributes?.content ?? '' )
			.filter( Boolean )
			.join( '\n' );
		if ( ! listText ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'list',
				content: listText,
				url: '',
			},
		];
	}
	if ( block.name === 'core/buttons' ) {
		// Take the first button's text and url as a CTA.
		const firstBtn = ( block.innerBlocks ?? [] ).find(
			( b ) => b.name === 'core/button'
		);
		if ( ! firstBtn ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'cta',
				content: firstBtn.attributes?.text ?? '',
				url: firstBtn.attributes?.url ?? '',
			},
		];
	}
	if ( block.name === 'core/embed' ) {
		const rawUrl = block.attributes?.url ?? '';
		// Normalize protocol-relative URLs (//youtube.com/…) to https:// so
		// PHP's esc_url() and URL validation don't strip them.
		const embedUrl = rawUrl.startsWith( '//' ) ? 'https:' + rawUrl : rawUrl;
		if ( embedUrl && VIDEO_HOSTS.test( embedUrl ) ) {
			return [
				{
					id: generateId(),
					type: 'video',
					content: '',
					url: embedUrl,
				},
			];
		}
		return [];
	}
	if ( block.name === 'core/table' ) {
		// Flatten all cell content into a summary string for the table item.
		const rows = [
			...( block.attributes?.head ?? [] ),
			...( block.attributes?.body ?? [] ),
		];
		const cellText = rows
			.flatMap( ( row ) =>
				( row.cells ?? [] ).map( ( cell ) => cell.content ?? '' )
			)
			.filter( Boolean )
			.join( ' | ' );
		if ( ! cellText ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'table',
				content: cellText,
				url: '',
			},
		];
	}
	if ( block.name === 'core/gallery' ) {
		// Collect up to 4 image URLs and their attachment IDs.
		const images = ( block.innerBlocks ?? [] )
			.filter( ( b ) => b.name === 'core/image' )
			.slice( 0, 4 );
		const galleryUrls = images
			.map( ( b ) => b.attributes?.url )
			.filter( Boolean );
		if ( galleryUrls.length === 0 ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'gallery',
				content: '',
				url: galleryUrls[ 0 ],
				urls: galleryUrls,
			},
		];
	}
	// core/details — extract the summary (first inner heading or paragraph) as a details item.
	if ( block.name === 'core/details' ) {
		const summaryBlock = ( block.innerBlocks ?? [] ).find(
			( b ) => b.name === 'core/paragraph' || b.name === 'core/heading'
		);
		const content = summaryBlock?.attributes?.content ?? '';
		if ( ! content ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'details',
				content,
				url: '',
			},
		];
	}
	// core/verse — map to quote (poetic emphasis, semantically similar to pullquote).
	if ( block.name === 'core/verse' ) {
		const content = block.attributes?.content ?? '';
		if ( ! content ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'quote',
				content,
				url: '',
			},
		];
	}
	// core/code and core/preformatted — map to the code content type.
	if ( block.name === 'core/code' || block.name === 'core/preformatted' ) {
		const content = block.attributes?.content ?? '';
		if ( ! content ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'code',
				content,
				url: '',
			},
		];
	}
	// core/separator — structural marker; drop gracefully without logging an error.
	if ( block.name === 'core/separator' ) {
		return [];
	}
	// core/columns — walk each column's innerBlocks recursively to extract items.
	if ( block.name === 'core/columns' ) {
		return ( block.innerBlocks ?? [] ).flatMap( ( column ) =>
			( column.innerBlocks ?? [] ).flatMap( extractItemFromBlock )
		);
	}
	// core/group — already handled by the transform itself, but when nested inside
	// columns we may encounter groups; walk their innerBlocks too.
	if ( block.name === 'core/group' ) {
		return ( block.innerBlocks ?? [] ).flatMap( extractItemFromBlock );
	}
	return [];
}

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
