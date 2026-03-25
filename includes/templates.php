<?php
declare(strict_types=1);
/**
 * Aldus_Content_Distributor and block token renderers.
 *
 * Every piece of user content is escaped at the point of output:
 *   - Plain text    → esc_html()
 *   - Image URLs    → esc_url()
 *   - Color slugs   → sanitize_html_class()
 *   - JSON attrs    → wp_json_encode() / esc_attr() on the encoded string
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ---------------------------------------------------------------------------
// Content Distributor
// ---------------------------------------------------------------------------

/**
 * Distributes sanitized content items into block token slots.
 * Each content type has its own cursor; items are consumed in order.
 */
class Aldus_Content_Distributor {

	/** @var array<string, list<array{type:string,content:string,url:string}>> */
	private array $pools = array();

	/** @var array<string, int> */
	private array $cursors = array();

	/**
	 * @param list<array{type:string,content:string,url:string}> $items
	 */
	public function __construct( array $items ) {
		foreach ( $items as $item ) {
			$type = sanitize_key( $item['type'] ?? '' );
			if ( $type ) {
				$this->pools[ $type ][] = $item;
			}
		}
		foreach ( array_keys( $this->pools ) as $type ) {
			$this->cursors[ $type ] = 0;
		}
	}

	/**
	 * Returns and advances the cursor for a type, or null if exhausted.
	 *
	 * @param string $type
	 * @return array{type:string,content:string,url:string}|null
	 */
	public function consume( string $type ): ?array {
		if ( ! isset( $this->pools[ $type ] ) ) {
			return null;
		}
		$cursor = $this->cursors[ $type ] ?? 0;
		if ( $cursor >= count( $this->pools[ $type ] ) ) {
			return null;
		}
		$this->cursors[ $type ] = $cursor + 1;
		return $this->pools[ $type ][ $cursor ];
	}

	/** Resets all cursors for re-use across layouts. */
	public function reset(): void {
		foreach ( array_keys( $this->pools ) as $type ) {
			$this->cursors[ $type ] = 0;
		}
	}

	/**
	 * True if the type has at least one unconsumed item.
	 *
	 * @param string $type
	 */
	public function has( string $type ): bool {
		return isset( $this->pools[ $type ] ) &&
			( $this->cursors[ $type ] ?? 0 ) < count( $this->pools[ $type ] );
	}

	/**
	 * Returns the next item without advancing the cursor.
	 *
	 * @param string $type
	 * @return array{type:string,content:string,url:string}|null
	 */
	public function peek( string $type ): ?array {
		if ( ! isset( $this->pools[ $type ] ) ) {
			return null;
		}
		$cursor = $this->cursors[ $type ] ?? 0;
		return $this->pools[ $type ][ $cursor ] ?? null;
	}

	/**
	 * Returns the count of remaining unconsumed items for a type.
	 *
	 * @param string $type
	 * @return int
	 */
	public function remaining( string $type ): int {
		if ( ! isset( $this->pools[ $type ] ) ) {
			return 0;
		}
		return max( 0, count( $this->pools[ $type ] ) - ( $this->cursors[ $type ] ?? 0 ) );
	}

