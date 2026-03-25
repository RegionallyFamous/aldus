<?php
declare(strict_types=1);
/**
 * Text block renderers — paragraph, paragraph_lead, quote, quote_attributed, code.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function aldus_block_paragraph( Aldus_Content_Distributor $dist, bool $drop_cap = false, bool $use_bindings = false ): string {
	$item = $dist->consume( 'paragraph' );
	if ( ! $item ) {
		return '';
	}
	return aldus_serialize_paragraph( esc_html( $item['content'] ), $drop_cap, $use_bindings ? ( $item['id'] ?? '' ) : '' );
}

/**
 * Renders a core/quote block from the first available quote item.
 *
 * @param Aldus_Content_Distributor $dist Content distributor.
 * @return string Serialised block markup, or '' when no quote item is available.
 */
function aldus_block_quote( Aldus_Content_Distributor $dist ): string {
	$item = $dist->consume( 'quote' );
	if ( ! $item ) {
		return '';
	}

	$text = esc_html( $item['content'] );

	return serialize_block(
		array(
			'blockName'    => 'core/quote',
			'attrs'        => array(),
			'innerBlocks'  => array(),
			'innerContent' => array( "<blockquote class=\"wp-block-quote\"><p>{$text}</p></blockquote>" ),
		)
	) . "\n\n";
}

// ---------------------------------------------------------------------------
// Cover variants: minimal, split, gradient
// ---------------------------------------------------------------------------

/**
 * Renders a core/quote block with an optional attribution line (cite).
 *
 * @param Aldus_Content_Distributor $dist Content distributor.
 * @return string Serialised block markup, or '' when no quote item is available.
 */
function aldus_block_quote_attributed( Aldus_Content_Distributor $dist ): string {
	$quote = $dist->consume( 'quote' );
	if ( ! $quote ) {
		return '';
	}

	$text        = esc_html( $quote['content'] );
	$attribution = $dist->has( 'subheading' ) ? $dist->consume( 'subheading' ) : null;
	$cite_html   = $attribution ? '<cite>' . esc_html( $attribution['content'] ) . '</cite>' : '';

	return serialize_block(
		array(
			'blockName'    => 'core/quote',
			'attrs'        => array(),
			'innerBlocks'  => array(),
			'innerContent' => array( "<blockquote class=\"wp-block-quote\"><p>{$text}</p>{$cite_html}</blockquote>" ),
		)
	) . "\n\n";
}

// ---------------------------------------------------------------------------
// Gradient theme helpers
// ---------------------------------------------------------------------------

/**
 * Renders a core/code block from the first available code item.
 *
 * @param Aldus_Content_Distributor $dist Content distributor.
 * @return string Serialised block markup, or '' when no code item is available.
 */
function aldus_block_code( Aldus_Content_Distributor $dist ): string {
	$item = $dist->consume( 'code' );
	if ( ! $item || empty( trim( $item['content'] ) ) ) {
		return '';
	}

	$code = esc_html( $item['content'] );

	return serialize_block(
		array(
			'blockName'    => 'core/code',
			'attrs'        => array(),
			'innerBlocks'  => array(),
			'innerContent' => array( "<pre class=\"wp-block-code\"><code>{$code}</code></pre>" ),
		)
	) . "\n\n";
}

/**
 * Renders a paragraph:lead block — a paragraph with the theme's large font size.
 *
 * @param Aldus_Content_Distributor $dist
 * @param array                     $theme  Precomputed theme context (needs 'medium' or 'large' key).
 * @return string
 */
function aldus_block_paragraph_lead( Aldus_Content_Distributor $dist, array $theme ): string {
	$item = $dist->consume( 'paragraph' );
	if ( ! $item ) {
		return '';
	}

	$font_size = $theme['medium'] ?? $theme['large'] ?? 'large';
	$fs_safe   = sanitize_html_class( $font_size );
	$text      = esc_html( $item['content'] );

	return serialize_block(
		array(
			'blockName'    => 'core/paragraph',
			'attrs'        => array( 'fontSize' => $font_size ),
			'innerBlocks'  => array(),
			'innerContent' => array( "<p class=\"has-{$fs_safe}-font-size\">{$text}</p>" ),
		)
	) . "\n\n";
}
