/**
 * Playwright global setup — logs in to WordPress once and saves the auth
 * cookies to tests/e2e/.auth.json so every spec file can reuse the session
 * without repeating the login flow.
 *
 * Playwright runs this file before any tests start (see playwright.config.js).
 */

'use strict';

const { chromium } = require( '@playwright/test' );
const path = require( 'path' );

const AUTH_FILE = path.join( __dirname, '.auth.json' );

module.exports = async function globalSetup( config ) {
	const baseURL =
		config.projects?.[ 0 ]?.use?.baseURL ??
		process.env.WP_BASE_URL ??
		'http://localhost:8888';

	const browser = await chromium.launch();
	const page = await browser.newPage();

	await page.goto( `${ baseURL }/wp-login.php`, {
		waitUntil: 'domcontentloaded',
	} );

	// Wait for the login form — wp-env may still be finishing post-install
	// tasks even after the HTTP server first responds.
	await page.waitForSelector( '#user_login', { timeout: 60000 } );

	await page.fill( '#user_login', process.env.WP_USERNAME ?? 'admin' );
	await page.fill( '#user_pass', process.env.WP_PASSWORD ?? 'password' );
	await page.click( '#wp-submit' );
	await page.waitForURL( '**/wp-admin/**' );

	// Persist auth cookies and localStorage for all subsequent tests.
	await page.context().storageState( { path: AUTH_FILE } );

	await browser.close();
};
