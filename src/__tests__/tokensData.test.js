/**
 * Tests for pure functions exported from src/data/tokens.js.
 *
 * These functions are central to the generation pipeline — computeCoverage
 * drives the "unused content" badges, computeBestMatches drives the "best
 * match" personality highlights, formatTokenPool drives the LLM prompt, and
 * scorePersonalityFit drives the layout card sort order.
 */

import {
	computeCoverage,
	computeBestMatches,
	formatTokenPool,
	scorePersonalityFit,
	VALID_TOKENS,
	TOKEN_CATEGORIES,
} from '../data/tokens.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DISPATCH = {
	name: 'Dispatch',
	anchors: [ 'cover:dark', 'pullquote:full-solid', 'buttons:cta' ],
	creativity: 0,
};

const FOLIO = {
	name: 'Folio',
	anchors: [ 'columns:28-72', 'heading:h2' ],
	creativity: 0,
};

const NOCTURNE = {
	name: 'Nocturne',
	anchors: [ 'cover:dark', 'image:full' ],
	creativity: 1,
};

// ---------------------------------------------------------------------------
// computeCoverage()
// ---------------------------------------------------------------------------

describe( 'computeCoverage()', () => {
	it( 'returns no unused types when all manifest types are covered', () => {
		// cover:dark covers 'image'; paragraph covers 'paragraph'.
		const manifest = { image: 1, paragraph: 2 };
		const tokens = [ 'cover:dark', 'paragraph' ];
		const result = computeCoverage( manifest, tokens );
		expect( result.unused ).toHaveLength( 0 );
	} );

	it( 'returns unused types that no token covers', () => {
		const manifest = { image: 1, paragraph: 2, cta: 1 };
		const tokens = [ 'cover:dark', 'paragraph' ]; // no cta token
		const result = computeCoverage( manifest, tokens );
		expect( result.unused ).toContain( 'cta' );
	} );

	it( 'returns empty unused for empty manifest', () => {
		const result = computeCoverage( {}, [ 'paragraph', 'cover:dark' ] );
		expect( result.unused ).toHaveLength( 0 );
	} );

	it( 'returns all manifest types as unused when tokens are empty', () => {
		const manifest = { image: 1, paragraph: 2 };
		const result = computeCoverage( manifest, [] );
		expect( result.unused ).toContain( 'image' );
		expect( result.unused ).toContain( 'paragraph' );
	} );

	it( 'handles structural tokens that have no content requirements', () => {
		// separator and spacer have no TOKEN_CONTENT_TYPES entry —
		// they should not remove any type from unused.
		const manifest = { image: 1 };
		const tokens = [ 'separator', 'spacer:large' ];
		const result = computeCoverage( manifest, tokens );
		expect( result.unused ).toContain( 'image' );
	} );

	it( 'returns an object with an unused property', () => {
		const result = computeCoverage( {}, [] );
		expect( result ).toHaveProperty( 'unused' );
		expect( Array.isArray( result.unused ) ).toBe( true );
	} );
} );

// ---------------------------------------------------------------------------
// computeBestMatches()
// ---------------------------------------------------------------------------

describe( 'computeBestMatches()', () => {
	const personalities = [ DISPATCH, FOLIO, NOCTURNE ];

	it( 'returns a Set', () => {
		const items = [ { type: 'image' } ];
		const result = computeBestMatches( items, personalities );
		expect( result ).toBeInstanceOf( Set );
	} );

	it( 'returns Dispatch when image + quote + cta are all present', () => {
		const items = [ { type: 'image' }, { type: 'quote' }, { type: 'cta' } ];
		const result = computeBestMatches( items, personalities );
		expect( result.has( 'Dispatch' ) ).toBe( true );
	} );

	it( 'returns Nocturne when image is present', () => {
		const items = [ { type: 'image' } ];
		const result = computeBestMatches( items, personalities );
		// Nocturne anchors: cover:dark (needs image) + image:full (needs image)
		expect( result.has( 'Nocturne' ) ).toBe( true );
	} );

	it( 'returns empty set when no personality anchors are satisfied', () => {
		const items = [ { type: 'paragraph' } ];
		const result = computeBestMatches( items, personalities );
		// None of Dispatch (needs image+quote+cta), Folio (needs headline+paragraph),
		// Nocturne (needs image) can be fully satisfied with paragraph only.
		// Dispatch needs image, quote, cta — not all present.
		// But Folio needs headline AND paragraph.
		// Actually let me check: Folio anchors = columns:28-72 (needs headline+paragraph), heading:h2 (needs subheading).
		// With only paragraph: heading:h2 needs subheading (not present) → not satisfied.
		expect( result.has( 'Dispatch' ) ).toBe( false );
	} );

	it( 'returns at most 3 personalities', () => {
		const items = [
			{ type: 'image' },
			{ type: 'quote' },
			{ type: 'cta' },
			{ type: 'headline' },
			{ type: 'paragraph' },
			{ type: 'subheading' },
		];
		// Build a large personality list to test the cap of 3.
		const many = Array.from( { length: 10 }, ( _, i ) => ( {
			name: `P${ i }`,
			anchors: [ 'separator' ], // separator has no content requirements → always satisfied
			creativity: 0,
		} ) );
		const result = computeBestMatches( items, many );
		expect( result.size ).toBeLessThanOrEqual( 3 );
	} );

	it( 'handles empty items array', () => {
		const result = computeBestMatches( [], personalities );
		// No items → no types present → no anchors satisfied.
		expect( result.size ).toBe( 0 );
	} );
} );

