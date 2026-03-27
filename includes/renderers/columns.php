<?php
declare(strict_types=1);
/**
 * Columns block renderers — asymmetric, three, two_equal, four_equal, two_equal_from_items.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Renders a two-column asymmetric layout (28/72 split).
 *
 * @param Aldus_Content_Distributor $dist
 * @param bool                      $flip     Swap column order.
 * @param string                    $name     Optional block name shown in the editor List View.
 * @param int                       $variant  0 = heading/dropcap (default), 1 = list/paragraph, 2 = heading+paragraph/image.
 */
function aldus_block_columns_asymmetric( Aldus_Content_Distributor $dist, bool $flip = false, string $name = '', int $variant = 0, string $section_label = '' ): string {
	if ( $variant === 1 ) {
		return aldus_columns_asymmetric_v1( $dist, $flip, $name );
	}
	if ( $variant === 2 && $dist->has( 'image' ) ) {
		return aldus_columns_asymmetric_v2( $dist, $flip, $name );
	}
	return aldus_columns_asymmetric_v0( $dist, $flip, $name, $section_label );
}

/**
 * Asymmetric variant 0 (default): heading in narrow column, dropcap paragraph in wide.
 *
 * @internal
 */
function aldus_columns_asymmetric_v0( Aldus_Content_Distributor $dist, bool $flip, string $name, string $section_label ): string {
	$narrow_width = 28;
	$wide_width   = 72;
	$cols_attrs   = array( 'isStackedOnMobile' => true );
	$narrow_attrs = array( 'width' => "{$narrow_width}%" );
	$wide_attrs   = array( 'width' => "{$wide_width}%" );
	if ( $name ) {
		$cols_attrs['metadata'] = array( 'name' => $name );
	}

	$heading = $dist->consume( 'subheading' ) ?? $dist->consume( 'headline' );
	$para    = $dist->consume( 'paragraph' );
	if ( ! $heading && ! $para ) {
		return '';
	}

	$left_content = $heading ? serialize_block(
		array(
			'blockName'    => 'core/heading',
			'attrs'        => array( 'level' => 2 ),
			'innerBlocks'  => array(),
			'innerContent' => array( '<h2 class="wp-block-heading">' . esc_html( $heading['content'] ) . '</h2>' ),
		)
	) . "\n" : '';
	// Fallback: when no heading was available, fill the narrow label column
	// with the AI-generated section label (1-3 words, rendered as h6).
	if ( '' === $left_content && '' !== $section_label ) {
		$left_content = serialize_block(
			array(
				'blockName'    => 'core/heading',
				'attrs'        => array(
					'level'    => 6,
					'fontSize' => 'small',
				),
				'innerBlocks'  => array(),
				'innerContent' => array( '<h6 class="wp-block-heading">' . esc_html( $section_label ) . '</h6>' ),
			)
		) . "\n";
	}
	$right_content = $para ? serialize_block(
		array(
			'blockName'    => 'core/paragraph',
			'attrs'        => array( 'dropCap' => true ),
			'innerBlocks'  => array(),
			'innerContent' => array( '<p class="has-drop-cap">' . esc_html( $para['content'] ) . '</p>' ),
		)
	) . "\n" : '';

	return aldus_columns_asymmetric_wrap( $cols_attrs, $narrow_attrs, $wide_attrs, $narrow_width, $wide_width, $left_content, $right_content, $flip );
}

/**
 * Asymmetric variant 1: list in narrow column, paragraph in wide.
 *
 * @internal
 */
function aldus_columns_asymmetric_v1( Aldus_Content_Distributor $dist, bool $flip, string $name ): string {
	$narrow_width = 28;
	$wide_width   = 72;
	$cols_attrs   = array( 'isStackedOnMobile' => true );
	$narrow_attrs = array( 'width' => "{$narrow_width}%" );
	$wide_attrs   = array( 'width' => "{$wide_width}%" );
	if ( $name ) {
		$cols_attrs['metadata'] = array( 'name' => $name );
	}

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

	return aldus_columns_asymmetric_wrap( $cols_attrs, $narrow_attrs, $wide_attrs, $narrow_width, $wide_width, $left_content, $right_content, $flip );
}

/**
 * Asymmetric variant 2: heading+paragraph in narrow column, image in wide.
 *
 * @internal
 */
function aldus_columns_asymmetric_v2( Aldus_Content_Distributor $dist, bool $flip, string $name ): string {
	$narrow_width = 28;
	$wide_width   = 72;
	$cols_attrs   = array( 'isStackedOnMobile' => true );
	$narrow_attrs = array( 'width' => "{$narrow_width}%" );
	$wide_attrs   = array( 'width' => "{$wide_width}%" );
	if ( $name ) {
		$cols_attrs['metadata'] = array( 'name' => $name );
	}

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

	return aldus_columns_asymmetric_wrap( $cols_attrs, $narrow_attrs, $wide_attrs, $narrow_width, $wide_width, $left_content, $right_content, $flip );
}

/**
 * Assembles the final columns block for asymmetric variants.
 *
 * @param array<string, mixed> $cols_attrs
 * @param array<string, mixed> $narrow_attrs
 * @param array<string, mixed> $wide_attrs
 * @internal
 */
