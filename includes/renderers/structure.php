<?php
declare(strict_types=1);
/**
 * Structure block renderers — separator, cta, list, table.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

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

	$attrs = array(
		'backgroundColor' => $color_slug,
		'className'       => ltrim( $style_class ),
	);
	if ( $align_attr ) {
		$attrs['align'] = $align_attr;
	}

	// WordPress 6.8+ separators with a color require the full class set:
	// has-text-color + has-{slug}-color + has-alpha-channel-opacity +
	// has-{slug}-background-color + has-background.
	return serialize_block(
		array(
			'blockName'    => 'core/separator',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerContent' => array( "<hr class=\"wp-block-separator{$align_class} has-text-color has-{$color_safe}-color has-alpha-channel-opacity has-{$color_safe}-background-color has-background{$style_class}\"/>" ),
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
 * Renders a core/table block from CSV-like textarea content.
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
