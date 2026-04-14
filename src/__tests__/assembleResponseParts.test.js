import { getAssembleResponseParts } from '../lib/assembleResponseParts.js';

describe( 'getAssembleResponseParts', () => {
	it( 'detects non-empty server markup alongside blocks_tree', () => {
		const php =
			'<!-- wp:cover --><div class="wp-block-cover"></div><!-- /wp:cover -->';
		const tree = [
			{ name: 'core/cover', attributes: {}, innerBlocks: [] },
		];
		const out = getAssembleResponseParts( {
			blocks: php,
			blocks_tree: tree,
		} );
		expect( out.serverMarkupNonEmpty ).toBe( true );
		expect( out.serverMarkup ).toBe( php );
		expect( out.tree ).toEqual( tree );
	} );

	it( 'treats whitespace-only blocks as empty', () => {
		const out = getAssembleResponseParts( {
			blocks: '   \n\t',
			blocks_tree: [
				{ name: 'core/paragraph', attributes: {}, innerBlocks: [] },
			],
		} );
		expect( out.serverMarkupNonEmpty ).toBe( false );
	} );

	it( 'handles missing blocks_tree', () => {
		const out = getAssembleResponseParts( {
			blocks: '<!-- wp:paragraph /-->',
		} );
		expect( out.tree ).toEqual( [] );
		expect( out.serverMarkupNonEmpty ).toBe( true );
	} );
} );
