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
	string $radius = ''
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

	// When no image was provided by the user, use the post's featured image as
	// background — but only when the thumbnail actually exists.  Omitting the
	// check would set useFeaturedImage=true even when the featured image slot
	// is empty, which causes WordPress to render a blank white cover block.
	// Guard against IDOR: only read the thumbnail of a post the current user
	// can actually edit, to prevent confirming the existence of private post media.
	$use_featured = false;
	if (
		! $image_url &&
		$post_id > 0 &&
		get_post( $post_id ) &&
		current_user_can( 'edit_post', $post_id ) &&
		has_post_thumbnail( $post_id )
	) {
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
