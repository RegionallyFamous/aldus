/**
 * Aldus — Block Compositor
 * edit.js — block editor UI with in-browser WebLLM inference.
 *
 * Flow:
 *   1. User builds content items (popover inserter).
 *   2. "Make it happen" → initialize WebLLM engine (download once, cached).
 *   3. Run parallel inferences (one per active personality).
 *   4. Call PHP /aldus/v1/assemble for each sequence → block markup.
 *   5. Show layout cards with hover-overlay selection. User picks one.
 */

import {
	useState,
	useEffect,
	useRef,
	useCallback,
	useMemo,
	forwardRef,
} from '@wordpress/element';
import {
	useBlockProps,
	InspectorControls,
	BlockControls,
	MediaUpload,
	MediaUploadCheck,
	BlockPreview,
	useSettings,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	Button,
	CheckboxControl,
	ConfirmDialog,
	Flex,
	FlexItem,
	Modal,
	Notice,
	TextControl,
	TextareaControl,
	ToggleControl,
	Spinner,
	PanelBody,
	Popover,
	Icon,
	ToolbarGroup,
	ToolbarButton,
} from '@wordpress/components';
import {
	useDispatch,
	useSelect,
	dispatch as wpDispatch,
} from '@wordpress/data';
import { useEntityProp } from '@wordpress/core-data';
import { applyFilters, doAction } from '@wordpress/hooks';
import apiFetch from '@wordpress/api-fetch';
import { parse as parseBlocks } from '@wordpress/blocks';
import { __, sprintf, _n } from '@wordpress/i18n';
import { dateI18n } from '@wordpress/date';
import { speak } from '@wordpress/a11y';
import { useFocusOnMount } from '@wordpress/compose';
import {
	useShortcut,
	store as keyboardShortcutsStore,
} from '@wordpress/keyboard-shortcuts';
import { store as preferencesStore } from '@wordpress/preferences';
import {
	dragHandle,
	close,
	chevronUp,
	chevronDown,
	image as imageIcon,
	heading as headingIcon,
	paragraph as paragraphIcon,
	quote as quoteIcon,
	formatListBullets,
	link as linkIcon,
	video as videoIcon,
	table as tableIcon,
	gallery as galleryIcon,
	plus,
	undo,
	seen,
	layout as layoutIcon,
	help,
	starEmpty,
	starFilled,
	copy,
	reusableBlock,
} from '@wordpress/icons';
import {
	PACK_META,
	packToItems,
	loadPackContent,
} from './sample-data/index.js';

// Named constant for the default pack index to avoid magic numbers at call sites.
const DEFAULT_PACK_INDEX = 0;
import './editor.scss';

// ---------------------------------------------------------------------------
// Layout personalities — mirrors PHP aldus_anchor_tokens()
// exampleSequences: 2-3 reference orderings per personality shown to the model.
// creativity: 0 = rigid (follow examples closely, anchors at front),
//             1 = loose (examples are inspiration, anchors may appear anywhere).
// ---------------------------------------------------------------------------

const PERSONALITIES = [
	{
		name: 'Dispatch',
		description:
			'Breaking-news urgency: dark full-bleed opener, then a solid pullquote that owns the page, then evidence and action.',
		anchors: [ 'cover:dark', 'pullquote:full-solid', 'buttons:cta' ],
		relevantTokens: [
			'cover:dark',
			'pullquote:full-solid',
			'buttons:cta',
			'heading:h1',
			'heading:h2',
			'paragraph',
			'paragraph:dropcap',
			'image:wide',
			'image:full',
			'group:accent-full',
			'group:dark-full',
			'separator',
			'spacer:large',
		],
		creativity: 0,
		exampleSequences: [
			[
				'cover:dark',
				'pullquote:full-solid',
				'paragraph:dropcap',
				'image:wide',
				'group:accent-full',
				'buttons:cta',
			],
			[
				'cover:dark',
				'image:wide',
				'pullquote:full-solid',
				'group:accent-full',
				'paragraph',
				'buttons:cta',
			],
			[
				'cover:dark',
				'group:accent-full',
				'pullquote:full-solid',
				'paragraph:dropcap',
				'buttons:cta',
			],
		],
	},
	{
		name: 'Folio',
		description:
			'Classic asymmetric editorial: every section is labeled left and body right, like a magazine feature spread.',
		anchors: [ 'columns:28-72', 'pullquote:wide' ],
		relevantTokens: [
			'columns:28-72',
			'pullquote:wide',
			'heading:h1',
			'heading:h2',
			'paragraph',
			'paragraph:dropcap',
			'separator',
			'quote',
			'quote:attributed',
			'image:wide',
			'spacer:large',
			'spacer:xlarge',
		],
		creativity: 0,
		exampleSequences: [
			[
				'columns:28-72',
				'pullquote:wide',
				'heading:h1',
				'paragraph:dropcap',
				'columns:28-72',
				'separator',
				'quote',
			],
			[
				'heading:h1',
				'columns:28-72',
				'paragraph',
				'pullquote:wide',
				'separator',
				'quote',
			],
			[
				'columns:28-72',
				'heading:h2',
				'pullquote:wide',
				'paragraph:dropcap',
				'columns:28-72',
			],
		],
	},
	{
		name: 'Stratum',
		description:
			'Three full-width bands of dark, light, and accent — the page as landscape, content buried in strata.',
		anchors: [ 'group:dark-full', 'group:light-full', 'group:accent-full' ],
		relevantTokens: [
			'group:dark-full',
			'group:light-full',
			'group:accent-full',
			'image:full',
			'image:wide',
			'pullquote:wide',
			'buttons:cta',
			'paragraph',
			'separator',
			'spacer:large',
		],
		creativity: 1,
		exampleSequences: [
			[
				'group:dark-full',
				'group:light-full',
				'group:accent-full',
				'image:full',
				'pullquote:wide',
				'buttons:cta',
			],
			[
				'group:dark-full',
				'image:full',
				'group:light-full',
				'pullquote:wide',
				'group:accent-full',
				'buttons:cta',
			],
			[
				'group:light-full',
				'group:dark-full',
				'pullquote:wide',
				'group:accent-full',
				'image:wide',
			],
		],
	},
	{
		name: 'Broadside',
		description:
			'Cinematic alternating image-text panels with a punchy CTA cut-in, like a Stripe product page.',
		anchors: [ 'media-text:left', 'media-text:right', 'group:accent-full' ],
		relevantTokens: [
			'media-text:left',
			'media-text:right',
			'group:accent-full',
			'heading:h1',
			'heading:h2',
			'paragraph',
			'image:wide',
			'buttons:cta',
			'spacer:large',
			'separator',
		],
		creativity: 0,
		exampleSequences: [
			[
				'media-text:left',
				'media-text:right',
				'group:accent-full',
				'media-text:left',
				'spacer:large',
				'buttons:cta',
			],
			[
				'media-text:right',
				'media-text:left',
				'group:accent-full',
				'buttons:cta',
			],
			[
				'media-text:left',
				'group:accent-full',
				'media-text:right',
				'spacer:large',
				'buttons:cta',
			],
		],
	},
	{
		name: 'Manifesto',
		description:
			'Starts silent with a raw H1 and separator, then erupts into a full-dark declaration, then triptych columns.',
		anchors: [ 'heading:h1', 'group:dark-full', 'columns:3-equal' ],
		relevantTokens: [
			'heading:h1',
			'heading:h2',
			'separator',
			'group:dark-full',
			'group:accent-full',
			'columns:3-equal',
			'pullquote:wide',
			'paragraph',
			'paragraph:dropcap',
			'buttons:cta',
			'spacer:large',
		],
		creativity: 0,
		exampleSequences: [
			[
				'heading:h1',
				'separator',
				'group:dark-full',
				'columns:3-equal',
				'pullquote:wide',
				'paragraph',
				'buttons:cta',
			],
			[
				'heading:h1',
				'group:dark-full',
				'columns:3-equal',
				'pullquote:wide',
				'buttons:cta',
			],
			[
				'heading:h1',
				'paragraph',
				'group:dark-full',
				'columns:3-equal',
				'separator',
				'buttons:cta',
			],
		],
	},
	{
		name: 'Nocturne',
		description:
			'Dark cover bleeds into a full-bleed image, then the content surfaces into light — maximum chiaroscuro.',
		anchors: [ 'cover:dark', 'image:full' ],
		relevantTokens: [
			'cover:dark',
			'image:full',
			'group:dark-full',
			'group:light-full',
			'group:accent-full',
			'paragraph',
			'paragraph:dropcap',
			'pullquote:wide',
			'separator',
			'buttons:cta',
			'spacer:xlarge',
		],
		creativity: 1,
		exampleSequences: [
			[
				'cover:dark',
				'image:full',
				'group:light-full',
				'paragraph:dropcap',
				'pullquote:wide',
				'separator',
				'buttons:cta',
			],
			[
				'cover:dark',
				'image:full',
				'pullquote:wide',
				'paragraph:dropcap',
				'group:accent-full',
				'buttons:cta',
			],
			[
				'cover:dark',
				'group:dark-full',
				'image:full',
				'paragraph',
				'pullquote:wide',
				'buttons:cta',
			],
		],
	},
	{
		name: 'Tribune',
		description:
			'Three-column opener like a newspaper front page, anchored by a solid pullquote that splits the page in two.',
		anchors: [ 'columns:3-equal', 'pullquote:full-solid' ],
		relevantTokens: [
			'columns:3-equal',
			'pullquote:full-solid',
			'columns:28-72',
			'heading:h1',
			'heading:h2',
			'image:wide',
			'list',
			'paragraph',
			'buttons:cta',
			'separator',
			'spacer:small',
		],
		creativity: 0,
		exampleSequences: [
			[
				'columns:3-equal',
				'pullquote:full-solid',
				'columns:28-72',
				'image:wide',
				'list',
				'buttons:cta',
			],
			[
				'columns:3-equal',
				'pullquote:full-solid',
				'image:wide',
				'paragraph',
				'buttons:cta',
			],
			[
				'pullquote:full-solid',
				'columns:3-equal',
				'columns:28-72',
				'list',
				'buttons:cta',
			],
		],
	},
	{
		name: 'Overture',
		description:
			'A light cinematic cover builds to a media panel, then the accent section delivers the CTA like a curtain call.',
		anchors: [ 'cover:light', 'media-text:right', 'group:accent-full' ],
		relevantTokens: [
			'cover:light',
			'media-text:right',
			'media-text:left',
			'group:accent-full',
			'columns:28-72',
			'quote',
			'pullquote:wide',
			'paragraph',
			'buttons:cta',
			'spacer:large',
		],
		creativity: 1,
		exampleSequences: [
			[
				'cover:light',
				'media-text:right',
				'group:accent-full',
				'columns:28-72',
				'quote',
				'spacer:large',
				'buttons:cta',
			],
			[
				'cover:light',
				'group:accent-full',
				'media-text:right',
				'pullquote:wide',
				'buttons:cta',
			],
			[
				'cover:light',
				'media-text:right',
				'pullquote:wide',
				'group:accent-full',
				'columns:28-72',
				'buttons:cta',
			],
		],
	},
	{
		name: 'Codex',
		description:
			'Typographic restraint: display headlines, kicker labels, and editorial border-inset sections with generous white space.',
		anchors: [ 'heading:display', 'heading:kicker', 'group:border-box' ],
		relevantTokens: [
			'heading:display',
			'heading:kicker',
			'group:border-box',
			'heading:h1',
			'heading:h2',
			'separator',
			'paragraph',
			'paragraph:dropcap',
			'quote:attributed',
			'buttons:cta',
			'spacer:large',
		],
		creativity: 1,
		exampleSequences: [
			[
				'heading:kicker',
				'heading:display',
				'separator',
				'paragraph:dropcap',
				'group:border-box',
				'quote:attributed',
				'buttons:cta',
			],
			[
				'heading:display',
				'group:border-box',
				'heading:kicker',
				'paragraph',
				'separator',
				'quote:attributed',
			],
			[
				'heading:kicker',
				'heading:display',
				'paragraph:dropcap',
				'group:border-box',
				'separator',
				'buttons:cta',
			],
		],
	},
	{
		name: 'Dusk',
		description:
			'A full-height split-screen opener bleeds into a gradient section — cinematic atmosphere from the first pixel.',
		anchors: [ 'cover:split', 'group:gradient-full' ],
		relevantTokens: [
			'cover:split',
			'group:gradient-full',
			'media-text:left',
			'media-text:right',
			'paragraph',
			'paragraph:dropcap',
			'pullquote:centered',
			'pullquote:wide',
			'buttons:cta',
			'image:wide',
		],
		creativity: 1,
		exampleSequences: [
			[
				'cover:split',
				'group:gradient-full',
				'media-text:left',
				'paragraph',
				'pullquote:centered',
				'buttons:cta',
			],
			[
				'cover:split',
				'paragraph',
				'group:gradient-full',
				'pullquote:centered',
				'buttons:cta',
			],
			[
				'cover:split',
				'group:gradient-full',
				'pullquote:wide',
				'media-text:right',
				'buttons:cta',
			],
		],
	},
	{
		name: 'Broadsheet',
		description:
			'Newspaper-grid density: four equal columns, a centered pullquote that cleaves the page, full story coverage.',
		anchors: [ 'columns:4-equal', 'pullquote:centered' ],
		relevantTokens: [
			'columns:4-equal',
			'pullquote:centered',
			'heading:h1',
			'heading:h2',
			'heading:h3',
			'paragraph',
			'list',
			'separator',
			'buttons:cta',
			'columns:3-equal',
			'spacer:small',
		],
		creativity: 0,
		exampleSequences: [
			[
				'heading:h1',
				'columns:4-equal',
				'separator',
				'pullquote:centered',
				'paragraph',
				'list',
				'buttons:cta',
			],
			[
				'columns:4-equal',
				'pullquote:centered',
				'heading:h2',
				'paragraph',
				'buttons:cta',
			],
			[
				'heading:h1',
				'separator',
				'columns:4-equal',
				'pullquote:centered',
				'list',
				'buttons:cta',
			],
		],
	},
	{
		name: 'Solstice',
		description:
			'Clean and luminous: minimal color cover, two-column rhythm, and nothing that does not need to be there.',
		anchors: [ 'cover:minimal', 'columns:2-equal' ],
		relevantTokens: [
			'cover:minimal',
			'columns:2-equal',
			'media-text:left',
			'media-text:right',
			'paragraph',
			'paragraph:dropcap',
			'pullquote:wide',
			'pullquote:centered',
			'quote',
			'buttons:cta',
			'separator',
		],
		creativity: 1,
		exampleSequences: [
			[
				'cover:minimal',
				'media-text:left',
				'columns:2-equal',
				'paragraph',
				'pullquote:wide',
				'buttons:cta',
			],
			[
				'cover:minimal',
				'columns:2-equal',
				'media-text:right',
				'quote',
				'buttons:cta',
			],
			[
				'cover:minimal',
				'paragraph:dropcap',
				'columns:2-equal',
				'pullquote:centered',
				'media-text:left',
			],
		],
	},
	{
		name: 'Mirage',
		description:
			'Gradient-drenched and lush: where the split-screen cover and layered color sections converge into atmosphere.',
		anchors: [ 'group:gradient-full', 'pullquote:centered', 'cover:split' ],
		relevantTokens: [
			'group:gradient-full',
			'pullquote:centered',
			'cover:split',
			'media-text:left',
			'media-text:right',
			'paragraph',
			'paragraph:dropcap',
			'image:full',
			'buttons:cta',
			'spacer:large',
			'spacer:xlarge',
		],
		creativity: 1,
		exampleSequences: [
			[
				'cover:split',
				'group:gradient-full',
				'pullquote:centered',
				'paragraph:dropcap',
				'media-text:right',
				'buttons:cta',
			],
			[
				'cover:split',
				'pullquote:centered',
				'group:gradient-full',
				'paragraph',
				'buttons:cta',
			],
			[
				'group:gradient-full',
				'cover:split',
				'pullquote:centered',
				'media-text:left',
				'buttons:cta',
			],
		],
	},
	{
		name: 'Ledger',
		description:
			'Long-form essay or report structure: two-column flow, attributed quote, editorial border-inset for the key section.',
		anchors: [ 'columns:2-equal', 'quote:attributed', 'group:border-box' ],
		relevantTokens: [
			'columns:2-equal',
			'quote:attributed',
			'group:border-box',
			'heading:h1',
			'heading:h2',
			'paragraph',
			'paragraph:dropcap',
			'separator',
			'buttons:cta',
			'spacer:small',
			'spacer:large',
		],
		creativity: 0,
		exampleSequences: [
			[
				'heading:h1',
				'columns:2-equal',
				'separator',
				'quote:attributed',
				'group:border-box',
				'paragraph',
				'buttons:cta',
			],
			[
				'heading:h1',
				'paragraph:dropcap',
				'columns:2-equal',
				'quote:attributed',
				'group:border-box',
				'buttons:cta',
			],
			[
				'columns:2-equal',
				'heading:h2',
				'quote:attributed',
				'group:border-box',
				'separator',
				'paragraph',
			],
		],
	},
	{
		name: 'Mosaic',
		description:
			'Gallery-first — images lead and dominate, text stays lean. Built for photographers and visual portfolios.',
		anchors: [ 'gallery:3-col', 'buttons:cta' ],
		relevantTokens: [
			'gallery:3-col',
			'gallery:2-col',
			'buttons:cta',
			'heading:h1',
			'heading:h2',
			'paragraph',
			'image:wide',
			'image:full',
			'group:accent-full',
			'separator',
		],
		creativity: 1,
		exampleSequences: [
			[
				'heading:h1',
				'gallery:3-col',
				'paragraph',
				'gallery:2-col',
				'buttons:cta',
			],
			[
				'gallery:3-col',
				'heading:h1',
				'gallery:2-col',
				'paragraph',
				'buttons:cta',
			],
			[
				'heading:h1',
				'gallery:2-col',
				'paragraph',
				'gallery:3-col',
				'buttons:cta',
			],
		],
	},
	{
		name: 'Prism',
		description:
			'Three equal columns open into a full gallery grid — structure and imagery in dialogue.',
		anchors: [ 'columns:3-equal', 'gallery:3-col' ],
		relevantTokens: [
			'columns:3-equal',
			'gallery:3-col',
			'gallery:2-col',
			'group:accent-full',
			'heading:h1',
			'heading:h2',
			'paragraph',
			'buttons:cta',
			'image:wide',
			'separator',
			'spacer:xlarge',
		],
		creativity: 0,
		exampleSequences: [
			[
				'columns:3-equal',
				'gallery:3-col',
				'group:accent-full',
				'gallery:2-col',
				'buttons:cta',
			],
			[
				'columns:3-equal',
				'heading:h1',
				'gallery:3-col',
				'group:accent-full',
				'buttons:cta',
			],
			[
				'heading:h1',
				'columns:3-equal',
				'gallery:3-col',
				'paragraph',
				'buttons:cta',
			],
		],
	},
];

/**
 * Filterable personalities list. Add-ons may extend or replace entries.
 *
 * Filter: 'aldus.personalities'
 *
 * @type {Array}
 */
const ACTIVE_PERSONALITIES = applyFilters(
	'aldus.personalities',
	PERSONALITIES
);

