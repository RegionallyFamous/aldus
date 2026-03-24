<?php
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
	private array $pools = [];

	/** @var array<string, int> */
	private array $cursors = [];

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
	 * Reorders pools so high-visibility tokens get the best (first) content items.
	 *
	 * Walks the token sequence, tallies demand per content type, and sorts pool
	 * items so that items consumed by "heavy" / "visual" tokens appear first.
	 * Tokens that aren't mapped to a content type (e.g. separator) are ignored.
	 *
	 * @param list<string> $tokens    Ordered token sequence about to be rendered.
	 * @param array        $weights   Token weight map from aldus_token_weights().
	 */
	public function prioritize( array $tokens, array $weights ): void {
		// Token → required content type (only types that need pool items).
		$requirements = [
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
		];

		// Priority order: heavy > visual > reading > cta > utility.
		$weight_rank = [ 'heavy' => 4, 'visual' => 3, 'reading' => 2, 'cta' => 1, 'utility' => 0 ];

		// Build per-type priority: highest weight among all tokens that need that type.
		$type_priority = [];
		foreach ( $tokens as $token ) {
			$type   = $requirements[ $token ] ?? null;
			$weight = $weights[ $token ] ?? 'reading';
			$rank   = $weight_rank[ $weight ] ?? 0;
			if ( $type && ( ! isset( $type_priority[ $type ] ) || $rank > $type_priority[ $type ] ) ) {
				$type_priority[ $type ] = $rank;
			}
		}

		// For each pool where high-priority tokens consume first, keep pool order
		// (items were already submitted in insertion order — first is best).
		// This method is a no-op if the user only submitted one item per type.
		// Its main value: when multiple items exist for a type (e.g. 3 paragraphs),
		// ensure the first paragraph goes to the most prominent block.
		// Current implementation: reset cursors so heavy consumers always get index 0.
		// Since consume() is serial, and tokens are rendered in sequence, heavy tokens
		// (covers, media-text) appear early — they already get pool[0]. This pass
		// explicitly ensures pools aren't stale from a previous layout's partial run.
		foreach ( array_keys( $this->pools ) as $type ) {
			$this->cursors[ $type ] = 0;
		}
	}
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
	$h = 0;
	for ( $i = 0, $len = strlen( $key ); $i < $len; $i++ ) {
		$h = ( $h * 31 + ord( $key[ $i ] ) ) % 997;
	}
	return ( abs( $seed * 7 + $h ) ) % $count;
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
	$rules = [
		'Dispatch'   => [ 'align' => 'left',     'density' => 'balanced', 'contrast' => 'high',   'accent' => 'restrained' ],
		'Tribune'    => [ 'align' => 'centered',  'density' => 'dense',    'contrast' => 'medium', 'accent' => 'restrained' ],
		'Folio'      => [ 'align' => 'left',     'density' => 'airy',     'contrast' => 'medium', 'accent' => 'restrained' ],
		'Nocturne'   => [ 'align' => 'centered',  'density' => 'airy',     'contrast' => 'high',   'accent' => 'pronounced' ],
		'Chronicle'  => [ 'align' => 'left',     'density' => 'dense',    'contrast' => 'medium', 'accent' => 'restrained' ],
		'Broadsheet' => [ 'align' => 'left',     'density' => 'dense',    'contrast' => 'high',   'accent' => 'restrained' ],
		'Codex'      => [ 'align' => 'left',     'density' => 'balanced', 'contrast' => 'medium', 'accent' => 'restrained' ],
		'Dusk'       => [ 'align' => 'centered',  'density' => 'airy',     'contrast' => 'high',   'accent' => 'pronounced' ],
		'Solstice'   => [ 'align' => 'centered',  'density' => 'balanced', 'contrast' => 'high',   'accent' => 'pronounced' ],
		'Mirage'     => [ 'align' => 'mixed',     'density' => 'airy',     'contrast' => 'high',   'accent' => 'pronounced' ],
		'Ledger'     => [ 'align' => 'left',     'density' => 'dense',    'contrast' => 'medium', 'accent' => 'restrained' ],
		'Mosaic'     => [ 'align' => 'mixed',     'density' => 'balanced', 'contrast' => 'high',   'accent' => 'pronounced' ],
		'Prism'      => [ 'align' => 'mixed',     'density' => 'airy',     'contrast' => 'high',   'accent' => 'pronounced' ],
	];
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
	return [
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
	];
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
	array $context = []
): string {
	// Unpack precomputed theme values; fall back to live computation for
	// backward compatibility when called without a context.
	$theme    = $context['theme']    ?? [];
	$style    = $context['style']    ?? [];
	$rhythm   = $context['rhythm']   ?? [];
	$manifest = $context['manifest'] ?? [];

	$dark     = $theme['dark']     ?? aldus_pick_dark( $palette );
	$light    = $theme['light']    ?? aldus_pick_light( $palette );
	$accent   = $theme['accent']   ?? aldus_pick_accent( $palette );
	$large    = $theme['large']    ?? aldus_pick_large_font( $font_sizes );
	$gradient = $theme['gradient'] ?? aldus_pick_gradient( aldus_get_theme_gradients() );

	// Personality style shortcuts.
	$s_align    = $style['align']    ?? 'left';
	$s_density  = $style['density']  ?? 'balanced';
	$s_contrast = $style['contrast'] ?? 'medium';
	$s_accent   = $style['accent']   ?? 'restrained';

	// Rhythm: true when the previous section was visually heavy.
	$prev_heavy = $rhythm['prev_heavy'] ?? false;

	// Content availability from the request manifest.
	$has_quote = ( $manifest['quote'] ?? 0 ) > 0;
	$has_image = ( $manifest['image'] ?? 0 ) > 0;
	$has_list  = ( $manifest['list']  ?? 0 ) > 0;
	$has_cta   = ( $manifest['cta']   ?? 0 ) > 0;

	// Enriched variant seed.
	// Mixes layout_seed + index + personality style traits + rhythm context
	// so the same sequence looks different across personalities.
	$v_base  = $layout_seed + $index;
	$v_base += ( 'high'     === $s_contrast ) ? 2 : 0;
	$v_base += ( 'centered' === $s_align )    ? 1 : 0;
	$v_base += ( 'airy'     === $s_density )  ? 1 : 0;
	$v_base += $prev_heavy                    ? 3 : 0;

	// Keyed pickers from 2 to 5 variants.
	$variant5 = aldus_variant_pick( $v_base, $token, 5 );
	$variant4 = aldus_variant_pick( $v_base, $token, 4 );
	$variant3 = aldus_variant_pick( $v_base, $token, 3 );
	$variant2 = aldus_variant_pick( $v_base, $token, 2 );

	switch ( $token ) {

		// ---- Cover blocks ----

		case 'cover:dark':
			// Content-aware: skip product-hero variant (3) if no CTA in manifest.
			$cv = ( ! $has_cta && $variant5 === 3 ) ? 0 : $variant5;
			return aldus_block_cover( $dist, $dark, 60, $large, false, 'Hero', $cv );

		case 'cover:light':
			$cv = ( ! $has_cta && $variant5 === 3 ) ? 1 : $variant5;
			return aldus_block_cover( $dist, $light, 30, $large, true, 'Feature Cover', $cv );

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
			return aldus_block_columns_asymmetric( $dist, false, 'Sidebar Layout', $variant3 );

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
			return aldus_block_group( $dist, $dark, 'white', true, 'Dark Section', $variant3 );

		case 'group:accent-full':
			return aldus_block_group( $dist, $accent, '', false, 'Accent Section', $variant3 );

		case 'group:light-full':
			return aldus_block_group( $dist, $light, '', false, 'Light Section', $variant3 );

		case 'group:border-box':
			// Personality density: dense personalities prefer the CTA/list variant (1).
			$bv = ( 'dense' === $s_density ) ? max( $variant2, 1 ) : $variant2;
			return aldus_block_group_border( $dist, 'Border Section', $bv );

		case 'group:gradient-full':
			// Pronounced-accent personalities prefer the testimonial variant (1).
			$gv = ( 'pronounced' === $s_accent && $has_quote ) ? 1 : $variant2;
			return aldus_block_group_gradient( $dist, $gradient, 'Gradient Section', $gv );

		// ---- Pull quotes ----

		case 'pullquote:wide':
			return aldus_block_pullquote( $dist, $accent, 'solid-color' );

		case 'pullquote:full-solid':
			return aldus_block_pullquote( $dist, $dark, 'solid-color', true );

		case 'pullquote:centered':
			return aldus_block_pullquote_centered( $dist );

		// ---- Headings ----

		case 'heading:h1':
			return aldus_block_heading( $dist, 1, 'headline' );

		case 'heading:h2':
			return aldus_block_heading( $dist, 2, 'subheading' );

		case 'heading:h3':
			return aldus_block_heading( $dist, 3, 'subheading' );

		case 'heading:display':
			return aldus_block_heading_display( $dist, $large );

		case 'heading:kicker':
			return aldus_block_heading_kicker( $dist, $large );

		// ---- Paragraphs ----

		case 'paragraph':
			return aldus_block_paragraph( $dist, false );

		case 'paragraph:dropcap':
			return aldus_block_paragraph( $dist, true );

		// ---- Images ----

		case 'image:wide':
			return aldus_block_image( $dist, 'wide' );

		case 'image:full':
			return aldus_block_image( $dist, 'full' );

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
			return aldus_block_separator( $accent );

		case 'spacer:small':
			return serialize_block( [
				'blockName'    => 'core/spacer',
				'attrs'        => [ 'height' => '32px' ],
				'innerBlocks'  => [],
				'innerContent' => [ '<div style="height:32px" aria-hidden="true" class="wp-block-spacer"></div>' ],
			] ) . "\n\n";

		case 'spacer:large':
			return serialize_block( [
				'blockName'    => 'core/spacer',
				'attrs'        => [ 'height' => '64px' ],
				'innerBlocks'  => [],
				'innerContent' => [ '<div style="height:64px" aria-hidden="true" class="wp-block-spacer"></div>' ],
			] ) . "\n\n";

		case 'spacer:xlarge':
			return serialize_block( [
				'blockName'    => 'core/spacer',
				'attrs'        => [ 'height' => '96px' ],
				'innerBlocks'  => [],
				'innerContent' => [ '<div style="height:96px" aria-hidden="true" class="wp-block-spacer"></div>' ],
			] ) . "\n\n";

		case 'buttons:cta':
			return aldus_block_cta( $dist, $accent, $dark, $style );

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
 */
function aldus_block_cover(
	Aldus_Content_Distributor $dist,
	string $color_slug,
	int $dim_ratio,
	string $font_size,
	bool $is_light = false,
	string $name = '',
	int $variant = 0
): string {
	// Variant 2: pure backdrop — no inner content. Still needs at least an image to be meaningful.
	if ( $variant === 2 ) {
		if ( ! $dist->has( 'image' ) ) {
			return ''; // Nothing to show without image in backdrop mode.
		}
		$image     = $dist->consume( 'image' );
		$image_url = esc_url( $image['url'] );
		$color_safe = sanitize_html_class( $color_slug );
		$dim_class  = "has-background-dim-{$dim_ratio}";
		$attrs = [
			'overlayColor' => $color_slug,
			'dimRatio'     => $dim_ratio,
			'align'        => 'full',
			'minHeight'    => 480,
			'minHeightUnit'=> 'px',
			'url'          => esc_url_raw( $image['url'] ),
			'hasParallax'  => false,
		];
		if ( $name ) {
			$attrs['metadata'] = [ 'name' => $name . ' (Backdrop)' ];
		}
		return serialize_block( [
			'blockName'    => 'core/cover',
			'attrs'        => $attrs,
			'innerBlocks'  => [],
			'innerContent' => [
				"<div class=\"wp-block-cover alignfull\" style=\"min-height:480px\">\n"
				. "<span aria-hidden=\"true\" class=\"wp-block-cover__background has-{$color_safe}-background-color {$dim_class} has-background-dim\"></span>\n"
				. "<img class=\"wp-block-cover__image-background\" src=\"{$image_url}\" alt=\"\" data-object-fit=\"cover\"/>\n"
				. "<div class=\"wp-block-cover__inner-container is-layout-constrained wp-block-cover-is-layout-constrained\"></div>\n</div>",
			],
		] ) . "\n\n";
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
	$attrs = [
		'overlayColor'    => $color_slug,
		'dimRatio'        => $dim_ratio,
		'align'           => 'full',
		'contentPosition' => $content_position,
		'minHeight'       => 420,
		'minHeightUnit'   => 'px',
		'layout'          => [ 'type' => 'constrained' ],
	];
	if ( $name ) {
		$attrs['metadata'] = [ 'name' => $name ];
	}
	if ( $image_url ) {
		$attrs['url']         = esc_url_raw( $image['url'] );
		$attrs['hasParallax'] = false;
	}

	// Variant 3: product-hero — heading + subheading + CTA button over cover.
	if ( $variant === 3 ) {
		$attrs['contentPosition'] = 'center center';
		$attrs['minHeight']       = 520;
		$dim_class  = "has-background-dim-{$dim_ratio}";
		$image_html = $image_url
			? "<img class=\"wp-block-cover__image-background\" src=\"{$image_url}\" alt=\"\" data-object-fit=\"cover\"/>\n"
			: '';
		$inner = '';
		if ( $text ) {
			$inner .= serialize_block( [
				'blockName'    => 'core/heading',
				'attrs'        => [ 'level' => 1, 'textColor' => $text_color, 'fontSize' => $font_size, 'textAlign' => 'center' ],
				'innerBlocks'  => [],
				'innerContent' => [ "<h1 class=\"wp-block-heading has-text-align-center has-{$text_color_safe}-color has-text-color has-{$font_size}-font-size\">{$text}</h1>" ],
			] ) . "\n";
		}
		if ( $sub_text ) {
			$inner .= serialize_block( [
				'blockName'    => 'core/heading',
				'attrs'        => [ 'level' => 2, 'textColor' => $text_color, 'textAlign' => 'center' ],
				'innerBlocks'  => [],
				'innerContent' => [ "<h2 class=\"wp-block-heading has-text-align-center has-{$text_color_safe}-color has-text-color\">{$sub_text}</h2>" ],
			] ) . "\n";
		}
		// Consume a CTA for the button inside the hero.
		$cta_item = $dist->consume( 'cta' );
		if ( $cta_item ) {
			$cta_label = esc_html( $cta_item['content'] );
			$cta_url   = ! empty( $cta_item['url'] ) ? esc_url( $cta_item['url'] ) : '#';
			$btn       = serialize_block( [
				'blockName'    => 'core/button',
				'attrs'        => [ 'textColor' => $is_light ? '' : $color_slug, 'backgroundColor' => $is_light ? $color_slug : '', 'textAlign' => 'center' ],
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-button\"><a class=\"wp-block-button__link wp-element-button\" href=\"{$cta_url}\">{$cta_label}</a></div>" ],
			] );
			$inner .= serialize_block( [
				'blockName'    => 'core/buttons',
				'attrs'        => [ 'layout' => [ 'type' => 'flex', 'justifyContent' => 'center' ] ],
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-buttons is-layout-flex wp-block-buttons-is-layout-flex\">{$btn}</div>" ],
			] ) . "\n";
		}
		if ( ! $inner ) {
			return '';
		}
		return serialize_block( [
			'blockName'    => 'core/cover',
			'attrs'        => $attrs,
			'innerBlocks'  => [],
			'innerContent' => [
				"<div class=\"wp-block-cover alignfull has-custom-content-position is-position-center-center\" style=\"min-height:520px\">\n"
				. "<span aria-hidden=\"true\" class=\"wp-block-cover__background has-{$color_safe}-background-color {$dim_class} has-background-dim\"></span>\n"
				. $image_html
				. "<div class=\"wp-block-cover__inner-container is-layout-constrained wp-block-cover-is-layout-constrained\">\n{$inner}</div>\n</div>",
			],
		] ) . "\n\n";
	}

	// Variant 4: manifesto — full-width, centered, large heading only. No image required.
	if ( $variant === 4 ) {
		$attrs['contentPosition'] = 'center center';
		$attrs['minHeight']       = 360;
		unset( $attrs['url'], $attrs['hasParallax'] );
		$dim_class = "has-background-dim-20";
		$inner = '';
		if ( $text ) {
			$inner .= serialize_block( [
				'blockName'    => 'core/heading',
				'attrs'        => [ 'level' => 1, 'textColor' => $text_color, 'fontSize' => $font_size, 'textAlign' => 'center' ],
				'innerBlocks'  => [],
				'innerContent' => [ "<h1 class=\"wp-block-heading has-text-align-center has-{$text_color_safe}-color has-text-color has-{$font_size}-font-size\">{$text}</h1>" ],
			] ) . "\n";
		}
		if ( ! $inner ) {
			return '';
		}
		return serialize_block( [
			'blockName'    => 'core/cover',
			'attrs'        => $attrs,
			'innerBlocks'  => [],
			'innerContent' => [
				"<div class=\"wp-block-cover alignfull has-custom-content-position is-position-center-center\" style=\"min-height:360px\">\n"
				. "<span aria-hidden=\"true\" class=\"wp-block-cover__background has-{$color_safe}-background-color {$dim_class} has-background-dim\"></span>\n"
				. "<div class=\"wp-block-cover__inner-container is-layout-constrained wp-block-cover-is-layout-constrained\">\n{$inner}</div>\n</div>",
			],
		] ) . "\n\n";
	}

	$position_slug  = str_replace( ' ', '-', $content_position );
	$position_class = "has-custom-content-position is-position-{$position_slug}";
	$dim_class      = "has-background-dim-{$dim_ratio}";

	$image_html = $image_url
		? "<img class=\"wp-block-cover__image-background\" src=\"{$image_url}\" alt=\"\" data-object-fit=\"cover\"/>\n"
		: '';

	$inner = '';
	if ( $text ) {
		$inner .= serialize_block( [
			'blockName'    => 'core/heading',
			'attrs'        => [ 'level' => 1, 'textColor' => $text_color, 'fontSize' => $font_size ],
			'innerBlocks'  => [],
			'innerContent' => [ "<h1 class=\"wp-block-heading has-{$text_color_safe}-color has-text-color has-{$font_size}-font-size\">{$text}</h1>" ],
		] ) . "\n";
	}
	if ( $sub_text ) {
		$inner .= serialize_block( [
			'blockName'    => 'core/heading',
			'attrs'        => [ 'level' => 2, 'textColor' => $text_color ],
			'innerBlocks'  => [],
			'innerContent' => [ "<h2 class=\"wp-block-heading has-{$text_color_safe}-color has-text-color\">{$sub_text}</h2>" ],
		] ) . "\n";
	}

	$inner_container = "<div class=\"wp-block-cover__inner-container is-layout-constrained wp-block-cover-is-layout-constrained\">\n{$inner}</div>\n";

	return serialize_block( [
		'blockName'    => 'core/cover',
		'attrs'        => $attrs,
		'innerBlocks'  => [],
		'innerContent' => [
			"<div class=\"wp-block-cover alignfull {$position_class}\" style=\"min-height:420px\">\n"
			. "<span aria-hidden=\"true\" class=\"wp-block-cover__background has-{$color_safe}-background-color {$dim_class} has-background-dim\"></span>\n"
			. $image_html
			. $inner_container
			. "</div>",
		],
	] ) . "\n\n";
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
	$narrow_width  = 28;
	$wide_width    = 72;
	$cols_attrs    = [ 'isStackedOnMobile' => false ];
	$narrow_attrs  = [ 'width' => "{$narrow_width}%" ];
	$wide_attrs    = [ 'width' => "{$wide_width}%" ];
	if ( $name ) {
		$cols_attrs['metadata'] = [ 'name' => $name ];
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
		$right_content = $para ? serialize_block( [
			'blockName'    => 'core/paragraph',
			'attrs'        => [],
			'innerBlocks'  => [],
			'innerContent' => [ '<p>' . esc_html( $para['content'] ) . '</p>' ],
		] ) . "\n" : '';

	} elseif ( $variant === 2 && $dist->has( 'image' ) ) {
		$heading = $dist->consume( 'subheading' ) ?? $dist->consume( 'headline' );
		$para    = $dist->consume( 'paragraph' );
		$image   = $dist->consume( 'image' );
		if ( ! $heading && ! $para && ! $image ) {
			return '';
		}
		$left_content = '';
		if ( $heading ) {
			$left_content .= serialize_block( [
				'blockName'    => 'core/heading',
				'attrs'        => [ 'level' => 2 ],
				'innerBlocks'  => [],
				'innerContent' => [ '<h2 class="wp-block-heading">' . esc_html( $heading['content'] ) . '</h2>' ],
			] ) . "\n";
		}
		if ( $para ) {
			$left_content .= serialize_block( [
				'blockName'    => 'core/paragraph',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ '<p>' . esc_html( $para['content'] ) . '</p>' ],
			] ) . "\n";
		}
		$right_content = '';
		if ( $image && ! empty( $image['url'] ) ) {
			$url           = esc_url( $image['url'] );
			$right_content = serialize_block( [
				'blockName'    => 'core/image',
				'attrs'        => [ 'sizeSlug' => 'large' ],
				'innerBlocks'  => [],
				'innerContent' => [ "<figure class=\"wp-block-image size-large\"><img src=\"{$url}\" alt=\"\"/></figure>" ],
			] ) . "\n";
		}

	} else {
		$heading = $dist->consume( 'subheading' ) ?? $dist->consume( 'headline' );
		$para    = $dist->consume( 'paragraph' );
		if ( ! $heading && ! $para ) {
			return '';
		}
		$left_content = $heading ? serialize_block( [
			'blockName'    => 'core/heading',
			'attrs'        => [ 'level' => 2 ],
			'innerBlocks'  => [],
			'innerContent' => [ '<h2 class="wp-block-heading">' . esc_html( $heading['content'] ) . '</h2>' ],
		] ) . "\n" : '';
		$right_content = $para ? serialize_block( [
			'blockName'    => 'core/paragraph',
			'attrs'        => [ 'dropCap' => true ],
			'innerBlocks'  => [],
			'innerContent' => [ '<p class="has-drop-cap">' . esc_html( $para['content'] ) . '</p>' ],
		] ) . "\n" : '';
	}

	// Swap columns if flipped.
	if ( $flip ) {
		[ $narrow_attrs, $wide_attrs, $left_content, $right_content ] = [ $wide_attrs, $narrow_attrs, $right_content, $left_content ];
	}

	$narrow_col = serialize_block( [
		'blockName'    => 'core/column',
		'attrs'        => $narrow_attrs,
		'innerBlocks'  => [],
		'innerContent' => [ "<div class=\"wp-block-column is-layout-flow wp-block-column-is-layout-flow\" style=\"flex-basis:{$narrow_width}%\">\n{$left_content}</div>" ],
	] );
	$wide_col = serialize_block( [
		'blockName'    => 'core/column',
		'attrs'        => $wide_attrs,
		'innerBlocks'  => [],
		'innerContent' => [ "<div class=\"wp-block-column is-layout-flow wp-block-column-is-layout-flow\" style=\"flex-basis:{$wide_width}%\">\n{$right_content}</div>" ],
	] );

	return serialize_block( [
		'blockName'    => 'core/columns',
		'attrs'        => $cols_attrs,
		'innerBlocks'  => [],
		'innerContent' => [ "<div class=\"wp-block-columns is-layout-flex wp-block-columns-is-layout-flex is-not-stacked-on-mobile\">\n{$narrow_col}\n{$wide_col}\n</div>" ],
	] ) . "\n\n";
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
	$col_items = [];
	for ( $i = 0; $i < 3; $i++ ) {
		$col_items[] = $dist->consume( 'paragraph' ) ?? $dist->consume( 'subheading' );
	}

	if ( ! array_filter( $col_items ) ) {
		return '';
	}

	// Grab subheading labels for visual hierarchy within each column.
	$subheadings = [];
	for ( $i = 0; $i < 3; $i++ ) {
		$subheadings[] = $dist->consume( 'subheading' );
	}

	// Alternate backgrounds: accent · light · accent so the three columns read as
	// distinct cards rather than a single solid block. Fall back to the accent slug
	// for the middle column when no light palette entry is available.
	$mid_slug = $light_slug ?: $bg_slug;
	$bg_slugs = [ $bg_slug, $mid_slug, $bg_slug ];

	$cols_attrs = [ 'isStackedOnMobile' => false ];
	if ( $name ) {
		$cols_attrs['metadata'] = [ 'name' => $name ];
	}

	$cols_inner = '';
	foreach ( $col_items as $i => $item ) {
		$text     = esc_html( $item['content'] ?? '' );
		$heading  = $subheadings[ $i ] ?? null;
		$col_slug = $bg_slugs[ $i ];
		$col_safe = sanitize_html_class( $col_slug );

		$col_attrs = [
			'backgroundColor' => $col_slug,
			'style'           => [ 'spacing' => [ 'padding' => [ 'top' => '1.5rem', 'right' => '1.5rem', 'bottom' => '1.5rem', 'left' => '1.5rem' ] ] ],
		];

		$col_inner = '';
		if ( $heading ) {
			$ht         = esc_html( $heading['content'] );
			$col_inner .= serialize_block( [
				'blockName'    => 'core/heading',
				'attrs'        => [ 'level' => 3 ],
				'innerBlocks'  => [],
				'innerContent' => [ "<h3 class=\"wp-block-heading\">{$ht}</h3>" ],
			] ) . "\n";
		}
		if ( $text ) {
			$col_inner .= serialize_block( [
				'blockName'    => 'core/paragraph',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ "<p>{$text}</p>" ],
			] ) . "\n";
		}

		$cols_inner .= serialize_block( [
			'blockName'    => 'core/column',
			'attrs'        => $col_attrs,
			'innerBlocks'  => [],
			'innerContent' => [
				"<div class=\"wp-block-column is-layout-flow wp-block-column-is-layout-flow has-{$col_safe}-background-color has-background\" style=\"padding-top:1.5rem;padding-right:1.5rem;padding-bottom:1.5rem;padding-left:1.5rem\">\n{$col_inner}</div>",
			],
		] ) . "\n";
	}

	return serialize_block( [
		'blockName'    => 'core/columns',
		'attrs'        => $cols_attrs,
		'innerBlocks'  => [],
		'innerContent' => [ "<div class=\"wp-block-columns is-layout-flex wp-block-columns-is-layout-flex is-not-stacked-on-mobile\">\n{$cols_inner}</div>" ],
	] ) . "\n\n";
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
			$markup .= serialize_block( [
				'blockName'    => 'core/heading',
				'attrs'        => [ 'level' => 2 ],
				'innerBlocks'  => [],
				'innerContent' => [ '<h2 class="wp-block-heading">' . esc_html( $subheading['content'] ) . '</h2>' ],
			] ) . "\n";
		}
		if ( $para ) {
			$markup .= serialize_block( [
				'blockName'    => 'core/paragraph',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ '<p>' . esc_html( $para['content'] ) . '</p>' ],
			] ) . "\n\n";
		}
		return $markup;
	}

	$image_url = esc_url( $image['url'] );
	$attrs     = [
		'mediaPosition'     => $image_position,
		'mediaWidth'        => 38,
		'isStackedOnMobile' => true,
		'mediaUrl'          => esc_url_raw( $image['url'] ),
		'mediaType'         => 'image',
	];
	if ( $name ) {
		$attrs['metadata'] = [ 'name' => $name ];
	}

	$flip_class = 'right' === $image_position ? ' has-media-on-the-right' : '';

	$content_inner = '';
	if ( $variant === 1 && $dist->has( 'quote' ) ) {
		// Variant 1: quote over image.
		$quote_item = $dist->consume( 'quote' );
		if ( $quote_item ) {
			$content_inner .= serialize_block( [
				'blockName'    => 'core/quote',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ '<blockquote class="wp-block-quote"><p>' . esc_html( $quote_item['content'] ) . '</p></blockquote>' ],
			] ) . "\n";
		} else {
			if ( $subheading ) {
				$content_inner .= serialize_block( [
					'blockName'    => 'core/heading',
					'attrs'        => [ 'level' => 2 ],
					'innerBlocks'  => [],
					'innerContent' => [ '<h2 class="wp-block-heading">' . esc_html( $subheading['content'] ) . '</h2>' ],
				] ) . "\n";
			}
			if ( $para ) {
				$content_inner .= serialize_block( [
					'blockName'    => 'core/paragraph',
					'attrs'        => [],
					'innerBlocks'  => [],
					'innerContent' => [ '<p>' . esc_html( $para['content'] ) . '</p>' ],
				] ) . "\n";
			}
		}
	} elseif ( $variant === 2 ) {
		// Variant 2: heading + CTA button — bold statement alongside an image.
		if ( $subheading ) {
			$content_inner .= serialize_block( [
				'blockName'    => 'core/heading',
				'attrs'        => [ 'level' => 2 ],
				'innerBlocks'  => [],
				'innerContent' => [ '<h2 class="wp-block-heading">' . esc_html( $subheading['content'] ) . '</h2>' ],
			] ) . "\n";
		}
		$cta_item = $dist->consume( 'cta' );
		if ( $cta_item ) {
			$cta_label = esc_html( $cta_item['content'] );
			$cta_url   = ! empty( $cta_item['url'] ) ? esc_url( $cta_item['url'] ) : '#';
			$btn       = serialize_block( [
				'blockName'    => 'core/button',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-button\"><a class=\"wp-block-button__link wp-element-button\" href=\"{$cta_url}\">{$cta_label}</a></div>" ],
			] );
			$content_inner .= serialize_block( [
				'blockName'    => 'core/buttons',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-buttons is-layout-flex wp-block-buttons-is-layout-flex\">{$btn}</div>" ],
			] ) . "\n";
		} elseif ( $para ) {
			// Fall back to para if no CTA.
			$content_inner .= serialize_block( [
				'blockName'    => 'core/paragraph',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ '<p>' . esc_html( $para['content'] ) . '</p>' ],
			] ) . "\n";
		}
	} elseif ( $variant === 3 && $dist->has( 'list' ) ) {
		// Variant 3: heading + bullet list alongside an image.
		if ( $subheading ) {
			$content_inner .= serialize_block( [
				'blockName'    => 'core/heading',
				'attrs'        => [ 'level' => 2 ],
				'innerBlocks'  => [],
				'innerContent' => [ '<h2 class="wp-block-heading">' . esc_html( $subheading['content'] ) . '</h2>' ],
			] ) . "\n";
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
			$content_inner .= serialize_block( [
				'blockName'    => 'core/heading',
				'attrs'        => [ 'level' => 2 ],
				'innerBlocks'  => [],
				'innerContent' => [ '<h2 class="wp-block-heading">' . esc_html( $subheading['content'] ) . '</h2>' ],
			] ) . "\n";
		}
		if ( $para ) {
			$content_inner .= serialize_block( [
				'blockName'    => 'core/paragraph',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ '<p>' . esc_html( $para['content'] ) . '</p>' ],
			] ) . "\n";
		}
	}

	return serialize_block( [
		'blockName'    => 'core/media-text',
		'attrs'        => $attrs,
		'innerBlocks'  => [],
		'innerContent' => [
		"<div class=\"wp-block-media-text{$flip_class} is-stacked-on-mobile\" style=\"grid-template-columns:38% 1fr\">\n"
		. "<figure class=\"wp-block-media-text__media\"><img src=\"{$image_url}\" alt=\"\" class=\"wp-image-0 size-full\"/></figure>\n"
		. "<div class=\"wp-block-media-text__content\">\n{$content_inner}</div>\n</div>",
		],
	] ) . "\n\n";
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
 */
