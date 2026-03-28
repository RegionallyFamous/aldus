/**
 * Aldus quality — axe-core scans + copy / affordance checks.
 *
 * Complements functional E2E: catches serious a11y regressions and ensures
 * primary guidance text and actions stay present (helpful UX contract).
 *
 * @see tests/e2e/a11y.spec.js
 * @see tests/e2e/pack-preview.spec.js
 */

'use strict';

const path = require( 'path' );
const { test, expect } = require( '@playwright/test' );
const { AxeBuilder } = require( '@axe-core/playwright' );
const {
	getEditorFrame,
	insertAldusBlock,
	waitForPostEditorShell,
} = require( './helpers' );

/** Same session file as playwright.config.js / auth.setup.js — required for @axe-core/playwright (needs browser.newContext). */
const AUTH_FILE = path.join( __dirname, '.auth.json' );

test.describe.configure( { mode: 'serial' } );

test.setTimeout( 150000 );

/** Rules that often flag third-party / core editor chrome; not actionable for Aldus-only fixes. */
const AXE_DISABLED_RULES = [
	'color-contrast',
	'landmark-one-main',
	'page-has-heading-one',
	'region',
];

/**
 * @param {import('axe-core').Result[]} violations
 * @returns {import('axe-core').Result[]}
 */
function filterSerious( violations ) {
	return violations.filter(
		( v ) => v.impact === 'serious' || v.impact === 'critical'
	);
}

/**
 * Keep violations whose targets mention the editor canvas iframe or Aldus DOM
 * (avoids failing on unrelated wp-admin chrome).
 *
 * @param {import('axe-core').Result[]} violations
 * @returns {import('axe-core').Result[]}
 */
function violationsTouchingAldusOrCanvas( violations ) {
	return violations.filter( ( v ) =>
		v.nodes.some( ( n ) =>
			n.target.some( ( t ) => {
				const s = Array.isArray( t ) ? t.join( ' ' ) : String( t );
				return /aldus/i.test( s ) || /editor-canvas/i.test( s );
			} )
		)
	);
}

test.describe( 'Aldus quality — axe + copy', () => {
	/** @type {import('@playwright/test').BrowserContext} */
	let context;
	/** @type {import('@playwright/test').Page} */
	let page;
	/** @type {import('@playwright/test').FrameLocator} */
	let frame;

	test.beforeAll( async ( { browser } ) => {
		context = await browser.newContext( {
			storageState: AUTH_FILE,
			baseURL: process.env.WP_BASE_URL ?? 'http://localhost:8888',
		} );
		page = await context.newPage();
		await page.goto( '/wp-admin/post-new.php' );
		await waitForPostEditorShell( page );

		const welcomeClose = page
			.getByRole( 'button', { name: 'Close' } )
			.first();
		if (
			await welcomeClose.isVisible( { timeout: 3000 } ).catch( () => false )
		) {
			await welcomeClose.click();
		}

		frame = getEditorFrame( page );
		await frame.locator( '.editor-post-title' ).waitFor( { timeout: 30000 } );

		await insertAldusBlock( page );
	} );

	test.afterAll( async () => {
		await context.close();
	} );

	test( 'building screen exposes mode tabs and empty-state guidance', async () => {
		const block = frame.locator( '.wp-block-aldus-layout-generator' );
		await expect(
			block.getByRole( 'tab', { name: /your content/i } )
		).toBeVisible( { timeout: 15000 } );
		await expect(
			block.getByRole( 'tab', { name: /browse styles/i } )
		).toBeVisible();
		await expect(
			block.getByText( /what do you want to say/i )
		).toBeVisible();
		await expect(
			block.getByText( /add your content, then aldus shows you/i )
		).toBeVisible();
	} );

	test( 'axe reports no serious/critical issues scoped to Aldus/editor canvas (building)', async ( {
		browserName,
	} ) => {
		test.skip(
			browserName !== 'chromium',
			'Axe scope is baselined on Chromium (consistent with visual-regression).'
		);
		const results = await new AxeBuilder( { page } )
			.disableRules( AXE_DISABLED_RULES )
			.withTags( [ 'wcag2a' ] )
			.analyze();

		const bad = filterSerious( results.violations );
		const scoped = violationsTouchingAldusOrCanvas( bad );
		expect(
			scoped,
			JSON.stringify( scoped, null, 2 )
		).toEqual( [] );
	} );

	test( 'pack preview grid exposes per-card actions and layout names', async () => {
		const block = frame.locator( '.wp-block-aldus-layout-generator' );
		await block.getByRole( 'tab', { name: /browse styles/i } ).click();
		await frame.locator( '.aldus-grid' ).waitFor( { timeout: 120000 } );
		const cards = frame.locator( '.aldus-card' );
		await expect( cards ).toHaveCount( 16, { timeout: 60000 } );
		await expect(
			frame.locator( '.aldus-card-use-btn' ).first()
		).toBeVisible();
		await expect(
			frame.getByRole( 'button', { name: /expand preview/i } ).first()
		).toBeVisible();
	} );

	test( 'axe reports no serious/critical issues scoped to Aldus/editor canvas (results grid)', async ( {
		browserName,
	} ) => {
		test.skip(
			browserName !== 'chromium',
			'Axe scope is baselined on Chromium (consistent with visual-regression).'
		);
		const results = await new AxeBuilder( { page } )
			.disableRules( AXE_DISABLED_RULES )
			.withTags( [ 'wcag2a' ] )
			.analyze();

		const bad = filterSerious( results.violations );
		const scoped = violationsTouchingAldusOrCanvas( bad );
		expect(
			scoped,
			JSON.stringify( scoped, null, 2 )
		).toEqual( [] );
	} );
} );
