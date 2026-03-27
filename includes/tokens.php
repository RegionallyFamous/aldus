<?php
declare(strict_types=1);
/**
 * Token vocabulary, anchors, requirements, pruning, and validation.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Returns every token string recognised by aldus_render_block_token().
 *
 * @return list<string>
 */
function aldus_valid_tokens(): array {
	static $cached = null;
	if ( null !== $cached ) {
		return $cached;
	}
	$tokens = array(
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
		'group:light-full',
		'group:accent-full',
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
		// Layout primitives (v1.1+)
		'group:grid',
		'row:stats',
		'details:accordion',
		'code:block',
		'paragraph:lead',
	);

	/**
	 * Filter the list of valid layout tokens.
	 *
	 * Add entries here to register custom tokens handled by an `aldus_tokens_before_render` filter.
	 *
	 * @param string[] $tokens List of valid token strings.
	 */
	$cached = (array) apply_filters( 'aldus_valid_tokens', $tokens );
	return $cached;
}

/**
 * Validates the tokens argument for /assemble.
 *
 * @param mixed $value
 * @return bool|WP_Error
 */
function aldus_validate_tokens_arg( mixed $value ): bool|WP_Error {
	if ( ! is_array( $value ) || empty( $value ) ) {
		return new WP_Error( 'invalid_tokens', __( 'Tokens must be a non-empty array.', 'aldus' ), array( 'status' => 400 ) );
	}
	if ( count( $value ) > 30 ) {
		return new WP_Error( 'too_many_tokens', __( 'Maximum 30 tokens allowed.', 'aldus' ), array( 'status' => 400 ) );
	}
	$valid = aldus_valid_tokens();
	foreach ( $value as $token ) {
		$sanitized = aldus_sanitize_token( is_string( $token ) ? $token : '' );
		if ( ! in_array( $sanitized, $valid, true ) ) {
			return new WP_Error(
				'invalid_token',
				/* translators: %s: the unrecognised token string */
				sprintf( __( 'Unrecognised token: %s', 'aldus' ), sanitize_text_field( (string) $token ) ),
				array( 'status' => 400 )
			);
		}
	}
	return true;
}

// ---------------------------------------------------------------------------
// Anchor enforcement — structural variety guarantee
// ---------------------------------------------------------------------------

/**
 * Per-personality required anchor tokens. If the LLM omits them, PHP inserts
 * them at the front of the sequence. This guarantees 8 structurally distinct
 * layouts even if the small model produces redundant output.
 *
 * Uses a static cache so the array is only built once per request regardless
 * of how many times it is called (anchor enforcement + pruning both call it).
 *
 * @return array<string,list<string>>
 */
function aldus_anchor_tokens(): array {
	static $map = null;
	if ( null !== $map ) {
		return $map;
	}
	$base = array(
		// Original 8
		'Dispatch'   => array( 'cover:dark', 'pullquote:full-solid', 'buttons:cta' ),
		'Folio'      => array( 'columns:28-72', 'pullquote:wide', 'paragraph:lead' ),
		'Stratum'    => array( 'group:dark-full', 'group:light-full', 'group:accent-full' ),
		'Broadside'  => array( 'media-text:left', 'media-text:right', 'group:accent-full', 'row:stats' ),
		'Manifesto'  => array( 'heading:h1', 'group:dark-full', 'columns:3-equal', 'paragraph:lead' ),
		'Nocturne'   => array( 'cover:dark', 'image:full' ),
		'Tribune'    => array( 'columns:3-equal', 'pullquote:full-solid', 'group:grid', 'row:stats' ),
		'Overture'   => array( 'cover:light', 'media-text:right', 'group:accent-full' ),
		// Phase 1 additions
		'Codex'      => array( 'heading:display', 'heading:kicker', 'group:border-box', 'details:accordion', 'code:block', 'paragraph:lead' ),
		'Dusk'       => array( 'cover:split', 'group:gradient-full' ),
		'Broadsheet' => array( 'columns:4-equal', 'pullquote:centered', 'group:grid' ),
		'Solstice'   => array( 'cover:minimal', 'columns:2-equal' ),
		'Mirage'     => array( 'group:gradient-full', 'pullquote:centered', 'cover:split' ),
		'Ledger'     => array( 'columns:2-equal', 'quote:attributed', 'group:border-box', 'details:accordion', 'code:block' ),
		// Gallery personalities
		'Mosaic'     => array( 'gallery:3-col', 'buttons:cta' ),
		'Prism'      => array( 'columns:3-equal', 'gallery:3-col' ),
	);

	/**
	 * Filter the personality anchor map.
	 *
	 * Add, remove, or modify personalities. Each key is a personality name; each
	 * value is an array of token strings that must appear in that personality's output.
	 *
	 * @param array<string, string[]> $personalities Personality name → required anchor tokens.
	 */
	$map = (array) apply_filters( 'aldus_personalities', $base );
	return $map;
}

