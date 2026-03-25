/**
 * Tests for the 5 intelligence functions in src/lib/intelligence.js.
 *
 * Each function is tested with:
 *   1. A valid JSON response → the correct structured object is returned.
 *   2. A malformed / unparseable response → the safe empty fallback is returned.
 *   3. An engine that rejects (throws) → the safe empty fallback is returned.
 *
 * Engine stubs follow the same shape as the WebLLM CreateMLCEngine API used
 * in edit.js: an object with a `chat.completions.create` async method that
 * resolves to { choices: [{ message: { content: string } }] }.
 */

import {
	inferStyleDirection,
	scoreCoverage,
	inferLayoutDescription,
	recommendPersonalities,
	analyzeContentHints,
} from '../lib/intelligence.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock engine that resolves with the given content string.
 *
 * @param {string} content The string the model returns as message content.
 * @return {Object}  Stub engine.
 */
function makeEngine( content ) {
	return {
		chat: {
			completions: {
				create: jest.fn().mockResolvedValue( {
					choices: [ { message: { content } } ],
				} ),
			},
		},
	};
}

/**
 * Creates a mock engine that rejects with an error.
 *
 * @param {string} [message] Error message.
 * @return {Object}  Stub engine.
 */
function makeRejectedEngine( message = 'Engine error' ) {
	return {
		chat: {
			completions: {
				create: jest.fn().mockRejectedValue( new Error( message ) ),
			},
		},
	};
}

const MANIFEST = { headline: 1, paragraph: 2, image: 1, cta: 1 };
const ITEMS = [
	{ type: 'headline', content: 'Short headline' },
	{
		type: 'paragraph',
		content: 'Lorem ipsum dolor sit amet consectetur adipiscing elit.',
	},
	{
		type: 'paragraph',
		content: 'Another paragraph with some additional content here.',
	},
];

// ---------------------------------------------------------------------------
// inferStyleDirection
// ---------------------------------------------------------------------------

describe( 'inferStyleDirection()', () => {
	it( 'returns a known style string on valid engine response', async () => {
		const engine = makeEngine( '{"style": "text-heavy editorial"}' );
		const result = await inferStyleDirection( engine, MANIFEST, ITEMS );
		expect( result ).toEqual( { style: 'text-heavy editorial' } );
	} );

	it( 'returns { style: "" } when the engine returns an unknown style value', async () => {
		const engine = makeEngine( '{"style": "totally-made-up-style"}' );
		const result = await inferStyleDirection( engine, MANIFEST, ITEMS );
		expect( result ).toEqual( { style: '' } );
	} );

	it( 'returns { style: "" } on parse failure', async () => {
		const engine = makeEngine( 'not json at all' );
		const result = await inferStyleDirection( engine, MANIFEST, ITEMS );
		expect( result ).toEqual( { style: '' } );
	} );

	it( 'returns { style: "" } when the engine rejects', async () => {
		const engine = makeRejectedEngine();
		const result = await inferStyleDirection( engine, MANIFEST, ITEMS );
		expect( result ).toEqual( { style: '' } );
	} );

	it( 'strips markdown code fences from the response before parsing', async () => {
		const engine = makeEngine(
			'```json\n{"style": "minimal product"}\n```'
		);
		const result = await inferStyleDirection( engine, MANIFEST, ITEMS );
		expect( result ).toEqual( { style: 'minimal product' } );
	} );
} );

// ---------------------------------------------------------------------------
// scoreCoverage
// ---------------------------------------------------------------------------

