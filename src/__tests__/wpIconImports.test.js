/**
 * Audit: every named export imported from @wordpress/icons in Aldus source
 * files must exist in the installed package.
 *
 * This prevents the "export 'X' was not found in @wordpress/icons" webpack
 * warning from silently resolving to undefined at runtime and crashing React
 * components (e.g. an undefined ToolbarButton icon prop blanking the editor).
 *
 * The test is self-updating: it parses the live source files so it catches any
 * new bad import automatically without needing manual maintenance.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as WPIcons from '@wordpress/icons';

const SRC_DIR = path.resolve( __dirname, '..' );

/**
 * Extract every named import from @wordpress/icons in a source file.
 * Returns an array of { exported, local } pairs where `exported` is the
 * name used in the package and `local` is the alias used in the file.
 *
 * @param {string} filePath
 * @return {{ exported: string, local: string }[]} Array of import pairs.
 */
function extractIconImports( filePath ) {
	const source = fs.readFileSync( filePath, 'utf8' );
	const results = [];

	// Match every import block that ends with from '@wordpress/icons'.
	// [^}]* stops at the first closing brace so we never span across multiple
	// import statements (named imports contain no nested braces).
	const re = /import\s*\{([^}]*)\}\s*from\s*['"]@wordpress\/icons['"]/g;
	let match;
	while ( ( match = re.exec( source ) ) !== null ) {
		const block = match[ 1 ];
		const names = block
			.split( ',' )
			.map( ( s ) => s.replace( /\/\/[^\n]*/g, '' ).trim() ) // strip inline comments
			.filter( Boolean );

		for ( const name of names ) {
			const aliasMatch = name.match( /^(\w+)\s+as\s+(\w+)$/ );
			if ( aliasMatch ) {
				results.push( {
					exported: aliasMatch[ 1 ],
					local: aliasMatch[ 2 ],
				} );
			} else if ( /^\w+$/.test( name ) ) {
				results.push( { exported: name, local: name } );
			}
		}
	}

	return results;
}

// Collect all .js source files directly under src/ (not subdirectories —
// tests live in src/__tests__/ and are intentionally excluded).
const sourceFiles = fs
	.readdirSync( SRC_DIR )
	.filter( ( f ) => f.endsWith( '.js' ) )
	.map( ( f ) => path.join( SRC_DIR, f ) );

describe( '@wordpress/icons — all named imports must exist in the package', () => {
	for ( const filePath of sourceFiles ) {
		const icons = extractIconImports( filePath );
		if ( icons.length === 0 ) {
			continue;
		}

		const relPath = path.relative(
			path.resolve( __dirname, '../..' ),
			filePath
		);

		describe( relPath, () => {
			for ( const { exported, local } of icons ) {
				it( `${ exported }${
					local !== exported ? ` (as ${ local })` : ''
				}`, () => {
					expect( WPIcons[ exported ] ).toBeDefined();
				} );
			}
		} );
	}
} );
