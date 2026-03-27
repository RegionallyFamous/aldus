/**
 * E2E tests — Aldus pack preview flow.
 *
 * This is the most important new spec.  It exercises the only full UI path
 * that can run without a WebGPU/WebLLM model: the "Browse styles" tab, which
 * sends the pack's sample content to the PHP /assemble endpoint and renders
 * a grid of 16 layout cards — one per personality.
 *
 * Serial suite sharing a single editor page:
 *   1. Insert Aldus block
 *   2. Switch to "Browse styles" tab (auto-fires preview with default pack)
 *   3. Wait for all 16 layout cards to load from the real PHP backend
 *   4. Assert exactly 16 cards are visible
 *   5. Apply the first layout ("Use this one")
 *   6. Assert inner blocks appear inside the Aldus block wrapper
 *   7. Assert "Redesign" and "Detach from Aldus" buttons are present in
 *      the inspector sidebar (main page)
 *
 * WordPress 6.3+ renders the block editor content inside an iframe
 * (name="editor-canvas").  Block elements (incl. Aldus UI) are accessed via
 * frameLocator.  Inspector controls stay on the main page.
 *
 * Auth is provided by auth.setup.js.
 *
 * @see playwright.config.js
 * @see tests/e2e/auth.setup.js
 * @see tests/e2e/helpers.js
 */

'use strict';

const { test, expect } = require( '@playwright/test' );
const { getEditorFrame, attachConsoleMonitor } = require( './helpers' );

test.describe.configure( { mode: 'serial' } );

// The pack preview fires 16 concurrent /assemble requests.  Under full-suite
// load the server may be slower, so allow each test generous time.
test.setTimeout( 150000 );

/** @type {import('@playwright/test').Page} */
let page;

/** @type {import('@playwright/test').FrameLocator} */
let frame;

/** Console error monitor */
let monitor;

test.beforeAll( async ( { browser } ) => {
	page = await browser.newPage();
	monitor = attachConsoleMonitor( page );

	await page.goto( '/wp-admin/post-new.php' );

	// Wait for the editor shell on the main page.
	await page.waitForSelector( '.edit-post-layout', { timeout: 30000 } );

	// Dismiss Welcome Guide if it appears.
	const close = page.getByRole( 'button', { name: 'Close' } ).first();
	if ( await close.isVisible( { timeout: 3000 } ).catch( () => false ) ) {
		await close.click();
	}

	// Wait for the editor canvas iframe.
	frame = getEditorFrame( page );
	await frame.locator( '.editor-post-title' ).waitFor( { timeout: 30000 } );

	// Insert the Aldus block via the Block Inserter panel (more reliable than
	// the slash-command autocomplete for serial tests that use the same page).
	const inserterBtn = page
		.getByRole( 'button', { name: /block inserter/i } )
		.first();
	await inserterBtn.click();

	const searchInput = page.getByPlaceholder( /search/i ).first();
	await searchInput.fill( 'Aldus' );

	// Block items in the inserter panel have role="option".
	// Use a text filter to find the "Aldus" block specifically.
	const aldusOption = page
		.getByRole( 'option' )
		.filter( { hasText: /^aldus$/i } )
		.first();
	await aldusOption.waitFor( { timeout: 10000 } );
	await aldusOption.click();

	// Close the inserter.
	if (
		await inserterBtn.isVisible( { timeout: 1000 } ).catch( () => false )
	) {
		await inserterBtn.click();
	}

	// Wait for the Aldus block to appear in the editor canvas iframe.
	await frame
		.locator( '.wp-block-aldus-layout-generator' )
		.waitFor( { timeout: 20000 } );
} );

test.afterAll( async () => {
	await page.close();
} );

// ---------------------------------------------------------------------------

test( 'Aldus block is inserted and visible', async () => {
	await expect(
		frame.locator( '.wp-block-aldus-layout-generator' )
	).toBeVisible();
} );

