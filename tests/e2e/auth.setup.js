/**
 * Playwright auth setup — logs in to WordPress once and saves the session
 * to tests/e2e/.auth.json so every other spec can reuse the cookies.
 *
 * This is a Playwright "setup project" test (see playwright.config.js).
 * Using the test fixture means Playwright manages the browser context,
 * sandbox flags, and baseURL correctly — unlike a raw chromium.launch().
 */

'use strict';

const { test: setup } = require( '@playwright/test' );
const path = require( 'path' );

const AUTH_FILE = path.join( __dirname, '.auth.json' );

setup( 'authenticate', async ( { page } ) => {
	await page.goto( '/wp-login.php', { waitUntil: 'domcontentloaded' } );

	// Log the actual URL so CI logs show where we ended up.
	const landedUrl = page.url();
	console.log( `[auth setup] navigated to: ${ landedUrl }` );

	// Wait for the login form — wp-env may still be finishing post-install work.
	await page.waitForSelector( '#user_login', { timeout: 60000 } );

	await page.fill( '#user_login', process.env.WP_USERNAME ?? 'admin' );
	await page.fill( '#user_pass', process.env.WP_PASSWORD ?? 'password' );
	await page.click( '#wp-submit' );
	await page.waitForURL( '**/wp-admin/**', { timeout: 60000 } );

	console.log( `[auth setup] logged in, saving state to ${ AUTH_FILE }` );
	await page.context().storageState( { path: AUTH_FILE } );
} );