function aldus_block_group(
	Aldus_Content_Distributor $dist,
	string $bg_slug,
	string $text_color_slug,
	bool $full_width,
	string $name = '',
	int $variant = 0
): string {
	$bg_safe  = sanitize_html_class( $bg_slug );
	$tc_safe  = $text_color_slug ? sanitize_html_class( $text_color_slug ) : '';
	$align    = $full_width ? 'full' : '';

	$attrs = [
		'backgroundColor' => $bg_slug,
		'layout'          => [ 'type' => 'constrained', 'contentSize' => '48rem' ],
		'style'           => [ 'spacing' => [ 'padding' => [ 'top' => '4rem', 'bottom' => '4rem' ] ] ],
	];
	if ( $name ) {
		$attrs['metadata'] = [ 'name' => $name ];
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

	if ( $variant === 1 ) {
		$para1 = $dist->consume( 'paragraph' );
		$para2 = $dist->has( 'paragraph' ) ? $dist->consume( 'paragraph' ) : null;
		$cta   = $dist->consume( 'cta' );
		if ( ! $para1 && ! $para2 && ! $cta ) {
			return '';
		}
		if ( $para1 ) {
			$inner .= serialize_block( [
				'blockName'    => 'core/paragraph',
				'attrs'        => [ 'dropCap' => true ],
				'innerBlocks'  => [],
				'innerContent' => [ '<p class="has-drop-cap">' . esc_html( $para1['content'] ) . '</p>' ],
			] ) . "\n";
		}
		if ( $para2 ) {
			$inner .= serialize_block( [
				'blockName'    => 'core/paragraph',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ '<p>' . esc_html( $para2['content'] ) . '</p>' ],
			] ) . "\n";
		}
		if ( $cta ) {
			$label = esc_html( $cta['content'] );
			$url   = ! empty( $cta['url'] ) ? esc_url( $cta['url'] ) : '#';
			$btn   = serialize_block( [
				'blockName'    => 'core/button',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-button\"><a class=\"wp-block-button__link wp-element-button\" href=\"{$url}\">{$label}</a></div>" ],
			] );
			$inner .= serialize_block( [
				'blockName'    => 'core/buttons',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-buttons is-layout-flex wp-block-buttons-is-layout-flex\">{$btn}</div>" ],
			] ) . "\n";
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
			$inner .= serialize_block( [
				'blockName'    => 'core/heading',
				'attrs'        => [ 'level' => 2 ],
				'innerBlocks'  => [],
				'innerContent' => [ '<h2 class="wp-block-heading">' . esc_html( $subheading['content'] ) . '</h2>' ],
			] ) . "\n";
		}
		if ( $para1 || $para2 ) {
			$col_left_inner  = $para1 ? serialize_block( [
				'blockName'    => 'core/paragraph',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ '<p>' . esc_html( $para1['content'] ) . '</p>' ],
			] ) : '';
			$col_right_inner = $para2 ? serialize_block( [
				'blockName'    => 'core/paragraph',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ '<p>' . esc_html( $para2['content'] ) . '</p>' ],
			] ) : '';
			$col_l = serialize_block( [
				'blockName'    => 'core/column',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-column is-layout-flow wp-block-column-is-layout-flow\">\n{$col_left_inner}\n</div>" ],
			] );
			$col_r = serialize_block( [
				'blockName'    => 'core/column',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-column is-layout-flow wp-block-column-is-layout-flow\">\n{$col_right_inner}\n</div>" ],
			] );
			$inner .= serialize_block( [
				'blockName'    => 'core/columns',
				'attrs'        => [ 'isStackedOnMobile' => true ],
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-columns is-layout-flex wp-block-columns-is-layout-flex\">\n{$col_l}\n{$col_r}\n</div>" ],
			] ) . "\n";
		}
		if ( $cta ) {
			$label = esc_html( $cta['content'] );
			$url   = ! empty( $cta['url'] ) ? esc_url( $cta['url'] ) : '#';
			$btn   = serialize_block( [
				'blockName'    => 'core/button',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-button\"><a class=\"wp-block-button__link wp-element-button\" href=\"{$url}\">{$label}</a></div>" ],
			] );
			$inner .= serialize_block( [
				'blockName'    => 'core/buttons',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-buttons is-layout-flex wp-block-buttons-is-layout-flex\">{$btn}</div>" ],
			] ) . "\n";
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
			$inner .= serialize_block( [
				'blockName'    => 'core/heading',
				'attrs'        => [ 'level' => 2 ],
				'innerBlocks'  => [],
				'innerContent' => [ '<h2 class="wp-block-heading">' . esc_html( $subheading['content'] ) . '</h2>' ],
			] ) . "\n";
		}
		if ( $para ) {
			$inner .= serialize_block( [
				'blockName'    => 'core/paragraph',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ '<p>' . esc_html( $para['content'] ) . '</p>' ],
			] ) . "\n";
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
			$label = esc_html( $cta['content'] );
			$url   = ! empty( $cta['url'] ) ? esc_url( $cta['url'] ) : '#';
			$btn   = serialize_block( [
				'blockName'    => 'core/button',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-button\"><a class=\"wp-block-button__link wp-element-button\" href=\"{$url}\">{$label}</a></div>" ],
			] );
			$inner .= serialize_block( [
				'blockName'    => 'core/buttons',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-buttons is-layout-flex wp-block-buttons-is-layout-flex\">{$btn}</div>" ],
			] ) . "\n";
		}
	}

	if ( ! $inner ) {
		return '';
	}

	return serialize_block( [
		'blockName'    => 'core/group',
		'attrs'        => $attrs,
		'innerBlocks'  => [],
		'innerContent' => [ "<div class=\"wp-block-group is-layout-constrained wp-block-group-is-layout-constrained{$align_class}{$bg_class}{$tc_class}\" style=\"padding-top:4rem;padding-bottom:4rem\">\n{$inner}</div>" ],
	] ) . "\n\n";
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
	bool $full_width = false
): string {
	$quote = $dist->consume( 'quote' );
	if ( ! $quote ) {
		return '';
	}

	$text       = esc_html( $quote['content'] );
	$color_safe = sanitize_html_class( $color_slug );
	$align      = $full_width ? 'full' : 'wide';

	$attrs = [ 'align' => $align, 'borderColor' => $color_slug ];
	if ( $style ) {
		$attrs['className'] = "is-style-{$style}";
	}

	$style_class  = $style ? " is-style-{$style}" : '';
	$border_class = " has-{$color_safe}-border-color";

	return serialize_block( [
		'blockName'    => 'core/pullquote',
		'attrs'        => $attrs,
		'innerBlocks'  => [],
		'innerContent' => [
			"<figure class=\"wp-block-pullquote align{$align}{$style_class}{$border_class}\"><blockquote><p>{$text}</p></blockquote></figure>",
		],
	] ) . "\n\n";
}

