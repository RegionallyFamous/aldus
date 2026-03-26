/**
 * Shared helper utilities for Aldus Playwright E2E tests.
 *
 * Centralises the login flow and new-post setup so individual spec files
 * stay focused on the feature under test.
 */

'use strict';

/**
 * Logs in to the WordPress admin panel.
 *
 * Reads credentials from WP_USERNAME / WP_PASSWORD environment variables,
 * falling back to the wp-env defaults ("admin" / "password").
 *
 * @param {import('@playwright/test').Page} page Playwright Page instance.
 * @return {Promise<void>}
 */
async function wpLogin( page ) {
	await page.goto( '/wp-login.php', { waitUntil: 'domcontentloaded' } );
	// Wait for the login form with an extended timeout — wp-env may still be
	// running post-install steps when the HTTP server first responds.
	await page.waitForSelector( '#user_login', { timeout: 60000 } );
	await page.fill( '#user_login', process.env.WP_USERNAME ?? 'admin' );
	await page.fill( '#user_pass', process.env.WP_PASSWORD ?? 'password' );
	await page.click( '#wp-submit' );
	await page.waitForURL( '**/wp-admin/**' );
}

/**
 * Creates a new post and navigates to its block editor.
 *
 * Dismisses the Welcome Guide modal if it appears so tests can interact
 * with the editor canvas immediately.
 *
 * @param {import('@playwright/test').Page} page Playwright Page instance.
 * @return {Promise<void>}
 */
async function openNewPost( page ) {
	await page.goto( '/wp-admin/post-new.php' );
	// Dismiss the Welcome Guide modal if it appears.
	const welcomeClose = page.locator( 'button[aria-label="Close"]' ).first();
	if (
		await welcomeClose.isVisible( { timeout: 3000 } ).catch( () => false )
	) {
		await welcomeClose.click();
	}
}

module.exports = { wpLogin, openNewPost };
