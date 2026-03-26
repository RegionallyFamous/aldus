/**
 * Shared helper utilities for Aldus Playwright E2E tests.
 *
 * Login is handled once by global-setup.js (storageState); individual tests
 * do not need to call wpLogin().
 */

'use strict';

/**
 * Navigates to a new post and dismisses the Welcome Guide modal.
 *
 * @param {import('@playwright/test').Page} page Playwright Page instance.
 * @return {Promise<void>}
 */
async function openNewPost( page ) {
	await page.goto( '/wp-admin/post-new.php' );
	await page.waitForSelector( '.editor-post-title', { timeout: 30000 } );

	const welcomeClose = page.getByRole( 'button', { name: 'Close' } ).first();
	if (
		await welcomeClose.isVisible( { timeout: 3000 } ).catch( () => false )
	) {
		await welcomeClose.click();
	}
}

module.exports = { openNewPost };
