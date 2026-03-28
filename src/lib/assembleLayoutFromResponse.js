/**
 * Normalizes /aldus/v1/assemble responses into layout card shape with canonical `blocks` string.
 */

import { serialize } from '@wordpress/blocks';
import { createBlocksFromTree } from './assembleBlocksFromTree.js';
import { getAssembleResponseParts } from './assembleResponseParts.js';

/**
 * @param {Object} r Raw assemble API response (success assumed).
 * @return {{label: string, blocks: string, tokens: Array, sections: Array, blocks_tree: Array}} Normalized layout fields for results cards and insertion.
 */
export function normalizeLayoutFromAssembleResponse( r ) {
	const { tree, serverMarkup, serverMarkupNonEmpty } =
		getAssembleResponseParts( r );
	const base = {
		label: r.label,
		tokens: r.tokens ?? [],
		sections: r.sections ?? [],
		blocks_tree: tree,
	};
	if ( serverMarkupNonEmpty ) {
		return {
			...base,
			blocks: serverMarkup,
		};
	}
	if ( tree.length > 0 ) {
		try {
			const created = createBlocksFromTree( tree );
			if ( created.length > 0 ) {
				return {
					...base,
					blocks: serialize( created ),
				};
			}
		} catch {
			// Fall through to empty string.
		}
	}
	return {
		...base,
		blocks: '',
	};
}
