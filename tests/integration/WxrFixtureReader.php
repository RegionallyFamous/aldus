<?php
declare(strict_types=1);

/**
 * Streams WordPress WXR (RSS 2.0 + wp/content namespaces) and yields post-like rows.
 *
 * Used only by PHPUnit integration tests — not loaded by the plugin.
 */
final class Aldus_Wxr_Fixture_Reader {

	private const NS_CONTENT = 'http://purl.org/rss/1.0/modules/content/';

	private const NS_WP = 'http://wordpress.org/export/1.2/';

	/**
	 * @return list<array{key: string, title: string, type: string, content: string}>
	 */
	public static function parse_file( string $path ): array {
		$reader = new XMLReader();
		if ( ! $reader->open( $path ) ) {
			throw new RuntimeException( "Could not open WXR file: {$path}" );
		}

		$rows        = array();
		$item_depth  = -1;
		/** @var array{post_id: string, title: string, type: string, content: string}|null $current */
		$current     = null;
		$seq         = 0;

		try {
			while ( $reader->read() ) {
				if ( $reader->nodeType === XMLReader::ELEMENT ) {
					$ln = $reader->localName;
					$ns = (string) $reader->namespaceURI;

					if ( 'item' === $ln && '' === $ns && ! $reader->isEmptyElement ) {
						$item_depth = $reader->depth;
						$current    = array(
							'post_id' => '',
							'title'   => '',
							'type'    => 'post',
							'content' => '',
						);
						continue;
					}

					if ( null !== $current && $reader->depth === $item_depth + 1 ) {
						if ( 'title' === $ln && '' === $ns ) {
							$current['title'] = self::read_element_text( $reader );
						} elseif ( 'encoded' === $ln && self::NS_CONTENT === $ns ) {
							$current['content'] = self::read_element_text( $reader );
						} elseif ( 'post_type' === $ln && self::NS_WP === $ns ) {
							$current['type'] = self::read_element_text( $reader );
						} elseif ( 'post_id' === $ln && self::NS_WP === $ns ) {
							$current['post_id'] = self::read_element_text( $reader );
						}
					}
				} elseif ( XMLReader::END_ELEMENT === $reader->nodeType ) {
					if (
						null !== $current
						&& 'item' === $reader->localName
						&& '' === (string) $reader->namespaceURI
						&& $reader->depth === $item_depth
					) {
						$row = self::normalize_row( $current, ++$seq );
						if ( null !== $row ) {
							$rows[] = $row;
						}
						$current    = null;
						$item_depth = -1;
					}
				}
			}
		} finally {
			$reader->close();
		}

		return $rows;
	}

	/**
	 * @param array{post_id: string, title: string, type: string, content: string} $raw
	 *
	 * @return array{key: string, title: string, type: string, content: string}|null
	 */
	private static function normalize_row( array $raw, int $seq ): ?array {
		$type = strtolower( trim( $raw['type'] ) );
		if ( ! in_array( $type, array( 'post', 'page' ), true ) ) {
			return null;
		}

		$pid = trim( $raw['post_id'] );
		$key = '' !== $pid ? "post_id:{$pid}" : sprintf( 'item-%d', $seq );

		return array(
			'key'     => $key,
			'title'   => trim( $raw['title'] ),
			'type'    => $type,
			'content' => $raw['content'],
		);
	}

	private static function read_element_text( XMLReader $reader ): string {
		if ( $reader->isEmptyElement ) {
			return '';
		}
		$depth = $reader->depth;
		$buf   = '';
		while ( $reader->read() ) {
			if ( XMLReader::TEXT === $reader->nodeType || XMLReader::CDATA === $reader->nodeType ) {
				$buf .= $reader->value;
			}
			if ( XMLReader::END_ELEMENT === $reader->nodeType && $reader->depth === $depth ) {
				break;
			}
		}

		return $buf;
	}
}
