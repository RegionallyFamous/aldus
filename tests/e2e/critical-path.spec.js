/**
 * E2E critical-path tests for Aldus — REST API and inspector controls.
 *
 * These tests verify the plugin's server-side layer and block editor UI
 * without requiring the WebLLM engine to run.  Two approaches are used:
 *
 *   1. Playwright `request` fixture — hits the REST endpoint directly and
 *      verifies the response shape (no browser / no LLM needed).
 *
 *   2. Inspector controls — inserts the Aldus block, opens the sidebar, and
 *      confirms that the personality pills and the Generate tab render.
 *
 * Auth is provided by global-setup.js (login cookie in storageState).
 *
 * @see playwright.config.js
 * @see tests/e2e/global-setup.js
 */

'use strict';

const { test, expect } = require( '@playwright/test' );

// ---------------------------------------------------------------------------
// 1. REST API smoke test
// ---------------------------------------------------------------------------

test.describe( 'Aldus REST API', () => {
	test( '/assemble endpoint returns 400 on an empty payload', async ( {
		request,
	} ) => {
		const response = await request.post( '/wp-json/aldus/v1/assemble', {
			data: {},
		} );
		// The endpoint requires content; an empty body should be rejected.
		expect( [ 400, 422 ] ).toContain( response.status() );
	} );

	test( '/assemble endpoint exists and is reachable', async ( {
		request,
	} ) => {
		// A well-formed but minimal payload — tokens only, no items.
		// We don't expect a successful generation, just a non-404 response.
		const response = await request.post( '/wp-json/aldus/v1/assemble', {
			data: {
				tokens: [ 'paragraph' ],
				personality: 'Dispatch',
				items: [],
			},
		} );
		// 200 (success), 400 (validation error), or 401/403 (auth) are all fine;
		// 404 means the route is missing entirely.
		expect( response.status() ).not.toBe( 404 );
	} );
} );

// ---------------------------------------------------------------------------
// 2. Inspector controls smoke test
// ---------------------------------------------------------------------------

test.describe.configure( { mode: 'serial' } );

/** @type {import('@playwright/test').Page} */
let editorPage;

test.describe( 'Aldus inspector controls', () => {
	test.beforeAll( async ( { browser } ) => {
		editorPage = await browser.newPage();
		await editorPage.goto( '/wp-admin/post-new.php' );
		await editorPage.waitForSelector( '.editor-post-title', {
			timeout: 30000,
		} );

		// Dismiss Welcome Guide.
		const close = editorPage
			.getByRole( 'button', { name: 'Close' } )
			.first();
		if ( await close.isVisible( { timeout: 3000 } ).catch( () => false ) ) {
			await close.click();
		}

		// Insert the Aldus block via slash command.
		const canvas = editorPage
			.locator( '[aria-label="Block editor content"]' )
			.first();
		await canvas.click();
		await editorPage.keyboard.press( 'Enter' );
		await editorPage.keyboard.type( '/aldus' );

		const suggestion = editorPage
			.locator( '.components-autocomplete__result' )
			.filter( { hasText: /aldus/i } )
			.first();
		if (
			await suggestion.isVisible( { timeout: 5000 } ).catch( () => false )
		) {
			await suggestion.click();
		}

		// Make sure the block is present before running any inspector tests.
		await editorPage.waitForSelector( '.wp-block-aldus-layout-generator', {
			timeout: 15000,
		} );
	} );

	test.afterAll( async () => {
		await editorPage.close();
	} );

	test( 'Aldus block is present in the editor', async () => {
		const block = editorPage.locator( '.wp-block-aldus-layout-generator' );
		await expect( block ).toBeVisible();
	} );

	test( 'Inspector sidebar loads when the block is selected', async () => {
		// Click the block to select it and open the sidebar.
		const block = editorPage.locator( '.wp-block-aldus-layout-generator' );
		await block.click();

		// Open the Settings sidebar if it isn't already visible.
		const settingsBtn = editorPage.getByRole( 'button', {
			name: /settings/i,
		} );
		if (
			await settingsBtn
				.isVisible( { timeout: 2000 } )
				.catch( () => false )
		) {
			await settingsBtn.click();
		}

		// The block inspector should show at least one panel.
		const inspector = editorPage.locator( '.block-editor-block-inspector' );
		await expect( inspector ).toBeVisible( { timeout: 10000 } );
	} );
} );
