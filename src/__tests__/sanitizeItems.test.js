/**
 * Tests for validateSavedItems() (the client-side item sanitizer) from edit.js.
 *
 * validateSavedItems is a module-level pure function. We inline the
 * implementation here to keep tests self-contained, pending the JS architecture
 * refactor that will export it as a named function.
 */

const VALID_ITEM_TYPES = new Set( [
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
] );

// Mirror of validateSavedItems from edit.js.
function validateSavedItems( raw ) {
	if ( ! Array.isArray( raw ) ) {
		return [];
	}
	return raw
		.filter(
			( item ) =>
				item !== null &&
				typeof item === 'object' &&
				VALID_ITEM_TYPES.has( item.type ) &&
				typeof item.content === 'string' &&
				typeof ( item.url ?? '' ) === 'string'
		)
		.map( ( item ) => {
			const clean = {
				id: typeof item.id === 'string' ? item.id : 'generated',
				type: item.type,
				content: item.content,
				url: item.url ?? '',
			};
			if ( Number.isInteger( item.mediaId ) ) {
				clean.mediaId = item.mediaId;
			}
			if ( Array.isArray( item.urls ) ) {
				clean.urls = item.urls.filter( ( u ) => typeof u === 'string' );
			}
			return clean;
		} );
}

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

	it( 'handles all valid content types', () => {
		const types = [
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
		const raw = types.map( ( type, i ) => ( {
			id: String( i ),
			type,
			content: type,
			url: '',
		} ) );
		const result = validateSavedItems( raw );
		expect( result ).toHaveLength( types.length );
	} );
} );
