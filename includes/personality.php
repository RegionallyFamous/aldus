<?php
declare(strict_types=1);
/**
 * Personality style rules, token weights, variant picking, and spacer heights.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ---------------------------------------------------------------------------
// Theme-adaptive sizing helpers
// ---------------------------------------------------------------------------

/**
 * Returns the appropriate spacer block height for the given size, scaled to
 * the theme's block gap so Aldus layouts don't double up on whitespace.
 *
 * @param string $size 'small' | 'large' | 'xlarge'
 * @return string Height value including unit, e.g. '32px'.
 */
function aldus_spacer_height( string $size ): string {
	$scale = aldus_theme_spacer_scale();
	$map   = array(
		'generous' => array(
			'small'  => '16px',
			'large'  => '32px',
			'xlarge' => '48px',
		),
		'normal'   => array(
			'small'  => '32px',
			'large'  => '64px',
			'xlarge' => '96px',
		),
		'tight'    => array(
			'small'  => '48px',
			'large'  => '80px',
			'xlarge' => '120px',
		),
	);
	return $map[ $scale ][ $size ] ?? '64px';
}

// ---------------------------------------------------------------------------
// Art direction helpers — personality rules, variant picking, section weights
// ---------------------------------------------------------------------------

/**
 * Deterministic seeded variant picker.
 * Returns an integer in [0, $count) that varies by both seed and key,
 * so the same seed produces different variant picks for different tokens
 * without feeling random.
 *
 * @param int    $seed   Per-personality layout seed (0–N).
 * @param string $key    Diversification key — use the token name or an intent string.
 * @param int    $count  Number of variants to pick among.
 */
function aldus_variant_pick( int $seed, string $key, int $count ): int {
	if ( $count <= 1 ) {
		return 0;
	}
	// crc32 gives better distribution than a simple polynomial hash,
	// especially for short keys like "h1" or "p" where the poly hash
	// is dominated by the seed rather than the key.
	return ( abs( $seed * 7 + crc32( $key ) ) ) % $count;
}

/**
 * Returns per-personality art-direction rules.
 *
 * Each personality entry has four knobs:
 *   align    — 'left' | 'centered' | 'mixed'
 *   density  — 'airy' | 'balanced' | 'dense'
 *   contrast — 'medium' | 'high'
 *   accent   — 'restrained' | 'pronounced'
 *
 * @return array<string, array{align:string,density:string,contrast:string,accent:string}>
 */