/**
 * Renders a core/heading block.
 * For h1 it consumes 'headline'; for h2/h3 it tries 'subheading' first.
 *
 * @param Aldus_Content_Distributor $dist
 * @param int    $level   Heading level 1–3.
 * @param string $type    Content type to consume ('headline' or 'subheading').
 */
function aldus_block_heading( Aldus_Content_Distributor $dist, int $level, string $type ): string {
	$item = $dist->consume( $type );
	if ( ! $item ) {
		$fallback = 'headline' === $type ? 'subheading' : 'headline';
		$item     = $dist->consume( $fallback );
	}
	if ( ! $item ) {
		return '';
	}

	$text = esc_html( $item['content'] );

	return serialize_block( [
		'blockName'    => 'core/heading',
		'attrs'        => [ 'level' => $level ],
		'innerBlocks'  => [],
		'innerContent' => [ "<h{$level} class=\"wp-block-heading\">{$text}</h{$level}>" ],
	] ) . "\n\n";
}

/**
 * Renders a core/paragraph block.
 *
 * @param Aldus_Content_Distributor $dist
 * @param bool                      $drop_cap  Enable drop cap.
 */
function aldus_block_paragraph( Aldus_Content_Distributor $dist, bool $drop_cap = false ): string {
	$item = $dist->consume( 'paragraph' );
	if ( ! $item ) {
		return '';
	}

	$text  = esc_html( $item['content'] );
	$attrs = $drop_cap ? [ 'dropCap' => true ] : [];
	$class = $drop_cap ? ' class="has-drop-cap"' : '';

	return serialize_block( [
		'blockName'    => 'core/paragraph',
		'attrs'        => $attrs,
		'innerBlocks'  => [],
		'innerContent' => [ "<p{$class}>{$text}</p>" ],
	] ) . "\n\n";
}

