/**
 * E2E tests — full-page content through all 16 Aldus personalities.
 *
 * These tests are the complement to assemble-personalities.spec.js:
 *   - That file sends minimal sample data and checks basic HTTP/success.
 *   - This file sends a realistic, article-length payload and verifies:
 *       1. HTTP 200 + success flag.
 *       2. Block comments are balanced (every opener has a closer).
 *       3. Each personality's required anchor tokens produce the expected
 *          WordPress block type in the serialized output.
 *       4. The submitted headline text actually appears somewhere in the output.
 *
 * Item types covered: headline, subheading, paragraph (×7), quote (×2),
 * image (×3), list, code, details, gallery (with urls), cta (×2).
 * This is every type accepted by aldus_sanitize_item().
 *
 * Auth: X-WP-Nonce is fetched once in beforeAll from wpApiSettings.
 *
 * @see tests/e2e/assemble-personalities.spec.js  (minimal-data baseline tests)
 * @see playwright.config.js
 */

'use strict';

const { test, expect } = require( '@playwright/test' );

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Counts all `<!-- wp:` opening block comment tags in a serialised block
 * string (excludes `<!-- /wp:` closing tags).
 *
 * @param {string} blocks
 * @returns {number}
 */
function countBlockOpeners( blocks ) {
	return ( blocks.match( /<!-- wp:[^/]/g ) || [] ).length;
}

/**
 * Counts all `<!-- /wp:` closing block comment tags.
 *
 * @param {string} blocks
 * @returns {number}
 */
function countBlockClosers( blocks ) {
	return ( blocks.match( /<!-- \/wp:/g ) || [] ).length;
}

// ---------------------------------------------------------------------------
// Full-page article content — covers EVERY item type the backend accepts.
//
// Content is a realistic technology-editorial article so headings, pull
// quotes, code snippets and CTAs all make narrative sense.  Paragraphs are
// long enough that distributors with tight minimum-word requirements are
// satisfied.
// ---------------------------------------------------------------------------

const HEADLINE = 'The Future of Distributed Systems in an AI-First World';

// Minimum serialised block length for a full-page render.  A genuine
// full-page layout should be well over 1 000 chars; this guards against
// regressions where the distributor silently empties.
const MIN_FULL_PAGE_LENGTH = 1000;

