/**
 * intelligence.js — structured model inference calls.
 *
 * Each function is a pure async helper that accepts an initialised WebLLM
 * engine and structured inputs, runs a single chat completion, and returns
 * a validated JSON result. All functions fall back to a safe empty default
 * on any error (parse failure, engine rejection, timeout) so callers can
 * always destructure the result unconditionally.
 *
 * Prompts use closed-vocabulary outputs (the model selects from a fixed set)
 * to reduce hallucination risk at the 360M parameter scale. None of these
 * calls produce open-ended natural language except inferLayoutDescription,
 * which is constrained to a short sentence.
 */

import { robustParse } from './robustParse.js';
import { TOKEN_CONTENT_TYPES } from '../data/tokens.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Runs a single chat completion and parses the JSON response.
 * Returns the parsed object, or {} on any failure.
 *
 * @param {Object} engine      WebLLM engine instance.
 * @param {string} prompt      User message content.
 * @param {number} temperature Sampling temperature (lower = more deterministic).
 * @param {number} maxTokens   Max tokens for the completion.
 * @return {Promise<Object>} Parsed JSON object, or {} on any failure.
 */
async function runInference( engine, prompt, temperature, maxTokens ) {
	let raw = '{}';
	try {
		const completion = await engine.chat.completions.create( {
			messages: [ { role: 'user', content: prompt } ],
			temperature,
			max_tokens: maxTokens,
			stream: false,
		} );
		raw = completion.choices[ 0 ]?.message?.content ?? '{}';
	} catch ( err ) {
		if ( window?.aldusDebug ) {
			// eslint-disable-next-line no-console
			console.debug( '[Aldus intelligence] inference call failed:', err );
		}
		return {};
	}

	const result = robustParse( raw );
	if ( window?.aldusDebug && Object.keys( result ).length === 0 ) {
		// eslint-disable-next-line no-console
		console.debug( '[Aldus intelligence] JSON parse failed. Raw:', raw );
	}
	return result;
}

/**
 * Formats a manifest object into a human-readable line for prompt use.
 * e.g. { headline: 1, paragraph: 2 } → "1 headline, 2 paragraph"
 *
 * @param {Object} manifest Map of content type → count.
 * @return {string} Human-readable manifest summary string.
 */
function formatManifest( manifest ) {
	return Object.entries( manifest )
		.map( ( [ type, count ] ) => `${ count } ${ type }` )
		.join( ', ' );
}

// ---------------------------------------------------------------------------
// 1. inferStyleDirection
// ---------------------------------------------------------------------------

/**
 * Infers a style direction phrase and overall content tone from the manifest
 * and items.
 *
 * Both fields use closed vocabularies so hallucinated values are impossible.
 * The style is prepended to the user's styleNote when running token generation.
 * The tone is passed to recommendPersonalities so personality ranking can
 * factor in the emotional register of the content.
 *
 * @param {Object} engine   WebLLM engine instance.
 * @param {Object} manifest Map of content type → count.
 * @param {Array}  items    Content item objects (used for word-count previews).
 * @return {Promise<{style: string, tone: string}>}  Both fields are '' on failure.
 */
