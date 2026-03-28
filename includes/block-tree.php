<?php
declare(strict_types=1);
/**
 * Block tree JSON for client-authoritative createBlock() + serialize().
 *
 * Converts parse_blocks() output into plain objects: name, attributes, innerBlocks.
 * The editor uses these to run core save() via @wordpress/blocks — avoiding PHP
 * serialize_block() HTML drift vs client validation.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Converts assembled block markup to a JSON-friendly tree for the block editor.
 *
 * @param string $markup Full serialized block markup (same as response `blocks`).
 * @return list<array{name:string,attributes:array<string,mixed>,innerBlocks?:array}>
 */
function aldus_parse_markup_to_blocks_tree( string $markup ): array {
	if ( ! function_exists( 'parse_blocks' ) ) {
		return array();
	}
	$parsed = parse_blocks( $markup );
	$out    = array();
	foreach ( $parsed as $block ) {
		$node = aldus_parsed_block_to_tree_node( $block );
		if ( null !== $node ) {
			$out[] = $node;
		}
	}
	return $out;
}

/**
 * @param array<string,mixed> $block Single block from parse_blocks().
 * @return array{name:string,attributes:array<string,mixed>,innerBlocks?:array}|null
 */
function aldus_parsed_block_to_tree_node( array $block ): ?array {
	$name = isset( $block['blockName'] ) ? (string) $block['blockName'] : '';
	if ( '' === $name ) {
		return null;
	}
	$attrs = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();

	$node = array(
		'name'       => $name,
		'attributes' => $attrs,
	);

	if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
		$inner = array();
		foreach ( $block['innerBlocks'] as $inner_block ) {
			if ( ! is_array( $inner_block ) ) {
				continue;
			}
			$child = aldus_parsed_block_to_tree_node( $inner_block );
			if ( null !== $child ) {
				$inner[] = $child;
			}
		}
		$node['innerBlocks'] = $inner;
	}

	return $node;
}
