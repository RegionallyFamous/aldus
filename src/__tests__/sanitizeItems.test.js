/**
 * Tests for validateSavedItems() and VALID_ITEM_TYPES from
 * src/hooks/useAldusItems.js.
 *
 * Previously these tests contained an inlined copy of the implementation
 * (without the code/details types that were later added). They now import
 * the real exports so any change to useAldusItems.js is caught immediately.
 */

import {
	validateSavedItems,
	VALID_ITEM_TYPES,
} from '../hooks/useAldusItems.js';

describe( 'validateSavedItems()', () => {
	it( 'returns empty array for non-array input', () => {
		expect( validateSavedItems( null ) ).toEqual( [] );
		expect( validateSavedItems( undefined ) ).toEqual( [] );
		expect( validateSavedItems( {} ) ).toEqual( [] );
		expect( validateSavedItems( 'string' ) ).toEqual( [] );
	} );

	it( 'returns empty array for empty array', () => {
		expect( validateSavedItems( [] ) ).toEqual( [] );
	} );

	it( 'keeps valid items', () => {
		const raw = [
			{ id: 'abc', type: 'headline', content: 'Hello', url: '' },
			{ id: 'def', type: 'paragraph', content: 'World', url: '' },
		];
		const result = validateSavedItems( raw );
		expect( result ).toHaveLength( 2 );
	} );

	it( 'drops items with invalid types', () => {
		const raw = [
			{ id: 'a', type: 'headline', content: 'Valid', url: '' },
			{ id: 'b', type: 'unknown-type', content: 'Invalid', url: '' },
			{ id: 'c', type: 'custom', content: 'Also invalid', url: '' },
		];
		const result = validateSavedItems( raw );
		expect( result ).toHaveLength( 1 );
		expect( result[ 0 ].type ).toBe( 'headline' );
	} );

	it( 'drops items missing content string', () => {
		const raw = [
			{ id: 'a', type: 'headline', content: 42, url: '' },
			{ id: 'b', type: 'headline', url: '' },
		];
		expect( validateSavedItems( raw ) ).toHaveLength( 0 );
	} );

	it( 'fills missing url with empty string', () => {
		const raw = [ { id: 'a', type: 'headline', content: 'Hi' } ];
		const result = validateSavedItems( raw );
		expect( result[ 0 ].url ).toBe( '' );
	} );

	it( 'preserves a valid string id', () => {
		const raw = [ { id: 'my-id', type: 'headline', content: 'Hi', url: '' } ];
		const result = validateSavedItems( raw );
		expect( result[ 0 ].id ).toBe( 'my-id' );
	} );

	it( 'generates a new id when id is empty string', () => {
		const raw = [ { id: '', type: 'headline', content: 'Hi', url: '' } ];
		const result = validateSavedItems( raw );
		// uid() produces a non-empty string that is not the empty string.
		expect( typeof result[ 0 ].id ).toBe( 'string' );
		expect( result[ 0 ].id.length ).toBeGreaterThan( 0 );
	} );

	it( 'preserves mediaId when it is an integer', () => {
		const raw = [
			{ id: 'a', type: 'image', content: 'Alt', url: '', mediaId: 42 },
		];
		const result = validateSavedItems( raw );
		expect( result[ 0 ].mediaId ).toBe( 42 );
	} );

	it( 'drops non-integer mediaId', () => {
		const raw = [
			{ id: 'a', type: 'image', content: 'Alt', url: '', mediaId: '42' },
		];
		const result = validateSavedItems( raw );
		expect( result[ 0 ].mediaId ).toBeUndefined();
	} );

	it( 'preserves string-only urls array on gallery items', () => {
		const raw = [
			{
				id: 'a',
				type: 'gallery',
				content: '',
				url: '',
				urls: [
					'http://example.com/a.jpg',
					42,
					'http://example.com/b.jpg',
				],
			},
		];
		const result = validateSavedItems( raw );
		expect( result[ 0 ].urls ).toEqual( [
			'http://example.com/a.jpg',
			'http://example.com/b.jpg',
		] );
	} );

	it( 'accepts the code content type (added in later release)', () => {
		const raw = [ { id: 'a', type: 'code', content: 'const x = 1;', url: '' } ];
		const result = validateSavedItems( raw );
		expect( result ).toHaveLength( 1 );
		expect( result[ 0 ].type ).toBe( 'code' );
	} );

	it( 'accepts the details content type (added in later release)', () => {
		const raw = [
			{ id: 'a', type: 'details', content: 'FAQ answer', url: '' },
		];
		const result = validateSavedItems( raw );
		expect( result ).toHaveLength( 1 );
		expect( result[ 0 ].type ).toBe( 'details' );
	} );

	it( 'handles all valid content types defined in VALID_ITEM_TYPES', () => {
		const raw = [ ...VALID_ITEM_TYPES ].map( ( type, i ) => ( {
			id: String( i ),
			type,
			content: type,
			url: '',
		} ) );
		const result = validateSavedItems( raw );
		expect( result ).toHaveLength( VALID_ITEM_TYPES.size );
	} );
} );

describe( 'VALID_ITEM_TYPES', () => {
	it( 'is a Set', () => {
		expect( VALID_ITEM_TYPES ).toBeInstanceOf( Set );
	} );

	it( 'includes the original content types', () => {
		const expected = [
			'headline',
			'subheading',
			'paragraph',
			'quote',
			'image',
			'cta',
			'list',
			'video',
			'table',
			'gallery',
		];
		expected.forEach( ( type ) => {
			expect( VALID_ITEM_TYPES.has( type ) ).toBe( true );
		} );
	} );

	it( 'includes code and details (added post-initial release)', () => {
		expect( VALID_ITEM_TYPES.has( 'code' ) ).toBe( true );
		expect( VALID_ITEM_TYPES.has( 'details' ) ).toBe( true );
	} );
} );
