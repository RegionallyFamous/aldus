/**
 * Tests for src/lib/batchAssemble.js
 *
 * batchAssemble() runs an array of API jobs through a concurrency-limited
 * worker pool, collects successes, and drops failures.  The @wordpress/api-fetch
 * module is mocked so no real HTTP requests are made.
 *
 * Test coverage:
 *   - All jobs succeed → full result array
 *   - One job rejects → dropped, onError called with label/status/error
 *   - 429 response → onError receives status: 429
 *   - onProgress called once per completed job
 *   - Concurrency cap is respected (never more than N in-flight at once)
 */

import { batchAssemble } from '../lib/batchAssemble.js';

// ---------------------------------------------------------------------------
// Mock @wordpress/api-fetch
// ---------------------------------------------------------------------------

jest.mock( '@wordpress/api-fetch' );
import apiFetch from '@wordpress/api-fetch';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJob( label, data = {} ) {
	return { label, data };
}

function makeResponse( label ) {
	return {
		success: true,
		label,
		blocks: `<!-- wp:paragraph -->${ label }<!-- /wp:paragraph -->`,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach( () => {
	jest.resetAllMocks();
} );

describe( 'batchAssemble', () => {
	it( 'returns all responses when every job succeeds', async () => {
		const jobs = [
			makeJob( 'Dispatch' ),
			makeJob( 'Folio' ),
			makeJob( 'Nocturne' ),
		];
		apiFetch.mockImplementation( ( { data } ) =>
			Promise.resolve( makeResponse( data?.personality ?? 'Unknown' ) )
		);

		// Override mock to just return success indexed by order.
		let callCount = 0;
		apiFetch.mockImplementation( () => {
			const label = jobs[ callCount++ ]?.label ?? 'X';
			return Promise.resolve( makeResponse( label ) );
		} );

		const results = await batchAssemble( jobs, () => {} );
		expect( results ).toHaveLength( 3 );
		results.forEach( ( r ) => expect( r.success ).toBe( true ) );
	} );

	it( 'drops failed jobs and calls onError for each failure', async () => {
		const jobs = [ makeJob( 'A' ), makeJob( 'B' ), makeJob( 'C' ) ];
		// B fails, A and C succeed.
		apiFetch
			.mockResolvedValueOnce( makeResponse( 'A' ) )
			.mockRejectedValueOnce( new Error( 'network error' ) )
			.mockResolvedValueOnce( makeResponse( 'C' ) );

		const onError = jest.fn();
		const results = await batchAssemble( jobs, () => {}, 3, 5000, onError );

		expect( results ).toHaveLength( 2 );
		expect( onError ).toHaveBeenCalledTimes( 1 );
		const errorArg = onError.mock.calls[ 0 ][ 0 ];
		expect( errorArg ).toHaveProperty( 'label', 'B' );
		expect( errorArg ).toHaveProperty( 'error' );
	} );

	it( 'passes status 429 to onError for rate-limit responses', async () => {
		const jobs = [ makeJob( 'RateLimit' ) ];
		const rateLimitError = Object.assign(
			new Error( 'Too Many Requests' ),
			{
				data: { status: 429 },
			}
		);
		apiFetch.mockRejectedValueOnce( rateLimitError );

		const onError = jest.fn();
		await batchAssemble( jobs, () => {}, 1, 5000, onError );

		expect( onError ).toHaveBeenCalledTimes( 1 );
		expect( onError.mock.calls[ 0 ][ 0 ].status ).toBe( 429 );
	} );

	it( 'calls onProgress once per completed job', async () => {
		const jobs = [ makeJob( 'X' ), makeJob( 'Y' ), makeJob( 'Z' ) ];
		apiFetch.mockResolvedValue( makeResponse( 'any' ) );

		const onProgress = jest.fn();
		await batchAssemble( jobs, onProgress, 2 );

		expect( onProgress ).toHaveBeenCalledTimes( 3 );
		// Calls must carry increasing done counts.
		const doneCounts = onProgress.mock.calls.map( ( c ) => c[ 0 ] );
		expect( doneCounts ).toContain( 1 );
		expect( doneCounts ).toContain( 2 );
		expect( doneCounts ).toContain( 3 );
		// Total is always passed as the second argument.
		onProgress.mock.calls.forEach( ( [ , total ] ) =>
			expect( total ).toBe( 3 )
		);
	} );

	it( 'respects the concurrency cap', async () => {
		const concurrency = 2;
		const jobs = Array.from( { length: 6 }, ( _, i ) =>
			makeJob( `J${ i }` )
		);
		let maxInFlight = 0;
		let currentInFlight = 0;

		apiFetch.mockImplementation(
			() =>
				new Promise( ( resolve ) => {
					currentInFlight++;
					if ( currentInFlight > maxInFlight ) {
						maxInFlight = currentInFlight;
					}
					// Resolve via setImmediate to allow other workers to start.
					setImmediate( () => {
						currentInFlight--;
						resolve( makeResponse( 'any' ) );
					} );
				} )
		);

		await batchAssemble( jobs, () => {}, concurrency );

		// Should never exceed the concurrency cap.
		expect( maxInFlight ).toBeLessThanOrEqual( concurrency );
	} );

	it( 'returns an empty array when every job fails and onError is not provided', async () => {
		const jobs = [ makeJob( 'Fail1' ), makeJob( 'Fail2' ) ];
		apiFetch.mockRejectedValue( new Error( 'all fail' ) );

		const results = await batchAssemble( jobs, () => {} );
		expect( results ).toEqual( [] );
	} );

	it( 'handles an empty jobs array without errors', async () => {
		const results = await batchAssemble( [], () => {} );
		expect( results ).toEqual( [] );
	} );
} );