function aldus_personality_style_rules(): array {
	static $rules = null;
	if ( null !== $rules ) {
		return $rules;
	}
	// Each personality has eight knobs:
	//   align         — 'left' | 'centered' | 'mixed'
	//   density       — 'airy' | 'balanced' | 'dense'
	//   contrast      — 'medium' | 'high'
	//   accent        — 'restrained' | 'pronounced'
	//   blockGap      — '1rem' | '1.5rem' | '2rem'  (derived from density)
	//   edges         — 'soft' | 'sharp' | 'default' (border-radius treatment)
	//   separator     — 'default' | 'wide' | 'dots'  (separator style variant)
	//   interactivity — comma-separated effect names applied to generated blocks
	//                   '' = none | 'parallax' | 'reveal' | 'countup'
	//                   Multiple: 'parallax,reveal'
	// anchor_mode — controls how aldus_enforce_anchors() places missing required
	// tokens for each personality:
	//   'loose'  — anchors are APPENDED, letting the model's ordering lead.
	//   'strict' — anchors are PREPENDED, locking the opening structure.
	// When adding a new personality, explicitly set anchor_mode so the intent is
	// clear rather than silently falling back to a default.
	$rules = array(
		'Dispatch'   => array(
			'align'         => 'left',
			'density'       => 'balanced',
			'contrast'      => 'high',
			'accent'        => 'restrained',
			'blockGap'      => '1.5rem',
			'edges'         => 'sharp',
			'separator'     => 'wide',
			'interactivity' => 'parallax,reveal',
			'anchor_mode'   => 'strict',
		),
		'Tribune'    => array(
			'align'         => 'centered',
			'density'       => 'dense',
			'contrast'      => 'medium',
			'accent'        => 'restrained',
			'blockGap'      => '1rem',
			'edges'         => 'sharp',
			'separator'     => 'wide',
			'interactivity' => 'countup',
			'anchor_mode'   => 'strict',
		),
		'Folio'      => array(
			'align'         => 'left',
			'density'       => 'airy',
			'contrast'      => 'medium',
			'accent'        => 'restrained',
			'blockGap'      => '2rem',
			'edges'         => 'default',
			'separator'     => 'default',
			'interactivity' => 'reveal',
			'anchor_mode'   => 'strict',
		),
		'Nocturne'   => array(
			'align'         => 'centered',
			'density'       => 'airy',
			'contrast'      => 'high',
			'accent'        => 'pronounced',
			'blockGap'      => '2rem',
			'edges'         => 'default',
			'separator'     => 'wide',
			'interactivity' => 'parallax,reveal',
			'anchor_mode'   => 'loose',
		),
		'Broadsheet' => array(
			'align'         => 'left',
			'density'       => 'dense',
			'contrast'      => 'high',
			'accent'        => 'restrained',
			'blockGap'      => '1rem',
			'edges'         => 'sharp',
			'separator'     => 'wide',
			'interactivity' => '',
			'anchor_mode'   => 'strict',
		),
		'Codex'      => array(
			'align'         => 'left',
			'density'       => 'balanced',
			'contrast'      => 'medium',
			'accent'        => 'restrained',
			'blockGap'      => '1.5rem',
			'edges'         => 'sharp',
			'separator'     => 'default',
			'interactivity' => '',
			'anchor_mode'   => 'loose',
		),
		'Dusk'       => array(
			'align'         => 'centered',
			'density'       => 'airy',
			'contrast'      => 'high',
			'accent'        => 'pronounced',
			'blockGap'      => '2rem',
			'edges'         => 'default',
			'separator'     => 'wide',
			'interactivity' => 'parallax,reveal',
			'anchor_mode'   => 'loose',
		),
		'Solstice'   => array(
			'align'         => 'centered',
			'density'       => 'balanced',
			'contrast'      => 'high',
			'accent'        => 'pronounced',
			'blockGap'      => '1.5rem',
			'edges'         => 'soft',
			'separator'     => 'wide',
			'interactivity' => 'reveal',
			'anchor_mode'   => 'loose',
		),
		'Mirage'     => array(
			'align'         => 'mixed',
			'density'       => 'airy',
			'contrast'      => 'high',
			'accent'        => 'pronounced',
			'blockGap'      => '2rem',
			'edges'         => 'soft',
			'separator'     => 'wide',
			'interactivity' => 'reveal',
			'anchor_mode'   => 'loose',
		),
		'Ledger'     => array(
			'align'         => 'left',
			'density'       => 'dense',
			'contrast'      => 'medium',
			'accent'        => 'restrained',
			'blockGap'      => '1rem',
			'edges'         => 'default',
			'separator'     => 'dots',
			'interactivity' => '',
			'anchor_mode'   => 'strict',
		),
		'Mosaic'     => array(
			'align'         => 'mixed',
			'density'       => 'balanced',
			'contrast'      => 'high',
			'accent'        => 'pronounced',
			'blockGap'      => '1.5rem',
			'edges'         => 'default',
			'separator'     => 'wide',
			'interactivity' => 'reveal',
			'anchor_mode'   => 'loose',
		),
		'Prism'      => array(
			'align'         => 'mixed',
			'density'       => 'airy',
			'contrast'      => 'high',
			'accent'        => 'pronounced',
			'blockGap'      => '2rem',
			'edges'         => 'soft',
			'separator'     => 'wide',
			'interactivity' => 'reveal',
			'anchor_mode'   => 'strict',
		),
		'Broadside'  => array(
			'align'         => 'left',
			'density'       => 'balanced',
			'contrast'      => 'high',
			'accent'        => 'pronounced',
			'blockGap'      => '1.5rem',
			'edges'         => 'default',
			'separator'     => 'wide',
			'interactivity' => 'reveal',
			'anchor_mode'   => 'strict',
		),
		'Manifesto'  => array(
			'align'         => 'centered',
			'density'       => 'airy',
			'contrast'      => 'high',
			'accent'        => 'pronounced',
			'blockGap'      => '2rem',
			'edges'         => 'default',
			'separator'     => 'wide',
			'interactivity' => 'parallax,reveal',
			'anchor_mode'   => 'strict',
		),
		'Overture'   => array(
			'align'         => 'centered',
			'density'       => 'airy',
			'contrast'      => 'medium',
			'accent'        => 'pronounced',
			'blockGap'      => '2rem',
			'edges'         => 'soft',
			'separator'     => 'wide',
			'interactivity' => 'reveal',
			'anchor_mode'   => 'loose',
		),
		'Stratum'    => array(
			'align'         => 'left',
			'density'       => 'balanced',
			'contrast'      => 'high',
			'accent'        => 'restrained',
			'blockGap'      => '1.5rem',
			'edges'         => 'default',
			'separator'     => 'wide',
			'interactivity' => 'reveal',
			'anchor_mode'   => 'loose',
		),
	);
	$rules = (array) apply_filters( 'aldus_personality_style_rules', $rules );
	return $rules;
}

