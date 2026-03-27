<?php
declare(strict_types=1);

/**
 * Full-stack renderer integration tests.
 *
 * Each test calls aldus_handle_assemble() directly with fixture items for
 * every personality, passes the output through parse_blocks(), and asserts
 * that no validation errors are present. This is the integration-layer
 * equivalent of RendererTokensTest (which operates at the unit layer).
 *
 * Requires a real WordPress installation (WP_UnitTestCase).
 * Run with: vendor/bin/phpunit -c phpunit-integration.xml.dist
 */
class RendererIntegrationTest extends WP_UnitTestCase {

	private int $editor_id;

	/** Fixture items covering all content types so every personality can be fed. */
	private static array $fixture_items = [
		[ 'type' => 'headline',   'content' => 'Full-stack renderer test headline', 'url' => '', 'id' => 'h1' ],
		[ 'type' => 'headline',   'content' => 'Second headline for layout variety', 'url' => '', 'id' => 'h2' ],
		[ 'type' => 'subheading', 'content' => 'A subheading for section structure', 'url' => '', 'id' => 's1' ],
		[ 'type' => 'subheading', 'content' => 'Another subheading',                'url' => '', 'id' => 's2' ],
		[ 'type' => 'paragraph',  'content' => 'First paragraph with substantial content for realistic testing.', 'url' => '', 'id' => 'p1' ],
		[ 'type' => 'paragraph',  'content' => 'Second paragraph to exercise multi-paragraph layouts.',           'url' => '', 'id' => 'p2' ],
		[ 'type' => 'paragraph',  'content' => 'Third paragraph for column layouts that require three.',           'url' => '', 'id' => 'p3' ],
		[ 'type' => 'paragraph',  'content' => 'Fourth paragraph for the widest column layouts.',                 'url' => '', 'id' => 'p4' ],
		[ 'type' => 'quote',      'content' => 'A compelling quote for pullquote blocks.', 'url' => '', 'id' => 'q1' ],
		[ 'type' => 'image',      'content' => 'Alt text', 'url' => 'https://example.com/img.jpg', 'id' => 'i1', 'mediaId' => 1 ],
		[ 'type' => 'image',      'content' => 'Second image', 'url' => 'https://example.com/img2.jpg', 'id' => 'i2', 'mediaId' => 2 ],
		[ 'type' => 'cta',        'content' => 'Read more',   'url' => 'https://example.com', 'id' => 'c1' ],
		[ 'type' => 'list',       'content' => "Point one\nPoint two\nPoint three", 'url' => '', 'id' => 'l1' ],
		[ 'type' => 'video',      'content' => 'Demo video',  'url' => 'https://example.com/video.mp4', 'id' => 'v1' ],
		[ 'type' => 'gallery',    'content' => '', 'url' => '', 'id' => 'g1', 'urls' => [ 'https://example.com/g1.jpg', 'https://example.com/g2.jpg' ] ],
	];

	public function set_up(): void {
		parent::set_up();
		$this->editor_id = self::factory()->user->create( [ 'role' => 'editor' ] );
		do_action( 'rest_api_init' );
	}

	// -----------------------------------------------------------------------
	// Data providers
	// -----------------------------------------------------------------------

