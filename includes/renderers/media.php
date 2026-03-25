<?php
declare(strict_types=1);
/**
 * Media block renderers — image, gallery, video_hero, video_section.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

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
 * Renders a full-width video background hero block.
 *
 * @param Aldus_Content_Distributor $dist Content distributor.
 * @return string Serialised block markup, or '' when no video item is available.
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
