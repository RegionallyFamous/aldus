/**
 * E2E tests — Aldus admin welcome page.
 *
 * Navigates to the hidden admin page at /wp-admin/admin.php?page=aldus-welcome
 * and verifies the hero section, step cards, and CTA link are all present.
 * Also checks for JS errors using attachConsoleMonitor.
 *
 * Auth is provided by auth.setup.js (login cookie in storageState).
 *
 * @see tests/e2e/auth.setup.js
 * @see tests/e2e/helpers.js
 */

'use strict';

const { test, expect } = require( '@playwright/test' );
const { attachConsoleMonitor } = require( './helpers' );

test.describe( 'Aldus admin welcome page', () => {
	test( 'page loads without JS errors', async ( { page } ) => {
		const monitor = attachConsoleMonitor( page );

		await page.goto(
			'/wp-admin/admin.php?page=aldus-welcome'
		);

		// Wait for the page content to be present.
		await page.waitForSelector( '.aldus-welcome-wrap', {
			timeout: 15000,
		} );

		const errors = monitor.getErrors();
		expect(
			errors,
			`Unexpected JS errors: ${ errors.join( '\n' ) }`
		).toHaveLength( 0 );
	} );

	test( 'hero section renders with title and CTA', async ( { page } ) => {
		await page.goto( '/wp-admin/admin.php?page=aldus-welcome' );
		await page.waitForSelector( '.aldus-welcome-wrap', {
			timeout: 15000,
		} );

		const hero = page.locator( '.aldus-welcome-hero' );
		await expect( hero ).toBeVisible();

		// The h1 should contain "Aldus".
		const heading = hero.locator( 'h1' );
		await expect( heading ).toContainText( 'Aldus' );

		// Primary CTA link/button ("Try it in the editor →").
		const cta = hero.locator( '.button-hero, a.button-hero, .button-primary' ).first();
		await expect( cta ).toBeVisible();
		await expect( cta ).toHaveText( /try it in the editor|add to a page/i );
	} );

	test( 'step cards are visible', async ( { page } ) => {
		await page.goto( '/wp-admin/admin.php?page=aldus-welcome' );
		await page.waitForSelector( '.aldus-welcome-steps', {
			timeout: 15000,
		} );

		const steps = page.locator( '.aldus-welcome-step' );
		const count = await steps.count();
		expect( count ).toBeGreaterThanOrEqual( 3 );

		// Each step should have a numbered label (01, 02, 03 …).
		for ( let i = 0; i < count; i++ ) {
			const stepNum = steps.nth( i ).locator( '.aldus-welcome-step-number' );
			await expect( stepNum ).toBeVisible();
		}
	} );

	test( 'CTA link points to the block editor', async ( { page } ) => {
		await page.goto( '/wp-admin/admin.php?page=aldus-welcome' );
		await page.waitForSelector( '.aldus-welcome-hero', {
			timeout: 15000,
		} );

		const cta = page
			.locator( '.aldus-welcome-hero .button-hero' )
			.first();
		const href = await cta.getAttribute( 'href' );

		// Should link to wp-admin (post editor) or post-new.php.
		expect( href ).toMatch( /wp-admin|post/i );
	} );
} );
