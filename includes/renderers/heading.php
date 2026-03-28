<?php
declare(strict_types=1);
/**
 * Heading block renderers — heading, heading_display, heading_kicker.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function aldus_block_heading( Aldus_Content_Distributor $dist, int $level, string $type, bool $use_bindings = false, string $font_size = '', ?string $heading_font = null ): string {
	$item = $dist->consume( $type );
	if ( ! $item ) {
		$fallback = 'headline' === $type ? 'subheading' : 'headline';
		$item     = $dist->consume( $fallback );
	}
	if ( ! $item ) {
		return '';
	}
	$extra_attrs = $font_size ? array( 'fontSize' => $font_size ) : array();
	if ( $heading_font ) {
		$extra_attrs['fontFamily'] = $heading_font;
	}
	return aldus_serialize_heading( esc_html( $item['content'] ), $level, $extra_attrs, $use_bindings ? ( $item['id'] ?? '' ) : '' );
}

/**
 * Renders a large display heading (h1) with optional font size.
 *
 * @param Aldus_Content_Distributor $dist       Content distributor.
 * @param string                    $font_size  Font size slug to apply.
 * @param string                    $name       Optional block name.
 */
function aldus_block_heading_display( Aldus_Content_Distributor $dist, string $font_size, string $name = '', ?string $heading_font = null ): string {
	$item = $dist->consume( 'headline' ) ?? $dist->consume( 'subheading' );
	if ( ! $item ) {
		return '';
	}

	$text  = esc_html( $item['content'] );
	$attrs = array(
		'level'     => 1,
		'fontSize'  => $font_size,
		'textAlign' => 'center',
	);
	if ( $heading_font ) {
		$attrs['fontFamily'] = $heading_font;
	}

	return serialize_block(
		array(
			'blockName'    => 'core/heading',
			'attrs'        => $attrs,
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

function aldus_block_heading_kicker( Aldus_Content_Distributor $dist, string $font_size, string $name = '', ?string $heading_font = null ): string {
	$kicker = $dist->consume( 'subheading' );
	$main   = $dist->consume( 'headline' ) ?? $dist->consume( 'subheading' );

	if ( ! $kicker && ! $main ) {
		return '';
	}

	$markup = '';
	if ( $kicker ) {
		$kicker_attrs = array(
			'level' => 6,
			'style' => array(
				'typography' => array(
					'textTransform' => 'uppercase',
					'letterSpacing' => '0.12em',
				),
			),
		);
		if ( aldus_typography_is_fluid() ) {
			$sizes                    = aldus_get_theme_font_sizes();
			$kicker_attrs['fontSize'] = (string) ( $sizes[0]['slug'] ?? 'small' );
		}
		$markup .= serialize_block(
			array(
				'blockName'    => 'core/heading',
				'attrs'        => $kicker_attrs,
				'innerBlocks'  => array(),
				'innerContent' => array( '<h6 class="wp-block-heading">' . esc_html( $kicker['content'] ) . '</h6>' ),
			)
		) . "\n";
	}
	if ( $main ) {
		$font_size_safe = sanitize_html_class( $font_size );
		$h1_attrs       = array(
			'level'    => 1,
			'fontSize' => $font_size,
		);
		if ( $heading_font ) {
			$h1_attrs['fontFamily'] = $heading_font;
		}
		$heading_ff_cls = aldus_heading_font_family_class( $heading_font );
		$markup        .= serialize_block(
			array(
				'blockName'    => 'core/heading',
				'attrs'        => $h1_attrs,
				'innerBlocks'  => array(),
				'innerContent' => array( "<h1 class=\"wp-block-heading has-{$font_size_safe}-font-size{$heading_ff_cls}\">" . esc_html( $main['content'] ) . '</h1>' ),
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
