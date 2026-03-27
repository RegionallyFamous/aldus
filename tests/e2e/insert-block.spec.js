/**
 * E2E tests — Aldus block insertion and build-screen smoke tests.
 *
 * All tests share a single browser page and a single new post so the
 * Gutenberg editor only loads once per run, keeping the suite fast.
 *
 * WordPress 6.3+ renders the block editor content inside an iframe
 * (name="editor-canvas").  Block elements are accessed via frameLocator;
 * the editor shell (toolbar, sidebar) is accessed on the main page.
 *
 * Auth is handled by auth.setup.js (one login for all specs).
 *
 * @see playwright.config.js
 * @see tests/e2e/auth.setup.js
 * @see tests/e2e/helpers.js
 */

'use strict';

const { test, expect } = require( '@playwright/test' );
const { getEditorFrame } = require( './helpers' );

// Run the tests sequentially and share the same page object.
test.describe.configure( { mode: 'serial' } );

/** @type {import('@playwright/test').Page} */
let page;

/** @type {import('@playwright/test').FrameLocator} */
let frame;

test.beforeAll( async ( { browser } ) => {
	page = await browser.newPage();

	// Navigate to a new post.
	await page.goto( '/wp-admin/post-new.php' );

	// The editor shell (outside iframe) must be present first.
	await page.waitForSelector( '.edit-post-layout', { timeout: 30000 } );

	// Dismiss the Welcome Guide modal if it appears.
	const welcomeClose = page.getByRole( 'button', { name: 'Close' } ).first();
	if (
		await welcomeClose.isVisible( { timeout: 3000 } ).catch( () => false )
	) {
		await welcomeClose.click();
	}

	// Wait for the editor canvas iframe to be ready.
	frame = getEditorFrame( page );
	await frame.locator( '.editor-post-title' ).waitFor( { timeout: 30000 } );
} );

test.afterAll( async () => {
	await page.close();
} );

// ---------------------------------------------------------------------------

test( 'Aldus block appears in the inserter search', async () => {
	// Open the block inserter — aria-label is "Block Inserter" in WP 7.x.
	const inserterBtn = page
		.getByRole( 'button', { name: /block inserter/i } )
		.first();
	await inserterBtn.click();

	// The inserter panel renders on the main page; search for "Aldus".
	const searchInput = page.getByPlaceholder( /search/i ).first();
	await searchInput.fill( 'Aldus' );

	// Block items in the inserter have role="option"; filter by text.
	const aldusOption = page
		.getByRole( 'option' )
		.filter( { hasText: /^aldus$/i } )
		.first();
	await expect( aldusOption ).toBeVisible( { timeout: 10000 } );

	// Close the inserter.
	await inserterBtn.click();
} );

test( 'Aldus block inserts and shows the build screen', async () => {
	// Click the block list appender ("Type / to choose a block") inside the iframe.
	const appender = frame.locator( '.block-list-appender' ).first();
	await appender.click();

	// After clicking the appender, a paragraph block should be focused.
	// Type slash-command to trigger the block inserter autocomplete.
	await page.keyboard.type( '/aldus' );

	// Autocomplete suggestion is rendered inside the iframe canvas.
	const suggestion = frame
		.locator( '.components-autocomplete__result' )
		.filter( { hasText: /aldus/i } )
		.first();

	if (
		await suggestion.isVisible( { timeout: 5000 } ).catch( () => false )
	) {
		// Press Enter to confirm; clicking inside the iframe autocomplete can
		// be intercepted by body/root-container overlays.
		await page.keyboard.press( 'Enter' );
	} else {
		// Fallback: insert via the Block Inserter toolbar button.
		await page.keyboard.press( 'Escape' );
		const inserterBtn = page
			.getByRole( 'button', { name: /block inserter/i } )
			.first();
		await inserterBtn.click();
		const searchInput = page.getByPlaceholder( /search/i ).first();
		await searchInput.fill( 'Aldus' );
		const option = page
			.getByRole( 'option' )
			.filter( { hasText: /^aldus$/i } )
			.first();
		await option.click();
	}

	// The Aldus block wrapper is inside the editor canvas iframe.
	const aldusBlock = frame.locator( '.wp-block-aldus-layout-generator' );
	await expect( aldusBlock ).toBeVisible( { timeout: 15000 } );
} );

test( 'build screen shows content-type buttons', async () => {
	const aldusBlock = frame.locator( '.wp-block-aldus-layout-generator' );
	await expect( aldusBlock ).toBeVisible( { timeout: 5000 } );

	// The build screen renders add-item buttons for each content type.
	const headlineBtn = aldusBlock
		.getByRole( 'button', { name: /headline/i } )
		.first();
	await expect( headlineBtn ).toBeVisible( { timeout: 10000 } );
} );

test( 'adding a headline item reveals the generate button', async () => {
	const aldusBlock = frame.locator( '.wp-block-aldus-layout-generator' );
	await expect( aldusBlock ).toBeVisible( { timeout: 5000 } );

	const headlineBtn = aldusBlock
		.getByRole( 'button', { name: /headline/i } )
		.first();

	if (
		await headlineBtn.isVisible( { timeout: 3000 } ).catch( () => false )
	) {
		// A block-preview popover can appear after insertion and intercept
		// pointer events.  Pressing Escape dismisses any open popover without
		// de-selecting the block.
		await page.keyboard.press( 'Escape' );
		await page.waitForTimeout( 300 );
		await headlineBtn.click();
	}

	// After adding an item the "Make it happen" / generate button should appear.
	const generateBtn = aldusBlock
		.getByRole( 'button', { name: /make it happen|generate/i } )
		.first();
	await expect( generateBtn ).toBeVisible( { timeout: 10000 } );
} );
