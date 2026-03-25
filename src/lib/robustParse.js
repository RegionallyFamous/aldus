/**
 * robustParse — fault-tolerant JSON extraction from LLM output.
 *
 * Small models frequently emit:
 *   • Markdown code fences  (```json ... ```)
 *   • Preamble text before the JSON  ("Sure! Here is the JSON: {…}")
 *   • Trailing commas inside objects/arrays  ({a:1,})
 *   • A bare array instead of a wrapped object  (["token1","token2"])
 *
 * This helper tries four increasingly permissive strategies and returns the
 * first successful parse. Falls back to {} on total failure so callers can
 * always destructure the result unconditionally.
 *
 * @param {string} text Raw model output.
 * @return {Object} Parsed object, or {} on failure.
 */
export function robustParse( text ) {
	// Strip markdown code fences.
	const s = text
		.replace( /^```(?:json)?\s*/i, '' )
		.replace( /\s*```$/i, '' )
		.trim();

	// 1. Direct parse of the stripped string.
	try {
		return JSON.parse( s );
	} catch {}

	// 2. Extract first {...} block and repair trailing commas.
	const objMatch = s.match( /\{[\s\S]*\}/ );
	if ( objMatch ) {
		try {
			return JSON.parse( objMatch[ 0 ].replace( /,(\s*[}\]])/g, '$1' ) );
		} catch {}
	}

	// 3. Extract first [...] block and repair trailing commas.
	// Wrap in { tokens: [...] } so callers can always read result.tokens.
	const arrMatch = s.match( /\[[\s\S]*\]/ );
	if ( arrMatch ) {
		try {
			return {
				tokens: JSON.parse(
					arrMatch[ 0 ].replace( /,(\s*\])/g, '$1' )
				),
			};
		} catch {}
	}

	return {};
}