/**
 * Returns a visual-weight category for each token.
 * Used by the rhythm pass to avoid stacking visually heavy sections.
 *
 * Categories: 'heavy' | 'visual' | 'reading' | 'cta' | 'utility'
 *
 * @return array<string,string>
 */
function aldus_token_weights(): array {
	static $weights = null;
	if ( null !== $weights ) {
		return $weights;
	}
	$weights = array(
		'cover:dark'           => 'heavy',
		'cover:light'          => 'heavy',
		'cover:minimal'        => 'heavy',
		'cover:split'          => 'heavy',
		'heading:display'      => 'heavy',
		'pullquote:full-solid' => 'heavy',
		'group:dark-full'      => 'heavy',
		'group:gradient-full'  => 'heavy',
		'video:hero'           => 'visual',
		'media-text:left'      => 'visual',
		'media-text:right'     => 'visual',
		'image:wide'           => 'visual',
		'image:full'           => 'visual',
		'gallery:2-col'        => 'visual',
		'gallery:3-col'        => 'visual',
		'video:section'        => 'visual',
		'group:accent-full'    => 'visual',
		'group:light-full'     => 'reading',
		'group:border-box'     => 'reading',
		'columns:2-equal'      => 'reading',
		'columns:28-72'        => 'reading',
		'columns:3-equal'      => 'reading',
		'columns:4-equal'      => 'reading',
		'pullquote:wide'       => 'reading',
		'pullquote:centered'   => 'reading',
		'heading:h1'           => 'reading',
		'heading:h2'           => 'reading',
		'heading:h3'           => 'reading',
		'heading:kicker'       => 'reading',
		'paragraph'            => 'reading',
		'paragraph:dropcap'    => 'reading',
		'quote'                => 'reading',
		'quote:attributed'     => 'reading',
		'list'                 => 'reading',
		'table:data'           => 'reading',
		'buttons:cta'          => 'cta',
		'separator'            => 'utility',
		'spacer:small'         => 'utility',
		'spacer:large'         => 'utility',
		'spacer:xlarge'        => 'utility',
		// New layout tokens
		'group:grid'           => 'reading',
		'row:stats'            => 'reading',
		'details:accordion'    => 'reading',
		'code:block'           => 'reading',
		'paragraph:lead'       => 'reading',
	);
	return $weights;
}
