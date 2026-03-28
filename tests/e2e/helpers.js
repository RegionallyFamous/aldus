/**
 * Shared helper utilities for Aldus Playwright E2E tests.
 *
 * Login is handled once by auth.setup.js (storageState); individual tests
 * do not need to call wpLogin().
 *
 * WordPress 6.3+ renders the block editor canvas inside an iframe
 * (name="editor-canvas").  Use `getEditorFrame()` to get a frameLocator that
 * reaches elements inside the canvas (blocks, toolbar, title, etc.).
 * Inspector controls and the top toolbar remain on the main page.
 */

'use strict';

const path = require( 'path' );

/** Session from auth.setup.js — same path as playwright.config.js */
const E2E_AUTH_FILE = path.join( __dirname, '.auth.json' );

/**
 * Browser context using the saved login session (project storageState).
 * Use this whenever tests call `browser.newPage()` in beforeAll; the default
 * browser context does not inherit Playwright project `storageState`.
 *
 * @param {import('@playwright/test').Browser} browser
 */
async function newLoggedInContext( browser ) {
	const baseURL = process.env.WP_BASE_URL ?? 'http://localhost:8888';
	return browser.newContext( {
		storageState: E2E_AUTH_FILE,
		baseURL,
	} );
}

/**
 * @param {import('@playwright/test').Browser} browser
 * @returns {Promise<{ context: import('@playwright/test').BrowserContext, page: import('@playwright/test').Page }>}
 */
async function newLoggedInPage( browser ) {
	const context = await newLoggedInContext( browser );
	const page = await context.newPage();
	return { context, page };
}

/**
 * Returns a Playwright FrameLocator scoped to the editor canvas iframe.
 *
 * @param {import('@playwright/test').Page} page Playwright Page instance.
 * @return {import('@playwright/test').FrameLocator}
 */
function getEditorFrame( page ) {
	return page.frameLocator( 'iframe[name="editor-canvas"]' );
}

/**
 * Waits until the post block editor chrome is visible.
 *
 * WordPress 6.x–6.9+ Gutenberg has used different roots: `.edit-post-layout`,
 * `.editor-editor-interface`, and the interface skeleton body. Match any so
 * E2E stays stable across core upgrades.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=45000]
 */
async function waitForPostEditorShell( page, timeout = 45000 ) {
	await page
		.locator(
			'.edit-post-layout, .editor-editor-interface, .interface-interface-skeleton__body'
		)
		.first()
		.waitFor( { state: 'visible', timeout } );
}

/**
 * Navigates to a new post, waits for the editor canvas to be ready inside its
 * iframe, and dismisses the Welcome Guide modal if it appears.
 *
 * @param {import('@playwright/test').Page} page Playwright Page instance.
 * @return {Promise<import('@playwright/test').FrameLocator>} The editor FrameLocator.
 */
async function openNewPost( page ) {
	await page.goto( '/wp-admin/post-new.php' );

	await waitForPostEditorShell( page );

	// Dismiss Welcome Guide if it appears (renders in the main page).
	const welcomeClose = page.getByRole( 'button', { name: 'Close' } ).first();
	if (
		await welcomeClose.isVisible( { timeout: 3000 } ).catch( () => false )
	) {
		await welcomeClose.click();
	}

	// Wait for the editor canvas content inside the iframe to be ready.
	const frame = getEditorFrame( page );
	await frame.locator( '.editor-post-title' ).waitFor( { timeout: 30000 } );

	return frame;
}

/**
 * Inserts the Aldus block via the block inserter (main page UI).
 *
 * Preconditions: `page` is on the post editor with the canvas iframe ready
 * (e.g. after `openNewPost()`).
 *
 * @param {import('@playwright/test').Page} page
 * @return {Promise<void>}
 */
async function insertAldusBlock( page ) {
	const inserterBtn = page
		.getByRole( 'button', { name: /block inserter/i } )
		.first();
	await inserterBtn.click();

	const searchInput = page.getByPlaceholder( /search/i ).first();
	await searchInput.fill( 'Aldus' );

	const aldusOption = page
		.getByRole( 'option' )
		.filter( { hasText: /^aldus$/i } )
		.first();
	await aldusOption.waitFor( { timeout: 10000 } );
	await aldusOption.click();

	if ( await inserterBtn.isVisible( { timeout: 1000 } ).catch( () => false ) ) {
		await inserterBtn.click();
	}

	const frame = getEditorFrame( page );
	await frame
		.locator( '.wp-block-aldus-layout-generator' )
		.waitFor( { timeout: 20000 } );
}

/**
 * Attaches console-error and page-error monitors to the given page so tests
 * can assert that no unexpected errors occurred.
 *
 * Known-safe messages (e.g. WebLLM GPUBuffer AbortError) are filtered out.
 *
 * @param {import('@playwright/test').Page} page Playwright Page instance.
 * @param {Object}   [options]
 * @param {boolean}  [options.allowBlockValidation=true] When false, console
 *                 messages matching Block validation / block validation failed
 *                 are treated as errors (stricter — use in specs that should not
 *                 trigger save/parse mismatches).
 * @return {{ getErrors: () => string[] }} Call `getErrors()` to retrieve captured errors.
 */
function attachConsoleMonitor( page, options = {} ) {
	const allowBlockValidation = options.allowBlockValidation !== false;

	/** @type {string[]} */
	const errors = [];

	const SAFE_PATTERNS = [
		/GPUBuffer/i,
		/mapAsync/i,
		// Gutenberg dev-mode warnings that are not plugin bugs.
		/This is usually an indicator/i,
		/Interactivity API/i,
		// React 18 + WordPress SlotFill compatibility: registering a Fill
		// (InspectorControls) can trigger a SlotFillProvider state update
		// while a parent component is still rendering.  This is a known
		// limitation of the WP slot fill system and not an Aldus bug.
		/Cannot update a component.*while rendering a different component/i,
		/setstate-in-render/i,
	];

	if ( allowBlockValidation ) {
		// Block validation mismatches are expected after PHP assemble output
		// differs from client save(); WordPress recovers — see pack-preview spec.
		SAFE_PATTERNS.push(
			/Block validation/i,
			/block validation failed/i
		);
	}

	const isSafe = ( msg ) =>
		SAFE_PATTERNS.some( ( re ) => re.test( msg ) );

	page.on( 'pageerror', ( err ) => {
		if ( ! isSafe( err.message ) ) {
			errors.push( `[pageerror] ${ err.message }` );
		}
	} );

	page.on( 'console', ( msg ) => {
		if ( msg.type() === 'error' && ! isSafe( msg.text() ) ) {
			errors.push( `[console.error] ${ msg.text() }` );
		}
	} );

	return {
		getErrors: () => [ ...errors ],
	};
}

module.exports = {
	getEditorFrame,
	waitForPostEditorShell,
	newLoggedInContext,
	newLoggedInPage,
	openNewPost,
	insertAldusBlock,
	attachConsoleMonitor,
};
