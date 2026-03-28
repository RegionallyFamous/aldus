/**
 * Tests for extractPlainText() and extractItemFromBlock() exported from
 * src/index.js.
 *
 * These helpers convert WordPress block data into Aldus content items.
 * They're pure functions (except for the uid() call for id generation)
 * so they are straightforward to unit-test in isolation.
 */

import {
	extractPlainText,
	extractItemFromBlock,
	collectItemsFromEditorBlocks,
} from '../lib/extract-helpers.js';

// ---------------------------------------------------------------------------
// extractPlainText()
// ---------------------------------------------------------------------------

describe( 'extractPlainText()', () => {
	it( 'returns a plain string unchanged', () => {
		expect( extractPlainText( 'Hello world' ) ).toBe( 'Hello world' );
	} );

	it( 'strips HTML tags from a string', () => {
		expect( extractPlainText( '<strong>Bold</strong> text' ) ).toBe(
			'Bold text'
		);
	} );

	it( 'strips nested tags', () => {
		expect( extractPlainText( '<a href="#"><em>Link</em></a>' ) ).toBe(
			'Link'
		);
	} );

	it( 'returns empty string for empty string', () => {
		expect( extractPlainText( '' ) ).toBe( '' );
	} );

	it( 'handles RichText object with text property', () => {
		expect( extractPlainText( { text: 'Rich text' } ) ).toBe( 'Rich text' );
	} );

	it( 'handles RichText object with originalHTML property', () => {
		expect(
			extractPlainText( { originalHTML: '<em>Emphasis</em>' } )
		).toBe( 'Emphasis' );
	} );

	it( 'returns empty string for null', () => {
		expect( extractPlainText( null ) ).toBe( '' );
	} );

	it( 'returns empty string for undefined', () => {
		expect( extractPlainText( undefined ) ).toBe( '' );
	} );
} );

// ---------------------------------------------------------------------------
// extractItemFromBlock()
// ---------------------------------------------------------------------------

