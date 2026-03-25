/**
 * LLM prompt builders for Aldus layout generation.
 * Generates structured prompts for each personality and enforces anchor tokens.
 */

import { VALID_TOKENS, formatTokenPool } from '../data/tokens.js';

export function buildPersonalityPrompt(
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

export function enforceAnchors( personality, tokens ) {
	const tokenSet = new Set( tokens );
	const missing = personality.anchors.filter( ( a ) => ! tokenSet.has( a ) );
	// Strict (creativity: 0): missing anchors go to the front.
	// Loose (creativity: 1): missing anchors are appended at the end.
	return personality.creativity === 0
		? [ ...missing, ...tokens ]
		: [ ...tokens, ...missing ];
}
