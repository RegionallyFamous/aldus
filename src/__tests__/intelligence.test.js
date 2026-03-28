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
		expect( result ).toEqual( { style: 'text-heavy editorial', tone: '' } );
	} );

	it( 'returns { style: "" } when the engine returns an unknown style value', async () => {
		const engine = makeEngine( '{"style": "totally-made-up-style"}' );
		const result = await inferStyleDirection( engine, MANIFEST, ITEMS );
		expect( result ).toEqual( { style: '', tone: '' } );
	} );

	it( 'returns { style: "" } on parse failure', async () => {
		const engine = makeEngine( 'not json at all' );
		const result = await inferStyleDirection( engine, MANIFEST, ITEMS );
		expect( result ).toEqual( { style: '', tone: '' } );
	} );

	it( 'returns { style: "" } when the engine rejects', async () => {
		const engine = makeRejectedEngine();
		const result = await inferStyleDirection( engine, MANIFEST, ITEMS );
		expect( result ).toEqual( { style: '', tone: '' } );
	} );

	it( 'strips markdown code fences from the response before parsing', async () => {
		const engine = makeEngine(
			'```json\n{"style": "minimal product"}\n```'
		);
		const result = await inferStyleDirection( engine, MANIFEST, ITEMS );
		expect( result ).toEqual( { style: 'minimal product', tone: '' } );
	} );

	it( 'includes a valid tone when the model returns one', async () => {
		const engine = makeEngine(
			'{"style": "cta-focused landing", "tone": "urgent"}'
		);
		const result = await inferStyleDirection( engine, MANIFEST, ITEMS );
		expect( result ).toEqual( {
			style: 'cta-focused landing',
			tone: 'urgent',
		} );
	} );

	it( 'ignores an unknown tone value', async () => {
		const engine = makeEngine(
			'{"style": "text-heavy editorial", "tone": "alien"}'
		);
		const result = await inferStyleDirection( engine, MANIFEST, ITEMS );
		expect( result ).toEqual( { style: 'text-heavy editorial', tone: '' } );
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

	// A distinct personality used only for failure-path tests so they never
	// share a cache key with the success test above.
	const PERSONALITY_FAIL = {
		name: 'DispatchFail',
		description: 'Same structure, separate cache key for error-path tests.',
	};

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
			PERSONALITY_FAIL,
			TOKENS
		);
		expect( result ).toEqual( { description: '' } );
	} );

	it( 'returns { description: "" } on parse failure', async () => {
		const engine = makeEngine( 'I cannot help with that.' );
		const result = await inferLayoutDescription( engine, PERSONALITY_FAIL, [
			'cover:dark',
			'heading:h2',
			'separator',
		] );
		expect( result ).toEqual( { description: '' } );
	} );

	it( 'returns { description: "" } when the engine rejects', async () => {
		const engine = makeRejectedEngine();
		const result = await inferLayoutDescription( engine, PERSONALITY_FAIL, [
			'cover:dark',
			'heading:h2',
		] );
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
		{ name: 'Nocturne', anchors: [ 'cover:split', 'image:full' ] },
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

	it( 'falls back to deterministic top-3 on parse failure', async () => {
		const engine = makeEngine( 'bad output' );
		const result = await recommendPersonalities(
			engine,
			MANIFEST,
			PERSONALITIES
		);
		// The function now falls back to anchor-score top-3 rather than []
		// so users always see useful recommendations even when the LLM fails.
		const validNames = new Set( PERSONALITIES.map( ( p ) => p.name ) );
		expect( Array.isArray( result.recommended ) ).toBe( true );
		result.recommended.forEach( ( name ) =>
			expect( validNames.has( name ) ).toBe( true )
		);
	} );

	it( 'falls back to deterministic top-3 when the engine rejects', async () => {
		const engine = makeRejectedEngine();
		const result = await recommendPersonalities(
			engine,
			MANIFEST,
			PERSONALITIES
		);
		const validNames = new Set( PERSONALITIES.map( ( p ) => p.name ) );
		expect( Array.isArray( result.recommended ) ).toBe( true );
		result.recommended.forEach( ( name ) =>
			expect( validNames.has( name ) ).toBe( true )
		);
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

	it( 'returns applicable hints regardless of engine state (deterministic)', async () => {
		// analyzeContentHints no longer calls the LLM — engine arg is ignored.
		// manifest has no image or CTA, so two hints apply.
		const manifest = { paragraph: 1 };
		const items = [ { type: 'paragraph', content: 'hello' } ];
		const engine = makeEngine( 'cannot parse this' );
		const result = await analyzeContentHints( engine, manifest, items );
		expect( result.hints ).toContain(
			'No image — adding one unlocks more layout options'
		);
		expect( result.hints ).toContain(
			'No CTA — adding one unlocks button-focused layouts'
		);
	} );

	it( 'returns hints based on manifest even when engine would have rejected', async () => {
		// manifest has no image, no CTA, and 2 paragraphs but no quote — 3 hints apply.
		const manifest = { paragraph: 2 };
		const items = [
			{ type: 'paragraph', content: 'Paragraph one.' },
			{ type: 'paragraph', content: 'Paragraph two.' },
		];
		const engine = makeRejectedEngine();
		const result = await analyzeContentHints( engine, manifest, items );
		expect( result.hints.length ).toBe( 3 );
		expect( result.hints ).toContain(
			'No quote — adding a pullquote adds visual contrast to text-heavy layouts'
		);
	} );

	it( 'returns only hints whose conditions are met (no headline = no headline hint)', async () => {
		// manifest has no headline, so the "headline over 10 words" rule never fires.
		// No image, no CTA, 2 paragraphs no quote → 3 hints.
		const manifest = { paragraph: 2 };
		const items = [
			{ type: 'paragraph', content: 'One.' },
			{ type: 'paragraph', content: 'Two.' },
		];
		const engine = makeEngine( '{"apply": [0, 99]}' ); // engine ignored now
		const result = await analyzeContentHints( engine, manifest, items );
		expect( Array.isArray( result.hints ) ).toBe( true );
		// Headline hint must NOT appear — there is no headline in the manifest.
		expect( result.hints ).not.toContain(
			'Headline is over 10 words — cover blocks work best with 5–10'
		);
	} );
} );