/**
 * Renders a core/image block.
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $align  'wide' or 'full'.
 */
function aldus_block_image( Aldus_Content_Distributor $dist, string $align ): string {
	$item = $dist->consume( 'image' );
	if ( ! $item || empty( $item['url'] ) ) {
		return '';
	}

	$url        = esc_url( $item['url'] );
	$media_id   = ! empty( $item['mediaId'] ) ? (int) $item['mediaId'] : 0;
	$attrs      = [ 'align' => $align, 'sizeSlug' => 'large' ];
	if ( $media_id ) {
		$attrs['id'] = $media_id;
	}

	return serialize_block( [
		'blockName'    => 'core/image',
		'attrs'        => $attrs,
		'innerBlocks'  => [],
		'innerContent' => [ "<figure class=\"wp-block-image align{$align} size-large\"><img src=\"{$url}\" alt=\"\"/></figure>" ],
	] ) . "\n\n";
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

	$inner_blocks  = [];
	$inner_content = [ '<ul class="wp-block-list">' ];

	foreach ( $raw_items as $li ) {
		$inner_blocks[] = [
			'blockName'    => 'core/list-item',
			'attrs'        => [],
			'innerBlocks'  => [],
			'innerContent' => [ '<li>' . esc_html( $li ) . '</li>' ],
		];
		$inner_content[] = null; // placeholder consumed by serialize_block()
	}

	$inner_content[] = '</ul>';

	return serialize_block( [
		'blockName'    => 'core/list',
		'attrs'        => [],
		'innerBlocks'  => $inner_blocks,
		'innerContent' => $inner_content,
	] );
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
 * @param string $color_slug
 */
function aldus_block_separator( string $color_slug ): string {
	$color_safe = sanitize_html_class( $color_slug );

	return serialize_block( [
		'blockName'    => 'core/separator',
		'attrs'        => [ 'align' => 'wide', 'className' => 'is-style-wide' ],
		'innerBlocks'  => [],
		'innerContent' => [ "<hr class=\"wp-block-separator alignwide has-{$color_safe}-color has-text-color is-style-wide\"/>" ],
	] ) . "\n\n";
}

/**
 * Renders a core/buttons + core/button CTA.
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $color_slug  Button background color slug.
 */
function aldus_block_cta( Aldus_Content_Distributor $dist, string $color_slug, string $dark_slug = '', array $style_ctx = [] ): string {
	$item = $dist->consume( 'cta' );
	if ( ! $item ) {
		return '';
	}

	$label      = esc_html( $item['content'] );
	$url        = ! empty( $item['url'] ) ? esc_url( $item['url'] ) : esc_url( 'https://example.com' );
	$color_safe = sanitize_html_class( $color_slug );

	// Pick a button treatment based on personality style rules.
	// - restrained accent  → outlined (border only, no fill)
	// - pronounced + high contrast (dark-mood) → ghost/inverted (white bg, dark text)
	// - pronounced default → filled accent (original behaviour)
	$s_accent   = $style_ctx['accent']   ?? 'restrained';
	$s_contrast = $style_ctx['contrast'] ?? 'medium';

	$is_dark_mood  = ( 'pronounced' === $s_accent && 'high' === $s_contrast );
	$is_restrained = ( 'restrained' === $s_accent );

	if ( $is_restrained ) {
		// Outlined: transparent background, accent border and text.
		$btn_attrs   = [
			'textColor' => $color_slug,
			'className' => 'is-style-outline',
			'style'     => [ 'typography' => [ 'fontWeight' => '600' ] ],
		];
		$btn_content = "<div class=\"wp-block-button is-style-outline\"><a class=\"wp-block-button__link wp-element-button has-{$color_safe}-color has-text-color\" href=\"{$url}\">{$label}</a></div>";
	} elseif ( $is_dark_mood ) {
		// Ghost/inverted: white background, dark text — visible on dark sections.
		$dark_safe   = sanitize_html_class( $dark_slug ?: 'black' );
		$btn_attrs   = [
			'backgroundColor' => 'white',
			'textColor'       => $dark_slug ?: 'black',
			'style'           => [ 'typography' => [ 'fontWeight' => '600' ] ],
		];
		$btn_content = "<div class=\"wp-block-button\"><a class=\"wp-block-button__link wp-element-button has-white-background-color has-{$dark_safe}-color has-text-color has-background\" href=\"{$url}\">{$label}</a></div>";
	} else {
		// Default filled: accent background, white text.
		$btn_attrs   = [
			'backgroundColor' => $color_slug,
			'textColor'       => 'white',
			'style'           => [ 'typography' => [ 'fontWeight' => '600' ] ],
		];
		$btn_content = "<div class=\"wp-block-button\"><a class=\"wp-block-button__link wp-element-button has-{$color_safe}-background-color has-white-color has-text-color has-background\" href=\"{$url}\">{$label}</a></div>";
	}

	$btn_markup = serialize_block( [
		'blockName'    => 'core/button',
		'attrs'        => $btn_attrs,
		'innerBlocks'  => [],
		'innerContent' => [ $btn_content ],
	] );

	return serialize_block( [
		'blockName'    => 'core/buttons',
		'attrs'        => [ 'layout' => [ 'type' => 'flex', 'justifyContent' => 'center' ] ],
		'innerBlocks'  => [],
		'innerContent' => [ "<div class=\"wp-block-buttons is-layout-flex wp-block-buttons-is-layout-flex\">\n{$btn_markup}\n</div>" ],
	] ) . "\n\n";
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

	return serialize_block( [
		'blockName'    => 'core/quote',
		'attrs'        => [],
		'innerBlocks'  => [],
		'innerContent' => [ "<blockquote class=\"wp-block-quote\"><p>{$text}</p></blockquote>" ],
	] ) . "\n\n";
}

// ---------------------------------------------------------------------------
// New Phase 1 renderers
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

	$text       = esc_html( $headline['content'] );
	$color_safe = sanitize_html_class( $color_slug );

	$attrs = [
		'overlayColor'    => $color_slug,
		'dimRatio'        => 100,
		'align'           => 'full',
		'contentPosition' => 'center center',
		'minHeight'       => 380,
		'minHeightUnit'   => 'px',
		'layout'          => [ 'type' => 'constrained' ],
	];
	if ( $name ) {
		$attrs['metadata'] = [ 'name' => $name ];
	}

	$heading_html = serialize_block( [
		'blockName'    => 'core/heading',
		'attrs'        => [ 'level' => 1, 'textColor' => 'white', 'fontSize' => $font_size, 'textAlign' => 'center' ],
		'innerBlocks'  => [],
		'innerContent' => [ "<h1 class=\"wp-block-heading has-text-align-center has-white-color has-text-color has-{$font_size}-font-size\">{$text}</h1>" ],
	] );

	return serialize_block( [
		'blockName'    => 'core/cover',
		'attrs'        => $attrs,
		'innerBlocks'  => [],
		'innerContent' => [
			"<div class=\"wp-block-cover alignfull has-custom-content-position is-position-center-center\" style=\"min-height:380px\">\n"
			. "<span aria-hidden=\"true\" class=\"wp-block-cover__background has-{$color_safe}-background-color has-background-dim-100 has-background-dim\"></span>\n"
			. "<div class=\"wp-block-cover__inner-container is-layout-constrained wp-block-cover-is-layout-constrained\">\n{$heading_html}\n</div>\n</div>",
		],
	] ) . "\n\n";
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

	// When imageFill is true WordPress expects a CSS background-image on the figure
	// element, not an <img> tag. Use imageFill only when a real image URL is present
	// and render the figure accordingly to avoid block validation failures.
	$has_image_url = $image && ! empty( $image['url'] );
	$image_fill    = $has_image_url;

	$attrs = [
		'mediaPosition'     => 'left',
		'mediaWidth'        => 50,
		'isStackedOnMobile' => true,
		'align'             => 'full',
		'minHeight'         => 600,
		'minHeightUnit'     => 'px',
	];
	if ( $image_fill ) {
		$attrs['imageFill']  = true;
		$attrs['focalPoint'] = [ 'x' => 0.5, 'y' => 0.5 ];
		$attrs['mediaUrl']   = esc_url_raw( $image['url'] );
		$attrs['mediaType']  = 'image';
	}
	if ( $name ) {
		$attrs['metadata'] = [ 'name' => $name ];
	}

	// imageFill renders the image as a CSS background on the figure; no <img> child.
	$image_html = '';
	if ( $has_image_url ) {
		$image_url  = esc_url( $image['url'] );
		$image_html = $image_fill
			? "<figure class=\"wp-block-media-text__media\" style=\"background-image:url({$image_url})\"></figure>"
			: "<figure class=\"wp-block-media-text__media\"><img src=\"{$image_url}\" alt=\"\" class=\"wp-image-0 size-full\"/></figure>";
	} else {
		$image_html = '<figure class="wp-block-media-text__media"></figure>';
	}

	$content_inner = '';
	if ( $headline ) {
		$font_size_safe = sanitize_html_class( $font_size );
		$content_inner .= serialize_block( [
			'blockName'    => 'core/heading',
			'attrs'        => [ 'level' => 1, 'fontSize' => $font_size ],
			'innerBlocks'  => [],
			'innerContent' => [ "<h1 class=\"wp-block-heading has-{$font_size_safe}-font-size\">" . esc_html( $headline['content'] ) . '</h1>' ],
		] ) . "\n";
	}
	if ( $para ) {
		$content_inner .= serialize_block( [
			'blockName'    => 'core/paragraph',
			'attrs'        => [],
			'innerBlocks'  => [],
			'innerContent' => [ '<p>' . esc_html( $para['content'] ) . '</p>' ],
		] ) . "\n";
	}

	$fill_class = $image_fill ? ' is-image-fill' : '';

	return serialize_block( [
		'blockName'    => 'core/media-text',
		'attrs'        => $attrs,
		'innerBlocks'  => [],
		'innerContent' => [
			"<div class=\"wp-block-media-text alignfull{$fill_class}\" style=\"min-height:600px\">\n"
			. "{$image_html}\n"
			. "<div class=\"wp-block-media-text__content\">\n{$content_inner}</div>\n</div>",
		],
	] ) . "\n\n";
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
	$cols_attrs = [ 'isStackedOnMobile' => false ];
	$col_attrs  = [ 'width' => '50%' ];
	if ( $name ) {
		$cols_attrs['metadata'] = [ 'name' => $name ];
	}

	// ---- Variant 1: editorial — heading + paragraph in each column. ----
	if ( $variant === 1 ) {
		$pairs = [];
		for ( $i = 0; $i < 2; $i++ ) {
			$heading = $dist->consume( 'subheading' );
			$para    = $dist->consume( 'paragraph' );
			if ( $heading || $para ) {
				$pairs[] = [ 'heading' => $heading, 'para' => $para ];
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
					$col_inner .= serialize_block( [
						'blockName'    => 'core/heading',
						'attrs'        => [ 'level' => 3 ],
						'innerBlocks'  => [],
						'innerContent' => [ '<h3 class="wp-block-heading">' . esc_html( $pair['heading']['content'] ) . '</h3>' ],
					] ) . "\n";
				}
				if ( $pair['para'] ) {
					$col_inner .= serialize_block( [
						'blockName'    => 'core/paragraph',
						'attrs'        => [],
						'innerBlocks'  => [],
						'innerContent' => [ '<p>' . esc_html( $pair['para']['content'] ) . '</p>' ],
					] ) . "\n";
				}
				$cols_inner .= serialize_block( [
					'blockName'    => 'core/column',
					'attrs'        => $col_attrs,
					'innerBlocks'  => [],
					'innerContent' => [ "<div class=\"wp-block-column is-layout-flow wp-block-column-is-layout-flow\" style=\"flex-basis:50%\">\n{$col_inner}</div>" ],
				] ) . "\n";
			}
			return serialize_block( [
				'blockName'    => 'core/columns',
				'attrs'        => $cols_attrs,
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-columns is-layout-flex wp-block-columns-is-layout-flex is-not-stacked-on-mobile\">\n{$cols_inner}</div>" ],
			] ) . "\n\n";
		}
	}

	// ---- Variant 2: heading left + list right. ----
	if ( $variant === 2 ) {
		$heading = $dist->consume( 'subheading' ) ?? $dist->consume( 'headline' );
		$list    = $dist->consume( 'list' );
		if ( ! $heading && ! $list ) {
			$variant = 0;
		} else {
			$left_inner = $heading ? serialize_block( [
				'blockName'    => 'core/heading',
				'attrs'        => [ 'level' => 2 ],
				'innerBlocks'  => [],
				'innerContent' => [ '<h2 class="wp-block-heading">' . esc_html( $heading['content'] ) . '</h2>' ],
			] ) . "\n" : '';

			$right_inner = '';
			if ( $list ) {
				$raw_items   = preg_split( '/\r?\n/', trim( $list['content'] ) );
				$raw_items   = array_filter( array_map( 'trim', $raw_items ) );
				$list_markup = aldus_serialize_list( $raw_items );
				$right_inner = $list_markup ? $list_markup . "\n" : '';
			}

			$cols_inner  = serialize_block( [
				'blockName'    => 'core/column',
				'attrs'        => $col_attrs,
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-column is-layout-flow wp-block-column-is-layout-flow\" style=\"flex-basis:50%\">\n{$left_inner}</div>" ],
			] ) . "\n";
			$cols_inner .= serialize_block( [
				'blockName'    => 'core/column',
				'attrs'        => $col_attrs,
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-column is-layout-flow wp-block-column-is-layout-flow\" style=\"flex-basis:50%\">\n{$right_inner}</div>" ],
			] ) . "\n";
			return serialize_block( [
				'blockName'    => 'core/columns',
				'attrs'        => $cols_attrs,
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-columns is-layout-flex wp-block-columns-is-layout-flex is-not-stacked-on-mobile\">\n{$cols_inner}</div>" ],
			] ) . "\n\n";
		}
	}

	// ---- Variant 3: quote left + paragraph right. ----
	if ( $variant === 3 ) {
		$quote = $dist->consume( 'quote' );
		$para  = $dist->consume( 'paragraph' );
		if ( ! $quote && ! $para ) {
			$variant = 0;
		} else {
			$left_inner = $quote ? serialize_block( [
				'blockName'    => 'core/quote',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ '<blockquote class="wp-block-quote"><p>' . esc_html( $quote['content'] ) . '</p></blockquote>' ],
			] ) . "\n" : '';
			$right_inner = $para ? serialize_block( [
				'blockName'    => 'core/paragraph',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ '<p>' . esc_html( $para['content'] ) . '</p>' ],
			] ) . "\n" : '';

			$cols_inner  = serialize_block( [
				'blockName'    => 'core/column',
				'attrs'        => $col_attrs,
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-column is-layout-flow wp-block-column-is-layout-flow\" style=\"flex-basis:50%\">\n{$left_inner}</div>" ],
			] ) . "\n";
			$cols_inner .= serialize_block( [
				'blockName'    => 'core/column',
				'attrs'        => $col_attrs,
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-column is-layout-flow wp-block-column-is-layout-flow\" style=\"flex-basis:50%\">\n{$right_inner}</div>" ],
			] ) . "\n";
			return serialize_block( [
				'blockName'    => 'core/columns',
				'attrs'        => $cols_attrs,
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-columns is-layout-flex wp-block-columns-is-layout-flex is-not-stacked-on-mobile\">\n{$cols_inner}</div>" ],
			] ) . "\n\n";
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
			$left_inner  = serialize_block( [
				'blockName'    => 'core/image',
				'attrs'        => [ 'sizeSlug' => 'large', 'linkDestination' => 'none' ],
				'innerBlocks'  => [],
				'innerContent' => [ "<figure class=\"wp-block-image size-large\"><img src=\"{$image_url}\" alt=\"\" class=\"wp-image-0\"/></figure>" ],
			] ) . "\n";
			$right_inner = $para ? serialize_block( [
				'blockName'    => 'core/paragraph',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ '<p>' . esc_html( $para['content'] ) . '</p>' ],
			] ) . "\n" : '';

			$cols_inner  = serialize_block( [
				'blockName'    => 'core/column',
				'attrs'        => $col_attrs,
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-column is-layout-flow wp-block-column-is-layout-flow\" style=\"flex-basis:50%\">\n{$left_inner}</div>" ],
			] ) . "\n";
			$cols_inner .= serialize_block( [
				'blockName'    => 'core/column',
				'attrs'        => $col_attrs,
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-column is-layout-flow wp-block-column-is-layout-flow\" style=\"flex-basis:50%\">\n{$right_inner}</div>" ],
			] ) . "\n";
			return serialize_block( [
				'blockName'    => 'core/columns',
				'attrs'        => $cols_attrs,
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-columns is-layout-flex wp-block-columns-is-layout-flex is-not-stacked-on-mobile\">\n{$cols_inner}</div>" ],
			] ) . "\n\n";
		}
	}

	// ---- Variant 0 (default): two paragraphs. ----
	$left  = $dist->consume( 'paragraph' ) ?? $dist->consume( 'subheading' );
	$right = $dist->consume( 'paragraph' ) ?? $dist->consume( 'subheading' );

	if ( ! $left && ! $right ) {
		return '';
	}

	$cols_inner = '';
	foreach ( [ $left, $right ] as $item ) {
		$col_inner  = $item ? serialize_block( [
			'blockName'    => 'core/paragraph',
			'attrs'        => [],
			'innerBlocks'  => [],
			'innerContent' => [ '<p>' . esc_html( $item['content'] ) . '</p>' ],
		] ) . "\n" : '';
		$cols_inner .= serialize_block( [
			'blockName'    => 'core/column',
			'attrs'        => $col_attrs,
			'innerBlocks'  => [],
			'innerContent' => [ "<div class=\"wp-block-column is-layout-flow wp-block-column-is-layout-flow\" style=\"flex-basis:50%\">\n{$col_inner}</div>" ],
		] ) . "\n";
	}

	return serialize_block( [
		'blockName'    => 'core/columns',
		'attrs'        => $cols_attrs,
		'innerBlocks'  => [],
		'innerContent' => [ "<div class=\"wp-block-columns is-layout-flex wp-block-columns-is-layout-flex is-not-stacked-on-mobile\">\n{$cols_inner}</div>" ],
	] ) . "\n\n";
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
	$col_items = [];
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

	$cols_attrs = [ 'isStackedOnMobile' => false ];
	$col_attrs  = [
		'backgroundColor' => $bg_slug,
		'style'           => [ 'spacing' => [ 'padding' => [ 'top' => '1.5rem', 'right' => '1.5rem', 'bottom' => '1.5rem', 'left' => '1.5rem' ] ] ],
	];
	$bg_safe    = sanitize_html_class( $bg_slug );
	if ( $name ) {
		$cols_attrs['metadata'] = [ 'name' => $name ];
	}

	$cols_inner = '';
	foreach ( $col_items as $item ) {
		$text       = esc_html( $item['content'] );
		$is_heading = in_array( $item['type'] ?? '', [ 'subheading', 'headline' ], true );

		$col_inner = $is_heading
			? serialize_block( [
				'blockName'    => 'core/heading',
				'attrs'        => [ 'level' => 3 ],
				'innerBlocks'  => [],
				'innerContent' => [ "<h3 class=\"wp-block-heading\">{$text}</h3>" ],
			] ) . "\n"
			: serialize_block( [
				'blockName'    => 'core/paragraph',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ "<p>{$text}</p>" ],
			] ) . "\n";

		$cols_inner .= serialize_block( [
			'blockName'    => 'core/column',
			'attrs'        => $col_attrs,
			'innerBlocks'  => [],
			'innerContent' => [ "<div class=\"wp-block-column is-layout-flow wp-block-column-is-layout-flow has-{$bg_safe}-background-color has-background\" style=\"padding:1.5rem\">\n{$col_inner}</div>" ],
		] ) . "\n";
	}

	return serialize_block( [
		'blockName'    => 'core/columns',
		'attrs'        => $cols_attrs,
		'innerBlocks'  => [],
		'innerContent' => [ "<div class=\"wp-block-columns is-layout-flex wp-block-columns-is-layout-flex is-not-stacked-on-mobile\">\n{$cols_inner}</div>" ],
	] ) . "\n\n";
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

	$cols_attrs = [ 'isStackedOnMobile' => false ];
	$col_attrs  = [
		'backgroundColor' => $bg_slug,
		'style'           => [ 'spacing' => [ 'padding' => [ 'top' => '1.5rem', 'right' => '1.5rem', 'bottom' => '1.5rem', 'left' => '1.5rem' ] ] ],
	];
	$bg_safe = sanitize_html_class( $bg_slug );
	if ( $name ) {
		$cols_attrs['metadata'] = [ 'name' => $name ];
	}

	$cols_inner = '';
	foreach ( $items as $item ) {
		$text       = esc_html( $item['content'] );
		$is_heading = in_array( $item['type'] ?? '', [ 'subheading', 'headline' ], true );

		$col_inner = $is_heading
			? serialize_block( [
				'blockName'    => 'core/heading',
				'attrs'        => [ 'level' => 3 ],
				'innerBlocks'  => [],
				'innerContent' => [ "<h3 class=\"wp-block-heading\">{$text}</h3>" ],
			] ) . "\n"
			: serialize_block( [
				'blockName'    => 'core/paragraph',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ "<p>{$text}</p>" ],
			] ) . "\n";

		$cols_inner .= serialize_block( [
			'blockName'    => 'core/column',
			'attrs'        => $col_attrs,
			'innerBlocks'  => [],
			'innerContent' => [ "<div class=\"wp-block-column is-layout-flow wp-block-column-is-layout-flow has-{$bg_safe}-background-color has-background\" style=\"padding:1.5rem\">\n{$col_inner}</div>" ],
		] ) . "\n";
	}

	return serialize_block( [
		'blockName'    => 'core/columns',
		'attrs'        => $cols_attrs,
		'innerBlocks'  => [],
		'innerContent' => [ "<div class=\"wp-block-columns is-layout-flex wp-block-columns-is-layout-flex is-not-stacked-on-mobile\">\n{$cols_inner}</div>" ],
	] ) . "\n\n";
}