export async function inferStyleDirection( engine, manifest, items ) {
	const STYLE_OPTIONS = [
		'text-heavy editorial',
		'image-forward visual',
		'minimal product',
		'cta-focused landing',
		'dark atmospheric',
		'data-driven structured',
		'story-driven narrative',
		'gallery portfolio',
		'tutorial walkthrough',
		'comparison showcase',
		'mixed',
	];

	const TONE_OPTIONS = [
		'professional',
		'passionate',
		'narrative',
		'technical',
		'playful',
		'urgent',
	];

	// Build content preview: first 15 words of each paragraph / quote (up to 3).
	const previews = items
		.filter( ( i ) => i.type === 'paragraph' || i.type === 'quote' )
		.slice( 0, 3 )
		.map( ( i ) => {
			const words = ( i.content ?? '' )
				.trim()
				.split( /\s+/ )
				.slice( 0, 15 );
			return words.join( ' ' );
		} )
		.filter( Boolean );

	const previewSection =
		previews.length > 0
			? `\nContent preview: ${ previews.join( ' / ' ) }`
			: '';

	const prompt = `Given this content manifest, pick the best style direction and overall tone.
Manifest: ${ formatManifest( manifest ) }${ previewSection }
Style options: ${ STYLE_OPTIONS.join( ' | ' ) }
Tone options: ${ TONE_OPTIONS.join( ' | ' ) }
Respond with valid JSON only: {"style": "...", "tone": "..."}`;

	// max_tokens: 48 (up from 32 to accommodate the second field)
	const result = await runInference( engine, prompt, 0.4, 48 );
	const style =
		typeof result.style === 'string' &&
		STYLE_OPTIONS.includes( result.style )
			? result.style
			: '';
	const tone =
		typeof result.tone === 'string' && TONE_OPTIONS.includes( result.tone )
			? result.tone
			: '';
	return { style, tone };
}

// ---------------------------------------------------------------------------
// 2. scoreCoverage
// ---------------------------------------------------------------------------

/**
 * Identifies content types from the manifest that are unlikely to appear
 * in the given token sequence.
 *
 * This is a classification task: the model sees the manifest and a concrete
 * token list and flags which content types are not served. Unused types are
 * shown as a small badge on the layout card so the user knows before choosing.
 *
 * @param {Object}   engine   WebLLM engine instance.
 * @param {Object}   manifest Map of content type → count.
 * @param {string[]} tokens   Token sequence produced by inferTokens.
 * @return {Promise<{unused: string[]}>}  unused is [] on failure.
 */
export async function scoreCoverage( engine, manifest, tokens ) {
	const manifestText = formatManifest( manifest );
	const tokenText = tokens.join( ', ' );

	const prompt = `Content manifest: ${ manifestText }
Token sequence: ${ tokenText }
Which manifest content types will NOT appear in this layout?
Answer only with types that are present in the manifest above.
Respond with valid JSON only: {"unused": []}`;

	const result = await runInference( engine, prompt, 0.3, 64 );
	const validTypes = new Set( Object.keys( manifest ) );
	const unused = Array.isArray( result.unused )
		? result.unused.filter(
				( t ) => typeof t === 'string' && validTypes.has( t )
		  )
		: [];
	return { unused };
}

// ---------------------------------------------------------------------------
// 3. inferLayoutDescription
// ---------------------------------------------------------------------------

// Module-level cache keyed on personality name + token sequence.
// Prevents duplicate inference calls when the same personality regenerates
// with an identical token sequence (re-rolls, Mix screen revisits, etc.).
// Clears on page reload — no explicit eviction needed.
const layoutDescriptionCache = new Map();

/**
 * Generates a short, dynamic description of how a layout arranges the user's
 * content, based on the actual token sequence produced for a personality.
 *
 * When successful this replaces the static LAYOUT_TAGLINES entry on the card.
 * The fallback ('') causes the card to display the static tagline instead.
 *
 * @param {Object}   engine      WebLLM engine instance.
 * @param {Object}   personality Personality object with name and description.
 * @param {string[]} tokens      Token sequence produced by inferTokens.
 * @return {Promise<{description: string}>}  description is '' on failure.
 */
export async function inferLayoutDescription( engine, personality, tokens ) {
	const cacheKey = personality.name + '|' + tokens.join( ',' );
	if ( layoutDescriptionCache.has( cacheKey ) ) {
		return layoutDescriptionCache.get( cacheKey );
	}

	const prompt = `Personality: "${ personality.name }" — ${
		personality.description
	}
Token sequence: ${ tokens.join( ', ' ) }
Write one sentence (15-25 words) describing how this layout arranges the content.
Respond with valid JSON only: {"description": "..."}`;

	const result = await runInference( engine, prompt, 0.7, 64 );
	const description =
		typeof result.description === 'string' &&
		result.description.trim().length >= 10
			? result.description.trim()
			: '';
	const cached = { description };
	if ( description ) {
		layoutDescriptionCache.set( cacheKey, cached );
	}
	return cached;
}

