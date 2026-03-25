<?php
declare(strict_types=1);
/**
 * Input sanitization — tokens and content items.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Sanitizes a single token string.
 *
 * Token names use lowercase letters, digits, colons, hyphens, and underscores
 * (e.g. "cover:dark", "columns:28-72"). sanitize_key() would strip the colon
 * and corrupt these names, so we use a custom allow-list regex instead.
 *
 * @param mixed $token
 * @return string
 */
function aldus_sanitize_token( mixed $token ): string {
	return preg_replace( '/[^a-z0-9:_\-]/', '', strtolower( (string) $token ) ) ?? '';
}

/** Maximum character length for a single content string. */
const ALDUS_MAX_CONTENT_LENGTH = 5000;

/** Content types the distributor and renderers understand. */
const ALDUS_VALID_ITEM_TYPES = array(
	'headline',
	'subheading',
	'paragraph',
	'quote',
	'image',
	'cta',
	'list',
	'video',
	'table',
	'gallery',
	'code',
	'details',
);

/**
 * Sanitizes a single content item from the request.
 *
 * @param mixed $raw  Expected to be an array; non-arrays are rejected with an empty-type item.
 * @return array{type:string,content:string,url:string,id:string,mediaId:int}
 */
function aldus_sanitize_item( mixed $raw ): array {
	if ( ! is_array( $raw ) ) {
		return array(
			'type'    => '',
			'content' => '',
			'url'     => '',
			'id'      => '',
			'mediaId' => 0,
		);
	}

	$type = sanitize_key( $raw['type'] ?? '' );
	// Reject items with unrecognised types early so they never reach the distributor.
	if ( ! in_array( $type, ALDUS_VALID_ITEM_TYPES, true ) ) {
		return array(
			'type'    => '',
			'content' => '',
			'url'     => '',
			'id'      => '',
			'mediaId' => 0,
		);
	}

	$content = sanitize_textarea_field( $raw['content'] ?? '' );
	if ( mb_strlen( $content ) > ALDUS_MAX_CONTENT_LENGTH ) {
		$content = mb_substr( $content, 0, ALDUS_MAX_CONTENT_LENGTH );
	}

	$item = array(
		'type'    => $type,
		'content' => $content,
		'url'     => esc_url_raw( $raw['url'] ?? '' ),
		'id'      => sanitize_text_field( (string) ( $raw['id'] ?? '' ) ),
		'mediaId' => absint( $raw['mediaId'] ?? 0 ),
	);

	// Gallery items carry an array of image URLs and optional attachment IDs.
	if ( isset( $raw['urls'] ) && is_array( $raw['urls'] ) ) {
		$item['urls'] = array_values(
			array_filter(
				array_map( 'esc_url_raw', array_slice( $raw['urls'], 0, 20 ) ),
				fn( $u ) => ! empty( $u )
			)
		);
	}
	if ( isset( $raw['mediaIds'] ) && is_array( $raw['mediaIds'] ) ) {
		$item['mediaIds'] = array_map( 'absint', array_slice( $raw['mediaIds'], 0, 20 ) );
	}

	return $item;
}