/**
 * Renders a core/group with a visible border and padding — no background fill.
 * Used for editorial inset feel (Codex, Ledger personalities).
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $name     Optional block name.
 * @param int                       $variant  0 = heading/para/quote, 1 = heading/para/list/CTA.
 */
function aldus_block_group_border( Aldus_Content_Distributor $dist, string $name = '', int $variant = 0 ): string {
	$subheading = $dist->consume( 'subheading' );
	$para       = $dist->consume( 'paragraph' );

	$attrs = [
		'style'  => [
			'border'  => [ 'width' => '2px', 'style' => 'solid', 'color' => 'currentColor' ],
			'spacing' => [ 'padding' => [ 'top' => '3rem', 'right' => '3rem', 'bottom' => '3rem', 'left' => '3rem' ] ],
		],
		'layout' => [ 'type' => 'constrained', 'contentSize' => '48rem' ],
	];
	if ( $name ) {
		$attrs['metadata'] = [ 'name' => $name ];
	}

	$inner = '';
	if ( $subheading ) {
		$inner .= serialize_block( [
			'blockName'    => 'core/heading',
			'attrs'        => [ 'level' => 2 ],
			'innerBlocks'  => [],
			'innerContent' => [ '<h2 class="wp-block-heading">' . esc_html( $subheading['content'] ) . '</h2>' ],
		] ) . "\n";
	}
	if ( $para ) {
		$inner .= serialize_block( [
			'blockName'    => 'core/paragraph',
			'attrs'        => [],
			'innerBlocks'  => [],
			'innerContent' => [ '<p>' . esc_html( $para['content'] ) . '</p>' ],
		] ) . "\n";
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
			$btn       = serialize_block( [
				'blockName'    => 'core/button',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-button\"><a class=\"wp-block-button__link wp-element-button\" href=\"{$cta_url}\">{$cta_label}</a></div>" ],
			] );
			$inner .= serialize_block( [
				'blockName'    => 'core/buttons',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ "<div class=\"wp-block-buttons is-layout-flex wp-block-buttons-is-layout-flex\">{$btn}</div>" ],
			] ) . "\n";
		}
	} else {
		// Variant 0 (default): optional quote.
		$quote = $dist->has( 'quote' ) ? $dist->consume( 'quote' ) : null;
		if ( $quote ) {
			$inner .= serialize_block( [
				'blockName'    => 'core/quote',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ '<blockquote class="wp-block-quote"><p>' . esc_html( $quote['content'] ) . '</p></blockquote>' ],
			] ) . "\n";
		}
	}

	if ( ! $inner ) {
		return '';
	}

	return serialize_block( [
		'blockName'    => 'core/group',
		'attrs'        => $attrs,
		'innerBlocks'  => [],
		'innerContent' => [ "<div class=\"wp-block-group is-layout-constrained wp-block-group-is-layout-constrained\" style=\"border:2px solid currentColor;padding:3rem\">\n{$inner}</div>" ],
	] ) . "\n\n";
}