// ---------------------------------------------------------------------------
// 4. recommendPersonalities
// ---------------------------------------------------------------------------

/**
 * Scores each personality by how many of its anchor tokens have their
 * required content type satisfied by the current manifest.
 * Returns personalities sorted descending by score.
 *
 * @param {Object} manifest      Map of content type → count.
 * @param {Array}  personalities Full personality objects (name, anchors).
 * @return {Array<{personality: Object, score: number}>} Sorted scored personalities.
 */
function scorePersonalitiesByAnchors( manifest, personalities ) {
	return personalities
		.map( ( p ) => {
			const score = ( p.anchors ?? [] ).filter( ( token ) => {
				const required = TOKEN_CONTENT_TYPES[ token ] ?? [];
				return required.every( ( type ) => !! manifest[ type ] );
			} ).length;
			return { personality: p, score };
		} )
		.sort( ( a, b ) => b.score - a.score );
}

/**
 * Picks 3 personalities whose anchor tokens best match the available content.
 *
 * Uses deterministic anchor-satisfaction scoring first.  Only invokes the
 * LLM for a tiebreaker when 4+ personalities share the same score at the
 * rank-3/4 boundary — the typical case (clear top-3) skips the LLM entirely.
 *
 * @param {Object} engine        WebLLM engine instance.
 * @param {Object} manifest      Map of content type → count.
 * @param {Array}  personalities Full personality objects (name, anchors).
 * @param {string} [tone]        Optional tone string from inferStyleDirection.
 * @return {Promise<{recommended: string[]}>}  recommended is [] on failure.
 */
export async function recommendPersonalities(
	engine,
	manifest,
	personalities,
	tone = ''
) {
	const scored = scorePersonalitiesByAnchors( manifest, personalities );

	// Clear top-3 with no tie at the rank-3/4 boundary — skip the LLM entirely.
	if ( scored.length < 4 || scored[ 2 ].score > scored[ 3 ].score ) {
		return {
			recommended: scored
				.slice( 0, 3 )
				.map( ( s ) => s.personality.name ),
		};
	}

	// Tie at rank 3–4: pass only the tied candidates to the model so the
	// prompt is short enough for reliable 360M output.
	const tied = scored.filter( ( s ) => s.score === scored[ 3 ].score );
	const candidates = [ ...scored.slice( 0, 3 ), ...tied ].slice( 0, 8 );
	const candidateLines = candidates
		.map(
			( { personality: p } ) =>
				`${ p.name }: ${ ( p.anchors ?? [] ).join( ', ' ) }`
		)
		.join( '\n' );
	const toneHint = tone ? `\nContent tone: ${ tone }` : '';
	const prompt = `Content manifest: ${ formatManifest(
		manifest
	) }${ toneHint }
Candidates:
${ candidateLines }
Pick exactly 3 that best fit. Respond: {"recommended": ["Name1","Name2","Name3"]}`;

	const result = await runInference( engine, prompt, 0.4, 48 );
	const validNames = new Set( personalities.map( ( p ) => p.name ) );
	const recommended = Array.isArray( result.recommended )
		? result.recommended
				.filter( ( n ) => typeof n === 'string' && validNames.has( n ) )
				.slice( 0, 3 )
		: [];

	// Fall back to top-3 deterministic scores if the LLM produced nothing.
	return {
		recommended:
			recommended.length > 0
				? recommended
				: scored.slice( 0, 3 ).map( ( s ) => s.personality.name ),
	};
}

// ---------------------------------------------------------------------------
// 5. inferSectionLabel
// ---------------------------------------------------------------------------