	/**
	 * Prepares pools before a render pass.
	 *
	 * Resets all cursors to 0 (guards against stale state from a previous
	 * layout's partial run) and sorts the quote pool shortest-first so
	 * pullquote tokens — which appear early in most sequences — get the
	 * punchiest quote while longer ones fall to the plain core/quote slots.
	 */
	public function prepare(): void {
		foreach ( array_keys( $this->pools ) as $type ) {
			$this->cursors[ $type ] = 0;
		}

		if ( isset( $this->pools['quote'] ) && count( $this->pools['quote'] ) > 1 ) {
			usort(
				$this->pools['quote'],
				// mb_strlen for accurate character count with UTF-8 / non-Latin quotes.
				fn( $a, $b ) => mb_strlen( (string) ( $a['content'] ?? '' ) ) <=> mb_strlen( (string) ( $b['content'] ?? '' ) )
			);
		}
	}
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
	// Each personality has seven knobs:
	//   align     — 'left' | 'centered' | 'mixed'
	//   density   — 'airy' | 'balanced' | 'dense'
	//   contrast  — 'medium' | 'high'
	//   accent    — 'restrained' | 'pronounced'
	//   blockGap  — '1rem' | '1.5rem' | '2rem'  (derived from density)
	//   edges     — 'soft' | 'sharp' | 'default' (border-radius treatment)
	//   separator — 'default' | 'wide' | 'dots'  (separator style variant)
	$rules = array(
		'Dispatch'   => array(
			'align'     => 'left',
			'density'   => 'balanced',
			'contrast'  => 'high',
			'accent'    => 'restrained',
			'blockGap'  => '1.5rem',
			'edges'     => 'sharp',
			'separator' => 'wide',
		),
		'Tribune'    => array(
			'align'     => 'centered',
			'density'   => 'dense',
			'contrast'  => 'medium',
			'accent'    => 'restrained',
			'blockGap'  => '1rem',
			'edges'     => 'sharp',
			'separator' => 'wide',
		),
		'Folio'      => array(
			'align'     => 'left',
			'density'   => 'airy',
			'contrast'  => 'medium',
			'accent'    => 'restrained',
			'blockGap'  => '2rem',
			'edges'     => 'default',
			'separator' => 'default',
		),
		'Nocturne'   => array(
			'align'     => 'centered',
			'density'   => 'airy',
			'contrast'  => 'high',
			'accent'    => 'pronounced',
			'blockGap'  => '2rem',
			'edges'     => 'default',
			'separator' => 'wide',
		),
		'Broadsheet' => array(
			'align'     => 'left',
			'density'   => 'dense',
			'contrast'  => 'high',
			'accent'    => 'restrained',
			'blockGap'  => '1rem',
			'edges'     => 'sharp',
			'separator' => 'wide',
		),
		'Codex'      => array(
			'align'     => 'left',
			'density'   => 'balanced',
			'contrast'  => 'medium',
			'accent'    => 'restrained',
			'blockGap'  => '1.5rem',
			'edges'     => 'sharp',
			'separator' => 'default',
		),
		'Dusk'       => array(
			'align'     => 'centered',
			'density'   => 'airy',
			'contrast'  => 'high',
			'accent'    => 'pronounced',
			'blockGap'  => '2rem',
			'edges'     => 'default',
			'separator' => 'wide',
		),
		'Solstice'   => array(
			'align'     => 'centered',
			'density'   => 'balanced',
			'contrast'  => 'high',
			'accent'    => 'pronounced',
			'blockGap'  => '1.5rem',
			'edges'     => 'soft',
			'separator' => 'wide',
		),
		'Mirage'     => array(
			'align'     => 'mixed',
			'density'   => 'airy',
			'contrast'  => 'high',
			'accent'    => 'pronounced',
			'blockGap'  => '2rem',
			'edges'     => 'soft',
			'separator' => 'wide',
		),
		'Ledger'     => array(
			'align'     => 'left',
			'density'   => 'dense',
			'contrast'  => 'medium',
			'accent'    => 'restrained',
			'blockGap'  => '1rem',
			'edges'     => 'default',
			'separator' => 'dots',
		),
		'Mosaic'     => array(
			'align'     => 'mixed',
			'density'   => 'balanced',
			'contrast'  => 'high',
			'accent'    => 'pronounced',
			'blockGap'  => '1.5rem',
			'edges'     => 'default',
			'separator' => 'wide',
		),
		'Prism'      => array(
			'align'     => 'mixed',
			'density'   => 'airy',
			'contrast'  => 'high',
			'accent'    => 'pronounced',
			'blockGap'  => '2rem',
			'edges'     => 'soft',
			'separator' => 'wide',
		),
		'Broadside'  => array(
			'align'     => 'left',
			'density'   => 'balanced',
			'contrast'  => 'high',
			'accent'    => 'pronounced',
			'blockGap'  => '1.5rem',
			'edges'     => 'default',
			'separator' => 'wide',
		),
		'Manifesto'  => array(
			'align'     => 'centered',
			'density'   => 'airy',
			'contrast'  => 'high',
			'accent'    => 'pronounced',
			'blockGap'  => '2rem',
			'edges'     => 'default',
			'separator' => 'wide',
		),
		'Overture'   => array(
			'align'     => 'centered',
			'density'   => 'airy',
			'contrast'  => 'medium',
			'accent'    => 'pronounced',
			'blockGap'  => '2rem',
			'edges'     => 'soft',
			'separator' => 'wide',
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

// ---------------------------------------------------------------------------
// Token renderer dispatcher
// ---------------------------------------------------------------------------

/**
 * Renders a single block token into serialized WordPress block markup.
 * Returns an empty string if the token has no content to render.
 *
 * @param string                    $token
 * @param Aldus_Content_Distributor $dist
 * @param list<array{slug:string,color:string}> $palette
 * @param list<array{slug:string}>  $font_sizes
 * @param int                       $index        Position in the layout sequence.
 * @param int                       $layout_seed  Per-personality seed (0–N) for variant selection.
 * @param array                     $context      Optional art-direction context:
 *                                                  'theme'    — precomputed dark/light/accent/large/gradient
 *                                                  'style'    — personality art-direction rules
 *                                                  'rhythm'   — per-position rhythm hints
 *                                                  'manifest' — content-type counts for the whole request
 * @return string Serialized block markup.
 */
function aldus_render_block_token(
	string $token,
	Aldus_Content_Distributor $dist,
	array $palette,
	array $font_sizes,
	int $index = 0,
	int $layout_seed = 0,
	array $context = array()
): string {
	// Unpack precomputed theme values; fall back to live computation for
	// backward compatibility when called without a context.
	$theme        = $context['theme'] ?? array();
	$style        = $context['style'] ?? array();
	$rhythm       = $context['rhythm'] ?? array();
	$manifest     = $context['manifest'] ?? array();
	$use_bindings = (bool) ( $context['use_bindings'] ?? false );

	$dark     = $theme['dark'] ?? aldus_pick_dark( $palette );
	$light    = $theme['light'] ?? aldus_pick_light( $palette );
	$accent   = $theme['accent'] ?? aldus_pick_accent( $palette );
	$large    = $theme['large'] ?? aldus_pick_large_font( $font_sizes );
	$gradient = $theme['gradient'] ?? aldus_pick_gradient( aldus_get_theme_gradients() );

	$s_align     = $style['align'] ?? 'left';
	$s_density   = $style['density'] ?? 'balanced';
	$s_contrast  = $style['contrast'] ?? 'medium';
	$s_accent    = $style['accent'] ?? 'restrained';
	$s_block_gap = $style['blockGap'] ?? '1.5rem';
	$s_edges     = $style['edges'] ?? 'default';
	$s_separator = $style['separator'] ?? 'wide';

	// Compute border-radius from edges setting.
	$s_radius = '';
	if ( 'soft' === $s_edges ) {
		$s_radius = '8px';
	} elseif ( 'sharp' === $s_edges ) {
		$s_radius = '0';
	}

	$prev_heavy = $rhythm['prev_heavy'] ?? false;

	$has_quote = ( $manifest['quote'] ?? 0 ) > 0;
	$has_image = ( $manifest['image'] ?? 0 ) > 0;
	$has_list  = ( $manifest['list'] ?? 0 ) > 0;
	$has_cta   = ( $manifest['cta'] ?? 0 ) > 0;

	// Mixes layout_seed + index + personality style traits + rhythm context
	// so the same sequence looks visually different across personalities.
	$v_base  = $layout_seed + $index;
	$v_base += ( 'high' === $s_contrast ) ? 2 : 0;
	$v_base += ( 'centered' === $s_align ) ? 1 : 0;
	$v_base += ( 'airy' === $s_density ) ? 1 : 0;
	$v_base += $prev_heavy ? 3 : 0;

	$variant5 = aldus_variant_pick( $v_base, $token, 5 );
	$variant4 = aldus_variant_pick( $v_base, $token, 4 );
	$variant3 = aldus_variant_pick( $v_base, $token, 3 );
	$variant2 = aldus_variant_pick( $v_base, $token, 2 );

	switch ( $token ) {

		// ---- Cover blocks ----

		case 'cover:dark':
			// Content-aware: skip product-hero variant (3) if no CTA in manifest.
			$cv      = ( ! $has_cta && $variant5 === 3 ) ? 0 : $variant5;
			$post_id = (int) ( $context['post_id'] ?? 0 );
			return aldus_block_cover( $dist, $dark, 60, $large, false, 'Hero', $cv, $post_id );

		case 'cover:light':
			$cv      = ( ! $has_cta && $variant5 === 3 ) ? 1 : $variant5;
			$post_id = (int) ( $context['post_id'] ?? 0 );
			return aldus_block_cover( $dist, $light, 30, $large, true, 'Feature Cover', $cv, $post_id );

		case 'cover:minimal':
			return aldus_block_cover_minimal( $dist, $dark, $large, 'Minimal Cover' );

		case 'cover:split':
			return aldus_block_cover_split( $dist, $large, 'Split Cover' );

		// ---- Columns ----

		case 'columns:2-equal':
			// Content-aware: image pair only if images are in the manifest.
			$cv = ( ! $has_image && $variant5 === 4 ) ? 0 : $variant5;
			return aldus_block_columns_two_equal( $dist, 'Two Columns', $cv );

		case 'columns:28-72':
			// Alternate label side deterministically per occurrence using position + seed.
			$flip = (bool) aldus_variant_pick( $layout_seed, "28-72-flip:{$index}", 2 );
			return aldus_block_columns_asymmetric( $dist, $flip, 'Sidebar Layout', $variant3 );

		case 'columns:3-equal':
			return aldus_block_columns_three( $dist, $accent, 'Three Columns', $light );

		case 'columns:4-equal':
			return aldus_block_columns_four_equal( $dist, $accent, 'Four Columns' );

		// ---- Media-text ----

		case 'media-text:left':
			// Content-aware: list variant only if list content exists.
			$mv = ( ! $has_list && $variant4 === 3 ) ? 0 : $variant4;
			return aldus_block_media_text( $dist, 'left', 'Image Left', $mv );

		case 'media-text:right':
			$mv = ( ! $has_list && $variant4 === 3 ) ? 0 : $variant4;
			return aldus_block_media_text( $dist, 'right', 'Image Right', $mv );

		// ---- Group wrappers ----

		case 'group:dark-full':
			return aldus_block_group( $dist, $dark, 'white', true, 'Dark Section', $variant3, $s_block_gap );

		case 'group:accent-full':
			return aldus_block_group( $dist, $accent, '', false, 'Accent Section', $variant3, $s_block_gap );

		case 'group:light-full':
			return aldus_block_group( $dist, $light, '', false, 'Light Section', $variant3, $s_block_gap );

		case 'group:border-box':
			// Personality density: dense personalities prefer the CTA/list variant (1).
			$bv     = ( 'dense' === $s_density ) ? max( $variant2, 1 ) : $variant2;
			$shadow = 'var(--wp--preset--shadow--natural, 0 2px 8px rgba(0,0,0,0.12))';
			return aldus_block_group_border( $dist, 'Border Section', $bv, $s_block_gap, $shadow );

		case 'group:gradient-full':
			// Pronounced-accent personalities prefer the testimonial variant (1).
			$gv            = ( 'pronounced' === $s_accent && $has_quote ) ? 1 : $variant2;
			$gradient_shad = ( 'high' === $s_contrast && 'pronounced' === $s_accent )
				? 'var(--wp--preset--shadow--deep, 0 4px 20px rgba(0,0,0,0.25))'
				: '';
			return aldus_block_group_gradient( $dist, $gradient, 'Gradient Section', $gv, $s_block_gap, $gradient_shad );

		// ---- Grid and row layouts ----

		case 'group:grid':
			return aldus_block_group_grid( $dist );

		case 'row:stats':
			return aldus_block_row_stats( $dist );

		// ---- Pull quotes ----

		case 'pullquote:wide':
			return aldus_block_pullquote( $dist, $accent, 'solid-color', false, $context );

		case 'pullquote:full-solid':
			return aldus_block_pullquote( $dist, $dark, 'solid-color', true, $context );

		case 'pullquote:centered':
			return aldus_block_pullquote_centered( $dist );

		// ---- Headings ----

		case 'heading:h1':
			return aldus_block_heading( $dist, 1, 'headline', $use_bindings );

		case 'heading:h2':
			// High-contrast personalities get the theme's large font size on H2s for more drama.
			$h2_size = ( 'high' === $s_contrast ) ? ( $theme['large'] ?? '' ) : '';
			return aldus_block_heading( $dist, 2, 'subheading', $use_bindings, $h2_size );

		case 'heading:h3':
			return aldus_block_heading( $dist, 3, 'subheading', $use_bindings );

		case 'heading:display':
			return aldus_block_heading_display( $dist, $large );

		case 'heading:kicker':
			return aldus_block_heading_kicker( $dist, $large );

		// ---- Paragraphs ----

		case 'paragraph':
			return aldus_block_paragraph( $dist, false, $use_bindings );

		case 'paragraph:dropcap':
			return aldus_block_paragraph( $dist, true, $use_bindings );

		case 'paragraph:lead':
			return aldus_block_paragraph_lead( $dist, $theme );

		// ---- Images ----

		case 'image:wide':
			return aldus_block_image( $dist, 'wide', $s_radius );

		case 'image:full':
			return aldus_block_image( $dist, 'full', $s_radius );

		// ---- Quotes ----

		case 'quote':
			return aldus_block_quote( $dist );

		case 'quote:attributed':
			return aldus_block_quote_attributed( $dist );

		// ---- Lists ----

		case 'list':
			return aldus_block_list( $dist );

		// ---- Structural ----

		case 'separator':
			return aldus_block_separator( $accent, $s_separator );

		case 'spacer:small':
			$h = aldus_spacer_height( 'small' );
			return serialize_block(
				array(
					'blockName'    => 'core/spacer',
					'attrs'        => array( 'height' => $h ),
					'innerBlocks'  => array(),
					'innerContent' => array( "<div style=\"height:{$h}\" aria-hidden=\"true\" class=\"wp-block-spacer\"></div>" ),
				)
			) . "\n\n";

		case 'spacer:large':
			$h = aldus_spacer_height( 'large' );
			return serialize_block(
				array(
					'blockName'    => 'core/spacer',
					'attrs'        => array( 'height' => $h ),
					'innerBlocks'  => array(),
					'innerContent' => array( "<div style=\"height:{$h}\" aria-hidden=\"true\" class=\"wp-block-spacer\"></div>" ),
				)
			) . "\n\n";

		case 'spacer:xlarge':
			$h = aldus_spacer_height( 'xlarge' );
			return serialize_block(
				array(
					'blockName'    => 'core/spacer',
					'attrs'        => array( 'height' => $h ),
					'innerBlocks'  => array(),
					'innerContent' => array( "<div style=\"height:{$h}\" aria-hidden=\"true\" class=\"wp-block-spacer\"></div>" ),
				)
			) . "\n\n";

		case 'buttons:cta':
			return aldus_block_cta( $dist, $accent, $dark, $style, $use_bindings, false );

		// ---- Video ----

		case 'video:hero':
			return aldus_block_video_hero( $dist );

		case 'video:section':
			return aldus_block_video_section( $dist );

		// ---- Table ----

		case 'table:data':
			return aldus_block_table( $dist );

		// ---- Gallery ----

		case 'gallery:2-col':
			return aldus_block_gallery( $dist, 2, 'Gallery' );

		case 'gallery:3-col':
			return aldus_block_gallery( $dist, 3, 'Gallery' );

		// ---- FAQ / accordion ----

		case 'details:accordion':
			return aldus_block_details_accordion( $dist );

		// ---- Code ----

		case 'code:block':
			return aldus_block_code( $dist );

		default:
			return '';
	}
}

// ---------------------------------------------------------------------------
// Individual block renderers
// ---------------------------------------------------------------------------

/**
 * Renders a core/cover block.
 * Dark covers: uses a dark overlay with white heading text.
 * Light covers: uses a soft overlay preserving the image feel.
 *
 * @param Aldus_Content_Distributor $dist
 * @param string $color_slug  Overlay background color slug.
 * @param int    $dim_ratio   0–100 overlay opacity.
 * @param string $font_size   Font size slug for the inner heading.
 * @param bool   $is_light    Use dark text for light covers.
 * @param string $name        Optional block name shown in the editor List View.
 * @param int    $variant     0 = heading only (default), 1 = heading + subheading, 2 = no inner content.
 * @param int    $post_id     Optional post ID for useFeaturedImage fallback.
 */
function aldus_block_cover(
	Aldus_Content_Distributor $dist,
	string $color_slug,
	int $dim_ratio,
	string $font_size,
	bool $is_light = false,
	string $name = '',
	int $variant = 0,
	int $post_id = 0
): string {
	// Variant 2: pure backdrop — no inner content. Still needs at least an image to be meaningful.
	if ( $variant === 2 ) {
		if ( ! $dist->has( 'image' ) ) {
			return ''; // Nothing to show without image in backdrop mode.
		}
		$image      = $dist->consume( 'image' );
		$image_url  = esc_url( $image['url'] );
		$color_safe = sanitize_html_class( $color_slug );
		$dim_class  = "has-background-dim-{$dim_ratio}";
		$attrs      = array(
			'overlayColor'  => $color_slug,
			'dimRatio'      => $dim_ratio,
			'align'         => 'full',
			'minHeight'     => 480,
			'minHeightUnit' => 'px',
			'url'           => esc_url_raw( $image['url'] ),
			'hasParallax'   => false,
		);
		if ( $name ) {
			$attrs['metadata'] = array( 'name' => $name . ' (Backdrop)' );
		}
		return serialize_block(
			array(
				'blockName'    => 'core/cover',
				'attrs'        => $attrs,
				'innerBlocks'  => array(),
				'innerContent' => array(
					"<div class=\"wp-block-cover alignfull\" style=\"min-height:480px\">\n"
					. '<span aria-hidden="true" class="wp-block-cover__background'
					. " has-{$color_safe}-background-color {$dim_class} has-background-dim\"></span>\n"
					. "<img class=\"wp-block-cover__image-background\" src=\"{$image_url}\""
					. " alt=\"\" data-object-fit=\"cover\"/>\n"
						. '<div class="' . aldus_cover_inner_classes() . "\"></div>\n</div>",
				),
			)
		) . "\n\n";
	}

	$headline = $dist->consume( 'headline' );
	if ( ! $headline ) {
		$headline = $dist->consume( 'subheading' );
	}
	if ( ! $headline && ! $dist->has( 'image' ) ) {
		return ''; // Nothing to show.
	}

	$image     = $dist->consume( 'image' );
	$text      = esc_html( $headline['content'] ?? '' );
	$image_url = $image ? esc_url( $image['url'] ) : '';

	// When no image was provided by the user, use the post's featured image as background.
	$use_featured = false;
	if ( ! $image_url && $post_id > 0 && has_post_thumbnail( $post_id ) ) {
		$use_featured = true;
	}

	// Variant 1: heading + subheading inside cover.
	$sub_text = '';
	if ( $variant === 1 && $dist->has( 'subheading' ) ) {
		$sub_item = $dist->consume( 'subheading' );
		$sub_text = $sub_item ? esc_html( $sub_item['content'] ) : '';
	}

	$color_safe      = sanitize_html_class( $color_slug );
	$text_color      = $is_light ? 'black' : 'white';
	$text_color_safe = sanitize_html_class( $text_color );

	$content_position = ( $variant === 1 ) ? 'center center' : 'bottom left';
	$headline_raw     = $headline['content'] ?? '';
	// Compute once; used for both attrs and innerContent style so strlen runs once.
	$cover_min_height = aldus_cover_min_height( $headline_raw );
	$attrs            = array(
		'overlayColor'    => $color_slug,
		'dimRatio'        => $dim_ratio,
		'align'           => 'full',
		'contentPosition' => $content_position,
		'minHeight'       => $cover_min_height,
		'minHeightUnit'   => 'px',
		'layout'          => array( 'type' => 'constrained' ),
	);
	if ( $name ) {
		$attrs['metadata'] = array( 'name' => $name );
	}
	if ( $image_url ) {
		$attrs['url']         = esc_url_raw( $image['url'] );
		$attrs['hasParallax'] = false;
	} elseif ( $use_featured ) {
		$attrs['useFeaturedImage'] = true;
	}

	// Variant 3: product-hero — heading + subheading + CTA button over cover.
	if ( $variant === 3 ) {
		$attrs['contentPosition'] = 'center center';
		// Product-hero has more content — use a taller floor so the CTA has room.
		$cover_min_height   = aldus_cover_min_height( $headline_raw, 520 );
		$attrs['minHeight'] = $cover_min_height;
		$dim_class          = "has-background-dim-{$dim_ratio}";
		$image_html         = $image_url
			? "<img class=\"wp-block-cover__image-background\" src=\"{$image_url}\" alt=\"\" data-object-fit=\"cover\"/>\n"
			: '';
		$inner              = '';
		if ( $text ) {
			$inner .= serialize_block(
				array(
					'blockName'    => 'core/heading',
					'attrs'        => array(
						'level'     => 1,
						'textColor' => $text_color,
						'fontSize'  => $font_size,
						'textAlign' => 'center',
					),
					'innerBlocks'  => array(),
					'innerContent' => array(
						"<h1 class=\"wp-block-heading has-text-align-center has-{$text_color_safe}-color"
						. " has-text-color has-{$font_size}-font-size\">{$text}</h1>",
					),
				)
			) . "\n";
		}
		if ( $sub_text ) {
			$inner .= serialize_block(
				array(
					'blockName'    => 'core/heading',
					'attrs'        => array(
						'level'     => 2,
						'textColor' => $text_color,
						'textAlign' => 'center',
					),
					'innerBlocks'  => array(),
					'innerContent' => array(
						"<h2 class=\"wp-block-heading has-text-align-center has-{$text_color_safe}-color"
						. " has-text-color\">{$sub_text}</h2>",
					),
				)
			) . "\n";
		}
		// Consume a CTA for the button inside the hero.
		$cta_item = $dist->consume( 'cta' );
		if ( $cta_item ) {
			$cta_label = esc_html( $cta_item['content'] );
			$cta_url   = ! empty( $cta_item['url'] ) ? esc_url( $cta_item['url'] ) : '#';
			$btn       = serialize_block(
				array(
					'blockName'    => 'core/button',
					'attrs'        => array(
						'textColor'       => $is_light ? '' : $color_slug,
						'backgroundColor' => $is_light ? $color_slug : '',
						'textAlign'       => 'center',
					),
					'innerBlocks'  => array(),
					'innerContent' => array(
						'<div class="wp-block-button"><a class="wp-block-button__link'
						. " wp-element-button\" href=\"{$cta_url}\">{$cta_label}</a></div>",
					),
				)
			);
			$inner    .= serialize_block(
				array(
					'blockName'    => 'core/buttons',
					'attrs'        => array(
						'layout' => array(
							'type'           => 'flex',
							'justifyContent' => 'center',
						),
					),
					'innerBlocks'  => array(),
					'innerContent' => array( '<div class="' . aldus_buttons_classes() . "\">{$btn}</div>" ),
				)
			) . "\n";
		}
		if ( ! $inner ) {
			return '';
		}
		return serialize_block(
			array(
				'blockName'    => 'core/cover',
				'attrs'        => $attrs,
				'innerBlocks'  => array(),
				'innerContent' => array(
					'<div class="wp-block-cover alignfull has-custom-content-position'
					. " is-position-center-center\" style=\"min-height:{$cover_min_height}px\">\n"
					. '<span aria-hidden="true" class="wp-block-cover__background'
					. " has-{$color_safe}-background-color {$dim_class} has-background-dim\"></span>\n"
					. $image_html
					. '<div class="' . aldus_cover_inner_classes() . "\">\n{$inner}</div>\n</div>",
				),
			)
		) . "\n\n";
	}

	// Variant 4: manifesto — full-width, centered, large heading only. No image required.
	if ( $variant === 4 ) {
		$attrs['contentPosition'] = 'center center';
		// Manifesto: no image, so use tighter height when text is long.
		$cover_min_height   = aldus_cover_min_height( $headline_raw, 360 );
		$attrs['minHeight'] = $cover_min_height;
		unset( $attrs['url'], $attrs['hasParallax'] );
		$dim_class = 'has-background-dim-20';
		$inner     = '';
		if ( $text ) {
			$inner .= serialize_block(
				array(
					'blockName'    => 'core/heading',
					'attrs'        => array(
						'level'     => 1,
						'textColor' => $text_color,
						'fontSize'  => $font_size,
						'textAlign' => 'center',
					),
					'innerBlocks'  => array(),
					'innerContent' => array(
						"<h1 class=\"wp-block-heading has-text-align-center has-{$text_color_safe}-color"
						. " has-text-color has-{$font_size}-font-size\">{$text}</h1>",
					),
				)
			) . "\n";
		}
		if ( ! $inner ) {
			return '';
		}
		return serialize_block(
			array(
				'blockName'    => 'core/cover',
				'attrs'        => $attrs,
				'innerBlocks'  => array(),
				'innerContent' => array(
					'<div class="wp-block-cover alignfull has-custom-content-position'
					. " is-position-center-center\" style=\"min-height:{$cover_min_height}px\">\n"
					. '<span aria-hidden="true" class="wp-block-cover__background'
					. " has-{$color_safe}-background-color {$dim_class} has-background-dim\"></span>\n"
					. '<div class="' . aldus_cover_inner_classes() . "\">\n{$inner}</div>\n</div>",
				),
			)
		) . "\n\n";
	}

	$position_slug  = str_replace( ' ', '-', $content_position );
	$position_class = "has-custom-content-position is-position-{$position_slug}";
	$dim_class      = "has-background-dim-{$dim_ratio}";

	$image_html = $image_url
		? "<img class=\"wp-block-cover__image-background\" src=\"{$image_url}\" alt=\"\" data-object-fit=\"cover\"/>\n"
		: '';

	$inner = '';
	if ( $text ) {
		$inner .= serialize_block(
			array(
				'blockName'    => 'core/heading',
				'attrs'        => array(
					'level'     => 1,
					'textColor' => $text_color,
					'fontSize'  => $font_size,
				),
				'innerBlocks'  => array(),
				'innerContent' => array( "<h1 class=\"wp-block-heading has-{$text_color_safe}-color has-text-color has-{$font_size}-font-size\">{$text}</h1>" ),
			)
		) . "\n";
	}
	if ( $sub_text ) {
		$inner .= serialize_block(
			array(
				'blockName'    => 'core/heading',
				'attrs'        => array(
					'level'     => 2,
					'textColor' => $text_color,
				),
				'innerBlocks'  => array(),
				'innerContent' => array( "<h2 class=\"wp-block-heading has-{$text_color_safe}-color has-text-color\">{$sub_text}</h2>" ),
			)
		) . "\n";
	}

	$inner_container = '<div class="' . aldus_cover_inner_classes() . "\">\n{$inner}</div>\n";

	return serialize_block(
		array(
			'blockName'    => 'core/cover',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerContent' => array(
				"<div class=\"wp-block-cover alignfull {$position_class}\" style=\"min-height:{$cover_min_height}px\">\n"
				. "<span aria-hidden=\"true\" class=\"wp-block-cover__background has-{$color_safe}-background-color {$dim_class} has-background-dim\"></span>\n"
				. $image_html
				. $inner_container
				. '</div>',
			),
		)
	) . "\n\n";
}

/**
 * Renders a two-column asymmetric layout (28/72 split).
 *
 * @param Aldus_Content_Distributor $dist
 * @param bool                      $flip     Swap column order.
 * @param string                    $name     Optional block name shown in the editor List View.
 * @param int                       $variant  0 = heading/dropcap (default), 1 = list/paragraph, 2 = heading+paragraph/image.
 */
function aldus_block_columns_asymmetric( Aldus_Content_Distributor $dist, bool $flip = false, string $name = '', int $variant = 0 ): string {
	$narrow_width = 28;
	$wide_width   = 72;
	$cols_attrs   = array( 'isStackedOnMobile' => true );
	$narrow_attrs = array( 'width' => "{$narrow_width}%" );
	$wide_attrs   = array( 'width' => "{$wide_width}%" );
	if ( $name ) {
		$cols_attrs['metadata'] = array( 'name' => $name );
	}

	if ( $variant === 1 ) {
		$list = $dist->consume( 'list' );
		$para = $dist->consume( 'paragraph' );
		if ( ! $list && ! $para ) {
			return '';
		}
		$left_content = '';
		if ( $list ) {
			$raw_items    = preg_split( '/\r?\n/', trim( $list['content'] ) );
			$raw_items    = array_filter( array_map( 'trim', $raw_items ) );
			$list_markup  = aldus_serialize_list( $raw_items );
			$left_content = $list_markup ? $list_markup . "\n" : '';
		}
		$right_content = $para ? serialize_block(
			array(
				'blockName'    => 'core/paragraph',
				'attrs'        => array(),
				'innerBlocks'  => array(),
				'innerContent' => array( '<p>' . esc_html( $para['content'] ) . '</p>' ),
			)
		) . "\n" : '';

	} elseif ( $variant === 2 && $dist->has( 'image' ) ) {
		$heading = $dist->consume( 'subheading' ) ?? $dist->consume( 'headline' );
		$para    = $dist->consume( 'paragraph' );
		$image   = $dist->consume( 'image' );
		if ( ! $heading && ! $para && ! $image ) {
			return '';
		}
		$left_content = '';
		if ( $heading ) {
			$left_content .= aldus_serialize_heading( esc_html( $heading['content'] ), 2 );
		}
		if ( $para ) {
			$left_content .= aldus_serialize_paragraph( esc_html( $para['content'] ) );
		}
		$right_content = '';
		if ( $image && ! empty( $image['url'] ) ) {
			$url           = esc_url( $image['url'] );
			$right_content = serialize_block(
				array(
					'blockName'    => 'core/image',
					'attrs'        => array( 'sizeSlug' => 'large' ),
					'innerBlocks'  => array(),
					'innerContent' => array( "<figure class=\"wp-block-image size-large\"><img src=\"{$url}\" alt=\"\"/></figure>" ),
				)
			) . "\n";
		}
	} else {
		$heading = $dist->consume( 'subheading' ) ?? $dist->consume( 'headline' );
		$para    = $dist->consume( 'paragraph' );
		if ( ! $heading && ! $para ) {
			return '';
		}
		$left_content  = $heading ? serialize_block(
			array(
				'blockName'    => 'core/heading',
				'attrs'        => array( 'level' => 2 ),
				'innerBlocks'  => array(),
				'innerContent' => array( '<h2 class="wp-block-heading">' . esc_html( $heading['content'] ) . '</h2>' ),
			)
		) . "\n" : '';
		$right_content = $para ? serialize_block(
			array(
				'blockName'    => 'core/paragraph',
				'attrs'        => array( 'dropCap' => true ),
				'innerBlocks'  => array(),
				'innerContent' => array( '<p class="has-drop-cap">' . esc_html( $para['content'] ) . '</p>' ),
			)
		) . "\n" : '';
	}

	// Swap columns if flipped.
	if ( $flip ) {
		[ $narrow_attrs, $wide_attrs, $left_content, $right_content ] = array( $wide_attrs, $narrow_attrs, $right_content, $left_content );
	}

	$narrow_col = serialize_block(
		array(
			'blockName'    => 'core/column',
			'attrs'        => $narrow_attrs,
			'innerBlocks'  => array(),
			'innerContent' => array(
				'<div class="' . aldus_column_classes() . '" style="'
				. aldus_column_style( "{$narrow_width}%" ) . "\">\n{$left_content}</div>",
			),
		)
	);
	$wide_col   = serialize_block(
		array(
			'blockName'    => 'core/column',
			'attrs'        => $wide_attrs,
			'innerBlocks'  => array(),
			'innerContent' => array(
				'<div class="' . aldus_column_classes() . '" style="'
				. aldus_column_style( "{$wide_width}%" ) . "\">\n{$right_content}</div>",
			),
		)
	);

	return serialize_block(
		array(
			'blockName'    => 'core/columns',
			'attrs'        => $cols_attrs,
			'innerBlocks'  => array(),
			'innerContent' => array( '<div class="' . aldus_columns_classes( true ) . "\">\n{$narrow_col}\n{$wide_col}\n</div>" ),
		)
	) . "\n\n";
}

/**
 * Renders a three equal-column layout.
 * Each column gets a paragraph (or subheading if no paragraph available).
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $bg_slug  Background color slug for each column.
 * @param string                    $name     Optional block name shown in the editor List View.
 */
function aldus_block_columns_three( Aldus_Content_Distributor $dist, string $bg_slug, string $name = '', string $light_slug = '' ): string {
	$col_items = array();
	for ( $i = 0; $i < 3; $i++ ) {
		$col_items[] = $dist->consume( 'paragraph' ) ?? $dist->consume( 'subheading' );
	}

	if ( ! array_filter( $col_items ) ) {
		return '';
	}

	// Grab subheading labels for visual hierarchy within each column.
	$subheadings = array();
	for ( $i = 0; $i < 3; $i++ ) {
		$subheadings[] = $dist->consume( 'subheading' );
	}

	// Alternate backgrounds: accent · light · accent so the three columns read as
	// distinct cards rather than a single solid block. Fall back to the accent slug
	// for the middle column when no light palette entry is available.
	$mid_slug = $light_slug ?: $bg_slug;
	$bg_slugs = array( $bg_slug, $mid_slug, $bg_slug );

	$cols_attrs = array( 'isStackedOnMobile' => false );
	if ( $name ) {
		$cols_attrs['metadata'] = array( 'name' => $name );
	}

	$cols_inner = '';
	foreach ( $col_items as $i => $item ) {
		if ( ! is_array( $item ) ) {
			continue;
		}
		$text     = esc_html( $item['content'] ?? '' );
		$heading  = $subheadings[ $i ] ?? null;
		$col_slug = $bg_slugs[ $i ];
		$col_safe = sanitize_html_class( $col_slug );

		$col_sm    = aldus_theme_spacing( 'sm' );
		$col_attrs = array(
			'backgroundColor' => $col_slug,
			'style'           => array(
				'spacing' => array(
					'padding' => array(
						'top'    => $col_sm,
						'right'  => $col_sm,
						'bottom' => $col_sm,
						'left'   => $col_sm,
					),
				),
			),
		);

		$col_inner = '';
		if ( $heading ) {
			$ht         = esc_html( $heading['content'] );
			$col_inner .= serialize_block(
				array(
					'blockName'    => 'core/heading',
					'attrs'        => array( 'level' => 3 ),
					'innerBlocks'  => array(),
					'innerContent' => array( "<h3 class=\"wp-block-heading\">{$ht}</h3>" ),
				)
			) . "\n";
		}
		if ( $text ) {
			$col_inner .= serialize_block(
				array(
					'blockName'    => 'core/paragraph',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( "<p>{$text}</p>" ),
				)
			) . "\n";
		}

		$cols_inner .= serialize_block(
			array(
				'blockName'    => 'core/column',
				'attrs'        => $col_attrs,
				'innerBlocks'  => array(),
				'innerContent' => array(
					'<div class="' . aldus_column_classes( $col_slug ) . '" style="'
					. "padding-top:{$col_sm};padding-right:{$col_sm};"
					. "padding-bottom:{$col_sm};padding-left:{$col_sm}\">\n{$col_inner}</div>",
				),
			)
		) . "\n";
	}

	return serialize_block(
		array(
			'blockName'    => 'core/columns',
			'attrs'        => $cols_attrs,
			'innerBlocks'  => array(),
			'innerContent' => array( '<div class="' . aldus_columns_classes( false ) . "\">\n{$cols_inner}</div>" ),
		)
	) . "\n\n";
}

/**
 * Renders a core/media-text block.
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $image_position  'left' or 'right'
 * @param string                    $name            Optional block name shown in the editor List View.
 * @param int                       $variant         0 = heading+paragraph (default), 1 = quote inside.
 */
function aldus_block_media_text( Aldus_Content_Distributor $dist, string $image_position, string $name = '', int $variant = 0 ): string {
	$image      = $dist->consume( 'image' );
	$subheading = $dist->consume( 'subheading' );
	$para       = $dist->consume( 'paragraph' );

	// Require an image — a media-text without media is just a paragraph.
	if ( ! $image ) {
		$markup = '';
		if ( $subheading ) {
			$markup .= aldus_serialize_heading( esc_html( $subheading['content'] ), 2 );
		}
		if ( $para ) {
			$markup .= serialize_block(
				array(
					'blockName'    => 'core/paragraph',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<p>' . esc_html( $para['content'] ) . '</p>' ),
				)
			) . "\n\n";
		}
		return $markup;
	}

	$image_url = esc_url( $image['url'] );
	$attrs     = array(
		'mediaPosition'     => $image_position,
		'mediaWidth'        => 38,
		'isStackedOnMobile' => true,
		'mediaUrl'          => esc_url_raw( $image['url'] ),
		'mediaType'         => 'image',
		'mediaSizeSlug'     => 'large',
		'verticalAlignment' => 'center',
		'focalPoint'        => array(
			'x' => 0.5,
			'y' => 0.5,
		),
	);
	if ( $name ) {
		$attrs['metadata'] = array( 'name' => $name );
	}

	$flip_class = 'right' === $image_position ? ' has-media-on-the-right' : '';

	$content_inner = '';
	if ( $variant === 1 && $dist->has( 'quote' ) ) {
		// Variant 1: quote over image.
		$quote_item = $dist->consume( 'quote' );
		if ( $quote_item ) {
			$content_inner .= serialize_block(
				array(
					'blockName'    => 'core/quote',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<blockquote class="wp-block-quote"><p>' . esc_html( $quote_item['content'] ) . '</p></blockquote>' ),
				)
			) . "\n";
		} else {
			if ( $subheading ) {
				$content_inner .= aldus_serialize_heading( esc_html( $subheading['content'] ), 2 );
			}
			if ( $para ) {
				$content_inner .= aldus_serialize_paragraph( esc_html( $para['content'] ) );
			}
		}
	} elseif ( $variant === 2 ) {
		// Variant 2: heading + CTA button — bold statement alongside an image.
		if ( $subheading ) {
			$content_inner .= aldus_serialize_heading( esc_html( $subheading['content'] ), 2 );
		}
		$cta_item = $dist->consume( 'cta' );
		if ( $cta_item ) {
			$cta_label      = esc_html( $cta_item['content'] );
			$cta_url        = ! empty( $cta_item['url'] ) ? esc_url( $cta_item['url'] ) : '#';
			$btn            = serialize_block(
				array(
					'blockName'    => 'core/button',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array(
						'<div class="wp-block-button"><a class="wp-block-button__link'
						. " wp-element-button\" href=\"{$cta_url}\">{$cta_label}</a></div>",
					),
				)
			);
			$content_inner .= serialize_block(
				array(
					'blockName'    => 'core/buttons',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<div class="' . aldus_buttons_classes() . "\">{$btn}</div>" ),
				)
			) . "\n";
		} elseif ( $para ) {
			// Fall back to para if no CTA.
			$content_inner .= aldus_serialize_paragraph( esc_html( $para['content'] ) );
		}
	} elseif ( $variant === 3 && $dist->has( 'list' ) ) {
		// Variant 3: heading + bullet list alongside an image.
		if ( $subheading ) {
			$content_inner .= aldus_serialize_heading( esc_html( $subheading['content'] ), 2 );
		}
		$list_item = $dist->consume( 'list' );
		if ( $list_item ) {
			$raw_items   = preg_split( '/\r?\n/', trim( $list_item['content'] ) );
			$raw_items   = array_filter( array_map( 'trim', $raw_items ) );
			$list_markup = aldus_serialize_list( $raw_items );
			if ( $list_markup ) {
				$content_inner .= $list_markup . "\n";
			}
		}
	} else {
		// Variant 0 (default): heading + paragraph.
		if ( $subheading ) {
			$content_inner .= aldus_serialize_heading( esc_html( $subheading['content'] ), 2 );
		}
		if ( $para ) {
			$content_inner .= aldus_serialize_paragraph( esc_html( $para['content'] ) );
		}
	}

	return serialize_block(
		array(
			'blockName'    => 'core/media-text',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerContent' => array(
				'<div class="' . aldus_media_text_classes( $image_position, true ) . '" style="' . aldus_media_text_style( 38, $image_position ) . "\">\n"
				. "<figure class=\"wp-block-media-text__media\"><img src=\"{$image_url}\" alt=\"\" class=\"wp-image-0 size-full\"/></figure>\n"
				. "<div class=\"wp-block-media-text__content\">\n{$content_inner}</div>\n</div>",
			),
		)
	) . "\n\n";
}

