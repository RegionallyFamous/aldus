/**
 * Aldus sample-data packs.
 *
 * Each pack has a `content` map keyed by token type with 2–3 variants per type.
 * `packToItems()` flattens the rich structure into the flat items array the
 * PHP /assemble endpoint expects — extracting all variants so the
 * Aldus_Content_Distributor's cursor advances through diverse copy.
 *
 * --- Lazy-loading strategy ---
 * `PACKS` (full data) is still exported for backward compat with any code that
 * needs the content synchronously.  For the PackSelector UI, import `PACK_META`
 * instead — it contains only id / label / emoji / description / palette and
 * keeps the main bundle light.  When content is actually needed (the user
 * clicks a pack), call `await loadPackContent( packId )` to dynamically import
 * just that pack's module.
 */

import { roast } from './roast.js';
import { meridian } from './meridian.js';
import { hearth } from './hearth.js';
import { plume } from './plume.js';
import { grove } from './grove.js';
import { loot } from './loot.js';
import { signal } from './signal.js';
import { forge } from './forge.js';
import { slim } from './slim.js';

export { roast, meridian, hearth, plume, grove, loot, signal, forge, slim };
export const PACKS = [
	roast,
	meridian,
	hearth,
	plume,
	grove,
	loot,
	signal,
	forge,
	slim,
];

// ---------------------------------------------------------------------------
// Pack metadata only — safe to keep in the main bundle (no content strings).
// ---------------------------------------------------------------------------

/**
 * Strips the heavy `content` key from a pack object.
 *
 * @param {Object} root0         Pack object.
 * @param {Object} root0.content Pack content map (removed from output).
 */
const stripContent = ( { content: _content, ...meta } ) => meta; // eslint-disable-line no-unused-vars

export const PACK_META = PACKS.map( stripContent );

// ---------------------------------------------------------------------------
// Lazy pack content loader — dynamically imports the pack module on demand.
// ---------------------------------------------------------------------------

/** Pack id → dynamic import factory (webpack/rollup can tree-shake per chunk). */
const PACK_LOADERS = {
	roast: () =>
		import( /* webpackChunkName: "pack-roast"    */ './roast.js' ).then(
			( m ) => m.roast
		),
	meridian: () =>
		import( /* webpackChunkName: "pack-meridian" */ './meridian.js' ).then(
			( m ) => m.meridian
		),
	hearth: () =>
		import( /* webpackChunkName: "pack-hearth"   */ './hearth.js' ).then(
			( m ) => m.hearth
		),
	plume: () =>
		import( /* webpackChunkName: "pack-plume"    */ './plume.js' ).then(
			( m ) => m.plume
		),
	grove: () =>
		import( /* webpackChunkName: "pack-grove"    */ './grove.js' ).then(
			( m ) => m.grove
		),
	loot: () =>
		import( /* webpackChunkName: "pack-loot"     */ './loot.js' ).then(
			( m ) => m.loot
		),
	signal: () =>
		import( /* webpackChunkName: "pack-signal"   */ './signal.js' ).then(
			( m ) => m.signal
		),
	forge: () =>
		import( /* webpackChunkName: "pack-forge"    */ './forge.js' ).then(
			( m ) => m.forge
		),
	slim: () =>
		import( /* webpackChunkName: "pack-slim"     */ './slim.js' ).then(
			( m ) => m.slim
		),
};

// Resolved pack cache — maps packId → full pack object.
const packCache = new Map();
// In-flight promise cache — maps packId → Promise<pack> while a load is pending.
// Prevents duplicate dynamic imports when loadPackContent is called concurrently
// for the same id before the first import resolves.
const packInflight = new Map();

/**
 * Lazily loads the full pack (including `content`) for the given pack id.
 * Returns the full pack object — the same shape as the static exports above.
 * If the pack id is unknown or loading fails, falls back to the static bundle.
 *
 * Concurrent calls for the same id share one in-flight Promise.
 *
 * @param {string} packId Pack identifier (e.g. 'roast', 'meridian').
 */
export async function loadPackContent( packId ) {
	// Already resolved — fast path.
	if ( packCache.has( packId ) ) {
		return packCache.get( packId );
	}
	// Another call is already in flight for this id — share its Promise.
	if ( packInflight.has( packId ) ) {
		return packInflight.get( packId );
	}

	const loader = PACK_LOADERS[ packId ];

	const loadPromise = loader
		? loader()
				.then( ( pack ) => {
					packCache.set( packId, pack );
					packInflight.delete( packId );
					return pack;
				} )
				.catch( ( err ) => {
					packInflight.delete( packId );
					if ( window?.aldusDebug ) {
						// eslint-disable-next-line no-console
						console.error(
							'[Aldus] loadPackContent failed for',
							packId,
							err
						);
					}
					// Fall through to static bundle below.
					return null;
				} )
				.then( ( pack ) => {
					if ( pack ) {
						return pack;
					}
					const fallback =
						PACKS.find( ( p ) => p.id === packId ) ?? null;
					if ( fallback ) {
						packCache.set( packId, fallback );
					}
					return fallback;
				} )
		: Promise.resolve(
				PACKS.find( ( p ) => p.id === packId ) ?? null
		  ).then( ( fallback ) => {
				if ( fallback ) {
					packCache.set( packId, fallback );
				}
				return fallback;
		  } );

	packInflight.set( packId, loadPromise );
	return loadPromise;
}

