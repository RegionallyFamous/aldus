/**
 * Tests for matchChipToPhrase() and inferStyleFromContent() from
 * src/utils/infer-style.js.
 *
 * inferStyleFromContent() is async and calls an engine, so the engine is
 * mocked following the same pattern as intelligence.test.js.
 */

import {
	matchChipToPhrase,
	inferStyleFromContent,
	CHIP_KEYWORDS,
} from '../utils/infer-style.js';

// ---------------------------------------------------------------------------
// matchChipToPhrase()
// ---------------------------------------------------------------------------

describe( 'matchChipToPhrase()', () => {
	it( 'returns null for empty string', () => {
		expect( matchChipToPhrase( '' ) ).toBeNull();
	} );

	it( 'returns null for null input', () => {
		expect( matchChipToPhrase( null ) ).toBeNull();
	} );

	it( 'matches image-lead chip for photo phrase', () => {
		expect( matchChipToPhrase( 'photo-forward design' ) ).toBe(
			'image-lead'
		);
	} );

	it( 'matches text-first chip for editorial phrase', () => {
		expect( matchChipToPhrase( 'bold editorial style' ) ).toBe(
			'text-first'
		);
	} );

	it( 'matches minimal chip', () => {
		expect( matchChipToPhrase( 'clean and minimal' ) ).toBe( 'minimal' );
	} );

	it( 'matches cta-focus chip for sales phrase', () => {
		expect( matchChipToPhrase( 'sales conversion page' ) ).toBe(
			'cta-focus'
		);
	} );

	it( 'matches dark chip for moody phrase', () => {
		expect( matchChipToPhrase( 'moody dark atmosphere' ) ).toBe( 'dark' );
	} );

	it( 'matches magazine chip', () => {
		// 'spread' contains 'read' → matches text-first before magazine,
		// so use a phrase with only magazine-specific keywords.
		expect( matchChipToPhrase( 'magazine story layout' ) ).toBe(
			'magazine'
		);
	} );

	it( 'returns null for phrase matching no chip', () => {
		expect( matchChipToPhrase( 'xkcd nonsense blarp' ) ).toBeNull();
	} );

	it( 'is case-insensitive', () => {
		expect( matchChipToPhrase( 'PHOTO GALLERY' ) ).toBe( 'image-lead' );
		expect( matchChipToPhrase( 'EDITORIAL Bold' ) ).toBe( 'text-first' );
	} );

	it( 'CHIP_KEYWORDS is an object with at least 5 entries', () => {
		expect( typeof CHIP_KEYWORDS ).toBe( 'object' );
		expect( Object.keys( CHIP_KEYWORDS ).length ).toBeGreaterThanOrEqual(
			5
		);
	} );

	it( 'every chip keyword is a non-empty string', () => {
		Object.values( CHIP_KEYWORDS )
			.flat()
			.forEach( ( kw ) => {
				expect( typeof kw ).toBe( 'string' );
				expect( kw.length ).toBeGreaterThan( 0 );
			} );
	} );
} );

// ---------------------------------------------------------------------------
// inferStyleFromContent() — async, uses mocked engine
// ---------------------------------------------------------------------------

describe( 'inferStyleFromContent()', () => {
	function makeEngine( responseText ) {
		return {
			chat: {
				completions: {
					create: jest.fn().mockResolvedValue( {
						choices: [ { message: { content: responseText } } ],
					} ),
				},
			},
		};
	}

	it( 'returns null when engine is null', async () => {
		const result = await inferStyleFromContent( null, { paragraph: 2 } );
		expect( result ).toBeNull();
	} );

	it( 'returns null when manifest is empty', async () => {
		const engine = makeEngine( 'bold editorial' );
		const result = await inferStyleFromContent( engine, {} );
		expect( result ).toBeNull();
	} );

	it( 'returns null when manifest is null', async () => {
		const engine = makeEngine( 'bold editorial' );
		const result = await inferStyleFromContent( engine, null );
		expect( result ).toBeNull();
	} );

	it( 'returns the engine response phrase, lowercased and trimmed', async () => {
		const engine = makeEngine( '  Bold Editorial  ' );
		const result = await inferStyleFromContent( engine, { paragraph: 2 } );
		expect( result ).toBe( 'bold editorial' );
	} );

	it( 'strips quotation marks from the response', async () => {
		const engine = makeEngine( '"bold editorial"' );
		const result = await inferStyleFromContent( engine, { paragraph: 2 } );
		expect( result ).not.toContain( '"' );
	} );

	it( 'strips trailing period from the response', async () => {
		const engine = makeEngine( 'bold editorial.' );
		const result = await inferStyleFromContent( engine, { paragraph: 2 } );
		expect( result ).not.toMatch( /\.$/ );
	} );

	it( 'returns null when response is too long (>60 chars)', async () => {
		const engine = makeEngine( 'a'.repeat( 61 ) );
		const result = await inferStyleFromContent( engine, { paragraph: 2 } );
		expect( result ).toBeNull();
	} );

	it( 'returns null when engine throws', async () => {
		const engine = {
			chat: {
				completions: {
					create: jest
						.fn()
						.mockRejectedValue( new Error( 'Engine error' ) ),
				},
			},
		};
		const result = await inferStyleFromContent( engine, { paragraph: 2 } );
		expect( result ).toBeNull();
	} );

	it( 'calls the engine with a prompt mentioning the content types', async () => {
		const engine = makeEngine( 'image-forward' );
		await inferStyleFromContent( engine, { image: 2, paragraph: 1 } );

		const callArg = engine.chat.completions.create.mock.calls[ 0 ][ 0 ];
		const prompt = callArg.messages[ 0 ].content;
		expect( prompt ).toContain( 'image' );
		expect( prompt ).toContain( 'paragraph' );
	} );
} );
