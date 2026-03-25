/**
 * batchAssemble — concurrency-limited /aldus/v1/assemble calls.
 *
 * Firing sixteen requests simultaneously at the PHP assemble endpoint can
 * overload the server and causes all calls to race for the same resources.
 * This helper runs them through a fixed-size concurrency pool with a per-call
 * AbortController timeout, collecting all fulfilled responses and silently
 * dropping failures so a single slow or errored assemble call never blocks
 * the rest of the results.
 *
 * @param {Array}    jobs              Array of { data, label } objects.
 *                                     `data`  — POST body for /aldus/v1/assemble.
 *                                     `label` — personality name (for onProgress).
 * @param {Function} onProgress        Called with ( doneCount, total, lastLabel ).
 * @param {number}   [concurrency=4]   Max simultaneous in-flight requests.
 * @param {number}   [timeoutMs=15000] Per-call timeout in milliseconds.
 * @return {Promise<Array>} Resolved assemble response objects (failures omitted).
 */

import apiFetch from '@wordpress/api-fetch';

export async function batchAssemble(
	jobs,
	onProgress,
	concurrency = 4,
	timeoutMs = 15_000
) {
	const total = jobs.length;
	let done = 0;
	const results = new Array( total ).fill( null );

	// Index into the jobs array — each slot fetches the next pending job.
	let next = 0;

	async function runWorker() {
		while ( next < total ) {
			const idx = next++;
			const { data, label } = jobs[ idx ];

			const controller = new AbortController();
			const timeoutId = setTimeout( () => controller.abort(), timeoutMs );

			try {
				const response = await apiFetch( {
					path: '/aldus/v1/assemble',
					method: 'POST',
					data,
					signal: controller.signal,
				} );
				results[ idx ] = response;
			} catch {
				// Timeouts, network errors, and 4xx/5xx responses are silently
				// dropped. The caller filters for non-null results.
			} finally {
				clearTimeout( timeoutId );
				done++;
				onProgress?.( done, total, label );
			}
		}
	}

	// Spin up `concurrency` workers — each independently pulls the next job.
	const workers = Array.from(
		{ length: Math.min( concurrency, total ) },
		runWorker
	);
	await Promise.all( workers );

	return results.filter( ( r ) => r !== null );
}
