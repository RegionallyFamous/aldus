<?php
declare(strict_types=1);
/**
 * Layout block renderers — row_stats, details_accordion.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function aldus_block_row_stats( Aldus_Content_Distributor $dist, string $ia_attrs = '' ): string {
	$pairs = array();
	for ( $i = 0; $i < 4; $i++ ) {
		$heading = $dist->has( 'subheading' ) ? $dist->consume( 'subheading' ) : null;
		$para    = $dist->has( 'paragraph' ) ? $dist->consume( 'paragraph' ) : null;
		if ( ! $heading && ! $para ) {
			break;
		}
		$pairs[] = array(
			'heading' => $heading,
			'para'    => $para,
		);
	}

	if ( count( $pairs ) < 2 ) {
		return '';
	}

	$inner = '';
	foreach ( $pairs as $pair ) {
		$stat_inner = '';
		if ( $pair['heading'] ) {
			$stat_inner .= aldus_serialize_heading( esc_html( $pair['heading']['content'] ), 3 );
		}
		if ( $pair['para'] ) {
			$stat_inner .= aldus_serialize_paragraph( esc_html( $pair['para']['content'] ) );
		}
		$inner .= serialize_block(
			array(
				'blockName'    => 'core/group',
				'attrs'        => array( 'layout' => array( 'type' => 'constrained' ) ),
				'innerBlocks'  => array(),
				'innerContent' => array( '<div class="' . aldus_group_classes( 'constrained' ) . "\">\n{$stat_inner}</div>" ),
			)
		) . "\n";
	}

	return serialize_block(
		array(
			'blockName'    => 'core/group',
			'attrs'        => array(
				'layout'   => array(
					'type'           => 'flex',
					'flexWrap'       => 'nowrap',
					'justifyContent' => 'space-between',
				),
				'style'    => array(
					'spacing' => array(
						'blockGap' => aldus_theme_spacing( 'sm' ),
						'padding'  => array(
							'top'    => aldus_theme_spacing( 'md' ),
							'bottom' => aldus_theme_spacing( 'md' ),
						),
					),
				),
				'metadata' => array( 'name' => 'Stats Row' ),
			),
			'innerBlocks'  => array(),
			'innerContent' => array(
				'<div class="' . aldus_group_classes( 'flex' ) . "\"{$ia_attrs}>\n{$inner}</div>",
			),
		)
	) . "\n\n";
}

/**
 * Renders a series of core/details (accordion) blocks (details:accordion token).
 * Consumes alternating subheading+paragraph pairs as summary+body.
 *
 * @param Aldus_Content_Distributor $dist
 * @return string
 */

function aldus_block_details_accordion( Aldus_Content_Distributor $dist, string $ia_attrs = '' ): string {
	$output = '';
	$count  = 0;

	while ( $count < 5 && ( $dist->has( 'subheading' ) || $dist->has( 'paragraph' ) ) ) {
		$summary = $dist->has( 'subheading' ) ? $dist->consume( 'subheading' ) : null;
		$body    = $dist->has( 'paragraph' ) ? $dist->consume( 'paragraph' ) : null;
		if ( ! $summary && ! $body ) {
			break;
		}

		$summary_text = $summary ? esc_html( $summary['content'] ) : '';
		$body_text    = $body ? esc_html( $body['content'] ) : '';
		// Interactivity API attributes belong on the outermost wrapper div,
		// not on the semantic <details> element — putting them on <details>
		// can interfere with the browser's native open/close behaviour.
		$inner_html = "<details class=\"wp-block-details\"><summary>{$summary_text}</summary>\n"
			. ( $body_text ? "<p>{$body_text}</p>\n" : '' )
			. '</details>';

		$output .= serialize_block(
			array(
				'blockName'    => 'core/details',
				'attrs'        => array( 'showContent' => false ),
				'innerBlocks'  => array(),
				'innerContent' => array( $inner_html ),
			)
		) . "\n";
		++$count;
	}

	if ( ! $output ) {
		return '';
	}

	// Wrap all <details> in a flex group so the Interactivity API directive
	// lands on the outer div and the JS can query child <details> elements
	// without touching the native open attribute.
	return serialize_block(
		array(
			'blockName'    => 'core/group',
			'attrs'        => array(
				'layout' => array(
					'type'        => 'flex',
					'orientation' => 'vertical',
				),
			),
			'innerBlocks'  => array(),
			'innerContent' => array(
				'<div class="' . aldus_group_classes( 'flex' ) . "\" {$ia_attrs}>\n{$output}</div>",
			),
		)
	) . "\n\n";
}

/**
 * Renders a core/code block (code:block token).
 *
 * @param Aldus_Content_Distributor $dist
 * @return string
 */
