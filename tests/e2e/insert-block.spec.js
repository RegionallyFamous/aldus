/**
 * E2E tests — Aldus block insertion and build-screen smoke tests.
 *
 * All tests share a single browser page and a single new post so the
 * Gutenberg editor only loads once per run, keeping the suite fast.
 *
 * Auth is handled by global-setup.js (one login for all specs).
 *
 * @see playwright.config.js
 * @see tests/e2e/global-setup.js
 */

'use strict';

const { test, expect } = require( '@playwright/test' );

// Run the tests sequentially and share the same page object.
test.describe.configure( { mode: 'serial' } );

/** @type {import('@playwright/test').Page} */
let page;

test.beforeAll( async ( { browser } ) => {
	page = await browser.newPage();

	// Navigate to a new post. Dismiss the Welcome Guide if it appears.
	await page.goto( '/wp-admin/post-new.php' );
	await page.waitForSelector( '.editor-post-title', { timeout: 30000 } );

	const welcomeClose = page.getByRole( 'button', { name: 'Close' } ).first();
	if (
		await welcomeClose.isVisible( { timeout: 3000 } ).catch( () => false )
	) {
		await welcomeClose.click();
	}
} );

test.afterAll( async () => {
	await page.close();
} );

// ---------------------------------------------------------------------------

test( 'Aldus block appears in the inserter search', async () => {
	// Open the block inserter.
	const inserterBtn = page.getByRole( 'button', {
		name: /toggle block inserter/i,
	} );
	await inserterBtn.click();

	// Search for "Aldus".
	const searchInput = page.getByPlaceholder( 'Search' );
	await searchInput.fill( 'Aldus' );

	// The Aldus block option should appear within a reasonable time.
	const aldusOption = page
		.getByRole( 'option', { name: /aldus/i } )
		.or( page.locator( '[aria-label*="Aldus"]' ) )
		.first();
	await expect( aldusOption ).toBeVisible( { timeout: 10000 } );

	// Close the inserter.
	await inserterBtn.click();
} );

test( 'Aldus block inserts and shows the build screen', async () => {
	// Click the editor canvas to focus it, then use the slash command.
	const canvas = page
		.locator( '[aria-label="Block editor content"]' )
		.or( page.locator( '.editor-styles-wrapper' ) )
		.first();
	await canvas.click();

	// Type slash to open the block inserter autocomplete.
	await page.keyboard.press( 'Enter' ); // new paragraph
	await page.keyboard.type( '/aldus' );

	const suggestion = page
		.locator( '.components-autocomplete__result' )
		.filter( { hasText: /aldus/i } )
		.first();

	if (
		await suggestion.isVisible( { timeout: 5000 } ).catch( () => false )
	) {
		await suggestion.click();
	} else {
		// Fallback: insert via inserter button click.
		await page.keyboard.press( 'Escape' );
		const inserterBtn = page.getByRole( 'button', {
			name: /toggle block inserter/i,
		} );
		await inserterBtn.click();
		const searchInput = page.getByPlaceholder( 'Search' );
		await searchInput.fill( 'Aldus' );
		const option = page
			.getByRole( 'option', { name: /aldus/i } )
			.or( page.locator( '[aria-label*="Aldus — Block Compositor"]' ) )
			.first();
		await option.click();
	}

	// The Aldus block wrapper should be present.
	const aldusBlock = page.locator( '.wp-block-aldus-layout-generator' );
	await expect( aldusBlock ).toBeVisible( { timeout: 15000 } );
} );

test( 'build screen shows content-type buttons', async () => {
	const aldusBlock = page.locator( '.wp-block-aldus-layout-generator' );
	await expect( aldusBlock ).toBeVisible( { timeout: 5000 } );

	// The build screen renders add-item buttons for each content type.
	// We check for "Headline" as a reliable representative.
	const headlineBtn = aldusBlock
		.getByRole( 'button', { name: /headline/i } )
		.first();
	await expect( headlineBtn ).toBeVisible( { timeout: 10000 } );
} );

test( 'adding a headline item reveals the generate button', async () => {
	const aldusBlock = page.locator( '.wp-block-aldus-layout-generator' );
	await expect( aldusBlock ).toBeVisible( { timeout: 5000 } );

	const headlineBtn = aldusBlock
		.getByRole( 'button', { name: /headline/i } )
		.first();

	// If the button isn't visible the block may be in a post-add state already.
	if (
		await headlineBtn.isVisible( { timeout: 3000 } ).catch( () => false )
	) {
		await headlineBtn.click();
	}

	// After adding an item the "Make it happen" / generate button should appear.
	const generateBtn = aldusBlock
		.getByRole( 'button', { name: /make it happen|generate/i } )
		.first();
	await expect( generateBtn ).toBeVisible( { timeout: 10000 } );
} );