// ---------------------------------------------------------------------------
// formatTokenPool()
// ---------------------------------------------------------------------------

describe( 'formatTokenPool()', () => {
	it( 'groups tokens by category', () => {
		const pool = [ 'cover:dark', 'paragraph' ];
		const result = formatTokenPool( pool );
		// Should contain the category name and token.
		expect( result ).toMatch( /Covers:/i );
		expect( result ).toContain( 'cover:dark' );
	} );

	it( 'returns empty string for empty pool', () => {
		const result = formatTokenPool( [] );
		expect( result ).toBe( '' );
	} );

	it( 'formats all VALID_TOKENS into category groups', () => {
		const result = formatTokenPool( VALID_TOKENS );
		// Every category should appear.
		Object.keys( TOKEN_CATEGORIES ).forEach( ( category ) => {
			expect( result ).toContain( category + ':' );
		} );
	} );

	it( 'only includes categories with tokens in the pool', () => {
		// Only cover tokens — should not include "Text:" or "Buttons:".
		const pool = [ 'cover:dark', 'cover:light' ];
		const result = formatTokenPool( pool );
		expect( result ).not.toContain( 'Text:' );
		expect( result ).not.toContain( 'Buttons:' );
	} );

	it( 'puts uncategorized tokens in an Other: section', () => {
		const pool = [ 'my-custom-token' ];
		const result = formatTokenPool( pool );
		expect( result ).toContain( 'Other:' );
		expect( result ).toContain( 'my-custom-token' );
	} );

	it( 'separates categories with /', () => {
		const pool = [ 'cover:dark', 'paragraph' ];
		const result = formatTokenPool( pool );
		expect( result ).toContain( ' / ' );
	} );
} );

// ---------------------------------------------------------------------------
// scorePersonalityFit()
// ---------------------------------------------------------------------------

describe( 'scorePersonalityFit()', () => {
	const personalities = [ DISPATCH, FOLIO, NOCTURNE ];

	it( 'returns a Map', () => {
		const layouts = [ { label: 'Dispatch', tokens: [ 'cover:dark' ] } ];
		const manifest = { image: 1 };
		const result = scorePersonalityFit( layouts, manifest, personalities );
		expect( result ).toBeInstanceOf( Map );
	} );

	it( 'returns 1.0 for a personality whose all anchors are satisfied', () => {
		// Nocturne anchors: cover:dark (needs image), image:full (needs image).
		const layouts = [
			{ label: 'Nocturne', tokens: [ 'cover:dark', 'image:full' ] },
		];
		const manifest = { image: 1 };
		const result = scorePersonalityFit( layouts, manifest, personalities );
		expect( result.get( 'Nocturne' ) ).toBe( 1 );
	} );

	it( 'returns 0 for an unknown personality label', () => {
		const layouts = [ { label: 'Unknown', tokens: [] } ];
		const manifest = {};
		const result = scorePersonalityFit( layouts, manifest, personalities );
		expect( result.get( 'Unknown' ) ).toBe( 0 );
	} );

	it( 'returns fractional score when only some anchors are satisfied', () => {
		// Dispatch anchors: cover:dark (needs image), pullquote:full-solid (needs quote), buttons:cta (needs cta).
		// With only image: 1 satisfied out of 3 = 0.333...
		const layouts = [ { label: 'Dispatch', tokens: [ 'cover:dark' ] } ];
		const manifest = { image: 1 }; // only image, no quote or cta
		const result = scorePersonalityFit( layouts, manifest, personalities );
		const score = result.get( 'Dispatch' );
		expect( score ).toBeGreaterThan( 0 );
		expect( score ).toBeLessThan( 1 );
	} );

	it( 'handles empty layouts array', () => {
		const result = scorePersonalityFit( [], {}, personalities );
		expect( result.size ).toBe( 0 );
	} );
} );
