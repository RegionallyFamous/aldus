<?php
declare(strict_types=1);
/**
 * Group block renderers — group, group_border, group_gradient, group_grid.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
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
	string $block_gap = '',
	string $ia_attrs = '',
	string $radius = '',
	?string $section_style = null
): string {
	$align = $full_width ? 'full' : '';

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
		'layout' => array(
			'type'        => 'constrained',
			'contentSize' => aldus_theme_content_size(),
		),
		'style'  => array( 'spacing' => $spacing ),
	);

	// When a section style is available, prefer `is-style-{slug}` className
	// and omit explicit background/text color attrs — the section style's
	// nested CSS handles sub-element colors automatically.
	if ( $section_style ) {
		$attrs['className'] = 'is-style-' . sanitize_html_class( $section_style );
	} else {
		$bg_safe                  = sanitize_html_class( $bg_slug );
		$tc_safe                  = $text_color_slug ? sanitize_html_class( $text_color_slug ) : '';
		$attrs['backgroundColor'] = $bg_slug;
		if ( $tc_safe ) {
			$attrs['textColor'] = $text_color_slug;
		}
	}

	if ( $radius !== '' ) {
		$attrs['style']['border']['radius'] = $radius;
	}
	if ( $name ) {
		$attrs['metadata'] = array( 'name' => $name );
	}
	if ( $align ) {
		$attrs['align'] = $align;
	}

	$align_class = $align ? " align{$align}" : '';
	$btn_width   = $full_width ? 50 : 0;

	// Build the CSS classes for innerContent HTML string.
	if ( $section_style ) {
		$style_class = ' is-style-' . sanitize_html_class( $section_style );
		$color_class = '';
	} else {
		$bg_safe     = sanitize_html_class( $bg_slug );
		$tc_safe     = $text_color_slug ? sanitize_html_class( $text_color_slug ) : '';
		$style_class = '';
		$color_class = " has-{$bg_safe}-background-color has-background"
			. ( $tc_safe ? " has-{$tc_safe}-color has-text-color" : '' );
	}

	// Dispatch to variant inner-content builders.
	if ( $variant === 1 ) {
		$inner = aldus_group_v1_inner( $dist, $btn_width );
	} elseif ( $variant === 2 && $dist->remaining( 'paragraph' ) >= 2 ) {
		$inner = aldus_group_v2_inner( $dist, $btn_width );
	} else {
		$inner = aldus_group_v0_inner( $dist, $btn_width );
	}

	if ( ! $inner ) {
		return '';
	}

	$pad       = aldus_theme_spacing( 'lg' );
	$style_str = "padding-top:{$pad};padding-bottom:{$pad}";
	if ( $radius !== '' ) {
		$style_str = "border-radius:{$radius};{$style_str}";
	}
	return serialize_block(
		array(
			'blockName'    => 'core/group',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerContent' => array(
				'<div class="' . aldus_group_classes( 'constrained' )
				. "{$align_class}{$style_class}{$color_class}\"{$ia_attrs}"
				. " style=\"{$style_str}\">\n{$inner}</div>",
			),
		)
	) . "\n\n";
}

/**
 * Group variant 0 (default): heading + paragraph + optional list + CTA.
 *
 * @internal
 */
function aldus_group_v0_inner( Aldus_Content_Distributor $dist, int $btn_width ): string {
	$subheading = $dist->consume( 'subheading' );
	$para       = $dist->consume( 'paragraph' );
	$list       = $dist->consume( 'list' );
	$cta        = $dist->consume( 'cta' );
	if ( ! $subheading && ! $para && ! $list && ! $cta ) {
		return '';
	}

	$inner = '';
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
		$inner .= aldus_group_build_cta_block( $cta, $btn_width );
	}
	return $inner;
}

/**
 * Group variant 1: dropcap prose paragraphs + CTA.
 *
 * @internal
 */
function aldus_group_v1_inner( Aldus_Content_Distributor $dist, int $btn_width ): string {
	$para1 = $dist->consume( 'paragraph' );
	$para2 = $dist->has( 'paragraph' ) ? $dist->consume( 'paragraph' ) : null;
	$cta   = $dist->consume( 'cta' );
	if ( ! $para1 && ! $para2 && ! $cta ) {
		return '';
	}

	$inner = '';
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
		$inner .= aldus_group_build_cta_block( $cta, $btn_width );
	}
	return $inner;
}

/**
 * Group variant 2: heading + two-column inner layout + CTA.
 * Requires at least 2 paragraphs available (checked by dispatcher).
 *
 * @internal
 */
function aldus_group_v2_inner( Aldus_Content_Distributor $dist, int $btn_width ): string {
	$subheading = $dist->consume( 'subheading' );
	$para1      = $dist->consume( 'paragraph' );
	$para2      = $dist->consume( 'paragraph' );
	$cta        = $dist->consume( 'cta' );
	if ( ! $subheading && ! $para1 && ! $para2 ) {
		return '';
	}

	$inner = '';
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
		$inner .= aldus_group_build_cta_block( $cta, $btn_width );
	}
	return $inner;
}

/**
 * Builds a centered CTA buttons block for group variants.
 *
 * @param array<string, mixed> $cta       Sanitized CTA item.
 * @param int                  $btn_width Optional button width percentage (0 = no fixed width).
 * @internal
 */
function aldus_group_build_cta_block( array $cta, int $btn_width ): string {
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
			'innerContent' => array( '<div class="' . aldus_buttons_classes() . "\">{$btn}</div>" ),
		)
	) . "\n";
}

