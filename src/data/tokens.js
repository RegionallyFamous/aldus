/**
 * Token vocabulary for Aldus layout generation.
 */

import { __ } from '@wordpress/i18n';
export const VALID_TOKENS = [
	// Covers
	'cover:dark',
	'cover:light',
	'cover:minimal',
	'cover:split',
	// Columns
	'columns:2-equal',
	'columns:28-72',
	'columns:3-equal',
	'columns:4-equal',
	// Media
	'media-text:left',
	'media-text:right',
	// Groups
	'group:dark-full',
	'group:accent-full',
	'group:light-full',
	'group:border-box',
	'group:gradient-full',
	// Pull quotes
	'pullquote:wide',
	'pullquote:full-solid',
	'pullquote:centered',
	// Headings
	'heading:h1',
	'heading:h2',
	'heading:h3',
	'heading:display',
	'heading:kicker',
	// Paragraphs
	'paragraph',
	'paragraph:dropcap',
	// Images
	'image:wide',
	'image:full',
	// Quotes
	'quote',
	'quote:attributed',
	// Structure
	'list',
	'separator',
	'spacer:small',
	'spacer:large',
	'spacer:xlarge',
	'buttons:cta',
	// Video
	'video:hero',
	'video:section',
	// Table
	'table:data',
	// Gallery
	'gallery:2-col',
	'gallery:3-col',
];
export const VALID_TOKENS_SET = new Set( VALID_TOKENS );

// Maps each token to the content types it requires from the user's items pool.
// Used by computeBestMatches to find personalities whose anchors are fully fed.
//
// NOTE: This mapping intentionally mirrors the PHP token→type maps in
// Aldus_Content_Distributor::prioritize() and aldus_prune_unavailable_tokens()
// (includes/tokens.php; pruning is scoped per personality via anchor lists).
// Keep them in sync when adding new tokens.
//
// Tokens with no content requirement (structural, separators, spacers) are
// omitted; absent keys resolve to [] and pass vacuously, which is correct:
// a spacer anchor is always satisfiable regardless of content.
// Group tokens DO require content (paragraph at minimum) so they are listed
// explicitly to avoid vacuous best-match scoring when items is empty.
export const TOKEN_CONTENT_TYPES = {
	// Covers
	'cover:dark': [ 'image' ],
	'cover:light': [ 'image' ],
	'cover:split': [ 'image' ],
	'cover:minimal': [ 'headline' ],
	// Columns
	'columns:28-72': [ 'headline', 'paragraph' ],
	'columns:2-equal': [ 'paragraph' ],
	'columns:3-equal': [ 'paragraph' ],
	'columns:4-equal': [ 'subheading' ],
	// Media
	'media-text:left': [ 'image' ],
	'media-text:right': [ 'image' ],
	'image:wide': [ 'image' ],
	'image:full': [ 'image' ],
	'gallery:2-col': [ 'gallery' ],
	'gallery:3-col': [ 'gallery' ],
	// Groups — require at least a paragraph to produce meaningful output.
	'group:dark-full': [ 'paragraph' ],
	'group:accent-full': [ 'paragraph' ],
	'group:light-full': [ 'paragraph' ],
	'group:border-box': [ 'paragraph' ],
	'group:gradient-full': [ 'paragraph' ],
	// Pullquotes / quotes
	'pullquote:wide': [ 'quote' ],
	'pullquote:full-solid': [ 'quote' ],
	'pullquote:centered': [ 'quote' ],
	quote: [ 'quote' ],
	'quote:attributed': [ 'quote' ],
	// Headings
	'heading:h1': [ 'headline' ],
	'heading:h2': [ 'subheading' ],
	'heading:h3': [ 'subheading' ],
	'heading:display': [ 'headline' ],
	'heading:kicker': [ 'subheading' ],
	// Text
	paragraph: [ 'paragraph' ],
	'paragraph:dropcap': [ 'paragraph' ],
	list: [ 'list' ],
	// CTA
	'buttons:cta': [ 'cta' ],
	// Video / Table
	'video:hero': [ 'video' ],
	'video:section': [ 'video' ],
	'table:data': [ 'table' ],
	// Structural tokens (separator, spacer:*) intentionally omitted — no pool
	// content required; they are always satisfiable and should not block a match.
};