/**
 * Generates a short 1–3 word section label for the narrow column of a
 * `columns:28-72` layout when no subheading or headline item is available.
 *
 * The prompt is grounded in a concrete paragraph preview (first 10 words),
 * so the model is doing pattern narration rather than open-ended generation —
 * well within 360M capability.
 *
 * @param {Object} engine           WebLLM engine instance.
 * @param {string} paragraphPreview First ~10 words of the paragraph to label.
 * @return {Promise<{label: string}>}  label is '' on failure.
 */
export async function inferSectionLabel( engine, paragraphPreview ) {
	const prompt = `Magazine layout: the next section opens with this text:
"${ paragraphPreview }"
Write a 1-3 word section label (e.g. "Our Process", "The Approach", "Origin Story").
Respond with valid JSON only: {"label": "..."}`;

	const result = await runInference( engine, prompt, 0.6, 16 );
	const label =
		typeof result.label === 'string' && result.label.trim().length >= 2
			? result.label.trim().slice( 0, 40 )
			: '';
	return { label };
}

// ---------------------------------------------------------------------------
// 6. analyzeContentHints
// ---------------------------------------------------------------------------

/**
 * Flags content issues that may reduce layout quality, by asking the model to
 * select applicable rules from a fixed list (not invent new ones).
 *
 * Rules are provided verbatim in the prompt. The model selects by index which
 * rules apply to the current manifest. This keeps output to a small integer
 * array, which 360M handles reliably, and the actual hint text is then
 * reconstructed client-side from the fixed rule list.
 *
 * @param {Object} engine   WebLLM engine instance.
 * @param {Object} manifest Map of content type → count.
 * @param {Array}  items    Content item objects (used for word counts).
 * @return {Promise<{hints: string[]}>}  hints is [] on failure.
 */
export async function analyzeContentHints( engine, manifest, items ) {
	// Compute word counts for manifest entries that have text.
	const wordCounts = {};
	for ( const item of items ) {
		if ( item.type && item.content ) {
			const words = item.content.trim().split( /\s+/ ).length;
			if ( ! wordCounts[ item.type ] ) {
				wordCounts[ item.type ] = [];
			}
			wordCounts[ item.type ].push( words );
		}
	}
	const avgWords = ( type ) => {
		const counts = wordCounts[ type ];
		if ( ! counts?.length ) {
			return 0;
		}
		return Math.round(
			counts.reduce( ( a, b ) => a + b, 0 ) / counts.length
		);
	};

	// Build the rules list. Each rule is a plain string; the model returns
	// the indices of rules that apply.
	const rules = [
		manifest.headline && avgWords( 'headline' ) > 10
			? 'Headline is over 10 words — cover blocks work best with 5–10'
			: null,
		! manifest.image
			? 'No image — adding one unlocks more layout options'
			: null,
		! manifest.cta
			? 'No CTA — adding one unlocks button-focused layouts'
			: null,
		manifest.paragraph && avgWords( 'paragraph' ) > 150
			? 'Paragraph over 150 words may overflow compact column layouts'
			: null,
		! manifest.quote && manifest.paragraph >= 2
			? 'No quote — adding a pullquote adds visual contrast to text-heavy layouts'
			: null,
	].filter( Boolean );

	// If no rules are applicable, skip the inference call.
	if ( rules.length === 0 ) {
		return { hints: [] };
	}

	const rulesText = rules.map( ( r, i ) => `${ i }: ${ r }` ).join( '\n' );

	const prompt = `Content manifest: ${ formatManifest( manifest ) }
Possible content improvement suggestions:
${ rulesText }
Which suggestion indices apply to this content? Return only indices from the list above.
Respond with valid JSON only: {"apply": [0, 2]}`;

	const result = await runInference( engine, prompt, 0.3, 32 );
	const hints = Array.isArray( result.apply )
		? result.apply
				.filter(
					( i ) =>
						typeof i === 'number' &&
						Number.isInteger( i ) &&
						i >= 0 &&
						i < rules.length
				)
				.map( ( i ) => rules[ i ] )
		: [];
	return { hints };
}
