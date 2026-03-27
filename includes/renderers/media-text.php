<?php
declare(strict_types=1);
/**
 * Media-text block renderer.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
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

	// Only render an <img> when a URL is present.  Without a URL the
	// core/media-text save() function generates an empty <figure>, so the
	// innerContent must match that structure to avoid block validation failures.
	// We also never set a mediaId attr, so no wp-image-* or size-* classes.
	$media_html = $image_url
		? "<img src=\"{$image_url}\" alt=\"\"/>"
		: '';

	return serialize_block(
		array(
			'blockName'    => 'core/media-text',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerContent' => array(
				'<div class="' . aldus_media_text_classes( $image_position, true, '', 'center' ) . '" style="' . aldus_media_text_style( 38, $image_position ) . "\">\n"
				. "<figure class=\"wp-block-media-text__media\">{$media_html}</figure>\n"
				. "<div class=\"wp-block-media-text__content\">\n{$content_inner}</div>\n</div>",
			),
		)
	) . "\n\n";
}
