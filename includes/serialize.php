<?php
declare(strict_types=1);
/**
 * Low-level block serialization helpers — heading, paragraph, button, list.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ---------------------------------------------------------------------------
// Low-level serialization helpers — accept pre-escaped strings, return markup.
// The aldus_block_*() functions above handle content distribution; these handle
// markup. Composite renderers call these directly instead of repeating the
// serialize_block() structure inline.
// ---------------------------------------------------------------------------

/**
 * Serialises a single core/heading block from an already-escaped text string.
 *
 * @param string $text        Escaped heading text (run through esc_html before passing).
 * @param int    $level       Heading level 1–6.
 * @param array  $extra_attrs Additional block attributes merged over the defaults.
 * @param string $item_id     When non-empty, adds a Block Bindings attr so the
 *                            heading content resolves from _aldus_items post meta.
 */
function aldus_serialize_heading( string $text, int $level, array $extra_attrs = array(), string $item_id = '' ): string {
	// WordPress core only accepts heading levels 1–6; clamp to prevent invalid block output.
	$level = max( 1, min( 6, $level ) );
	$attrs = array_merge( array( 'level' => $level ), $extra_attrs );
	$lh = aldus_theme_custom_line_height( 'heading' );
	if ( $lh !== '' ) {
		$style      = $attrs['style'] ?? array();
		$typography = $style['typography'] ?? array();
		$typography['lineHeight'] = $lh;
		$style['typography']      = $typography;
		$attrs['style']           = $style;
	}
	if ( $item_id ) {
		$attrs['metadata'] = array(
			'bindings' => array(
				'content' => array(
					'source' => 'aldus/item',
					'args'   => array(
						'id'    => $item_id,
						'field' => 'content',
					),
				),
			),
		);
	}
	return serialize_block(
		array(
			'blockName'    => 'core/heading',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerContent' => array( "<h{$level} class=\"wp-block-heading\">{$text}</h{$level}>" ),
		)
	) . "\n\n";
}

/**
 * Serialises a core/paragraph block from an already-escaped text string.
 *
 * @param string $text      Escaped paragraph text.
 * @param bool   $drop_cap  Whether to apply the drop-cap style.
 * @param string $item_id   When non-empty, adds a Block Bindings attr so the
 *                          paragraph content resolves from _aldus_items post meta.
 */
function aldus_serialize_paragraph( string $text, bool $drop_cap = false, string $item_id = '' ): string {
	$attrs = $drop_cap ? array( 'dropCap' => true ) : array();
	$lh    = aldus_theme_custom_line_height( 'body' );
	if ( $lh !== '' ) {
		$attrs['style'] = array(
			'typography' => array( 'lineHeight' => $lh ),
		);
	}
	if ( $item_id ) {
		$attrs['metadata'] = array(
			'bindings' => array(
				'content' => array(
					'source' => 'aldus/item',
					'args'   => array(
						'id'    => $item_id,
						'field' => 'content',
					),
				),
			),
		);
	}
	$class = $drop_cap ? ' class="has-drop-cap"' : '';
	return serialize_block(
		array(
			'blockName'    => 'core/paragraph',
			'attrs'        => $attrs,
			'innerBlocks'  => array(),
			'innerContent' => array( "<p{$class}>{$text}</p>" ),
		)
	) . "\n\n";
}

/**
 * Serialises a core/buttons + core/button pair for a CTA item.
 *
 * Handles the filled/outlined/ghost variants. This is the single source of
 * truth for button markup — call it from any renderer that needs a button
 * rather than repeating the serialize_block() chain.
 *
 * @param string $label       Escaped button label.
 * @param string $url         Escaped button URL.
 * @param string $color_slug  Background color slug for the filled variant.
 * @param string $variant     'filled' | 'outline' | 'ghost'.
 * @param string $dark_slug   Dark color slug used by the ghost variant.
 * @param string $item_id     When non-empty, binds the button text to _aldus_items meta.
 */
/**
 * @param string $label      Button label text.
 * @param string $url        Button href URL.
 * @param string $color_slug Background color slug for filled/ghost variants.
 * @param string $variant    'filled' | 'outline' | 'ghost' | 'plain'.
 * @param string $dark_slug  Dark color slug for ghost variant.
 * @param string $item_id    Item ID for block bindings.
 * @param int    $width      Optional width percentage (25, 50, 75, 100); 0 = auto.
 */
