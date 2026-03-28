/**
 * Tests for src/lib/api-utils.js
 *
 * isValidAssembleResponse() is the guard function applied to every response
 * from /aldus/v1/assemble before callers read from it.  Tests cover every
 * falsy shape that should be rejected and the canonical valid shape.
 */

import { isValidAssembleResponse } from '../lib/api-utils.js';

describe( 'isValidAssembleResponse', () => {
	// -------------------------------------------------------------------------
	// Falsy / invalid inputs
	// -------------------------------------------------------------------------

	it( 'returns false for null', () => {
		expect( isValidAssembleResponse( null ) ).toBe( false );
	} );

	it( 'returns false for undefined', () => {
		expect( isValidAssembleResponse( undefined ) ).toBe( false );
	} );

	it( 'returns false for a string', () => {
		expect( isValidAssembleResponse( 'ok' ) ).toBe( false );
	} );

	it( 'returns false for a number', () => {
		expect( isValidAssembleResponse( 42 ) ).toBe( false );
	} );

	it( 'returns false for an empty object', () => {
		expect( isValidAssembleResponse( {} ) ).toBe( false );
	} );

	it( 'returns false when success is false', () => {
		expect(
			isValidAssembleResponse( {
				success: false,
				blocks: '<!-- wp:paragraph -->',
				label: 'Dispatch',
			} )
		).toBe( false );
	} );

	it( 'returns false when success is missing', () => {
		expect(
			isValidAssembleResponse( {
				blocks: '<!-- wp:paragraph -->',
				label: 'Dispatch',
			} )
		).toBe( false );
	} );

	it( 'returns false when blocks is missing', () => {
		expect(
			isValidAssembleResponse( {
				success: true,
				label: 'Dispatch',
			} )
		).toBe( false );
	} );

	it( 'returns false when blocks is not a string', () => {
		expect(
			isValidAssembleResponse( {
				success: true,
				blocks: 123,
				label: 'Dispatch',
			} )
		).toBe( false );
	} );

	it( 'returns false when blocks is an empty string', () => {
		expect(
			isValidAssembleResponse( {
				success: true,
				blocks: '',
				label: 'Dispatch',
			} )
		).toBe( false );
	} );

	it( 'returns false when blocks is only whitespace', () => {
		expect(
			isValidAssembleResponse( {
				success: true,
				blocks: '   ',
				label: 'Dispatch',
			} )
		).toBe( false );
	} );

	it( 'returns false when label is missing', () => {
		expect(
			isValidAssembleResponse( {
				success: true,
				blocks: '<!-- wp:paragraph --><p>Hello</p><!-- /wp:paragraph -->',
			} )
		).toBe( false );
	} );

	it( 'returns false when label is not a string', () => {
		expect(
			isValidAssembleResponse( {
				success: true,
				blocks: '<!-- wp:paragraph --><p>Hello</p><!-- /wp:paragraph -->',
				label: 42,
			} )
		).toBe( false );
	} );

	// -------------------------------------------------------------------------
	// Valid response
	// -------------------------------------------------------------------------

	it( 'returns true for a valid minimal response', () => {
		expect(
			isValidAssembleResponse( {
				success: true,
				blocks: '<!-- wp:paragraph --><p>Hello</p><!-- /wp:paragraph -->',
				label: 'Dispatch',
			} )
		).toBe( true );
	} );

	it( 'returns true when additional fields are present', () => {
		expect(
			isValidAssembleResponse( {
				success: true,
				blocks: '<!-- wp:cover --><!-- /wp:cover -->',
				label: 'Nocturne',
				tokens: [ 'cover:split', 'paragraph' ],
				sections: [],
			} )
		).toBe( true );
	} );

	it( 'returns true when blocks_tree is non-empty even if blocks is empty', () => {
		expect(
			isValidAssembleResponse( {
				success: true,
				blocks: '',
				label: 'Dispatch',
				blocks_tree: [
					{
						name: 'core/paragraph',
						attributes: { content: 'Hi' },
					},
				],
			} )
		).toBe( true );
	} );

	it( 'returns true when both blocks and blocks_tree are present', () => {
		expect(
			isValidAssembleResponse( {
				success: true,
				blocks: '<!-- wp:paragraph --><p>x</p><!-- /wp:paragraph -->',
				label: 'Dispatch',
				blocks_tree: [
					{ name: 'core/paragraph', attributes: { content: 'x' } },
				],
			} )
		).toBe( true );
	} );
} );