/**
 * Renders a core/group block with background color.
 *
 * @param Aldus_Content_Distributor $dist
 * @param string $bg_slug          Background color slug.
 * @param string $text_color_slug  Text color slug (empty = use theme default).
 * @param bool   $full_width       Whether to align full.
 * @param string $name             Optional block name shown in the editor List View.
 * @param int    $variant          0 = heading/para/list/cta (default), 1 = dropcap prose + cta, 2 = heading + inner 2-col + cta.
 * @param string $block_gap        Optional blockGap value (e.g. '1.5rem').
 */
function aldus_block_group(
	Aldus_Content_Distributor $dist,
	string $bg_slug,
	string $text_color_slug,
	bool $full_width,
	string $name = '',
	int $variant = 0,
	string $block_gap = ''
): string {
	$bg_safe = sanitize_html_class( $bg_slug );
	$tc_safe = $text_color_slug ? sanitize_html_class( $text_color_slug ) : '';
	$align   = $full_width ? 'full' : '';

	$spacing = array(
		'padding' => array(
			'top'    => aldus_theme_spacing( 'lg' ),
			'bottom' => aldus_theme_spacing( 'lg' ),
		),
	);
	if ( $block_gap ) {
		$spacing['blockGap'] = $block_gap;
	}
	$attrs = array(
		'backgroundColor' => $bg_slug,
		'layout'          => array(
			'type'        => 'constrained',
			'contentSize' => aldus_theme_content_size(),
		),
		'style'           => array( 'spacing' => $spacing ),
	);
	if ( $name ) {
		$attrs['metadata'] = array( 'name' => $name );
	}
	if ( $tc_safe ) {
		$attrs['textColor'] = $text_color_slug;
	}
	if ( $align ) {
		$attrs['align'] = $align;
	}

	$align_class = $align ? " align{$align}" : '';
	$bg_class    = " has-{$bg_safe}-background-color has-background";
	$tc_class    = $tc_safe ? " has-{$tc_safe}-color has-text-color" : '';

	$inner = '';

	$btn_width = $full_width ? 50 : 0;

	if ( $variant === 1 ) {
		$para1 = $dist->consume( 'paragraph' );
		$para2 = $dist->has( 'paragraph' ) ? $dist->consume( 'paragraph' ) : null;
		$cta   = $dist->consume( 'cta' );
		if ( ! $para1 && ! $para2 && ! $cta ) {
			return '';
		}
		if ( $para1 ) {
			$inner .= serialize_block(
				array(
					'blockName'    => 'core/paragraph',
					'attrs'        => array( 'dropCap' => true ),
					'innerBlocks'  => array(),
					'innerContent' => array( '<p class="has-drop-cap">' . esc_html( $para1['content'] ) . '</p>' ),
				)
			) . "\n";
		}
		if ( $para2 ) {
			$inner .= serialize_block(
				array(
					'blockName'    => 'core/paragraph',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<p>' . esc_html( $para2['content'] ) . '</p>' ),
				)
			) . "\n";
		}
		if ( $cta ) {
			$label     = esc_html( $cta['content'] );
			$url       = ! empty( $cta['url'] ) ? esc_url( $cta['url'] ) : '#';
			$btn_attrs = $btn_width > 0 ? array( 'width' => $btn_width ) : array();
			$btn       = serialize_block(
				array(
					'blockName'    => 'core/button',
					'attrs'        => $btn_attrs,
					'innerBlocks'  => array(),
					'innerContent' => array(
						'<div class="wp-block-button"><a class="wp-block-button__link'
						. " wp-element-button\" href=\"{$url}\">{$label}</a></div>",
					),
				)
			);
			$inner    .= serialize_block(
				array(
					'blockName'    => 'core/buttons',
					'attrs'        => array(
						'layout' => array(
							'type'           => 'flex',
							'justifyContent' => 'center',
						),
					),
					'innerBlocks'  => array(),
					'innerContent' => array( '<div class="' . aldus_buttons_classes() . "\">{$btn}</div>" ),
				)
			) . "\n";
		}
	} elseif ( $variant === 2 && $dist->remaining( 'paragraph' ) >= 2 ) {
		$subheading = $dist->consume( 'subheading' );
		$para1      = $dist->consume( 'paragraph' );
		$para2      = $dist->consume( 'paragraph' );
		$cta        = $dist->consume( 'cta' );
		if ( ! $subheading && ! $para1 && ! $para2 ) {
			return '';
		}
		if ( $subheading ) {
			$inner .= aldus_serialize_heading( esc_html( $subheading['content'] ), 2 );
		}
		if ( $para1 || $para2 ) {
			$col_left_inner  = $para1 ? serialize_block(
				array(
					'blockName'    => 'core/paragraph',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<p>' . esc_html( $para1['content'] ) . '</p>' ),
				)
			) : '';
			$col_right_inner = $para2 ? serialize_block(
				array(
					'blockName'    => 'core/paragraph',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<p>' . esc_html( $para2['content'] ) . '</p>' ),
				)
			) : '';
			$col_l           = serialize_block(
				array(
					'blockName'    => 'core/column',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<div class="' . aldus_column_classes() . "\">\n{$col_left_inner}\n</div>" ),
				)
			);
			$col_r           = serialize_block(
				array(
					'blockName'    => 'core/column',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<div class="' . aldus_column_classes() . "\">\n{$col_right_inner}\n</div>" ),
				)
			);
			$inner          .= serialize_block(
				array(
					'blockName'    => 'core/columns',
					'attrs'        => array( 'isStackedOnMobile' => true ),
					'innerBlocks'  => array(),
					'innerContent' => array( '<div class="' . aldus_columns_classes( true ) . "\">\n{$col_l}\n{$col_r}\n</div>" ),
				)
			) . "\n";
		}
		if ( $cta ) {
			$label     = esc_html( $cta['content'] );
			$url       = ! empty( $cta['url'] ) ? esc_url( $cta['url'] ) : '#';
			$btn_attrs = $btn_width > 0 ? array( 'width' => $btn_width ) : array();
			$btn       = serialize_block(
				array(
					'blockName'    => 'core/button',
					'attrs'        => $btn_attrs,
					'innerBlocks'  => array(),
					'innerContent' => array(
						'<div class="wp-block-button"><a class="wp-block-button__link'
						. " wp-element-button\" href=\"{$url}\">{$label}</a></div>",
					),
				)
			);
			$inner    .= serialize_block(
				array(
					'blockName'    => 'core/buttons',
					'attrs'        => array(
						'layout' => array(
							'type'           => 'flex',
							'justifyContent' => 'center',
						),
					),
					'innerBlocks'  => array(),
					'innerContent' => array( '<div class="' . aldus_buttons_classes() . "\">{$btn}</div>" ),
				)
			) . "\n";
		}
	} else {
		$subheading = $dist->consume( 'subheading' );
		$para       = $dist->consume( 'paragraph' );
		$list       = $dist->consume( 'list' );
		$cta        = $dist->consume( 'cta' );
		if ( ! $subheading && ! $para && ! $list && ! $cta ) {
			return '';
		}
		if ( $subheading ) {
			$inner .= aldus_serialize_heading( esc_html( $subheading['content'] ), 2 );
		}
		if ( $para ) {
			$inner .= aldus_serialize_paragraph( esc_html( $para['content'] ) );
		}
		if ( $list ) {
			$raw_items   = preg_split( '/\r?\n/', trim( $list['content'] ) );
			$raw_items   = array_filter( array_map( 'trim', $raw_items ) );
			$list_markup = aldus_serialize_list( $raw_items );
			if ( $list_markup ) {
				$inner .= $list_markup . "\n";
			}
		}
		if ( $cta ) {
			$label     = esc_html( $cta['content'] );
			$url       = ! empty( $cta['url'] ) ? esc_url( $cta['url'] ) : '#';
			$btn_attrs = $btn_width > 0 ? array( 'width' => $btn_width ) : array();
			$btn       = serialize_block(
				array(
					'blockName'    => 'core/button',
					'attrs'        => $btn_attrs,
					'innerBlocks'  => array(),
					'innerContent' => array(
						'<div class="wp-block-button"><a class="wp-block-button__link'
						. " wp-element-button\" href=\"{$url}\">{$label}</a></div>",
					),
				)
			);
			$inner    .= serialize_block(
				array(
					'blockName'    => 'core/buttons',
					'attrs'        => array(
						'layout' => array(
							'type'           => 'flex',
							'justifyContent' => 'center',
						),
					),
					'innerBlocks'  => array(),
					'innerContent' => array( '<div class="' . aldus_buttons_classes() . "\">{$btn}</div>" ),
				)
			) . "\n";
		}
	}

	if ( ! $inner ) {
		return '';
	}

	$pad = aldus_theme_spacing( 'lg' );
	return serialize_block(
		array(
			'blockName'    => 'core/group',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerContent' => array(
				'<div class="' . aldus_group_classes( 'constrained' )
				. "{$align_class}{$bg_class}{$tc_class}\" style=\"padding-top:{$pad};padding-bottom:{$pad}\">\n{$inner}</div>",
			),
		)
	) . "\n\n";
}

