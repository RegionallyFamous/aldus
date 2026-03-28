/**
 * E2E — strict browser console monitoring (no Block validation allowlist).
 *
 * Inserts only the Aldus block on a fresh post and waits; any console.error
 * or pageerror that is not in the base safe list fails the test. The shared
 * helper defaults to strict block validation (same as pack-preview).
 *
 * @see tests/e2e/helpers.js — attachConsoleMonitor defaults to strict validation
 * @see tests/e2e/pack-preview.spec.js
 */

'use strict';

const { test, expect } = require( '@playwright/test' );
const {
	attachConsoleMonitor,
	openNewPost,
	newLoggedInPage,
} = require( './helpers' );

test( 'no unexpected console errors after inserting Aldus (strict block validation)', async ( {
	browser,
} ) => {
	const { context, page } = await newLoggedInPage( browser );
	const monitor = attachConsoleMonitor( page );

	try {
		const frame = await openNewPost( page );

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

		if (
			await inserterBtn
				.isVisible( { timeout: 1000 } )
				.catch( () => false )
		) {
			await inserterBtn.click();
		}

		await frame
			.locator( '.wp-block-aldus-layout-generator' )
			.waitFor( { timeout: 20000 } );

		// Let async editor hooks settle (SlotFill, block registration).
		await page.waitForTimeout( 4000 );

		const errors = monitor.getErrors();
		expect(
			errors,
			`Unexpected console/page errors (strict mode): ${ errors.join(
				'\n'
			) }`
		).toHaveLength( 0 );
	} finally {
		await context.close();
	}
} );