/**
 * Ensures required anchor tokens are present in the sequence.
 *
 * Strict personalities (creativity=0): missing anchors are prepended, locking
 * the opening structure. Loose personalities (creativity=1): missing anchors
 * are appended at the end, letting the model's ordering stand.
 *
 * @param string        $label     Layout personality label.
 * @param list<string>  $tokens    LLM-returned token sequence.
 * @param array<string,int> $manifest Content type counts.
 * @return list<string>
 */
function aldus_enforce_anchors( string $label, array $tokens, array $manifest ): array {
	$anchors_map = aldus_anchor_tokens();
	$required    = $anchors_map[ $label ] ?? array();

	// Derive loose/strict from the personality style rules table so that
	// adding a new personality to aldus_personality_style_rules() with an
	// explicit 'anchor_mode' key is sufficient — no separate list to maintain.
	// Unknown personalities default to 'strict' (prepend) for safety.
	$style_rules = aldus_personality_style_rules();
	$is_loose    = ( ( $style_rules[ $label ]['anchor_mode'] ?? 'strict' ) === 'loose' );

	// Prune tokens that need content we don't have (per-personality anchor exemption).
	$tokens = aldus_prune_unavailable_tokens( $tokens, $manifest, $label );

	// Build a hash set for O(1) membership checks during anchor insertion.
	$token_set = array_flip( $tokens );

	if ( $is_loose ) {
		foreach ( $required as $anchor ) {
			if ( ! isset( $token_set[ $anchor ] ) ) {
				$tokens[]             = $anchor;
				$token_set[ $anchor ] = true;
			}
		}
	} else {
		foreach ( array_reverse( $required ) as $anchor ) {
			if ( ! isset( $token_set[ $anchor ] ) ) {
				array_unshift( $tokens, $anchor );
				$token_set[ $anchor ] = true;
			}
		}
	}

	// Deduplicate — keep first occurrence only (preserves LLM ordering).
	$seen   = array();
	$unique = array();
	foreach ( $tokens as $token ) {
		if ( ! isset( $seen[ $token ] ) ) {
			$seen[ $token ] = true;
			$unique[]       = $token;
		}
	}

	return $unique;
}

/**
 * Maps every token that requires a specific content type to that type.
 *
 * Tokens absent from this map (headings, paragraphs, separators, spacers)
 * have no content requirement and are never pruned. For a given personality,
 * tokens that are both in this map and in that personality's anchor list are
 * still not pruned for missing content — see aldus_prune_unavailable_tokens().
 *
 * This is the single source of truth. Both aldus_prune_unavailable_tokens()
 * and Aldus_Content_Distributor::prepare() read from here.
 *
 * @return array<string, string>
 */
function aldus_token_content_requirements(): array {
	static $map = null;
	if ( null !== $map ) {
		return $map;
	}
	$map = array(
		'cover:dark'           => 'image',
		'cover:light'          => 'image',
		'cover:split'          => 'image',
		'media-text:left'      => 'image',
		'media-text:right'     => 'image',
		'image:wide'           => 'image',
		'image:full'           => 'image',
		'pullquote:wide'       => 'quote',
		'pullquote:full-solid' => 'quote',
		'pullquote:centered'   => 'quote',
		'quote'                => 'quote',
		'quote:attributed'     => 'quote',
		'buttons:cta'          => 'cta',
		'list'                 => 'list',
		'video:hero'           => 'video',
		'video:section'        => 'video',
		'table:data'           => 'table',
		'gallery:2-col'        => 'gallery',
		'gallery:3-col'        => 'gallery',
		'code:block'           => 'code',
	);
	return $map;
}

/**
 * Removes tokens that require content types absent from the manifest.
 *
 * Tokens that are layout anchors for the given personality are never pruned
 * (renderers may degrade gracefully on empty content for those slots).
 *
 * @param list<string>       $tokens
 * @param array<string,int>  $manifest
 * @param string             $personality_label Personality key, e.g. Dispatch.
 * @return list<string>
 */
function aldus_prune_unavailable_tokens( array $tokens, array $manifest, string $personality_label ): array {
	$anchors_map    = aldus_anchor_tokens();
	$person_anchors = $anchors_map[ $personality_label ] ?? array();
	$anchor_set     = array_flip( $person_anchors );
	$requirements   = aldus_token_content_requirements();

	return array_values(
		array_filter(
			$tokens,
			function ( string $token ) use ( $manifest, $anchor_set, $requirements ) {
				if ( isset( $anchor_set[ $token ] ) ) {
					return true;
				}
				$required_type = $requirements[ $token ] ?? null;
				if ( $required_type && empty( $manifest[ $required_type ] ) ) {
					return false;
				}
				return true;
			}
		)
	);
}
