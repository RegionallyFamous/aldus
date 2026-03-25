<?php
declare(strict_types=1);
/**
 * Aldus_Content_Distributor — distributes content items into block token slots.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ---------------------------------------------------------------------------
// Content Distributor
// ---------------------------------------------------------------------------

/**
 * Distributes sanitized content items into block token slots.
 * Each content type has its own cursor; items are consumed in order.
 */
class Aldus_Content_Distributor {

	/** @var array<string, list<array{type:string,content:string,url:string}>> */
	private array $pools = array();

	/** @var array<string, int> */
	private array $cursors = array();

	/**
	 * @param list<array{type:string,content:string,url:string}> $items
	 */
	public function __construct( array $items ) {
		foreach ( $items as $item ) {
			$type = sanitize_key( $item['type'] ?? '' );
			if ( $type ) {
				$this->pools[ $type ][] = $item;
			}
		}
		foreach ( array_keys( $this->pools ) as $type ) {
			$this->cursors[ $type ] = 0;
		}
	}

	/**
	 * Returns and advances the cursor for a type, or null if exhausted.
	 *
	 * @param string $type
	 * @return array{type:string,content:string,url:string}|null
	 */
	public function consume( string $type ): ?array {
		if ( ! isset( $this->pools[ $type ] ) ) {
			return null;
		}
		$cursor = $this->cursors[ $type ] ?? 0;
		if ( $cursor >= count( $this->pools[ $type ] ) ) {
			return null;
		}
		$this->cursors[ $type ] = $cursor + 1;
		return $this->pools[ $type ][ $cursor ];
	}

	/** Resets all cursors for re-use across layouts. */
	public function reset(): void {
		foreach ( array_keys( $this->pools ) as $type ) {
			$this->cursors[ $type ] = 0;
		}
	}

	/**
	 * True if the type has at least one unconsumed item.
	 *
	 * @param string $type
	 */
	public function has( string $type ): bool {
		return isset( $this->pools[ $type ] ) &&
			( $this->cursors[ $type ] ?? 0 ) < count( $this->pools[ $type ] );
	}

	/**
	 * Returns the next item without advancing the cursor.
	 *
	 * @param string $type
	 * @return array{type:string,content:string,url:string}|null
	 */
	public function peek( string $type ): ?array {
		if ( ! isset( $this->pools[ $type ] ) ) {
			return null;
		}
		$cursor = $this->cursors[ $type ] ?? 0;
		return $this->pools[ $type ][ $cursor ] ?? null;
	}

	/**
	 * Returns the count of remaining unconsumed items for a type.
	 *
	 * @param string $type
	 * @return int
	 */
	public function remaining( string $type ): int {
		if ( ! isset( $this->pools[ $type ] ) ) {
			return 0;
		}
		return max( 0, count( $this->pools[ $type ] ) - ( $this->cursors[ $type ] ?? 0 ) );
	}

	/**
	 * Prepares pools before a render pass.
	 *
	 * Resets all cursors to 0 (guards against stale state from a previous
	 * layout's partial run) and sorts the quote pool shortest-first so
	 * pullquote tokens — which appear early in most sequences — get the
	 * punchiest quote while longer ones fall to the plain core/quote slots.
	 */
	public function prepare(): void {
		foreach ( array_keys( $this->pools ) as $type ) {
			$this->cursors[ $type ] = 0;
		}

		if ( isset( $this->pools['quote'] ) && count( $this->pools['quote'] ) > 1 ) {
			usort(
				$this->pools['quote'],
				// mb_strlen for accurate character count with UTF-8 / non-Latin quotes.
				fn( $a, $b ) => mb_strlen( (string) ( $a['content'] ?? '' ) ) <=> mb_strlen( (string) ( $b['content'] ?? '' ) )
			);
		}
	}
}