const VALID_TOKENS = [
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
const VALID_TOKENS_SET = new Set( VALID_TOKENS );

// Maps each token to the content types it requires from the user's items pool.
// Used by computeBestMatches to find personalities whose anchors are fully fed.
//
// NOTE: This mapping intentionally mirrors the PHP token→type maps in
// Aldus_Content_Distributor::prioritize() (templates.php) and
// aldus_prune_unavailable_tokens() (api.php). Keep them in sync when adding
// new tokens — three places, same truth.
//
// Tokens with no content requirement (structural, separators, spacers) are
// omitted; absent keys resolve to [] and pass vacuously, which is correct:
// a spacer anchor is always satisfiable regardless of content.
// Group tokens DO require content (paragraph at minimum) so they are listed
// explicitly to avoid vacuous best-match scoring when items is empty.
const TOKEN_CONTENT_TYPES = {
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
 * Returns a Set of personality names that are "best matches" for the given
 * items — i.e. every anchor token's required content type is present.
 * Returns at most 3 names, sorted by number of satisfied anchors (descending).
 *
 * @param {Array} items User content items array.
 */
function computeBestMatches( items ) {
	const presentTypes = new Set(
		items.filter( ( i ) => i.type ).map( ( i ) => i.type )
	);
	const scored = ACTIVE_PERSONALITIES.map( ( p ) => {
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
const TOKEN_CATEGORIES = {
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
const CATEGORIZED_TOKENS_SET = new Set(
	Object.values( TOKEN_CATEGORIES ).flat()
);

/**
 * Formats a token pool into a grouped string for the LLM prompt.
 * Only categories with at least one token in the pool are included.
 * e.g. "Covers: cover:dark / Quotes: pullquote:wide, quote / Buttons: buttons:cta"
 *
 * @param {string[]} tokenPool Array of token strings to format.
 */
function formatTokenPool( tokenPool ) {
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
// Content-type meta (Pass 1: descriptions + CTA→Button)
// ---------------------------------------------------------------------------

const CONTENT_TYPES = [
	{
		type: 'headline',
		label: __( 'Headline', 'aldus' ),
		icon: headingIcon,
		placeholder: __( 'Your main heading', 'aldus' ),
		input: 'text',
		description: __( 'The big, bold title', 'aldus' ),
	},
	{
		type: 'subheading',
		label: __( 'Subheading', 'aldus' ),
		icon: headingIcon,
		placeholder: __( 'A section title', 'aldus' ),
		input: 'text',
		description: __( 'A section header', 'aldus' ),
	},
	{
		type: 'paragraph',
		label: __( 'Paragraph', 'aldus' ),
		icon: paragraphIcon,
		placeholder: __( 'Your body copy here', 'aldus' ),
		input: 'textarea',
		description: __( 'Your body copy', 'aldus' ),
	},
	{
		type: 'quote',
		label: __( 'Quote', 'aldus' ),
		icon: quoteIcon,
		placeholder: __( 'A compelling line', 'aldus' ),
		input: 'text',
		description: __( 'A line worth highlighting', 'aldus' ),
	},
	{
		type: 'image',
		label: __( 'Image', 'aldus' ),
		icon: imageIcon,
		placeholder: __( 'Paste image URL', 'aldus' ),
		input: 'image',
		description: __( 'A photo or graphic', 'aldus' ),
	},
	{
		type: 'cta',
		label: __( 'Button', 'aldus' ),
		icon: linkIcon,
		placeholder: __( 'Button label', 'aldus' ),
		input: 'button',
		description: __( 'A link that pops', 'aldus' ),
	},
	{
		type: 'list',
		label: __( 'List', 'aldus' ),
		icon: formatListBullets,
		placeholder: __( 'One item per line', 'aldus' ),
		input: 'textarea',
		description: __( 'Bullet points', 'aldus' ),
	},
	{
		type: 'video',
		label: __( 'Video', 'aldus' ),
		icon: videoIcon,
		placeholder: __( 'YouTube or Vimeo URL', 'aldus' ),
		input: 'video',
		description: __( 'A video or embed', 'aldus' ),
	},
	{
		type: 'table',
		label: __( 'Table', 'aldus' ),
		icon: tableIcon,
		/* translators: table placeholder — two lines showing column headers then a sample row */
		placeholder:
			__( 'Header 1, Header 2', 'aldus' ) +
			'\n' +
			__( 'Row 1 A, Row 1 B', 'aldus' ),
		input: 'textarea',
		description: __( 'Structured data', 'aldus' ),
	},
	{
		type: 'gallery',
		label: __( 'Gallery', 'aldus' ),
		icon: galleryIcon,
		placeholder: __( 'Add images from your media library', 'aldus' ),
		input: 'gallery',
		description: __( 'A grid of images', 'aldus' ),
	},
];

const TYPE_META = Object.fromEntries(
	CONTENT_TYPES.map( ( t ) => [ t.type, t ] )
);

// Primary (80% use case) vs secondary (specialist) content types for the tiered inserter.
const PRIMARY_CONTENT_TYPE_IDS = new Set( [
	'headline',
	'paragraph',
	'image',
	'quote',
	'cta',
] );
const PRIMARY_CONTENT_TYPES = CONTENT_TYPES.filter( ( t ) =>
	PRIMARY_CONTENT_TYPE_IDS.has( t.type )
);
const SECONDARY_CONTENT_TYPES = CONTENT_TYPES.filter(
	( t ) => ! PRIMARY_CONTENT_TYPE_IDS.has( t.type )
);

// ---------------------------------------------------------------------------
// Quick-start presets (Pass 8)
// ---------------------------------------------------------------------------

const PRESETS = [
	{
		id: 'blog',
		name: __( 'Blog post', 'aldus' ),
		description: __( 'Headline · 2 paragraphs · Image', 'aldus' ),
		items: [
			{ type: 'headline' },
			{ type: 'paragraph' },
			{ type: 'paragraph' },
			{ type: 'image' },
		],
	},
	{
		id: 'landing',
		name: __( 'Landing page', 'aldus' ),
		description: __( 'Headline · Subheading · Button', 'aldus' ),
		items: [
			{ type: 'headline' },
			{ type: 'subheading' },
			{ type: 'cta' },
		],
	},
	{
		id: 'feature',
		name: __( 'Feature story', 'aldus' ),
		description: __( 'Headline · Quote · 2 paragraphs · Image', 'aldus' ),
		items: [
			{ type: 'headline' },
			{ type: 'quote' },
			{ type: 'paragraph' },
			{ type: 'paragraph' },
			{ type: 'image' },
		],
	},
	{
		id: 'product',
		name: __( 'Product pitch', 'aldus' ),
		description: __( 'Headline · List · Button', 'aldus' ),
		items: [ { type: 'headline' }, { type: 'list' }, { type: 'cta' } ],
	},
];

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Layout wireframe — visual skeleton used in card thumbnails instead of
// BlockPreview (which renders poorly at small scale and can show validation
// errors). The wireframe maps each token to a strip with a shape, height,
// and tone so the user can scan the layout rhythm at a glance.
// ---------------------------------------------------------------------------

const WF = {
	// token : [ height_px, type, bg_hint ]
	// types: full | split-v | cols-2 | cols-3 | cols-4 | media-l | media-r |
	//        text | text-lg | text-sm | quote | cta | rule | space | grid-2 | grid-3
	'cover:dark': [ 72, 'full', '#1a1a2e' ],
	'cover:light': [ 72, 'full', '#e4e4e4' ],
	'cover:minimal': [ 52, 'full', '#2d2d2d' ],
	'cover:split': [ 72, 'split-v', '#1e1e1e' ],
	'heading:display': [ 18, 'text-lg', '#222' ],
	'heading:h1': [ 14, 'text-lg', '#333' ],
	'heading:h2': [ 11, 'text', '#444' ],
	'heading:h3': [ 9, 'text-sm', '#555' ],
	'heading:kicker': [ 7, 'text-sm', '#888' ],
	paragraph: [ 22, 'lines', '#bbb' ],
	'paragraph:dropcap': [ 22, 'lines', '#bbb' ],
	'media-text:left': [ 48, 'media-l', '#c8c8c8' ],
	'media-text:right': [ 48, 'media-r', '#c8c8c8' ],
	'columns:2-equal': [ 34, 'cols-2', '#d4d4d4' ],
	'columns:28-72': [ 34, 'cols-2', '#d4d4d4' ],
	'columns:3-equal': [ 32, 'cols-3', '#d4d4d4' ],
	'columns:4-equal': [ 30, 'cols-4', '#d4d4d4' ],
	'group:dark-full': [ 56, 'full', '#181824' ],
	'group:accent-full': [ 52, 'full', '#2563eb' ],
	'group:light-full': [ 48, 'full', '#f3f4f6' ],
	'group:border-box': [ 42, 'full', '#fff' ],
	'group:gradient-full': [ 56, 'full', '#4f46e5' ],
	'pullquote:wide': [ 30, 'quote', '#f5f5f5' ],
	'pullquote:full-solid': [ 44, 'full', '#1a1a1a' ],
	'pullquote:centered': [ 30, 'quote', '#f0f0f0' ],
	quote: [ 22, 'quote', '#f5f5f5' ],
	'quote:attributed': [ 26, 'quote', '#f5f5f5' ],
	list: [ 20, 'lines', '#ccc' ],
	'buttons:cta': [ 16, 'cta', '#0070f3' ],
	separator: [ 5, 'rule', '#e0e0e0' ],
	'spacer:small': [ 6, 'space', 'transparent' ],
	'spacer:large': [ 10, 'space', 'transparent' ],
	'spacer:xlarge': [ 14, 'space', 'transparent' ],
	'image:wide': [ 40, 'full', '#c4c4c4' ],
	'image:full': [ 52, 'full', '#b8b8b8' ],
	'gallery:2-col': [ 36, 'grid-2', '#c4c4c4' ],
	'gallery:3-col': [ 30, 'grid-3', '#c4c4c4' ],
	'video:hero': [ 60, 'full', '#111' ],
	'video:section': [ 44, 'full', '#1a1a1a' ],
	'table:data': [ 32, 'cols-4', '#efefef' ],
};

const WF_DEFAULT = [ 14, 'text', '#ccc' ];

function LayoutWireframe( { tokens } ) {
	if ( ! tokens || tokens.length === 0 ) {
		return null;
	}
	return (
		<div className="aldus-wireframe" aria-hidden="true">
			{ tokens.map( ( token, i ) => {
				const [ h, type, bg ] = WF[ token ] ?? WF_DEFAULT;
				return (
					<WireframeStrip
						key={ i }
						height={ h }
						type={ type }
						bg={ bg }
					/>
				);
			} ) }
		</div>
	);
}

function WireframeStrip( { height, type, bg } ) {
	const base = {
		height,
		flexShrink: 0,
		overflow: 'hidden',
		display: 'flex',
	};

	// Full-width solid or tinted fill (covers, groups, images, video).
	if ( type === 'full' ) {
		return (
			<div
				style={ {
					...base,
					background: bg,
					alignItems: 'center',
					justifyContent: 'center',
					padding: '0 12px',
				} }
			>
				<div
					style={ {
						width: '40%',
						height: 3,
						borderRadius: 2,
						background: 'rgba(255,255,255,0.25)',
						flexShrink: 0,
					} }
				/>
			</div>
		);
	}

	// Vertical split — left half image, right half text lines.
	if ( type === 'split-v' ) {
		return (
			<div style={ { ...base } }>
				<div
					style={ {
						flex: '0 0 50%',
						background: bg,
						height: '100%',
					} }
				/>
				<div
					style={ {
						flex: '0 0 50%',
						background: '#f4f4f4',
						height: '100%',
						padding: '8px 10px',
						display: 'flex',
						flexDirection: 'column',
						gap: 4,
						justifyContent: 'center',
					} }
				>
					<div
						style={ {
							width: '80%',
							height: 4,
							borderRadius: 2,
							background: '#bbb',
						} }
					/>
					<div
						style={ {
							width: '60%',
							height: 3,
							borderRadius: 2,
							background: '#d0d0d0',
						} }
					/>
				</div>
			</div>
		);
	}

	// Media-text (image left/right, text other side).
	if ( type === 'media-l' || type === 'media-r' ) {
		const imgSide = (
			<div
				style={ {
					flex: '0 0 40%',
					background: '#c0c0c0',
					height: '100%',
				} }
			/>
		);
		const txtSide = (
			<div
				style={ {
					flex: '1',
					background: '#f9f9f9',
					height: '100%',
					padding: '6px 8px',
					display: 'flex',
					flexDirection: 'column',
					gap: 4,
					justifyContent: 'center',
				} }
			>
				<div
					style={ {
						width: '70%',
						height: 3,
						borderRadius: 2,
						background: '#aaa',
					} }
				/>
				<div
					style={ {
						width: '90%',
						height: 2,
						borderRadius: 2,
						background: '#ccc',
					} }
				/>
				<div
					style={ {
						width: '75%',
						height: 2,
						borderRadius: 2,
						background: '#ccc',
					} }
				/>
			</div>
		);
		return (
			<div style={ { ...base } }>
				{ type === 'media-l' ? (
					<>
						{ imgSide }
						{ txtSide }
					</>
				) : (
					<>
						{ txtSide }
						{ imgSide }
					</>
				) }
			</div>
		);
	}

	// N-column layout.
	if ( type === 'cols-2' || type === 'cols-3' || type === 'cols-4' ) {
		let count = 2;
		if ( type === 'cols-3' ) {
			count = 3;
		}
		if ( type === 'cols-4' ) {
			count = 4;
		}
		return (
			<div
				style={ {
					...base,
					gap: 2,
					padding: '4px 6px',
					background: '#fafafa',
				} }
			>
				{ Array.from( { length: count } ).map( ( _, j ) => (
					<div
						key={ j }
						style={ {
							flex: 1,
							background: bg,
							borderRadius: 2,
							display: 'flex',
							flexDirection: 'column',
							gap: 3,
							padding: '4px 5px',
							justifyContent: 'center',
						} }
					>
						<div
							style={ {
								width: '80%',
								height: 2,
								borderRadius: 2,
								background: 'rgba(0,0,0,0.25)',
							} }
						/>
						<div
							style={ {
								width: '60%',
								height: 2,
								borderRadius: 2,
								background: 'rgba(0,0,0,0.15)',
							} }
						/>
					</div>
				) ) }
			</div>
		);
	}

	// 2×2 or 3×1 image grid (gallery).
	if ( type === 'grid-2' || type === 'grid-3' ) {
		const count = type === 'grid-3' ? 3 : 2;
		return (
			<div
				style={ {
					...base,
					gap: 2,
					padding: '4px 6px',
					background: '#fafafa',
				} }
			>
				{ Array.from( { length: count } ).map( ( _, j ) => (
					<div
						key={ j }
						style={ { flex: 1, background: bg, borderRadius: 2 } }
					/>
				) ) }
			</div>
		);
	}

	// Heading (single bold line).
	if ( type === 'text-lg' ) {
		return (
			<div
				style={ {
					...base,
					alignItems: 'center',
					padding: '0 12px',
					background: '#fff',
				} }
			>
				<div
					style={ {
						width: '55%',
						height: height * 0.45,
						maxHeight: 8,
						borderRadius: 2,
						background: bg,
					} }
				/>
			</div>
		);
	}

	// Simulated text lines (paragraph / list).
	if ( type === 'lines' ) {
		return (
			<div
				style={ {
					...base,
					flexDirection: 'column',
					justifyContent: 'center',
					gap: 4,
					padding: '4px 12px',
					background: '#fff',
				} }
			>
				<div
					style={ {
						width: '90%',
						height: 2,
						borderRadius: 2,
						background: bg,
					} }
				/>
				<div
					style={ {
						width: '75%',
						height: 2,
						borderRadius: 2,
						background: bg,
					} }
				/>
				<div
					style={ {
						width: '82%',
						height: 2,
						borderRadius: 2,
						background: bg,
					} }
				/>
			</div>
		);
	}

	// Pullquote — inset with left accent line.
	if ( type === 'quote' ) {
		return (
			<div
				style={ {
					...base,
					alignItems: 'center',
					padding: '0 14px',
					background: bg,
					gap: 8,
				} }
			>
				<div
					style={ {
						width: 3,
						height: '60%',
						borderRadius: 2,
						background: '#aaa',
						flexShrink: 0,
					} }
				/>
				<div
					style={ {
						display: 'flex',
						flexDirection: 'column',
						gap: 4,
						flex: 1,
					} }
				>
					<div
						style={ {
							width: '70%',
							height: 2,
							borderRadius: 2,
							background: '#999',
						} }
					/>
					<div
						style={ {
							width: '50%',
							height: 2,
							borderRadius: 2,
							background: '#bbb',
						} }
					/>
				</div>
			</div>
		);
	}

	// CTA button hint.
	if ( type === 'cta' ) {
		return (
			<div
				style={ {
					...base,
					alignItems: 'center',
					padding: '0 12px',
					background: '#fff',
				} }
			>
				<div
					style={ {
						height: height - 4,
						paddingLeft: 12,
						paddingRight: 12,
						borderRadius: 3,
						background: bg,
						display: 'flex',
						alignItems: 'center',
					} }
				>
					<div
						style={ {
							width: 36,
							height: 2,
							borderRadius: 2,
							background: 'rgba(255,255,255,0.7)',
						} }
					/>
				</div>
			</div>
		);
	}

	// Separator rule.
	if ( type === 'rule' ) {
		return (
			<div
				style={ {
					...base,
					alignItems: 'center',
					padding: '0 12px',
					background: '#fff',
				} }
			>
				<div style={ { width: '100%', height: 1, background: bg } } />
			</div>
		);
	}

	// Space / utility.
	if ( type === 'space' ) {
		return <div style={ { ...base, background: '#fff' } } />;
	}

	// Default: single medium text line.
	return (
		<div
			style={ {
				...base,
				alignItems: 'center',
				padding: '0 12px',
				background: '#fff',
			} }
		>
			<div
				style={ {
					width: '45%',
					height: 2,
					borderRadius: 2,
					background: bg,
				} }
			/>
		</div>
	);
}

// Strings
// ---------------------------------------------------------------------------

const LAYOUT_TAGLINES = {
	Dispatch: __(
		'Dark opener, bold declaration, then the ask — urgency in three acts',
		'aldus'
	),
	Folio: __(
		'Label left, body right — every section reads like a magazine spread',
		'aldus'
	),
	Stratum: __( 'Dark, light, accent — the page as landscape', 'aldus' ),
	Broadside: __(
		'Cinematic image-text panels, CTA cut right in the middle',
		'aldus'
	),
	Manifesto: __(
		'Quiet H1, then a dark declaration, then three columns erupt',
		'aldus'
	),
	Nocturne: __(
		'Dark cover bleeds into full image, then surfaces into light',
		'aldus'
	),
	Tribune: __(
		'Newspaper front page energy, split by a bold pullquote',
		'aldus'
	),
	Overture: __(
		'Light cover builds to a reveal, accent section drops the curtain',
		'aldus'
	),
	Codex: __(
		'Typographic restraint — kicker, display headline, editorial inset',
		'aldus'
	),
	Dusk: __( 'Split-screen opener bleeds into gradient atmosphere', 'aldus' ),
	Broadsheet: __(
		'Four-column newspaper density, cleaved by a centered pullquote',
		'aldus'
	),
	Solstice: __(
		'Minimal cover, two-column rhythm, nothing superfluous',
		'aldus'
	),
	Mirage: __(
		'Gradient-drenched and lush — cover and color converge',
		'aldus'
	),
	Ledger: __(
		'Essay structure: two columns, attributed quote, editorial inset',
		'aldus'
	),
	Mosaic: __(
		'Images lead, text stays lean — built for visual portfolios',
		'aldus'
	),
	Prism: __( 'Three columns open into a full gallery grid', 'aldus' ),
};

const LOADING_MESSAGES = [
	__( 'Trying on every personality…', 'aldus' ),
	__( 'Dispatch is being dramatic. Nocturne is being moody…', 'aldus' ),
	__( 'Your words, every which way…', 'aldus' ),
	__( 'Almost ready to show you who it wants to be…', 'aldus' ),
	__( 'Folio is arranging everything very carefully…', 'aldus' ),
	__(
		'Broadsheet wants more columns. Broadsheet always wants more columns.',
		'aldus'
	),
	__( "Solstice is removing things. That's its whole personality.", 'aldus' ),
	__( 'Stratum is stacking. Dark, light, accent. In that order.', 'aldus' ),
	__( 'Tribune thinks this is front-page material.', 'aldus' ),
	__( "Codex is choosing fonts and judging everyone else's.", 'aldus' ),
	__( 'Mirage is adding more gradients. Obviously.', 'aldus' ),
	__( 'Mosaic keeps asking if there are more images.', 'aldus' ),
];

// Pass 9: structured error messages with headline + detail
const ERROR_MESSAGES = {
	connection_failed: {
		headline: __( "Couldn't connect.", 'aldus' ),
		detail: __( 'Check your network and give it another shot.', 'aldus' ),
	},
	timeout: {
		headline: __( 'That took way too long.', 'aldus' ),
		detail: __( 'Try trimming your content a bit.', 'aldus' ),
	},
	parse_failed: {
		headline: __( 'Something got scrambled.', 'aldus' ),
		detail: __(
			'Worth trying once more — it usually sorts itself out.',
			'aldus'
		),
	},
	llm_parse_failed: {
		headline: __( 'The model went sideways.', 'aldus' ),
		detail: __(
			'Try regenerating — the small model sometimes stumbles on the first pass.',
			'aldus'
		),
	},
	api_error: {
		headline: __( 'The layout assembler hit an issue.', 'aldus' ),
		detail: __(
			'Check your content items for any unusual characters, then try again.',
			'aldus'
		),
	},
	wasm_compile_failed: {
		headline: __( 'GPU compilation failed.', 'aldus' ),
		detail: __(
			"Your GPU doesn't support the model format. Browse sample layouts in the Personalities tab instead.",
			'aldus'
		),
	},
	rate_limited: {
		headline: __( 'Too many requests.', 'aldus' ),
		detail: __( 'Wait a moment, then try again.', 'aldus' ),
	},
	no_layouts: {
		headline: __( 'None of the personalities clicked.', 'aldus' ),
		detail: __(
			'Try adding a headline and at least one paragraph — that gives every style something to work with.',
			'aldus'
		),
	},
};

const uid = () => {
	if (
		typeof crypto !== 'undefined' &&
		typeof crypto.randomUUID === 'function'
	) {
		return crypto.randomUUID();
	}
	// Fallback for non-secure contexts and older engines.
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, ( c ) => {
		const r = Math.floor( Math.random() * 16 );
		const v = c === 'x' ? r : ( r % 4 ) + 8;
		return v.toString( 16 );
	} );
};

const VALID_ITEM_TYPES = new Set( [
	'headline',
	'subheading',
	'paragraph',
	'quote',
	'image',
	'cta',
	'list',
	'video',
	'table',
	'gallery',
] );

/**
 * Filters and normalises items loaded from block attributes or localStorage.
 * Drops any entry that doesn't have a recognised type so corrupted or
 * tampered attribute data can never crash the UI.
 *
 * @param {unknown} raw Value from savedItems attribute or a stored session.
 * @return {Array} Validated, normalised item array.
 */
function validateSavedItems( raw ) {
	if ( ! Array.isArray( raw ) ) {
		return [];
	}
	return raw
		.filter(
			( item ) =>
				item !== null &&
				typeof item === 'object' &&
				VALID_ITEM_TYPES.has( item.type ) &&
				typeof item.content === 'string' &&
				typeof ( item.url ?? '' ) === 'string'
		)
		.map( ( item ) => {
			const clean = {
				id:
					typeof item.id === 'string' && item.id !== ''
						? item.id
						: uid(),
				type: item.type,
				content: item.content,
				url: item.url ?? '',
			};
			// Preserve optional fields.
			if ( Number.isInteger( item.mediaId ) ) {
				clean.mediaId = item.mediaId;
			}
			if ( Array.isArray( item.urls ) ) {
				clean.urls = item.urls.filter( ( u ) => typeof u === 'string' );
			}
			return clean;
		} );
}

// ---------------------------------------------------------------------------
// Completeness hints — token → content type it requires
// ---------------------------------------------------------------------------

// Static label maps for completeness hints — defined at module scope to avoid
// re-creation on every render of CompletenessHints.
const HINT_TYPE_LABELS = {
	image: __( 'Image', 'aldus' ),
	quote: __( 'Quote', 'aldus' ),
	list: __( 'List', 'aldus' ),
	cta: __( 'Button', 'aldus' ),
	video: __( 'Video', 'aldus' ),
	table: __( 'Table', 'aldus' ),
	gallery: __( 'Gallery', 'aldus' ),
};
const HINT_TYPE_OUTCOMES = {
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

const TOKEN_CONTENT_REQUIREMENTS = {
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

// Short display labels for token recipe strip on layout cards.
function tokenShortLabel( token ) {
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

const TOKEN_HUMAN_LABELS = {
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
};

function tokenHumanLabel( token ) {
	return TOKEN_HUMAN_LABELS[ token ] ?? token;
}

// ---------------------------------------------------------------------------
// WebLLM helpers
// ---------------------------------------------------------------------------

const hasWebGPU = () =>
	typeof navigator !== 'undefined' &&
	typeof navigator.gpu !== 'undefined' &&
	navigator.gpu !== null;

function buildPersonalityPrompt(
	personality,
	manifest,
	styleNote = '',
	postContext = null,
	items = [],
	previousSequences = []
) {
	// Build manifest text with avg word-count hints for variable-length types.
	const wordCounts = {};
	for ( const item of items ) {
		if ( item.type === 'paragraph' || item.type === 'quote' ) {
			const words = item.content
				? item.content.trim().split( /\s+/ ).length
				: 0;
			if ( ! wordCounts[ item.type ] ) {
				wordCounts[ item.type ] = { total: 0, count: 0 };
			}
			wordCounts[ item.type ].total += words;
			wordCounts[ item.type ].count += 1;
		}
	}
	const manifestText = Object.entries( manifest )
		.map( ( [ type, count ] ) => {
			const wc = wordCounts[ type ];
			const avgWords =
				wc && wc.count > 0 ? Math.round( wc.total / wc.count ) : null;
			return `${ count } ${ type }${
				avgWords ? ` (avg ${ avgWords }w)` : ''
			}`;
		} )
		.join( ', ' );

	// Use per-personality relevant tokens if defined — smaller decision space
	// improves output quality for small models. Fall back to full VALID_TOKENS
	// list for backward-compat with externally registered personalities.
	const tokenPool = personality.relevantTokens ?? VALID_TOKENS;
	const tokensText = formatTokenPool( tokenPool );

	const anchorsText = personality.anchors.join( ', ' );
	const examples = personality.exampleSequences ?? [ personality.anchors ];
	const examplesText = examples
		.map( ( seq, i ) => `  ${ i + 1 }: ${ seq.join( ', ' ) }` )
		.join( '\n' );

	const isLoose = personality.creativity === 1;
	const anchorRule = isLoose
		? `Required anchor tokens (MUST appear somewhere in your sequence): ${ anchorsText }`
		: `Required anchor tokens (MUST appear at the start of your sequence): ${ anchorsText }`;
	const examplesLabel = isLoose
		? 'Inspirational sequences (use as creative starting points — feel free to diverge):'
		: 'Example sequences (follow one of these closely, adapting only as needed):';

	const noteSection = styleNote.trim()
		? `\nStyle note from the author: "${ styleNote.trim() }"`
		: '';

	const contextSection = postContext ? `\nContext: ${ postContext }` : '';

	// Append a diversity nudge for non-first personalities so the model avoids
	// producing structurally identical sequences across the batch.
	const diversitySection =
		previousSequences.length > 0
			? `\nPreviously generated sequences: ${ previousSequences
					.slice( 0, 3 )
					.map( ( s ) => s.join( ' → ' ) )
					.join( ' | ' ) }. Generate something structurally distinct.`
			: '';

	return `You arrange content into a WordPress block layout sequence using tokens.

Available tokens: ${ tokensText }

Content to place: ${ manifestText }

Layout personality: "${ personality.name }" — ${ personality.description }
${ anchorRule }
${ examplesLabel }
${ examplesText }${ contextSection }${ noteSection }${ diversitySection }

Rules:
- Use 6–12 tokens total
- Anchor tokens must be present
- Skip a token only if its required content type is not in the manifest
- Only use tokens from the approved list above

Respond with valid JSON only, no explanation:
{"tokens": ["token1", "token2", "token3"]}`;
}

function enforceAnchors( personality, tokens ) {
	const tokenSet = new Set( tokens );
	const missing = personality.anchors.filter( ( a ) => ! tokenSet.has( a ) );
	// Strict (creativity: 0): missing anchors go to the front.
	// Loose (creativity: 1): missing anchors are appended at the end.
	return personality.creativity === 0
		? [ ...missing, ...tokens ]
		: [ ...tokens, ...missing ];
}

async function inferTokens(
	engine,
	personality,
	manifest,
	styleNote = '',
	postContext = null,
	items = [],
	previousSequences = []
) {
	const prompt = buildPersonalityPrompt(
		personality,
		manifest,
		styleNote,
		postContext,
		items,
		previousSequences
	);

	// Strict personalities (creativity: 0) benefit from lower temperature — they
	// have fixed anchor positions and should follow examples closely. Loose
	// personalities (creativity: 1) get higher temperature for more surprise.
	const temperature = personality.creativity === 1 ? 0.95 : 0.6;

	const completion = await engine.chat.completions.create( {
		messages: [ { role: 'user', content: prompt } ],
		temperature,
		max_tokens: 256,
		stream: false,
	} );

	const raw = completion.choices[ 0 ]?.message?.content ?? '{}';

	let parsed = {};
	try {
		const stripped = raw
			.replace( /^```(?:json)?\s*/i, '' )
			.replace( /\s*```$/i, '' )
			.trim();
		parsed = JSON.parse( stripped );
	} catch ( parseErr ) {
		// Fall back to empty — enforceAnchors supplies required tokens.
		if ( window?.aldusDebug ) {
			// eslint-disable-next-line no-console
			console.debug( '[Aldus] token parse failed:', parseErr );
		}
	}
	const rawTokens = Array.isArray( parsed?.tokens ) ? parsed.tokens : [];

	const clean = rawTokens.filter(
		( t ) => typeof t === 'string' && VALID_TOKENS_SET.has( t )
	);

	return enforceAnchors( personality, clean );
}

// ---------------------------------------------------------------------------
// Edit component
// ---------------------------------------------------------------------------

export default function Edit( { clientId, attributes, setAttributes } ) {
	const blockProps = useBlockProps( {
		className: 'wp-block-aldus-layout-generator',
	} );

	const { enabledPersonalities, savedItems, styleNote, useMeta } = attributes;

	// State machine: 'building' | 'downloading' | 'loading' | 'results' | 'confirming' | 'mixing' | 'error' | 'no-gpu'
	const [ screen, setScreen ] = useState( 'building' );
	const [ items, setItems ] = useState( () =>
		validateSavedItems( savedItems )
	);
	const [ layouts, setLayouts ] = useState( [] );
	const [ errorCode, setErrorCode ] = useState( '' );
	const [ retryCount, setRetryCount ] = useState( 0 );
	const [ msgIndex, setMsgIndex ] = useState( 0 );
	const [ msgVisible, setMsgVisible ] = useState( true );
	const [ dlProgress, setDlProgress ] = useState( { progress: 0, text: '' } );
	const [ isGenerating, setIsGenerating ] = useState( false );
	const [ buildingMode, setBuildingMode ] = useState( 'content' ); // 'content' | 'preview'
	const [ isPreview, setIsPreview ] = useState( false );
	const [ activePreviewPack, setActivePreviewPack ] = useState( null );
	const [ rerollingLabel, setRerollingLabel ] = useState( null );
	const [ rerollErrors, setRerollErrors ] = useState( {} ); // label → true while error pill visible
	const [ genProgress, setGenProgress ] = useState( { done: 0, total: 0 } );
	const [ confirmAction, setConfirmAction ] = useState( null ); // null | 'startOver' | 'regenerate'
	const [ showHelp, setShowHelp ] = useState( false );
	const [ showPersonalityWarning, setShowPersonalityWarning ] =
		useState( false );
	// When the user clicks "Try with my content" from a pack preview card, we
	// pin that personality so generation leads with it.
	const [ pinnedPersonality, setPinnedPersonality ] = useState( null );

	const lastFocusRef = useRef( null );
	const engineRef = useRef( null );
	const abortRef = useRef( null ); // set to a cancel fn during downloading/loading
	const lastPackRef = useRef( null ); // stores last pack used for preview re-roll
	// Always-current refs so the confirming useEffect reads the latest values even
	// when it runs inside a stale closure (deps = [screen]).
	const itemsRef = useRef( items );
	const useMetaRef = useRef( useMeta );
	useEffect( () => {
		itemsRef.current = items;
	} );
	useEffect( () => {
		useMetaRef.current = useMeta;
	} );
	const personalityWarningTimerRef = useRef( null );
	// Tracks how many times each personality layout has been re-rolled so the PHP
	// variant picker produces different results even when the token sequence is identical.
	const rerollCountsRef = useRef( {} );
	const rerollErrorTimersRef = useRef( {} ); // label → timer id, so stale timers are cleared
	const { replaceBlocks, selectBlock } = useDispatch( blockEditorStore );
	const { registerShortcut } = useDispatch( keyboardShortcutsStore );

	// Read live theme colors from the editor settings store — no PHP round-trip needed.
	const [ themeColorPalette ] = useSettings( 'color.palette' );
	const themeColors = Array.isArray( themeColorPalette )
		? themeColorPalette
		: [];

	// Remember across page loads whether the model has ever been downloaded.
	const hasDownloadedModel = useSelect(
		( select ) =>
			select( preferencesStore ).get( 'aldus', 'hasDownloadedModel' ) ??
			false,
		[]
	);

	// First-run onboarding: show simplified entry when the user has never used Aldus.
	const hasUsedAldus = useSelect(
		( select ) =>
			select( preferencesStore ).get( 'aldus', 'hasUsedAldus' ) ?? false,
		[]
	);
	const { set: setPref } = useDispatch( preferencesStore );
	const markAldusUsed = useCallback( () => {
		setPref( 'aldus', 'hasUsedAldus', true );
	}, [ setPref ] );

	// Read post context for LLM prompt enrichment and personality auto-sort.
	const { postTitle, postType, postExcerpt } = useSelect( ( select ) => {
		const editor = select( 'core/editor' );
		return {
			postTitle: editor?.getEditedPostAttribute( 'title' ) ?? '',
			postType: editor?.getCurrentPostType() ?? 'post',
			postExcerpt: editor?.getEditedPostAttribute( 'excerpt' ) ?? '',
		};
	}, [] );

	// Entity prop hook for writing _aldus_items to post meta when useMeta is on.
	// The setter is only called on layout accept; reading the meta is not needed here.
	const [ , setMeta ] = useEntityProp( 'postType', postType, 'meta' );

	// Read existing editor blocks for the "Import from this page" feature.
	const editorBlocks = useSelect(
		( select ) => select( 'core/block-editor' ).getBlocks(),
		[]
	);

	// Register keyboard shortcuts into the WP shortcuts registry (shows in Shift+Alt+H dialog).
	useEffect( () => {
		registerShortcut( {
			name: 'aldus/generate',
			category: 'block',
			description: __( 'Generate layouts', 'aldus' ),
			keyCombination: { modifier: 'primary', character: 'Enter' },
		} );
		registerShortcut( {
			name: 'aldus/cancel',
			category: 'block',
			description: __( 'Cancel / go back to building', 'aldus' ),
			keyCombination: { character: 'Escape' },
		} );
		registerShortcut( {
			name: 'aldus/regen',
			category: 'block',
			description: __( 'Regenerate layouts', 'aldus' ),
			keyCombination: { modifier: 'primaryShift', character: 'r' },
		} );
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	const noWebGPU = ! hasWebGPU();

	// Track whether the next savedItems attribute change comes from us (not undo/redo).
	const selfWriteRef = useRef( false );

	// Persist items in block attributes so they survive saves and page reloads.
	useEffect( () => {
		selfWriteRef.current = true;
		setAttributes( { savedItems: items } );
		// Reset flag after the attribute write has propagated.
		const id = setTimeout( () => {
			selfWriteRef.current = false;
		}, 0 );
		return () => clearTimeout( id );
	}, [ items ] ); // eslint-disable-line react-hooks/exhaustive-deps

	// Pull attribute changes back into state when undo/redo fires externally.
	useEffect( () => {
		if ( selfWriteRef.current ) {
			return;
		}
		setItems( validateSavedItems( savedItems ) );
	}, [ savedItems ] ); // eslint-disable-line react-hooks/exhaustive-deps

	const setStyleNote = useCallback(
		( val ) => setAttributes( { styleNote: val } ),
		[ setAttributes ]
	);

	// Clear transient UI timers on unmount.
	useEffect( () => {
		const rerollTimers = rerollErrorTimersRef;
		const personalityTimer = personalityWarningTimerRef;
		return () => {
			if ( personalityTimer.current ) {
				clearTimeout( personalityTimer.current );
			}
			Object.values( rerollTimers.current ).forEach( clearTimeout );
		};
	}, [] );

	// Cycle loading messages with fade transition
	useEffect( () => {
		if ( screen !== 'loading' ) {
			return;
		}
		let innerTimerId = null;
		const id = setInterval( () => {
			setMsgVisible( false );
			innerTimerId = setTimeout( () => {
				setMsgIndex( ( i ) => ( i + 1 ) % LOADING_MESSAGES.length );
				setMsgVisible( true );
			}, 300 );
		}, 2200 );
		return () => {
			clearInterval( id );
			if ( innerTimerId !== null ) {
				clearTimeout( innerTimerId );
			}
		};
	}, [ screen ] );

	// Apply chosen layout — delayed by 400ms to allow the confirmation animation to play.
	useEffect( () => {
		if ( screen !== 'confirming' ) {
			return;
		}
		const chosen = layouts.find( ( l ) => l._chosen );
		if ( ! chosen ) {
			return;
		}
		let newBlocks;
		try {
			newBlocks = parseBlocks( chosen.blocks );
		} catch ( e ) {
			newBlocks = [];
		}
		if ( newBlocks.length > 0 ) {
			const timerId = setTimeout( () => {
				// Read latest items / useMeta from refs to avoid stale closure values
				// (this effect intentionally only re-runs when screen changes).
				const latestItems = itemsRef.current;
				const latestUseMeta = useMetaRef.current;
				if ( latestUseMeta ) {
					try {
						setMeta( {
							_aldus_items: JSON.stringify( latestItems ),
						} );
					} catch ( metaErr ) {
						if ( window?.aldusDebug ) {
							// eslint-disable-next-line no-console
							console.error( '[Aldus] setMeta failed:', metaErr );
						}
					}
				}
				replaceBlocks( clientId, newBlocks );
				// Move editor focus to the first inserted block so keyboard users land
				// somewhere meaningful after picking a layout (item 20 — accessibility).
				const firstBlock = newBlocks[ 0 ];
				if ( firstBlock?.clientId ) {
					selectBlock( firstBlock.clientId );
				}
				wpDispatch( 'core/notices' ).createSuccessNotice(
					__( 'Layout inserted. Not quite right?', 'aldus' ),
					{
						actions: [
							{
								label: __( 'Undo', 'aldus' ),
								onClick: () =>
									wpDispatch( 'core/editor' ).undo(),
							},
						],
						type: 'snackbar',
						id: 'aldus-insert-undo',
					}
				);
				/**
				 * Fires after an Aldus layout has been inserted into the editor.
				 *
				 * Action: 'aldus.layoutInserted'
				 *
				 * @param {Object}   data
				 * @param {string}   data.label  Personality name.
				 * @param {string[]} data.tokens Token sequence used.
				 * @param {Object[]} data.blocks Parsed block objects.
				 */
				doAction( 'aldus.layoutInserted', {
					label: chosen.label,
					tokens: chosen.tokens ?? [],
					blocks: newBlocks,
				} );
			}, 400 );
			return () => clearTimeout( timerId );
		}
		setErrorCode( 'api_error' );
		setRetryCount( ( c ) => c + 1 );
		setScreen( 'error' );
	}, [ screen ] ); // eslint-disable-line react-hooks/exhaustive-deps

	// ---------------------------------------------------------------------------
	// Item CRUD + reorder
	// ---------------------------------------------------------------------------

	const addItem = useCallback(
		( type ) => {
			const id = uid();
			setItems( ( prev ) => [
				...prev,
				{ id, type, content: '', url: '' },
			] );
			lastFocusRef.current = id;
			markAldusUsed();
		},
		[ markAldusUsed ]
	);

	const updateItem = useCallback(
		( id, patch ) =>
			setItems( ( prev ) =>
				prev.map( ( i ) => ( i.id === id ? { ...i, ...patch } : i ) )
			),
		[]
	);

	const removeItem = useCallback(
		( id ) => setItems( ( prev ) => prev.filter( ( i ) => i.id !== id ) ),
		[]
	);

	const reorderItems = useCallback( ( fromId, toId ) => {
		setItems( ( prev ) => {
			const from = prev.findIndex( ( i ) => i.id === fromId );
			const to = prev.findIndex( ( i ) => i.id === toId );
			if ( from < 0 || to < 0 || from === to ) {
				return prev;
			}
			const next = [ ...prev ];
			const [ moved ] = next.splice( from, 1 );
			next.splice( to, 0, moved );
			return next;
		} );
	}, [] );

	const moveItem = useCallback( ( id, dir ) => {
		setItems( ( prev ) => {
			const idx = prev.findIndex( ( i ) => i.id === id );
			if ( idx < 0 ) {
				return prev;
			}
			const swap = idx + dir;
			if ( swap < 0 || swap >= prev.length ) {
				return prev;
			}
			const next = [ ...prev ];
			[ next[ idx ], next[ swap ] ] = [ next[ swap ], next[ idx ] ];
			return next;
		} );
	}, [] );

	// Pass 8: load a quick-start preset
	const loadPreset = useCallback( ( preset ) => {
		setItems(
			preset.items.map( ( i ) => ( {
				...i,
				id: uid(),
				content: '',
				url: '',
			} ) )
		);
		setScreen( 'building' );
	}, [] );

	// ---------------------------------------------------------------------------
	// Generation (WebLLM path)
	// ---------------------------------------------------------------------------

	const runGenerate = useCallback(
		async (
			currentItems,
			activePersonalities,
			currentStyleNote = '',
			currentPostContext = null
		) => {
			if ( ! hasWebGPU() ) {
				setScreen( 'no-gpu' );
				setIsGenerating( false );
				return;
			}

			setIsGenerating( false ); // screen change takes over
			setLayouts( [] );
			setMsgIndex( 0 );
			setMsgVisible( true );

			const manifest = {};
			for ( const item of currentItems ) {
				manifest[ item.type ] = ( manifest[ item.type ] ?? 0 ) + 1;
			}

			try {
				if ( ! engineRef.current ) {
					setScreen( 'downloading' );
					setDlProgress( { progress: 0, text: '' } );

					const { CreateMLCEngine } = await import(
						'@mlc-ai/web-llm'
					);

					const dlController = new AbortController();
					abortRef.current = () => dlController.abort();

					engineRef.current = await CreateMLCEngine(
						'SmolLM2-360M-Instruct-q4f16_1-MLC',
						{
							signal: dlController.signal,
							initProgressCallback: ( info ) => {
								setDlProgress( {
									progress: info.progress ?? 0,
									text: info.text ?? '',
								} );
							},
						}
					);

					abortRef.current = null;
					// Mark that the model has been downloaded so the first-time hint disappears.
					wpDispatch( preferencesStore ).set(
						'aldus',
						'hasDownloadedModel',
						true
					);
				}

				setScreen( 'loading' );

				const personalities = ACTIVE_PERSONALITIES.filter( ( p ) =>
					activePersonalities.includes( p.name )
				);

				// For each personality after the first, pass the example sequences of
				// prior personalities as diversity hints. This runs in parallel while
				// still nudging the model toward structural variety.
				const tokenSettled = await Promise.allSettled(
					personalities.map( ( p, idx ) => {
						const previousSequences = personalities
							.slice( 0, idx )
							.map(
								( prev ) =>
									( prev.exampleSequences ?? [
										prev.anchors,
									] )[ 0 ]
							);
						return inferTokens(
							engineRef.current,
							p,
							manifest,
							currentStyleNote,
							currentPostContext,
							currentItems,
							previousSequences
						);
					} )
				);

				const tokenResults = tokenSettled.map( ( result, i ) =>
					result.status === 'fulfilled'
						? result.value
						: enforceAnchors( personalities[ i ], [] )
				);

				setGenProgress( {
					done: 0,
					total: personalities.length,
					lastLabel: null,
				} );
				const assembleSettled = await Promise.allSettled(
					tokenResults.map( async ( tokens, i ) => {
						try {
							return await apiFetch( {
								path: '/aldus/v1/assemble',
								method: 'POST',
								data: {
									items: currentItems,
									personality: personalities[ i ].name,
									tokens,
									use_bindings: useMeta,
								},
							} );
						} finally {
							setGenProgress( ( p ) => ( {
								...p,
								done: p.done + 1,
								lastLabel: personalities[ i ].name,
							} ) );
						}
					} )
				);

				const assembled = assembleSettled
					.filter(
						( r ) =>
							r.status === 'fulfilled' &&
							r.value?.success &&
							r.value?.blocks
					)
					.map( ( r ) => ( {
						label: r.value.label,
						blocks: r.value.blocks,
						tokens: r.value.tokens ?? [],
						sections: r.value.sections ?? [],
					} ) );

				if ( assembled.length === 0 ) {
					setErrorCode( 'no_layouts' );
					setRetryCount( ( c ) => c + 1 );
					setScreen( 'error' );
					speak(
						__(
							'No layouts generated. Try adding more content.',
							'aldus'
						),
						'assertive'
					);
					return;
				}

				setLayouts( assembled );
				setScreen( 'results' );
				speak(
					sprintf(
						/* translators: %d: number of generated layouts */
						__( '%d layouts ready.', 'aldus' ),
						assembled.length
					),
					'assertive'
				);
				// Remove any lingering connection error notice on success.
				wpDispatch( 'core/notices' ).removeNotice(
					'aldus-connection-error'
				);
			} catch ( err ) {
				engineRef.current = null;

				// Distinguish error sources for better user guidance.
				// WASM CompileError or WebGPU device-lost → wasm_compile_failed.
				// HTTP 429 → rate_limited.
				// HTTP 4xx/5xx from the REST API → api_error.
				// Network/service errors → connection_failed or timeout.
				// Model-side failures (JSON parse, token hallucination) → llm_parse_failed.
				let code = 'llm_parse_failed';
				if (
					// CompileError is a browser global — thrown when WASM compilation fails.
					// eslint-disable-next-line no-undef
					err instanceof CompileError ||
					err?.message?.toLowerCase().includes( 'device lost' ) ||
					err?.message?.toLowerCase().includes( 'webgpu' )
				) {
					code = 'wasm_compile_failed';
				} else if ( err?.data?.status === 429 ) {
					code = 'rate_limited';
				} else if (
					err?.data?.status === 503 ||
					err?.code === 'fetch_error'
				) {
					code = 'connection_failed';
				} else if ( err?.data?.status === 504 ) {
					code = 'timeout';
				} else if (
					err?.data?.status >= 400 &&
					err?.data?.status < 600
				) {
					code = 'api_error';
				}
				setErrorCode( code );
				setRetryCount( ( c ) => c + 1 );
				setScreen( 'error' );
				speak(
					__( 'Layout generation failed.', 'aldus' ),
					'assertive'
				);

				// Only fire a global editor notice for genuinely unrecoverable errors.
				if ( code === 'connection_failed' ) {
					wpDispatch( 'core/notices' ).createErrorNotice(
						__(
							'Aldus: could not reach the server. Check your connection and try again.',
							'aldus'
						),
						{ id: 'aldus-connection-error', isDismissible: true }
					);
				}
			}
		},
		[ useMeta ] // eslint-disable-line react-hooks/exhaustive-deps
	);

	// Preview path — skips LLM entirely; uses personality.fullSequence directly.
	const runPreview = useCallback(
		async ( pack ) => {
			lastPackRef.current = pack; // stored for per-card re-roll
			setLayouts( [] );
			setIsPreview( false );
			setScreen( 'loading' );
			setMsgIndex( 0 );
			setMsgVisible( true );

			try {
				const personalities = ACTIVE_PERSONALITIES.filter( ( p ) =>
					enabledPersonalities.includes( p.name )
				);

				// Lazily load the full pack content (dynamically imported chunk),
				// then flatten once — all personality requests share the same items array.
				const fullPack = await loadPackContent( pack.id );
				lastPackRef.current = fullPack ?? pack; // update ref with full content for re-roll
				const packItems = packToItems( fullPack ?? pack );

				setGenProgress( {
					done: 0,
					total: personalities.length,
					lastLabel: null,
				} );
				const settled = await Promise.allSettled(
					personalities.map( async ( p ) => {
						try {
							// Guard: prefer exampleSequences, fall back to anchors; never index an empty array.
							const seqs =
								p.exampleSequences?.length > 0
									? p.exampleSequences
									: [ p.anchors ];
							return await apiFetch( {
								path: '/aldus/v1/assemble',
								method: 'POST',
								data: {
									items: packItems,
									personality: p.name,
									tokens: seqs[
										Math.floor(
											Math.random() * seqs.length
										)
									],
									use_bindings: useMeta,
								},
							} );
						} finally {
							setGenProgress( ( prev ) => ( {
								...prev,
								done: prev.done + 1,
								lastLabel: p.name,
							} ) );
						}
					} )
				);

				const assembled = settled
					.filter(
						( r ) =>
							r.status === 'fulfilled' &&
							r.value?.success &&
							r.value?.blocks
					)
					.map( ( r ) => ( {
						label: r.value.label,
						blocks: r.value.blocks,
						tokens: r.value.tokens ?? [],
						sections: r.value.sections ?? [],
					} ) );

				if ( assembled.length === 0 ) {
					setErrorCode( 'no_layouts' );
					setRetryCount( ( c ) => c + 1 );
					setScreen( 'error' );
					speak(
						__(
							'No layouts generated. Try adding more content.',
							'aldus'
						),
						'assertive'
					);
					return;
				}

				setActivePreviewPack( pack );
				setIsPreview( true );
				setLayouts( assembled );
				setScreen( 'results' );
				speak(
					sprintf(
						/* translators: %d: number of generated layouts */
						__( '%d layouts ready.', 'aldus' ),
						assembled.length
					),
					'assertive'
				);
			} catch ( err ) {
				// loadPackContent or a network error before allSettled — reset to error screen.
				setErrorCode( 'api_error' );
				setRetryCount( ( c ) => c + 1 );
				setScreen( 'error' );
				if ( window?.aldusDebug ) {
					// eslint-disable-next-line no-console
					console.error( '[Aldus] runPreview failed:', err );
				}
			}
		},
		[ enabledPersonalities, useMeta ] // eslint-disable-line react-hooks/exhaustive-deps
	);

	// Per-card re-roll — regenerates one layout slot without clearing the rest.
	const rerollLayout = useCallback(
		async ( label ) => {
			const personality = ACTIVE_PERSONALITIES.find(
				( p ) => p.name === label
			);
			if ( ! personality ) {
				return;
			}
			setRerollingLabel( label );
			// Increment per-personality reroll counter so variant picks change even
			// when the token sequence is identical to the previous roll.
			rerollCountsRef.current[ label ] =
				( rerollCountsRef.current[ label ] ?? 0 ) + 1;
			const rerollCount = rerollCountsRef.current[ label ];
			try {
				let result;
				if ( isPreview && lastPackRef.current ) {
					// Pick a random exampleSequences entry for variety on each re-roll.
					// Guard: never index an empty seqs array.
					const seqs =
						personality.exampleSequences?.length > 0
							? personality.exampleSequences
							: [ personality.anchors ];
					const seqIndex = Math.floor( Math.random() * seqs.length );
					result = await apiFetch( {
						path: '/aldus/v1/assemble',
						method: 'POST',
						data: {
							items: packToItems( lastPackRef.current ),
							personality: personality.name,
							tokens: seqs[ seqIndex ],
							reroll_count: rerollCount,
							use_bindings: false,
						},
					} );
				} else {
					if ( ! engineRef.current ) {
						setRerollErrors( ( prev ) => ( {
							...prev,
							[ label ]: true,
						} ) );
						if ( rerollErrorTimersRef.current[ label ] ) {
							clearTimeout(
								rerollErrorTimersRef.current[ label ]
							);
						}
						rerollErrorTimersRef.current[ label ] = setTimeout(
							() => {
								delete rerollErrorTimersRef.current[ label ];
								setRerollErrors( ( prev ) => {
									const next = { ...prev };
									delete next[ label ];
									return next;
								} );
							},
							3000
						);
						return;
					}
					const manifest = {};
					for ( const item of items ) {
						manifest[ item.type ] =
							( manifest[ item.type ] ?? 0 ) + 1;
					}
					const tokens = await inferTokens(
						engineRef.current,
						personality,
						manifest,
						styleNote,
						null,
						items
					);
					result = await apiFetch( {
						path: '/aldus/v1/assemble',
						method: 'POST',
						data: {
							items,
							personality: personality.name,
							tokens,
							reroll_count: rerollCount,
							use_bindings: useMeta,
						},
					} );
				}
				if ( result?.success && result?.blocks ) {
					setLayouts( ( prev ) =>
						prev.map( ( l ) =>
							l.label === label
								? {
										...l,
										blocks: result.blocks,
										tokens: result.tokens ?? l.tokens,
										sections: result.sections ?? l.sections,
								  }
								: l
						)
					);
				}
			} catch ( err ) {
				if ( window?.aldusDebug ) {
					// eslint-disable-next-line no-console
					console.error( '[Aldus] rerollLayout failed:', err );
				}
				setRerollErrors( ( prev ) => ( { ...prev, [ label ]: true } ) );
				if ( rerollErrorTimersRef.current[ label ] ) {
					clearTimeout( rerollErrorTimersRef.current[ label ] );
				}
				rerollErrorTimersRef.current[ label ] = setTimeout( () => {
					delete rerollErrorTimersRef.current[ label ];
					setRerollErrors( ( prev ) => ( {
						...prev,
						[ label ]: false,
					} ) );
				}, 3000 );
			} finally {
				setRerollingLabel( null );
			}
		},
		[ isPreview, items, styleNote, useMeta ] // eslint-disable-line react-hooks/exhaustive-deps
	);

	const generate = useCallback( () => {
		setIsGenerating( true );
		const context = postTitle
			? `Post titled "${ postTitle }" (post type: ${ postType })`
			: null;
		// If a personality was pinned via "Try with my content", sort it to the
		// front so results lead with the user's chosen personality.
		let orderedPersonalities = enabledPersonalities;
		if (
			pinnedPersonality &&
			enabledPersonalities.includes( pinnedPersonality )
		) {
			orderedPersonalities = [
				pinnedPersonality,
				...enabledPersonalities.filter(
					( p ) => p !== pinnedPersonality
				),
			];
		}
		runGenerate( items, orderedPersonalities, styleNote, context );
	}, [
		items,
		enabledPersonalities,
		pinnedPersonality,
		styleNote,
		postTitle,
		postType,
		runGenerate,
	] );

	const regenerate = generate;

	const chooseLayout = useCallback(
		( label ) => {
			setLayouts( ( prev ) =>
				prev.map( ( l ) => ( { ...l, _chosen: l.label === label } ) )
			);
			setScreen( 'confirming' );

			// Analytics: fire the action hook and POST a lightweight counter update.
			const chosen = layouts.find( ( l ) => l.label === label );
			const tokenSeq = chosen?.tokens ?? [];
			doAction( 'aldus.layout_chosen', {
				personality: label,
				tokens: tokenSeq,
			} );
			// Fire-and-forget — failure is non-fatal.
			apiFetch( {
				path: '/aldus/v1/record-use',
				method: 'POST',
				data: { personality: label },
			} ).catch( ( err ) => {
				if ( window?.aldusDebug ) {
					// eslint-disable-next-line no-console
					console.debug( '[Aldus] record-use failed:', err );
				}
			} );
		},
		[ layouts ]
	);

	const startOver = useCallback( () => {
		setScreen( 'building' );
		setLayouts( [] );
		setIsGenerating( false );
		setPinnedPersonality( null );
		setIsPreview( false );
		setBuildingMode( 'content' );
	}, [] );

	// "Try with my content" — called from a pack preview LayoutCard.
	// Pins the personality and sends the user to the content tab.
	const tryWithMyContent = useCallback( ( personalityLabel ) => {
		setPinnedPersonality( personalityLabel );
		setScreen( 'building' );
		setBuildingMode( 'content' );
		setLayouts( [] );
	}, [] );

	// Confirm-guarded variants for button-triggered actions on the results screen.
	const requestStartOver = useCallback( () => {
		if ( screen === 'results' && layouts.length > 0 ) {
			setConfirmAction( 'startOver' );
		} else {
			startOver();
		}
	}, [ screen, layouts.length, startOver ] );

	const requestRegenerate = useCallback( () => {
		if ( layouts.length > 0 ) {
			setConfirmAction( 'regenerate' );
		} else {
			regenerate();
		}
	}, [ layouts.length, regenerate ] );

	// Abort an in-progress download or loading operation and return to building.
	const abortGenerate = useCallback( () => {
		if ( abortRef.current ) {
			abortRef.current();
			abortRef.current = null;
		}
		engineRef.current = null;
		setIsGenerating( false );
		setScreen( 'building' );
	}, [] );

	const startMixing = useCallback( () => setScreen( 'mixing' ), [] );

	const backToResults = useCallback( () => setScreen( 'results' ), [] );

	// Keyboard shortcut handlers — guards ensure they only fire on the relevant screen.
	useShortcut(
		'aldus/generate',
		useCallback(
			( event ) => {
				if ( screen !== 'building' || items.length === 0 ) {
					return;
				}
				event.preventDefault();
				generate();
			},
			[ screen, items.length, generate ]
		)
	);
	useShortcut(
		'aldus/cancel',
		useCallback(
			( event ) => {
				if (
					screen !== 'downloading' &&
					screen !== 'loading' &&
					screen !== 'results' &&
					screen !== 'error'
				) {
					return;
				}
				event.preventDefault();
				if ( screen === 'downloading' || screen === 'loading' ) {
					abortGenerate();
				} else {
					startOver();
				}
			},
			[ screen, startOver, abortGenerate ]
		)
	);
	useShortcut(
		'aldus/regen',
		useCallback(
			( event ) => {
				if ( screen !== 'results' ) {
					return;
				}
				event.preventDefault();
				regenerate();
			},
			[ screen, regenerate ]
		)
	);

	const insertMix = useCallback(
		( combinedBlocks ) => {
			let newBlocks;
			try {
				newBlocks = parseBlocks( combinedBlocks );
			} catch ( e ) {
				newBlocks = [];
			}
			if ( newBlocks.length > 0 ) {
				replaceBlocks( clientId, newBlocks );
				// Move editor focus to the first inserted block (item 20 — accessibility).
				const firstBlock = newBlocks[ 0 ];
				if ( firstBlock?.clientId ) {
					selectBlock( firstBlock.clientId );
				}
				wpDispatch( 'core/notices' ).createSuccessNotice(
					__( 'Layout inserted. Not quite right?', 'aldus' ),
					{
						actions: [
							{
								label: __( 'Undo', 'aldus' ),
								onClick: () =>
									wpDispatch( 'core/editor' ).undo(),
							},
						],
						type: 'snackbar',
						id: 'aldus-insert-undo',
					}
				);
			} else {
				setErrorCode( 'api_error' );
				setRetryCount( ( c ) => c + 1 );
				setScreen( 'error' );
			}
		},
		[ clientId, replaceBlocks, selectBlock ]
	);

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	return (
		<>
			<InspectorControls>
				{ /* Pass 8: Quick start presets panel */ }
				<PanelBody
					title={ __( 'Quick start', 'aldus' ) }
					initialOpen={ true }
				>
					<p className="aldus-panel-hint">
						{ __(
							'Load a starting point and edit from there.',
							'aldus'
						) }
					</p>
					{ PRESETS.map( ( preset ) => (
						<Button
							key={ preset.id }
							variant="secondary"
							className="aldus-preset-btn"
							onClick={ () => loadPreset( preset ) }
						>
							<span className="aldus-preset-name">
								{ preset.name }
							</span>
							<span className="aldus-preset-desc">
								{ preset.description }
							</span>
						</Button>
					) ) }
				</PanelBody>
				<PanelBody
					title={ __( 'Layout styles', 'aldus' ) }
					initialOpen={ false }
				>
					<p className="aldus-panel-hint">
						{ __(
							'Choose which personalities generate layouts for you.',
							'aldus'
						) }
					</p>
					{ showPersonalityWarning && (
						<Notice
							status="warning"
							isDismissible={ false }
							className="aldus-personality-warning"
						>
							{ __(
								'At least one personality is required.',
								'aldus'
							) }
						</Notice>
					) }
					{ [
						{
							label: __( 'Dramatic', 'aldus' ),
							names: [
								'Dispatch',
								'Nocturne',
								'Manifesto',
								'Dusk',
							],
						},
						{
							label: __( 'Editorial', 'aldus' ),
							names: [
								'Folio',
								'Codex',
								'Ledger',
								'Broadsheet',
								'Tribune',
							],
						},
						{
							label: __( 'Structural', 'aldus' ),
							names: [ 'Stratum', 'Solstice', 'Prism', 'Mosaic' ],
						},
						{
							label: __( 'Atmospheric', 'aldus' ),
							names: [ 'Mirage', 'Overture', 'Broadside' ],
						},
					].map( ( group ) => (
						<div
							key={ group.label }
							className="aldus-personality-group"
						>
							<p className="aldus-personality-group-label">
								{ group.label }
							</p>
							{ group.names.map( ( name ) => {
								const checked =
									enabledPersonalities.includes( name );
								const tagline = LAYOUT_TAGLINES[ name ] ?? '';
								return (
									<CheckboxControl
										key={ name }
										label={ name }
										help={ tagline }
										checked={ checked }
										onChange={ ( next ) => {
											const updated = next
												? [
														...enabledPersonalities,
														name,
												  ]
												: enabledPersonalities.filter(
														( n ) => n !== name
												  );
											if ( updated.length > 0 ) {
												setAttributes( {
													enabledPersonalities:
														updated,
												} );
												setShowPersonalityWarning(
													false
												);
												if (
													personalityWarningTimerRef.current
												) {
													clearTimeout(
														personalityWarningTimerRef.current
													);
													personalityWarningTimerRef.current =
														null;
												}
											} else {
												setShowPersonalityWarning(
													true
												);
												if (
													personalityWarningTimerRef.current
												) {
													clearTimeout(
														personalityWarningTimerRef.current
													);
												}
												personalityWarningTimerRef.current =
													setTimeout( () => {
														setShowPersonalityWarning(
															false
														);
														personalityWarningTimerRef.current =
															null;
													}, 2500 );
											}
										} }
										__nextHasNoMarginBottom
									/>
								);
							} ) }
						</div>
					) ) }
					{ themeColors.length > 0 && (
						<div className="aldus-theme-colors">
							<p className="aldus-panel-hint">
								{ __(
									'Aldus uses these colors in your layouts:',
									'aldus'
								) }
							</p>
							<div className="aldus-theme-color-swatches">
								{ themeColors.slice( 0, 10 ).map( ( color ) => (
									<span
										key={ color.slug }
										className="aldus-theme-color-swatch"
										style={ {
											backgroundColor: color.color,
										} }
										title={ color.name ?? color.slug }
									/>
								) ) }
							</div>
							<p className="aldus-theme-colors-caption">
								{ __(
									'Dark sections use the darkest color; accent sections use the most vivid.',
									'aldus'
								) }
							</p>
						</div>
					) }
				</PanelBody>
				<PanelBody
					title={ __( 'Content storage', 'aldus' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Store items in post meta', 'aldus' ) }
						help={ __(
							'Saves your content items alongside the layout so you can update them later without re-running generation.',
							'aldus'
						) }
						checked={ useMeta }
						onChange={ ( val ) =>
							setAttributes( { useMeta: val } )
						}
					/>
				</PanelBody>
			</InspectorControls>

			{ ( screen === 'results' || screen === 'loading' ) && (
				<BlockControls group="other">
					<ToolbarGroup>
						{ screen === 'results' && (
							<ToolbarButton
								icon={ undo }
								label={ __( 'Regenerate', 'aldus' ) }
								onClick={ requestRegenerate }
							/>
						) }
						<ToolbarButton
							icon={ close }
							label={ __( 'Start fresh', 'aldus' ) }
							onClick={ requestStartOver }
						/>
					</ToolbarGroup>
				</BlockControls>
			) }
			<BlockControls group="other">
				<ToolbarGroup>
					<ToolbarButton
						icon={ help }
						label={ __( 'How Aldus works', 'aldus' ) }
						onClick={ () => setShowHelp( true ) }
					/>
				</ToolbarGroup>
			</BlockControls>

			<div { ...blockProps }>
				{ /* Pass 6: screen wrapper for fade-in animation */ }
				{ screen === 'building' && (
					<div className="aldus-screen">
						<BuildingScreen
							items={ items }
							setItems={ setItems }
							addItem={ addItem }
							updateItem={ updateItem }
							removeItem={ removeItem }
							moveItem={ moveItem }
							reorderItems={ reorderItems }
							generate={ generate }
							isGenerating={ isGenerating }
							hasEngine={ !! engineRef.current }
							hasDownloadedModel={ hasDownloadedModel }
							lastFocusRef={ lastFocusRef }
							buildingMode={ buildingMode }
							setBuildingMode={ setBuildingMode }
							onPreview={ runPreview }
							styleNote={ styleNote }
							onStyleNoteChange={ setStyleNote }
							postTitle={ postTitle }
							postExcerpt={ postExcerpt }
							noWebGPU={ noWebGPU }
							editorBlocks={ editorBlocks }
							pinnedPersonality={ pinnedPersonality }
							onClearPinnedPersonality={ () =>
								setPinnedPersonality( null )
							}
							hasUsedAldus={ hasUsedAldus }
							markAldusUsed={ markAldusUsed }
						/>
					</div>
				) }
				{ screen === 'downloading' && (
					<div className="aldus-screen">
						<DownloadingScreen
							progress={ dlProgress }
							onAbort={ abortGenerate }
						/>
					</div>
				) }
				{ screen === 'loading' && (
					<div className="aldus-screen">
						<LoadingScreen
							message={ LOADING_MESSAGES[ msgIndex ] }
							msgVisible={ msgVisible }
							onAbort={ abortGenerate }
							genProgress={ genProgress }
						/>
					</div>
				) }
				{ screen === 'results' && (
					<div className="aldus-screen">
						<ResultsScreen
							layouts={ layouts }
							chooseLayout={ chooseLayout }
							startOver={ requestStartOver }
							regenerate={ requestRegenerate }
							isPreview={ isPreview }
							onReroll={ rerollLayout }
							rerollingLabel={ rerollingLabel }
							rerollErrors={ rerollErrors }
							onMix={ startMixing }
							onTryWithContent={
								isPreview ? tryWithMyContent : null
							}
							items={ items }
							packs={ PACK_META }
							activePreviewPack={ activePreviewPack }
							onSwitchPack={ runPreview }
						/>
					</div>
				) }
				{ screen === 'mixing' && (
					<div className="aldus-screen">
						<MixingScreen
							layouts={ layouts }
							onInsert={ insertMix }
							onBack={ backToResults }
						/>
					</div>
				) }
				{ screen === 'confirming' && (
					<div className="aldus-screen">
						<ConfirmingScreen
							label={
								layouts.find( ( l ) => l._chosen )?.label ?? ''
							}
						/>
					</div>
				) }
				{ screen === 'error' && (
					<div className="aldus-screen">
						<ErrorScreen
							code={ errorCode }
							retryCount={ retryCount }
							onRetry={ () => setScreen( 'building' ) }
							onRegenerate={ regenerate }
						/>
					</div>
				) }
				{ confirmAction && (
					<ConfirmDialog
						onConfirm={ () => {
							if ( confirmAction === 'startOver' ) {
								startOver();
							} else {
								regenerate();
							}
							setConfirmAction( null );
						} }
						onCancel={ () => setConfirmAction( null ) }
					>
						{ confirmAction === 'startOver'
							? sprintf(
									/* translators: %d is the number of layouts that will be discarded */
									_n(
										'Clear %d layout and start over?',
										'Clear all %d layouts and start over?',
										layouts.length,
										'aldus'
									),
									layouts.length
							  )
							: sprintf(
									/* translators: %d is the number of layouts that will be replaced */
									_n(
										'Regenerate and replace your %d layout with new ones?',
										'Regenerate and replace your %d layouts with new ones?',
										layouts.length,
										'aldus'
									),
									layouts.length
							  ) }
					</ConfirmDialog>
				) }
				{ showHelp && (
					<Modal
						title={ __( 'How Aldus works', 'aldus' ) }
						onRequestClose={ () => setShowHelp( false ) }
						className="aldus-help-modal"
					>
						<div className="aldus-help-steps">
							<div className="aldus-help-step">
								<span className="aldus-help-step-number">
									1
								</span>
								<div>
									<strong>
										{ __( "Add what you've got", 'aldus' ) }
									</strong>
									<p>
										{ __(
											"A headline, some body text, an image, a quote — whatever the page needs. Don't worry about layout.",
											'aldus'
										) }
									</p>
								</div>
							</div>
							<div className="aldus-help-step">
								<span className="aldus-help-step-number">
									2
								</span>
								<div>
									<strong>
										{ __(
											'Aldus does the design part',
											'aldus'
										) }
									</strong>
									<p>
										{ __(
											'It tries your content in sixteen different layout styles — editorial, cinematic, minimal, bold — each with its own structure and mood.',
											'aldus'
										) }
									</p>
								</div>
							</div>
							<div className="aldus-help-step">
								<span className="aldus-help-step-number">
									3
								</span>
								<div>
									<strong>
										{ __( 'Pick, edit, publish', 'aldus' ) }
									</strong>
									<p>
										{ __(
											'Choose the one that fits. It becomes real WordPress blocks you can edit, rearrange, or build on. No lock-in.',
											'aldus'
										) }
									</p>
								</div>
							</div>
						</div>
						<p className="aldus-help-tip">
							{ __(
								'Tip: Use the "Browse styles" tab to preview layouts instantly — no download needed.',
								'aldus'
							) }
						</p>
						<div className="aldus-help-shortcuts">
							<strong className="aldus-help-shortcuts-title">
								{ __( 'Keyboard shortcuts', 'aldus' ) }
							</strong>
							<ul className="aldus-help-shortcut-list">
								<li>
									<kbd className="aldus-kbd">⌘↵</kbd>
									<span>
										{ __( 'Generate layouts', 'aldus' ) }
									</span>
								</li>
								<li>
									<kbd className="aldus-kbd">⇧⌘R</kbd>
									<span>
										{ __( 'Regenerate layouts', 'aldus' ) }
									</span>
								</li>
								<li>
									<kbd className="aldus-kbd">Esc</kbd>
									<span>
										{ __( 'Cancel / go back', 'aldus' ) }
									</span>
								</li>
							</ul>
						</div>
					</Modal>
				) }
			</div>
		</>
	);
}

// ---------------------------------------------------------------------------
// Screen: Building
// ---------------------------------------------------------------------------

function BuildingScreen( {
	items,
	setItems,
	addItem,
	updateItem,
	removeItem,
	moveItem,
	reorderItems,
	generate,
	isGenerating,
	hasEngine,
	hasDownloadedModel,
	lastFocusRef,
	buildingMode,
	setBuildingMode,
	onPreview,
	styleNote,
	onStyleNoteChange,
	postTitle,
	postExcerpt,
	noWebGPU,
	editorBlocks,
	pinnedPersonality,
	onClearPinnedPersonality,
	hasUsedAldus,
	markAldusUsed,
} ) {
	const dragIdRef = useRef( null );
	const removeTimerRef = useRef( null );
	const emptyWarningTimerRef = useRef( null );
	const hasAutoFiredPreviewRef = useRef( false );
	useEffect( () => {
		if ( buildingMode === 'preview' && ! hasAutoFiredPreviewRef.current ) {
			hasAutoFiredPreviewRef.current = true;
			onPreview( PACK_META[ DEFAULT_PACK_INDEX ] );
		} else if ( buildingMode !== 'preview' ) {
			hasAutoFiredPreviewRef.current = false;
		}
	}, [ buildingMode, onPreview ] );
	const [ dragging, setDragging ] = useState( null );
	const [ dragOver, setDragOver ] = useState( null );
	const [ removingId, setRemovingId ] = useState( null ); // Pass 6: exit animation
	const [ hasReordered, setHasReordered ] = useState( false );
	const [ showEmptyWarning, setShowEmptyWarning ] = useState( false );
	const canGenerate = items.length > 0;
	const hasEmptyItems = items.some(
		( i ) =>
			! i.content.trim() &&
			i.type !== 'image' &&
			i.type !== 'gallery' &&
			i.type !== 'video'
	);

	// Clear pending timers on unmount.
	useEffect( () => {
		return () => {
			if ( emptyWarningTimerRef.current ) {
				clearTimeout( emptyWarningTimerRef.current );
			}
		};
	}, [] );

	// Check if the post title is already in the items list.
	const titleAlreadyAdded =
		postTitle.trim().length > 0 &&
		items.some(
			( i ) =>
				i.type === 'headline' && i.content.trim() === postTitle.trim()
		);

	const importFromPost = useCallback( () => {
		const newItems = [];
		if ( postTitle.trim() ) {
			newItems.push( { type: 'headline', content: postTitle.trim() } );
		}
		// Strip HTML tags, then decode HTML entities (e.g. &amp; &mdash; &nbsp;)
		// so the excerpt is clean plain text before passing to the model.
		const strippedExcerpt = postExcerpt.replace( /<[^>]*>/g, '' );
		const entityDecoder = document.createElement( 'textarea' );
		entityDecoder.innerHTML = strippedExcerpt;
		const cleanExcerpt = entityDecoder.value.trim();
		if ( cleanExcerpt ) {
			newItems.push( { type: 'paragraph', content: cleanExcerpt } );
		}
		if ( newItems.length > 0 ) {
			setItems( ( prev ) => [
				...prev,
				...newItems.map( ( i ) => ( { ...i, id: uid(), url: '' } ) ),
			] );
			markAldusUsed();
		}
	}, [ postTitle, postExcerpt, setItems, markAldusUsed ] );

	const importFromEditor = useCallback( () => {
		const newItems = [];

		const walk = ( blocks ) => {
			for ( const block of blocks ) {
				const name = block.name ?? '';
				const attrs = block.attributes ?? {};
				const inner = block.innerContent ?? [];
				const text = inner
					.filter( Boolean )
					.join( '' )
					.replace( /<[^>]*>/g, ' ' )
					.replace( /\s+/g, ' ' )
					.trim();

				if ( name === 'core/heading' && text ) {
					newItems.push( {
						type:
							( attrs.level ?? 2 ) <= 1
								? 'headline'
								: 'subheading',
						content: text,
					} );
				} else if ( name === 'core/paragraph' && text ) {
					newItems.push( { type: 'paragraph', content: text } );
				} else if (
					name === 'core/image' &&
					( attrs.url || attrs.src )
				) {
					newItems.push( {
						type: 'image',
						content: attrs.alt ?? '',
						url: attrs.url ?? attrs.src ?? '',
					} );
				} else if (
					name === 'core/quote' ||
					name === 'core/pullquote'
				) {
					const qText = ( block.innerBlocks ?? [] )
						.flatMap( ( b ) => b.innerContent ?? [] )
						.filter( Boolean )
						.join( '' )
						.replace( /<[^>]*>/g, ' ' )
						.replace( /\s+/g, ' ' )
						.trim();
					if ( qText ) {
						newItems.push( { type: 'quote', content: qText } );
					}
				} else if ( name === 'core/list' ) {
					const listText = ( block.innerBlocks ?? [] )
						.flatMap( ( b ) => b.innerContent ?? [] )
						.filter( Boolean )
						.join( '\n' )
						.replace( /<[^>]*>/g, '' )
						.replace( /\s+/g, ' ' )
						.trim();
					if ( listText ) {
						newItems.push( { type: 'list', content: listText } );
					}
				} else if ( name === 'core/buttons' ) {
					const btnText = ( block.innerBlocks ?? [] )
						.flatMap( ( b ) => b.innerContent ?? [] )
						.filter( Boolean )
						.join( '' )
						.replace( /<[^>]*>/g, '' )
						.replace( /\s+/g, ' ' )
						.trim();
					if ( btnText ) {
						newItems.push( {
							type: 'cta',
							content: btnText,
							url:
								block.innerBlocks?.[ 0 ]?.attributes?.url ??
								'#',
						} );
					}
				} else {
					walk( block.innerBlocks ?? [] );
				}
			}
		};

		walk( editorBlocks );

		if ( newItems.length > 0 ) {
			setItems( ( prev ) => [
				...prev,
				...newItems.map( ( i ) => ( {
					id: uid(),
					url: '',
					...i,
				} ) ),
			] );
		}
	}, [ editorBlocks, setItems ] );

	// Clear the removal timer if BuildingScreen unmounts mid-animation.
	useEffect( () => {
		return () => {
			if ( removeTimerRef.current ) {
				clearTimeout( removeTimerRef.current );
			}
		};
	}, [] );

	// Pass 6: animate removal before unmounting
	const handleRemove = useCallback(
		( id ) => {
			setRemovingId( id );
			removeTimerRef.current = setTimeout( () => {
				removeItem( id );
				setRemovingId( null );
			}, 150 );
		},
		[ removeItem ]
	);

	const handleDragStart = useCallback( ( id ) => {
		dragIdRef.current = id;
		requestAnimationFrame( () => setDragging( id ) );
	}, [] );

	const handleDragEnd = useCallback( () => {
		dragIdRef.current = null;
		setDragging( null );
		setDragOver( null );
	}, [] );

	const handleDragOver = useCallback( ( e, id ) => {
		if ( ! dragIdRef.current || dragIdRef.current === id ) {
			return;
		}
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		setDragOver( id );
	}, [] );

	const handleDrop = useCallback(
		( e, targetId ) => {
			e.preventDefault();
			const fromId = dragIdRef.current;
			if ( fromId && fromId !== targetId ) {
				reorderItems( fromId, targetId );
				setHasReordered( true );
			}
			dragIdRef.current = null;
			setDragging( null );
			setDragOver( null );
		},
		[ reorderItems ]
	);

	const handleGenerate = useCallback( () => {
		if ( hasEmptyItems ) {
			setShowEmptyWarning( true );
			if ( emptyWarningTimerRef.current ) {
				clearTimeout( emptyWarningTimerRef.current );
			}
			emptyWarningTimerRef.current = setTimeout( () => {
				setShowEmptyWarning( false );
				emptyWarningTimerRef.current = null;
			}, 4000 );
		}
		generate();
	}, [ hasEmptyItems, generate ] );

	return (
		<div className="aldus-builder">
			<header className="aldus-header">
				<div className="aldus-header-top">
					<span
						className="aldus-stamp"
						aria-label={ __( 'Aldus', 'aldus' ) }
					>
						aldus
					</span>
					{ buildingMode === 'content' && items.length > 0 && (
						<span className="aldus-item-count">
							{ sprintf(
								/* translators: %d is the number of content pieces added */
								_n(
									'%d piece',
									'%d pieces',
									items.length,
									'aldus'
								),
								items.length
							) }
						</span>
					) }
					<div className="aldus-header-actions">
						<SavedSessions
							items={ items }
							styleNote={ styleNote }
							onLoad={ ( loadedItems, loadedStyleNote ) => {
								setItems(
									loadedItems.map( ( i ) => ( {
										...i,
										id: uid(),
									} ) )
								);
								if ( loadedStyleNote !== undefined ) {
									onStyleNoteChange( loadedStyleNote );
								}
							} }
						/>
					</div>
				</div>

				{ /* Mode tabs */ }
				<div className="aldus-mode-tabs" role="tablist">
					<button
						role="tab"
						aria-selected={ buildingMode === 'content' }
						className={ `aldus-mode-tab ${
							buildingMode === 'content' ? 'is-active' : ''
						}` }
						onClick={ () => setBuildingMode( 'content' ) }
					>
						{ __( 'Your content', 'aldus' ) }
					</button>
					<button
						role="tab"
						aria-selected={ buildingMode === 'preview' }
						className={ `aldus-mode-tab ${
							buildingMode === 'preview' ? 'is-active' : ''
						}` }
						onClick={ () => setBuildingMode( 'preview' ) }
					>
						{ __( 'Browse styles', 'aldus' ) }
					</button>
				</div>
			</header>

			{ buildingMode === 'content' && (
				<>
					{ noWebGPU && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'Your browser doesn\'t support WebGPU — you can still browse sample layouts in the "Try the personalities" tab.',
								'aldus'
							) }
						</Notice>
					) }
					{ items.length === 0 && (
						<EmptyState
							onAdd={ addItem }
							postTitle={ postTitle }
							onImport={ importFromPost }
							editorBlocks={ editorBlocks }
							onImportFromEditor={ importFromEditor }
							hasUsedAldus={ hasUsedAldus }
							markAldusUsed={ markAldusUsed }
						/>
					) }

					{ items.length > 0 && (
						<>
							<p className="aldus-section-label">
								{ __( 'Your content', 'aldus' ) }
							</p>
							<div
								className="aldus-item-list"
								role="list"
								aria-label={ __( 'Content items', 'aldus' ) }
							>
								{ items.map( ( item, index ) => (
									<ContentItem
										key={ item.id }
										item={ item }
										index={ index }
										total={ items.length }
										shouldFocus={
											lastFocusRef.current === item.id
										}
										onUpdate={ ( patch ) =>
											updateItem( item.id, patch )
										}
										onRemove={ () =>
											handleRemove( item.id )
										}
										onMoveUp={ () =>
											moveItem( item.id, -1 )
										}
										onMoveDown={ () =>
											moveItem( item.id, 1 )
										}
										onDragStart={ () =>
											handleDragStart( item.id )
										}
										onDragEnd={ handleDragEnd }
										onDragOver={ ( e ) =>
											handleDragOver( e, item.id )
										}
										onDragLeave={ () =>
											setDragOver( null )
										}
										onDrop={ ( e ) =>
											handleDrop( e, item.id )
										}
										isDragging={ dragging === item.id }
										isDragOver={
											dragOver === item.id &&
											dragging !== item.id
										}
										isRemoving={ removingId === item.id }
									/>
								) ) }
							</div>
							{ items.length >= 3 && ! hasReordered && (
								<p className="aldus-reorder-hint">
									{ __(
										'Drag the handle ↕ to reorder items.',
										'aldus'
									) }
								</p>
							) }
						</>
					) }

					{ items.length > 0 && (
						<CompletenessHints items={ items } onAdd={ addItem } />
					) }

					{ items.length > 0 && <ContentMinimap items={ items } /> }

					{ items.length > 0 &&
						postTitle.trim().length > 0 &&
						! titleAlreadyAdded && (
							<Button
								variant="tertiary"
								size="small"
								className="aldus-import-post-btn"
								onClick={ importFromPost }
							>
								{ __( '+ Add post title as content', 'aldus' ) }
							</Button>
						) }

					{ editorBlocks?.length > 0 && (
						<Button
							variant="tertiary"
							size="small"
							className="aldus-import-post-btn"
							onClick={ importFromEditor }
						>
							{ __( '+ Import content from this page', 'aldus' ) }
						</Button>
					) }

					{ /* Item 3: Trailing + button replaces the dedicated Add content row */ }
					{ items.length > 0 && (
						<div className="aldus-add-after-list">
							<AddContentPopover onAdd={ addItem } isInline />
						</div>
					) }

					{ items.length > 0 && (
						<StyleNoteField
							value={ styleNote }
							onChange={ onStyleNoteChange }
						/>
					) }

					{ showEmptyWarning && (
						<Notice
							status="warning"
							isDismissible={ false }
							className="aldus-empty-content-warning"
						>
							{ __(
								'Some items have no content yet — fill them in for better results.',
								'aldus'
							) }
						</Notice>
					) }

					{ pinnedPersonality && (
						<div className="aldus-pinned-personality">
							<span>
								{ sprintf(
									/* translators: %s: personality name */
									__(
										'Leading with %s when you generate',
										'aldus'
									),
									pinnedPersonality
								) }
							</span>
							<Button
								icon={ close }
								label={ __( 'Remove focus', 'aldus' ) }
								size="small"
								onClick={ onClearPinnedPersonality }
							/>
						</div>
					) }

					{ /* Item 19: QuickPeek compact strip — just above the generate button */ }
					{ items.length > 0 && <QuickPeek items={ items } /> }

					{ items.length > 0 && (
						<div className="aldus-generate-row">
							<Button
								variant="primary"
								onClick={ handleGenerate }
								disabled={
									! canGenerate || isGenerating || noWebGPU
								}
								className="aldus-generate-btn"
							>
								{ isGenerating && <Spinner /> }
								{ ! isGenerating &&
									( noWebGPU
										? __( 'Requires WebGPU', 'aldus' )
										: __( 'Make it happen', 'aldus' ) ) }
								{ ! isGenerating && ! noWebGPU && (
									<kbd className="aldus-kbd">⌘↵</kbd>
								) }
							</Button>
							{ ! hasEngine &&
								canGenerate &&
								! hasDownloadedModel && (
									<span className="aldus-hint aldus-hint--download">
										{ __(
											'First run downloads a small AI model (~200 MB, one time only). After that, Aldus works instantly — even offline.',
											'aldus'
										) }
									</span>
								) }
						</div>
					) }
				</>
			) }
		</div>
	);
}

// ---------------------------------------------------------------------------
// Pass 7: Empty state with content type grid
// ---------------------------------------------------------------------------

function EmptyState( {
	onAdd,
	postTitle,
	onImport,
	editorBlocks,
	onImportFromEditor,
	hasUsedAldus,
	markAldusUsed,
} ) {
	const [ showTypes, setShowTypes ] = useState( false );
	const [ showSecondary, setShowSecondary ] = useState( false );

	// First-time users see a simplified two-path screen.
	// Once they've used Aldus (or click "Start fresh"), the full type grid appears.
	const isFirstRun = ! hasUsedAldus && ! showTypes;

	const handleImport = () => {
		markAldusUsed?.();
		onImport?.();
	};

	const handleStartFresh = () => {
		markAldusUsed?.();
		setShowTypes( true );
	};

	if ( isFirstRun ) {
		return (
			<div className="aldus-empty aldus-empty--onboarding">
				<p className="aldus-empty-headline">
					{ __( 'What do you want to say?', 'aldus' ) }
				</p>
				<p className="aldus-empty-sub">
					{ __(
						'Add a headline, some text, maybe an image — Aldus will show you sixteen ways to arrange it.',
						'aldus'
					) }
				</p>
				<div className="aldus-onboarding-paths">
					{ postTitle?.trim().length > 0 && (
						<button
							className="aldus-onboarding-path aldus-onboarding-path--primary"
							onClick={ handleImport }
						>
							<span className="aldus-onboarding-path-icon">
								↑
							</span>
							<strong>
								{ sprintf(
									/* translators: %s is the post title */
									__( 'Use "%s"', 'aldus' ),
									postTitle.trim().length > 30
										? postTitle.trim().slice( 0, 30 ) + '…'
										: postTitle.trim()
								) }
							</strong>
							<span className="aldus-onboarding-path-hint">
								{ __(
									'Auto-imports your post title and excerpt',
									'aldus'
								) }
							</span>
						</button>
					) }
					<button
						className="aldus-onboarding-path"
						onClick={ handleStartFresh }
					>
						<span className="aldus-onboarding-path-icon">+</span>
						<strong>{ __( 'Start fresh', 'aldus' ) }</strong>
						<span className="aldus-onboarding-path-hint">
							{ __( 'Add your content piece by piece', 'aldus' ) }
						</span>
					</button>
				</div>
			</div>
		);
	}

	const truncatedTitle =
		postTitle?.trim().length > 40
			? postTitle.trim().slice( 0, 40 ) + '…'
			: postTitle?.trim();
	const hasImportOptions =
		postTitle?.trim().length > 0 || editorBlocks?.length > 0;

	return (
		<div className="aldus-empty">
			<p className="aldus-empty-headline">
				{ __( 'What do you want to say?', 'aldus' ) }
			</p>
			<p className="aldus-empty-sub">
				{ __(
					'Add a headline, some text, maybe an image — Aldus will show you sixteen ways to arrange it.',
					'aldus'
				) }
			</p>
			{ /* Tiered inserter — primary types always visible, secondary behind disclosure */ }
			<div className="aldus-empty-types">
				{ PRIMARY_CONTENT_TYPES.map( ( t ) => (
					<button
						key={ t.type }
						className="aldus-empty-type aldus-empty-type--primary"
						onClick={ () => onAdd?.( t.type ) }
						aria-label={ sprintf(
							/* translators: %s is a content type, e.g. "Image". */
							__( 'Add %s', 'aldus' ),
							t.label
						) }
					>
						<Icon icon={ t.icon } size={ 16 } />
						<span>{ t.label }</span>
					</button>
				) ) }
			</div>
			{ ! showSecondary ? (
				<button
					className="aldus-more-types-trigger"
					onClick={ () => setShowSecondary( true ) }
				>
					{ __( 'More types ▾', 'aldus' ) }
				</button>
			) : (
				<div className="aldus-empty-types aldus-empty-types--secondary">
					{ SECONDARY_CONTENT_TYPES.map( ( t ) => (
						<button
							key={ t.type }
							className="aldus-empty-type"
							onClick={ () => onAdd?.( t.type ) }
							aria-label={ sprintf(
								/* translators: %s is a content type, e.g. "Table". */
								__( 'Add %s', 'aldus' ),
								t.label
							) }
						>
							<Icon icon={ t.icon } size={ 16 } />
							<span>{ t.label }</span>
						</button>
					) ) }
				</div>
			) }
			{ /* Import options as secondary path, below a divider */ }
			{ hasImportOptions && (
				<div className="aldus-empty-divider">
					<span>{ __( 'or start from something', 'aldus' ) }</span>
				</div>
			) }
			{ postTitle?.trim().length > 0 && (
				<Button
					variant="tertiary"
					className="aldus-import-post-btn aldus-import-post-btn--empty"
					onClick={ onImport }
				>
					{ sprintf(
						/* translators: %s is the post title, e.g. "My Blog Post". */
						__( 'Use "%s" as headline', 'aldus' ),
						truncatedTitle
					) }
				</Button>
			) }
			{ editorBlocks?.length > 0 && (
				<Button
					variant="tertiary"
					className="aldus-import-post-btn aldus-import-post-btn--empty"
					onClick={ onImportFromEditor }
				>
					{ __( 'Import content from this page', 'aldus' ) }
				</Button>
			) }
		</div>
	);
}

// ---------------------------------------------------------------------------
// Pass 1: AddContentPopover — replaces flat add-button row
// ---------------------------------------------------------------------------

function AddContentPopover( { onAdd, isInline = false } ) {
	const [ isOpen, setIsOpen ] = useState( false );
	const [ showSecondary, setShowSecondary ] = useState( false );
	const wrapRef = useRef( null );

	const renderTypeList = ( types, isSecondaryGroup = false ) =>
		types.map( ( t ) => (
			<button
				key={ t.type }
				className={ `aldus-inserter-item${
					isSecondaryGroup ? ' aldus-inserter-item--secondary' : ''
				}` }
				onClick={ () => {
					onAdd( t.type );
					setIsOpen( false );
					setShowSecondary( false );
				} }
			>
				<span className="aldus-inserter-icon">
					<Icon icon={ t.icon } size={ 20 } />
				</span>
				<span className="aldus-inserter-label">{ t.label }</span>
				<span className="aldus-inserter-desc">{ t.description }</span>
			</button>
		) );

	return (
		<div
			className={ `aldus-add-wrap${
				isInline ? ' aldus-add-wrap--inline' : ''
			}` }
			ref={ wrapRef }
		>
			<Button
				icon={ plus }
				variant={ isInline ? 'tertiary' : 'secondary' }
				className={ `aldus-add-trigger${
					isInline ? ' aldus-add-trigger--inline' : ''
				}` }
				onClick={ () => {
					setIsOpen( ( v ) => ! v );
					setShowSecondary( false );
				} }
				aria-expanded={ isOpen }
				label={ isInline ? __( 'Add content', 'aldus' ) : undefined }
			>
				{ ! isInline && __( 'Add content', 'aldus' ) }
			</Button>
			{ isOpen && (
				<Popover
					anchor={ wrapRef.current }
					placement="bottom-start"
					onClose={ () => {
						setIsOpen( false );
						setShowSecondary( false );
					} }
					noArrow
				>
					<div className="aldus-inserter">
						{ renderTypeList( PRIMARY_CONTENT_TYPES ) }
						{ showSecondary ? (
							renderTypeList( SECONDARY_CONTENT_TYPES, true )
						) : (
							<button
								className="aldus-inserter-more"
								onClick={ () => setShowSecondary( true ) }
							>
								{ __( 'More types ▾', 'aldus' ) }
							</button>
						) }
					</div>
				</Popover>
			) }
		</div>
	);
}

// ---------------------------------------------------------------------------
// Completeness hints — tell the user which content types unlock more sections
// ---------------------------------------------------------------------------

function CompletenessHints( { items, onAdd } ) {
	const presentTypes = useMemo(
		() => new Set( items.map( ( i ) => i.type ) ),
		[ items ]
	);

	const hints = useMemo( () => {
		// Count how many distinct layouts contain a token requiring each missing content type.
		const layoutCounts = {};
		for ( const p of ACTIVE_PERSONALITIES ) {
			// Flatten all example sequences for this personality into a deduplicated token set.
			const allTokens = new Set( ( p.exampleSequences ?? [] ).flat() );
			const missingForThisPersonality = new Set();
			for ( const token of allTokens ) {
				const required = TOKEN_CONTENT_REQUIREMENTS[ token ];
				if ( required && ! presentTypes.has( required ) ) {
					missingForThisPersonality.add( required );
				}
			}
			for ( const type of missingForThisPersonality ) {
				layoutCounts[ type ] = ( layoutCounts[ type ] ?? 0 ) + 1;
			}
		}
		return Object.entries( layoutCounts )
			.sort( ( a, b ) => b[ 1 ] - a[ 1 ] )
			.slice( 0, 3 );
	}, [ presentTypes ] );

	if ( hints.length === 0 ) {
		return null;
	}

	return (
		<div
			className="aldus-hints"
			aria-label={ __( 'Content suggestions', 'aldus' ) }
		>
			{ hints.map( ( [ type ] ) => (
				<button
					key={ type }
					className="aldus-hint-pill"
					onClick={ () => onAdd( type ) }
				>
					<span className="aldus-hint-pill-plus">+</span>
					{ sprintf(
						/* translators: 1: content type label e.g. "Image", 2: outcome description */
						__( '%1$s → %2$s', 'aldus' ),
						HINT_TYPE_LABELS[ type ] ?? type,
						HINT_TYPE_OUTCOMES[ type ] ?? type
					) }
				</button>
			) ) }
		</div>
	);
}

// ---------------------------------------------------------------------------
// Scan-all wireframes — instant structural grid for all personalities
// ---------------------------------------------------------------------------

/**
 * Renders a 4-column grid of layout wireframes for every active personality
 * using their first exampleSequences entry.  No API call is made.
 */
function ScanAllWireframes() {
	// Sequences are chosen once when this panel mounts, not on every re-render.
	// Using useMemo with an empty dep array gives stable wireframes during the
	// user's inspection session; they see a fresh random pick each time they
	// open the panel (component unmounts/remounts on toggle).
	const sequences = useMemo(
		() =>
			ACTIVE_PERSONALITIES.map( ( p ) => {
				const seqs =
					p.exampleSequences?.length > 0
						? p.exampleSequences
						: [ p.anchors ];
				return seqs[ Math.floor( Math.random() * seqs.length ) ];
			} ),
		[] // eslint-disable-line react-hooks/exhaustive-deps
	);

	return (
		<div className="aldus-scan-all">
			<p className="aldus-scan-all-hint">
				{ __(
					'Structural previews — these show layout shape, not your content.',
					'aldus'
				) }
			</p>
			<div className="aldus-scan-all-grid">
				{ ACTIVE_PERSONALITIES.map( ( p, idx ) => (
					<div key={ p.name } className="aldus-scan-all-card">
						<LayoutWireframe tokens={ sequences[ idx ] } />
						<span className="aldus-scan-all-label">{ p.name }</span>
					</div>
				) ) }
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Quick peek — instant no-model personality preview with user content
// ---------------------------------------------------------------------------

function QuickPeek( { items } ) {
	const [ peekPersonality, setPeekPersonality ] = useState( null );
	const [ peekBlocks, setPeekBlocks ] = useState( null );
	const [ isPeeking, setIsPeeking ] = useState( false );
	const [ showScanAll, setShowScanAll ] = useState( false );
	const [ showAllPills, setShowAllPills ] = useState( false );
	// Monotonically increasing counter so stale responses from earlier requests
	// are discarded when a newer request is in flight.
	const peekRequestIdRef = useRef( 0 );

	// Pick 5 personalities to show in the compact strip.
	// Stabilised per-mount so the user sees the same set during their session.
	const compactPersonalities = useMemo( () => {
		const shuffled = [ ...ACTIVE_PERSONALITIES ].sort(
			() => Math.random() - 0.5
		);
		return shuffled.slice( 0, 5 );
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	const handlePeek = useCallback(
		async ( personality ) => {
			if ( isPeeking ) {
				return;
			}
			// Toggle off if the same personality is clicked again.
			if (
				peekPersonality &&
				peekPersonality.name === personality.name &&
				peekBlocks
			) {
				setPeekPersonality( null );
				setPeekBlocks( null );
				return;
			}
			const requestId = ++peekRequestIdRef.current;
			setPeekPersonality( personality );
			setPeekBlocks( null );
			setIsPeeking( true );
			try {
				const seqs =
					personality.exampleSequences?.length > 0
						? personality.exampleSequences
						: [ personality.anchors ];
				const seq = seqs[ Math.floor( Math.random() * seqs.length ) ];
				const result = await apiFetch( {
					path: '/aldus/v1/assemble',
					method: 'POST',
					data: {
						items,
						personality: personality.name,
						tokens: seq,
					},
				} );
				// Discard stale responses if a newer request has since been issued.
				if ( requestId !== peekRequestIdRef.current ) {
					return;
				}
				if ( result?.success && result?.blocks ) {
					setPeekBlocks( result.blocks );
				}
			} catch {
				if ( requestId === peekRequestIdRef.current ) {
					setPeekBlocks( null );
				}
			} finally {
				if ( requestId === peekRequestIdRef.current ) {
					setIsPeeking( false );
				}
			}
		},
		[ isPeeking, peekPersonality, peekBlocks, items ]
	);

	const parsedBlocks = useMemo( () => {
		if ( ! peekBlocks ) {
			return [];
		}
		try {
			return parseBlocks( peekBlocks );
		} catch ( e ) {
			return [];
		}
	}, [ peekBlocks ] );

	const pillsToShow = showAllPills
		? ACTIVE_PERSONALITIES
		: compactPersonalities;

	return (
		<div className="aldus-quick-peek aldus-quick-peek--compact">
			<div className="aldus-peek-header">
				<span className="aldus-peek-label">
					{ __( 'Peek →', 'aldus' ) }
				</span>
				<div
					className="aldus-peek-chips"
					role="group"
					aria-label={ __( 'Personality quick peek', 'aldus' ) }
				>
					{ pillsToShow.map( ( p ) => (
						<button
							key={ p.name }
							className={ [
								'aldus-peek-chip',
								peekPersonality?.name === p.name
									? 'is-active'
									: '',
							]
								.filter( Boolean )
								.join( ' ' ) }
							onClick={ () => handlePeek( p ) }
							disabled={ isPeeking }
							title={ p.description }
						>
							{ p.name }
						</button>
					) ) }
					<button
						className="aldus-peek-more"
						onClick={ () => {
							setShowAllPills( ( v ) => ! v );
							setShowScanAll( false );
						} }
					>
						{ showAllPills
							? __( 'Less', 'aldus' )
							: __( 'All →', 'aldus' ) }
					</button>
				</div>
				{ ! showAllPills && (
					<button
						className={ [
							'aldus-scan-all-btn',
							showScanAll ? 'is-active' : '',
						]
							.filter( Boolean )
							.join( ' ' ) }
						onClick={ () => {
							setShowScanAll( ( v ) => ! v );
							setShowAllPills( false );
						} }
						title={ __(
							'See layout shapes for all personalities',
							'aldus'
						) }
					>
						{ showScanAll
							? __( 'Hide', 'aldus' )
							: __( 'Scan all', 'aldus' ) }
					</button>
				) }
			</div>
			{ showScanAll && <ScanAllWireframes /> }
			{ isPeeking && (
				<div className="aldus-peek-loading">
					<Spinner />
					<span>
						{ sprintf(
							/* translators: %s: personality name */
							__( 'Assembling %s…', 'aldus' ),
							peekPersonality?.name ?? ''
						) }
					</span>
				</div>
			) }
			{ peekBlocks && parsedBlocks.length > 0 && (
				<div className="aldus-peek-preview">
					<BlockPreview
						blocks={ parsedBlocks }
						viewportWidth={ 800 }
					/>
				</div>
			) }
		</div>
	);
}

// ---------------------------------------------------------------------------
// Content preview drawer — shows user items as raw block previews
// ---------------------------------------------------------------------------

function itemsToBlocks( items ) {
	return items
		.map( ( item ) => {
			switch ( item.type ) {
				case 'headline':
					return {
						name: 'core/heading',
						isValid: true,
						attributes: { level: 1, content: item.content ?? '' },
						innerBlocks: [],
					};
				case 'subheading':
					return {
						name: 'core/heading',
						isValid: true,
						attributes: { level: 2, content: item.content ?? '' },
						innerBlocks: [],
					};
				case 'paragraph':
					return {
						name: 'core/paragraph',
						isValid: true,
						attributes: { content: item.content ?? '' },
						innerBlocks: [],
					};
				case 'quote':
					return {
						name: 'core/quote',
						isValid: true,
						attributes: { value: item.content ?? '' },
						innerBlocks: [],
					};
				case 'image':
					return item.url
						? {
								name: 'core/image',
								isValid: true,
								attributes: { url: item.url, alt: '' },
								innerBlocks: [],
						  }
						: null;
				case 'list':
					return {
						name: 'core/paragraph',
						isValid: true,
						attributes: {
							content: `[List] ${ item.content ?? '' }`,
						},
						innerBlocks: [],
					};
				case 'cta':
					return {
						name: 'core/buttons',
						isValid: true,
						attributes: {},
						innerBlocks: [
							{
								name: 'core/button',
								isValid: true,
								attributes: { text: item.content ?? 'CTA' },
								innerBlocks: [],
							},
						],
					};
				case 'video':
					return item.url
						? {
								name: 'core/embed',
								isValid: true,
								attributes: {
									url: item.url,
									providerNameSlug: 'youtube',
								},
								innerBlocks: [],
						  }
						: null;
				case 'table':
					return {
						name: 'core/table',
						isValid: true,
						attributes: { caption: '' },
						innerBlocks: [],
					};
				case 'gallery':
					return ( item.urls ?? [] ).length > 0
						? {
								name: 'core/gallery',
								isValid: true,
								attributes: { columns: 2 },
								innerBlocks: ( item.urls ?? [] ).map(
									( url ) => ( {
										name: 'core/image',
										isValid: true,
										attributes: { url },
										innerBlocks: [],
									} )
								),
						  }
						: null;
				default:
					return null;
			}
		} )
		.filter( Boolean );
}

/**
 * Persistent minimap strip — a zoomed-out non-interactive preview of the user's
 * content items, always visible without requiring a click.
 *
 * @param {Object} props
 * @param {Array}  props.items Content items to preview.
 * @return {null|Element} The minimap or null when there is nothing to show.
 */
function ContentMinimap( { items } ) {
	const blocks = useMemo( () => itemsToBlocks( items ), [ items ] );
	if ( blocks.length === 0 ) {
		return null;
	}
	return (
		<div className="aldus-minimap" aria-hidden="true">
			<BlockPreview blocks={ blocks } viewportWidth={ 900 } />
		</div>
	);
}

// ---------------------------------------------------------------------------
// Style note — optional free-text prompt hint threaded to LLM
// ---------------------------------------------------------------------------

const STYLE_CHIPS = [
	{ label: __( 'Image-forward', 'aldus' ), value: 'image-lead' },
	{ label: __( 'Text-heavy', 'aldus' ), value: 'text-first' },
	{ label: __( 'Minimal', 'aldus' ), value: 'minimal' },
	{ label: __( 'Bold CTA', 'aldus' ), value: 'cta-focus' },
	{ label: __( 'Dark mood', 'aldus' ), value: 'dark' },
	{ label: __( 'Magazine', 'aldus' ), value: 'magazine' },
];

function StyleNoteField( { value, onChange } ) {
	const [ expanded, setExpanded ] = useState( false );

	const appendChip = ( chipValue ) => {
		const current = value.trim();
		onChange( current ? current + ', ' + chipValue : chipValue );
		setExpanded( true );
	};

	if ( ! expanded && ! value ) {
		return (
			<div>
				<button
					className="aldus-style-note-trigger"
					onClick={ () => setExpanded( true ) }
				>
					{ __( 'Any special instructions? (optional)', 'aldus' ) }
				</button>
				<div className="aldus-style-chips">
					{ STYLE_CHIPS.map( ( chip ) => (
						<button
							key={ chip.value }
							className="aldus-style-chip"
							onClick={ () => appendChip( chip.value ) }
						>
							{ chip.label }
						</button>
					) ) }
				</div>
			</div>
		);
	}

	return (
		<div className="aldus-style-note">
			<div className="aldus-style-chips">
				{ STYLE_CHIPS.map( ( chip ) => (
					<button
						key={ chip.value }
						className="aldus-style-chip"
						onClick={ () => appendChip( chip.value ) }
					>
						{ chip.label }
					</button>
				) ) }
			</div>
			<TextareaControl
				label={ __( 'Special instructions', 'aldus' ) }
				hideLabelFromVision
				value={ value }
				placeholder={ __(
					'E.g. "lead with the image", "keep it minimal", "bold call to action"…',
					'aldus'
				) }
				onChange={ onChange }
				rows={ 2 }
				__nextHasNoMarginBottom
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Saved sessions — localStorage snapshots of item sets
// ---------------------------------------------------------------------------

function SavedSessions( { items, styleNote, onLoad } ) {
	const [ isOpen, setIsOpen ] = useState( false );
	const [ saveName, setSaveName ] = useState( '' );
	const wrapRef = useRef( null );

	// Persist sessions in the WP preferences store — no raw localStorage access.
	const sessions = useSelect(
		( select ) =>
			select( preferencesStore ).get( 'aldus', 'sessions' ) ?? [],
		[]
	);
	const { set: setPref } = useDispatch( preferencesStore );

	// Capture post context to attach to saved sessions.
	const { postTitle, postId } = useSelect( ( select ) => {
		const editor = select( 'core/editor' );
		return {
			postTitle: editor?.getEditedPostAttribute( 'title' ) ?? '',
			postId: editor?.getEditedPostAttribute( 'id' ) ?? null,
		};
	}, [] );

	const autoName = sprintf(
		/* translators: %s: date string, e.g. "Mar 23" */
		__( 'Set — %s', 'aldus' ),
		dateI18n( 'M j', new Date() )
	);

	const saveSession = useCallback( () => {
		const name = saveName.trim() || autoName;
		const updated = [
			{
				name,
				items,
				styleNote: styleNote || null,
				savedAt: Date.now(),
				postTitle: postTitle || null,
				postId: postId || null,
			},
			...sessions,
		].slice( 0, 10 );
		setPref( 'aldus', 'sessions', updated );
		setSaveName( '' );
	}, [
		items,
		styleNote,
		sessions,
		saveName,
		autoName,
		postTitle,
		postId,
		setPref,
	] );

	const deleteSession = useCallback(
		( idx ) => {
			const updated = sessions.filter( ( _, i ) => i !== idx );
			setPref( 'aldus', 'sessions', updated );
		},
		[ sessions, setPref ]
	);

	return (
		<div ref={ wrapRef } className="aldus-saved-sessions-wrap">
			<Button
				variant="tertiary"
				size="small"
				className="aldus-saved-btn"
				onClick={ () => setIsOpen( ( v ) => ! v ) }
				aria-expanded={ isOpen }
			>
				{ sessions.length > 0
					? sprintf(
							/* translators: %d is the number of saved sessions. */
							_n(
								'Saved (%d)',
								'Saved (%d)',
								sessions.length,
								'aldus'
							),
							sessions.length
					  )
					: __( 'Saved', 'aldus' ) }
			</Button>
			{ isOpen && (
				<Popover
					anchor={ wrapRef.current }
					placement="bottom-end"
					onClose={ () => setIsOpen( false ) }
					noArrow
				>
					<div className="aldus-sessions">
						<div className="aldus-sessions-header">
							<span className="aldus-sessions-title">
								{ __( 'Saved sets', 'aldus' ) }
							</span>
							{ items.length > 0 && (
								<Button
									variant="secondary"
									size="small"
									onClick={ saveSession }
								>
									{ __( 'Save current', 'aldus' ) }
								</Button>
							) }
						</div>
						{ items.length > 0 && (
							<div className="aldus-sessions-name-row">
								<TextControl
									value={ saveName }
									placeholder={ autoName }
									onChange={ setSaveName }
									hideLabelFromVision
									label={ __( 'Session name', 'aldus' ) }
									__nextHasNoMarginBottom
								/>
							</div>
						) }
						{ sessions.length === 0 && (
							<p className="aldus-sessions-empty">
								{ __( 'No saved sets yet.', 'aldus' ) }
							</p>
						) }
						{ sessions.map( ( session, i ) => (
							<div
								key={ session.savedAt }
								className="aldus-session-row"
							>
								<button
									className="aldus-session-load"
									onClick={ () => {
										onLoad(
											validateSavedItems( session.items ),
											session.styleNote ?? ''
										);
										setIsOpen( false );
									} }
								>
									<span className="aldus-session-name">
										{ session.name }
									</span>
									<span className="aldus-session-date">
										{ dateI18n(
											'M j, Y',
											session.savedAt
										) }
										{ session.postTitle && (
											<>
												{ ' · ' }
												{ session.postTitle.length > 24
													? session.postTitle.slice(
															0,
															24
													  ) + '…'
													: session.postTitle }
											</>
										) }
									</span>
								</button>
								<Button
									icon={ close }
									label={ __( 'Delete', 'aldus' ) }
									size="small"
									isDestructive
									onClick={ () => deleteSession( i ) }
								/>
							</div>
						) ) }
					</div>
				</Popover>
			) }
		</div>
	);
}

// ---------------------------------------------------------------------------
// Content item card
// ---------------------------------------------------------------------------

function ContentItem( {
	item,
	index,
	total,
	shouldFocus,
	onUpdate,
	onRemove,
	onMoveUp,
	onMoveDown,
	onDragStart,
	onDragEnd,
	onDragOver,
	onDragLeave,
	onDrop,
	isDragging,
	isDragOver,
	isRemoving,
} ) {
	const inputRef = useFocusOnMount( shouldFocus );
	const meta = TYPE_META[ item.type ] ?? {};

	// Pass 5: content preview in badge
	const preview = item.content
		? item.content.slice( 0, 28 ) + ( item.content.length > 28 ? '…' : '' )
		: '';

	const classes = [
		'aldus-item',
		`aldus-item--${ item.type }`,
		isDragging ? 'is-dragging' : '',
		isDragOver ? 'is-drag-over' : '',
		isRemoving ? 'is-removing' : '',
	]
		.filter( Boolean )
		.join( ' ' );

	return (
		<div
			className={ classes }
			role="listitem"
			onDragOver={ onDragOver }
			onDragLeave={ onDragLeave }
			onDrop={ onDrop }
		>
			<div
				className="aldus-drag-zone"
				draggable="true"
				aria-hidden="true"
				onDragStart={ ( e ) => {
					e.dataTransfer.effectAllowed = 'move';
					e.dataTransfer.setData( 'text/plain', item.id );
					onDragStart();
				} }
				onDragEnd={ onDragEnd }
			>
				<Button
					icon={ dragHandle }
					label={ __( 'Drag to reorder', 'aldus' ) }
					size="small"
					className="aldus-drag-btn"
					tabIndex={ -1 }
				/>
			</div>

			<span
				className={ `aldus-type-badge aldus-type-badge--${ item.type }` }
				aria-hidden="true"
			>
				{ meta.label }
				{ /* Pass 5: truncated content preview */ }
				{ preview && (
					<span className="aldus-badge-preview">
						&nbsp;—&nbsp;{ preview }
					</span>
				) }
			</span>

			<div className="aldus-item-input">
				{ meta.input === 'text' && (
					<TextControl
						ref={ inputRef }
						label={ meta.label }
						hideLabelFromVision
						value={ item.content }
						placeholder={ meta.placeholder }
						onChange={ ( val ) => onUpdate( { content: val } ) }
						help={
							! item.content
								? {
										headline: __(
											'Aim for 5–10 words',
											'aldus'
										),
										subheading: __(
											'Aim for 5–10 words',
											'aldus'
										),
										quote: __(
											'One strong sentence',
											'aldus'
										),
								  }[ item.type ] ?? undefined
								: undefined
						}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				) }
				{ meta.input === 'textarea' && item.type !== 'list' && (
					<TextareaControl
						ref={ inputRef }
						label={ meta.label }
						hideLabelFromVision
						value={ item.content }
						placeholder={ meta.placeholder }
						onChange={ ( val ) => onUpdate( { content: val } ) }
						help={ ( () => {
							if ( item.content?.includes( '<' ) ) {
								return __(
									'Plain text only — HTML formatting will be stripped.',
									'aldus'
								);
							}
							if ( ! item.content && item.type === 'paragraph' ) {
								return __(
									'2–4 sentences works best',
									'aldus'
								);
							}
							return undefined;
						} )() }
						rows={ 3 }
					/>
				) }
				{ item.type === 'list' && (
					<ListBuilder
						ref={ inputRef }
						value={ item.content }
						onChange={ ( val ) => onUpdate( { content: val } ) }
					/>
				) }
				{ meta.input === 'image' && (
					<ImageInput
						ref={ inputRef }
						item={ item }
						onUpdate={ onUpdate }
						labelText={ meta.label }
					/>
				) }
				{ /* Pass 1: button type with label + URL fields */ }
				{ meta.input === 'button' && (
					<ButtonInput
						ref={ inputRef }
						item={ item }
						onUpdate={ onUpdate }
						labelText={ meta.label }
					/>
				) }
				{ meta.input === 'video' && (
					<VideoInput
						ref={ inputRef }
						item={ item }
						onUpdate={ onUpdate }
						labelText={ meta.label }
					/>
				) }
				{ meta.input === 'gallery' && (
					<GalleryInput
						ref={ inputRef }
						item={ item }
						onUpdate={ onUpdate }
						labelText={ meta.label }
					/>
				) }
			</div>

			<div
				className="aldus-reorder-btns"
				aria-label={ __( 'Reorder', 'aldus' ) }
			>
				<Button
					icon={ chevronUp }
					label={ __( 'Move up', 'aldus' ) }
					size="small"
					className="aldus-move-btn"
					onClick={ onMoveUp }
					disabled={ index === 0 }
				/>
				<Button
					icon={ chevronDown }
					label={ __( 'Move down', 'aldus' ) }
					size="small"
					className="aldus-move-btn"
					onClick={ onMoveDown }
					disabled={ index === total - 1 }
				/>
			</div>

			<Button
				icon={ close }
				label={ sprintf(
					/* translators: %s is the content item label, e.g. "Paragraph". */
					__( 'Remove %s', 'aldus' ),
					meta.label ?? item.type
				) }
				isDestructive
				size="small"
				className="aldus-remove-btn"
				onClick={ onRemove }
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// List builder — structured add/remove rows instead of raw textarea
// ---------------------------------------------------------------------------

const ListBuilder = forwardRef( function ListBuilder(
	{ value, onChange },
	ref
) {
	const lines = value
		? value
				.split( '\n' )
				.filter( ( l, i, arr ) => l !== '' || i === arr.length - 1 )
		: [ '' ];
	const nonEmpty = lines.filter( Boolean );
	const displayLines = nonEmpty.length > 0 ? nonEmpty : [ '' ];

	const updateLine = ( index, text ) => {
		const next = [ ...displayLines ];
		next[ index ] = text;
		onChange( next.join( '\n' ) );
	};

	const removeLine = ( index ) => {
		const next = displayLines.filter( ( _, i ) => i !== index );
		onChange( ( next.length > 0 ? next : [ '' ] ).join( '\n' ) );
	};

	const addLine = () => {
		onChange( [ ...displayLines, '' ].join( '\n' ) );
	};

	return (
		<div className="aldus-list-builder">
			{ displayLines.map( ( line, i ) => (
				<div key={ i } className="aldus-list-builder-row">
					<span
						className="aldus-list-builder-bullet"
						aria-hidden="true"
					>
						•
					</span>
					<TextControl
						ref={ i === 0 ? ref : undefined }
						label={ sprintf(
							/* translators: %d is the list item number, e.g. "1". */
							__( 'List item %d', 'aldus' ),
							i + 1
						) }
						hideLabelFromVision
						value={ line }
						placeholder={ __( 'List item', 'aldus' ) }
						onChange={ ( text ) => updateLine( i, text ) }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					{ displayLines.length > 1 && (
						<Button
							icon={ close }
							label={ sprintf(
								/* translators: %d is the list item number, e.g. "1". */
								__( 'Remove item %d', 'aldus' ),
								i + 1
							) }
							size="small"
							isDestructive
							className="aldus-list-builder-remove"
							onClick={ () => removeLine( i ) }
						/>
					) }
				</div>
			) ) }
			<Button
				variant="tertiary"
				size="small"
				icon={ plus }
				className="aldus-list-builder-add"
				onClick={ addLine }
			>
				{ __( 'Add item', 'aldus' ) }
			</Button>
		</div>
	);
} );

// ---------------------------------------------------------------------------
// Pass 1: ButtonInput — label + URL fields for CTA/Button type
// ---------------------------------------------------------------------------

const ButtonInput = forwardRef( function ButtonInput(
	{ item, onUpdate, labelText },
	ref
) {
	return (
		<div className="aldus-button-input" aria-label={ labelText }>
			<TextControl
				ref={ ref }
				label={ __( 'Label', 'aldus' ) }
				hideLabelFromVision
				value={ item.content }
				placeholder={ __( 'Button label', 'aldus' ) }
				onChange={ ( val ) => onUpdate( { content: val } ) }
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'URL', 'aldus' ) }
				hideLabelFromVision
				value={ item.url }
				placeholder={ __( 'https://…', 'aldus' ) }
				onChange={ ( val ) => onUpdate( { url: val } ) }
				type="url"
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
		</div>
	);
} );

// ---------------------------------------------------------------------------
// Image input (unchanged)
// ---------------------------------------------------------------------------

const ImageInput = forwardRef( function ImageInput(
	{ item, onUpdate, labelText },
	ref
) {
	const hasUrl = !! item.url;
	return (
		<div className="aldus-image-input" aria-label={ labelText }>
			{ hasUrl && (
				<img
					className="aldus-image-preview"
					src={ item.url }
					alt={ __( 'Selected image preview', 'aldus' ) }
				/>
			) }
			<Flex align="center" gap={ 2 } wrap className="aldus-image-row">
				<FlexItem>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( media ) =>
								onUpdate( {
									url: media.url,
									content: media.alt || media.filename || '',
								} )
							}
							allowedTypes={ [ 'image' ] }
							value={ item.mediaId }
							render={ ( { open } ) => (
								<Button
									ref={ ref }
									variant="secondary"
									size="small"
									onClick={ open }
								>
									{ hasUrl
										? __( 'Change image', 'aldus' )
										: __( 'Choose from library', 'aldus' ) }
								</Button>
							) }
						/>
					</MediaUploadCheck>
				</FlexItem>
				<FlexItem>
					<span className="aldus-image-or">
						{ __( 'or', 'aldus' ) }
					</span>
				</FlexItem>
				<FlexItem isBlock>
					<TextControl
						label={ __( 'Image URL', 'aldus' ) }
						hideLabelFromVision
						value={ item.url }
						placeholder={ __( 'Paste image URL…', 'aldus' ) }
						onChange={ ( val ) => onUpdate( { url: val } ) }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</FlexItem>
				{ hasUrl && (
					<FlexItem>
						<Button
							icon={ close }
							label={ __( 'Remove image', 'aldus' ) }
							size="small"
							isDestructive
							onClick={ () =>
								onUpdate( { url: '', content: '' } )
							}
						/>
					</FlexItem>
				) }
			</Flex>
		</div>
	);
} );

// ---------------------------------------------------------------------------
// VideoInput — URL for YouTube, Vimeo, or direct video
// ---------------------------------------------------------------------------

const VideoInput = forwardRef( function VideoInput(
	{ item, onUpdate, labelText },
	ref
) {
	const url = item.url ?? '';
	let videoSource = null;
	if ( /youtube\.com|youtu\.be/i.test( url ) ) {
		videoSource = 'YouTube';
	} else if ( /vimeo\.com/i.test( url ) ) {
		videoSource = 'Vimeo';
	} else if ( url.trim() ) {
		videoSource = __( 'Video', 'aldus' );
	}

	return (
		<div className="aldus-video-input" aria-label={ labelText }>
			<TextControl
				ref={ ref }
				label={ __( 'Video URL', 'aldus' ) }
				hideLabelFromVision
				value={ url }
				placeholder={ __(
					'YouTube, Vimeo, or direct video URL',
					'aldus'
				) }
				onChange={ ( val ) => onUpdate( { url: val } ) }
				type="url"
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			{ videoSource && (
				<p className="aldus-video-detected">
					{ sprintf(
						/* translators: %s is the video platform name, e.g. "YouTube". */
						__( '%s detected', 'aldus' ),
						videoSource
					) }
				</p>
			) }
		</div>
	);
} );

// ---------------------------------------------------------------------------
// GalleryInput — multi-image picker from media library
// ---------------------------------------------------------------------------

const GalleryInput = forwardRef( function GalleryInput(
	{ item, onUpdate, labelText },
	ref
) {
	const urls = Array.isArray( item.urls ) ? item.urls : [];

	return (
		<div className="aldus-gallery-input" aria-label={ labelText }>
			{ urls.length > 0 && (
				<div className="aldus-gallery-thumbs" aria-hidden="true">
					{ urls.slice( 0, 6 ).map( ( url, i ) => (
						<img
							key={ i }
							src={ url }
							alt=""
							className="aldus-gallery-thumb"
						/>
					) ) }
				</div>
			) }
			<MediaUploadCheck>
				<MediaUpload
					multiple
					gallery
					allowedTypes={ [ 'image' ] }
					onSelect={ ( media ) => {
						const arr = Array.isArray( media ) ? media : [ media ];
						onUpdate( {
							urls: arr.map( ( m ) => m.url ),
							mediaIds: arr.map( ( m ) => m.id ?? 0 ),
							content: arr.length > 0 ? arr[ 0 ].alt || '' : '',
						} );
					} }
					render={ ( { open } ) => (
						<Button
							ref={ ref }
							variant="secondary"
							size="small"
							onClick={ open }
							className="aldus-gallery-btn"
						>
							{ urls.length > 0
								? sprintf(
										/* translators: %d is the number of images selected */
										_n(
											'%d image — change',
											'%d images — change',
											urls.length,
											'aldus'
										),
										urls.length
								  )
								: __( 'Add images', 'aldus' ) }
						</Button>
					) }
				/>
			</MediaUploadCheck>
			{ urls.length > 0 && (
				<Button
					icon={ close }
					label={ __( 'Remove gallery', 'aldus' ) }
					size="small"
					isDestructive
					onClick={ () => onUpdate( { urls: [], content: '' } ) }
				/>
			) }
		</div>
	);
} );

// ---------------------------------------------------------------------------
// Generation steps breadcrumb — shown during downloading and loading screens
// ---------------------------------------------------------------------------

/**
 * Renders a minimal 3-dot step indicator showing where we are in the generation flow.
 *
 * @param {Object} props
 * @param {number} props.step 0 = downloading model, 1 = generating layouts, 2 = done.
 * @return {Element} The step indicator.
 */
function GenerationSteps( { step } ) {
	const steps = [
		__( 'Model ready', 'aldus' ),
		__( 'Generating', 'aldus' ),
		__( 'Done', 'aldus' ),
	];
	return (
		<div className="aldus-gen-steps" aria-hidden="true">
			{ steps.map( ( label, i ) => (
				<div
					key={ i }
					className={ [
						'aldus-gen-step',
						i < step ? 'is-done' : '',
						i === step ? 'is-active' : '',
					]
						.filter( Boolean )
						.join( ' ' ) }
				>
					<span className="aldus-gen-step-dot" />
					<span className="aldus-gen-step-label">{ label }</span>
				</div>
			) ) }
		</div>
	);
}

// ---------------------------------------------------------------------------
// Screen: Downloading model (Pass 4 — staged progress)
// ---------------------------------------------------------------------------

function DownloadingScreen( { progress, onAbort } ) {
	const pct = Math.round( ( progress.progress ?? 0 ) * 100 );
	const progressText = ( progress.text ?? '' ).toLowerCase();

	// Detect stage from WebLLM progress text
	let stage = 0;
	if ( progressText.includes( 'finish' ) || pct >= 100 ) {
		stage = 2;
	} else if (
		progressText.includes( 'fetch' ) ||
		progressText.includes( 'loading' ) ||
		pct > 5
	) {
		stage = 1;
	}

	const stages = [
		__( 'Preparing', 'aldus' ),
		__( 'Downloading', 'aldus' ),
		__( 'Starting up', 'aldus' ),
	];

	return (
		<div className="aldus-downloading" role="status" aria-live="polite">
			<GenerationSteps step={ 0 } />
			<span className="aldus-stamp aldus-stamp--hero" aria-hidden="true">
				aldus
			</span>
			<div className="aldus-stages" aria-hidden="true">
				{ stages.map( ( label, i ) => (
					<div
						key={ i }
						className={ [
							'aldus-stage',
							i < stage ? 'is-done' : '',
							i === stage ? 'is-active' : '',
						]
							.filter( Boolean )
							.join( ' ' ) }
					>
						<span className="aldus-stage-dot" />
						<span className="aldus-stage-label">{ label }</span>
					</div>
				) ) }
			</div>
			<div
				className="aldus-progress-bar"
				role="progressbar"
				aria-valuenow={ pct }
				aria-valuemin={ 0 }
				aria-valuemax={ 100 }
			>
				<div
					className="aldus-progress-fill"
					style={ { width: `${ pct }%` } }
				/>
			</div>
			{ pct < 100 && (
				<p className="aldus-downloading-sub">
					{ pct > 0
						? sprintf(
								/* translators: %d is a download percentage number, e.g. 42. */
								__(
									'%d%% · One-time download — lives in your browser forever after',
									'aldus'
								),
								pct
						  )
						: __( 'Starting download…', 'aldus' ) }
				</p>
			) }
			{ onAbort && (
				<Button
					variant="tertiary"
					className="aldus-abort-btn"
					onClick={ onAbort }
				>
					{ __( 'Cancel', 'aldus' ) }
				</Button>
			) }
		</div>
	);
}

// ---------------------------------------------------------------------------
// Screen: Loading (Pass 4 — pulsing stamp + fade messages)
// ---------------------------------------------------------------------------

function LoadingScreen( { message, msgVisible, onAbort, genProgress } ) {
	return (
		<div className="aldus-loading" role="status" aria-live="polite">
			<span
				className="aldus-stamp aldus-stamp--hero aldus-stamp--pulse"
				aria-hidden="true"
			>
				aldus
			</span>
			<p
				className={ `aldus-loading-msg ${
					msgVisible ? 'is-visible' : 'is-hidden'
				}` }
			>
				{ message }
			</p>
			{ genProgress?.total > 0 && (
				<div
					className="aldus-gen-progress"
					role="progressbar"
					aria-valuenow={ genProgress.done }
					aria-valuemin={ 0 }
					aria-valuemax={ genProgress.total }
					aria-label={ sprintf(
						/* translators: 1: number of layouts built so far, 2: total number of layouts */
						__( 'Building layouts: %1$d of %2$d', 'aldus' ),
						genProgress.done,
						genProgress.total
					) }
				>
					<p>
						{ sprintf(
							/* translators: 1: number of layouts built so far, 2: total number of layouts */
							__( 'Building %1$d of %2$d layouts…', 'aldus' ),
							genProgress.done,
							genProgress.total
						) }
						{ genProgress?.lastLabel && (
							<span className="aldus-gen-progress-label">
								{ genProgress.lastLabel }
							</span>
						) }
					</p>
				</div>
			) }
			{ onAbort && (
				<Button
					variant="tertiary"
					className="aldus-abort-btn"
					onClick={ onAbort }
				>
					{ __( 'Cancel', 'aldus' ) }
				</Button>
			) }
		</div>
	);
}

// ---------------------------------------------------------------------------
// Screen: No WebGPU (Pass 9 — redesigned)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Screen: Results (Pass 3 — layout count badge)
// ---------------------------------------------------------------------------

function ResultsScreen( {
	layouts,
	chooseLayout,
	startOver,
	regenerate,
	isPreview,
	onReroll,
	rerollingLabel,
	rerollErrors,
	onMix,
	onTryWithContent,
	items = [],
	packs = [],
	activePreviewPack = null,
	onSwitchPack,
} ) {
	const hasSections = layouts.some( ( l ) => l.sections?.length > 0 );
	const [ isCompact, setIsCompact ] = useState( layouts.length >= 8 );
	const [ filterText, setFilterText ] = useState( '' );
	const [ favorites, setFavorites ] = useState( [] );

	// Roving tabindex state for role="grid" arrow-key navigation (item 21).
	const [ focusedCardIndex, setFocusedCardIndex ] = useState( 0 );
	const gridRef = useRef( null );

	const handleGridKeyDown = useCallback(
		( event ) => {
			if ( ! gridRef.current ) {
				return;
			}
			const cards = Array.from(
				gridRef.current.querySelectorAll(
					'.aldus-card[role="gridcell"]'
				)
			);
			if ( cards.length === 0 ) {
				return;
			}
			// Derive column count from CSS grid at runtime so it works at any viewport.
			const colCount =
				Math.round(
					gridRef.current.offsetWidth /
						( cards[ 0 ].offsetWidth || 1 )
				) || 1;
			const current = focusedCardIndex;

			let next = current;
			if ( event.key === 'ArrowRight' ) {
				next = Math.min( current + 1, cards.length - 1 );
			} else if ( event.key === 'ArrowLeft' ) {
				next = Math.max( current - 1, 0 );
			} else if ( event.key === 'ArrowDown' ) {
				next = Math.min( current + colCount, cards.length - 1 );
			} else if ( event.key === 'ArrowUp' ) {
				next = Math.max( current - colCount, 0 );
			} else if ( event.key === 'Home' ) {
				next = 0;
			} else if ( event.key === 'End' ) {
				next = cards.length - 1;
			} else {
				return;
			}

			event.preventDefault();
			setFocusedCardIndex( next );
			cards[ next ]?.focus();
		},
		[ focusedCardIndex ]
	);

	const toggleFavorite = useCallback( ( label ) => {
		setFavorites( ( prev ) =>
			prev.includes( label )
				? prev.filter( ( l ) => l !== label )
				: [ ...prev, label ]
		);
	}, [] );

	// Personalities whose anchor content types are fully met by the user's items.
	const bestMatchSet = useMemo(
		() => ( isPreview ? new Set() : computeBestMatches( items ) ),
		[ items, isPreview ]
	);

	// Track re-roll completion to flash the updated card.
	const [ justRerolledLabel, setJustRerolledLabel ] = useState( null );
	const prevRerollingLabelRef = useRef( null );
	useEffect( () => {
		if ( rerollingLabel ) {
			prevRerollingLabelRef.current = rerollingLabel;
		} else if ( prevRerollingLabelRef.current ) {
			const finished = prevRerollingLabelRef.current;
			prevRerollingLabelRef.current = null;
			setJustRerolledLabel( finished );
			const t = setTimeout( () => setJustRerolledLabel( null ), 500 );
			return () => clearTimeout( t );
		}
	}, [ rerollingLabel ] );

	const visibleLayouts = useMemo( () => {
		const q = filterText.trim().toLowerCase();
		const filtered = q
			? layouts.filter( ( l ) =>
					( l.label + ' ' + ( LAYOUT_TAGLINES[ l.label ] ?? '' ) )
						.toLowerCase()
						.includes( q )
			  )
			: layouts;
		// Float favorited cards to the top.
		if ( favorites.length === 0 ) {
			return filtered;
		}
		const favSet = new Set( favorites );
		return [
			...filtered.filter( ( l ) => favSet.has( l.label ) ),
			...filtered.filter( ( l ) => ! favSet.has( l.label ) ),
		];
	}, [ layouts, filterText, favorites ] );

	return (
		<div className="aldus-results">
			<div className="aldus-results-sticky">
				<Flex
					align="center"
					justify="space-between"
					className="aldus-results-header"
				>
					<div>
						<span className="aldus-results-title">
							{ isPreview
								? __(
										'See what Aldus does with real content. Switch themes to try all sixteen styles.',
										'aldus'
								  )
								: __(
										'Sixteen ways your content could look. Pick the one that fits.',
										'aldus'
								  ) }
						</span>
						<span className="aldus-results-count">
							{ sprintf(
								/* translators: %d is the number of layouts generated */
								_n(
									'%d layout',
									'%d layouts',
									layouts.length,
									'aldus'
								),
								layouts.length
							) }
						</span>
					</div>
					<Flex gap={ 2 }>
						{ layouts.length >= 8 && (
							<Button
								variant="tertiary"
								size="small"
								onClick={ () => setIsCompact( ( v ) => ! v ) }
							>
								{ isCompact
									? __( 'Detailed', 'aldus' )
									: __( 'Compact', 'aldus' ) }
							</Button>
						) }
						{ hasSections && (
							<Button
								variant="secondary"
								size="small"
								icon={ layoutIcon }
								onClick={ onMix }
							>
								{ __( 'Mix sections', 'aldus' ) }
							</Button>
						) }
						{ ! isPreview && (
							<Button
								variant="secondary"
								size="small"
								onClick={ regenerate }
							>
								{ __( 'Regenerate', 'aldus' ) }
								<kbd className="aldus-kbd">⇧⌘R</kbd>
							</Button>
						) }
						<Button
							variant="secondary"
							size="small"
							onClick={ startOver }
						>
							{ isPreview
								? __( 'Back to building', 'aldus' )
								: __( 'Start fresh', 'aldus' ) }
						</Button>
					</Flex>
				</Flex>
				{ isPreview && packs.length > 0 && (
					<div
						className="aldus-pack-pills"
						role="group"
						aria-label={ __( 'Switch pack', 'aldus' ) }
					>
						{ packs.map( ( p ) => (
							<button
								key={ p.id }
								className={ `aldus-pack-pill${
									p.id === activePreviewPack?.id
										? ' is-active'
										: ''
								}` }
								onClick={ () => onSwitchPack( p ) }
								aria-pressed={ p.id === activePreviewPack?.id }
								style={
									p.id === activePreviewPack?.id
										? {
												background: p.palette.accent,
												borderColor: p.palette.accent,
										  }
										: {}
								}
								title={ p.description }
							>
								{ p.emoji && (
									<span
										className="aldus-pack-pill-emoji"
										aria-hidden="true"
									>
										{ p.emoji }
									</span>
								) }
								{ p.label }
							</button>
						) ) }
					</div>
				) }
				<p className="aldus-results-hint">
					{ hasSections
						? __(
								'Pick a layout below, or use Mix sections to combine parts from different personalities.',
								'aldus'
						  )
						: __(
								'Pick a layout below — click "Use this one" on any card.',
								'aldus'
						  ) }
				</p>
				{ layouts.length >= 8 && (
					<div className="aldus-results-filter">
						<TextControl
							label={ __( 'Filter layouts', 'aldus' ) }
							hideLabelFromVision
							value={ filterText }
							placeholder={ __(
								'Filter by personality…',
								'aldus'
							) }
							onChange={ setFilterText }
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						{ filterText && (
							<Button
								icon={ close }
								label={ __( 'Clear filter', 'aldus' ) }
								size="small"
								className="aldus-results-filter-clear"
								onClick={ () => setFilterText( '' ) }
							/>
						) }
					</div>
				) }
				{ favorites.length >= 2 && (
					<p className="aldus-favorites-hint">
						{ sprintf(
							/* translators: %d: number of favorited layouts */
							__(
								'You have %d favorites — mix their sections?',
								'aldus'
							),
							favorites.length
						) }{ ' ' }
						{ hasSections && (
							<button
								className="aldus-favorites-mix-link"
								onClick={ onMix }
							>
								{ __( 'Compare favorites →', 'aldus' ) }
							</button>
						) }
					</p>
				) }
			</div>
			{ /* end aldus-results-sticky */ }
			<div
				ref={ gridRef }
				className={ `aldus-grid${ isCompact ? ' is-compact' : '' }` }
				role="grid"
				tabIndex={ -1 }
				aria-label={ __( 'Layout options', 'aldus' ) }
				onKeyDown={ handleGridKeyDown }
			>
				{ visibleLayouts.length > 0 ? (
					visibleLayouts.map( ( layout, index ) => (
						<LayoutCard
							key={ layout.label }
							layout={ layout }
							index={ index }
							isCompact={ isCompact }
							onChoose={ () => chooseLayout( layout.label ) }
							onReroll={
								onReroll ? () => onReroll( layout.label ) : null
							}
							isRerolling={ rerollingLabel === layout.label }
							hasRerollError={ !! rerollErrors?.[ layout.label ] }
							justRerolled={ justRerolledLabel === layout.label }
							isBestMatch={ bestMatchSet.has( layout.label ) }
							isFavorited={ favorites.includes( layout.label ) }
							onToggleFavorite={ () =>
								toggleFavorite( layout.label )
							}
							onTryWithContent={
								onTryWithContent
									? () => onTryWithContent( layout.label )
									: null
							}
							items={ items }
							tabIndex={ index === focusedCardIndex ? 0 : -1 }
							onFocus={ () => setFocusedCardIndex( index ) }
						/>
					) )
				) : (
					<p className="aldus-results-filter-empty">
						{ __( 'No personalities match that name.', 'aldus' ) }
					</p>
				) }
			</div>
		</div>
	);
}

function LayoutCard( {
	layout,
	index,
	isCompact = false,
	onChoose,
	onReroll,
	isRerolling,
	hasRerollError,
	justRerolled,
	onTryWithContent,
	isBestMatch = false,
	isFavorited = false,
	onToggleFavorite,
	items = [],
	tabIndex = -1,
	onFocus,
} ) {
	const [ isExpanded, setIsExpanded ] = useState( false );
	const blocks = useMemo( () => {
		try {
			return parseBlocks( layout.blocks );
		} catch ( e ) {
			return [];
		}
	}, [ layout.blocks ] );
	const tagline = LAYOUT_TAGLINES[ layout.label ] ?? '';

	// Compute which user items appear in this layout's blocks (item 11).
	const consumedSet = useMemo( () => {
		if ( ! items.length || ! layout.blocks ) {
			return new Set();
		}
		const blocksStr = layout.blocks.toLowerCase();
		return new Set(
			items
				.filter(
					( item ) =>
						item.content?.trim() &&
						blocksStr.includes(
							item.content.trim().slice( 0, 20 ).toLowerCase()
						)
				)
				.map( ( item ) => item.id )
		);
	}, [ items, layout.blocks ] );

	return (
		<>
			<div
				className={ [
					'aldus-card',
					isRerolling ? 'is-rerolling' : '',
					justRerolled ? 'aldus-card--just-rerolled' : '',
				]
					.filter( Boolean )
					.join( ' ' ) }
				role="gridcell"
				tabIndex={ tabIndex }
				onFocus={ onFocus }
				style={ { animationDelay: `${ index * 40 }ms` } }
			>
				<div className="aldus-card-preview">
					<div aria-hidden="true">
						{ isRerolling ? (
							<div className="aldus-card-rerolling">
								<Spinner />
							</div>
						) : (
							<LayoutWireframe tokens={ layout.tokens } />
						) }
					</div>
					<Button
						icon={ seen }
						label={ __( 'Expand preview', 'aldus' ) }
						size="small"
						className="aldus-card-expand-btn"
						onClick={ () => setIsExpanded( true ) }
					/>
					<div className="aldus-card-overlay">
						<Button
							className="aldus-card-use-btn"
							onClick={ onChoose }
							aria-label={ sprintf(
								/* translators: %s is the layout name, e.g. "Editorial". */
								__( 'Use the %s layout', 'aldus' ),
								layout.label
							) }
						>
							{ __( 'Use this one', 'aldus' ) }
						</Button>
					</div>
					{ hasRerollError && (
						<div
							className="aldus-card-reroll-error"
							aria-live="polite"
						>
							{ __( "Couldn't refresh — try again", 'aldus' ) }
						</div>
					) }
				</div>
				<div className="aldus-card-footer">
					<div className="aldus-card-footer-row">
						<strong className="aldus-card-label">
							{ layout.label }
						</strong>
						<div className="aldus-card-footer-actions">
							{ isBestMatch && (
								<span
									className="aldus-best-match-badge"
									title={ __(
										'This personality is a great match for your content.',
										'aldus'
									) }
								>
									{ __( '✓ Best match', 'aldus' ) }
								</span>
							) }
							{ onToggleFavorite && (
								<Button
									icon={
										isFavorited ? starFilled : starEmpty
									}
									label={
										isFavorited
											? __(
													'Remove from favorites',
													'aldus'
											  )
											: __( 'Add to favorites', 'aldus' )
									}
									size="small"
									className={ `aldus-card-favorite-btn${
										isFavorited ? ' is-favorited' : ''
									}` }
									onClick={ onToggleFavorite }
								/>
							) }
							{ onReroll && ! isRerolling && (
								<Button
									icon={ undo }
									label={ __(
										'Try a different arrangement for this personality',
										'aldus'
									) }
									size="small"
									className="aldus-card-reroll-btn"
									onClick={ onReroll }
								/>
							) }
							<Button
								icon={ copy }
								label={ __(
									'Copy blocks to clipboard',
									'aldus'
								) }
								size="small"
								className="aldus-card-copy-btn"
								onClick={ async () => {
									try {
										await navigator.clipboard.writeText(
											layout.blocks
										);
										wpDispatch(
											'core/notices'
										).createSuccessNotice(
											__(
												'Blocks copied to clipboard.',
												'aldus'
											),
											{
												type: 'snackbar',
												id: 'aldus-copy',
											}
										);
									} catch {
										// Clipboard write denied — silent fail.
									}
								} }
							/>
							{ onTryWithContent && (
								<Button
									icon={ reusableBlock }
									label={ __(
										'Try with my content',
										'aldus'
									) }
									size="small"
									className="aldus-card-try-btn"
									onClick={ onTryWithContent }
								/>
							) }
						</div>
					</div>
					{ tagline && ! isCompact && (
						<span className="aldus-card-tagline">{ tagline }</span>
					) }
					{ items.length > 0 && (
						<div
							className="aldus-card-consumption"
							aria-label={ sprintf(
								/* translators: 1: used count, 2: total count */
								__(
									'%1$d of %2$d content pieces used',
									'aldus'
								),
								consumedSet.size,
								items.length
							) }
						>
							{ items.map( ( item ) => (
								<span
									key={ item.id }
									className={ `aldus-consumption-dot${
										consumedSet.has( item.id )
											? ' is-used'
											: ''
									}` }
									title={ item.type }
								/>
							) ) }
						</div>
					) }
				</div>
				{ layout.tokens?.length > 0 && (
					<div className="aldus-card-recipe" aria-hidden="true">
						{ layout.tokens.map( ( token, i ) => (
							<span key={ i } className="aldus-card-token">
								{ tokenShortLabel( token ) }
							</span>
						) ) }
					</div>
				) }
			</div>

			{ isExpanded && (
				<Modal
					title={ layout.label }
					onRequestClose={ () => setIsExpanded( false ) }
					size="large"
					className="aldus-preview-modal"
				>
					<div className="aldus-preview-modal-preview">
						<BlockPreview blocks={ blocks } viewportWidth={ 800 } />
					</div>
					<div className="aldus-preview-modal-footer">
						<Button
							variant="primary"
							onClick={ () => {
								onChoose();
								setIsExpanded( false );
							} }
						>
							{ __( 'Use this layout', 'aldus' ) }
						</Button>
						<Button
							variant="secondary"
							onClick={ async () => {
								try {
									await navigator.clipboard.writeText(
										layout.blocks
									);
									wpDispatch(
										'core/notices'
									).createSuccessNotice(
										__(
											'Blocks copied to clipboard.',
											'aldus'
										),
										{ type: 'snackbar', id: 'aldus-copy' }
									);
								} catch {
									// Clipboard write denied — silent fail.
								}
							} }
						>
							{ __( 'Copy blocks', 'aldus' ) }
						</Button>
					</div>
				</Modal>
			) }
		</>
	);
}

// ---------------------------------------------------------------------------
// Screen: Confirming
// ---------------------------------------------------------------------------

function ConfirmingScreen( { label } ) {
	return (
		<div className="aldus-confirming" aria-live="polite">
			{ label ? (
				<>
					<span className="aldus-confirming-name" aria-hidden="true">
						{ label }
					</span>
					<span className="aldus-confirming-sub">
						{ sprintf(
							/* translators: %s is the personality name, e.g. "Dispatch". */
							__( 'Making it %s…', 'aldus' ),
							label
						) }
					</span>
				</>
			) : (
				<>
					<Spinner />
					<span>{ __( 'Dropping it in…', 'aldus' ) }</span>
				</>
			) }
		</div>
	);
}

// Renders a single alternative section button with a block preview thumbnail.
function MixAltButton( { section, isSelected, onSwap } ) {
	const previewBlocks = useMemo( () => {
		try {
			return parseBlocks( section.blocks ?? '' );
		} catch ( e ) {
			return [];
		}
	}, [ section.blocks ] );
	return (
		<button
			className={ `aldus-mix-alt${ isSelected ? ' is-selected' : '' }` }
			onClick={ onSwap }
		>
			<div className="aldus-mix-alt-preview" aria-hidden="true">
				<BlockPreview blocks={ previewBlocks } viewportWidth={ 300 } />
			</div>
			<strong>{ section._label }</strong>
		</button>
	);
}

// ---------------------------------------------------------------------------
// Screen: Mix sections — combine sections from different layouts
// ---------------------------------------------------------------------------

function MixingScreen( { layouts, onInsert, onBack } ) {
	// Use the layout with the most sections as the starting mix.
	const baseLayout = useMemo(
		() =>
			[ ...layouts ].sort(
				( a, b ) =>
					( b.sections?.length ?? 0 ) - ( a.sections?.length ?? 0 )
			)[ 0 ],
		[ layouts ]
	);

	const buildSlots = ( layout ) =>
		( layout?.sections ?? [] ).map( ( s ) => ( {
			...s,
			_label: layout.label,
		} ) );

	const [ mixSlots, setMixSlots ] = useState( () =>
		buildSlots( baseLayout )
	);
	const [ activeSlot, setActiveSlot ] = useState( 0 );

	// Reset slots if layouts changes (e.g. a re-roll fires while on this screen).
	const prevBaseRef = useRef( baseLayout );
	useEffect( () => {
		if ( baseLayout !== prevBaseRef.current ) {
			prevBaseRef.current = baseLayout;
			setMixSlots( buildSlots( baseLayout ) );
			setActiveSlot( 0 );
		}
	}, [ baseLayout ] ); // eslint-disable-line react-hooks/exhaustive-deps

	// Build a lookup of all sections per token type across all layouts.
	const sectionsByToken = useMemo( () => {
		const map = {};
		for ( const layout of layouts ) {
			for ( const section of layout.sections ?? [] ) {
				if ( ! map[ section.token ] ) {
					map[ section.token ] = [];
				}
				map[ section.token ].push( {
					...section,
					_label: layout.label,
				} );
			}
		}
		return map;
	}, [ layouts ] );

	const activeSection = mixSlots[ activeSlot ];
	const alternatives = activeSection
		? sectionsByToken[ activeSection.token ] ?? []
		: [];

	const swapSlot = ( slotIdx, section ) => {
		setMixSlots( ( prev ) => {
			const next = [ ...prev ];
			next[ slotIdx ] = section;
			return next;
		} );
	};

	const handleInsert = () => {
		const combined = mixSlots.map( ( s ) => s.blocks ).join( '\n' );
		onInsert( combined );
	};

	return (
		<div className="aldus-mixing">
			<Flex
				align="center"
				justify="space-between"
				className="aldus-mixing-header"
			>
				<div>
					<span className="aldus-results-title">
						{ __( 'Mix sections', 'aldus' ) }
					</span>
					<span className="aldus-results-count">
						{ sprintf(
							/* translators: 1: number of sections, 2: number of layouts */
							__( '%1$d sections from %2$d layouts', 'aldus' ),
							mixSlots.length,
							new Set( mixSlots.map( ( s ) => s._label ) ).size
						) }
					</span>
				</div>
				<Flex gap={ 2 }>
					<Button
						variant="primary"
						size="small"
						onClick={ handleInsert }
					>
						{ __( 'Insert this mix', 'aldus' ) }
					</Button>
					<Button variant="tertiary" size="small" onClick={ onBack }>
						{ __( 'Back to layouts', 'aldus' ) }
					</Button>
				</Flex>
			</Flex>

			{ /* Item 16: Recipe strip showing personality:token per slot */ }
			<div
				className="aldus-mix-recipe-strip"
				aria-label={ __( 'Current mix recipe', 'aldus' ) }
			>
				{ mixSlots.map( ( section, i ) => (
					<button
						key={ i }
						className={ `aldus-mix-recipe-pill${
							activeSlot === i ? ' is-active' : ''
						}` }
						onClick={ () => setActiveSlot( i ) }
					>
						<span className="aldus-mix-recipe-source">
							{ section._label }
						</span>
						<span className="aldus-mix-recipe-token">
							{ tokenHumanLabel( section.token ) }
						</span>
					</button>
				) ) }
			</div>

			{ /* Item 17: Alternatives grid below the recipe strip */ }
			<div className="aldus-mixing-alts-section">
				<p className="aldus-section-label">
					{ activeSection
						? sprintf(
								/* translators: %s is a human-readable section name like "Dark hero" */
								__(
									'Replace "%s" with a version from…',
									'aldus'
								),
								tokenHumanLabel( activeSection.token )
						  )
						: __( 'Select a section above to swap it', 'aldus' ) }
				</p>
				<div className="aldus-mix-alts-grid">
					{ alternatives.map( ( section, i ) => {
						const isSelected =
							mixSlots[ activeSlot ]?._label === section._label;
						return (
							<MixAltButton
								key={ i }
								section={ section }
								isSelected={ isSelected }
								onSwap={ () => swapSlot( activeSlot, section ) }
							/>
						);
					} ) }
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Screen: Error (structured messages + retry hint)
// ---------------------------------------------------------------------------

function ErrorScreen( { code, retryCount, onRetry, onRegenerate } ) {
	const msg = ERROR_MESSAGES[ code ] ?? ERROR_MESSAGES.parse_failed;
	const canRegenerate = code !== 'connection_failed';

	return (
		<div className="aldus-error">
			<div className="aldus-error-body">
				<strong className="aldus-error-headline">
					{ msg.headline }
				</strong>
				<p className="aldus-error-detail">{ msg.detail }</p>
				{ retryCount >= 2 && (
					<p className="aldus-retry-hint">
						{ __(
							'Still stuck? Try the Quick start presets in the sidebar.',
							'aldus'
						) }
					</p>
				) }
			</div>
			<Flex gap={ 2 } className="aldus-error-actions">
				{ canRegenerate && (
					<Button variant="primary" onClick={ onRegenerate }>
						{ __( 'Go for it again', 'aldus' ) }
					</Button>
				) }
				<Button variant="secondary" onClick={ onRetry }>
					{ __( 'Edit my content', 'aldus' ) }
				</Button>
			</Flex>
		</div>
	);
}