/**
 * Deterministically identifies manifest content types not covered by any
 * token in the sequence.
 *
 * Replaces the LLM-based scoreCoverage call.  Uses TOKEN_CONTENT_TYPES to
 * find which content types each token serves, then returns any manifest types
 * that no token in the sequence covers.  Unused types are shown as a small
 * badge on the layout card so the user knows what content is skipped.
 *
 * @param {Object}   manifest Map of content type → count (e.g. { image: 1, paragraph: 2 }).
 * @param {string[]} tokens   Token sequence produced by inferTokens.
 * @return {{ unused: string[] }} Object with unused content type array.
 */
export function computeCoverage( manifest, tokens ) {
	const used = new Set();
	for ( const token of tokens ) {
		for ( const type of TOKEN_CONTENT_TYPES[ token ] ?? [] ) {
			used.add( type );
		}
	}
	return {
		unused: Object.keys( manifest ).filter( ( t ) => ! used.has( t ) ),
	};
}

/**
 * Returns a Set of personality names that are "best matches" for the given
 * items — i.e. every anchor token's required content type is present.
 * Returns at most 3 names, sorted by number of satisfied anchors (descending).
 *
 * @param {Array} items         User content items array.
 * @param {Array} personalities Active personalities array (ACTIVE_PERSONALITIES).
 */
export function computeBestMatches( items, personalities ) {
	const presentTypes = new Set(
		items.filter( ( i ) => i.type ).map( ( i ) => i.type )
	);
	const scored = personalities.map( ( p ) => {
		const total = p.anchors.length;
		const satisfied = p.anchors.filter( ( anchor ) => {
			const needed = TOKEN_CONTENT_TYPES[ anchor ] ?? [];
			return needed.every( ( t ) => presentTypes.has( t ) );
		} ).length;
		return { name: p.name, satisfied, total };
	} );
	// Only consider fully-satisfied personalities (all anchors met).
	const fullyMet = scored.filter(
		( s ) => s.satisfied === s.total && s.total > 0
	);
	// Sort descending by anchor count (more anchors = more specific match).
	fullyMet.sort( ( a, b ) => b.total - a.total );
	return new Set( fullyMet.slice( 0, 3 ).map( ( s ) => s.name ) );
}

// Ordered category groups for prompt formatting — a structured list is easier
// for the 360M model to parse than a flat comma-separated blob.
export const TOKEN_CATEGORIES = {
	Covers: [ 'cover:dark', 'cover:light', 'cover:minimal', 'cover:split' ],
	Columns: [
		'columns:28-72',
		'columns:2-equal',
		'columns:3-equal',
		'columns:4-equal',
	],
	Media: [
		'media-text:left',
		'media-text:right',
		'image:wide',
		'image:full',
		'gallery:2-col',
		'gallery:3-col',
	],
	Groups: [
		'group:dark-full',
		'group:accent-full',
		'group:light-full',
		'group:border-box',
		'group:gradient-full',
	],
	Quotes: [
		'pullquote:wide',
		'pullquote:full-solid',
		'pullquote:centered',
		'quote',
		'quote:attributed',
	],
	Headings: [
		'heading:h1',
		'heading:h2',
		'heading:h3',
		'heading:display',
		'heading:kicker',
	],
	Text: [ 'paragraph', 'paragraph:dropcap', 'list' ],
	Buttons: [ 'buttons:cta' ],
	Structure: [
		'separator',
		'spacer:small',
		'spacer:large',
		'spacer:xlarge',
		'video:hero',
		'video:section',
		'table:data',
	],
};

// Flat set of every token that appears in any TOKEN_CATEGORIES bucket.
// Computed once at module init so formatTokenPool never rebuilds it.
export const CATEGORIZED_TOKENS_SET = new Set(
	Object.values( TOKEN_CATEGORIES ).flat()
);

