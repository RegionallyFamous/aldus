/**
 * Tests for buildPersonalityPrompt() from src/lib/prompts.js.
 *
 * Previously these tests contained an inlined copy of the implementation.
 * They now import the real function so any change to prompts.js is caught
 * immediately rather than silently diverging from this file.
 */

import { buildPersonalityPrompt } from '../lib/prompts.js';

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
	anchors: [ 'cover:split', 'image:full' ],
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

	it( 'includes word-count hints for paragraph items', () => {
		const items = [
			{ type: 'paragraph', content: 'one two three four five' },
			{ type: 'paragraph', content: 'a b c' },
		];
		const prompt = buildPersonalityPrompt(
			DISPATCH,
			{ paragraph: 2 },
			'',
			null,
			items
		);
		// avg 4 words: (5+3)/2 = 4
		expect( prompt ).toContain( 'avg 4w' );
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
		expect( prompt ).toContain( 'cover:dark' );
		expect( prompt ).toContain( 'pullquote:full-solid' );
	} );

	it( 'uses grouped token format for the token pool', () => {
		// formatTokenPool groups tokens by category (e.g. "Covers: cover:dark /
		// Quotes: pullquote:wide").  A colon after a category name is the tell.
		const prompt = buildPersonalityPrompt( DISPATCH, {} );
		expect( prompt ).toMatch( /Covers:|Quotes:|Headings:/i );
	} );

	it( 'uses relevantTokens when defined on the personality', () => {
		const limited = {
			...DISPATCH,
			relevantTokens: [ 'cover:dark', 'paragraph' ],
		};
		const prompt = buildPersonalityPrompt( limited, {} );
		// The pool tokens appear in the output.
		expect( prompt ).toContain( 'cover:dark' );
		expect( prompt ).toContain( 'paragraph' );
		// Extract the "Available tokens:" line and confirm it only lists the
		// two tokens from relevantTokens, not the full vocabulary.
		const availableLine = prompt
			.split( '\n' )
			.find( ( l ) => l.startsWith( 'Available tokens:' ) );
		expect( availableLine ).toBeDefined();
		// A token absent from relevantTokens should not appear in the available
		// tokens line (it may still appear in anchor rule / examples).
		expect( availableLine ).not.toContain( 'pullquote:full-solid' );
	} );
} );
