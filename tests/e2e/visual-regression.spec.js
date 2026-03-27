/**
 * Visual regression E2E tests for the Aldus plugin.
 *
 * Uses Playwright's built-in `toHaveScreenshot` for pixel-level comparisons.
 * Snapshots are stored in tests/e2e/__snapshots__/ and committed to git so CI
 * can detect unintended visual changes.
 *
 * Run with: npx playwright test visual-regression.spec.js --update-snapshots
 * to regenerate baseline images after intentional design changes.
 *
 * Only runs on the `chromium` project (consistent rendering across runs).
 * Firefox and WebKit are excluded in playwright.config.js via testIgnore.
 *
 * @see playwright.config.js
 * @see tests/e2e/helpers.js
 */

'use strict';

const { test, expect } = require( '@playwright/test' );

// Maximum diff allowed per snapshot (1 % of pixels).
const MAX_DIFF_PIXELS_RATIO = 0.01;

// ---------------------------------------------------------------------------
// WP admin login page
// ---------------------------------------------------------------------------

test.describe( 'Visual regression — login page', () => {
	test( 'login page matches snapshot', async ( { page } ) => {
		await page.goto( '/wp-login.php' );
		await page.waitForSelector( '#loginform', { timeout: 15000 } );

		// Hide dynamic content (time-based nonces, etc.) before snapshotting.
		await page.evaluate( () => {
			// Remove admin bar if visible.
			const bar = document.getElementById( 'wpadminbar' );
			if ( bar ) bar.style.visibility = 'hidden';
		} );

		await expect( page ).toHaveScreenshot( 'login-page.png', {
			maxDiffPixelRatio: MAX_DIFF_PIXELS_RATIO,
		} );
	} );
} );

// ---------------------------------------------------------------------------
// WP admin dashboard
// ---------------------------------------------------------------------------

test.describe( 'Visual regression — admin dashboard', () => {
	test( 'dashboard matches snapshot', async ( { page } ) => {
		await page.goto( '/wp-admin/' );
		await page.waitForSelector( '#dashboard-widgets-wrap', {
			timeout: 20000,
		} );

		// Mask dynamic/volatile regions before comparing.
		await page.evaluate( () => {
			// Hide activity widget (changes every test run).
			const activity = document.querySelector(
				'#dashboard_activity, #dashboard_right_now'
			);
			if ( activity ) activity.style.visibility = 'hidden';
			// Hide any inline date/time text.
			document.querySelectorAll( 'abbr[title]' ).forEach( ( el ) => {
				el.textContent = '—';
			} );
		} );

		await expect( page ).toHaveScreenshot( 'admin-dashboard.png', {
			maxDiffPixelRatio: MAX_DIFF_PIXELS_RATIO,
			// Mask the volatile activity and at-a-glance widgets.
			mask: [
				page.locator( '#dashboard_activity' ),
				page.locator( '#dashboard_right_now' ),
				page.locator( '#dashboard_quick_press' ),
			],
		} );
	} );
} );

// ---------------------------------------------------------------------------
// Aldus REST API response shapes (non-visual, but grouped here as a sanity
// gate before visual tests run)
// ---------------------------------------------------------------------------

test.describe( 'Visual regression — pre-flight API checks', () => {
	test( '/config endpoint returns expected shape', async ( { page } ) => {
		// Navigate to wp-admin to obtain the WP nonce, then call the REST API
		// via page.evaluate so both the session cookie and nonce are included.
		// The bare `request` fixture sends cookies but not the nonce required
		// for WordPress cookie-based REST authentication.
		await page.goto( '/wp-admin/', { waitUntil: 'domcontentloaded' } );
		await page.waitForSelector( '#wpadminbar', { timeout: 15000 } );

		const { status, body } = await page.evaluate( async () => {
			const nonce = window.wpApiSettings?.nonce ?? '';
			const res = await fetch( '/wp-json/aldus/v1/config', {
				credentials: 'same-origin',
				headers: nonce ? { 'X-WP-Nonce': nonce } : {},
			} );
			return { status: res.status, body: await res.json().catch( () => null ) };
		} );

		expect( status ).toBe( 200 );
		expect( body ).toHaveProperty( 'version' );
		expect( body ).toHaveProperty( 'personalities' );
		expect( Array.isArray( body.personalities ) ).toBe( true );
	} );
} );
