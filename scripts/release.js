#!/usr/bin/env node
/**
 * Aldus release script.
 *
 * Usage:
 *   npm run release                  — zip current version
 *   npm run release -- --bump patch  — bump 1.0.0 → 1.0.1, then zip
 *   npm run release -- --bump minor  — bump 1.0.0 → 1.1.0, then zip
 *   npm run release -- --bump major  — bump 1.0.0 → 2.0.0, then zip
 *   npm run release -- --skip-build  — skip npm build (use existing build/)
 *
 * Output: releases/aldus-{version}.zip
 *
 * The zip contains a single top-level folder named "aldus/" containing only
 * production files — no src/, node_modules/, config files, or dotfiles.
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const { execSync } = require( 'child_process' );

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = path.resolve( __dirname, '..' );

function read( rel ) {
	return fs.readFileSync( path.join( ROOT, rel ), 'utf8' );
}
function write( rel, s ) {
	fs.writeFileSync( path.join( ROOT, rel ), s, 'utf8' );
}
function exists( rel ) {
	return fs.existsSync( path.join( ROOT, rel ) );
}
function log( msg ) {
	console.log( `  ${ msg }` );
}
function die( msg ) {
	console.error( `\n  ✗ ${ msg }\n` );
	process.exit( 1 );
}

/**
 * Copy a file, creating parent dirs as needed.
 * @param src
 * @param dest
 */
function copyFile( src, dest ) {
	fs.mkdirSync( path.dirname( dest ), { recursive: true } );
	fs.copyFileSync( src, dest );
}

/**
 * Recursively copy a directory.
 * @param src
 * @param dest
 */
function copyDir( src, dest ) {
	const entries = fs.readdirSync( src, { withFileTypes: true } );
	fs.mkdirSync( dest, { recursive: true } );
	for ( const entry of entries ) {
		const s = path.join( src, entry.name );
		const d = path.join( dest, entry.name );
		if ( entry.isDirectory() ) {
			copyDir( s, d );
		} else {
			fs.copyFileSync( s, d );
		}
	}
}

/**
 * Recursively delete a directory.
 * @param p
 */
function rmDir( p ) {
	if ( fs.existsSync( p ) ) {
		fs.rmSync( p, { recursive: true, force: true } );
	}
}

/**
 * Zip a directory using the system zip command.
 * @param sourceDir
 * @param destZip
 * @param innerFolderName
 */
function zipDir( sourceDir, destZip, innerFolderName ) {
	// We zip from inside the parent of sourceDir so the archive
	// contains aldus/ as its top-level folder.
	const parent = path.dirname( sourceDir );
	execSync( `zip -r "${ destZip }" "${ innerFolderName }"`, {
		cwd: parent,
		stdio: 'pipe',
	} );
}

// ---------------------------------------------------------------------------
// Version handling
// ---------------------------------------------------------------------------

function getCurrentVersion() {
	const php = read( 'aldus.php' );
	const m = php.match( /^\s*\*\s*Version:\s*([\d.]+)/m );
	if ( ! m ) {
		die( 'Could not find Version: header in aldus.php' );
	}
	return m[ 1 ];
}

function bumpVersion( current, type ) {
	const [ major, minor, patch ] = current.split( '.' ).map( Number );
	switch ( type ) {
		case 'major':
			return `${ major + 1 }.0.0`;
		case 'minor':
			return `${ major }.${ minor + 1 }.0`;
		case 'patch':
			return `${ major }.${ minor }.${ patch + 1 }`;
		default:
			die( `Unknown bump type "${ type }". Use patch, minor, or major.` );
	}
}