/**
 * Renders a core/pullquote block.
 *
 * @param Aldus_Content_Distributor $dist
 * @param string $color_slug   Border/background color slug.
 * @param string $style        Block style name ('solid-color' or '').
 * @param bool   $full_width   Use align:full.
 */
function aldus_block_pullquote(
	Aldus_Content_Distributor $dist,
	string $color_slug,
	string $style = '',
	bool $full_width = false,
	array $context = array()
): string {
	$quote = $dist->consume( 'quote' );
	if ( ! $quote ) {
		return '';
	}

	$text       = esc_html( $quote['content'] );
	$color_safe = sanitize_html_class( $color_slug );
	$align      = $full_width ? 'full' : 'wide';

	// Prefer a custom block style registered in the theme over the default
	// 'solid-color' style. If the theme registers a 'plain' style for
	// core/pullquote, use it so the output feels native to the active theme.
	$custom_pq_styles = $context['custom_styles']['pullquote'] ?? array();
	if ( ! empty( $custom_pq_styles ) && in_array( 'plain', $custom_pq_styles, true ) ) {
		$style = 'plain';
	}

	$attrs = array(
		'align'       => $align,
		'borderColor' => $color_slug,
	);
	if ( $style ) {
		$attrs['className'] = "is-style-{$style}";
	}

	$style_class  = $style ? " is-style-{$style}" : '';
	$border_class = " has-{$color_safe}-border-color";

	return serialize_block(
		array(
			'blockName'    => 'core/pullquote',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerContent' => array(
				"<figure class=\"wp-block-pullquote align{$align}{$style_class}{$border_class}\"><blockquote><p>{$text}</p></blockquote></figure>",
			),
		)
	) . "\n\n";
}

// ---------------------------------------------------------------------------
// Low-level serialization helpers — accept pre-escaped strings, return markup.
// The aldus_block_*() functions above handle content distribution; these handle
// markup. Composite renderers call these directly instead of repeating the
// serialize_block() structure inline.
// ---------------------------------------------------------------------------

/**
 * Serialises a single core/heading block from an already-escaped text string.
 *
 * @param string $text        Escaped heading text (run through esc_html before passing).
 * @param int    $level       Heading level 1–6.
 * @param array  $extra_attrs Additional block attributes merged over the defaults.
 * @param string $item_id     When non-empty, adds a Block Bindings attr so the
 *                            heading content resolves from _aldus_items post meta.
 */
function aldus_serialize_heading( string $text, int $level, array $extra_attrs = array(), string $item_id = '' ): string {
	// WordPress core only accepts heading levels 1–6; clamp to prevent invalid block output.
	$level = max( 1, min( 6, $level ) );
	$attrs = array_merge( array( 'level' => $level ), $extra_attrs );
	if ( $item_id ) {
		$attrs['metadata'] = array(
			'bindings' => array(
				'content' => array(
					'source' => 'aldus/item',
					'args'   => array(
						'id'    => $item_id,
						'field' => 'content',
					),
				),
			),
		);
	}
	return serialize_block(
		array(
			'blockName'    => 'core/heading',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerContent' => array( "<h{$level} class=\"wp-block-heading\">{$text}</h{$level}>" ),
		)
	) . "\n\n";
}

/**
 * Serialises a core/paragraph block from an already-escaped text string.
 *
 * @param string $text      Escaped paragraph text.
 * @param bool   $drop_cap  Whether to apply the drop-cap style.
 * @param string $item_id   When non-empty, adds a Block Bindings attr so the
 *                          paragraph content resolves from _aldus_items post meta.
 */
function aldus_serialize_paragraph( string $text, bool $drop_cap = false, string $item_id = '' ): string {
	$attrs = $drop_cap ? array( 'dropCap' => true ) : array();
	if ( $item_id ) {
		$attrs['metadata'] = array(
			'bindings' => array(
				'content' => array(
					'source' => 'aldus/item',
					'args'   => array(
						'id'    => $item_id,
						'field' => 'content',
					),
				),
			),
		);
	}
	$class = $drop_cap ? ' class="has-drop-cap"' : '';
	return serialize_block(
		array(
			'blockName'    => 'core/paragraph',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerContent' => array( "<p{$class}>{$text}</p>" ),
		)
	) . "\n\n";
}

/**
 * Serialises a core/buttons + core/button pair for a CTA item.
 *
 * Handles the filled/outlined/ghost variants. This is the single source of
 * truth for button markup — call it from any renderer that needs a button
 * rather than repeating the serialize_block() chain.
 *
 * @param string $label       Escaped button label.
 * @param string $url         Escaped button URL.
 * @param string $color_slug  Background color slug for the filled variant.
 * @param string $variant     'filled' | 'outline' | 'ghost'.
 * @param string $dark_slug   Dark color slug used by the ghost variant.
 * @param string $item_id     When non-empty, binds the button text to _aldus_items meta.
 */
/**
 * @param string $label      Button label text.
 * @param string $url        Button href URL.
 * @param string $color_slug Background color slug for filled/ghost variants.
 * @param string $variant    'filled' | 'outline' | 'ghost' | 'plain'.
 * @param string $dark_slug  Dark color slug for ghost variant.
 * @param string $item_id    Item ID for block bindings.
 * @param int    $width      Optional width percentage (25, 50, 75, 100); 0 = auto.
 */