/**
 * Formats a token pool into a grouped string for the LLM prompt.
 * Only categories with at least one token in the pool are included.
 * e.g. "Covers: cover:dark / Quotes: pullquote:wide, quote / Buttons: buttons:cta"
 *
 * @param {string[]} tokenPool Array of token strings to format.
 */
export function formatTokenPool( tokenPool ) {
	const poolSet = new Set( tokenPool );
	const parts = Object.entries( TOKEN_CATEGORIES )
		.map( ( [ cat, tokens ] ) => {
			const available = tokens.filter( ( t ) => poolSet.has( t ) );
			return available.length
				? `${ cat }: ${ available.join( ', ' ) }`
				: null;
		} )
		.filter( Boolean );
	// Fall back to a flat list for any tokens not covered by any category.
	const uncategorized = tokenPool.filter(
		( t ) => ! CATEGORIZED_TOKENS_SET.has( t )
	);
	if ( uncategorized.length ) {
		parts.push( `Other: ${ uncategorized.join( ', ' ) }` );
	}
	return parts.join( ' / ' );
}

// ---------------------------------------------------------------------------
// Completeness hints — token → content type it requires
// ---------------------------------------------------------------------------

// Static label maps for completeness hints — defined at module scope to avoid
// re-creation on every render of CompletenessHints.
export const HINT_TYPE_LABELS = {
	image: __( 'Image', 'aldus' ),
	quote: __( 'Quote', 'aldus' ),
	list: __( 'List', 'aldus' ),
	cta: __( 'Button', 'aldus' ),
	video: __( 'Video', 'aldus' ),
	table: __( 'Table', 'aldus' ),
	gallery: __( 'Gallery', 'aldus' ),
};
export const HINT_TYPE_OUTCOMES = {
	image: __(
		'unlocks full-screen hero sections and side-by-side layouts',
		'aldus'
	),
	quote: __(
		'unlocks large highlighted callouts and styled quotes',
		'aldus'
	),
	list: __( 'unlocks bullet-point sections', 'aldus' ),
	cta: __( 'unlocks call-to-action sections', 'aldus' ),
	video: __( 'unlocks video hero sections', 'aldus' ),
	table: __( 'unlocks data comparison tables', 'aldus' ),
	gallery: __( 'unlocks photo grid layouts', 'aldus' ),
};

export const TOKEN_CONTENT_REQUIREMENTS = {
	'image:wide': 'image',
	'image:full': 'image',
	'media-text:left': 'image',
	'media-text:right': 'image',
	'cover:split': 'image',
	'pullquote:wide': 'quote',
	'pullquote:full-solid': 'quote',
	'pullquote:centered': 'quote',
	quote: 'quote',
	'quote:attributed': 'quote',
	'buttons:cta': 'cta',
	list: 'list',
	'video:hero': 'video',
	'video:section': 'video',
	'table:data': 'table',
	'gallery:2-col': 'gallery',
	'gallery:3-col': 'gallery',
};

/**
 * Scores how well each personality in `layouts` fits the given content manifest.
 *
 * For each layout personality, checks what fraction of anchor content types
 * are satisfied by the items manifest. Returns a Map<label, score> where
 * score is in [0, 1].
 *
 * @param {Array<{label: string, tokens?: string[]}>} layouts       Generated layouts.
 * @param {Object}                                    manifest      Map of {[type]: count}.
 * @param {Array<{name: string, anchors: string[]}>}  personalities ACTIVE_PERSONALITIES list.
 * @return {Map<string, number>} Map from personality label to fit score.
 */
export function scorePersonalityFit( layouts, manifest, personalities ) {
	const presentTypes = new Set( Object.keys( manifest ) );
	const scores = new Map();

	for ( const layout of layouts ) {
		const personality = personalities.find(
			( p ) => p.name === layout.label
		);
		if ( ! personality || ! personality.anchors?.length ) {
			scores.set( layout.label, 0 );
			continue;
		}

		let satisfied = 0;
		for ( const anchor of personality.anchors ) {
			const needed = TOKEN_CONTENT_TYPES[ anchor ] ?? [];
			if (
				needed.length === 0 ||
				needed.every( ( t ) => presentTypes.has( t ) )
			) {
				satisfied++;
			}
		}

		scores.set( layout.label, satisfied / personality.anchors.length );
	}

	return scores;
}

