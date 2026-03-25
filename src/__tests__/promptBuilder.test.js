/**
 * Tests for buildPersonalityPrompt() in edit.js.
 *
 * buildPersonalityPrompt is a module-level pure function. We inline a minimal
 * version of the implementation here to keep tests self-contained, pending the
 * JS architecture refactor that will export it as a named function.
 *
 * These tests verify the structural contracts the PHP assembly endpoint
 * depends on (the prompt must include required anchor tokens and a JSON
 * response instruction).
 */

// ---------------------------------------------------------------------------
// Inline minimal implementation for testing — mirrors edit.js behaviour.
// ---------------------------------------------------------------------------

const VALID_TOKENS = [
	'cover:dark',
	'cover:light',
	'cover:minimal',
	'columns:2-equal',
	'paragraph',
	'heading:h1',
	'heading:h2',
	'separator',
	'pullquote:wide',
	'pullquote:full-solid',
	'buttons:cta',
	'image:wide',
	'image:full',
	'media-text:left',
];

function buildPersonalityPrompt(
	personality,
	manifest,
	styleNote = '',
	postContext = null,
	// items parameter reserved for future prompt enrichment (word-count hints)
	// eslint-disable-next-line no-unused-vars
	_items = [],
	previousSequences = []
) {
	const manifestText = Object.entries( manifest )
		.map( ( [ type, count ] ) => `${ count } ${ type }` )
		.join( ', ' );

	const tokenPool = personality.relevantTokens ?? VALID_TOKENS;
	const tokensText = tokenPool.join( ', ' );
	const anchorsText = personality.anchors.join( ', ' );
	const examples = personality.exampleSequences ?? [ personality.anchors ];
	const examplesText = examples
		.map( ( seq, i ) => `  ${ i + 1 }: ${ seq.join( ', ' ) }` )
		.join( '\n' );

	const isLoose = personality.creativity === 1;
	const anchorRule = isLoose
		? `Required anchor tokens (MUST appear somewhere in your sequence): ${ anchorsText }`
		: `Required anchor tokens (MUST appear at the start of your sequence): ${ anchorsText }`;

	const noteSection = styleNote.trim()
		? `\nStyle note from the author: "${ styleNote.trim() }"`
		: '';

	const contextSection = postContext ? `\nContext: ${ postContext }` : '';

	const diversitySection =
		previousSequences.length > 0
			? `\nPreviously generated sequences: ${ previousSequences
					.slice( 0, 3 )
					.map( ( s ) => s.join( ' → ' ) )
					.join( ' | ' ) }. Generate something structurally distinct.`
			: '';

	return `You arrange content into a WordPress block layout sequence using tokens.

Available tokens: ${ tokensText }

Content to place: ${ manifestText }

Layout personality: "${ personality.name }" — ${ personality.description }
${ anchorRule }
Example sequences:
${ examplesText }${ contextSection }${ noteSection }${ diversitySection }

Rules:
- Use 6–12 tokens total
- Anchor tokens must be present
- Skip a token only if its required content type is not in the manifest
- Only use tokens from the approved list above

Respond with valid JSON only, no explanation:
{"tokens": ["token1", "token2", "token3"]}`;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DISPATCH = {
	name: 'Dispatch',
	description: 'Breaking-news urgency.',
	anchors: [ 'cover:dark', 'pullquote:full-solid', 'buttons:cta' ],
	creativity: 0,
	exampleSequences: [
		[
			'cover:dark',
			'heading:h1',
			'pullquote:full-solid',
			'paragraph',
			'buttons:cta',
		],
	],
};

const NOCTURNE = {
	name: 'Nocturne',
	description: 'Dark cinematic.',
	anchors: [ 'cover:dark', 'image:full' ],
	creativity: 1,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe( 'buildPersonalityPrompt()', () => {
	it( 'includes the personality name', () => {
		const prompt = buildPersonalityPrompt( DISPATCH, {
			headline: 1,
			paragraph: 2,
		} );
		expect( prompt ).toContain( '"Dispatch"' );
	} );

	it( 'includes each anchor token', () => {
		const prompt = buildPersonalityPrompt( DISPATCH, { headline: 1 } );
		DISPATCH.anchors.forEach( ( anchor ) => {
			expect( prompt ).toContain( anchor );
		} );
	} );

	it( 'includes the manifest content types', () => {
		const prompt = buildPersonalityPrompt( DISPATCH, {
			headline: 1,
			paragraph: 3,
			quote: 1,
		} );
		expect( prompt ).toContain( 'headline' );
		expect( prompt ).toContain( 'paragraph' );
		expect( prompt ).toContain( 'quote' );
	} );

	it( 'ends with the JSON response instruction', () => {
		const prompt = buildPersonalityPrompt( DISPATCH, {} );
		expect( prompt ).toContain( '{"tokens":' );
	} );

	it( 'includes the style note when provided', () => {
		const prompt = buildPersonalityPrompt(
			DISPATCH,
			{},
			'minimal and dark'
		);
		expect( prompt ).toContain( 'minimal and dark' );
	} );

	it( 'omits the style note section when empty', () => {
		const prompt = buildPersonalityPrompt( DISPATCH, {}, '' );
		expect( prompt ).not.toContain( 'Style note' );
	} );

	it( 'includes post context when provided', () => {
		const prompt = buildPersonalityPrompt(
			DISPATCH,
			{},
			'',
			'A blog about coffee'
		);
		expect( prompt ).toContain( 'A blog about coffee' );
	} );

	it( 'omits context section when null', () => {
		const prompt = buildPersonalityPrompt( DISPATCH, {}, '', null );
		expect( prompt ).not.toContain( 'Context:' );
	} );

	it( 'includes diversity nudge when previousSequences provided', () => {
		const prev = [ [ 'cover:dark', 'paragraph' ] ];
		const prompt = buildPersonalityPrompt(
			DISPATCH,
			{},
			'',
			null,
			[],
			prev
		);
		expect( prompt ).toContain( 'Previously generated sequences' );
		expect( prompt ).toContain( 'structurally distinct' );
	} );

	it( 'omits diversity nudge when no previousSequences', () => {
		const prompt = buildPersonalityPrompt( DISPATCH, {}, '', null, [], [] );
		expect( prompt ).not.toContain( 'Previously generated sequences' );
	} );

	it( 'uses strict anchor instruction for creativity=0', () => {
		const prompt = buildPersonalityPrompt( DISPATCH, {} );
		expect( prompt ).toContain( 'MUST appear at the start' );
	} );

	it( 'uses loose anchor instruction for creativity=1', () => {
		const prompt = buildPersonalityPrompt( NOCTURNE, {} );
		expect( prompt ).toContain( 'MUST appear somewhere' );
	} );

	it( 'includes example sequences', () => {
		const prompt = buildPersonalityPrompt( DISPATCH, {} );
		// First example sequence tokens should appear in the prompt.
		expect( prompt ).toContain( 'cover:dark' );
		expect( prompt ).toContain( 'pullquote:full-solid' );
	} );
} );
