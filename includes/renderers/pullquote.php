<?php
declare(strict_types=1);
/**
 * Pullquote block renderers — pullquote, pullquote_centered.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
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