describe( 'extractItemFromBlock()', () => {
	// -----------------------------------------------------------------------
	// core/heading
	// -----------------------------------------------------------------------

	it( 'maps a level-1 heading to headline', () => {
		const block = {
			name: 'core/heading',
			attributes: { level: 1, content: 'My Headline' },
			innerBlocks: [],
		};
		const result = extractItemFromBlock( block );
		expect( result ).toHaveLength( 1 );
		expect( result[ 0 ].type ).toBe( 'headline' );
		expect( result[ 0 ].content ).toBe( 'My Headline' );
	} );

	it( 'maps a level-2 heading to subheading', () => {
		const block = {
			name: 'core/heading',
			attributes: { level: 2, content: 'A Subheading' },
			innerBlocks: [],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'subheading' );
	} );

	it( 'maps level 3+ headings to subheading', () => {
		const block = {
			name: 'core/heading',
			attributes: { level: 3, content: 'H3' },
			innerBlocks: [],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'subheading' );
	} );

	// -----------------------------------------------------------------------
	// core/paragraph
	// -----------------------------------------------------------------------

	it( 'maps core/paragraph to paragraph type', () => {
		const block = {
			name: 'core/paragraph',
			attributes: { content: 'A paragraph of text.' },
			innerBlocks: [],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'paragraph' );
		expect( result[ 0 ].content ).toBe( 'A paragraph of text.' );
	} );

	// -----------------------------------------------------------------------
	// core/image
	// -----------------------------------------------------------------------

	it( 'maps core/image to image type', () => {
		const block = {
			name: 'core/image',
			attributes: { url: 'https://example.com/img.jpg', alt: 'Alt' },
			innerBlocks: [],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'image' );
		expect( result[ 0 ].url ).toBe( 'https://example.com/img.jpg' );
	} );

	// -----------------------------------------------------------------------
	// core/quote
	// -----------------------------------------------------------------------

	it( 'maps core/quote to quote type', () => {
		const block = {
			name: 'core/quote',
			attributes: { value: 'A great quote.' },
			innerBlocks: [],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'quote' );
		expect( result[ 0 ].content ).toBe( 'A great quote.' );
	} );

	// -----------------------------------------------------------------------
	// core/list
	// -----------------------------------------------------------------------

	it( 'maps core/list to list type, joining inner items', () => {
		const block = {
			name: 'core/list',
			attributes: {},
			innerBlocks: [
				{
					name: 'core/list-item',
					attributes: { content: 'First' },
				},
				{
					name: 'core/list-item',
					attributes: { content: 'Second' },
				},
			],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'list' );
		expect( result[ 0 ].content ).toContain( 'First' );
		expect( result[ 0 ].content ).toContain( 'Second' );
	} );

	it( 'returns empty array for core/list with no inner blocks', () => {
		const block = { name: 'core/list', attributes: {}, innerBlocks: [] };
		expect( extractItemFromBlock( block ) ).toHaveLength( 0 );
	} );

	// -----------------------------------------------------------------------
	// core/buttons
	// -----------------------------------------------------------------------

	it( 'maps core/buttons to cta type', () => {
		const block = {
			name: 'core/buttons',
			attributes: {},
			innerBlocks: [
				{
					name: 'core/button',
					attributes: {
						text: 'Click me',
						url: 'https://example.com',
					},
				},
			],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'cta' );
		expect( result[ 0 ].content ).toBe( 'Click me' );
		expect( result[ 0 ].url ).toBe( 'https://example.com' );
	} );

	// -----------------------------------------------------------------------
	// core/embed (video)
	// -----------------------------------------------------------------------

	it( 'maps a YouTube core/embed to video type', () => {
		const block = {
			name: 'core/embed',
			attributes: { url: 'https://youtube.com/watch?v=abc123' },
			innerBlocks: [],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'video' );
	} );

	it( 'returns empty array for non-video core/embed', () => {
		const block = {
			name: 'core/embed',
			attributes: { url: 'https://twitter.com/foo' },
			innerBlocks: [],
		};
		expect( extractItemFromBlock( block ) ).toHaveLength( 0 );
	} );

	// -----------------------------------------------------------------------
	// core/table
	// -----------------------------------------------------------------------

	it( 'maps core/table to table type', () => {
		const block = {
			name: 'core/table',
			attributes: {
				head: [
					{
						cells: [
							{ content: 'Header A' },
							{ content: 'Header B' },
						],
					},
				],
				body: [
					{ cells: [ { content: 'Row 1A' }, { content: 'Row 1B' } ] },
				],
			},
			innerBlocks: [],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'table' );
		expect( result[ 0 ].content ).toContain( 'Header A' );
	} );

	// -----------------------------------------------------------------------
	// core/gallery
	// -----------------------------------------------------------------------

	it( 'maps core/gallery to gallery type', () => {
		const block = {
			name: 'core/gallery',
			attributes: {},
			innerBlocks: [
				{
					name: 'core/image',
					attributes: { url: 'https://example.com/g1.jpg' },
				},
				{
					name: 'core/image',
					attributes: { url: 'https://example.com/g2.jpg' },
				},
			],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'gallery' );
		expect( result[ 0 ].urls ).toHaveLength( 2 );
	} );

	// -----------------------------------------------------------------------
	// core/details
	// -----------------------------------------------------------------------

	it( 'maps core/details to details type using inner paragraph content', () => {
		const block = {
			name: 'core/details',
			attributes: {},
			innerBlocks: [
				{
					name: 'core/paragraph',
					attributes: { content: 'FAQ answer' },
				},
			],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'details' );
		expect( result[ 0 ].content ).toBe( 'FAQ answer' );
	} );

	// -----------------------------------------------------------------------
	// Unknown block name
	// -----------------------------------------------------------------------

	it( 'returns empty array for unknown block types', () => {
		const block = {
			name: 'core/unknown-block',
			attributes: {},
			innerBlocks: [],
		};
		expect( extractItemFromBlock( block ) ).toHaveLength( 0 );
	} );

	// -----------------------------------------------------------------------
	// id generation
	// -----------------------------------------------------------------------

	it( 'assigns a non-empty string id to each extracted item', () => {
		const block = {
			name: 'core/paragraph',
			attributes: { content: 'Test' },
			innerBlocks: [],
		};
		const result = extractItemFromBlock( block );
		expect( typeof result[ 0 ].id ).toBe( 'string' );
		expect( result[ 0 ].id.length ).toBeGreaterThan( 0 );
	} );
} );

// ---------------------------------------------------------------------------
// collectItemsFromEditorBlocks()
// ---------------------------------------------------------------------------

describe( 'collectItemsFromEditorBlocks()', () => {
	it( 'collects paragraphs using attributes.content', () => {
		const blocks = [
			{
				name: 'core/paragraph',
				attributes: { content: 'Body copy' },
				innerBlocks: [],
			},
		];
		const out = collectItemsFromEditorBlocks( blocks );
		expect(
			out.some(
				( i ) => i.type === 'paragraph' && i.content === 'Body copy'
			)
		).toBe( true );
	} );

	it( 'skips aldus/layout-generator', () => {
		const blocks = [
			{
				name: 'aldus/layout-generator',
				attributes: { savedItems: [] },
				innerBlocks: [],
			},
			{
				name: 'core/paragraph',
				attributes: { content: 'Keep me' },
				innerBlocks: [],
			},
		];
		expect( collectItemsFromEditorBlocks( blocks ) ).toHaveLength( 1 );
	} );

	it( 'walks core/group innerBlocks', () => {
		const blocks = [
			{
				name: 'core/group',
				attributes: {},
				innerBlocks: [
					{
						name: 'core/heading',
						attributes: { content: 'T', level: 2 },
						innerBlocks: [],
					},
				],
			},
		];
		const out = collectItemsFromEditorBlocks( blocks );
		expect(
			out.some( ( i ) => i.type === 'subheading' && i.content === 'T' )
		).toBe( true );
	} );

	it( 'drops empty paragraph payloads', () => {
		const blocks = [
			{
				name: 'core/paragraph',
				attributes: { content: '' },
				innerBlocks: [],
			},
		];
		expect( collectItemsFromEditorBlocks( blocks ) ).toHaveLength( 0 );
	} );

	it( 'returns empty array for non-array input', () => {
		expect( collectItemsFromEditorBlocks( null ) ).toEqual( [] );
	} );
} );