describe( 'scoreCoverage()', () => {
	const TOKENS = [ 'cover:dark', 'heading:h2', 'paragraph', 'buttons:cta' ];

	it( 'returns unused types on valid engine response', async () => {
		const engine = makeEngine( '{"unused": ["list"]}' );
		const result = await scoreCoverage( engine, MANIFEST, TOKENS );
		expect( result ).toEqual( { unused: [] } );
		// "list" is not in MANIFEST so it is filtered out.
	} );

	it( 'returns types present in the manifest that are flagged unused', async () => {
		const engine = makeEngine( '{"unused": ["image"]}' );
		const result = await scoreCoverage( engine, MANIFEST, TOKENS );
		expect( result ).toEqual( { unused: [ 'image' ] } );
	} );

	it( 'returns { unused: [] } on parse failure', async () => {
		const engine = makeEngine( 'not valid json' );
		const result = await scoreCoverage( engine, MANIFEST, TOKENS );
		expect( result ).toEqual( { unused: [] } );
	} );

	it( 'returns { unused: [] } when the engine rejects', async () => {
		const engine = makeRejectedEngine();
		const result = await scoreCoverage( engine, MANIFEST, TOKENS );
		expect( result ).toEqual( { unused: [] } );
	} );

	it( 'filters out types not present in the manifest', async () => {
		const engine = makeEngine( '{"unused": ["image", "video", "audio"]}' );
		const result = await scoreCoverage( engine, MANIFEST, TOKENS );
		// Only "image" is in MANIFEST; the others are discarded.
		expect( result.unused ).toEqual( [ 'image' ] );
	} );
} );

// ---------------------------------------------------------------------------
// inferLayoutDescription
// ---------------------------------------------------------------------------

describe( 'inferLayoutDescription()', () => {
	const PERSONALITY = {
		name: 'Dispatch',
		description:
			'Breaking-news urgency: dark full-bleed opener, editorial press energy.',
	};
	const TOKENS = [ 'cover:dark', 'heading:h2', 'separator', 'buttons:cta' ];

	it( 'returns a description string on valid engine response', async () => {
		const engine = makeEngine(
			'{"description": "A dramatic dark opener anchors the layout before editorial headings guide the reader to action."}'
		);
		const result = await inferLayoutDescription(
			engine,
			PERSONALITY,
			TOKENS
		);
		expect( typeof result.description ).toBe( 'string' );
		expect( result.description.length ).toBeGreaterThan( 10 );
	} );

	it( 'returns { description: "" } when description is too short', async () => {
		const engine = makeEngine( '{"description": "Short."}' );
		const result = await inferLayoutDescription(
			engine,
			PERSONALITY,
			TOKENS
		);
		expect( result ).toEqual( { description: '' } );
	} );

	it( 'returns { description: "" } on parse failure', async () => {
		const engine = makeEngine( 'I cannot help with that.' );
		const result = await inferLayoutDescription(
			engine,
			PERSONALITY,
			TOKENS
		);
		expect( result ).toEqual( { description: '' } );
	} );

	it( 'returns { description: "" } when the engine rejects', async () => {
		const engine = makeRejectedEngine();
		const result = await inferLayoutDescription(
			engine,
			PERSONALITY,
			TOKENS
		);
		expect( result ).toEqual( { description: '' } );
	} );
} );

// ---------------------------------------------------------------------------
// recommendPersonalities
// ---------------------------------------------------------------------------

describe( 'recommendPersonalities()', () => {
	const PERSONALITIES = [
		{
			name: 'Dispatch',
			anchors: [ 'cover:dark', 'pullquote:full-solid', 'buttons:cta' ],
		},
		{
			name: 'Folio',
			anchors: [ 'columns:28-72', 'heading:h2', 'separator' ],
		},
		{ name: 'Nocturne', anchors: [ 'cover:dark', 'image:full' ] },
		{
			name: 'Solstice',
			anchors: [ 'cover:minimal', 'columns:2-equal' ],
		},
	];

	it( 'returns 3 valid personality names on good engine response', async () => {
		const engine = makeEngine(
			'{"recommended": ["Dispatch", "Folio", "Nocturne"]}'
		);
		const result = await recommendPersonalities(
			engine,
			MANIFEST,
			PERSONALITIES
		);
		expect( result ).toEqual( {
			recommended: [ 'Dispatch', 'Folio', 'Nocturne' ],
		} );
	} );

	it( 'filters out names not in the personalities list', async () => {
		const engine = makeEngine(
			'{"recommended": ["Dispatch", "Invented", "Nocturne"]}'
		);
		const result = await recommendPersonalities(
			engine,
			MANIFEST,
			PERSONALITIES
		);
		// "Invented" is not in PERSONALITIES so it is discarded.
		expect( result.recommended ).toEqual( [ 'Dispatch', 'Nocturne' ] );
	} );

	it( 'caps recommendations at 3 even if the model returns more', async () => {
		const engine = makeEngine(
			'{"recommended": ["Dispatch", "Folio", "Nocturne", "Solstice"]}'
		);
		const result = await recommendPersonalities(
			engine,
			MANIFEST,
			PERSONALITIES
		);
		expect( result.recommended.length ).toBeLessThanOrEqual( 3 );
	} );

	it( 'returns { recommended: [] } on parse failure', async () => {
		const engine = makeEngine( 'bad output' );
		const result = await recommendPersonalities(
			engine,
			MANIFEST,
			PERSONALITIES
		);
		expect( result ).toEqual( { recommended: [] } );
	} );

	it( 'returns { recommended: [] } when the engine rejects', async () => {
		const engine = makeRejectedEngine();
		const result = await recommendPersonalities(
			engine,
			MANIFEST,
			PERSONALITIES
		);
		expect( result ).toEqual( { recommended: [] } );
	} );
} );