function aldus_serialize_button(
	string $label,
	string $url,
	string $color_slug,
	string $variant = 'filled',
	string $dark_slug = 'black',
	string $item_id = '',
	int $width = 0
): string {
	$color_safe = sanitize_html_class( $color_slug );

	if ( 'outline' === $variant ) {
		$btn_attrs   = array(
			'textColor' => $color_slug,
			'className' => 'is-style-outline',
			'style'     => array( 'typography' => array( 'fontWeight' => '600' ) ),
		);
		$btn_content = '<div class="wp-block-button is-style-outline">'
			. "<a class=\"wp-block-button__link has-{$color_safe}-color has-text-color"
			. " wp-element-button\" href=\"{$url}\" style=\"font-weight:600\">{$label}</a></div>";
	} elseif ( 'ghost' === $variant ) {
		$dark_safe   = sanitize_html_class( $dark_slug );
		$btn_attrs   = array(
			'backgroundColor' => 'white',
			'textColor'       => $dark_slug,
			'style'           => array( 'typography' => array( 'fontWeight' => '600' ) ),
		);
		$btn_content = '<div class="wp-block-button">'
			. "<a class=\"wp-block-button__link has-white-background-color has-{$dark_safe}-color"
			. ' has-text-color has-background wp-element-button"'
			. " href=\"{$url}\" style=\"font-weight:600\">{$label}</a></div>";
	} elseif ( 'plain' === $variant ) {
		// No explicit color attrs — let the theme's global button styles apply.
		$btn_attrs   = array();
		$btn_content = '<div class="wp-block-button">'
			. "<a class=\"wp-block-button__link wp-element-button\" href=\"{$url}\">{$label}</a></div>";
	} else {
		// 'filled' (legacy)
		$btn_attrs   = array(
			'backgroundColor' => $color_slug,
			'textColor'       => 'white',
			'style'           => array( 'typography' => array( 'fontWeight' => '600' ) ),
		);
		$btn_content = '<div class="wp-block-button">'
			. "<a class=\"wp-block-button__link has-{$color_safe}-background-color"
			. ' has-white-color has-text-color has-background wp-element-button"'
			. " href=\"{$url}\" style=\"font-weight:600\">{$label}</a></div>";
	}

	if ( $item_id ) {
		$btn_attrs['metadata'] = array(
			'bindings' => array(
				'text' => array(
					'source' => 'aldus/item',
					'args'   => array(
						'id'    => $item_id,
						'field' => 'content',
					),
				),
			),
		);
	}
	if ( $width > 0 ) {
		$btn_attrs['width'] = $width;
	}

	$btn_markup = serialize_block(
		array(
			'blockName'    => 'core/button',
			'attrs'        => $btn_attrs,
			'innerBlocks'  => array(),
			'innerContent' => array( $btn_content ),
		)
	);

	return serialize_block(
		array(
			'blockName'    => 'core/buttons',
			'attrs'        => array(
				'layout' => array(
					'type'           => 'flex',
					'justifyContent' => 'center',
				),
			),
			'innerBlocks'  => array(),
			'innerContent' => array( '<div class="' . aldus_buttons_classes() . "\">\n{$btn_markup}\n</div>" ),
		)
	) . "\n\n";
}

/**
 * Renders a core/heading block.
 * For h1 it consumes 'headline'; for h2/h3 it tries 'subheading' first.
 *
 * @param Aldus_Content_Distributor $dist
 * @param int    $level         Heading level 1–3.
 * @param string $type          Content type to consume ('headline' or 'subheading').
 * @param bool   $use_bindings  When true, embeds a Block Bindings attr on the block.
 * @param string $font_size     Optional font size slug to apply.
 */
function aldus_block_heading( Aldus_Content_Distributor $dist, int $level, string $type, bool $use_bindings = false, string $font_size = '' ): string {
	$item = $dist->consume( $type );
	if ( ! $item ) {
		$fallback = 'headline' === $type ? 'subheading' : 'headline';
		$item     = $dist->consume( $fallback );
	}
	if ( ! $item ) {
		return '';
	}
	$extra_attrs = $font_size ? array( 'fontSize' => $font_size ) : array();
	return aldus_serialize_heading( esc_html( $item['content'] ), $level, $extra_attrs, $use_bindings ? ( $item['id'] ?? '' ) : '' );
}

/**
 * Renders a core/paragraph block.
 *
 * @param Aldus_Content_Distributor $dist
 * @param bool                      $drop_cap      Enable drop cap.
 * @param bool                      $use_bindings  When true, embeds a Block Bindings attr on the block.
 */
function aldus_block_paragraph( Aldus_Content_Distributor $dist, bool $drop_cap = false, bool $use_bindings = false ): string {
	$item = $dist->consume( 'paragraph' );
	if ( ! $item ) {
		return '';
	}
	return aldus_serialize_paragraph( esc_html( $item['content'] ), $drop_cap, $use_bindings ? ( $item['id'] ?? '' ) : '' );
}

/**
 * Renders a core/image block.
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $align   'wide' or 'full'.
 * @param string                    $radius  Optional border-radius CSS value (e.g. '8px' or '0').
 */
function aldus_block_image( Aldus_Content_Distributor $dist, string $align, string $radius = '' ): string {
	$item = $dist->consume( 'image' );
	if ( ! $item || empty( $item['url'] ) ) {
		return '';
	}

	$url      = esc_url( $item['url'] );
	$media_id = ! empty( $item['mediaId'] ) ? (int) $item['mediaId'] : 0;

	$attrs = array(
		'align'    => $align,
		'sizeSlug' => 'large',
	);
	if ( $media_id ) {
		$attrs['id'] = $media_id;
	}

	// Lock aspect ratio so layouts are predictable regardless of input image dimensions.
	if ( 'wide' === $align ) {
		$attrs['aspectRatio'] = '16/9';
		$attrs['scale']       = 'cover';
	} elseif ( 'full' === $align ) {
		$attrs['aspectRatio'] = '3/2';
		$attrs['scale']       = 'cover';
	}

	if ( $radius !== '' ) {
		$attrs['style']['border']['radius'] = $radius;
	}

	return serialize_block(
		array(
			'blockName'    => 'core/image',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerContent' => array( "<figure class=\"wp-block-image align{$align} size-large\"><img src=\"{$url}\" alt=\"\"/></figure>" ),
		)
	) . "\n\n";
}

/**
 * Serialises a core/list block from an array of plain-text item strings.
 *
 * serialize_block() with innerBlocks requires null placeholders in innerContent
 * for each inner block — passing pre-serialised HTML as a flat string causes
 * WordPress's block parser to flag the output as invalid on re-parse.
 *
 * @param string[] $raw_items Plain-text list items (already trimmed, non-empty).
 * @return string Serialised block markup, or '' when $raw_items is empty.
 */
function aldus_serialize_list( array $raw_items ): string {
	if ( empty( $raw_items ) ) {
		return '';
	}

	$inner_blocks  = array();
	$inner_content = array( '<ul class="wp-block-list">' );

	foreach ( $raw_items as $li ) {
		$inner_blocks[]  = array(
			'blockName'    => 'core/list-item',
			'attrs'        => array(),
			'innerBlocks'  => array(),
			'innerContent' => array( '<li>' . esc_html( $li ) . '</li>' ),
		);
		$inner_content[] = null; // placeholder consumed by serialize_block()
	}

	$inner_content[] = '</ul>';

	return serialize_block(
		array(
			'blockName'    => 'core/list',
			'attrs'        => array(),
			'innerBlocks'  => $inner_blocks,
			'innerContent' => $inner_content,
		)
	);
}

/**
 * Renders a core/list block from newline-separated items.
 *
 * @param Aldus_Content_Distributor $dist
 */
function aldus_block_list( Aldus_Content_Distributor $dist ): string {
	$item = $dist->consume( 'list' );
	if ( ! $item ) {
		return '';
	}

	$raw_items = preg_split( '/\r?\n/', trim( $item['content'] ) );
	$raw_items = array_filter( array_map( 'trim', $raw_items ) );

	$markup = aldus_serialize_list( $raw_items );
	return $markup ? $markup . "\n\n" : '';
}

/**
 * Renders a core/separator block with a tinted color.
 *
 * @param string $color_slug  Accent color slug.
 * @param string $style       'wide' (full-width), 'default' (short centered), or 'dots' (three dots).
 */
function aldus_block_separator( string $color_slug, string $style = 'wide' ): string {
	$color_safe = sanitize_html_class( $color_slug );

	// Map style name to CSS class; 'default' has no is-style-* class (it IS the default).
	$style_class = '';
	$align_attr  = '';
	$align_class = '';
	switch ( $style ) {
		case 'dots':
			$style_class = ' is-style-dots';
			break;
		case 'default':
			// No style class; no alignment — short centered line.
			break;
		default: // 'wide'
			$style_class = ' is-style-wide';
			$align_attr  = 'wide';
			$align_class = ' alignwide';
	}

	$attrs = array( 'className' => ltrim( $style_class ) );
	if ( $align_attr ) {
		$attrs['align'] = $align_attr;
	}

	return serialize_block(
		array(
			'blockName'    => 'core/separator',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerContent' => array( "<hr class=\"wp-block-separator{$align_class} has-{$color_safe}-color has-text-color{$style_class}\"/>" ),
		)
	) . "\n\n";
}

/**
 * Renders a core/buttons + core/button CTA.
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $color_slug    Button background color slug.
 * @param string                    $dark_slug     Dark color slug for ghost variant.
 * @param array                     $style_ctx     Personality style rules for variant selection.
 * @param bool                      $use_bindings  When true, embeds a Block Bindings attr on the button.
 * @param bool                      $wide_button   When true, sets button width to 50% (for full-width sections).
 */
function aldus_block_cta(
	Aldus_Content_Distributor $dist,
	string $color_slug,
	string $dark_slug = '',
	array $style_ctx = array(),
	bool $use_bindings = false,
	bool $wide_button = false
): string {
	$item = $dist->consume( 'cta' );
	if ( ! $item ) {
		return '';
	}

	$label = esc_html( $item['content'] );
	// Use '#' as placeholder when no URL is provided; example.com is misleading.
	$url = ! empty( $item['url'] ) ? esc_url( $item['url'] ) : '#';

	// Pick variant from personality style rules:
	// restrained accent → outlined; pronounced + high contrast → ghost; default → filled.
	$s_accent   = $style_ctx['accent'] ?? 'restrained';
	$s_contrast = $style_ctx['contrast'] ?? 'medium';

	if ( 'restrained' === $s_accent ) {
		$variant = 'outline';
	} elseif ( 'pronounced' === $s_accent && 'high' === $s_contrast ) {
		$variant = 'ghost';
	} else {
		// Use 'plain' so the theme's own button styles apply instead of Aldus
		// overriding background/text colors, making output feel more native.
		$variant = 'plain';
	}

	$btn_width = $wide_button ? 50 : 0;
	return aldus_serialize_button( $label, $url, $color_slug, $variant, $dark_slug ?: 'black', $use_bindings ? ( $item['id'] ?? '' ) : '', $btn_width );
}

/**
 * Renders a core/quote block.
 *
 * @param Aldus_Content_Distributor $dist
 */
function aldus_block_quote( Aldus_Content_Distributor $dist ): string {
	$item = $dist->consume( 'quote' );
	if ( ! $item ) {
		return '';
	}

	$text = esc_html( $item['content'] );

	return serialize_block(
		array(
			'blockName'    => 'core/quote',
			'attrs'        => array(),
			'innerBlocks'  => array(),
			'innerContent' => array( "<blockquote class=\"wp-block-quote\"><p>{$text}</p></blockquote>" ),
		)
	) . "\n\n";
}

// ---------------------------------------------------------------------------
// Cover variants: minimal, split, gradient
// ---------------------------------------------------------------------------

/**
 * Renders a minimal cover — full-width solid color block with centered headline.
 * No background image; the overlay color fills the entire block.
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $color_slug  Background/overlay color slug.
 * @param string                    $font_size   Font size slug for the inner heading.
 * @param string                    $name        Optional block name.
 */
function aldus_block_cover_minimal( Aldus_Content_Distributor $dist, string $color_slug, string $font_size, string $name = '' ): string {
	$headline = $dist->consume( 'headline' ) ?? $dist->consume( 'subheading' );
	if ( ! $headline ) {
		return '';
	}

	$headline_raw = $headline['content'] ?? '';
	$text         = esc_html( $headline_raw );
	$color_safe   = sanitize_html_class( $color_slug );

	$cover_min_height = aldus_cover_min_height( $headline_raw, 380 );
	$attrs            = array(
		'overlayColor'    => $color_slug,
		'dimRatio'        => 100,
		'align'           => 'full',
		'contentPosition' => 'center center',
		'minHeight'       => $cover_min_height,
		'minHeightUnit'   => 'px',
		'layout'          => array( 'type' => 'constrained' ),
	);
	if ( $name ) {
		$attrs['metadata'] = array( 'name' => $name );
	}

	$heading_html = serialize_block(
		array(
			'blockName'    => 'core/heading',
			'attrs'        => array(
				'level'     => 1,
				'textColor' => 'white',
				'fontSize'  => $font_size,
				'textAlign' => 'center',
			),
			'innerBlocks'  => array(),
			'innerContent' => array(
				'<h1 class="wp-block-heading has-text-align-center has-white-color'
				. " has-text-color has-{$font_size}-font-size\">{$text}</h1>",
			),
		)
	);

	return serialize_block(
		array(
			'blockName'    => 'core/cover',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerContent' => array(
				'<div class="wp-block-cover alignfull has-custom-content-position'
				. " is-position-center-center\" style=\"min-height:{$cover_min_height}px\">\n"
				. '<span aria-hidden="true" class="wp-block-cover__background'
				. " has-{$color_safe}-background-color has-background-dim-100 has-background-dim\"></span>\n"
				. '<div class="' . aldus_cover_inner_classes() . "\">\n{$heading_html}\n</div>\n</div>",
			),
		)
	) . "\n\n";
}

/**
 * Renders a full-viewport split-screen cover using core/media-text.
 * Image fills the left panel; heading and optional paragraph fill the right.
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $font_size  Font size slug for the headline.
 * @param string                    $name       Optional block name.
 */
function aldus_block_cover_split( Aldus_Content_Distributor $dist, string $font_size, string $name = '' ): string {
	$image    = $dist->consume( 'image' );
	$headline = $dist->consume( 'headline' ) ?? $dist->consume( 'subheading' );
	$para     = $dist->consume( 'paragraph' );

	if ( ! $image && ! $headline ) {
		return '';
	}

	$has_image_url = $image && ! empty( $image['url'] );

	$attrs = array(
		'mediaPosition'     => 'left',
		'mediaWidth'        => 50,
		'isStackedOnMobile' => true,
		'align'             => 'full',
		'minHeight'         => 600,
		'minHeightUnit'     => 'px',
	);
	if ( $has_image_url ) {
		$attrs['mediaUrl']  = esc_url_raw( $image['url'] );
		$attrs['mediaType'] = 'image';
	}
	if ( $name ) {
		$attrs['metadata'] = array( 'name' => $name );
	}

	// Always render a standard <img> to avoid imageFill serialisation drift.
	if ( $has_image_url ) {
		$image_url  = esc_url( $image['url'] );
		$image_html = "<figure class=\"wp-block-media-text__media\"><img src=\"{$image_url}\" alt=\"\" class=\"wp-image-0 size-full\"/></figure>";
	} else {
		$image_html = '<figure class="wp-block-media-text__media"></figure>';
	}

	$content_inner = '';
	if ( $headline ) {
		$font_size_safe = sanitize_html_class( $font_size );
		$content_inner .= serialize_block(
			array(
				'blockName'    => 'core/heading',
				'attrs'        => array(
					'level'    => 1,
					'fontSize' => $font_size,
				),
				'innerBlocks'  => array(),
				'innerContent' => array( "<h1 class=\"wp-block-heading has-{$font_size_safe}-font-size\">" . esc_html( $headline['content'] ) . '</h1>' ),
			)
		) . "\n";
	}
	if ( $para ) {
		$content_inner .= aldus_serialize_paragraph( esc_html( $para['content'] ) );
	}

	return serialize_block(
		array(
			'blockName'    => 'core/media-text',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerContent' => array(
				'<div class="' . aldus_media_text_classes( 'left', true, 'full' ) . "\">\n"
				. "{$image_html}\n"
				. "<div class=\"wp-block-media-text__content\">\n{$content_inner}</div>\n</div>",
			),
		)
	) . "\n\n";
}