function aldus_serialize_button(
	string $label,
	string $url,
	string $color_slug,
	string $variant = 'filled',
	string $dark_slug = 'black',
	string $item_id = '',
	int $width = 0
): string {
	$color_safe = sanitize_html_class( $color_slug );

	if ( 'outline' === $variant ) {
		$btn_attrs   = array(
			'textColor' => $color_slug,
			'className' => 'is-style-outline',
			'style'     => array( 'typography' => array( 'fontWeight' => '600' ) ),
		);
		$btn_content = '<div class="wp-block-button is-style-outline">'
			. "<a class=\"wp-block-button__link has-{$color_safe}-color has-text-color"
			. " wp-element-button\" href=\"{$url}\" style=\"font-weight:600\">{$label}</a></div>";
	} elseif ( 'ghost' === $variant ) {
		$dark_safe   = sanitize_html_class( $dark_slug );
		$btn_attrs   = array(
			'backgroundColor' => 'white',
			'textColor'       => $dark_slug,
			'style'           => array( 'typography' => array( 'fontWeight' => '600' ) ),
		);
		$btn_content = '<div class="wp-block-button">'
			. "<a class=\"wp-block-button__link has-white-background-color has-{$dark_safe}-color"
			. ' has-text-color has-background wp-element-button"'
			. " href=\"{$url}\" style=\"font-weight:600\">{$label}</a></div>";
	} elseif ( 'plain' === $variant ) {
		// No explicit color attrs — let the theme's global button styles apply.
		$btn_attrs   = array();
		$btn_content = '<div class="wp-block-button">'
			. "<a class=\"wp-block-button__link wp-element-button\" href=\"{$url}\">{$label}</a></div>";
	} else {
		// 'filled' (legacy)
		$btn_attrs   = array(
			'backgroundColor' => $color_slug,
			'textColor'       => 'white',
			'style'           => array( 'typography' => array( 'fontWeight' => '600' ) ),
		);
		$btn_content = '<div class="wp-block-button">'
			. "<a class=\"wp-block-button__link has-{$color_safe}-background-color"
			. ' has-white-color has-text-color has-background wp-element-button"'
			. " href=\"{$url}\" style=\"font-weight:600\">{$label}</a></div>";
	}

	if ( $item_id ) {
		$btn_attrs['metadata'] = array(
			'bindings' => array(
				'text' => array(
					'source' => 'aldus/item',
					'args'   => array(
						'id'    => $item_id,
						'field' => 'content',
					),
				),
			),
		);
	}
	if ( $width > 0 ) {
		$btn_attrs['width'] = $width;
	}

	$btn_markup = serialize_block(
		array(
			'blockName'    => 'core/button',
			'attrs'        => $btn_attrs,
			'innerBlocks'  => array(),
			'innerContent' => array( $btn_content ),
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
			'innerContent' => array( '<div class="' . aldus_buttons_classes() . "\">\n{$btn_markup}\n</div>" ),
		)
	) . "\n\n";
}

/**
 * Serialises a core/list block from an array of plain-text item strings.
 *
 * serialize_block() requires null placeholders in innerContent for each inner
 * block — passing pre-serialised HTML as a flat string causes WordPress's block
 * parser to flag the output as invalid on re-parse.
 *
 * @param array<int, string> $raw_items Plain-text list items (trimmed, non-empty).
 * @return string Serialised block markup, or '' when $raw_items is empty.
 */
function aldus_serialize_list( array $raw_items ): string {
	if ( empty( $raw_items ) ) {
		return '';
	}

	$inner_blocks  = array();
	$inner_content = array( '<ul class="wp-block-list">' );

	foreach ( $raw_items as $li ) {
		$inner_blocks[]  = array(
			'blockName'    => 'core/list-item',
			'attrs'        => array(),
			'innerBlocks'  => array(),
			'innerContent' => array( '<li>' . esc_html( $li ) . '</li>' ),
		);
		$inner_content[] = null; // placeholder consumed by serialize_block()
	}

	$inner_content[] = '</ul>';

	return serialize_block(
		array(
			'blockName'    => 'core/list',
			'attrs'        => array(),
			'innerBlocks'  => $inner_blocks,
			'innerContent' => $inner_content,
		)
	);
}
