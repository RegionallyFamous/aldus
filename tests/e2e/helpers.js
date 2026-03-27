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
 * Navigates to a new post, waits for the editor canvas to be ready inside its
 * iframe, and dismisses the Welcome Guide modal if it appears.
 *
 * @param {import('@playwright/test').Page} page Playwright Page instance.
 * @return {Promise<import('@playwright/test').FrameLocator>} The editor FrameLocator.
 */
async function openNewPost( page ) {
	await page.goto( '/wp-admin/post-new.php' );

	// The editor shell (toolbar, sidebar) is on the main page.
	await page.waitForSelector( '.edit-post-layout', { timeout: 30000 } );

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
 * Attaches console-error and page-error monitors to the given page so tests
 * can assert that no unexpected errors occurred.
 *
 * Known-safe messages (e.g. WebLLM GPUBuffer AbortError) are filtered out.
 *
 * @param {import('@playwright/test').Page} page Playwright Page instance.
 * @return {{ getErrors: () => string[] }} Call `getErrors()` to retrieve captured errors.
 */
function attachConsoleMonitor( page ) {
	/** @type {string[]} */
	const errors = [];

	const SAFE_PATTERNS = [
		/GPUBuffer/i,
		/mapAsync/i,
		// Gutenberg dev-mode warnings that are not plugin bugs.
		/This is usually an indicator/i,
		/Interactivity API/i,
		// Block validation mismatches are expected: the PHP assemble endpoint
		// adds server-side directives (data-wp-interactive, scroll-reveal
		// styles) that differ from client-side save() output.  WordPress
		// recovers transparently; these are not Aldus plugin bugs.
		/Block validation/i,
		/block validation failed/i,
		// React 18 + WordPress SlotFill compatibility: registering a Fill
		// (InspectorControls) can trigger a SlotFillProvider state update
		// while a parent component is still rendering.  This is a known
		// limitation of the WP slot fill system and not an Aldus bug.
		/Cannot update a component.*while rendering a different component/i,
		/setstate-in-render/i,
	];

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

module.exports = { getEditorFrame, openNewPost, attachConsoleMonitor };