test( 'switching to Browse Styles triggers the pack preview load', async () => {
	const aldusBlock = frame.locator( '.wp-block-aldus-layout-generator' );

	// The tab panel is inside the Aldus block (inside the iframe).
	const browseTab = aldusBlock.getByRole( 'tab', {
		name: /browse styles/i,
	} );
	await expect( browseTab ).toBeVisible( { timeout: 10000 } );
	await browseTab.click();

	// A loading state (.aldus-screen with a spinner/message) should appear.
	// We don't assert the loading screen directly because it may be brief;
	// we just wait for the results grid to appear.
	// The 16 REST calls may take up to 60 s in a cold Docker environment.
	await frame
		.locator( '.aldus-grid' )
		.waitFor( { timeout: 120000 } );
} );

test( 'results grid shows 16 layout cards', async () => {
	const cards = frame.locator( '.aldus-card' );
	// Allow 60 s for all 16 concurrent /assemble calls to complete,
	// especially when running after other tests under full-suite load.
	await expect( cards ).toHaveCount( 16, { timeout: 60000 } );
} );

test( 'all 16 layout cards have a "Use this one" button', async () => {
	const useButtons = frame.locator( '.aldus-card-use-btn' );
	// There must be at least as many use buttons as cards.
	const count = await useButtons.count();
	expect( count ).toBeGreaterThanOrEqual( 16 );
} );

test( 'applying first layout inserts inner blocks', async () => {
	const firstUseBtn = frame
		.locator( '.aldus-card-use-btn' )
		.first();
	await firstUseBtn.click();

	// After applying, the inner blocks wrapper should appear.
	// The Aldus block wrapper with inner content.
	await frame
		.locator( '.wp-block-aldus-layout-generator .aldus-wrapper-inner' )
		.waitFor( { timeout: 15000 } );

	// Inner blocks should be non-empty.
	const innerWrapper = frame.locator(
		'.wp-block-aldus-layout-generator .aldus-wrapper-inner'
	);
	await expect( innerWrapper ).toBeVisible();
} );

test( 'Redesign and Detach buttons are accessible after layout applied', async () => {
	// Ensure the Settings sidebar is open.
	const sidebar = page.locator( '.interface-complementary-area' );
	const isSidebarOpen = await sidebar
		.isVisible( { timeout: 1000 } )
		.catch( () => false );
	if ( ! isSidebarOpen ) {
		const settingsBtn = page.getByRole( 'button', {
			name: 'Settings',
			exact: true,
		} );
		if (
			await settingsBtn
				.isVisible( { timeout: 3000 } )
				.catch( () => false )
		) {
			await settingsBtn.click();
		}
	}

	// Ensure the Aldus block is selected.  Click the outer wrapper — the
	// breadcrumb should show "Post > Aldus".
	const aldusBlockOuter = frame.locator( '.wp-block-aldus-layout-generator' );
	await aldusBlockOuter.click( { force: true } );
	await page.waitForTimeout( 400 );

	// The inspector should now be visible.
	const inspector = page.locator( '.block-editor-block-inspector' );
	await expect( inspector ).toBeVisible( { timeout: 10000 } );

	// In WP 7.x, templateLock:"contentOnly" causes the inspector to show
	// a Content tab (default) listing the editable child blocks, followed
	// by any fills registered with group="content".  The InsertedScreen's
	// InspectorControls use group="content" so that the Redesign / Detach
	// buttons appear in the Content tab even when the Settings tab is
	// suppressed by the section-block inspector.

	// The Content tab is active by default — no tab switch needed.
	// Wait for the "Aldus Layout" panel heading to confirm the fills loaded.
	const aldusPanel = inspector.getByRole( 'heading', {
		name: /aldus layout/i,
	} );
	await aldusPanel.waitFor( { timeout: 8000 } );

	const redesignBtn = inspector
		.getByRole( 'button', { name: /^redesign$/i } )
		.first();
	await expect( redesignBtn ).toBeVisible( { timeout: 5000 } );

	const detachBtn = inspector
		.getByRole( 'button', { name: /detach from aldus/i } )
		.first();
	await expect( detachBtn ).toBeVisible( { timeout: 5000 } );
} );

test( 'no unexpected JS errors during the pack preview flow', async () => {
	const errors = monitor.getErrors();
	expect(
		errors,
		`Unexpected JS errors: ${ errors.join( '\n' ) }`
	).toHaveLength( 0 );
} );
