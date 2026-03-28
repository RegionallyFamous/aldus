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

	it( 'maps core/quote with empty value but inner paragraphs to quote', () => {
		const block = {
			name: 'core/quote',
			attributes: { value: '' },
			innerBlocks: [
				{
					name: 'core/paragraph',
					attributes: { content: 'Line one.' },
				},
				{
					name: 'core/paragraph',
					attributes: { content: 'Line two.' },
				},
			],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'quote' );
		expect( result[ 0 ].content ).toBe( 'Line one.\nLine two.' );
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
	// core/button
	// -----------------------------------------------------------------------

	it( 'maps standalone core/button to cta type', () => {
		const block = {
			name: 'core/button',
			attributes: {
				text: 'Solo',
				url: 'https://example.org',
			},
			innerBlocks: [],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'cta' );
		expect( result[ 0 ].content ).toBe( 'Solo' );
		expect( result[ 0 ].url ).toBe( 'https://example.org' );
	} );

	// -----------------------------------------------------------------------
	// core/video / core/audio
	// -----------------------------------------------------------------------

	it( 'maps core/video with src to video type', () => {
		const block = {
			name: 'core/video',
			attributes: { src: 'https://example.com/v.mp4' },
			innerBlocks: [],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'video' );
		expect( result[ 0 ].url ).toBe( 'https://example.com/v.mp4' );
	} );

	it( 'normalises protocol-relative video src', () => {
		const block = {
			name: 'core/video',
			attributes: { src: '//cdn.example.com/v.mp4' },
			innerBlocks: [],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].url ).toBe( 'https://cdn.example.com/v.mp4' );
	} );

	it( 'maps core/audio to video item type', () => {
		const block = {
			name: 'core/audio',
			attributes: { src: 'https://example.com/a.ogg' },
			innerBlocks: [],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'video' );
		expect( result[ 0 ].url ).toBe( 'https://example.com/a.ogg' );
	} );

	// -----------------------------------------------------------------------
	// core/file
	// -----------------------------------------------------------------------

	it( 'maps core/file to cta with href and fileName', () => {
		const block = {
			name: 'core/file',
			attributes: {
				href: 'https://example.com/doc.pdf',
				fileName: 'Handbook.pdf',
			},
			innerBlocks: [],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'cta' );
		expect( result[ 0 ].content ).toBe( 'Handbook.pdf' );
		expect( result[ 0 ].url ).toBe( 'https://example.com/doc.pdf' );
	} );

	// -----------------------------------------------------------------------
	// core/html / core/freeform
	// -----------------------------------------------------------------------

	it( 'maps core/html to paragraph with flattened text', () => {
		const block = {
			name: 'core/html',
			attributes: { content: '<div class="x"><p>Hello</p></div>' },
			innerBlocks: [],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'paragraph' );
		expect( result[ 0 ].content ).toBe( 'Hello' );
	} );

	it( 'maps core/freeform to paragraph', () => {
		const block = {
			name: 'core/freeform',
			attributes: { content: '<p>Classic</p>' },
			innerBlocks: [],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'paragraph' );
		expect( result[ 0 ].content ).toBe( 'Classic' );
	} );

	// -----------------------------------------------------------------------
	// core/cover (flatten)
	// -----------------------------------------------------------------------

	it( 'flattens core/cover inner blocks', () => {
		const block = {
			name: 'core/cover',
			attributes: {},
			innerBlocks: [
				{
					name: 'core/paragraph',
					attributes: { content: 'Over media' },
					innerBlocks: [],
				},
			],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'paragraph' );
		expect( result[ 0 ].content ).toBe( 'Over media' );
	} );

	it( 'flattens core/media-text inner blocks', () => {
		const block = {
			name: 'core/media-text',
			attributes: {},
			innerBlocks: [
				{
					name: 'core/paragraph',
					attributes: { content: 'Beside image' },
					innerBlocks: [],
				},
			],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'paragraph' );
		expect( result[ 0 ].content ).toBe( 'Beside image' );
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

	it( 'maps a non-YouTube core/embed to video when URL is http(s)', () => {
		const block = {
			name: 'core/embed',
			attributes: { url: 'https://twitter.com/foo' },
			innerBlocks: [],
		};
		const result = extractItemFromBlock( block );
		expect( result ).toHaveLength( 1 );
		expect( result[ 0 ].type ).toBe( 'video' );
		expect( result[ 0 ].url ).toBe( 'https://twitter.com/foo' );
	} );

	it( 'returns empty array for core/embed without a usable URL', () => {
		const block = {
			name: 'core/embed',
			attributes: { url: '' },
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

	it( 'maps core/details with core/details-summary inner block', () => {
		const block = {
			name: 'core/details',
			attributes: {},
			innerBlocks: [
				{
					name: 'core/details-summary',
					attributes: { content: 'Toggle me' },
				},
				{
					name: 'core/details-content',
					attributes: {},
					innerBlocks: [],
				},
			],
		};
		const result = extractItemFromBlock( block );
		expect( result[ 0 ].type ).toBe( 'details' );
		expect( result[ 0 ].content ).toBe( 'Toggle me' );
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

	it( 'collects paragraphs inside core/cover via flatten', () => {
		const blocks = [
			{
				name: 'core/cover',
				attributes: {},
				innerBlocks: [
					{
						name: 'core/paragraph',
						attributes: { content: 'Inside cover' },
						innerBlocks: [],
					},
				],
			},
		];
		const out = collectItemsFromEditorBlocks( blocks );
		expect(
			out.some(
				( i ) => i.type === 'paragraph' && i.content === 'Inside cover'
			)
		).toBe( true );
	} );

	it( 'includes URL-only video items from core/embed', () => {
		const blocks = [
			{
				name: 'core/embed',
				attributes: { url: 'https://maps.example.com/x' },
				innerBlocks: [],
			},
		];
		const out = collectItemsFromEditorBlocks( blocks );
		expect( out.some( ( i ) => i.type === 'video' && i.url.includes( 'maps' ) ) ).toBe(
			true
		);
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
