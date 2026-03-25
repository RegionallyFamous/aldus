/**
 * Tests for packToItems() in src/sample-data/index.js.
 */

import { packToItems } from '../sample-data/index.js';

// Minimal pack fixture — mirrors the real pack structure without loading the
// full pack files so the test stays fast and dependency-free.
const FIXTURE_PACK = {
	id: 'test',
	label: 'Test Pack',
	palette: {
		image: [ '#111111', '#222222', '#333333' ],
	},
	content: {
		'heading:h1': [ 'The Headline', 'Another Headline' ],
		'heading:h2': [ 'A Subheading' ],
		paragraph: [ 'Body copy one.', 'Body copy two.' ],
		quote: [ 'A great quote.' ],
		'pullquote:wide': [ 'A wide pullquote.' ],
		'image:wide': [ { alt: 'Wide image', colorIndex: 0 } ],
		'image:full': [ { alt: 'Full image', colorIndex: 1 } ],
		'buttons:cta': [ 'Buy now' ],
		list: [ { items: [ 'Item A', 'Item B' ], style: 'unordered' } ],
		'media-text:left': [
			{ heading: 'Feature', body: 'Details.', alt: 'Alt', colorIndex: 2 },
		],
		'gallery:3-col': [
			[ { alt: 'Img 1' }, { alt: 'Img 2' }, { alt: 'Img 3' } ],
		],
	},
};

describe( 'packToItems()', () => {
	it( 'returns an empty array for a null pack', () => {
		expect( packToItems( null ) ).toEqual( [] );
	} );

	it( 'returns an empty array for a non-object pack', () => {
		expect( packToItems( 'string' ) ).toEqual( [] );
		expect( packToItems( 42 ) ).toEqual( [] );
	} );

	it( 'returns an empty array for an empty pack', () => {
		expect( packToItems( {} ) ).toEqual( [] );
	} );

	it( 'extracts headline items from heading:h1', () => {
		const items = packToItems( FIXTURE_PACK );
		const headlines = items.filter( ( i ) => i.type === 'headline' );
		expect( headlines.length ).toBe( 2 );
		expect( headlines[ 0 ].content ).toBe( 'The Headline' );
	} );

	it( 'extracts subheading items from heading:h2', () => {
		const items = packToItems( FIXTURE_PACK );
		const subheadings = items.filter( ( i ) => i.type === 'subheading' );
		// At least the one from heading:h2; media-text also adds subheadings.
		expect( subheadings.length ).toBeGreaterThanOrEqual( 1 );
		expect(
			subheadings.some( ( s ) => s.content === 'A Subheading' )
		).toBe( true );
	} );

	it( 'extracts paragraph items', () => {
		const items = packToItems( FIXTURE_PACK );
		const paragraphs = items.filter( ( i ) => i.type === 'paragraph' );
		expect( paragraphs.length ).toBeGreaterThanOrEqual( 2 );
	} );

	it( 'extracts quote items from quote and pullquote fields', () => {
		const items = packToItems( FIXTURE_PACK );
		const quotes = items.filter( ( i ) => i.type === 'quote' );
		// quote + pullquote:wide = 2 items minimum.
		expect( quotes.length ).toBeGreaterThanOrEqual( 2 );
	} );

	it( 'extracts image items from image:wide and image:full', () => {
		const items = packToItems( FIXTURE_PACK );
		const images = items.filter( ( i ) => i.type === 'image' );
		// image:wide + image:full + media-text = at least 3.
		expect( images.length ).toBeGreaterThanOrEqual( 3 );
	} );

	it( 'assigns an SVG data URL to image items', () => {
		const items = packToItems( FIXTURE_PACK );
		const images = items.filter( ( i ) => i.type === 'image' );
		images.forEach( ( img ) => {
			expect( img.url ).toMatch( /^data:image\/svg\+xml,/ );
		} );
	} );

	it( 'extracts cta items from buttons:cta', () => {
		const items = packToItems( FIXTURE_PACK );
		const ctas = items.filter( ( i ) => i.type === 'cta' );
		expect( ctas.length ).toBeGreaterThanOrEqual( 1 );
		expect( ctas[ 0 ].content ).toBe( 'Buy now' );
	} );

	it( 'extracts list items', () => {
		const items = packToItems( FIXTURE_PACK );
		const lists = items.filter( ( i ) => i.type === 'list' );
		expect( lists.length ).toBeGreaterThanOrEqual( 1 );
	} );

	it( 'all items have required fields', () => {
		const items = packToItems( FIXTURE_PACK );
		expect( items.length ).toBeGreaterThan( 0 );
		items.forEach( ( item ) => {
			expect( item ).toHaveProperty( 'type' );
			expect( item ).toHaveProperty( 'content' );
			expect( item ).toHaveProperty( 'url' );
		} );
	} );
} );
