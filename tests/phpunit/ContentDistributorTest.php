<?php
declare(strict_types=1);

namespace Aldus\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Tests for Aldus_Content_Distributor in includes/templates.php.
 */
class ContentDistributorTest extends TestCase {

	// -----------------------------------------------------------------------
	// Helpers
	// -----------------------------------------------------------------------

	/**
	 * Build a minimal item array from a list of types.
	 *
	 * @param list<string> $types
	 * @return list<array{type:string,content:string,url:string}>
	 */
	private function make_items( array $types ): array {
		return array_map(
			fn( $type ) => [
				'type'    => $type,
				'content' => "Content for {$type}",
				'url'     => 'image' === $type ? 'https://example.com/img.jpg' : '',
			],
			$types
		);
	}

	// -----------------------------------------------------------------------
	// Construction
	// -----------------------------------------------------------------------

	/** @test */
	public function empty_items_array_is_accepted(): void {
		$dist = new \Aldus_Content_Distributor( [] );
		$this->assertNull( $dist->consume( 'paragraph' ) );
		$this->assertFalse( $dist->has( 'paragraph' ) );
		$this->assertSame( 0, $dist->remaining( 'paragraph' ) );
	}

	/** @test */
	public function items_with_empty_type_are_ignored(): void {
		$dist = new \Aldus_Content_Distributor( [
			[ 'type' => '', 'content' => 'ignored', 'url' => '' ],
			[ 'type' => 'paragraph', 'content' => 'kept', 'url' => '' ],
		] );

		$this->assertSame( 1, $dist->remaining( 'paragraph' ) );
		$this->assertSame( 0, $dist->remaining( '' ) );
	}

	// -----------------------------------------------------------------------
	// consume()
	// -----------------------------------------------------------------------

	/** @test */
	public function consume_returns_items_in_fifo_order(): void {
		$dist = new \Aldus_Content_Distributor( $this->make_items( [ 'paragraph', 'paragraph', 'paragraph' ] ) );

		$first  = $dist->consume( 'paragraph' );
		$second = $dist->consume( 'paragraph' );
		$third  = $dist->consume( 'paragraph' );
		$fourth = $dist->consume( 'paragraph' );

		$this->assertSame( 'Content for paragraph', $first['content'] );
		$this->assertSame( 'Content for paragraph', $second['content'] );
		$this->assertSame( 'Content for paragraph', $third['content'] );
		$this->assertNull( $fourth, 'Exhausted pool should return null' );
	}

	/** @test */
	public function consume_returns_null_for_missing_type(): void {
		$dist = new \Aldus_Content_Distributor( $this->make_items( [ 'paragraph' ] ) );
		$this->assertNull( $dist->consume( 'image' ) );
	}

	/** @test */
	public function consume_advances_only_the_requested_type(): void {
		$dist = new \Aldus_Content_Distributor( $this->make_items( [ 'paragraph', 'image', 'paragraph' ] ) );

		$dist->consume( 'paragraph' );
		$this->assertTrue( $dist->has( 'paragraph' ), 'Second paragraph should still be available' );
		$this->assertTrue( $dist->has( 'image' ), 'Image pool should be unaffected' );
	}

	// -----------------------------------------------------------------------
	// has()
	// -----------------------------------------------------------------------

	/** @test */
	public function has_tracks_availability(): void {
		$dist = new \Aldus_Content_Distributor( $this->make_items( [ 'image' ] ) );

		$this->assertTrue( $dist->has( 'image' ) );
		$this->assertFalse( $dist->has( 'quote' ) );

		$dist->consume( 'image' );
		$this->assertFalse( $dist->has( 'image' ), 'has() must return false after pool is exhausted' );
	}

	// -----------------------------------------------------------------------
	// peek()
	// -----------------------------------------------------------------------

	/** @test */
	public function peek_does_not_advance_cursor(): void {
		$dist = new \Aldus_Content_Distributor( $this->make_items( [ 'paragraph' ] ) );

		$peeked   = $dist->peek( 'paragraph' );
		$consumed = $dist->consume( 'paragraph' );

		$this->assertNotNull( $peeked );
		$this->assertSame( $peeked['content'], $consumed['content'] );
	}

	/** @test */
	public function peek_returns_null_for_missing_type(): void {
		$dist = new \Aldus_Content_Distributor( [] );
		$this->assertNull( $dist->peek( 'headline' ) );
	}

	/** @test */
	public function peek_returns_null_when_pool_is_exhausted(): void {
		$dist = new \Aldus_Content_Distributor( $this->make_items( [ 'paragraph' ] ) );
		$dist->consume( 'paragraph' );
		$this->assertNull( $dist->peek( 'paragraph' ) );
	}

	// -----------------------------------------------------------------------
	// remaining()
	// -----------------------------------------------------------------------

	/** @test */
	public function remaining_decrements_on_consume(): void {
		$dist = new \Aldus_Content_Distributor( $this->make_items( [ 'paragraph', 'paragraph', 'paragraph' ] ) );

		$this->assertSame( 3, $dist->remaining( 'paragraph' ) );
		$dist->consume( 'paragraph' );
		$this->assertSame( 2, $dist->remaining( 'paragraph' ) );
		$dist->consume( 'paragraph' );
		$this->assertSame( 1, $dist->remaining( 'paragraph' ) );
		$dist->consume( 'paragraph' );
		$this->assertSame( 0, $dist->remaining( 'paragraph' ) );
	}

	/** @test */
	public function remaining_returns_zero_for_unknown_type(): void {
		$dist = new \Aldus_Content_Distributor( $this->make_items( [ 'paragraph' ] ) );
		$this->assertSame( 0, $dist->remaining( 'image' ) );
	}

	// -----------------------------------------------------------------------
	// reset()
	// -----------------------------------------------------------------------

	/** @test */
	public function reset_restores_all_cursors(): void {
		$dist = new \Aldus_Content_Distributor( $this->make_items( [ 'paragraph', 'image' ] ) );

		$dist->consume( 'paragraph' );
		$dist->consume( 'image' );
		$this->assertFalse( $dist->has( 'paragraph' ) );
		$this->assertFalse( $dist->has( 'image' ) );

		$dist->reset();
		$this->assertTrue( $dist->has( 'paragraph' ), 'reset() must restore paragraph pool' );
		$this->assertTrue( $dist->has( 'image' ), 'reset() must restore image pool' );
	}

	// -----------------------------------------------------------------------
	// prepare()
	// -----------------------------------------------------------------------

	/** @test */
	public function prepare_resets_cursors(): void {
		$dist = new \Aldus_Content_Distributor( $this->make_items( [ 'paragraph' ] ) );
		$dist->consume( 'paragraph' );

		$dist->prepare();
		$this->assertTrue( $dist->has( 'paragraph' ) );
	}

	/** @test */
	public function prepare_sorts_quotes_shortest_first(): void {
		$dist = new \Aldus_Content_Distributor( [
			[ 'type' => 'quote', 'content' => 'A longer quotation that takes more space.', 'url' => '' ],
			[ 'type' => 'quote', 'content' => 'Short.', 'url' => '' ],
		] );

		$dist->prepare();

		$first = $dist->consume( 'quote' );
		$this->assertSame( 'Short.', $first['content'], 'Shortest quote should come first after prepare()' );
	}
}