/** @type {Array<Record<string,unknown>>} */
const FULL_PAGE_ITEMS = [
	{
		type: 'headline',
		content: HEADLINE,
		url: '',
		id: 'fp-h1',
	},
	{
		type: 'subheading',
		content: 'How modern infrastructure is adapting to meet unprecedented demands',
		url: '',
		id: 'fp-sh1',
	},
	{
		type: 'paragraph',
		content:
			'Over the past decade, distributed computing has undergone a profound transformation. ' +
			'What began as a niche solution for large-scale web services has become the default ' +
			'architecture for everything from mobile applications to enterprise data pipelines. ' +
			'The rise of cloud-native development, containerisation, and microservices has made ' +
			'distributed systems accessible to organisations of all sizes.',
		url: '',
		id: 'fp-p1',
	},
	{
		type: 'paragraph',
		content:
			'The introduction of machine-learning workloads has added new complexity to this ' +
			'equation. Neural-network training requires vast amounts of compute that must be ' +
			'coordinated across dozens or even hundreds of nodes. Inference at scale demands ' +
			'low-latency responses from globally distributed endpoints. The old models of ' +
			'centralised batch processing are simply inadequate for these requirements.',
		url: '',
		id: 'fp-p2',
	},
	{
		type: 'image',
		content: '',
		url: 'https://picsum.photos/seed/fp-img1/1600/900',
		id: 'fp-img1',
	},
	{
		type: 'quote',
		content:
			"The hardest part of distributed systems isn't the technology — it's the humans " +
			'who have to reason about it.',
		url: '',
		id: 'fp-q1',
	},
	{
		type: 'subheading',
		content: 'The Consistency Trilemma Revisited',
		url: '',
		id: 'fp-sh2',
	},
	{
		type: 'paragraph',
		content:
			"Eric Brewer's CAP theorem famously stated that a distributed system can only " +
			'guarantee two of three properties: Consistency, Availability, and Partition ' +
			'tolerance. In practice, network partitions are unavoidable, so engineers must ' +
			'choose between strong consistency and high availability. This trade-off has shaped ' +
			'the design of virtually every database, message queue, and coordination service in existence.',
		url: '',
		id: 'fp-p3',
	},
	{
		type: 'paragraph',
		content:
			'Recent research has challenged this binary framing. CRDT-based data structures, ' +
			'causal consistency models, and fine-grained consistency levels pioneered by systems ' +
			'like Cassandra and DynamoDB demonstrate that the spectrum between strong and eventual ' +
			'consistency is rich with viable intermediate positions. The key insight is that ' +
			'different parts of the same application often have different consistency requirements.',
		url: '',
		id: 'fp-p4',
	},
	{
		type: 'list',
		content:
			'Strong consistency: all reads return the most recent write\n' +
			'Eventual consistency: all reads will eventually return the most recent write\n' +
			'Causal consistency: causally related operations are seen in order\n' +
			'Monotonic read: once a value is read, older values are never returned',
		url: '',
		id: 'fp-list1',
	},
	{
		type: 'image',
		content: '',
		url: 'https://picsum.photos/seed/fp-img2/1200/800',
		id: 'fp-img2',
	},
	{
		type: 'subheading',
		content: 'Observability as a First-Class Citizen',
		url: '',
		id: 'fp-sh3',
	},
	{
		type: 'paragraph',
		content:
			'One of the most significant shifts in distributed systems thinking over the past ' +
			'five years has been the elevation of observability from an afterthought to a core ' +
			'design principle. The three pillars — metrics, logs, and traces — are now considered ' +
			'essential infrastructure. OpenTelemetry has emerged as the industry standard for ' +
			'instrumenting services regardless of language or runtime.',
		url: '',
		id: 'fp-p5',
	},
	{
		type: 'quote',
		content:
			"You can't optimise what you can't measure, and in distributed systems, " +
			'measurement itself is a distributed problem.',
		url: '',
		id: 'fp-q2',
	},
	{
		type: 'code',
		content:
			'const tracer = opentelemetry.trace.getTracer("my-service", "1.0.0");\n' +
			'const span   = tracer.startSpan("database-query");\n' +
			'try {\n' +
			'  const result = await db.query(sql);\n' +
			'  span.setStatus({ code: SpanStatusCode.OK });\n' +
			'  return result;\n' +
			'} finally {\n' +
			'  span.end();\n' +
			'}',
		url: '',
		id: 'fp-code1',
	},
	{
		type: 'paragraph',
		content:
			'Distributed tracing, in particular, has become indispensable for diagnosing latency ' +
			'issues in systems with complex service dependency graphs. When a user request touches ' +
			'twenty microservices before returning a response, traditional logging is insufficient. ' +
			'Trace-context propagation — passing a correlation ID through HTTP headers, message-queue ' +
			'metadata, and database transactions — allows engineers to reconstruct the full execution path.',
		url: '',
		id: 'fp-p6',
	},
	{
		type: 'details',
		content:
			'Advanced Tracing Techniques\n' +
			'Head-based sampling: make the decision at trace initiation\n' +
			'Tail-based sampling: collect all spans, decide after the fact\n' +
			'Adaptive sampling: adjust rates based on error rates and latency',
		url: '',
		id: 'fp-details1',
	},
	{
		type: 'image',
		content: '',
		url: 'https://picsum.photos/seed/fp-img3/1200/675',
		id: 'fp-img3',
	},
	{
		type: 'paragraph',
		content:
			'Looking ahead, the convergence of distributed systems and artificial intelligence ' +
			'presents both opportunities and challenges. Large language models deployed as ' +
			'microservices must handle bursty traffic patterns, long-running inference requests, ' +
			'and stateful conversation contexts. The field is actively developing new patterns — ' +
			'speculative execution, continuous batching, and KV-cache management — to address these workloads.',
		url: '',
		id: 'fp-p7',
	},
	{
		type: 'gallery',
		content: '',
		url: '',
		id: 'fp-gal1',
		urls: [
			'https://picsum.photos/seed/fp-g1/800/600',
			'https://picsum.photos/seed/fp-g2/800/600',
			'https://picsum.photos/seed/fp-g3/800/600',
		],
	},
	{
		type: 'cta',
		content: 'Explore the Full Research',
		url: 'https://example.com/research',
		id: 'fp-cta1',
	},
	{
		type: 'cta',
		content: 'Download the White Paper',
		url: 'https://example.com/whitepaper',
		id: 'fp-cta2',
	},
];

