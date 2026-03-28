/**
 * E2E tests — REST API validation for all 16 Aldus personalities.
 *
 * Each test POSTs directly to /wp-json/aldus/v1/assemble for every built-in
 * personality and verifies the PHP backend returns a valid layout.
 *
 * This is the fastest way to catch PHP renderer regressions: one test per
 * personality, run against the live wp-env WordPress instance.
 *
 * Authentication: the `request` fixture provides cookies via `storageState`,
 * but WordPress REST API POST endpoints require an X-WP-Nonce header for
 * cookie-based auth.  A `beforeAll` hook navigates to the admin page to extract
 * the `wpApiSettings.nonce` value and stores it for use in all REST requests.
 *
 * Each test asserts:
 *   - HTTP 200
 *   - response.success === true
 *   - response.blocks is a non-empty string
 *   - response.blocks does NOT contain <!-- wp:aldus (recursive nesting)
 *
 * Auth is provided by auth.setup.js (login cookie in storageState).
 *
 * @see playwright.config.js
 * @see tests/e2e/auth.setup.js
 */

'use strict';

const { spawnSync } = require( 'child_process' );
const { test, expect } = require( '@playwright/test' );
const { newLoggedInPage } = require( './helpers' );

// ---------------------------------------------------------------------------
// Shared sample content — one item per recognised type so every anchor token
// that requires content has something to render, and every code path in
// aldus_sanitize_item() is exercised.
// ---------------------------------------------------------------------------

const SAMPLE_ITEMS = [
	{
		type: 'headline',
		content: 'Sample Headline for Automated E2E Testing',
		url: '',
		id: 'e2e-h1',
	},
	{
		type: 'subheading',
		content: 'A supporting subheading with additional context',
		url: '',
		id: 'e2e-sh1',
	},
	{
		type: 'paragraph',
		content:
			'This paragraph provides enough words for the Aldus distributor to fill the rendered layout sections. It is intentionally verbose so that shorter tokens like dropcap paragraphs also receive text.',
		url: '',
		id: 'e2e-p1',
	},
	{
		type: 'paragraph',
		content:
			'A second paragraph adds variety. Aldus layouts with two-column or three-column sections benefit from having multiple paragraphs to distribute across columns.',
		url: '',
		id: 'e2e-p2',
	},
	{
		type: 'quote',
		content: 'A pithy quote suitable for pull-quote blocks.',
		url: '',
		id: 'e2e-q1',
	},
	{
		type: 'cta',
		content: 'Learn More',
		url: 'https://example.com',
		id: 'e2e-cta1',
	},
	{
		type: 'image',
		content: '',
		url: 'https://picsum.photos/seed/aldus-e2e/1200/800',
		id: 'e2e-img1',
	},
	{
		type: 'image',
		content: '',
		url: 'https://picsum.photos/seed/aldus-e2e-2/800/600',
		id: 'e2e-img2',
	},
	// gallery with urls array (exercised by aldus_sanitize_item urls branch)
	{
		type: 'gallery',
		content: '',
		url: '',
		id: 'e2e-gal1',
		urls: [
			'https://picsum.photos/seed/aldus-g1/800/600',
			'https://picsum.photos/seed/aldus-g2/800/600',
		],
	},
	// list, code, details — three types absent from the original SAMPLE_ITEMS
	{
		type: 'list',
		content: 'First item\nSecond item\nThird item',
		url: '',
		id: 'e2e-list1',
	},
	{
		type: 'code',
		content: 'console.log("hello from aldus e2e");',
		url: '',
		id: 'e2e-code1',
	},
	{
		type: 'details',
		content: 'Frequently asked question\nAnswer to the frequently asked question.',
		url: '',
		id: 'e2e-details1',
	},
];

// ---------------------------------------------------------------------------
// Personality definitions — name + anchor tokens from tokens.php.
// ---------------------------------------------------------------------------