/**
 * Renders two equal 50/50 columns, each with a paragraph (or subheading fallback).
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $name  Optional block name.
 */
/**
 * @param Aldus_Content_Distributor $dist
 * @param string                    $name     Optional block name.
 * @param int                       $variant  0 = two paragraphs, 1 = editorial (heading+para each side),
 *                                            2 = heading left + list right, 3 = quote left + para right,
 *                                            4 = image left + para right.
 */
function aldus_block_columns_two_equal( Aldus_Content_Distributor $dist, string $name = '', int $variant = 0 ): string {
	$cols_attrs = array( 'isStackedOnMobile' => true );
	$col_attrs  = array( 'width' => '50%' );
	if ( $name ) {
		$cols_attrs['metadata'] = array( 'name' => $name );
	}

	// ---- Variant 1: editorial — heading + paragraph in each column. ----
	if ( $variant === 1 ) {
		$pairs = array();
		for ( $i = 0; $i < 2; $i++ ) {
			$heading = $dist->consume( 'subheading' );
			$para    = $dist->consume( 'paragraph' );
			if ( $heading || $para ) {
				$pairs[] = array(
					'heading' => $heading,
					'para'    => $para,
				);
			}
		}
		if ( empty( $pairs ) ) {
			// Fall through to default if nothing to render.
			$variant = 0;
		} else {
			$cols_inner = '';
			foreach ( $pairs as $pair ) {
				$col_inner = '';
				if ( $pair['heading'] ) {
					$col_inner .= serialize_block(
						array(
							'blockName'    => 'core/heading',
							'attrs'        => array( 'level' => 3 ),
							'innerBlocks'  => array(),
							'innerContent' => array( '<h3 class="wp-block-heading">' . esc_html( $pair['heading']['content'] ) . '</h3>' ),
						)
					) . "\n";
				}
				if ( $pair['para'] ) {
					$col_inner .= serialize_block(
						array(
							'blockName'    => 'core/paragraph',
							'attrs'        => array(),
							'innerBlocks'  => array(),
							'innerContent' => array( '<p>' . esc_html( $pair['para']['content'] ) . '</p>' ),
						)
					) . "\n";
				}
				$cols_inner .= serialize_block(
					array(
						'blockName'    => 'core/column',
						'attrs'        => $col_attrs,
						'innerBlocks'  => array(),
						'innerContent' => array(
							'<div class="' . aldus_column_classes() . '" style="'
							. aldus_column_style( '50%' ) . "\">\n{$col_inner}</div>",
						),
					)
				) . "\n";
			}
			return serialize_block(
				array(
					'blockName'    => 'core/columns',
					'attrs'        => $cols_attrs,
					'innerBlocks'  => array(),
					'innerContent' => array( '<div class="' . aldus_columns_classes( true ) . "\">\n{$cols_inner}</div>" ),
				)
			) . "\n\n";
		}
	}

	// ---- Variant 2: heading left + list right. ----
	if ( $variant === 2 ) {
		$heading = $dist->consume( 'subheading' ) ?? $dist->consume( 'headline' );
		$list    = $dist->consume( 'list' );
		if ( ! $heading && ! $list ) {
			$variant = 0;
		} else {
			$left_inner = $heading ? serialize_block(
				array(
					'blockName'    => 'core/heading',
					'attrs'        => array( 'level' => 2 ),
					'innerBlocks'  => array(),
					'innerContent' => array( '<h2 class="wp-block-heading">' . esc_html( $heading['content'] ) . '</h2>' ),
				)
			) . "\n" : '';

			$right_inner = '';
			if ( $list ) {
				$raw_items   = preg_split( '/\r?\n/', trim( $list['content'] ) );
				$raw_items   = array_filter( array_map( 'trim', $raw_items ) );
				$list_markup = aldus_serialize_list( $raw_items );
				$right_inner = $list_markup ? $list_markup . "\n" : '';
			}

			$cols_inner  = serialize_block(
				array(
					'blockName'    => 'core/column',
					'attrs'        => $col_attrs,
					'innerBlocks'  => array(),
					'innerContent' => array( '<div class="' . aldus_column_classes() . '" style="' . aldus_column_style( '50%' ) . "\">\n{$left_inner}</div>" ),
				)
			) . "\n";
			$cols_inner .= serialize_block(
				array(
					'blockName'    => 'core/column',
					'attrs'        => $col_attrs,
					'innerBlocks'  => array(),
					'innerContent' => array(
						'<div class="' . aldus_column_classes() . '" style="'
						. aldus_column_style( '50%' ) . "\">\n{$right_inner}</div>",
					),
				)
			) . "\n";
			return serialize_block(
				array(
					'blockName'    => 'core/columns',
					'attrs'        => $cols_attrs,
					'innerBlocks'  => array(),
					'innerContent' => array( '<div class="' . aldus_columns_classes( true ) . "\">\n{$cols_inner}</div>" ),
				)
			) . "\n\n";
		}
	}

	// ---- Variant 3: quote left + paragraph right. ----
	if ( $variant === 3 ) {
		$quote = $dist->consume( 'quote' );
		$para  = $dist->consume( 'paragraph' );
		if ( ! $quote && ! $para ) {
			$variant = 0;
		} else {
			$left_inner  = $quote ? serialize_block(
				array(
					'blockName'    => 'core/quote',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<blockquote class="wp-block-quote"><p>' . esc_html( $quote['content'] ) . '</p></blockquote>' ),
				)
			) . "\n" : '';
			$right_inner = $para ? serialize_block(
				array(
					'blockName'    => 'core/paragraph',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<p>' . esc_html( $para['content'] ) . '</p>' ),
				)
			) . "\n" : '';

			$cols_inner  = serialize_block(
				array(
					'blockName'    => 'core/column',
					'attrs'        => $col_attrs,
					'innerBlocks'  => array(),
					'innerContent' => array( '<div class="' . aldus_column_classes() . '" style="' . aldus_column_style( '50%' ) . "\">\n{$left_inner}</div>" ),
				)
			) . "\n";
			$cols_inner .= serialize_block(
				array(
					'blockName'    => 'core/column',
					'attrs'        => $col_attrs,
					'innerBlocks'  => array(),
					'innerContent' => array(
						'<div class="' . aldus_column_classes() . '" style="'
						. aldus_column_style( '50%' ) . "\">\n{$right_inner}</div>",
					),
				)
			) . "\n";
			return serialize_block(
				array(
					'blockName'    => 'core/columns',
					'attrs'        => $cols_attrs,
					'innerBlocks'  => array(),
					'innerContent' => array( '<div class="' . aldus_columns_classes( true ) . "\">\n{$cols_inner}</div>" ),
				)
			) . "\n\n";
		}
	}

	// ---- Variant 4: image left + paragraph right. ----
	if ( $variant === 4 ) {
		$image = $dist->consume( 'image' );
		$para  = $dist->consume( 'paragraph' );
		if ( ! $image ) {
			$variant = 0; // Fall back if no image.
		} else {
			$image_url   = esc_url( $image['url'] );
			$left_inner  = serialize_block(
				array(
					'blockName'    => 'core/image',
					'attrs'        => array(
						'sizeSlug'        => 'large',
						'linkDestination' => 'none',
					),
					'innerBlocks'  => array(),
					'innerContent' => array( "<figure class=\"wp-block-image size-large\"><img src=\"{$image_url}\" alt=\"\" class=\"wp-image-0\"/></figure>" ),
				)
			) . "\n";
			$right_inner = $para ? serialize_block(
				array(
					'blockName'    => 'core/paragraph',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<p>' . esc_html( $para['content'] ) . '</p>' ),
				)
			) . "\n" : '';

			$cols_inner  = serialize_block(
				array(
					'blockName'    => 'core/column',
					'attrs'        => $col_attrs,
					'innerBlocks'  => array(),
					'innerContent' => array( '<div class="' . aldus_column_classes() . '" style="' . aldus_column_style( '50%' ) . "\">\n{$left_inner}</div>" ),
				)
			) . "\n";
			$cols_inner .= serialize_block(
				array(
					'blockName'    => 'core/column',
					'attrs'        => $col_attrs,
					'innerBlocks'  => array(),
					'innerContent' => array(
						'<div class="' . aldus_column_classes() . '" style="'
						. aldus_column_style( '50%' ) . "\">\n{$right_inner}</div>",
					),
				)
			) . "\n";
			return serialize_block(
				array(
					'blockName'    => 'core/columns',
					'attrs'        => $cols_attrs,
					'innerBlocks'  => array(),
					'innerContent' => array( '<div class="' . aldus_columns_classes( true ) . "\">\n{$cols_inner}</div>" ),
				)
			) . "\n\n";
		}
	}

	// ---- Variant 0 (default): two paragraphs. ----
	$left  = $dist->consume( 'paragraph' ) ?? $dist->consume( 'subheading' );
	$right = $dist->consume( 'paragraph' ) ?? $dist->consume( 'subheading' );

	if ( ! $left && ! $right ) {
		return '';
	}

	$cols_inner = '';
	foreach ( array( $left, $right ) as $item ) {
		$col_inner   = $item ? serialize_block(
			array(
				'blockName'    => 'core/paragraph',
				'attrs'        => array(),
				'innerBlocks'  => array(),
				'innerContent' => array( '<p>' . esc_html( $item['content'] ) . '</p>' ),
			)
		) . "\n" : '';
		$cols_inner .= serialize_block(
			array(
				'blockName'    => 'core/column',
				'attrs'        => $col_attrs,
				'innerBlocks'  => array(),
				'innerContent' => array(
					'<div class="' . aldus_column_classes() . '" style="'
					. aldus_column_style( '50%' ) . "\">\n{$col_inner}</div>",
				),
			)
		) . "\n";
	}

	return serialize_block(
		array(
			'blockName'    => 'core/columns',
			'attrs'        => $cols_attrs,
			'innerBlocks'  => array(),
			'innerContent' => array( '<div class="' . aldus_columns_classes( true ) . "\">\n{$cols_inner}</div>" ),
		)
	) . "\n\n";
}

/**
 * Renders four equal 25% columns with optional subheading labels.
 * Falls back gracefully if fewer than four content items are available.
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $bg_slug  Background color slug for each column.
 * @param string                    $name     Optional block name.
 */
function aldus_block_columns_four_equal( Aldus_Content_Distributor $dist, string $bg_slug, string $name = '' ): string {
	// Collect up to 4 items — subheadings preferred (for feature/stat grids).
	$col_items = array();
	for ( $i = 0; $i < 4; $i++ ) {
		$item = $dist->consume( 'subheading' ) ?? $dist->consume( 'paragraph' );
		if ( $item ) {
			$col_items[] = $item;
		}
	}

	if ( empty( $col_items ) ) {
		return '';
	}

	// Fewer than 3 items looks awkward in a 4-col grid — fall back to 2-col.
	if ( count( $col_items ) < 3 ) {
		return aldus_block_columns_two_equal_from_items( $col_items, $bg_slug, $name );
	}

	$col_sm     = aldus_theme_spacing( 'sm' );
	$cols_attrs = array( 'isStackedOnMobile' => false );
	$col_attrs  = array(
		'backgroundColor' => $bg_slug,
		'style'           => array(
			'spacing' => array(
				'padding' => array(
					'top'    => $col_sm,
					'right'  => $col_sm,
					'bottom' => $col_sm,
					'left'   => $col_sm,
				),
			),
		),
	);
	$bg_safe    = sanitize_html_class( $bg_slug );
	if ( $name ) {
		$cols_attrs['metadata'] = array( 'name' => $name );
	}

	$cols_inner = '';
	foreach ( $col_items as $item ) {
		$text       = esc_html( $item['content'] );
		$is_heading = in_array( $item['type'] ?? '', array( 'subheading', 'headline' ), true );

		$col_inner = $is_heading
			? serialize_block(
				array(
					'blockName'    => 'core/heading',
					'attrs'        => array( 'level' => 3 ),
					'innerBlocks'  => array(),
					'innerContent' => array( "<h3 class=\"wp-block-heading\">{$text}</h3>" ),
				)
			) . "\n"
			: serialize_block(
				array(
					'blockName'    => 'core/paragraph',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( "<p>{$text}</p>" ),
				)
			) . "\n";

		$cols_inner .= serialize_block(
			array(
				'blockName'    => 'core/column',
				'attrs'        => $col_attrs,
				'innerBlocks'  => array(),
				'innerContent' => array(
					'<div class="' . aldus_column_classes( $bg_slug ) . '" style="'
					. "padding-top:{$col_sm};padding-right:{$col_sm};"
					. "padding-bottom:{$col_sm};padding-left:{$col_sm}\">\n{$col_inner}</div>",
				),
			)
		) . "\n";
	}

	return serialize_block(
		array(
			'blockName'    => 'core/columns',
			'attrs'        => $cols_attrs,
			'innerBlocks'  => array(),
			'innerContent' => array( '<div class="' . aldus_columns_classes( false ) . "\">\n{$cols_inner}</div>" ),
		)
	) . "\n\n";
}

/**
 * Builds a 2-column layout from a pre-collected array of content items.
 * Used as a fallback from aldus_block_columns_four_equal when < 3 items exist.
 *
 * @param list<array{type:string,content:string,url:string}> $items
 * @param string                                             $bg_slug
 * @param string                                             $name
 */
function aldus_block_columns_two_equal_from_items( array $items, string $bg_slug, string $name = '' ): string {
	if ( empty( $items ) ) {
		return '';
	}

	$col_sm     = aldus_theme_spacing( 'sm' );
	$cols_attrs = array( 'isStackedOnMobile' => false );
	$col_attrs  = array(
		'backgroundColor' => $bg_slug,
		'style'           => array(
			'spacing' => array(
				'padding' => array(
					'top'    => $col_sm,
					'right'  => $col_sm,
					'bottom' => $col_sm,
					'left'   => $col_sm,
				),
			),
		),
	);
	$bg_safe    = sanitize_html_class( $bg_slug );
	if ( $name ) {
		$cols_attrs['metadata'] = array( 'name' => $name );
	}

	$cols_inner = '';
	foreach ( $items as $item ) {
		$text       = esc_html( $item['content'] );
		$is_heading = in_array( $item['type'] ?? '', array( 'subheading', 'headline' ), true );

		$col_inner = $is_heading
			? serialize_block(
				array(
					'blockName'    => 'core/heading',
					'attrs'        => array( 'level' => 3 ),
					'innerBlocks'  => array(),
					'innerContent' => array( "<h3 class=\"wp-block-heading\">{$text}</h3>" ),
				)
			) . "\n"
			: serialize_block(
				array(
					'blockName'    => 'core/paragraph',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( "<p>{$text}</p>" ),
				)
			) . "\n";

		$cols_inner .= serialize_block(
			array(
				'blockName'    => 'core/column',
				'attrs'        => $col_attrs,
				'innerBlocks'  => array(),
				'innerContent' => array(
					'<div class="' . aldus_column_classes( $bg_slug ) . '" style="'
					. "padding-top:{$col_sm};padding-right:{$col_sm};"
					. "padding-bottom:{$col_sm};padding-left:{$col_sm}\">\n{$col_inner}</div>",
				),
			)
		) . "\n";
	}

	return serialize_block(
		array(
			'blockName'    => 'core/columns',
			'attrs'        => $cols_attrs,
			'innerBlocks'  => array(),
			'innerContent' => array( '<div class="' . aldus_columns_classes( false ) . "\">\n{$cols_inner}</div>" ),
		)
	) . "\n\n";
}