// ---------------------------------------------------------------------------
// Token → expected WordPress block name fragment in serialised output.
//
// Each token should cause at least one block of the listed type to appear.
// (Tokens that produce a *container* block whose inner blocks are the
// interesting part still emit the container token, e.g. `group:*` → `wp:group`.)
//
// cover:split is intentionally mapped to wp:media-text — the PHP renderer
// uses core/media-text for the split hero layout.
// ---------------------------------------------------------------------------
const TOKEN_BLOCK = {
	'cover:dark':          'wp:cover',
	'cover:light':         'wp:cover',
	'cover:minimal':       'wp:cover',
	'cover:split':         'wp:media-text',  // rendered as core/media-text
	'columns:2-equal':     'wp:columns',
	'columns:28-72':       'wp:columns',
	'columns:3-equal':     'wp:columns',
	'columns:4-equal':     'wp:columns',
	'media-text:left':     'wp:media-text',
	'media-text:right':    'wp:media-text',
	'group:dark-full':     'wp:group',
	'group:light-full':    'wp:group',
	'group:accent-full':   'wp:group',
	'group:border-box':    'wp:group',
	'group:gradient-full': 'wp:group',
	'group:grid':          'wp:group',
	'pullquote:wide':      'wp:pullquote',
	'pullquote:full-solid':'wp:pullquote',
	'pullquote:centered':  'wp:pullquote',
	'heading:h1':          'wp:heading',
	'heading:h2':          'wp:heading',
	'heading:h3':          'wp:heading',
	'heading:display':     'wp:heading',
	'heading:kicker':      'wp:heading',
	'paragraph':           'wp:paragraph',
	'paragraph:dropcap':   'wp:paragraph',
	'paragraph:lead':      'wp:paragraph',
	'image:wide':          'wp:image',
	'image:full':          'wp:image',
	'quote':               'wp:quote',
	'quote:attributed':    'wp:quote',
	'list':                'wp:list',
	'separator':           'wp:separator',
	'spacer:small':        'wp:spacer',
	'spacer:large':        'wp:spacer',
	'spacer:xlarge':       'wp:spacer',
	'buttons:cta':         'wp:buttons',
	'video:hero':          'wp:embed',
	'video:section':       'wp:embed',
	'table:data':          'wp:table',
	'gallery:2-col':       'wp:gallery',
	'gallery:3-col':       'wp:gallery',
	'row:stats':           'wp:group',
	'details:accordion':   'wp:details',
	'code:block':          'wp:code',
};

// ---------------------------------------------------------------------------
// Personality definitions (names + all anchor tokens from tokens.php).
// Each entry also lists the anchor tokens whose block type we can assert.
// ---------------------------------------------------------------------------

