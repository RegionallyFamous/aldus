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

	// 2. Extract first balanced {...} block and repair trailing commas.
	// A greedy regex /{[\s\S]*}/ would match the *largest* span and grab too
	// much when the string contains multiple objects.  Instead, walk the string
	// character-by-character to find the matching closing brace.
	const objStart = s.indexOf( '{' );
	if ( objStart !== -1 ) {
		let depth = 0;
		let inString = false;
		let escape = false;
		for ( let i = objStart; i < s.length; i++ ) {
			const ch = s[ i ];
			if ( escape ) {
				escape = false;
				continue;
			}
			if ( ch === '\\' && inString ) {
				escape = true;
				continue;
			}
			if ( ch === '"' ) {
				inString = ! inString;
				continue;
			}
			if ( inString ) {
				continue;
			}
			if ( ch === '{' ) {
				depth++;
			} else if ( ch === '}' ) {
				depth--;
				if ( depth === 0 ) {
					const candidate = s.slice( objStart, i + 1 );
					try {
						return JSON.parse(
							candidate.replace( /,(\s*[}\]])/g, '$1' )
						);
					} catch {}
					break;
				}
			}
		}
	}

	// 3. Extract first balanced [...] block and repair trailing commas.
	// Wrap in { tokens: [...] } so callers can always read result.tokens.
	const arrStart = s.indexOf( '[' );
	if ( arrStart !== -1 ) {
		let depth = 0;
		let inString = false;
		let escape = false;
		for ( let i = arrStart; i < s.length; i++ ) {
			const ch = s[ i ];
			if ( escape ) {
				escape = false;
				continue;
			}
			if ( ch === '\\' && inString ) {
				escape = true;
				continue;
			}
			if ( ch === '"' ) {
				inString = ! inString;
				continue;
			}
			if ( inString ) {
				continue;
			}
			if ( ch === '[' ) {
				depth++;
			} else if ( ch === ']' ) {
				depth--;
				if ( depth === 0 ) {
					const candidate = s.slice( arrStart, i + 1 );
					try {
						return {
							tokens: JSON.parse(
								candidate.replace( /,(\s*\])/g, '$1' )
							),
						};
					} catch {}
					break;
				}
			}
		}
	}

	return {};
}
