<?php
declare(strict_types=1);
/**
 * Cover block renderers — cover, cover_minimal, cover_split.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function aldus_block_cover(
	Aldus_Content_Distributor $dist,
	string $color_slug,
	int $dim_ratio,
	string $font_size,
	bool $is_light = false,
	string $name = '',
	int $variant = 0,
	int $post_id = 0,
	string $ia_attrs = '',
	string $radius = '',
	?string $heading_font = null,
	?string $cover_overlay = null
): string {
	// Variant 2 (backdrop) is fully self-contained — exits before shared setup.
	if ( $variant === 2 ) {
		return aldus_cover_backdrop( $dist, $color_slug, $dim_ratio, $name, $radius );
	}

	// Shared setup for variants 0, 1, 3, 4.
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

	// Guard against IDOR: only read the thumbnail of a post the current user
	// can actually edit, to prevent confirming the existence of private post media.
	// current_user_can( 'edit_post', $post_id ) already returns false for
	// non-existent posts, so the redundant get_post() check is omitted — it
	// would otherwise leak post-existence information via differing code paths.
	$use_featured = false;
	if (
		! $image_url &&
		$post_id > 0 &&
		current_user_can( 'edit_post', $post_id ) &&
		has_post_thumbnail( $post_id )
	) {
		$use_featured = true;
	}

	// Sub-text is only consumed for variant 1 (heading + subheading inside cover).
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
	$cover_min_height = aldus_cover_min_height( $headline_raw );

	$attrs = array(
		'dimRatio'        => $dim_ratio,
		'align'           => 'full',
		'contentPosition' => $content_position,
		'minHeight'       => $cover_min_height,
		'minHeightUnit'   => 'px',
		'layout'          => array( 'type' => 'constrained' ),
	);
	// When the theme defines a cover overlay via theme.json, use the CSS value
	// directly (customOverlayColor).  Otherwise fall back to a palette slug.
	if ( $cover_overlay ) {
		$attrs['customOverlayColor'] = $cover_overlay;
	} else {
		$attrs['overlayColor'] = $color_slug;
	}
	if ( $radius !== '' ) {
		$attrs['style']['border']['radius'] = $radius;
	}
	if ( $name ) {
		$attrs['metadata'] = array( 'name' => $name );
	}
	if ( $image_url ) {
		$attrs['url']         = esc_url_raw( $image['url'] );
		$attrs['hasParallax'] = false;
	} elseif ( $use_featured ) {
		$attrs['useFeaturedImage'] = true;
	}

	// Pack computed context for variant functions.
	$ctx = compact(
		'text',
		'sub_text',
		'image_url',
		'color_safe',
		'text_color',
		'text_color_safe',
		'font_size',
		'is_light',
		'headline_raw',
		'cover_min_height',
		'attrs',
		'dim_ratio',
		'heading_font'
	);

	if ( $variant === 3 ) {
		return aldus_cover_product_hero( $dist, $ctx );
	}
	if ( $variant === 4 ) {
		return aldus_cover_manifesto( $ctx );
	}
	return aldus_cover_standard( $dist, $ctx, $ia_attrs, $variant );
}

/**
 * Variant 2: pure backdrop — image only, no inner text content.
 *
 * @internal
 */
