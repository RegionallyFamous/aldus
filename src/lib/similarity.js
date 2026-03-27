/**
 * Sequence similarity utilities for Aldus layout diversification.
 */

/**
 * Computes the Jaccard similarity coefficient between two token sequences.
 *
 * Jaccard = |intersection| / |union|.
 * Returns 0 for two empty sequences (no meaningful similarity).
 *
 * @param {string[]} a First token sequence.
 * @param {string[]} b Second token sequence.
 * @return {number} Similarity score in [0, 1]. 1 = identical sets, 0 = disjoint.
 */
export function jaccard( a, b ) {
	const setA = new Set( a );
	const setB = new Set( b );
	const intersection = [ ...setA ].filter( ( x ) => setB.has( x ) ).length;
	const union = new Set( [ ...setA, ...setB ] ).size;
	return union === 0 ? 0 : intersection / union;
}
