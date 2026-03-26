/**
 * Tests for src/lib/robustParse.js
 *
 * robustParse is a fault-tolerant JSON extractor for LLM output.  Tests cover
 * every branch of the four-strategy parse cascade:
 *   1. Direct JSON.parse of the stripped string
 *   2. Balanced-brace first-{…}-block extraction
 *   3. Balanced-bracket first-[…]-block extraction (wrapped in { tokens: [] })
 *   4. Total failure → return {}
 */

import { robustParse } from '../lib/robustParse.js';

describe( 'robustParse', () => {
	// -------------------------------------------------------------------------
	// Strategy 1 — direct parse
	// -------------------------------------------------------------------------

	describe( 'direct parse', () => {
		it( 'parses plain valid JSON', () => {
			expect(
				robustParse( '{"tokens":["cover:dark","paragraph"]}' )
			).toEqual( { tokens: [ 'cover:dark', 'paragraph' ] } );
		} );

		it( 'strips a ```json ... ``` fence before parsing', () => {
			const input = '```json\n{"tokens":["a","b"]}\n```';
			expect( robustParse( input ) ).toEqual( { tokens: [ 'a', 'b' ] } );
		} );

		it( 'strips a plain ``` fence before parsing', () => {
			const input = '```\n{"foo":"bar"}\n```';
			expect( robustParse( input ) ).toEqual( { foo: 'bar' } );
		} );

		it( 'handles leading/trailing whitespace', () => {
			expect( robustParse( '  {"x":1}  ' ) ).toEqual( { x: 1 } );
		} );
	} );

	// -------------------------------------------------------------------------
	// Strategy 2 — balanced-brace first {…} block
	// -------------------------------------------------------------------------

	describe( 'balanced-brace extraction', () => {
		it( 'extracts JSON from preamble text', () => {
			const input = 'Sure! Here is the JSON: {"tokens":["paragraph"]}';
			expect( robustParse( input ) ).toEqual( {
				tokens: [ 'paragraph' ],
			} );
		} );

		it( 'repairs a trailing comma inside an object', () => {
			const input = '{"a":1,"b":2,}';
			expect( robustParse( input ) ).toEqual( { a: 1, b: 2 } );
		} );

		it( 'extracts the FIRST object when multiple are present', () => {
			// The greedy regex fix — must pick {"first":true}, not the last one.
			const input = 'Text {"first":true} and then {"second":true} end';
			expect( robustParse( input ) ).toEqual( { first: true } );
		} );

		it( 'handles nested objects correctly', () => {
			const input = 'prefix {"outer":{"inner":42}} suffix';
			expect( robustParse( input ) ).toEqual( { outer: { inner: 42 } } );
		} );

		it( 'handles a string value containing a closing brace', () => {
			const input = '{"key":"value with } brace"}';
			expect( robustParse( input ) ).toEqual( {
				key: 'value with } brace',
			} );
		} );

		it( 'handles escaped quotes inside string values', () => {
			const input = '{"key":"he said \\"hello\\""}';
			expect( robustParse( input ) ).toEqual( {
				key: 'he said "hello"',
			} );
		} );
	} );

	// -------------------------------------------------------------------------
	// Strategy 3 — bare array wrapped in { tokens: [] }
	//
	// Strategy 3 runs when strategies 1 and 2 both fail.  A bare valid JSON
	// array (e.g. ["a","b"]) passes strategy 1 as-is, so strategy 3 only
	// fires when the array is embedded in surrounding text that prevents a
	// direct parse, or when the array contains a trailing comma.
	// -------------------------------------------------------------------------

	describe( 'array extraction', () => {
		it( 'returns a bare JSON array directly when it is valid JSON (strategy 1)', () => {
			// A bare JSON array is perfectly valid JSON — strategy 1 parses it
			// and returns it as-is. Strategy 3 is not reached in this case.
			const input = '["cover:dark","paragraph","buttons:cta"]';
			expect( robustParse( input ) ).toEqual( [
				'cover:dark',
				'paragraph',
				'buttons:cta',
			] );
		} );

		it( 'wraps an array from surrounding preamble text in { tokens: [] }', () => {
			// Preamble prevents strategy 1 and 2 from succeeding, so strategy 3
			// extracts the first [...] block and wraps it.
			const input = 'Here are the tokens: ["tok1","tok2"] done.';
			expect( robustParse( input ) ).toEqual( {
				tokens: [ 'tok1', 'tok2' ],
			} );
		} );

		it( 'wraps an array with a trailing comma in { tokens: [] }', () => {
			// A trailing comma makes the array invalid JSON (strategy 1 fails).
			// No { } block is present (strategy 2 skipped). Strategy 3 repairs
			// the trailing comma and wraps the result.
			const input = '["a","b","c",]';
			expect( robustParse( input ) ).toEqual( {
				tokens: [ 'a', 'b', 'c' ],
			} );
		} );
	} );

	// -------------------------------------------------------------------------
	// Strategy 4 — total failure fallback
	// -------------------------------------------------------------------------

	describe( 'total failure fallback', () => {
		it( 'returns {} for completely unparseable garbage', () => {
			expect( robustParse( 'not json at all!!' ) ).toEqual( {} );
		} );

		it( 'returns {} for an empty string', () => {
			expect( robustParse( '' ) ).toEqual( {} );
		} );

		it( 'returns {} for malformed braces with no valid JSON inside', () => {
			// Opening brace but the content is not valid JSON even after comma repair.
			expect( robustParse( '{ totally : invalid ; json }' ) ).toEqual(
				{}
			);
		} );
	} );
} );
