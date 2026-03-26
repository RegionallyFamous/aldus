/**
 * Tests for src/lib/uid.js
 *
 * uid() returns a UUID v4 string via crypto.randomUUID() when available,
 * and falls back to a Math.random-based generator for non-secure contexts.
 */

import { uid } from '../lib/uid.js';

// UUID v4 pattern: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe( 'uid', () => {
	describe( 'with crypto.randomUUID available (default)', () => {
		it( 'returns a string matching UUID v4 format', () => {
			expect( uid() ).toMatch( UUID_PATTERN );
		} );

		it( 'returns a different value on each call', () => {
			const ids = new Set( Array.from( { length: 20 }, uid ) );
			expect( ids.size ).toBe( 20 );
		} );
	} );

	describe( 'Math.random fallback (crypto.randomUUID stubbed away)', () => {
		let originalRandomUUID;

		beforeEach( () => {
			// Preserve and remove crypto.randomUUID so the fallback branch runs.
			originalRandomUUID = crypto.randomUUID;
			Object.defineProperty( crypto, 'randomUUID', {
				value: undefined,
				configurable: true,
				writable: true,
			} );
		} );

		afterEach( () => {
			// Restore crypto.randomUUID after each test.
			Object.defineProperty( crypto, 'randomUUID', {
				value: originalRandomUUID,
				configurable: true,
				writable: true,
			} );
		} );

		it( 'returns a string matching UUID v4 format via Math.random fallback', () => {
			expect( uid() ).toMatch( UUID_PATTERN );
		} );

		it( 'returns unique values from the Math.random fallback', () => {
			const ids = new Set( Array.from( { length: 20 }, uid ) );
			expect( ids.size ).toBe( 20 );
		} );
	} );
} );