/**
 * Renders a core/group with a visible border and padding — no background fill.
 * Used for editorial inset feel (Codex, Ledger personalities).
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $name     Optional block name.
 * @param int                       $variant  0 = heading/para/quote, 1 = heading/para/list/CTA.
 */
/**
 * @param Aldus_Content_Distributor $dist
 * @param string                    $name       Optional block name.
 * @param int                       $variant    0 = heading/para/optional quote, 1 = heading/para/list/CTA.
 * @param string                    $block_gap  Optional blockGap CSS value.
 * @param string                    $shadow     Optional shadow CSS value.
 */
function aldus_block_group_border( Aldus_Content_Distributor $dist, string $name = '', int $variant = 0, string $block_gap = '', string $shadow = '' ): string {
	$subheading = $dist->consume( 'subheading' );
	$para       = $dist->consume( 'paragraph' );

	$border_pad = aldus_theme_spacing( 'md' );
	$spacing    = array(
		'padding' => array(
			'top'    => $border_pad,
			'right'  => $border_pad,
			'bottom' => $border_pad,
			'left'   => $border_pad,
		),
	);
	if ( $block_gap ) {
		$spacing['blockGap'] = $block_gap;
	}
	$style_attrs = array(
		'border'  => array(
			'width' => '2px',
			'style' => 'solid',
			'color' => 'currentColor',
		),
		'spacing' => $spacing,
	);
	if ( $shadow ) {
		$style_attrs['shadow'] = $shadow;
	}
	$attrs = array(
		'style'  => $style_attrs,
		'layout' => array(
			'type'        => 'constrained',
			'contentSize' => aldus_theme_content_size(),
		),
	);
	if ( $name ) {
		$attrs['metadata'] = array( 'name' => $name );
	}

	$inner = '';
	if ( $subheading ) {
		$inner .= aldus_serialize_heading( esc_html( $subheading['content'] ), 2 );
	}
	if ( $para ) {
		$inner .= aldus_serialize_paragraph( esc_html( $para['content'] ) );
	}

	if ( $variant === 1 ) {
		// Variant 1 (dense): add list + CTA button.
		$list_item = $dist->has( 'list' ) ? $dist->consume( 'list' ) : null;
		if ( $list_item ) {
			$raw_items   = preg_split( '/\r?\n/', trim( $list_item['content'] ) );
			$raw_items   = array_filter( array_map( 'trim', $raw_items ) );
			$list_markup = aldus_serialize_list( $raw_items );
			if ( $list_markup ) {
				$inner .= $list_markup . "\n";
			}
		}
		$cta_item = $dist->has( 'cta' ) ? $dist->consume( 'cta' ) : null;
		if ( $cta_item ) {
			$cta_label = esc_html( $cta_item['content'] );
			$cta_url   = ! empty( $cta_item['url'] ) ? esc_url( $cta_item['url'] ) : '#';
			$btn       = serialize_block(
				array(
					'blockName'    => 'core/button',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array(
						'<div class="wp-block-button"><a class="wp-block-button__link'
						. " wp-element-button\" href=\"{$cta_url}\">{$cta_label}</a></div>",
					),
				)
			);
			$inner    .= serialize_block(
				array(
					'blockName'    => 'core/buttons',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<div class="' . aldus_buttons_classes() . "\">{$btn}</div>" ),
				)
			) . "\n";
		}
	} else {
		// Variant 0 (default): optional quote.
		$quote = $dist->has( 'quote' ) ? $dist->consume( 'quote' ) : null;
		if ( $quote ) {
			$inner .= serialize_block(
				array(
					'blockName'    => 'core/quote',
					'attrs'        => array(),
					'innerBlocks'  => array(),
					'innerContent' => array( '<blockquote class="wp-block-quote"><p>' . esc_html( $quote['content'] ) . '</p></blockquote>' ),
				)
			) . "\n";
		}
	}

	if ( ! $inner ) {
		return '';
	}

	return serialize_block(
		array(
			'blockName'    => 'core/group',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			// phpcs:disable Generic.Files.LineLength.MaxExceeded -- serialize_block innerContent must be a single unbroken string.
			'innerContent' => array( '<div class="' . aldus_group_classes() . " has-border-color\" style=\"border-color:currentColor;border-style:solid;border-width:2px;padding-top:{$border_pad};padding-right:{$border_pad};padding-bottom:{$border_pad};padding-left:{$border_pad}\">\n{$inner}</div>" ),
			// phpcs:enable Generic.Files.LineLength.MaxExceeded
		)
	) . "\n\n";
}

/**
 * Renders a full-width core/group with a theme gradient background.
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $gradient_slug  Gradient preset slug.
 * @param string                    $name           Optional block name.
 * @param int                       $variant        0 = heading/para/CTA, 1 = testimonial (quote + CTA).
 * @param string                    $block_gap      Optional blockGap CSS value.
 * @param string                    $shadow         Optional shadow CSS value.
 */
function aldus_block_group_gradient(
	Aldus_Content_Distributor $dist,
	string $gradient_slug,
	string $name = '',
	int $variant = 0,
	string $block_gap = '',
	string $shadow = ''
): string {
	$gradient_safe = sanitize_html_class( $gradient_slug );

	$gradient_pad = aldus_theme_spacing( 'lg' );
	$spacing      = array(
		'padding' => array(
			'top'    => $gradient_pad,
			'bottom' => $gradient_pad,
		),
	);
	if ( $block_gap ) {
		$spacing['blockGap'] = $block_gap;
	}
	$style_attrs = array( 'spacing' => $spacing );
	if ( $shadow ) {
		$style_attrs['shadow'] = $shadow;
	}
	$attrs = array(
		'gradient' => $gradient_slug,
		'align'    => 'full',
		'layout'   => array(
			'type'        => 'constrained',
			'contentSize' => aldus_theme_content_size(),
		),
		'style'    => $style_attrs,
	);
	if ( $name ) {
		$attrs['metadata'] = array( 'name' => $name );
	}

	$inner = '';

	if ( $variant === 1 ) {
		// Variant 1: testimonial — large quote + optional attribution + CTA.
		$quote = $dist->has( 'quote' ) ? $dist->consume( 'quote' ) : null;
		if ( $quote ) {
			$inner .= serialize_block(
				array(
					'blockName'    => 'core/quote',
					'attrs'        => array( 'textAlign' => 'center' ),
					'innerBlocks'  => array(),
					'innerContent' => array(
						'<blockquote class="wp-block-quote has-text-align-center"><p>'
						. esc_html( $quote['content'] ) . '</p></blockquote>',
					),
				)
			) . "\n";
		}
		// Attribution from a subheading (person's name / title).
		$attribution = $dist->has( 'subheading' ) ? $dist->consume( 'subheading' ) : null;
		if ( $attribution ) {
			$inner .= serialize_block(
				array(
					'blockName'    => 'core/paragraph',
					'attrs'        => array(
						'textAlign' => 'center',
						'style'     => array( 'typography' => array( 'fontStyle' => 'italic' ) ),
					),
					'innerBlocks'  => array(),
					'innerContent' => array( '<p class="has-text-align-center"><em>' . esc_html( $attribution['content'] ) . '</em></p>' ),
				)
			) . "\n";
		}
	} else {
		// Variant 0 (default): heading + paragraph + CTA.
		$subheading = $dist->consume( 'subheading' );
		$para       = $dist->consume( 'paragraph' );
		if ( $subheading ) {
			$inner .= aldus_serialize_heading( esc_html( $subheading['content'] ), 2 );
		}
		if ( $para ) {
			$inner .= aldus_serialize_paragraph( esc_html( $para['content'] ) );
		}
	}

	// Both variants: append a CTA button if available.
	$cta = $dist->has( 'cta' ) ? $dist->consume( 'cta' ) : null;
	if ( $cta ) {
		$label  = esc_html( $cta['content'] );
		$url    = ! empty( $cta['url'] ) ? esc_url( $cta['url'] ) : '#';
		$btn    = serialize_block(
			array(
				'blockName'    => 'core/button',
				'attrs'        => array(),
				'innerBlocks'  => array(),
				'innerContent' => array(
					'<div class="wp-block-button"><a class="wp-block-button__link'
					. " wp-element-button\" href=\"{$url}\">{$label}</a></div>",
				),
			)
		);
		$inner .= serialize_block(
			array(
				'blockName'    => 'core/buttons',
				'attrs'        => ( $variant === 1 ) ? array(
					'layout' => array(
						'type'           => 'flex',
						'justifyContent' => 'center',
					),
				) : array(),
				'innerBlocks'  => array(),
				'innerContent' => array( '<div class="' . aldus_buttons_classes() . "\">{$btn}</div>" ),
			)
		) . "\n";
	}

	if ( ! $inner ) {
		return '';
	}

	return serialize_block(
		array(
			'blockName'    => 'core/group',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerContent' => array(
				'<div class="' . aldus_group_classes( 'constrained', 'full', '', '', $gradient_slug )
				. "\" style=\"padding-top:{$gradient_pad};padding-bottom:{$gradient_pad}\">\n{$inner}</div>",
			),
		)
	) . "\n\n";
}

/**
 * Renders a centered pullquote with no border — pure typographic focus.
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $name  Optional block name.
 */
function aldus_block_pullquote_centered( Aldus_Content_Distributor $dist, string $name = '' ): string {
	$quote = $dist->consume( 'quote' );
	if ( ! $quote ) {
		return '';
	}

	$text = esc_html( $quote['content'] );

	return serialize_block(
		array(
			'blockName'    => 'core/pullquote',
			'attrs'        => array(
				'align' => 'wide',
				'style' => array( 'typography' => array( 'textAlign' => 'center' ) ),
			),
			'innerBlocks'  => array(),
			'innerContent' => array(
				"<figure class=\"wp-block-pullquote alignwide has-text-align-center\"><blockquote><p>{$text}</p></blockquote></figure>",
			),
		)
	) . "\n\n";
}

/**
 * Renders a large display heading (h1 with the theme's largest font size).
 * Standalone — no following content; used as a typographic chapter break.
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $font_size  Font size slug.
 * @param string                    $name       Optional block name.
 */
function aldus_block_heading_display( Aldus_Content_Distributor $dist, string $font_size, string $name = '' ): string {
	$item = $dist->consume( 'headline' ) ?? $dist->consume( 'subheading' );
	if ( ! $item ) {
		return '';
	}

	$text = esc_html( $item['content'] );

	return serialize_block(
		array(
			'blockName'    => 'core/heading',
			'attrs'        => array(
				'level'     => 1,
				'fontSize'  => $font_size,
				'textAlign' => 'center',
			),
			'innerBlocks'  => array(),
			'innerContent' => array( "<h1 class=\"wp-block-heading has-text-align-center has-{$font_size}-font-size\">{$text}</h1>" ),
		)
	) . "\n\n";
}

/**
 * Renders a kicker (small h6) immediately followed by the main h1 headline.
 * Produces a two-heading typographic pair for editorial openers.
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $font_size  Font size slug for the main h1.
 * @param string                    $name       Optional block name.
 */
function aldus_block_heading_kicker( Aldus_Content_Distributor $dist, string $font_size, string $name = '' ): string {
	$kicker = $dist->consume( 'subheading' );
	$main   = $dist->consume( 'headline' ) ?? $dist->consume( 'subheading' );

	if ( ! $kicker && ! $main ) {
		return '';
	}

	$markup = '';
	if ( $kicker ) {
		$markup .= serialize_block(
			array(
				'blockName'    => 'core/heading',
				'attrs'        => array(
					'level' => 6,
					'style' => array(
						'typography' => array(
							'textTransform' => 'uppercase',
							'letterSpacing' => '0.12em',
						),
					),
				),
				'innerBlocks'  => array(),
				'innerContent' => array( '<h6 class="wp-block-heading">' . esc_html( $kicker['content'] ) . '</h6>' ),
			)
		) . "\n";
	}
	if ( $main ) {
		$font_size_safe = sanitize_html_class( $font_size );
		$markup        .= serialize_block(
			array(
				'blockName'    => 'core/heading',
				'attrs'        => array(
					'level'    => 1,
					'fontSize' => $font_size,
				),
				'innerBlocks'  => array(),
				'innerContent' => array( "<h1 class=\"wp-block-heading has-{$font_size_safe}-font-size\">" . esc_html( $main['content'] ) . '</h1>' ),
			)
		) . "\n";
	}

	return $markup . "\n";
}

/**
 * Renders a core/quote block with a citation line.
 * Uses a subheading item as the attribution if one is available.
 *
 * @param Aldus_Content_Distributor $dist
 */
function aldus_block_quote_attributed( Aldus_Content_Distributor $dist ): string {
	$quote = $dist->consume( 'quote' );
	if ( ! $quote ) {
		return '';
	}

	$text        = esc_html( $quote['content'] );
	$attribution = $dist->has( 'subheading' ) ? $dist->consume( 'subheading' ) : null;
	$cite_html   = $attribution ? '<cite>' . esc_html( $attribution['content'] ) . '</cite>' : '';

	return serialize_block(
		array(
			'blockName'    => 'core/quote',
			'attrs'        => array(),
			'innerBlocks'  => array(),
			'innerContent' => array( "<blockquote class=\"wp-block-quote\"><p>{$text}</p>{$cite_html}</blockquote>" ),
		)
	) . "\n\n";
}

// ---------------------------------------------------------------------------
// Gradient theme helpers
// ---------------------------------------------------------------------------

/**
 * Returns the active theme's gradient presets, or a built-in fallback.
 *
 * @return list<array{slug:string,gradient:string}>
 */
function aldus_get_theme_gradients(): array {
	$cache_key = 'aldus_gradients_' . ALDUS_VERSION;
	$cached    = wp_cache_get( $cache_key, 'aldus' );
	if ( false !== $cached ) {
		return (array) $cached;
	}

	$settings = wp_get_global_settings( array( 'color', 'gradients' ) );
	if ( is_wp_error( $settings ) || ! is_array( $settings ) ) {
		$settings = array();
	}
	$gradients = $settings['theme'] ?? $settings['default'] ?? array();

	if ( empty( $gradients ) ) {
		$gradients = array(
			array(
				'slug'     => 'vivid-cyan-blue-to-vivid-purple',
				'gradient' => 'linear-gradient(135deg,rgba(6,147,227,1) 0%,rgb(155,81,224) 100%)',
			),
			array(
				'slug'     => 'light-green-cyan-to-vivid-green-cyan',
				'gradient' => 'linear-gradient(135deg,rgb(122,220,180) 0%,rgb(0,208,130) 100%)',
			),
		);
	}

	wp_cache_set( $cache_key, $gradients, 'aldus', HOUR_IN_SECONDS );
	return $gradients;
}

/**
 * Returns the first gradient slug (or a safe fallback).
 *
 * @param list<array{slug:string,gradient:string}> $gradients
 * @return string
 */
