/**
 * Mobile viewport E2E tests for the Aldus plugin.
 *
 * These tests run exclusively on the mobile-chrome and mobile-safari Playwright
 * projects (Pixel 5 and iPhone 13 emulation).  They verify that the WP admin
 * and block editor are at minimum functional and that no critical JS errors
 * occur at mobile viewport sizes.
 *
 * Note: The block editor is not optimised for mobile and some interactions will
 * be limited.  These tests focus on smoke-testing the plugin's REST API and
 * verifying that the admin interface degrades gracefully.
 *
 * @see playwright.config.js  (mobile-chrome / mobile-safari projects)
 * @see tests/e2e/helpers.js
 */

'use strict';

const { test, expect } = require( '@playwright/test' );

// ---------------------------------------------------------------------------
// REST API — runs regardless of viewport size
// ---------------------------------------------------------------------------

test.describe( 'Aldus REST API (mobile context)', () => {
	test( '/health endpoint responds on mobile viewport', async ( {
		request,
	} ) => {
		const res = await request.get( '/wp-json/aldus/v1/health' );
		// Non-authenticated; expect 401 or 403, not 404 (plugin must be active).
		expect( [ 200, 401, 403 ] ).toContain( res.status() );
	} );

	test( '/config endpoint responds on mobile viewport', async ( {
		request,
	} ) => {
		const res = await request.get( '/wp-json/aldus/v1/config' );
		expect( [ 200, 401, 403 ] ).toContain( res.status() );
	} );

	test( '/assemble endpoint rejects empty payload on mobile viewport', async ( {
		request,
	} ) => {
		const res = await request.post( '/wp-json/aldus/v1/assemble', {
			data: {},
		} );
		expect( [ 400, 401, 403, 422 ] ).toContain( res.status() );
	} );
} );

// ---------------------------------------------------------------------------
// Admin page rendering at mobile viewport
// ---------------------------------------------------------------------------

test.describe( 'Admin UI at mobile viewport', () => {
	test( 'wp-admin login page renders correctly', async ( { page } ) => {
		// Navigate to login page (not yet authenticated in this project).
		await page.goto( '/wp-login.php' );
		await page.waitForSelector( '#loginform', { timeout: 15000 } );

		const form = page.locator( '#loginform' );
		await expect( form ).toBeVisible();

		// Username and password fields must be present.
		await expect( page.locator( '#user_login' ) ).toBeVisible();
		await expect( page.locator( '#user_pass' ) ).toBeVisible();
	} );

	test( 'wp-admin dashboard is reachable', async ( { page } ) => {
		await page.goto( '/wp-admin/' );
		// Should redirect to login or show dashboard — either is acceptable.
		await expect(
			page.locator( '#wpadminbar, #loginform' ).first()
		).toBeVisible( { timeout: 20000 } );
	} );

	test( 'no JS errors on admin dashboard at mobile size', async ( {
		page,
	} ) => {
		const errors = [];
		page.on( 'pageerror', ( e ) => errors.push( e.message ) );
		page.on( 'console', ( msg ) => {
			if ( msg.type() === 'error' ) errors.push( msg.text() );
		} );

		await page.goto( '/wp-admin/' );
		await page.waitForSelector( '#wpadminbar, #loginform', {
			timeout: 20000,
		} );

		// Allow a generous settle time for any deferred scripts.
		await page.waitForTimeout( 1000 );

		const critical = errors.filter(
			( e ) =>
				! /GPUBuffer|Block validation|Cannot update a component/i.test( e )
		);
		expect( critical ).toEqual( [] );
	} );
} );

// ---------------------------------------------------------------------------
// Viewport meta tag
// ---------------------------------------------------------------------------

test.describe( 'Viewport meta at mobile sizes', () => {
	test( 'wp-admin has viewport meta tag', async ( { page } ) => {
		await page.goto( '/wp-admin/wp-login.php' );
		const viewport = await page.locator( 'meta[name="viewport"]' ).getAttribute( 'content' );
		expect( viewport ).toBeTruthy();
		expect( viewport ).toMatch( /width=device-width/i );
	} );
} );