function applyVersion( oldVer, newVer ) {
	log( `Bumping version ${ oldVer } → ${ newVer }` );

	// aldus.php — plugin header and ALDUS_VERSION constant.
	let php = read( 'aldus.php' );
	php = php.replace( /(\*\s*Version:\s*)[\d.]+/, `$1${ newVer }` );
	php = php.replace(
		/(define\s*\(\s*'ALDUS_VERSION'\s*,\s*')[\d.]+(')/,
		`$1${ newVer }$2`
	);
	write( 'aldus.php', php );

	// package.json — version field.
	const pkg = JSON.parse( read( 'package.json' ) );
	pkg.version = newVer;
	write( 'package.json', JSON.stringify( pkg, null, '\t' ) + '\n' );

	// readme.txt — Stable tag line.
	if ( exists( 'readme.txt' ) ) {
		let txt = read( 'readme.txt' );
		txt = txt.replace( /(Stable tag:\s*)[\d.]+/, `$1${ newVer }` );
		write( 'readme.txt', txt );
	}

	// src/block.json — version field.
	if ( exists( 'src/block.json' ) ) {
		let bj = read( 'src/block.json' );
		bj = bj.replace( /("version":\s*")[\d.]+(")/, `$1${ newVer }$2` );
		write( 'src/block.json', bj );
	}

	// src/edit.js — ALDUS_JS_VERSION constant (version mismatch check).
	if ( exists( 'src/edit.js' ) ) {
		let ej = read( 'src/edit.js' );
		ej = ej.replace(
			/(const ALDUS_JS_VERSION\s*=\s*')[\d.]+(';)/,
			`$1${ newVer }$2`
		);
		write( 'src/edit.js', ej );
	}
}

// ---------------------------------------------------------------------------
// Production file manifest
// ---------------------------------------------------------------------------

/**
 * Returns a list of { src, dest } objects describing every file to include
 * in the release zip. dest is relative to the "aldus/" folder in the zip.
 */
function getManifest() {
	const entries = [];

	// Single root files.
	const rootFiles = [ 'aldus.php', 'uninstall.php', 'readme.txt' ];
	for ( const f of rootFiles ) {
		if ( exists( f ) ) {
			entries.push( { src: f, dest: f } );
		}
	}

	// Entire directories — copied verbatim.
	const dirs = [ 'build', 'includes', 'assets', 'languages' ];
	for ( const dir of dirs ) {
		if ( ! exists( dir ) ) {
			continue;
		}
		const walk = ( rel ) => {
			const abs = path.join( ROOT, rel );
			for ( const entry of fs.readdirSync( abs, {
				withFileTypes: true,
			} ) ) {
				const childRel = path.join( rel, entry.name );
				if ( entry.isDirectory() ) {
					walk( childRel );
				} else {
					entries.push( { src: childRel, dest: childRel } );
				}
			}
		};
		walk( dir );
	}

	return entries;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

( async function main() {
	// Parse args.
	const args = process.argv.slice( 2 );
	const bumpIndex = args.indexOf( '--bump' );
	const bumpType = bumpIndex >= 0 ? args[ bumpIndex + 1 ] : null;
	const skipBuild = args.includes( '--skip-build' );

	// Resolve version.
	const currentVer = getCurrentVersion();
	const version = bumpType ? bumpVersion( currentVer, bumpType ) : currentVer;

	console.log( `\n  Aldus Release Builder` );
	console.log( `  ${ '─'.repeat( 40 ) }` );
	console.log( `  Version : ${ version }` );

	// Apply version bump to source files.
	if ( bumpType ) {
		applyVersion( currentVer, version );
	}

	// Build assets.
	if ( skipBuild ) {
		log( 'Skipping build (--skip-build)' );
	} else {
		log( 'Running npm run build…' );
		execSync( 'npm run build', { cwd: ROOT, stdio: 'inherit' } );
	}

	// Verify that critical build artefacts are present.
	const required = [
		'build/index.js',
		'build/index.asset.php',
		'build/index.css',
		'build/block.json',
		'build/render.php',
	];
	const missing = required.filter( ( f ) => ! exists( f ) );
	if ( missing.length ) {
		die(
			`Missing required build files (run npm run build first):\n    ${ missing.join( '\n    ' ) }`
		);
	}

	// Prepare temp staging directory.
	const stagingRoot = path.join( ROOT, 'releases', '.tmp-staging' );
	const stagingPlugin = path.join( stagingRoot, 'aldus' );
	rmDir( stagingRoot );
	fs.mkdirSync( stagingPlugin, { recursive: true } );

	// Copy production files.
	log( 'Staging production files…' );
	const manifest = getManifest();
	for ( const { src, dest } of manifest ) {
		copyFile( path.join( ROOT, src ), path.join( stagingPlugin, dest ) );
	}
	log( `  ${ manifest.length } files staged` );

	// Create zip.
	const releasesDir = path.join( ROOT, 'releases' );
	fs.mkdirSync( releasesDir, { recursive: true } );
	const zipName = `aldus-${ version }.zip`;
	const zipPath = path.join( releasesDir, zipName );

	// Remove previous zip for this version if it exists.
	if ( fs.existsSync( zipPath ) ) {
		fs.unlinkSync( zipPath );
	}

	log( `Zipping → releases/${ zipName }…` );
	zipDir( stagingPlugin, zipPath, 'aldus' );

	// Clean up staging dir.
	rmDir( stagingRoot );

	// Report.
	const zipSize = ( fs.statSync( zipPath ).size / 1024 / 1024 ).toFixed( 2 );
	console.log( `\n  ✓ Done!` );
	console.log( `  ${ zipPath }` );
	console.log( `  Size: ${ zipSize } MB\n` );
} )().catch( ( err ) => {
	die( err.message );
} );
