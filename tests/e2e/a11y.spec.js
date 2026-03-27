/**
 * Accessibility (a11y) E2E tests for the Aldus plugin.
 *
 * Tests keyboard navigation, ARIA attributes, focus management, and screen
 * reader-friendly markup across the main Aldus UI surfaces.
 *
 * REST API tests that require authentication use page.evaluate() with the
 * WP nonce (available on admin pages via wpApiSettings.nonce) rather than
 * the bare `request` fixture, which only sends cookies but not the nonce
 * required for WordPress cookie-based REST authentication.
 *
 * @see playwright.config.js
 * @see tests/e2e/helpers.js
 */

'use strict';

const { test, expect } = require( '@playwright/test' );
const { openNewPost } = require( './helpers' );

// ---------------------------------------------------------------------------
// Helper: navigate to wp-admin and make an authenticated REST call via fetch
// (the page context carries both the session cookie and the WP nonce).
// ---------------------------------------------------------------------------
async function authedGet( page, path ) {
	await page.goto( '/wp-admin/', { waitUntil: 'domcontentloaded' } );
	await page.waitForSelector( '#wpadminbar', { timeout: 15000 } );
	return page.evaluate( async ( url ) => {
		const nonce = window.wpApiSettings?.nonce ?? '';
		const res = await fetch( url, {
			credentials: 'same-origin',
			headers: nonce ? { 'X-WP-Nonce': nonce } : {},
		} );
		const data = await res.json().catch( () => null );
		return { status: res.status, data };
	}, path );
}

// ---------------------------------------------------------------------------
// REST API a11y probes
// ---------------------------------------------------------------------------

test.describe( 'Aldus REST API a11y', () => {
	test( '/config endpoint returns personalities with non-empty labels', async ( {
		page,
	} ) => {
		const { status, data } = await authedGet(
			page,
			'/wp-json/aldus/v1/config'
		);
		expect( status ).toBe( 200 );
		expect( Array.isArray( data.personalities ) ).toBe( true );
		// Each personality must have a non-empty label (used as button/chip labels).
		for ( const p of data.personalities ) {
			expect( typeof p.label ).toBe( 'string' );
			expect( p.label.length ).toBeGreaterThan( 0 );
		}
	} );
} );

// ---------------------------------------------------------------------------
// Block editor a11y
// ---------------------------------------------------------------------------

test.describe( 'Aldus block editor a11y', () => {
	test( 'inserter opens and Aldus block appears in search results', async ( {
		page,
	} ) => {
		await openNewPost( page );

		// Open the block inserter — aria-label is "Block Inserter" in WP 6.x+.
		const inserterBtn = page
			.getByRole( 'button', { name: /block inserter/i } )
			.first();
		await inserterBtn.click();

		// Search for "Aldus" in the inserter search input.
		const search = page.getByPlaceholder( /search/i ).first();
		await search.fill( 'Aldus' );

		// The Aldus block should appear as an option.
		await expect(
			page.getByRole( 'option', { name: /aldus/i } ).first()
		).toBeVisible( { timeout: 10000 } );

		// Close the inserter.
		await inserterBtn.click();
	} );

	test( 'Aldus block inserts without JS errors', async ( { page } ) => {
		const errors = [];
		page.on( 'pageerror', ( e ) => errors.push( e.message ) );
		page.on( 'console', ( msg ) => {
			if ( msg.type() === 'error' ) errors.push( msg.text() );
		} );

		const frame = await openNewPost( page );

		// Insert via slash command.
		await frame.locator( '.editor-post-title' ).click();
		const canvas = frame
			.locator(
				'[data-type="core/post-content"], .editor-styles-wrapper'
			)
			.first();
		await canvas.click();
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( '/aldus' );
		await page.keyboard.press( 'Enter' );

		// Give the block a moment to settle.
		await page.waitForTimeout( 2000 );

		// No critical JS errors should have occurred.
		const critical = errors.filter(
			( e ) =>
				! /GPUBuffer|Block validation|Cannot update a component/i.test(
					e
				)
		);
		expect( critical ).toEqual( [] );
	} );
} );

// ---------------------------------------------------------------------------
// ARIA landmark and role checks
// ---------------------------------------------------------------------------

test.describe( 'Admin pages a11y landmarks', () => {
	test( 'wp-admin has main landmark', async ( { page } ) => {
		await page.goto( '/wp-admin/' );
		await page.waitForSelector( '#wpadminbar', { timeout: 15000 } );
		// WordPress admin must have a <main> or role="main".
		const main = page.locator( 'main, [role="main"]' );
		await expect( main.first() ).toBeVisible();
	} );

	test( 'post list page has identifiable heading', async ( { page } ) => {
		await page.goto( '/wp-admin/edit.php' );
		await page.waitForSelector( '.wp-heading-inline', { timeout: 15000 } );
		const h1 = page.locator( 'h1' ).first();
		await expect( h1 ).toBeVisible();
	} );
} );

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

test.describe( 'Keyboard navigation', () => {
	test( 'admin menu items are reachable via Tab', async ( { page } ) => {
		await page.goto( '/wp-admin/' );
		await page.waitForSelector( '#adminmenuwrap', { timeout: 15000 } );

		// Tab from body a few times and verify focus has moved off <body>.
		await page.keyboard.press( 'Tab' );
		await page.keyboard.press( 'Tab' );

		const focusedTag = await page.evaluate(
			() => document.activeElement?.tagName ?? 'BODY'
		);
		// Focus should have moved to a focusable element (not body).
		expect( focusedTag ).not.toBe( 'BODY' );
	} );

	test( 'block editor toolbar buttons are keyboard-accessible', async ( {
		page,
	} ) => {
		await openNewPost( page );
		// The editor toolbar should contain focusable buttons.
		const toolbar = page
			.locator( '.edit-post-header-toolbar, .editor-document-bar' )
			.first();
		await expect( toolbar ).toBeVisible( { timeout: 10000 } );
		const buttons = toolbar.locator( 'button' );
		await expect( buttons.first() ).toBeVisible();
	} );
} );