// ---------------------------------------------------------------------------
// SVG placeholder helpers — two-tone gradient 4:3 rectangles as data URLs.
// Each pack specifies palette.imagePattern to get a distinct visual texture.
// ---------------------------------------------------------------------------

const SVG_OPEN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3">`;
const gradient = ( p, s ) =>
	`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
	`<stop offset="0%" stop-color="${ p }"/>` +
	`<stop offset="100%" stop-color="${ s }"/>` +
	`</linearGradient></defs><rect width="4" height="3" fill="url(#g)"/>`;

// Scattered organic dots — good for warm/artisanal brands.
const patternGrain = ( p ) =>
	`<circle cx="1" cy="0.8" r="0.08" fill="${ p }" opacity="0.2"/>` +
	`<circle cx="2.5" cy="1.5" r="0.1" fill="${ p }" opacity="0.15"/>` +
	`<circle cx="0.5" cy="2.1" r="0.07" fill="${ p }" opacity="0.2"/>` +
	`<circle cx="3.2" cy="0.55" r="0.09" fill="${ p }" opacity="0.18"/>` +
	`<circle cx="1.8" cy="2.6" r="0.06" fill="${ p }" opacity="0.15"/>` +
	`<circle cx="3.5" cy="2.2" r="0.07" fill="${ p }" opacity="0.12"/>`;

// Regular dot matrix — precise/technical brands.
const patternGrid = ( p ) =>
	[ 1, 2, 3 ]
		.flatMap( ( x ) =>
			[ 0.75, 1.5, 2.25 ].map(
				( y ) =>
					`<circle cx="${ x }" cy="${ y }" r="0.05" fill="${ p }" opacity="0.25"/>`
			)
		)
		.join( '' );

// Horizontal strata — calm/editorial brands.
const patternStrata = ( p ) =>
	`<line x1="0" y1="0.75" x2="4" y2="0.75" stroke="${ p }" stroke-opacity="0.12" stroke-width="0.06"/>` +
	`<line x1="0" y1="1.5" x2="4" y2="1.5" stroke="${ p }" stroke-opacity="0.15" stroke-width="0.06"/>` +
	`<line x1="0" y1="2.25" x2="4" y2="2.25" stroke="${ p }" stroke-opacity="0.1" stroke-width="0.06"/>`;

// Hex outlines — playful/structured brands.
const patternHex = ( p ) =>
	`<polygon points="2,0.3 3,0.75 3,1.5 2,1.95 1,1.5 1,0.75" fill="none" stroke="${ p }" stroke-opacity="0.2" stroke-width="0.07"/>` +
	`<polygon points="2,1.2 3,1.65 3,2.4 2,2.85 1,2.4 1,1.65" fill="none" stroke="${ p }" stroke-opacity="0.13" stroke-width="0.07"/>`;

// Single diagonal — neutral default.
const patternDiagonal = ( p ) =>
	`<line x1="0" y1="3" x2="4" y2="0" stroke="${ p }" stroke-opacity="0.15" stroke-width="0.15"/>`;

const PATTERN_FNS = {
	grain: patternGrain,
	grid: patternGrid,
	strata: patternStrata,
	hex: patternHex,
	diagonal: patternDiagonal,
};

/**
 * Ensures a color is a safe hex string before embedding in SVG markup.
 *
 * @param {*} color Raw color value from pack palette.
 * @return {string} A valid #rrggbb or #rgb hex color.
 */
const safeSvgColor = ( color ) => {
	const str = typeof color === 'string' ? color.trim() : '#cccccc';
	// Accept 3- and 6-character hex values (with or without leading #).
	if ( ! /^#?[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test( str ) ) {
		return '#cccccc';
	}
	return str.startsWith( '#' ) ? str : '#' + str;
};

const svgPlaceholder = ( primary, secondary, pattern = 'diagonal' ) => {
	const p = safeSvgColor( primary );
	const s = safeSvgColor( secondary );
	const overlayFn = PATTERN_FNS[ pattern ] ?? patternDiagonal;
	return `data:image/svg+xml,${ encodeURIComponent(
		SVG_OPEN + gradient( p, s ) + overlayFn( p ) + `</svg>`
	) }`;
};

// ---------------------------------------------------------------------------
// packToItems( pack ) — converts rich pack content into a flat items array
// compatible with Aldus_Content_Distributor (PHP /assemble endpoint).
//
// Strategy: extract ALL variants of every content type so the distributor
// cursor advances through diverse copy as it renders repeated tokens
// (e.g. two media-text panels, two column blocks, etc.).
// ---------------------------------------------------------------------------

/** Generate a unique id for each item so bindings lookups work per-item. */
const packItemId = () =>
	typeof crypto?.randomUUID === 'function'
		? crypto.randomUUID()
		: Math.random().toString( 36 ).slice( 2 ) + Date.now().toString( 36 );

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
		return svgPlaceholder(
			primary,
			secondary,
			palette.imagePattern ?? 'diagonal'
		);
	};

	/**
	 * Pushes one item, generating a stable unique id for bindings lookups.
	 *
	 * @param {Object} obj Item fields (type, content, url, etc.).
	 */
	const push = ( obj ) => items.push( { id: packItemId(), ...obj } );

	// --- Headlines ---
	( content[ 'heading:h1' ] ?? [] ).forEach( ( text ) =>
		push( { type: 'headline', content: text, url: '' } )
	);

	// --- Subheadings from h2 and h3 ---
	[
		...( content[ 'heading:h2' ] ?? [] ),
		...( content[ 'heading:h3' ] ?? [] ),
	].forEach( ( text ) =>
		push( { type: 'subheading', content: text, url: '' } )
	);

	// --- Paragraphs (including dropcap variants) ---
	[
		...( content.paragraph ?? [] ),
		...( content[ 'paragraph:dropcap' ] ?? [] ),
	].forEach( ( text ) =>
		push( { type: 'paragraph', content: text, url: '' } )
	);

	// --- Quotes (regular + pullquote variants) ---
	[
		...( content.quote ?? [] ),
		...( content[ 'pullquote:wide' ] ?? [] ),
		...( content[ 'pullquote:full-solid' ] ?? [] ),
	].forEach( ( text ) => push( { type: 'quote', content: text, url: '' } ) );

	// --- Standalone images ---
	[
		...( content[ 'image:wide' ] ?? [] ),
		...( content[ 'image:full' ] ?? [] ),
	].forEach( ( img ) =>
		push( {
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
		push( {
			type: 'image',
			content: mt.alt ?? mt.heading ?? '',
			url: imgColor( mt.colorIndex ),
		} );
		push( {
			type: 'subheading',
			content: String( mt.heading ?? '' ),
			url: '',
		} );
		push( {
			type: 'paragraph',
			content: String( mt.body ?? '' ),
			url: '',
		} );
	} );

	// --- Asymmetric column variants → subheading + paragraph per variant ---
	( content[ 'columns:28-72' ] ?? [] ).forEach( ( col ) => {
		push( {
			type: 'subheading',
			content: String( col.label ?? '' ),
			url: '',
		} );
		push( {
			type: 'paragraph',
			content: String( col.body ?? '' ),
			url: '',
		} );
	} );

	// --- Three-column variants → subheading + paragraph per column cell ---
	( content[ 'columns:3-equal' ] ?? [] ).forEach( ( variantGroup ) => {
		( Array.isArray( variantGroup ) ? variantGroup : [] ).forEach(
			( col ) => {
				push( {
					type: 'subheading',
					content: String( col.heading ?? '' ),
					url: '',
				} );
				push( {
					type: 'paragraph',
					content: String( col.body ?? '' ),
					url: '',
				} );
			}
		);
	} );

	// --- Group blocks → subheading + paragraph + cta per group ---
	[ 'group:dark-full', 'group:light-full', 'group:accent-full' ].forEach(
		( key ) => {
			( content[ key ] ?? [] ).forEach( ( group ) => {
				push( {
					type: 'subheading',
					content: String( group.heading ?? '' ),
					url: '',
				} );
				if ( group.body ) {
					push( {
						type: 'paragraph',
						content: String( group.body ),
						url: '',
					} );
				}
				if ( group.cta ) {
					push( {
						type: 'cta',
						content: String( group.cta ),
						url: '#',
					} );
				}
			} );
		}
	);

	// --- Standalone CTAs ---
	( content[ 'buttons:cta' ] ?? [] ).forEach( ( text ) =>
		push( { type: 'cta', content: text, url: '#' } )
	);

	// --- Lists — each variant is an array of strings; join with newlines ---
	( content.list ?? [] ).forEach( ( listArr ) => {
		const listText = Array.isArray( listArr )
			? listArr.join( '\n' )
			: String( listArr );
		if ( listText ) {
			push( { type: 'list', content: listText, url: '' } );
		}
	} );

	// --- Video — each entry has { caption, url } ---
	( content.video ?? [] ).forEach( ( vid ) => {
		push( {
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
		push( {
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
		push( {
			type: 'gallery',
			content: gal.caption ?? '',
			url: urls[ 0 ],
			urls,
		} );
	} );

	return items;
}
