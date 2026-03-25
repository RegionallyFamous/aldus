/**
 * Tests for enforceAnchors() defined in src/edit.js.
 *
 * enforceAnchors is a module-level pure function. We inline the implementation
 * here so the test doesn't depend on importing the entire monolithic edit.js.
 * When edit.js is refactored to export enforceAnchors as a named export this
 * test can switch to a direct import.
 */

// Mirror of the enforceAnchors function from edit.js.
// Copied here to keep tests self-contained pending the JS architecture refactor.
function enforceAnchors( personality, tokens ) {
	const tokenSet = new Set( tokens );
	const missing = personality.anchors.filter( ( a ) => ! tokenSet.has( a ) );
	return personality.creativity === 0
		? [ ...missing, ...tokens ]
		: [ ...tokens, ...missing ];
}

const DISPATCH = {
	name: 'Dispatch',
	anchors: [ 'cover:dark', 'pullquote:full-solid', 'buttons:cta' ],
	creativity: 0,
};

const NOCTURNE = {
	name: 'Nocturne',
	anchors: [ 'cover:dark', 'image:full' ],
	creativity: 1,
};

const SOLSTICE = {
	name: 'Solstice',
	anchors: [ 'cover:minimal', 'columns:2-equal' ],
	creativity: 1,
};

describe( 'enforceAnchors() — strict (creativity: 0)', () => {
	it( 'prepends missing anchors', () => {
		const result = enforceAnchors( DISPATCH, [ 'paragraph' ] );
		expect( result[ 0 ] ).toBe( 'cover:dark' );
		expect( result[ 1 ] ).toBe( 'pullquote:full-solid' );
		expect( result[ 2 ] ).toBe( 'buttons:cta' );
	} );

	it( 'does not duplicate existing anchors', () => {
		const tokens = [
			'cover:dark',
			'pullquote:full-solid',
			'buttons:cta',
			'paragraph',
		];
		const result = enforceAnchors( DISPATCH, tokens );
		// Anchors already present — no duplicates added.
		expect( result.filter( ( t ) => t === 'cover:dark' ).length ).toBe( 1 );
	} );

	it( 'keeps the existing tokens in their original order after prepended anchors', () => {
		const result = enforceAnchors( DISPATCH, [ 'paragraph', 'separator' ] );
		const paragraphIdx = result.indexOf( 'paragraph' );
		const separatorIdx = result.indexOf( 'separator' );
		expect( paragraphIdx ).toBeLessThan( separatorIdx );
	} );

	it( 'works with an empty token array', () => {
		const result = enforceAnchors( DISPATCH, [] );
		expect( result ).toEqual( [
			'cover:dark',
			'pullquote:full-solid',
			'buttons:cta',
		] );
	} );
} );

describe( 'enforceAnchors() — loose (creativity: 1)', () => {
	it( 'appends missing anchors at the end', () => {
		const result = enforceAnchors( NOCTURNE, [ 'paragraph', 'separator' ] );
		expect( result[ 0 ] ).toBe( 'paragraph' );
		expect( result[ result.length - 2 ] ).toBe( 'cover:dark' );
		expect( result[ result.length - 1 ] ).toBe( 'image:full' );
	} );

	it( 'does not move anchors that are already present', () => {
		const tokens = [ 'cover:dark', 'paragraph', 'image:full' ];
		const result = enforceAnchors( NOCTURNE, tokens );
		// Both anchors already present — result equals input.
		expect( result ).toEqual( tokens );
	} );

	it( 'works with an empty token array', () => {
		const result = enforceAnchors( SOLSTICE, [] );
		expect( result ).toEqual( [ 'cover:minimal', 'columns:2-equal' ] );
	} );
} );

describe( 'enforceAnchors() — no anchors', () => {
	const PLAIN = { name: 'Plain', anchors: [], creativity: 0 };

	it( 'returns the input tokens unchanged when no anchors defined', () => {
		const tokens = [ 'paragraph', 'heading:h2' ];
		expect( enforceAnchors( PLAIN, tokens ) ).toEqual( tokens );
	} );
} );
