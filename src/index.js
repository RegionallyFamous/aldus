import {
	registerBlockType,
	createBlock,
	registerBlockVariation,
} from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import metadata from './block.json';
import Edit from './edit';
import save from './save';

/** Generate a unique ID with a fallback for non-secure contexts. */
function generateId() {
	if (
		typeof crypto !== 'undefined' &&
		typeof crypto.randomUUID === 'function'
	) {
		return crypto.randomUUID();
	}
	// Fallback: v4-like UUID via Math.random() (no bitwise operators).
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, ( c ) => {
		const r = Math.floor( Math.random() * 16 );
		const v = c === 'x' ? r : ( r % 4 ) + 8;
		return v.toString( 16 );
	} );
}

registerBlockType( metadata.name, {
	edit: Edit,
	save,
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
		/**
		 * Transform FROM core/group — re-layout existing grouped content.
		 * Extracts heading, paragraph, image, quote, list, buttons, embed,
		 * table, and gallery inner blocks into Aldus items.
		 */
		from: [
			{
				type: 'block',
				blocks: [ 'core/group' ],
				transform: ( _, innerBlocks ) => {
					const VIDEO_HOSTS = /youtube\.com|youtu\.be|vimeo\.com/i;

					const items = innerBlocks
						.flatMap( ( block ) => {
							if ( block.name === 'core/heading' ) {
								return [
									{
										id: generateId(),
										type:
											block.attributes.level === 1
												? 'headline'
												: 'subheading',
										content: block.attributes.content ?? '',
										url: '',
									},
								];
							}
							if ( block.name === 'core/paragraph' ) {
								return [
									{
										id: generateId(),
										type: 'paragraph',
										content: block.attributes.content ?? '',
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
								// Join all list-item text into a single
								// newline-separated string.
								const listText = ( block.innerBlocks ?? [] )
									.map(
										( li ) => li.attributes?.content ?? ''
									)
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
								const firstBtn = (
									block.innerBlocks ?? []
								).find( ( b ) => b.name === 'core/button' );
								if ( ! firstBtn ) {
									return [];
								}
								return [
									{
										id: generateId(),
										type: 'cta',
										content:
											firstBtn.attributes?.text ?? '',
										url: firstBtn.attributes?.url ?? '',
									},
								];
							}
							if ( block.name === 'core/embed' ) {
								const embedUrl = block.attributes?.url ?? '';
								if (
									embedUrl &&
									VIDEO_HOSTS.test( embedUrl )
								) {
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
								// Flatten all cell content into a summary
								// string for the table item.
								const rows = [
									...( block.attributes?.head ?? [] ),
									...( block.attributes?.body ?? [] ),
								];
								const cellText = rows
									.flatMap( ( row ) =>
										( row.cells ?? [] ).map(
											( cell ) => cell.content ?? ''
										)
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
								// Collect up to 4 image URLs.
								const galleryUrls = ( block.innerBlocks ?? [] )
									.filter( ( b ) => b.name === 'core/image' )
									.slice( 0, 4 )
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
							return [];
						} )
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
				content: 'Every Cup Has a Story Worth Tasting',
				url: '',
			},
			{
				id: '2',
				type: 'paragraph',
				content:
					'We travel to the source — high-altitude farms in Ethiopia, Colombia, and Guatemala — to find coffees that taste like somewhere. Each bag carries GPS coordinates, a harvest date, and a name we know personally.',
				url: '',
			},
			{
				id: '3',
				type: 'paragraph',
				content:
					'Our roasting philosophy is simple: get out of the way. Light roasts that let terroir speak. No dark-roast smoke screen hiding mediocre beans. Just coffee, done right.',
				url: '',
			},
			{
				id: '4',
				type: 'image',
				content: 'Coffee farm at sunrise',
				url: '',
			},
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
				content: 'Designed for What Comes Next',
				url: '',
			},
			{
				id: '2',
				type: 'subheading',
				content:
					'The platform built for teams that move fast and care about quality.',
				url: '',
			},
			{
				id: '3',
				type: 'paragraph',
				content:
					'Built for modern workflows, Meridian adapts to how your team actually works — no configuration overhead, no compromises on capability.',
				url: '',
			},
			{
				id: '4',
				type: 'cta',
				content: 'Start Free Trial',
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
				content: 'The Vanishing Art of Hand-Roasting',
				url: '',
			},
			{
				id: '2',
				type: 'quote',
				content: "We don't roast to a profile. We roast to a place.",
				url: '',
			},
			{
				id: '3',
				type: 'paragraph',
				content:
					'There is a moment, about four minutes into a proper pour-over, when the bloom settles and the coffee begins to open up. This is why we do what we do.',
				url: '',
			},
			{
				id: '4',
				type: 'paragraph',
				content:
					'Most specialty roasters talk about flavor notes. We talk about the farmer who picked those cherries at peak ripeness, the mill that processed them over 48 hours, and the exporter who kept the chain of custody intact.',
				url: '',
			},
			{
				id: '5',
				type: 'image',
				content: 'High-altitude farm, Ethiopia',
				url: '',
			},
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
				content: 'Introducing the Platform That Scales With You',
				url: '',
			},
			{
				id: '2',
				type: 'subheading',
				content: "Everything your team needs. Nothing they don't.",
				url: '',
			},
			{
				id: '3',
				type: 'list',
				content:
					'Real-time collaboration across unlimited projects\n' +
					'Role-based permissions with audit logging\n' +
					'Native integrations with 80+ tools\n' +
					'99.99% uptime SLA with dedicated support',
				url: '',
			},
			{
				id: '4',
				type: 'cta',
				content: 'See Plans & Pricing',
				url: '#',
			},
		],
		enabledPersonalities: [ 'Ledger', 'Broadside', 'Tribune', 'Solstice' ],
	},
} );
