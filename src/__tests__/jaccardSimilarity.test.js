/**
 * Tests for jaccard() from src/lib/similarity.js.
 *
 * Previously this function was private to useAldusGeneration.js. It has been
 * extracted to src/lib/similarity.js so it can be tested and reused.
 */

import { jaccard } from '../lib/similarity.js';

describe( 'jaccard()', () => {
	it( 'returns 1 for two identical arrays', () => {
		const a = [ 'cover:dark', 'paragraph', 'buttons:cta' ];
		expect( jaccard( a, [ ...a ] ) ).toBe( 1 );
	} );

	it( 'returns 0 for two completely disjoint arrays', () => {
		expect( jaccard( [ 'cover:dark' ], [ 'paragraph' ] ) ).toBe( 0 );
	} );

	it( 'returns 0 for two empty arrays', () => {
		expect( jaccard( [], [] ) ).toBe( 0 );
	} );

	it( 'returns a value in [0, 1]', () => {
		const a = [ 'cover:dark', 'paragraph', 'buttons:cta' ];
		const b = [ 'cover:dark', 'heading:h1', 'separator' ];
		const result = jaccard( a, b );
		expect( result ).toBeGreaterThanOrEqual( 0 );
		expect( result ).toBeLessThanOrEqual( 1 );
	} );

	it( 'returns 0.5 for two arrays that share exactly half their union', () => {
		// a = {A, B}, b = {B, C} → intersection = {B}, union = {A,B,C} → 1/3
		// Let's use a = {A, B, C}, b = {C, D, E} → intersection = {C}, union = {A,B,C,D,E} → 1/5
		// For exactly 0.5: a = {A, B}, b = {A, C} → intersection = {A}, union = {A,B,C} → 1/3
		// For 0.5: a = {A, B}, b = {A, B, C, D} → intersection = {A,B}, union = {A,B,C,D} → 2/4 = 0.5
		const a = [ 'A', 'B' ];
		const b = [ 'A', 'B', 'C', 'D' ];
		expect( jaccard( a, b ) ).toBe( 0.5 );
	} );

	it( 'is symmetric — jaccard(a, b) === jaccard(b, a)', () => {
		const a = [ 'cover:dark', 'paragraph' ];
		const b = [ 'paragraph', 'heading:h1', 'buttons:cta' ];
		expect( jaccard( a, b ) ).toBe( jaccard( b, a ) );
	} );

	it( 'ignores duplicate entries — treats inputs as sets', () => {
		// Duplicates in a or b should not inflate the score.
		const a = [ 'X', 'X', 'Y' ];
		const b = [ 'X', 'Z' ];
		const noDedup = jaccard( a, b );
		const deduped = jaccard( [ 'X', 'Y' ], b );
		expect( noDedup ).toBe( deduped );
	} );

	it( 'handles single-element arrays', () => {
		expect( jaccard( [ 'a' ], [ 'a' ] ) ).toBe( 1 );
		expect( jaccard( [ 'a' ], [ 'b' ] ) ).toBe( 0 );
	} );

	it( 'returns a non-NaN numeric value for any input', () => {
		const pairs = [
			[ [], [] ],
			[ [ 'a' ], [] ],
			[ [], [ 'a' ] ],
			[
				[ 'a', 'b', 'c' ],
				[ 'b', 'c', 'd', 'e' ],
			],
		];
		pairs.forEach( ( [ a, b ] ) => {
			const result = jaccard( a, b );
			expect( typeof result ).toBe( 'number' );
			expect( isNaN( result ) ).toBe( false );
		} );
	} );
} );
