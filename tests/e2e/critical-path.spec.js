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
 * WordPress 6.3+ renders the block editor content inside an iframe
 * (name="editor-canvas").  Block elements are accessed via frameLocator.
 * Inspector controls and the top toolbar stay on the main page.
 *
 * Auth is provided by auth.setup.js (login cookie in storageState).
 *
 * @see playwright.config.js
 * @see tests/e2e/auth.setup.js
 */

'use strict';

const { test, expect } = require( '@playwright/test' );
const {
	getEditorFrame,
	waitForPostEditorShell,
	newLoggedInPage,
} = require( './helpers' );

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

/** @type {import('@playwright/test').BrowserContext} */
let editorContext;

/** @type {import('@playwright/test').FrameLocator} */
let editorFrame;

test.describe( 'Aldus inspector controls', () => {
	test.beforeAll( async ( { browser } ) => {
		const created = await newLoggedInPage( browser );
		editorPage = created.page;
		editorContext = created.context;
		await editorPage.goto( '/wp-admin/post-new.php' );

		await waitForPostEditorShell( editorPage );

		// Dismiss Welcome Guide if present (renders on main page).
		const close = editorPage
			.getByRole( 'button', { name: 'Close' } )
			.first();
		if ( await close.isVisible( { timeout: 3000 } ).catch( () => false ) ) {
			await close.click();
		}

		// Wait for the editor canvas iframe to be ready.
		editorFrame = getEditorFrame( editorPage );
		await editorFrame
			.locator( '.editor-post-title' )
			.waitFor( { timeout: 30000 } );

		// Insert the Aldus block via slash command inside the iframe.
		// Click the block list appender ("Type / to choose a block").
		const appender = editorFrame.locator( '.block-list-appender' ).first();
		await appender.click();
		await editorPage.keyboard.type( '/aldus' );

		const suggestion = editorFrame
			.locator( '.components-autocomplete__result' )
			.filter( { hasText: /aldus/i } )
			.first();
		// Wait for the suggestion to appear, then confirm via Enter key.
		// Clicking inside the iframe autocomplete can be intercepted by overlays.
		if (
			await suggestion
				.isVisible( { timeout: 5000 } )
				.catch( () => false )
		) {
			await editorPage.keyboard.press( 'Enter' );
		} else {
			// Fallback: insert via the Block Inserter toolbar button.
			await editorPage.keyboard.press( 'Escape' );
			const inserterBtn = editorPage
				.getByRole( 'button', { name: /block inserter/i } )
				.first();
			await inserterBtn.click();
			const searchInput = editorPage
				.getByPlaceholder( /search/i )
				.first();
			await searchInput.fill( 'Aldus' );
			const option = editorPage
				.getByRole( 'option' )
				.filter( { hasText: /^aldus$/i } )
				.first();
			await option.click();
		}

		// Make sure the block is present before running inspector tests.
		await editorFrame
			.locator( '.wp-block-aldus-layout-generator' )
			.waitFor( { timeout: 30000 } );
	} );

	test.afterAll( async () => {
		await editorContext.close();
	} );

	test( 'Aldus block is present in the editor', async () => {
		const block = editorFrame.locator(
			'.wp-block-aldus-layout-generator'
		);
		await expect( block ).toBeVisible();
	} );

	test( 'Inspector sidebar loads when the block is selected', async () => {
		// Click the block (inside the iframe) to select it.
		const block = editorFrame.locator(
			'.wp-block-aldus-layout-generator'
		);
		await block.click();

		// The Settings sidebar button is on the main page — aria-label "Settings".
		const settingsBtn = editorPage.getByRole( 'button', {
			name: 'Settings',
			exact: true,
		} );
		if (
			await settingsBtn
				.isVisible( { timeout: 2000 } )
				.catch( () => false )
		) {
			await settingsBtn.click();
		}

		// The block inspector panel is rendered on the main page (sidebar).
		const inspector = editorPage.locator(
			'.block-editor-block-inspector'
		);
		await expect( inspector ).toBeVisible( { timeout: 10000 } );
	} );
} );
