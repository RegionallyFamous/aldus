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
			'Nocturne'   => [ 'Nocturne',    [ 'cover:split', 'image:full', 'paragraph', 'separator' ] ],
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
	 * Aldus project markup rules (render-time classes, style shape, etc.) must
	 * pass for every personality — mirrors editor-facing invalid-block causes.
	 *
	 * @dataProvider personality_token_provider
	 */
	public function test_assemble_output_passes_aldus_markup_validation( string $personality, array $tokens ): void {
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
		$this->assertNotEmpty( $data['blocks'] );

		if ( ! function_exists( 'aldus_validate_assembled_markup' ) ) {
			require_once ALDUS_PATH . 'includes/validate-blocks.php';
		}

		$errors = aldus_validate_assembled_markup( (string) $data['blocks'] );
		$this->assertEmpty(
			$errors,
			"Personality '{$personality}' assembled markup failed aldus_validate_assembled_markup:\n" . implode( "\n", $errors )
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

	public function test_columns_three_equal_output_includes_is_stacked_on_mobile(): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => self::$fixture_items,
			'personality' => 'Broadsheet',
			'tokens'      => [ 'columns:3-equal', 'heading:h2', 'paragraph', 'separator' ],
		] );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );
		$this->assertStringContainsString(
			'"isStackedOnMobile":true',
			$data['blocks'],
			'columns:3-equal should set isStackedOnMobile on core/columns'
		);
	}

	public function test_columns_four_equal_output_includes_is_stacked_on_mobile(): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => self::$fixture_items,
			'personality' => 'Ledger',
			'tokens'      => [ 'columns:4-equal', 'heading:h3', 'paragraph', 'separator' ],
		] );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );
		$this->assertStringContainsString(
			'"isStackedOnMobile":true',
			$data['blocks'],
			'columns:4-equal should set isStackedOnMobile on core/columns'
		);
	}

	/**
	 * Dispatch (high contrast, restrained accent) vs Nocturne (high, pronounced)
	 * should produce different cover dimRatio / overlay roles for the same token.
	 */
	public function test_cover_dark_differs_between_dispatch_and_nocturne(): void {
		wp_set_current_user( $this->editor_id );

		$tokens = [ 'cover:dark', 'paragraph' ];
		$items  = self::$fixture_items;

		$req_d = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$req_d->set_body_params( [
			'items'       => $items,
			'personality' => 'Dispatch',
			'tokens'      => $tokens,
		] );
		$req_n = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$req_n->set_body_params( [
			'items'       => $items,
			'personality' => 'Nocturne',
			'tokens'      => $tokens,
		] );

		$blocks_d = rest_do_request( $req_d )->get_data()['blocks'] ?? '';
		$blocks_n = rest_do_request( $req_n )->get_data()['blocks'] ?? '';

		$this->assertNotSame( $blocks_d, $blocks_n, 'Cover markup should differ by personality style rules' );
		$this->assertMatchesRegularExpression( '/"dimRatio":\d+/', $blocks_d );
		$this->assertMatchesRegularExpression( '/"dimRatio":\d+/', $blocks_n );
	}
}