/**
 * Renders a full-width core/group with a theme gradient background.
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $gradient_slug  Gradient preset slug.
 * @param string                    $name           Optional block name.
 * @param int                       $variant        0 = heading/para/CTA, 1 = testimonial (quote + CTA).
 */
function aldus_block_group_gradient( Aldus_Content_Distributor $dist, string $gradient_slug, string $name = '', int $variant = 0 ): string {
	$gradient_safe = sanitize_html_class( $gradient_slug );

	$attrs = [
		'gradient' => $gradient_slug,
		'align'    => 'full',
		'layout'   => [ 'type' => 'constrained', 'contentSize' => '48rem' ],
		'style'    => [ 'spacing' => [ 'padding' => [ 'top' => '4rem', 'bottom' => '4rem' ] ] ],
	];
	if ( $name ) {
		$attrs['metadata'] = [ 'name' => $name ];
	}

	$inner = '';

	if ( $variant === 1 ) {
		// Variant 1: testimonial — large quote + optional attribution + CTA.
		$quote = $dist->has( 'quote' ) ? $dist->consume( 'quote' ) : null;
		if ( $quote ) {
			$inner .= serialize_block( [
				'blockName'    => 'core/quote',
				'attrs'        => [ 'textAlign' => 'center' ],
				'innerBlocks'  => [],
				'innerContent' => [ '<blockquote class="wp-block-quote has-text-align-center"><p>' . esc_html( $quote['content'] ) . '</p></blockquote>' ],
			] ) . "\n";
		}
		// Attribution from a subheading (person's name / title).
		$attribution = $dist->has( 'subheading' ) ? $dist->consume( 'subheading' ) : null;
		if ( $attribution ) {
			$inner .= serialize_block( [
				'blockName'    => 'core/paragraph',
				'attrs'        => [ 'textAlign' => 'center', 'style' => [ 'typography' => [ 'fontStyle' => 'italic' ] ] ],
				'innerBlocks'  => [],
				'innerContent' => [ '<p class="has-text-align-center"><em>' . esc_html( $attribution['content'] ) . '</em></p>' ],
			] ) . "\n";
		}
	} else {
		// Variant 0 (default): heading + paragraph + CTA.
		$subheading = $dist->consume( 'subheading' );
		$para       = $dist->consume( 'paragraph' );
		if ( $subheading ) {
			$inner .= serialize_block( [
				'blockName'    => 'core/heading',
				'attrs'        => [ 'level' => 2 ],
				'innerBlocks'  => [],
				'innerContent' => [ '<h2 class="wp-block-heading">' . esc_html( $subheading['content'] ) . '</h2>' ],
			] ) . "\n";
		}
		if ( $para ) {
			$inner .= serialize_block( [
				'blockName'    => 'core/paragraph',
				'attrs'        => [],
				'innerBlocks'  => [],
				'innerContent' => [ '<p>' . esc_html( $para['content'] ) . '</p>' ],
			] ) . "\n";
		}
	}

	// Both variants: append a CTA button if available.
	$cta = $dist->has( 'cta' ) ? $dist->consume( 'cta' ) : null;
	if ( $cta ) {
		$label = esc_html( $cta['content'] );
		$url   = ! empty( $cta['url'] ) ? esc_url( $cta['url'] ) : '#';
		$btn   = serialize_block( [
			'blockName'    => 'core/button',
			'attrs'        => [],
			'innerBlocks'  => [],
			'innerContent' => [ "<div class=\"wp-block-button\"><a class=\"wp-block-button__link wp-element-button\" href=\"{$url}\">{$label}</a></div>" ],
		] );
		$inner .= serialize_block( [
			'blockName'    => 'core/buttons',
			'attrs'        => ( $variant === 1 ) ? [ 'layout' => [ 'type' => 'flex', 'justifyContent' => 'center' ] ] : [],
			'innerBlocks'  => [],
			'innerContent' => [ "<div class=\"wp-block-buttons is-layout-flex wp-block-buttons-is-layout-flex\">{$btn}</div>" ],
		] ) . "\n";
	}

	if ( ! $inner ) {
		return '';
	}

	return serialize_block( [
		'blockName'    => 'core/group',
		'attrs'        => $attrs,
		'innerBlocks'  => [],
		'innerContent' => [ "<div class=\"wp-block-group is-layout-constrained wp-block-group-is-layout-constrained alignfull has-{$gradient_safe}-gradient-background has-background\" style=\"padding-top:4rem;padding-bottom:4rem\">\n{$inner}</div>" ],
	] ) . "\n\n";
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

	return serialize_block( [
		'blockName'    => 'core/pullquote',
		'attrs'        => [
			'align' => 'wide',
			'style' => [ 'typography' => [ 'textAlign' => 'center' ] ],
		],
		'innerBlocks'  => [],
		'innerContent' => [
			"<figure class=\"wp-block-pullquote alignwide has-text-align-center\"><blockquote><p>{$text}</p></blockquote></figure>",
		],
	] ) . "\n\n";
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

	return serialize_block( [
		'blockName'    => 'core/heading',
		'attrs'        => [ 'level' => 1, 'fontSize' => $font_size, 'textAlign' => 'center' ],
		'innerBlocks'  => [],
		'innerContent' => [ "<h1 class=\"wp-block-heading has-text-align-center has-{$font_size}-font-size\">{$text}</h1>" ],
	] ) . "\n\n";
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
		$markup .= serialize_block( [
			'blockName'    => 'core/heading',
			'attrs'        => [
				'level' => 6,
				'style' => [ 'typography' => [ 'textTransform' => 'uppercase', 'letterSpacing' => '0.12em' ] ],
			],
			'innerBlocks'  => [],
			'innerContent' => [ '<h6 class="wp-block-heading">' . esc_html( $kicker['content'] ) . '</h6>' ],
		] ) . "\n";
	}
	if ( $main ) {
		$font_size_safe = sanitize_html_class( $font_size );
		$markup .= serialize_block( [
			'blockName'    => 'core/heading',
			'attrs'        => [ 'level' => 1, 'fontSize' => $font_size ],
			'innerBlocks'  => [],
			'innerContent' => [ "<h1 class=\"wp-block-heading has-{$font_size_safe}-font-size\">" . esc_html( $main['content'] ) . '</h1>' ],
		] ) . "\n";
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

	return serialize_block( [
		'blockName'    => 'core/quote',
		'attrs'        => [],
		'innerBlocks'  => [],
		'innerContent' => [ "<blockquote class=\"wp-block-quote\"><p>{$text}</p>{$cite_html}</blockquote>" ],
	] ) . "\n\n";
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

	$settings  = wp_get_global_settings( [ 'color', 'gradients' ] );
	$gradients = $settings['theme'] ?? $settings['default'] ?? [];

	if ( empty( $gradients ) ) {
		$gradients = [
			[ 'slug' => 'vivid-cyan-blue-to-vivid-purple', 'gradient' => 'linear-gradient(135deg,rgba(6,147,227,1) 0%,rgb(155,81,224) 100%)' ],
			[ 'slug' => 'light-green-cyan-to-vivid-green-cyan', 'gradient' => 'linear-gradient(135deg,rgb(122,220,180) 0%,rgb(0,208,130) 100%)' ],
		];
	}

	wp_cache_set( $cache_key, $gradients, 'aldus' );
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

	return serialize_block( [
		'blockName'    => 'core/embed',
		'attrs'        => [
			'url'        => esc_url_raw( $item['url'] ),
			'responsive' => true,
			'metadata'   => [ 'name' => 'Video Hero' ],
		],
		'innerBlocks'  => [],
		'innerContent' => [ "<figure class=\"wp-block-embed\"><div class=\"wp-block-embed__wrapper\">\n{$url}\n</div></figure>" ],
	] ) . "\n\n";
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
		$inner .= serialize_block( [
			'blockName'    => 'core/heading',
			'attrs'        => [ 'level' => 2 ],
			'innerBlocks'  => [],
			'innerContent' => [ '<h2 class="wp-block-heading">' . esc_html( $heading['content'] ) . '</h2>' ],
		] ) . "\n\n";
	}

	$inner .= serialize_block( [
		'blockName'    => 'core/embed',
		'attrs'        => [ 'url' => esc_url_raw( $item['url'] ), 'responsive' => true ],
		'innerBlocks'  => [],
		'innerContent' => [ "<figure class=\"wp-block-embed\"><div class=\"wp-block-embed__wrapper\">\n{$url}\n</div></figure>" ],
	] ) . "\n\n";

	return serialize_block( [
		'blockName'    => 'core/group',
		'attrs'        => [ 'metadata' => [ 'name' => 'Video Section' ] ],
		'innerBlocks'  => [],
		'innerContent' => [ "<div class=\"wp-block-group is-layout-flow wp-block-group-is-layout-flow\">\n{$inner}</div>" ],
	] ) . "\n\n";
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

	$rows = array_values( array_filter( array_map( 'trim', explode( "\n", $item['content'] ) ) ) );
	if ( empty( $rows ) ) {
		return '';
	}

	$split_row = fn( string $row ): array => array_map(
		'trim',
		preg_split( '/[,\t]/', $row ) ?: []
	);

	$header_cells = array_map(
		fn( string $cell ): string =>
			'<th class="has-text-align-left" data-align="left"><strong>' . esc_html( $cell ) . '</strong></th>',
		$split_row( array_shift( $rows ) )
	);

	$body_rows = array_map(
		fn( string $row ): string =>
			'<tr>' . implode( '', array_map(
				fn( string $cell ): string =>
					'<td class="has-text-align-left" data-align="left">' . esc_html( $cell ) . '</td>',
				$split_row( $row )
			) ) . '</tr>',
		$rows
	);

	$thead = '<thead><tr>' . implode( '', $header_cells ) . '</tr></thead>';
	$tbody = '<tbody>' . implode( '', $body_rows ) . '</tbody>';

	return serialize_block( [
		'blockName'    => 'core/table',
		'attrs'        => [
			'hasFixedLayout' => true,
			'className'      => 'is-style-stripes',
			'metadata'       => [ 'name' => 'Data Table' ],
		],
		'innerBlocks'  => [],
		'innerContent' => [ "<figure class=\"wp-block-table\"><table class=\"has-fixed-layout is-style-stripes\">{$thead}{$tbody}</table></figure>" ],
	] ) . "\n\n";
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

	$urls = is_array( $item['urls'] ?? null ) ? $item['urls'] : [];
	if ( empty( $urls ) ) {
		return '';
	}

	$inner = '';
	foreach ( $urls as $raw_url ) {
		$url = esc_url( $raw_url );
		if ( ! $url ) {
			continue;
		}
		$inner .= serialize_block( [
			'blockName'    => 'core/image',
			'attrs'        => [ 'url' => esc_url_raw( $raw_url ), 'sizeSlug' => 'large' ],
			'innerBlocks'  => [],
			'innerContent' => [ "<figure class=\"wp-block-image size-large\"><img src=\"{$url}\"/></figure>" ],
		] ) . "\n";
	}

	if ( ! $inner ) {
		return '';
	}

	return serialize_block( [
		'blockName'    => 'core/gallery',
		'attrs'        => [
			'columns'  => $columns,
			'linkTo'   => 'none',
			'metadata' => [ 'name' => $name ],
		],
		'innerBlocks'  => [],
		'innerContent' => [ "<figure class=\"wp-block-gallery has-nested-images columns-{$columns} is-cropped\">{$inner}</figure>" ],
	] ) . "\n\n";
}
