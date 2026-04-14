/**
 * Pure parsing of /aldus/v1/assemble fields (no WordPress block APIs).
 * Prefer keeping the server `blocks` string over re-serializing from `blocks_tree`.
 *
 * @param {Object|null|undefined} r
 * @return {{ tree: Array, serverMarkup: string, serverMarkupNonEmpty: boolean }} Parsed assemble response parts.
 */
export function getAssembleResponseParts( r ) {
	const tree = Array.isArray( r?.blocks_tree ) ? r.blocks_tree : [];
	const serverMarkup = typeof r?.blocks === 'string' ? r.blocks : '';
	return {
		tree,
		serverMarkup,
		serverMarkupNonEmpty: serverMarkup.trim() !== '',
	};
}
