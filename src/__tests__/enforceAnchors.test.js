/**
 * Tests for enforceAnchors() from src/lib/prompts.js.
 *
 * Previously these tests contained an inlined copy of the implementation.
 * They now import the real function so any change to prompts.js is caught
 * immediately rather than silently diverging from this file.
 */

import { enforceAnchors } from '../lib/prompts.js';

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