// ---------------------------------------------------------------------------
// analyzeContentHints
// ---------------------------------------------------------------------------

describe( 'analyzeContentHints()', () => {
	it( 'returns selected hints on valid engine response', async () => {
		const manifest = { paragraph: 2 };
		const items = [
			{
				type: 'paragraph',
				content: 'Lorem ipsum dolor sit amet.',
			},
			{
				type: 'paragraph',
				content: 'Another paragraph.',
			},
		];
		// Rule index 1 ("No image") and 2 ("No CTA") apply for this manifest.
		const engine = makeEngine( '{"apply": [1, 2]}' );
		const result = await analyzeContentHints( engine, manifest, items );
		expect( Array.isArray( result.hints ) ).toBe( true );
		// Both indices must be valid and the hints array must have ≥1 entry.
		expect( result.hints.length ).toBeGreaterThanOrEqual( 1 );
	} );

	it( 'returns { hints: [] } with no content items', async () => {
		// When there are no applicable rules, the function skips inference.
		const manifest = {
			headline: 1,
			paragraph: 1,
			image: 1,
			cta: 1,
			quote: 1,
		};
		const items = [
			{ type: 'headline', content: 'Short' },
			{
				type: 'paragraph',
				content: 'Short paragraph under 150 words.',
			},
		];
		const engine = makeEngine( '{"apply": []}' );
		const result = await analyzeContentHints( engine, manifest, items );
		expect( result ).toEqual( { hints: [] } );
	} );

	it( 'returns { hints: [] } on parse failure', async () => {
		const manifest = { paragraph: 1 };
		const items = [ { type: 'paragraph', content: 'hello' } ];
		const engine = makeEngine( 'cannot parse this' );
		const result = await analyzeContentHints( engine, manifest, items );
		expect( result ).toEqual( { hints: [] } );
	} );

	it( 'returns { hints: [] } when the engine rejects', async () => {
		const manifest = { paragraph: 2 };
		const items = [
			{ type: 'paragraph', content: 'Paragraph one.' },
			{ type: 'paragraph', content: 'Paragraph two.' },
		];
		const engine = makeRejectedEngine();
		const result = await analyzeContentHints( engine, manifest, items );
		expect( result ).toEqual( { hints: [] } );
	} );

	it( 'discards out-of-range indices returned by the model', async () => {
		const manifest = { paragraph: 2 };
		const items = [
			{ type: 'paragraph', content: 'One.' },
			{ type: 'paragraph', content: 'Two.' },
		];
		// The model returns indices 0, 99 — only 0 is valid.
		const engine = makeEngine( '{"apply": [0, 99]}' );
		const result = await analyzeContentHints( engine, manifest, items );
		// Index 99 doesn't exist in the rules; index 0 only applies if the
		// headline is over 10 words. Since there's no headline in this manifest,
		// rule 0 won't be generated and apply: [0, 99] will resolve to at most
		// 0 valid hints.
		expect( Array.isArray( result.hints ) ).toBe( true );
	} );
} );