function aldus_columns_asymmetric_wrap(
	array $cols_attrs,
	array $narrow_attrs,
	array $wide_attrs,
	int $narrow_width,
	int $wide_width,
	string $left_content,
	string $right_content,
	bool $flip
): string {
	// Swap columns if flipped — attrs, content, AND the width integers used
	// to build the inline flex-basis style must all move together.  Swapping
	// attrs without swapping the widths produces mismatched block attributes
	// (e.g. attrs say 72% but style says 28%), which causes block validation
	// failures in the editor.
	if ( $flip ) {
		[ $narrow_attrs, $wide_attrs, $left_content, $right_content, $narrow_width, $wide_width ] =
			array( $wide_attrs, $narrow_attrs, $right_content, $left_content, $wide_width, $narrow_width );
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
 * @param Aldus_Content_Distributor $dist
 * @param string                    $name     Optional block name.
 * @param int                       $variant  0 = two paragraphs, 1 = editorial (heading+para each side),
 *                                            2 = heading left + list right, 3 = quote left + para right,
 *                                            4 = image left + para right.
 */
function aldus_block_columns_two_equal( Aldus_Content_Distributor $dist, string $name = '', int $variant = 0 ): string {
	if ( $variant === 1 ) {
		$result = aldus_columns_two_equal_v1( $dist, $name );
		if ( null !== $result ) {
			return $result;
		}
	} elseif ( $variant === 2 ) {
		$result = aldus_columns_two_equal_v2( $dist, $name );
		if ( null !== $result ) {
			return $result;
		}
	} elseif ( $variant === 3 ) {
		$result = aldus_columns_two_equal_v3( $dist, $name );
		if ( null !== $result ) {
			return $result;
		}
	} elseif ( $variant === 4 ) {
		$result = aldus_columns_two_equal_v4( $dist, $name );
		if ( null !== $result ) {
			return $result;
		}
	}
	return aldus_columns_two_equal_v0( $dist, $name );
}

/**
 * Shared column wrapper builder for two-equal variants.
 *
 * @param array<string, mixed> $cols_attrs
 * @param array<string, mixed> $col_attrs
 * @param string               $left_inner
 * @param string               $right_inner
 * @internal
 */
function aldus_columns_two_equal_wrap( array $cols_attrs, array $col_attrs, string $left_inner, string $right_inner ): string {
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

/**
 * Two-equal variant 0 (default): two paragraphs side by side.
 *
 * @internal
 */
function aldus_columns_two_equal_v0( Aldus_Content_Distributor $dist, string $name ): string {
	$cols_attrs = array( 'isStackedOnMobile' => true );
	$col_attrs  = array( 'width' => '50%' );
	if ( $name ) {
		$cols_attrs['metadata'] = array( 'name' => $name );
	}

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
 * Two-equal variant 1: editorial — heading + paragraph in each column.
 * Returns null when no content is available (dispatcher falls back to v0).
 *
 * @return string|null
 * @internal
 */
function aldus_columns_two_equal_v1( Aldus_Content_Distributor $dist, string $name ): ?string {
	$cols_attrs = array( 'isStackedOnMobile' => true );
	$col_attrs  = array( 'width' => '50%' );
	if ( $name ) {
		$cols_attrs['metadata'] = array( 'name' => $name );
	}

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
		return null; // Signal dispatcher to fall back to v0.
	}

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

/**
 * Two-equal variant 2: heading left + list right.
 * Returns null when no content is available (dispatcher falls back to v0).
 *
 * @return string|null
 * @internal
 */
function aldus_columns_two_equal_v2( Aldus_Content_Distributor $dist, string $name ): ?string {
	$cols_attrs = array( 'isStackedOnMobile' => true );
	$col_attrs  = array( 'width' => '50%' );
	if ( $name ) {
		$cols_attrs['metadata'] = array( 'name' => $name );
	}

	$heading = $dist->consume( 'subheading' ) ?? $dist->consume( 'headline' );
	$list    = $dist->consume( 'list' );
	if ( ! $heading && ! $list ) {
		return null; // Signal dispatcher to fall back to v0.
	}

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

	return aldus_columns_two_equal_wrap( $cols_attrs, $col_attrs, $left_inner, $right_inner );
}

/**
 * Two-equal variant 3: quote left + paragraph right.
 * Returns null when no content is available (dispatcher falls back to v0).
 *
 * @return string|null
 * @internal
 */
function aldus_columns_two_equal_v3( Aldus_Content_Distributor $dist, string $name ): ?string {
	$cols_attrs = array( 'isStackedOnMobile' => true );
	$col_attrs  = array( 'width' => '50%' );
	if ( $name ) {
		$cols_attrs['metadata'] = array( 'name' => $name );
	}

	$quote = $dist->consume( 'quote' );
	$para  = $dist->consume( 'paragraph' );
	if ( ! $quote && ! $para ) {
		return null; // Signal dispatcher to fall back to v0.
	}

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

	return aldus_columns_two_equal_wrap( $cols_attrs, $col_attrs, $left_inner, $right_inner );
}

/**
 * Two-equal variant 4: image left + paragraph right.
 * Returns null when no image is available (dispatcher falls back to v0).
 *
 * @return string|null
 * @internal
 */
function aldus_columns_two_equal_v4( Aldus_Content_Distributor $dist, string $name ): ?string {
	$cols_attrs = array( 'isStackedOnMobile' => true );
	$col_attrs  = array( 'width' => '50%' );
	if ( $name ) {
		$cols_attrs['metadata'] = array( 'name' => $name );
	}

	$image = $dist->consume( 'image' );
	$para  = $dist->consume( 'paragraph' );
	if ( ! $image ) {
		return null; // Signal dispatcher to fall back to v0.
	}

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

	return aldus_columns_two_equal_wrap( $cols_attrs, $col_attrs, $left_inner, $right_inner );
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
