/**
 * Infers a style direction phrase from the user's content manifest using the LLM engine.
 * Designed to be called with an 800 ms debounce when items change.
 */

/**
 * Returns a short style-direction phrase (2-4 words) based on the content
 * types present in the manifest, or null if the engine is unavailable or the
 * manifest is empty.
 *
 * @param {Object|null} engine   An initialised MLCEngine instance, or null.
 * @param {Object}      manifest Map of { [contentType]: count } built from items.
 * @return {Promise<string|null>} Short phrase like "bold editorial" or null.
 */
export async function inferStyleFromContent( engine, manifest ) {
	if ( ! engine || ! manifest || Object.keys( manifest ).length === 0 ) {
		return null;
	}

	try {
		const contentSummary = Object.entries( manifest )
			.map( ( [ type, count ] ) => `${ count }× ${ type }` )
			.join( ', ' );

		const prompt =
			`You are a layout design assistant. Based on this content: ${ contentSummary }.\n` +
			`Suggest ONE short style phrase (2-4 words, all lowercase) that describes the best layout direction, e.g. "bold editorial", "minimal text-first", "image-forward feature", "data-driven analysis".\n` +
			`Respond with ONLY the phrase — no punctuation, no explanation.`;

		const result = await engine.chat.completions.create( {
			messages: [ { role: 'user', content: prompt } ],
			max_tokens: 12,
			temperature: 0.4,
		} );

		const raw = result?.choices?.[ 0 ]?.message?.content?.trim() ?? '';

		if ( ! raw || raw.length > 60 ) {
			return null;
		}

		return raw
			.replace( /["""'']/g, '' )
			.replace( /\.$/, '' )
			.trim()
			.toLowerCase();
	} catch {
		return null;
	}
}

/**
 * Map of style chip values to keyword patterns.
 * Used to auto-select the closest chip when an inferred phrase matches.
 */
export const CHIP_KEYWORDS = {
	'image-lead': [ 'image', 'photo', 'visual', 'gallery', 'picture' ],
	'text-first': [ 'text', 'editorial', 'article', 'prose', 'read' ],
	minimal: [ 'minimal', 'clean', 'simple', 'stripped' ],
	'cta-focus': [ 'cta', 'action', 'conversion', 'sales', 'product', 'pitch' ],
	dark: [ 'dark', 'moody', 'nocturne', 'dramatic' ],
	magazine: [ 'magazine', 'feature', 'story', 'spread', 'journalistic' ],
};

/**
 * Returns the chip value whose keywords best match the inferred phrase, or null.
 *
 * @param {string} phrase Inferred style phrase.
 * @return {string|null} Matching chip value, or null.
 */
export function matchChipToPhrase( phrase ) {
	if ( ! phrase ) {
		return null;
	}
	const lower = phrase.toLowerCase();
	for ( const [ chip, keywords ] of Object.entries( CHIP_KEYWORDS ) ) {
		if ( keywords.some( ( kw ) => lower.includes( kw ) ) ) {
			return chip;
		}
	}
	return null;
}