const PERSONALITIES = [
	{
		name: 'Dispatch',
		tokens: [ 'cover:dark', 'pullquote:full-solid', 'buttons:cta', 'paragraph' ],
	},
	{
		name: 'Folio',
		tokens: [ 'columns:28-72', 'pullquote:wide', 'paragraph:lead', 'paragraph' ],
	},
	{
		name: 'Stratum',
		tokens: [ 'group:dark-full', 'group:light-full', 'group:accent-full', 'paragraph' ],
	},
	{
		name: 'Broadside',
		tokens: [ 'media-text:left', 'media-text:right', 'group:accent-full', 'row:stats', 'paragraph' ],
	},
	{
		name: 'Manifesto',
		tokens: [ 'heading:h1', 'group:dark-full', 'columns:3-equal', 'paragraph:lead', 'paragraph' ],
	},
	{
		name: 'Nocturne',
		tokens: [ 'cover:dark', 'image:full', 'paragraph' ],
	},
	{
		name: 'Tribune',
		tokens: [ 'columns:3-equal', 'pullquote:full-solid', 'group:grid', 'row:stats', 'paragraph' ],
	},
	{
		name: 'Overture',
		tokens: [ 'cover:light', 'media-text:right', 'group:accent-full', 'paragraph' ],
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
		tokens: [ 'columns:4-equal', 'pullquote:centered', 'group:grid', 'paragraph' ],
	},
	{
		name: 'Solstice',
		tokens: [ 'cover:minimal', 'columns:2-equal', 'paragraph' ],
	},
	{
		name: 'Mirage',
		tokens: [ 'group:gradient-full', 'pullquote:centered', 'cover:split', 'paragraph' ],
	},
	{
		name: 'Ledger',
		tokens: [
			'columns:2-equal',
			'quote:attributed',
			'group:border-box',
			'details:accordion',
			'code:block',
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
// Nonce — fetched once before all tests.
// ---------------------------------------------------------------------------

test.describe.configure( { mode: 'serial' } );

/** @type {string} */
let wpNonce = '';

test.beforeAll( async ( { browser } ) => {
	const page = await browser.newPage();
	await page.goto( '/wp-admin/' );
	wpNonce = await page.evaluate( () => {
		return (
			window.wpApiSettings?.nonce ||
			window.wp?.apiFetch?.nonceMiddleware?.nonce ||
			''
		);
	} );
	await page.close();
} );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

for ( const personality of PERSONALITIES ) {
	test( `${ personality.name } — full-page content assembles correctly`, async ( {
		request,
	} ) => {
		const response = await request.post( '/wp-json/aldus/v1/assemble', {
			headers: { 'X-WP-Nonce': wpNonce },
			data: {
				personality: personality.name,
				tokens: personality.tokens,
				items: FULL_PAGE_ITEMS,
			},
		} );

		// ---- 1. HTTP success --------------------------------------------------
		expect( response.status() ).toBe( 200 );

		const body = await response.json();
		expect( body.success ).toBe( true );

		const { blocks } = body;
		expect( typeof blocks ).toBe( 'string' );
		expect( blocks.length ).toBeGreaterThan( 0 );

		// ---- 2. No recursive Aldus nesting ------------------------------------
		expect( blocks ).not.toContain( '<!-- wp:aldus' );

		// ---- 3. Block comments are balanced -----------------------------------
		//
		// In WordPress block grammar every <!-- wp:block --> opener has a
		// matching <!-- /wp:block --> closer.  A mismatch means a renderer
		// forgot to close a container block.
		const openers = countBlockOpeners( blocks );
		const closers = countBlockClosers( blocks );
		expect(
			openers,
			`${ personality.name }: block openers (${ openers }) ≠ closers (${ closers })\n${ blocks.slice( 0, 400 ) }`
		).toBe( closers );

		// ---- 4. Anchor tokens produce the expected WordPress block types ------
		//
		// Only assert tokens that have a deterministic single block type.
		// pull-quote / group tokens are checked at the token level, not per
		// anchor, because anchor enforcement may place multiple of the same
		// family.
		const checkedBlockTypes = new Set();
		for ( const token of personality.tokens ) {
			const expectedBlock = TOKEN_BLOCK[ token ];
			if ( ! expectedBlock ) {
				continue; // unknown or structural token — skip
			}
			if ( checkedBlockTypes.has( expectedBlock ) ) {
				continue; // already verified this block type for this personality
			}
			checkedBlockTypes.add( expectedBlock );
			expect(
				blocks,
				`${ personality.name }: token "${ token }" should produce a "${ expectedBlock }" block`
			).toContain( `<!-- ${ expectedBlock }` );
		}

		// ---- 5. Full-page render is substantively long ------------------------
		//
		// A genuine full-page layout from 22 content items must produce far
		// more than a stub string.  This guards against silent distributor
		// failures where most items are skipped.
		expect(
			blocks.length,
			`${ personality.name }: full-page render should be at least ${ MIN_FULL_PAGE_LENGTH } chars (got ${ blocks.length })`
		).toBeGreaterThan( MIN_FULL_PAGE_LENGTH );

		// ---- 6. Headline appears for personalities with a heading token ------
		//
		// `heading:*` tokens explicitly call aldus_block_heading(dist, N,
		// 'headline', …) and are guaranteed to render the headline item.
		//
		// Cover tokens are intentionally excluded: cover:dark/light have a
		// "Backdrop" variant (variant 2) that renders only a background image
		// with an empty inner container and no heading text. cover:split
		// renders as core/media-text. Asserting exact headline text for covers
		// would be brittle because the variant is determined by a
		// deterministic-but-seed-dependent formula that differs per personality.
		const headlineConsumers = new Set( [
			'heading:h1', 'heading:h2', 'heading:h3', 'heading:display', 'heading:kicker',
		] );
		const hasHeadlineToken = personality.tokens.some( ( t ) => headlineConsumers.has( t ) );

		if ( hasHeadlineToken ) {
			expect(
				blocks,
				`${ personality.name }: headline text should appear in the rendered blocks`
			).toContain( HEADLINE );
		}
	} );
}
