/**
 * Client-authoritative block instances from /aldus/v1/assemble `blocks_tree`.
 *
 * @see includes/block-tree.php
 */

import { createBlock } from '@wordpress/blocks';

/**
 * Recursively builds block instances from API JSON nodes { name, attributes, innerBlocks }.
 *
 * @param {Array<{name?: string, attributes?: Object, innerBlocks?: Array}>|null|undefined} nodes
 * @return {import('@wordpress/blocks').WPBlock[]} Root-level blocks for replaceInnerBlocks / serialize.
 */
export function createBlocksFromTree( nodes ) {
	if ( ! Array.isArray( nodes ) || nodes.length === 0 ) {
		return [];
	}
	/** @type {import('@wordpress/blocks').WPBlock[]} */
	const blocks = [];
	for ( const node of nodes ) {
		if ( ! node || typeof node.name !== 'string' || node.name === '' ) {
			continue;
		}
		const inner = node.innerBlocks?.length
			? createBlocksFromTree( node.innerBlocks )
			: [];
		try {
			blocks.push(
				createBlock( node.name, node.attributes || {}, inner )
			);
		} catch {
			// Skip malformed nodes (unknown block name, invalid attrs).
		}
	}
	return blocks;
}