function aldus_cover_backdrop(
	Aldus_Content_Distributor $dist,
	string $color_slug,
	int $dim_ratio,
	string $name,
	string $radius
): string {
	if ( ! $dist->has( 'image' ) ) {
		return '';
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
	if ( $radius !== '' ) {
		$attrs['style']['border']['radius'] = $radius;
	}
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

/**
 * Variant 3: product-hero — heading + optional subheading + CTA button over cover.
 *
 * @param Aldus_Content_Distributor $dist Used to consume the CTA item.
 * @param array<string, mixed>      $ctx  Shared context from aldus_block_cover().
 * @internal
 */
function aldus_cover_product_hero( Aldus_Content_Distributor $dist, array $ctx ): string {
	$attrs                    = $ctx['attrs'];
	$attrs['contentPosition'] = 'center center';
	$cover_min_height         = aldus_cover_min_height( $ctx['headline_raw'], 520 );
	$attrs['minHeight']       = $cover_min_height;

	$dim_class  = "has-background-dim-{$ctx['dim_ratio']}";
	$image_html = $ctx['image_url']
		? "<img class=\"wp-block-cover__image-background\" src=\"{$ctx['image_url']}\" alt=\"\" data-object-fit=\"cover\"/>\n"
		: '';

	$color_safe      = $ctx['color_safe'];
	$text_color      = $ctx['text_color'];
	$text_color_safe = $ctx['text_color_safe'];
	$font_size       = $ctx['font_size'];
	$heading_font    = $ctx['heading_font'] ?? null;

	$inner = '';
	if ( $ctx['text'] ) {
		$h1_attrs = array(
			'level'     => 1,
			'textColor' => $text_color,
			'fontSize'  => $font_size,
			'textAlign' => 'center',
		);
		if ( $heading_font ) {
			$h1_attrs['fontFamily'] = $heading_font;
		}
		$inner .= serialize_block(
			array(
				'blockName'    => 'core/heading',
				'attrs'        => $h1_attrs,
				'innerBlocks'  => array(),
				'innerContent' => array(
					"<h1 class=\"wp-block-heading has-text-align-center has-{$text_color_safe}-color"
					. " has-text-color has-{$font_size}-font-size\">{$ctx['text']}</h1>",
				),
			)
		) . "\n";
	}
	if ( $ctx['sub_text'] ) {
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
					. " has-text-color\">{$ctx['sub_text']}</h2>",
				),
			)
		) . "\n";
	}
	$cta_item = $dist->consume( 'cta' );
	if ( $cta_item ) {
		$cta_label  = esc_html( $cta_item['content'] );
		$cta_url    = ! empty( $cta_item['url'] ) ? esc_url( $cta_item['url'] ) : '#';
		$color_slug = $attrs['overlayColor'];
		$btn        = serialize_block(
			array(
				'blockName'    => 'core/button',
				'attrs'        => array(
					'textColor'       => $ctx['is_light'] ? '' : $color_slug,
					'backgroundColor' => $ctx['is_light'] ? $color_slug : '',
					'textAlign'       => 'center',
				),
				'innerBlocks'  => array(),
				'innerContent' => array(
					'<div class="wp-block-button"><a class="wp-block-button__link'
					. " wp-element-button\" href=\"{$cta_url}\">{$cta_label}</a></div>",
				),
			)
		);
		$inner     .= serialize_block(
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

/**
 * Variant 4: manifesto — full-width, centered, large heading only. No image required.
 *
 * @param array<string, mixed> $ctx Shared context from aldus_block_cover().
 * @internal
 */
function aldus_cover_manifesto( array $ctx ): string {
	$attrs                    = $ctx['attrs'];
	$attrs['contentPosition'] = 'center center';
	$cover_min_height         = aldus_cover_min_height( $ctx['headline_raw'], 360 );
	$attrs['minHeight']       = $cover_min_height;
	unset( $attrs['url'], $attrs['hasParallax'] );

	$color_safe      = $ctx['color_safe'];
	$text_color      = $ctx['text_color'];
	$text_color_safe = $ctx['text_color_safe'];
	$font_size       = $ctx['font_size'];
	$dim_class       = 'has-background-dim-20';
	$heading_font    = $ctx['heading_font'] ?? null;

	$inner = '';
	if ( $ctx['text'] ) {
		$h1_attrs = array(
			'level'     => 1,
			'textColor' => $text_color,
			'fontSize'  => $font_size,
			'textAlign' => 'center',
		);
		if ( $heading_font ) {
			$h1_attrs['fontFamily'] = $heading_font;
		}
		$inner .= serialize_block(
			array(
				'blockName'    => 'core/heading',
				'attrs'        => $h1_attrs,
				'innerBlocks'  => array(),
				'innerContent' => array(
					"<h1 class=\"wp-block-heading has-text-align-center has-{$text_color_safe}-color"
					. " has-text-color has-{$font_size}-font-size\">{$ctx['text']}</h1>",
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

/**
 * Variants 0 and 1: standard cover with heading, optional subheading, and background.
 *
 * @param Aldus_Content_Distributor $dist    Not consumed here but forwarded for API symmetry.
 * @param array<string, mixed>      $ctx     Shared context from aldus_block_cover().
 * @param string                    $ia_attrs Extra HTML attributes injected into the wrapper div.
 * @param int                       $variant 0 = bottom-left heading, 1 = centered heading + subheading.
 * @internal
 */
function aldus_cover_standard(
	Aldus_Content_Distributor $dist,
	array $ctx,
	string $ia_attrs,
	int $variant
): string {
	$attrs            = $ctx['attrs'];
	$cover_min_height = $ctx['cover_min_height'];
	$color_safe       = $ctx['color_safe'];
	$text_color_safe  = $ctx['text_color_safe'];
	$text_color       = $ctx['text_color'];
	$font_size        = $ctx['font_size'];
	$dim_ratio        = $ctx['dim_ratio'];
	$image_url        = $ctx['image_url'];
	$sub_text         = $ctx['sub_text'];
	$heading_font     = $ctx['heading_font'] ?? null;

	$content_position = $attrs['contentPosition'];
	$position_slug    = str_replace( ' ', '-', $content_position );
	$position_class   = "has-custom-content-position is-position-{$position_slug}";
	$dim_class        = "has-background-dim-{$dim_ratio}";

	$image_html = $image_url
		? "<img class=\"wp-block-cover__image-background\" src=\"{$image_url}\" alt=\"\" data-object-fit=\"cover\"/>\n"
		: '';

	$inner = '';
	if ( $ctx['text'] ) {
		$h1_attrs = array(
			'level'     => 1,
			'textColor' => $text_color,
			'fontSize'  => $font_size,
		);
		if ( $heading_font ) {
			$h1_attrs['fontFamily'] = $heading_font;
		}
		$inner .= serialize_block(
			array(
				'blockName'    => 'core/heading',
				'attrs'        => $h1_attrs,
				'innerBlocks'  => array(),
				'innerContent' => array( "<h1 class=\"wp-block-heading has-{$text_color_safe}-color has-text-color has-{$font_size}-font-size\">{$ctx['text']}</h1>" ),
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
				"<div class=\"wp-block-cover alignfull {$position_class}\"{$ia_attrs}"
				. " style=\"min-height:{$cover_min_height}px\">\n"
				. "<span aria-hidden=\"true\" class=\"wp-block-cover__background has-{$color_safe}-background-color {$dim_class} has-background-dim\"></span>\n"
				. $image_html
				. $inner_container
				. '</div>',
			),
		)
	) . "\n\n";
}

function aldus_block_cover_minimal( Aldus_Content_Distributor $dist, string $color_slug, string $font_size, string $name = '', ?string $heading_font = null ): string {
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

	$h1_attrs = array(
		'level'     => 1,
		'textColor' => 'white',
		'fontSize'  => $font_size,
		'textAlign' => 'center',
	);
	if ( $heading_font ) {
		$h1_attrs['fontFamily'] = $heading_font;
	}

	$heading_html = serialize_block(
		array(
			'blockName'    => 'core/heading',
			'attrs'        => $h1_attrs,
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

function aldus_block_cover_split( Aldus_Content_Distributor $dist, string $font_size, string $name = '', ?string $heading_font = null ): string {
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
		$h1_attrs       = array(
			'level'    => 1,
			'fontSize' => $font_size,
		);
		if ( $heading_font ) {
			$h1_attrs['fontFamily'] = $heading_font;
		}
		$content_inner .= serialize_block(
			array(
				'blockName'    => 'core/heading',
				'attrs'        => $h1_attrs,
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
