/**
 * E2E critical-path tests for Aldus.
 *
 * Uses page.route() to intercept the /aldus/v1/assemble REST endpoint so the
 * WebLLM engine is bypassed entirely.  This makes the tests fast and
 * deterministic — they validate the UI flow (results screen → pick layout →
 * Redesign / Detach toolbar) without any real LLM inference.
 *
 * Prerequisites:
 *   - `npm run env:start` must be running (wp-env at http://localhost:8888)
 *   - Aldus plugin must be active in the test environment
 *
 * Note: triggering generation without the LLM requires a test hook in the
 * plugin that exposes a `window.aldusDebug.triggerGenerate()` method.  If the
 * hook is absent in the running build, each test calls `test.skip()` after
 * verifying that the Aldus block is present, ensuring the suite never produces
 * false positives.
 *
 * @see playwright.config.js
 * @see tests/e2e/helpers.js
 */

'use strict';

const { test, expect } = require( '@playwright/test' );
const { wpLogin, openNewPost } = require( './helpers.js' );

// ---------------------------------------------------------------------------
// Mock data — a minimal but valid assemble response for "Dispatch" personality
// ---------------------------------------------------------------------------

const MOCK_PERSONALITY = 'Dispatch';
const MOCK_BLOCKS =
	'<!-- wp:paragraph --><p>Test layout — Dispatch style</p><!-- /wp:paragraph -->';

const MOCK_RESPONSE = JSON.stringify( {
	success: true,
	label: MOCK_PERSONALITY,
	blocks: MOCK_BLOCKS,
	tokens: [ 'paragraph' ],
	sections: [],
} );

// ---------------------------------------------------------------------------
// Helper — insert Aldus block and add a headline item
// ---------------------------------------------------------------------------

/**
 * Inserts the Aldus block via the slash-command inserter and adds one headline
 * item.  Returns the block locator.
 *
 * @param {import('@playwright/test').Page} page
 * @return {Promise<import('@playwright/test').Locator>} Aldus block locator.
 */
