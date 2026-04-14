/**
 * Block instances for editor insertion and previews. Prefer parsing the server
 * `blocks` markup string (matches PHP `serialize_block`) over rebuilding from
 * `blocks_tree` (attributes-only), which can drift from core `save()` output.
 */

import { parse as parseBlocks } from '@wordpress/blocks';
import { createBlocksFromTree } from './assembleBlocksFromTree.js';
import { getAssembleResponseParts } from './assembleResponseParts.js';

/**
 * @param {{ blocks?: string, blocks_tree?: Array }} payload
 * @return {import('@wordpress/blocks').WPBlock[]} Array of parsed WP block objects.
 */
export function blocksFromAssemblePayload( payload ) {
	if ( ! payload || typeof payload !== 'object' ) {
		return [];
	}
	const { tree, serverMarkup, serverMarkupNonEmpty } =
		getAssembleResponseParts( payload );
	try {
		if ( serverMarkupNonEmpty ) {
			return parseBlocks( serverMarkup ).filter( ( b ) => b?.name );
		}
		if ( tree.length > 0 ) {
			return createBlocksFromTree( tree );
		}
	} catch {
		return [];
	}
	return [];
}
