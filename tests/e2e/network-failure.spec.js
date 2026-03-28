/**
 * E2E — network failure while calling /aldus/v1/assemble (pack preview path).
 *
 * Aborts all assemble requests so batchAssemble yields no results; the editor
 * should leave the loading state and show ErrorScreen (no_layouts when every
 * personality fails — see runPreview in edit.js).
 *
 * @see tests/e2e/pack-preview.spec.js
 * @see playwright.config.js
 */

'use strict';

const { test, expect } = require( '@playwright/test' );
const {
	getEditorFrame,
	waitForPostEditorShell,
	newLoggedInPage,
} = require( './helpers' );

test.describe( 'Aldus assemble network failure', () => {
	test( 'pack preview shows error UI when every /assemble request is aborted', async ( {
		browser,
	} ) => {
		const { context, page } = await newLoggedInPage( browser );

		await page.route( '**/*aldus/v1/assemble*', ( route ) =>
			route.abort( 'failed' )
		);

		try {
			await page.goto( '/wp-admin/post-new.php' );
			await waitForPostEditorShell( page );

			const welcomeClose = page
				.getByRole( 'button', { name: 'Close' } )
				.first();
			if (
				await welcomeClose
					.isVisible( { timeout: 3000 } )
					.catch( () => false )
			) {
				await welcomeClose.click();
			}

			const frame = getEditorFrame( page );
			await frame
				.locator( '.editor-post-title' )
				.waitFor( { timeout: 30000 } );

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

			await inserterBtn
				.isVisible( { timeout: 1000 } )
				.catch( () => false );
			if ( await inserterBtn.isVisible().catch( () => false ) ) {
				await inserterBtn.click();
			}

			await frame
				.locator( '.wp-block-aldus-layout-generator' )
				.waitFor( { timeout: 20000 } );

			const aldusBlock = frame.locator(
				'.wp-block-aldus-layout-generator'
			);
			const browseTab = aldusBlock.getByRole( 'tab', {
				name: /browse styles/i,
			} );
			await expect( browseTab ).toBeVisible( { timeout: 10000 } );
			await browseTab.click();

			// Error screen: no_layouts when assembled.length === 0 after all REST failures.
			const errorRoot = frame.locator( '.aldus-error' );
			await expect( errorRoot ).toBeVisible( { timeout: 120000 } );

			await expect(
				errorRoot.locator( '.aldus-error-headline' )
			).toContainText( /not enough to work with/i );

			await expect(
				frame.getByRole( 'button', { name: /edit my content/i } )
			).toBeVisible();
		} finally {
			await page.unroute( '**/*aldus/v1/assemble*' );
			await context.close();
		}
	} );
} );