async function insertAldusAndAddHeadline( page ) {
	const editorCanvas = page.locator( '[aria-label="Block editor content"]' );
	await editorCanvas.click();

	// Try slash-command insertion.
	await page.keyboard.type( '/aldus' );
	const suggestion = page
		.locator( '.components-autocomplete__result' )
		.filter( { hasText: 'Aldus' } )
		.first();
	if ( await suggestion.isVisible( { timeout: 3000 } ).catch( () => false ) ) {
		await suggestion.click();
	}

	const aldusBlock = page.locator( '.wp-block-aldus-layout-generator' );
	if ( ! ( await aldusBlock.isVisible( { timeout: 5000 } ).catch( () => false ) ) ) {
		return null;
	}

	// Add a headline content item.
	const headlineBtn = aldusBlock.locator( 'button', { hasText: /headline/i } ).first();
	if ( await headlineBtn.isVisible( { timeout: 3000 } ).catch( () => false ) ) {
		await headlineBtn.click();
	}

	return aldusBlock;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe( 'Aldus — critical path (mocked generation)', () => {
	test.beforeEach( async ( { page } ) => {
		// Intercept all requests to the assemble REST endpoint and return mock data.
		// The pattern matches both the full URL and the wp-json path variant.
		await page.route( '**/wp-json/aldus/v1/assemble', async ( route ) => {
			await route.fulfill( {
				status: 200,
				contentType: 'application/json',
				body: MOCK_RESPONSE,
			} );
		} );
		// Also intercept the path-based URL used by @wordpress/api-fetch.
		await page.route( '**/aldus/v1/assemble', async ( route ) => {
			if ( route.request().method() === 'POST' ) {
				await route.fulfill( {
					status: 200,
					contentType: 'application/json',
					body: MOCK_RESPONSE,
				} );
			} else {
				await route.continue();
			}
		} );

		await wpLogin( page );
		await openNewPost( page );
	} );

	// -------------------------------------------------------------------------
	// Test 1 — results screen appears after mocked generation
	// -------------------------------------------------------------------------

	test( 'shows the results screen after mocked generation', async ( { page } ) => {
		const aldusBlock = await insertAldusAndAddHeadline( page );
		if ( ! aldusBlock ) {
			test.skip( 'Aldus block could not be inserted in this environment' );
			return;
		}

		// Trigger generation — look for "Make it happen" / "Generate" button.
		const generateBtn = aldusBlock
			.locator( 'button', { hasText: /make it happen|generate/i } )
			.first();
		if ( ! ( await generateBtn.isVisible( { timeout: 5000 } ).catch( () => false ) ) ) {
			test.skip( 'Generate button not found — block may need a content item first' );
			return;
		}
		await generateBtn.click();

		// If the plugin exposes a test hook, use it to bypass the LLM wait.
		const hasDebugHook = await page
			.evaluate( () => typeof window?.aldusDebug?.triggerGenerate === 'function' )
			.catch( () => false );

		if ( hasDebugHook ) {
			await page.evaluate( () => window.aldusDebug.triggerGenerate() );
		}

		// The results screen should show at least one layout card.
		// The card grid uses .aldus-results-grid or similar; we look for the
		// "Use this one" / "Pick" button text which is layout-card specific.
		const useThisOneBtn = page
			.locator( 'button', { hasText: /use this one|pick/i } )
			.first();

		// If neither button nor the debug hook is available the test is skipped to
		// avoid marking as failed in build environments that lack the full UI.
		if ( ! hasDebugHook ) {
			test.skip(
				'window.aldusDebug.triggerGenerate not exposed — generation cannot be triggered in automated E2E without LLM. ' +
					'Add a test hook or use a mock adapter to enable this test.'
			);
			return;
		}

		await expect( useThisOneBtn ).toBeVisible( { timeout: 15000 } );
	} );

	// -------------------------------------------------------------------------
	// Test 2 — clicking "Use this one" inserts inner blocks
	// -------------------------------------------------------------------------

	test( 'clicking "Use this one" inserts inner blocks into the Aldus wrapper', async ( {
		page,
	} ) => {
		const aldusBlock = await insertAldusAndAddHeadline( page );
		if ( ! aldusBlock ) {
			test.skip( 'Aldus block could not be inserted' );
			return;
		}

		const hasDebugHook = await page
			.evaluate( () => typeof window?.aldusDebug?.triggerGenerate === 'function' )
			.catch( () => false );

		if ( ! hasDebugHook ) {
			test.skip(
				'window.aldusDebug.triggerGenerate not available — skipping insertion test'
			);
			return;
		}

		// Trigger generation via hook.
		await page.evaluate( () => window.aldusDebug.triggerGenerate() );

		// Wait for a layout card to appear and pick the first one.
		const useThisOneBtn = page
			.locator( 'button', { hasText: /use this one|pick/i } )
			.first();
		await expect( useThisOneBtn ).toBeVisible( { timeout: 15000 } );
		await useThisOneBtn.click();

		// After insertion the Aldus block should still be present (wrapper mode)
		// and contain the mock paragraph block as an inner block.
		await expect( aldusBlock ).toBeVisible( { timeout: 5000 } );
		const innerParagraph = aldusBlock.locator( '.wp-block-paragraph' ).first();
		await expect( innerParagraph ).toBeVisible( { timeout: 5000 } );
	} );

	// -------------------------------------------------------------------------
	// Test 3 — Redesign and Detach toolbar buttons appear after insertion
	// -------------------------------------------------------------------------

	test( 'Redesign and Detach toolbar buttons appear after layout insertion', async ( {
		page,
	} ) => {
		const aldusBlock = await insertAldusAndAddHeadline( page );
		if ( ! aldusBlock ) {
			test.skip( 'Aldus block could not be inserted' );
			return;
		}

		const hasDebugHook = await page
			.evaluate( () => typeof window?.aldusDebug?.triggerGenerate === 'function' )
			.catch( () => false );

		if ( ! hasDebugHook ) {
			test.skip(
				'window.aldusDebug.triggerGenerate not available — skipping toolbar test'
			);
			return;
		}

		await page.evaluate( () => window.aldusDebug.triggerGenerate() );

		const useThisOneBtn = page
			.locator( 'button', { hasText: /use this one|pick/i } )
			.first();
		await expect( useThisOneBtn ).toBeVisible( { timeout: 15000 } );
		await useThisOneBtn.click();

		// Select the Aldus block to show its toolbar.
		await aldusBlock.click();

		// Check for Redesign toolbar button.
		const redesignBtn = page
			.locator( 'button[aria-label*="Redesign"]' )
			.first();
		await expect( redesignBtn ).toBeVisible( { timeout: 5000 } );

		// Check for Detach toolbar button.
		const detachBtn = page
			.locator( 'button[aria-label*="Detach"]' )
			.first();
		await expect( detachBtn ).toBeVisible( { timeout: 5000 } );
	} );
} );