function aldus_pick_gradient( array $gradients ): string {
	if ( empty( $gradients ) ) {
		return 'vivid-cyan-blue-to-vivid-purple';
	}
	return sanitize_html_class( $gradients[0]['slug'] ?? 'vivid-cyan-blue-to-vivid-purple' );
}

// ---------------------------------------------------------------------------
// Video renderers
// ---------------------------------------------------------------------------

/**
 * Renders a full-width video/embed block (video:hero token).
 * Uses core/embed, which handles YouTube, Vimeo, and most oEmbed providers.
 *
 * @param Aldus_Content_Distributor $dist
 * @return string
 */
function aldus_block_video_hero( Aldus_Content_Distributor $dist ): string {
	$item = $dist->consume( 'video' );
	if ( ! $item || empty( $item['url'] ) ) {
		return '';
	}
	$url = esc_url( $item['url'] );

	return serialize_block(
		array(
			'blockName'    => 'core/embed',
			'attrs'        => array(
				'url'        => esc_url_raw( $item['url'] ),
				'responsive' => true,
				'metadata'   => array( 'name' => 'Video Hero' ),
			),
			'innerBlocks'  => array(),
			'innerContent' => array( "<figure class=\"wp-block-embed\"><div class=\"wp-block-embed__wrapper\">\n{$url}\n</div></figure>" ),
		)
	) . "\n\n";
}

/**
 * Renders a named group containing a subheading and an embed (video:section token).
 *
 * @param Aldus_Content_Distributor $dist
 * @return string
 */
function aldus_block_video_section( Aldus_Content_Distributor $dist ): string {
	$item = $dist->consume( 'video' );
	if ( ! $item || empty( $item['url'] ) ) {
		return '';
	}
	$url     = esc_url( $item['url'] );
	$heading = $dist->consume( 'subheading' );

	$inner = '';
	if ( $heading && ! empty( $heading['content'] ) ) {
		$inner .= serialize_block(
			array(
				'blockName'    => 'core/heading',
				'attrs'        => array( 'level' => 2 ),
				'innerBlocks'  => array(),
				'innerContent' => array( '<h2 class="wp-block-heading">' . esc_html( $heading['content'] ) . '</h2>' ),
			)
		) . "\n\n";
	}

	$inner .= serialize_block(
		array(
			'blockName'    => 'core/embed',
			'attrs'        => array(
				'url'        => esc_url_raw( $item['url'] ),
				'responsive' => true,
			),
			'innerBlocks'  => array(),
			'innerContent' => array( "<figure class=\"wp-block-embed\"><div class=\"wp-block-embed__wrapper\">\n{$url}\n</div></figure>" ),
		)
	) . "\n\n";

	return serialize_block(
		array(
			'blockName'    => 'core/group',
			'attrs'        => array( 'metadata' => array( 'name' => 'Video Section' ) ),
			'innerBlocks'  => array(),
			'innerContent' => array( '<div class="' . aldus_group_classes( 'flow' ) . "\">\n{$inner}</div>" ),
		)
	) . "\n\n";
}

// ---------------------------------------------------------------------------
// Table renderer
// ---------------------------------------------------------------------------

/**
 * Renders a striped core/table block from CSV-like textarea content (table:data token).
 * Content format: comma- or tab-separated, one row per line, first row is the header.
 *
 * @param Aldus_Content_Distributor $dist
 * @return string
 */
function aldus_block_table( Aldus_Content_Distributor $dist ): string {
	$item = $dist->consume( 'table' );
	if ( ! $item || empty( $item['content'] ) ) {
		return '';
	}

	// Normalize Windows line endings before splitting so \r\n-terminated content
	// (pasted from spreadsheets or Windows clipboard) is parsed correctly.
	$normalized = str_replace( "\r\n", "\n", $item['content'] );
	$rows       = array_values( array_filter( array_map( 'trim', explode( "\n", $normalized ) ) ) );
	if ( empty( $rows ) ) {
		return '';
	}

	$split_row = fn( string $row ): array => array_map( 'trim', str_getcsv( $row ) );

	$header_cells = array_map(
		fn( string $cell ): string =>
			'<th class="has-text-align-left" data-align="left"><strong>' . esc_html( $cell ) . '</strong></th>',
		$split_row( array_shift( $rows ) )
	);

	$body_rows = array_map(
		fn( string $row ): string =>
			'<tr>' . implode(
				'',
				array_map(
					fn( string $cell ): string =>
						'<td class="has-text-align-left" data-align="left">' . esc_html( $cell ) . '</td>',
					$split_row( $row )
				)
			) . '</tr>',
		$rows
	);

	$thead = '<thead><tr>' . implode( '', $header_cells ) . '</tr></thead>';
	$tbody = '<tbody>' . implode( '', $body_rows ) . '</tbody>';

	return serialize_block(
		array(
			'blockName'    => 'core/table',
			'attrs'        => array(
				'hasFixedLayout' => true,
				'className'      => 'is-style-stripes',
				'metadata'       => array( 'name' => 'Data Table' ),
			),
			'innerBlocks'  => array(),
			'innerContent' => array( "<figure class=\"wp-block-table\"><table class=\"has-fixed-layout is-style-stripes\">{$thead}{$tbody}</table></figure>" ),
		)
	) . "\n\n";
}

// ---------------------------------------------------------------------------
// Gallery renderer
// ---------------------------------------------------------------------------

/**
 * Renders a core/gallery block from a gallery item's urls array (gallery:2-col / gallery:3-col tokens).
 *
 * @param Aldus_Content_Distributor $dist
 * @param int                       $columns  Number of columns (2 or 3).
 * @param string                    $name     Block name shown in List View.
 * @return string
 */
function aldus_block_gallery( Aldus_Content_Distributor $dist, int $columns = 2, string $name = 'Gallery' ): string {
	$item = $dist->consume( 'gallery' );
	if ( ! $item ) {
		return '';
	}

	$urls      = is_array( $item['urls'] ?? null ) ? $item['urls'] : array();
	$media_ids = is_array( $item['mediaIds'] ?? null ) ? $item['mediaIds'] : array();
	// Fall back to the scalar url field so a gallery item with a single URL still renders.
	if ( empty( $urls ) && ! empty( $item['url'] ) ) {
		$urls = array( (string) $item['url'] );
	}
	if ( empty( $urls ) ) {
		return '';
	}

	$inner = '';
	foreach ( $urls as $i => $raw_url ) {
		$url = esc_url( $raw_url );
		if ( ! $url ) {
			continue;
		}
		$img_attrs = array(
			'url'      => esc_url_raw( $raw_url ),
			'sizeSlug' => 'large',
		);
		$media_id  = (int) ( $media_ids[ $i ] ?? 0 );
		if ( $media_id > 0 ) {
			$img_attrs['id'] = $media_id;
		}
		$inner .= serialize_block(
			array(
				'blockName'    => 'core/image',
				'attrs'        => $img_attrs,
				'innerBlocks'  => array(),
				'innerContent' => array( "<figure class=\"wp-block-image size-large\"><img src=\"{$url}\"/></figure>" ),
			)
		) . "\n";
	}

	if ( ! $inner ) {
		return '';
	}

	return serialize_block(
		array(
			'blockName'    => 'core/gallery',
			'attrs'        => array(
				'columns'  => $columns,
				'linkTo'   => 'none',
				'metadata' => array( 'name' => $name ),
			),
			'innerBlocks'  => array(),
			'innerContent' => array( "<figure class=\"wp-block-gallery has-nested-images columns-{$columns} is-cropped\">{$inner}</figure>" ),
		)
	) . "\n\n";
}

// ---------------------------------------------------------------------------
// New layout token renderers
// ---------------------------------------------------------------------------

/**
 * Renders a CSS Grid group (group:grid token).
 * Consumes up to 6 headline+paragraph pairs and arranges them in a 3-column grid.
 *
 * @param Aldus_Content_Distributor $dist
 * @return string
 */
function aldus_block_group_grid( Aldus_Content_Distributor $dist ): string {
	$cells = array();
	for ( $i = 0; $i < 6; $i++ ) {
		$heading = $dist->has( 'subheading' ) ? $dist->consume( 'subheading' ) : null;
		$para    = $dist->has( 'paragraph' ) ? $dist->consume( 'paragraph' ) : null;
		if ( ! $heading && ! $para ) {
			break;
		}
		$cells[] = array(
			'heading' => $heading,
			'para'    => $para,
		);
	}

	if ( empty( $cells ) ) {
		return '';
	}

	$inner = '';
	foreach ( $cells as $cell ) {
		$cell_inner = '';
		if ( $cell['heading'] ) {
			$cell_inner .= aldus_serialize_heading( esc_html( $cell['heading']['content'] ), 3 );
		}
		if ( $cell['para'] ) {
			$cell_inner .= aldus_serialize_paragraph( esc_html( $cell['para']['content'] ) );
		}
		$inner .= serialize_block(
			array(
				'blockName'    => 'core/group',
				'attrs'        => array( 'layout' => array( 'type' => 'constrained' ) ),
				'innerBlocks'  => array(),
				'innerContent' => array( '<div class="' . aldus_group_classes( 'constrained' ) . "\">\n{$cell_inner}</div>" ),
			)
		) . "\n";
	}

	return serialize_block(
		array(
			'blockName'    => 'core/group',
			'attrs'        => array(
				'align'    => 'full',
				'layout'   => array(
					'type'        => 'grid',
					'columnCount' => 3,
				),
				'style'    => array(
					'spacing' => array(
						'blockGap' => '1rem',
						'padding'  => array(
							'top'    => aldus_theme_spacing( 'lg' ),
							'bottom' => aldus_theme_spacing( 'lg' ),
						),
					),
				),
				'metadata' => array( 'name' => 'Card Grid' ),
			),
			'innerBlocks'  => array(),
			'innerContent' => array( '<div class="' . aldus_group_classes( 'grid' ) . " alignfull\">\n{$inner}</div>" ),
		)
	) . "\n\n";
}

/**
 * Renders a horizontal flex row of stat cards (row:stats token).
 * Consumes 3–4 subheading+paragraph pairs arranged side by side.
 *
 * @param Aldus_Content_Distributor $dist
 * @return string
 */
function aldus_block_row_stats( Aldus_Content_Distributor $dist ): string {
	$pairs = array();
	for ( $i = 0; $i < 4; $i++ ) {
		$heading = $dist->has( 'subheading' ) ? $dist->consume( 'subheading' ) : null;
		$para    = $dist->has( 'paragraph' ) ? $dist->consume( 'paragraph' ) : null;
		if ( ! $heading && ! $para ) {
			break;
		}
		$pairs[] = array(
			'heading' => $heading,
			'para'    => $para,
		);
	}

	if ( count( $pairs ) < 2 ) {
		return '';
	}

	$inner = '';
	foreach ( $pairs as $pair ) {
		$stat_inner = '';
		if ( $pair['heading'] ) {
			$stat_inner .= aldus_serialize_heading( esc_html( $pair['heading']['content'] ), 3 );
		}
		if ( $pair['para'] ) {
			$stat_inner .= aldus_serialize_paragraph( esc_html( $pair['para']['content'] ) );
		}
		$inner .= serialize_block(
			array(
				'blockName'    => 'core/group',
				'attrs'        => array( 'layout' => array( 'type' => 'constrained' ) ),
				'innerBlocks'  => array(),
				'innerContent' => array( '<div class="' . aldus_group_classes( 'constrained' ) . "\">\n{$stat_inner}</div>" ),
			)
		) . "\n";
	}

	return serialize_block(
		array(
			'blockName'    => 'core/group',
			'attrs'        => array(
				'layout'   => array(
					'type'           => 'flex',
					'flexWrap'       => 'nowrap',
					'justifyContent' => 'space-between',
				),
				'style'    => array(
					'spacing' => array(
						'blockGap' => '1.5rem',
						'padding'  => array(
							'top'    => '2rem',
							'bottom' => '2rem',
						),
					),
				),
				'metadata' => array( 'name' => 'Stats Row' ),
			),
			'innerBlocks'  => array(),
			'innerContent' => array( '<div class="' . aldus_group_classes( 'flex' ) . "\">\n{$inner}</div>" ),
		)
	) . "\n\n";
}

/**
 * Renders a series of core/details (accordion) blocks (details:accordion token).
 * Consumes alternating subheading+paragraph pairs as summary+body.
 *
 * @param Aldus_Content_Distributor $dist
 * @return string
 */
function aldus_block_details_accordion( Aldus_Content_Distributor $dist ): string {
	$output = '';
	$count  = 0;

	while ( $count < 5 && ( $dist->has( 'subheading' ) || $dist->has( 'paragraph' ) ) ) {
		$summary = $dist->has( 'subheading' ) ? $dist->consume( 'subheading' ) : null;
		$body    = $dist->has( 'paragraph' ) ? $dist->consume( 'paragraph' ) : null;
		if ( ! $summary && ! $body ) {
			break;
		}

		$summary_text = $summary ? esc_html( $summary['content'] ) : '';
		$body_text    = $body ? esc_html( $body['content'] ) : '';
		$inner_html   = "<details class=\"wp-block-details\"><summary>{$summary_text}</summary>\n"
			. ( $body_text ? "<p>{$body_text}</p>\n" : '' )
			. '</details>';

		$output .= serialize_block(
			array(
				'blockName'    => 'core/details',
				'attrs'        => array( 'showContent' => false ),
				'innerBlocks'  => array(),
				'innerContent' => array( $inner_html ),
			)
		) . "\n";
		++$count;
	}

	return $output ? $output . "\n" : '';
}

/**
 * Renders a core/code block (code:block token).
 *
 * @param Aldus_Content_Distributor $dist
 * @return string
 */
function aldus_block_code( Aldus_Content_Distributor $dist ): string {
	$item = $dist->consume( 'code' );
	if ( ! $item || empty( trim( $item['content'] ) ) ) {
		return '';
	}

	$code = esc_html( $item['content'] );

	return serialize_block(
		array(
			'blockName'    => 'core/code',
			'attrs'        => array(),
			'innerBlocks'  => array(),
			'innerContent' => array( "<pre class=\"wp-block-code\"><code>{$code}</code></pre>" ),
		)
	) . "\n\n";
}

/**
 * Renders a paragraph:lead block — a paragraph with the theme's large font size.
 *
 * @param Aldus_Content_Distributor $dist
 * @param array                     $theme  Precomputed theme context (needs 'medium' or 'large' key).
 * @return string
 */
function aldus_block_paragraph_lead( Aldus_Content_Distributor $dist, array $theme ): string {
	$item = $dist->consume( 'paragraph' );
	if ( ! $item ) {
		return '';
	}

	$font_size = $theme['medium'] ?? $theme['large'] ?? 'large';
	$fs_safe   = sanitize_html_class( $font_size );
	$text      = esc_html( $item['content'] );

	return serialize_block(
		array(
			'blockName'    => 'core/paragraph',
			'attrs'        => array( 'fontSize' => $font_size ),
			'innerBlocks'  => array(),
			'innerContent' => array( "<p class=\"has-{$fs_safe}-font-size\">{$text}</p>" ),
		)
	) . "\n\n";
}
