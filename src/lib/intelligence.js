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

	try {
		const stripped = raw
			.replace( /^```(?:json)?\s*/i, '' )
			.replace( /\s*```$/i, '' )
			.trim();
		return JSON.parse( stripped );
	} catch ( err ) {
		if ( window?.aldusDebug ) {
			// eslint-disable-next-line no-console
			console.debug( '[Aldus intelligence] JSON parse failed. Raw:', raw, err );
		}
		return {};
	}
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
 * Infers a style direction phrase from the content manifest and items.
 *
 * The model picks from a closed vocabulary so hallucinated directions are
 * impossible. The result is prepended to the user's styleNote when running
 * token generation.
 *
 * @param {Object} engine   WebLLM engine instance.
 * @param {Object} manifest Map of content type → count.
 * @param {Array}  items    Content item objects (used for word-count previews).
 * @return {Promise<{style: string}>}  style is '' on failure.
 */
export async function inferStyleDirection( engine, manifest, items ) {
	const STYLE_OPTIONS = [
		'text-heavy editorial',
		'image-forward visual',
		'minimal product',
		'cta-focused landing',
		'dark atmospheric',
		'mixed',
	];

	// Build short content preview: first 8 words of each paragraph / quote.
	const previews = items
		.filter( ( i ) => i.type === 'paragraph' || i.type === 'quote' )
		.slice( 0, 3 )
		.map( ( i ) => {
			const words = ( i.content ?? '' )
				.trim()
				.split( /\s+/ )
				.slice( 0, 8 );
			return words.join( ' ' );
		} )
		.filter( Boolean );

	const previewSection =
		previews.length > 0
			? `\nContent preview: ${ previews.join( ' / ' ) }`
			: '';

	const prompt = `Given this content manifest, pick the single best style direction.
Manifest: ${ formatManifest( manifest ) }${ previewSection }
Style options: ${ STYLE_OPTIONS.join( ' | ' ) }
Respond with valid JSON only: {"style": "..."}`;

	const result = await runInference( engine, prompt, 0.4, 32 );
	const style =
		typeof result.style === 'string' &&
		STYLE_OPTIONS.includes( result.style )
			? result.style
			: '';
	return { style };
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
	return { description };
}

// ---------------------------------------------------------------------------
// 4. recommendPersonalities
// ---------------------------------------------------------------------------

/**
 * Picks 3 personalities whose anchor tokens best match the available content.
 *
 * The prompt lists only personality name + anchor tokens (no prose descriptions)
 * to keep the context short enough for reliable 360M output. The model acts
 * as a ranker: which personalities are most satisfiable given the manifest?
 *
 * @param {Object} engine        WebLLM engine instance.
 * @param {Object} manifest      Map of content type → count.
 * @param {Array}  personalities Full personality objects (name, anchors).
 * @return {Promise<{recommended: string[]}>}  recommended is [] on failure.
 */
export async function recommendPersonalities(
	engine,
	manifest,
	personalities
) {
	const personalityLines = personalities
		.map( ( p ) => `${ p.name }: ${ ( p.anchors ?? [] ).join( ', ' ) }` )
		.join( '\n' );

	const prompt = `Content manifest: ${ formatManifest( manifest ) }
Personalities and their required layout tokens:
${ personalityLines }
Pick exactly 3 personality names that best match the available content types.
Return only names from the list above.
Respond with valid JSON only: {"recommended": ["Name1", "Name2", "Name3"]}`;

	const result = await runInference( engine, prompt, 0.4, 48 );
	const validNames = new Set( personalities.map( ( p ) => p.name ) );
	const recommended = Array.isArray( result.recommended )
		? result.recommended
				.filter( ( n ) => typeof n === 'string' && validNames.has( n ) )
				.slice( 0, 3 )
		: [];
	return { recommended };
}

// ---------------------------------------------------------------------------
// 5. analyzeContentHints
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
