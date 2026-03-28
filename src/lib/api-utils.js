/**
 * api-utils.js — shared REST API helpers.
 *
 * Kept in src/lib/ so both edit.js and useAldusGeneration.js can import
 * without creating a circular dependency.
 */

/**
 * Returns true when an /aldus/v1/assemble response is safe to consume.
 *
 * Validates the shape of the response object before any caller tries to read
 * from it — prevents downstream crashes when the server returns unexpected
 * data or a partial response.
 *
 * Accepts either `blocks` (legacy string) or non-empty `blocks_tree` for
 * client-authoritative insertion.
 *
 * @param {unknown} data Response value from apiFetch.
 * @return {boolean} True if the response is valid and safe to consume.
 */
export function isValidAssembleResponse( data ) {
	if ( ! data || typeof data !== 'object' ) {
		return false;
	}
	if ( ! data.success ) {
		return false;
	}
	if ( typeof data.label !== 'string' ) {
		return false;
	}
	const hasTree =
		Array.isArray( data.blocks_tree ) && data.blocks_tree.length > 0;
	const hasBlocks =
		typeof data.blocks === 'string' && data.blocks.trim() !== '';
	if ( ! hasTree && ! hasBlocks ) {
		return false;
	}
	return true;
}
