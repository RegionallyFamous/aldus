import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Aldus is a persistent wrapper — generated blocks live inside it as inner
 * blocks so the user can redesign at any time. The save function serialises
 * the inner block tree; the PHP render.php callback handles frontend output.
 *
 * The deprecated save (v ≤ 1.19.0) returned null, so inner blocks were never
 * written to the database and the block relied on the Detach action for
 * frontend rendering. That entry is preserved in the deprecations array in
 * index.js so existing posts auto-recover on next edit.
 */
export default function save() {
	return <InnerBlocks.Content />;
}
