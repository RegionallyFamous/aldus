<?php
declare(strict_types=1);

/**
 * Parity with tests/e2e/assemble-personalities.spec.js — Codex personality tokens + SAMPLE_ITEMS.
 *
 * Ensures the e2e token sequence passes assemble validation in development env (same as wp-env).
 */
class CodexE2ETokensTest extends WP_UnitTestCase {

	private int $editor_id;

	public function set_up(): void {
		parent::set_up();
		$this->editor_id = self::factory()->user->create( [ 'role' => 'editor' ] );
		do_action( 'rest_api_init' );
	}

	public function test_codex_e2e_tokens_and_items_return_200_in_development(): void {
		wp_set_current_user( $this->editor_id );

		$items = [
			[
				'type'    => 'headline',
				'content' => 'Sample Headline for Automated E2E Testing',
				'url'     => '',
				'id'      => 'e2e-h1',
			],
			[
				'type'    => 'subheading',
				'content' => 'A supporting subheading with additional context',
				'url'     => '',
				'id'      => 'e2e-sh1',
			],
			[
				'type'    => 'paragraph',
				'content' => 'This paragraph provides enough words for the Aldus distributor to fill the rendered layout sections. It is intentionally verbose so that shorter tokens like dropcap paragraphs also receive text.',
				'url'     => '',
				'id'      => 'e2e-p1',
			],
			[
				'type'    => 'paragraph',
				'content' => 'A second paragraph adds variety. Aldus layouts with two-column or three-column sections benefit from having multiple paragraphs to distribute across columns.',
				'url'     => '',
				'id'      => 'e2e-p2',
			],
			[
				'type'    => 'quote',
				'content' => 'A pithy quote suitable for pull-quote blocks.',
				'url'     => '',
				'id'      => 'e2e-q1',
			],
			[
				'type'    => 'cta',
				'content' => 'Learn More',
				'url'     => 'https://example.com',
				'id'      => 'e2e-cta1',
			],
			[
				'type'    => 'image',
				'content' => '',
				'url'     => 'https://picsum.photos/seed/aldus-e2e/1200/800',
				'id'      => 'e2e-img1',
			],
			[
				'type'    => 'image',
				'content' => '',
				'url'     => 'https://picsum.photos/seed/aldus-e2e-2/800/600',
				'id'      => 'e2e-img2',
			],
			[
				'type'    => 'gallery',
				'content' => '',
				'url'     => '',
				'id'      => 'e2e-gal1',
				'urls'    => [
					'https://picsum.photos/seed/aldus-g1/800/600',
					'https://picsum.photos/seed/aldus-g2/800/600',
				],
			],
			[
				'type'    => 'list',
				'content' => "First item\nSecond item\nThird item",
				'url'     => '',
				'id'      => 'e2e-list1',
			],
			[
				'type'    => 'code',
				'content' => 'console.log("hello from aldus e2e");',
				'url'     => '',
				'id'      => 'e2e-code1',
			],
			[
				'type'    => 'details',
				'content' => "Frequently asked question\nAnswer to the frequently asked question.",
				'url'     => '',
				'id'      => 'e2e-details1',
			],
		];

		$tokens = [
			'heading:display',
			'heading:kicker',
			'group:border-box',
			'details:accordion',
			'code:block',
			'paragraph:lead',
			'paragraph',
		];

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params(
			[
				'personality' => 'Codex',
				'tokens'      => $tokens,
				'items'       => $items,
			]
		);

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame(
			200,
			$response->get_status(),
			'Codex e2e parity assemble failed: ' . wp_json_encode( $data )
		);
	}
}