	/** @return array<string, array{string, string[]}> */
	public static function personality_token_provider(): array {
		return [
			'Dispatch'   => [ 'Dispatch',   [ 'cover:dark', 'pullquote:full-solid', 'paragraph', 'buttons:cta' ] ],
			'Folio'      => [ 'Folio',       [ 'columns:28-72', 'image:wide', 'paragraph:dropcap', 'heading:h2' ] ],
			'Stratum'    => [ 'Stratum',     [ 'cover:minimal', 'group:dark-full', 'paragraph', 'separator' ] ],
			'Broadside'  => [ 'Broadside',   [ 'cover:light', 'columns:2-equal', 'heading:h2', 'paragraph' ] ],
			'Manifesto'  => [ 'Manifesto',   [ 'cover:dark', 'group:gradient-full', 'pullquote:centered', 'paragraph' ] ],
			'Nocturne'   => [ 'Nocturne',    [ 'cover:dark', 'image:full', 'paragraph', 'separator' ] ],
			'Tribune'    => [ 'Tribune',     [ 'media-text:left', 'heading:h1', 'paragraph', 'heading:h2' ] ],
			'Overture'   => [ 'Overture',    [ 'cover:split', 'pullquote:wide', 'columns:2-equal', 'paragraph' ] ],
			'Codex'      => [ 'Codex',       [ 'cover:minimal', 'group:border-box', 'paragraph', 'separator' ] ],
			'Dusk'       => [ 'Dusk',        [ 'cover:dark', 'group:dark-full', 'image:wide', 'paragraph' ] ],
			'Broadsheet' => [ 'Broadsheet',  [ 'columns:3-equal', 'heading:h2', 'paragraph', 'separator' ] ],
			'Solstice'   => [ 'Solstice',    [ 'cover:minimal', 'columns:2-equal', 'paragraph', 'spacer:large' ] ],
			'Mirage'     => [ 'Mirage',      [ 'cover:dark', 'media-text:right', 'paragraph', 'image:wide' ] ],
			'Ledger'     => [ 'Ledger',      [ 'columns:4-equal', 'heading:h3', 'paragraph', 'separator' ] ],
			'Mosaic'     => [ 'Mosaic',      [ 'media-text:left', 'media-text:right', 'heading:h2', 'paragraph' ] ],
			'Prism'      => [ 'Prism',       [ 'cover:light', 'group:gradient-full', 'heading:display', 'paragraph' ] ],
		];
	}

	// -----------------------------------------------------------------------
	// Tests
	// -----------------------------------------------------------------------

	/**
	 * @dataProvider personality_token_provider
	 */
	public function test_assemble_returns_non_empty_blocks( string $personality, array $tokens ): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => self::$fixture_items,
			'personality' => $personality,
			'tokens'      => $tokens,
		] );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame(
			200,
			$response->get_status(),
			"Assemble failed for personality '{$personality}': " . wp_json_encode( $data )
		);
		$this->assertTrue( $data['success'] );
		$this->assertNotEmpty( $data['blocks'], "Empty blocks for personality '{$personality}'" );
	}

	/**
	 * @dataProvider personality_token_provider
	 */
	public function test_assemble_output_is_parseable_block_markup( string $personality, array $tokens ): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => self::$fixture_items,
			'personality' => $personality,
			'tokens'      => $tokens,
		] );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );

		$parsed = parse_blocks( $data['blocks'] );
		$real   = array_filter( $parsed, fn( $b ) => ! empty( $b['blockName'] ) );

		$this->assertNotEmpty(
			$real,
			"No parseable blocks in output for personality '{$personality}'"
		);
	}

	/**
	 * @dataProvider personality_token_provider
	 */
	public function test_assemble_output_has_no_wp_aldus_recursion( string $personality, array $tokens ): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => self::$fixture_items,
			'personality' => $personality,
			'tokens'      => $tokens,
		] );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );
		$this->assertStringNotContainsString(
			'wp:aldus',
			$data['blocks'],
			"Recursive wp:aldus block in output for personality '{$personality}'"
		);
	}

	/**
	 * @dataProvider personality_token_provider
	 */
	public function test_assemble_output_has_balanced_block_comments( string $personality, array $tokens ): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => self::$fixture_items,
			'personality' => $personality,
			'tokens'      => $tokens,
		] );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );

		$blocks  = $data['blocks'];
		$openers = substr_count( $blocks, '<!-- wp:' );
		$closers = substr_count( $blocks, '<!-- /wp:' );

		$this->assertSame(
			$openers,
			$closers,
			"Unbalanced block comments for personality '{$personality}' (open:{$openers} close:{$closers})"
		);
	}

	/**
	 * @dataProvider personality_token_provider
	 */
	public function test_assemble_response_label_matches_personality( string $personality, array $tokens ): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => self::$fixture_items,
			'personality' => $personality,
			'tokens'      => $tokens,
		] );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( $personality, $data['label'] );
	}
}