/**
 * Renders a core/group with a visible border and padding — no background fill.
 * Used for editorial inset feel (Codex, Ledger personalities).
 *
 * @param Aldus_Content_Distributor $dist
 * @param string                    $name       Optional block name.
 * @param int                       $variant    0 = heading/para/optional quote, 1 = heading/para/list/CTA.
 * @param string                    $block_gap  Optional blockGap CSS value.
 * @param string                    $shadow     Optional shadow CSS value.
 */
function aldus_block_group_border( Aldus_Content_Distributor $dist, string $name = '', int $variant = 0, string $block_gap = '', string $shadow = '' ): string {
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

	// Shared content: subheading and paragraph are always consumed.
	$subheading = $dist->consume( 'subheading' );
	$para       = $dist->consume( 'paragraph' );

	$inner = '';
	if ( $subheading ) {
		$inner .= aldus_serialize_heading( esc_html( $subheading['content'] ), 2 );
	}
	if ( $para ) {
		$inner .= aldus_serialize_paragraph( esc_html( $para['content'] ) );
	}

	// Dispatch to variant-specific extra content.
	if ( $variant === 1 ) {
		$inner .= aldus_group_border_v1_extra( $dist );
	} else {
		$inner .= aldus_group_border_v0_extra( $dist );
	}

	if ( ! $inner ) {
		return '';
	}

	$border_style_str = "border-color:currentColor;border-style:solid;border-width:2px;padding-top:{$border_pad};padding-right:{$border_pad};padding-bottom:{$border_pad};padding-left:{$border_pad}";
	if ( $shadow ) {
		$border_style_str .= ";box-shadow:{$shadow}";
	}
	return serialize_block(
		array(
			'blockName'    => 'core/group',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			// phpcs:disable Generic.Files.LineLength.MaxExceeded -- serialize_block innerContent must be a single unbroken string.
			'innerContent' => array( '<div class="' . aldus_group_classes() . " has-border-color\" style=\"{$border_style_str}\">\n{$inner}</div>" ),
			// phpcs:enable Generic.Files.LineLength.MaxExceeded
		)
	) . "\n\n";
}

/**
 * Group border variant 0 (default): optional pull quote.
 *
 * @internal
 */
function aldus_group_border_v0_extra( Aldus_Content_Distributor $dist ): string {
	$quote = $dist->has( 'quote' ) ? $dist->consume( 'quote' ) : null;
	if ( ! $quote ) {
		return '';
	}
	return serialize_block(
		array(
			'blockName'    => 'core/quote',
			'attrs'        => array(),
			'innerBlocks'  => array(),
			'innerContent' => array( '<blockquote class="wp-block-quote"><p>' . esc_html( $quote['content'] ) . '</p></blockquote>' ),
		)
	) . "\n";
}

/**
 * Group border variant 1 (dense): list + CTA button.
 *
 * @internal
 */
function aldus_group_border_v1_extra( Aldus_Content_Distributor $dist ): string {
	$extra     = '';
	$list_item = $dist->has( 'list' ) ? $dist->consume( 'list' ) : null;
	if ( $list_item ) {
		$raw_items   = preg_split( '/\r?\n/', trim( $list_item['content'] ) );
		$raw_items   = array_filter( array_map( 'trim', $raw_items ) );
		$list_markup = aldus_serialize_list( $raw_items );
		if ( $list_markup ) {
			$extra .= $list_markup . "\n";
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
		$extra    .= serialize_block(
			array(
				'blockName'    => 'core/buttons',
				'attrs'        => array(),
				'innerBlocks'  => array(),
				'innerContent' => array( '<div class="' . aldus_buttons_classes() . "\">{$btn}</div>" ),
			)
		) . "\n";
	}
	return $extra;
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

	// Dispatch to variant inner-content builder.
	if ( $variant === 1 ) {
		$inner = aldus_group_gradient_v1_inner( $dist );
	} else {
		$inner = aldus_group_gradient_v0_inner( $dist );
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

	$gradient_style_str = "padding-top:{$gradient_pad};padding-bottom:{$gradient_pad}";
	if ( $shadow ) {
		$gradient_style_str .= ";box-shadow:{$shadow}";
	}
	return serialize_block(
		array(
			'blockName'    => 'core/group',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerContent' => array(
				'<div class="' . aldus_group_classes( 'constrained', 'full', '', '', $gradient_slug )
				. "\" style=\"{$gradient_style_str}\">\n{$inner}</div>",
			),
		)
	) . "\n\n";
}

/**
 * Group gradient variant 0 (default): heading + paragraph.
 *
 * @internal
 */
function aldus_group_gradient_v0_inner( Aldus_Content_Distributor $dist ): string {
	$subheading = $dist->consume( 'subheading' );
	$para       = $dist->consume( 'paragraph' );
	$inner      = '';
	if ( $subheading ) {
		$inner .= aldus_serialize_heading( esc_html( $subheading['content'] ), 2 );
	}
	if ( $para ) {
		$inner .= aldus_serialize_paragraph( esc_html( $para['content'] ) );
	}
	return $inner;
}

/**
 * Group gradient variant 1: testimonial — centered quote + optional attribution.
 *
 * @internal
 */
function aldus_group_gradient_v1_inner( Aldus_Content_Distributor $dist ): string {
	$inner = '';
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
	return $inner;
}

/**
 * Renders a responsive 2–3 column grid of heading+paragraph pairs.
 *
 * @param Aldus_Content_Distributor $dist Content distributor.
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
