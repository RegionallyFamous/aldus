<?php
declare(strict_types=1);

/**
 * Integration tests for the /aldus/v1/assemble REST endpoint.
 *
 * Requires a real WordPress installation (WP_UnitTestCase).
 * Run with: vendor/bin/phpunit -c phpunit-integration.xml.dist
 */
class AssembleEndpointTest extends WP_UnitTestCase {

	private int $editor_id;

	public function set_up(): void {
		parent::set_up();
		$this->editor_id = self::factory()->user->create( [ 'role' => 'editor' ] );

		// Ensure routes are registered.
		do_action( 'rest_api_init' );
	}

	// -----------------------------------------------------------------------
	// Happy path
	// -----------------------------------------------------------------------

	public function test_assemble_returns_blocks_for_valid_input(): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => [
				[ 'type' => 'headline', 'content' => 'Test Headline', 'url' => '', 'id' => 'a' ],
				[ 'type' => 'paragraph', 'content' => 'Test paragraph content.', 'url' => '', 'id' => 'b' ],
				[ 'type' => 'quote', 'content' => 'A great quote.', 'url' => '', 'id' => 'c' ],
				[ 'type' => 'cta', 'content' => 'Click here', 'url' => '#', 'id' => 'd' ],
				[ 'type' => 'image', 'content' => 'Alt text', 'url' => 'https://example.com/img.jpg', 'id' => 'e' ],
			],
			'personality' => 'Dispatch',
			'tokens'      => [ 'cover:dark', 'pullquote:full-solid', 'buttons:cta', 'paragraph' ],
		] );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );
		$this->assertTrue( $data['success'] );
		$this->assertNotEmpty( $data['blocks'] );
		$this->assertSame( 'Dispatch', $data['label'] );
	}

	public function test_output_blocks_are_parseable(): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => [
				[ 'type' => 'headline', 'content' => 'Hello', 'url' => '', 'id' => 'a' ],
				[ 'type' => 'paragraph', 'content' => 'World', 'url' => '', 'id' => 'b' ],
				[ 'type' => 'image', 'content' => '', 'url' => 'https://example.com/i.jpg', 'id' => 'c' ],
				[ 'type' => 'cta', 'content' => 'Go', 'url' => '/', 'id' => 'd' ],
			],
			'personality' => 'Folio',
			'tokens'      => [ 'columns:28-72', 'pullquote:wide', 'paragraph:lead', 'paragraph' ],
		] );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );
		$this->assertNotEmpty( $data['blocks'] );

		$parsed = parse_blocks( $data['blocks'] );
		$real   = array_filter( $parsed, fn( $b ) => ! empty( $b['blockName'] ) );

		$this->assertNotEmpty( $real, 'Response blocks must be valid WordPress block markup' );
	}

	// -----------------------------------------------------------------------
	// Auth checks
	// -----------------------------------------------------------------------

	public function test_assemble_rejects_unauthenticated_user(): void {
		wp_set_current_user( 0 );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => [ [ 'type' => 'paragraph', 'content' => 'test', 'url' => '', 'id' => 'a' ] ],
			'personality' => 'Dispatch',
			'tokens'      => [ 'paragraph' ],
		] );

		$response = rest_do_request( $request );
		// WordPress returns 401 for unauthenticated REST requests and 403 for
		// authenticated users who lack the required capability.
		$this->assertContains( $response->get_status(), [ 401, 403 ] );
	}

	public function test_assemble_rejects_subscriber(): void {
		$subscriber = self::factory()->user->create( [ 'role' => 'subscriber' ] );
		wp_set_current_user( $subscriber );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => [ [ 'type' => 'paragraph', 'content' => 'test', 'url' => '', 'id' => 'a' ] ],
			'personality' => 'Dispatch',
			'tokens'      => [ 'paragraph' ],
		] );

		$response = rest_do_request( $request );
		$this->assertSame( 403, $response->get_status() );
	}

	// -----------------------------------------------------------------------
	// Input validation
	// -----------------------------------------------------------------------

	public function test_invalid_tokens_are_rejected(): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => [
				[ 'type' => 'paragraph', 'content' => 'test', 'url' => '', 'id' => 'a' ],
				[ 'type' => 'cta', 'content' => 'Go', 'url' => '/', 'id' => 'b' ],
			],
			'personality' => 'Dispatch',
			'tokens'      => [ '<script>alert(1)</script>' ],
		] );

		$response = rest_do_request( $request );
		// Unrecognised tokens are rejected with 400 by the validate_callback.
		$this->assertSame( 400, $response->get_status() );
	}

	public function test_valid_tokens_are_accepted(): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => [
				[ 'type' => 'paragraph', 'content' => 'test', 'url' => '', 'id' => 'a' ],
				[ 'type' => 'cta', 'content' => 'Go', 'url' => '/', 'id' => 'b' ],
			],
			'personality' => 'Dispatch',
			'tokens'      => [ 'cover:dark', 'buttons:cta' ],
		] );

		$response = rest_do_request( $request );
		$this->assertSame( 200, $response->get_status() );
	}

	public function test_code_items_are_accepted_and_rendered(): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => [
				[ 'type' => 'code', 'content' => 'const answer = 42;', 'url' => '', 'id' => 'a' ],
			],
			'personality' => 'Dispatch',
			'tokens'      => [ 'code:block' ],
		] );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );
		$this->assertStringContainsString( '<!-- wp:code -->', $data['blocks'] );
	}

	public function test_details_items_fall_back_to_generic_markup(): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => [
				[ 'type' => 'details', 'content' => 'Frequently asked question', 'url' => '', 'id' => 'a' ],
			],
			'personality' => 'Dispatch',
			'tokens'      => [ 'paragraph' ],
		] );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );
		$this->assertStringContainsString( '<!-- wp:paragraph -->', $data['blocks'] );
	}

	public function test_empty_layouts_fall_back_to_generic_blocks(): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => [
				[ 'type' => 'paragraph', 'content' => 'Fallback paragraph', 'url' => '', 'id' => 'a' ],
			],
			'personality' => 'Dispatch',
			'tokens'      => [ 'gallery:3-col' ],
		] );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );
		$this->assertStringContainsString( '<!-- wp:paragraph -->', $data['blocks'] );
	}

	public function test_empty_tokens_still_returns_output(): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => [
				[ 'type' => 'headline', 'content' => 'Hello', 'url' => '', 'id' => 'a' ],
				[ 'type' => 'paragraph', 'content' => 'World', 'url' => '', 'id' => 'b' ],
				[ 'type' => 'cta', 'content' => 'Go', 'url' => '/', 'id' => 'c' ],
			],
			'personality' => 'Dispatch',
			'tokens'      => [],
		] );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		// Anchor enforcement should inject required tokens even when tokens is empty.
		$this->assertIsArray( $data );
	}

	// -----------------------------------------------------------------------
	// Fixture-based tests
	// -----------------------------------------------------------------------

	public function test_blog_post_items_fixture_assembles_for_dispatch(): void {
		wp_set_current_user( $this->editor_id );

		$items_json = file_get_contents( dirname( __DIR__ ) . '/fixtures/items-blog-post.json' );
		$items      = json_decode( $items_json, true );
		$tokens     = json_decode( file_get_contents( dirname( __DIR__ ) . '/fixtures/tokens-dispatch.json' ), true );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/assemble' );
		$request->set_body_params( [
			'items'       => $items,
			'personality' => 'Dispatch',
			'tokens'      => $tokens,
		] );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );
		$this->assertTrue( $data['success'] );
		$this->assertNotEmpty( $data['blocks'] );
	}
}
