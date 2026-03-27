<?php
declare(strict_types=1);

namespace Aldus\Tests;

use Aldus_Content_Distributor;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for pullquote renderers — borderColor handling (wide vs centered).
 */
class PullquoteRendererTest extends TestCase {

	/**
	 * @return Aldus_Content_Distributor
	 */
	private function quote_dist(): Aldus_Content_Distributor {
		return new Aldus_Content_Distributor(
			[
				[
					'type'    => 'quote',
					'content' => 'The pullquote body text.',
					'url'     => '',
					'id'      => 'q-test',
					'mediaId' => 0,
				],
			]
		);
	}

	/** @test */
	public function pullquote_wide_serializes_border_color_attr(): void {
		$out = aldus_block_pullquote( $this->quote_dist(), 'accent', 'solid-color', false, [] );

		$this->assertStringContainsString( '"borderColor":"accent"', $out );
		$this->assertStringContainsString( 'has-accent-border-color', $out );
	}

	/** @test */
	public function pullquote_centered_with_color_slug_serializes_border_color(): void {
		$out = aldus_block_pullquote_centered( $this->quote_dist(), '', 'accent' );

		$this->assertStringContainsString( '"borderColor":"accent"', $out );
	}

	/** @test */
	public function pullquote_centered_with_empty_slug_omits_border_color_attr(): void {
		$out = aldus_block_pullquote_centered( $this->quote_dist(), '', '' );

		$this->assertStringNotContainsString( 'borderColor', $out );
	}
}