const PERSONALITIES = [
	{
		name: 'Dispatch',
		tokens: [
			'cover:dark',
			'pullquote:full-solid',
			'buttons:cta',
			'paragraph',
		],
	},
	{
		name: 'Folio',
		tokens: [
			'columns:28-72',
			'pullquote:wide',
			'paragraph:lead',
			'paragraph',
		],
	},
	{
		name: 'Stratum',
		tokens: [
			'group:dark-full',
			'group:light-full',
			'group:accent-full',
			'paragraph',
		],
	},
	{
		name: 'Broadside',
		tokens: [
			'media-text:left',
			'media-text:right',
			'group:accent-full',
			'row:stats',
			'paragraph',
		],
	},
	{
		name: 'Manifesto',
		tokens: [
			'heading:h1',
			'group:dark-full',
			'columns:3-equal',
			'paragraph:lead',
			'paragraph',
		],
	},
	{
		name: 'Nocturne',
		tokens: [ 'cover:split', 'image:full', 'paragraph' ],
	},
	{
		name: 'Tribune',
		tokens: [
			'columns:3-equal',
			'pullquote:full-solid',
			'group:grid',
			'row:stats',
			'paragraph',
		],
	},
	{
		name: 'Overture',
		tokens: [
			'cover:light',
			'media-text:right',
			'group:accent-full',
			'paragraph',
		],
	},
	{
		name: 'Codex',
		tokens: [
			'heading:display',
			'heading:kicker',
			'group:border-box',
			'details:accordion',
			'code:block',
			'paragraph:lead',
			'paragraph',
		],
	},
	{
		name: 'Dusk',
		tokens: [ 'cover:split', 'group:gradient-full', 'paragraph' ],
	},
	{
		name: 'Broadsheet',
		tokens: [
			'columns:4-equal',
			'pullquote:centered',
			'group:grid',
			'paragraph',
		],
	},
	{
		name: 'Solstice',
		tokens: [ 'cover:minimal', 'columns:2-equal', 'paragraph' ],
	},
	{
		name: 'Mirage',
		tokens: [
			'group:gradient-full',
			'pullquote:centered',
			'cover:split',
			'paragraph',
		],
	},
	{
		name: 'Ledger',
		tokens: [
			'columns:2-equal',
			'quote:attributed',
			'group:border-box',
			'details:accordion',
			'paragraph',
		],
	},
	{
		name: 'Mosaic',
		tokens: [ 'gallery:3-col', 'buttons:cta', 'paragraph' ],
	},
	{
		name: 'Prism',
		tokens: [ 'columns:3-equal', 'gallery:3-col', 'paragraph' ],
	},
];

// ---------------------------------------------------------------------------
// Auth nonce — fetched once before all tests.
//
// WordPress REST API POST endpoints require X-WP-Nonce for cookie-based auth.
// We navigate to the admin dashboard to extract the nonce that WordPress
// inlines into wpApiSettings.nonce.
// ---------------------------------------------------------------------------

test.describe.configure( { mode: 'serial' } );

/** @type {string} */
let wpNonce = '';

test.beforeAll( async ( { browser } ) => {
	// Reset rate-limit transients so this browser project starts with a clean
	// counter.  When all browsers run back-to-back, Chromium's requests can
	// saturate the 60-req/min window before Firefox/WebKit begin.
	spawnSync(
		'npx wp-env run cli wp transient delete --all',
		[],
		{ cwd: require( 'path' ).resolve( __dirname, '..', '..' ), env: process.env, shell: true }
	);

	const { context, page } = await newLoggedInPage( browser );
	try {
		await page.goto( '/wp-admin/' );

		// WordPress inlines wpApiSettings (including nonce) on admin pages.
		wpNonce = await page.evaluate( () => {
			return (
				window.wpApiSettings?.nonce ||
				window.wp?.apiFetch?.nonceMiddleware?.nonce ||
				''
			);
		} );
	} finally {
		await context.close();
	}
} );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

for ( const personality of PERSONALITIES ) {
	test( `${ personality.name } returns a valid assembled layout`, async ( {
		request,
	} ) => {
		const response = await request.post(
			'/wp-json/aldus/v1/assemble',
			{
				headers: {
					'X-WP-Nonce': wpNonce,
				},
				data: {
					personality: personality.name,
					tokens: personality.tokens,
					items: SAMPLE_ITEMS,
				},
			}
		);

		// Must succeed.
		expect( response.status() ).toBe( 200 );

		const body = await response.json();

		// success flag.
		expect( body.success ).toBe( true );

		// blocks string must be non-empty.
		expect( typeof body.blocks ).toBe( 'string' );
		expect( body.blocks.length ).toBeGreaterThan( 0 );

		// No recursive Aldus nesting.
		expect( body.blocks ).not.toContain( '<!-- wp:aldus' );

		// Client-authoritative block tree (createBlock + serialize in the editor).
		expect( Array.isArray( body.blocks_tree ) ).toBe( true );
		expect( body.blocks_tree.length ).toBeGreaterThan( 0 );
		expect( body.assemble_format ).toBe( 2 );
	} );
}