// Human-readable labels shown in the MixScreen section list and tooltips.
// Keep in sync with TOKEN_HUMAN_LABELS in screens/MixScreen.js.
export const TOKEN_HUMAN_LABELS = {
	'cover:dark': 'Dark hero',
	'cover:light': 'Light hero',
	'cover:minimal': 'Minimal hero',
	'cover:split': 'Split hero',
	'columns:2-equal': 'Two columns',
	'columns:28-72': 'Sidebar columns',
	'columns:3-equal': 'Three columns',
	'columns:4-equal': 'Four columns',
	'media-text:left': 'Image left',
	'media-text:right': 'Image right',
	'group:dark-full': 'Dark section',
	'group:accent-full': 'Accent section',
	'group:light-full': 'Light section',
	'group:border-box': 'Bordered section',
	'group:gradient-full': 'Gradient section',
	'pullquote:wide': 'Pull quote',
	'pullquote:full-solid': 'Bold pull quote',
	'pullquote:centered': 'Centered quote',
	'heading:h1': 'Heading 1',
	'heading:h2': 'Heading 2',
	'heading:h3': 'Heading 3',
	'heading:display': 'Display heading',
	'heading:kicker': 'Kicker heading',
	paragraph: 'Paragraph',
	'paragraph:dropcap': 'Drop cap paragraph',
	'paragraph:lead': 'Lead paragraph',
	'image:wide': 'Wide image',
	'image:full': 'Full-width image',
	quote: 'Quote',
	'quote:attributed': 'Attributed quote',
	'buttons:cta': 'Call to action',
	'spacer:small': 'Small spacer',
	'spacer:large': 'Spacer',
	'spacer:xlarge': 'Large spacer',
	separator: 'Separator',
	list: 'List',
	'video:hero': 'Video hero',
	'video:section': 'Video section',
	'table:data': 'Data table',
	'gallery:2-col': '2-column gallery',
	'gallery:3-col': '3-column gallery',
	'fallback:generic': 'Fallback layout',
};

export function tokenHumanLabel( token ) {
	return TOKEN_HUMAN_LABELS[ token ] ?? token;
}

// Short display labels for token recipe strip on layout cards.
export function tokenShortLabel( token ) {
	const labels = {
		'cover:dark': 'cover',
		'cover:light': 'cover·lt',
		'cover:minimal': 'cover·min',
		'cover:split': 'cover·split',
		'columns:2-equal': '2-col',
		'columns:28-72': '28–72',
		'columns:3-equal': '3-col',
		'columns:4-equal': '4-col',
		'media-text:left': 'media',
		'media-text:right': 'media·r',
		'group:dark-full': 'grp:dark',
		'group:accent-full': 'grp:accent',
		'group:light-full': 'grp:light',
		'group:border-box': 'grp:border',
		'group:gradient-full': 'grp:grad',
		'pullquote:wide': 'pullquote',
		'pullquote:full-solid': 'pull:full',
		'pullquote:centered': 'pull:ctr',
		'heading:h1': 'h1',
		'heading:h2': 'h2',
		'heading:h3': 'h3',
		'heading:display': 'h·display',
		'heading:kicker': 'kicker',
		paragraph: 'p',
		'paragraph:dropcap': 'dropcap',
		'image:wide': 'img:wide',
		'image:full': 'img:full',
		quote: 'quote',
		'quote:attributed': 'quote·attr',
		'buttons:cta': 'cta',
		'spacer:small': 'spacer·sm',
		'spacer:large': 'spacer',
		'spacer:xlarge': 'spacer·xl',
		separator: '—',
		list: 'list',
		'video:hero': 'video',
		'video:section': 'video·sec',
		'table:data': 'table',
		'gallery:2-col': 'gallery×2',
		'gallery:3-col': 'gallery×3',
	};
	return labels[ token ] ?? token;
}
