/**
 * Aldus sample-data packs.
 *
 * Each pack has a `content` map keyed by token type with 2–3 variants per type.
 * `packToItems()` flattens the rich structure into the flat items array the
 * PHP /assemble endpoint expects — extracting all variants so the
 * Aldus_Content_Distributor's cursor advances through diverse copy.
 */

import { roast } from './roast.js';
import { meridian } from './meridian.js';
import { hearth } from './hearth.js';
import { plume } from './plume.js';
import { grove } from './grove.js';
import { loot } from './loot.js';
import { signal } from './signal.js';

export { roast, meridian, hearth, plume, grove, loot, signal };
export const PACKS = [ roast, meridian, hearth, plume, grove, loot, signal ];

// ---------------------------------------------------------------------------
// SVG placeholder helper — two-tone gradient 4:3 rectangle as a data URL.
// Used by packToItems() so image tokens render with visual depth in previews.
// ---------------------------------------------------------------------------

const svgPlaceholder = ( primary, secondary ) =>
	`data:image/svg+xml,${ encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3">` +
			`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
			`<stop offset="0%" stop-color="${ primary }"/>` +
			`<stop offset="100%" stop-color="${ secondary }"/>` +
			`</linearGradient></defs>` +
			`<rect width="4" height="3" fill="url(#g)"/>` +
			`<line x1="0" y1="3" x2="4" y2="0" stroke="${ primary }" stroke-opacity="0.15" stroke-width="0.15"/>` +
			`</svg>`
	) }`;

// ---------------------------------------------------------------------------
// packToItems( pack ) — converts rich pack content into a flat items array
// compatible with Aldus_Content_Distributor (PHP /assemble endpoint).
//
// Strategy: extract ALL variants of every content type so the distributor
// cursor advances through diverse copy as it renders repeated tokens
// (e.g. two media-text panels, two column blocks, etc.).
// ---------------------------------------------------------------------------

export function packToItems( pack ) {
	if ( ! pack || typeof pack !== 'object' ) {
		return [];
	}
	const content = pack.content ?? {};
	const palette = pack.palette ?? {};
	const items = [];

	const imgColor = ( idx = 0 ) => {
		const colors =
			Array.isArray( palette.image ) && palette.image.length > 0
				? palette.image
				: [ '#cccccc', '#aaaaaa' ];
		const primary = colors[ idx % colors.length ];
		const secondary = colors[ ( idx + 1 ) % colors.length ];
		return svgPlaceholder( primary, secondary );
	};

	// --- Headlines ---
	( content[ 'heading:h1' ] ?? [] ).forEach( ( text ) =>
		items.push( { type: 'headline', content: text, url: '' } )
	);

	// --- Subheadings from h2 and h3 ---
	[
		...( content[ 'heading:h2' ] ?? [] ),
		...( content[ 'heading:h3' ] ?? [] ),
	].forEach( ( text ) =>
		items.push( { type: 'subheading', content: text, url: '' } )
	);

	// --- Paragraphs (including dropcap variants) ---
	[
		...( content.paragraph ?? [] ),
		...( content[ 'paragraph:dropcap' ] ?? [] ),
	].forEach( ( text ) =>
		items.push( { type: 'paragraph', content: text, url: '' } )
	);

	// --- Quotes (regular + pullquote variants) ---
	[
		...( content.quote ?? [] ),
		...( content[ 'pullquote:wide' ] ?? [] ),
		...( content[ 'pullquote:full-solid' ] ?? [] ),
	].forEach( ( text ) =>
		items.push( { type: 'quote', content: text, url: '' } )
	);

	// --- Standalone images ---
	[
		...( content[ 'image:wide' ] ?? [] ),
		...( content[ 'image:full' ] ?? [] ),
	].forEach( ( img ) =>
		items.push( {
			type: 'image',
			content: img.alt ?? '',
			url: imgColor( img.colorIndex ),
		} )
	);

	// --- Media-text entries → image + subheading + paragraph each ---
	[
		...( content[ 'media-text:left' ] ?? [] ),
		...( content[ 'media-text:right' ] ?? [] ),
	].forEach( ( mt ) => {
		items.push( {
			type: 'image',
			content: mt.alt ?? mt.heading ?? '',
			url: imgColor( mt.colorIndex ),
		} );
		items.push( {
			type: 'subheading',
			content: String( mt.heading ?? '' ),
			url: '',
		} );
		items.push( {
			type: 'paragraph',
			content: String( mt.body ?? '' ),
			url: '',
		} );
	} );

	// --- Asymmetric column variants → subheading + paragraph per variant ---
	( content[ 'columns:28-72' ] ?? [] ).forEach( ( col ) => {
		items.push( {
			type: 'subheading',
			content: String( col.label ?? '' ),
			url: '',
		} );
		items.push( {
			type: 'paragraph',
			content: String( col.body ?? '' ),
			url: '',
		} );
	} );

	// --- Three-column variants → subheading + paragraph per column cell ---
	( content[ 'columns:3-equal' ] ?? [] ).forEach( ( variantGroup ) => {
		( Array.isArray( variantGroup ) ? variantGroup : [] ).forEach(
			( col ) => {
				items.push( {
					type: 'subheading',
					content: col.heading,
					url: '',
				} );
				items.push( { type: 'paragraph', content: col.body, url: '' } );
			}
		);
	} );

	// --- Group blocks → subheading + paragraph + cta per group ---
	[ 'group:dark-full', 'group:light-full', 'group:accent-full' ].forEach(
		( key ) => {
			( content[ key ] ?? [] ).forEach( ( group ) => {
				items.push( {
					type: 'subheading',
					content: group.heading,
					url: '',
				} );
				if ( group.body ) {
					items.push( {
						type: 'paragraph',
						content: group.body,
						url: '',
					} );
				}
				if ( group.cta ) {
					items.push( { type: 'cta', content: group.cta, url: '#' } );
				}
			} );
		}
	);

	// --- Standalone CTAs ---
	( content[ 'buttons:cta' ] ?? [] ).forEach( ( text ) =>
		items.push( { type: 'cta', content: text, url: '#' } )
	);

	// --- Lists — each variant is an array of strings; join with newlines ---
	( content.list ?? [] ).forEach( ( listArr ) => {
		const listText = Array.isArray( listArr )
			? listArr.join( '\n' )
			: String( listArr );
		if ( listText ) {
			items.push( { type: 'list', content: listText, url: '' } );
		}
	} );

	// --- Video — each entry has { caption, url } ---
	( content.video ?? [] ).forEach( ( vid ) => {
		items.push( {
			type: 'video',
			content: vid.caption ?? '',
			url: vid.url ?? '',
		} );
	} );

	// --- Table — each entry has { caption, rows: [[cell, ...], ...] } ---
	( content.table ?? [] ).forEach( ( tbl ) => {
		// Join all cell text into a flat summary the distributor can hold.
		const cellText = ( tbl.rows ?? [] )
			.flat()
			.filter( Boolean )
			.join( ' | ' );
		items.push( {
			type: 'table',
			content: tbl.caption ? `${ tbl.caption }: ${ cellText }` : cellText,
			url: '',
		} );
	} );

	// --- Gallery — each entry has { caption, colorIndices: [0, 1, 2, 3] } ---
	( content.gallery ?? [] ).forEach( ( gal ) => {
		const urls = ( gal.colorIndices ?? [ 0, 1, 2, 3 ] ).map( ( idx ) =>
			imgColor( idx )
		);
		items.push( {
			type: 'gallery',
			content: gal.caption ?? '',
			url: urls[ 0 ],
			urls,
		} );
	} );

	return items;
}