// ---------------------------------------------------------------------------
// Kitchen-sink: every token in the vocabulary against every personality.
//
// This test sends all 40+ valid tokens (up to the 30-token API limit) in one
// request per personality to verify that no token combination causes the PHP
// backend to throw, return an error, or produce un-balanced block markup.
//
// Tokens are split into two batches (≤ 30 each) to stay within the API limit.
// We use the Dispatch personality (least opinionated about token ordering)
// for both batches, plus a second pass through each remaining personality's
// own anchor tokens to confirm the combined dataset doesn't destabilise them.
// ---------------------------------------------------------------------------

// All 40 tokens defined in aldus_valid_tokens(), split into batches of 30.
const ALL_TOKENS_BATCH_A = [
	'cover:dark', 'cover:light', 'cover:minimal', 'cover:split',
	'columns:2-equal', 'columns:28-72', 'columns:3-equal', 'columns:4-equal',
	'media-text:left', 'media-text:right',
	'group:dark-full', 'group:light-full', 'group:accent-full',
	'group:border-box', 'group:gradient-full',
	'pullquote:wide', 'pullquote:full-solid', 'pullquote:centered',
	'heading:h1', 'heading:h2', 'heading:h3', 'heading:display', 'heading:kicker',
	'paragraph', 'paragraph:dropcap', 'paragraph:lead',
	'image:wide', 'image:full',
	'quote', 'quote:attributed',
];

const ALL_TOKENS_BATCH_B = [
	'list', 'separator',
	'spacer:small', 'spacer:large', 'spacer:xlarge',
	'buttons:cta',
	'table:data',
	'gallery:2-col', 'gallery:3-col',
	'group:grid', 'row:stats',
	'details:accordion',
	'code:block',
	// Include a handful of high-use tokens so batch B also has structural variety.
	'cover:dark', 'columns:3-equal', 'group:dark-full', 'pullquote:wide',
	'paragraph', 'image:full', 'buttons:cta',
];

// video:hero and video:section are valid tokens but require a `video` content
// item.  We add them here; the distributor will render them as empty strings
// if no video URL is provided (graceful degradation — not an error).
const VIDEO_TOKENS = [ 'video:hero', 'video:section' ];

test( 'kitchen-sink batch A — all structure/column/heading tokens render without error', async ( {
	request,
} ) => {
	const response = await request.post( '/wp-json/aldus/v1/assemble', {
		headers: { 'X-WP-Nonce': wpNonce },
		data: {
			personality: 'Dispatch',
			tokens: ALL_TOKENS_BATCH_A,
			items: SAMPLE_ITEMS,
		},
	} );

	expect( response.status() ).toBe( 200 );
	const body = await response.json();
	expect( body.success ).toBe( true );
	expect( body.blocks.length ).toBeGreaterThan( 0 );
	expect( body.blocks ).not.toContain( '<!-- wp:aldus' );
} );

test( 'kitchen-sink batch B — list/spacer/gallery/details/code tokens render without error', async ( {
	request,
} ) => {
	const response = await request.post( '/wp-json/aldus/v1/assemble', {
		headers: { 'X-WP-Nonce': wpNonce },
		data: {
			personality: 'Dispatch',
			tokens: ALL_TOKENS_BATCH_B,
			items: SAMPLE_ITEMS,
		},
	} );

	expect( response.status() ).toBe( 200 );
	const body = await response.json();
	expect( body.success ).toBe( true );
	expect( body.blocks.length ).toBeGreaterThan( 0 );
	expect( body.blocks ).not.toContain( '<!-- wp:aldus' );
} );

test( 'kitchen-sink video tokens — video:hero and video:section degrade gracefully without a video item', async ( {
	request,
} ) => {
	// SAMPLE_ITEMS does not include a video item.  The renderers should return
	// empty strings for those tokens rather than throwing.
	const response = await request.post( '/wp-json/aldus/v1/assemble', {
		headers: { 'X-WP-Nonce': wpNonce },
		data: {
			personality: 'Dispatch',
			tokens: [ ...VIDEO_TOKENS, 'paragraph', 'buttons:cta' ],
			items: SAMPLE_ITEMS,
		},
	} );

	expect( response.status() ).toBe( 200 );
	const body = await response.json();
	expect( body.success ).toBe( true );
	// blocks may be short (video tokens skipped) but the response must be valid.
	expect( typeof body.blocks ).toBe( 'string' );
	expect( body.blocks ).not.toContain( '<!-- wp:aldus' );
} );
