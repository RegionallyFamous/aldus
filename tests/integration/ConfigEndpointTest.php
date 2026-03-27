<?php
declare(strict_types=1);

/**
 * Integration tests for the GET /aldus/v1/config REST endpoint.
 *
 * Requires a real WordPress installation (WP_UnitTestCase).
 * Run with: vendor/bin/phpunit -c phpunit-integration.xml.dist
 */
class ConfigEndpointTest extends WP_UnitTestCase {

	private int $editor_id;
	private int $subscriber_id;

	public function set_up(): void {
		parent::set_up();
		$this->editor_id     = self::factory()->user->create( [ 'role' => 'editor' ] );
		$this->subscriber_id = self::factory()->user->create( [ 'role' => 'subscriber' ] );

		do_action( 'rest_api_init' );
	}

	// -----------------------------------------------------------------------
	// Happy path
	// -----------------------------------------------------------------------

	public function test_config_returns_200_for_editor(): void {
		wp_set_current_user( $this->editor_id );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/config' );
		$response = rest_do_request( $request );

		$this->assertSame( 200, $response->get_status() );
	}

	public function test_config_response_contains_version(): void {
		wp_set_current_user( $this->editor_id );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/config' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertArrayHasKey( 'version', $data );
		$this->assertNotEmpty( $data['version'] );
		$this->assertSame( ALDUS_VERSION, $data['version'] );
	}

	public function test_config_response_contains_personalities_array(): void {
		wp_set_current_user( $this->editor_id );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/config' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertArrayHasKey( 'personalities', $data );
		$this->assertIsArray( $data['personalities'] );
		$this->assertNotEmpty( $data['personalities'] );
	}

	public function test_config_personalities_have_required_fields(): void {
		wp_set_current_user( $this->editor_id );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/config' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		foreach ( $data['personalities'] as $p ) {
			$this->assertArrayHasKey( 'slug', $p );
			$this->assertArrayHasKey( 'label', $p );
			$this->assertArrayHasKey( 'source', $p );
			$this->assertNotEmpty( $p['slug'] );
			$this->assertNotEmpty( $p['label'] );
		}
	}

	public function test_config_includes_all_16_builtin_personalities(): void {
		wp_set_current_user( $this->editor_id );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/config' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$builtin_names = array_keys( aldus_anchor_tokens() );
		$config_labels = array_column( $data['personalities'], 'label' );

		foreach ( $builtin_names as $name ) {
			$this->assertContains(
				$name,
				$config_labels,
				"Builtin personality '{$name}' missing from /config response"
			);
		}
	}

	public function test_config_response_contains_theme_object(): void {
		wp_set_current_user( $this->editor_id );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/config' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertArrayHasKey( 'theme', $data );
		$this->assertIsArray( $data['theme'] );
		$this->assertArrayHasKey( 'contentSize', $data['theme'] );
		$this->assertArrayHasKey( 'wideSize', $data['theme'] );
		$this->assertArrayHasKey( 'spacing', $data['theme'] );
	}

	public function test_registered_personality_appears_in_config(): void {
		aldus_register_personality( 'test-custom', 'Test Custom', 'A test personality.' );
		wp_set_current_user( $this->editor_id );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/config' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$slugs = array_column( $data['personalities'], 'slug' );
		$this->assertContains( 'test-custom', $slugs );

		$sources = array_column( $data['personalities'], 'source' );
		$this->assertContains( 'registered', $sources );
	}

	// -----------------------------------------------------------------------
	// Auth checks
	// -----------------------------------------------------------------------

	public function test_config_returns_401_for_unauthenticated(): void {
		wp_set_current_user( 0 );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/config' );
		$response = rest_do_request( $request );

		$this->assertContains( $response->get_status(), [ 401, 403 ] );
	}

	public function test_config_returns_403_for_subscriber(): void {
		wp_set_current_user( $this->subscriber_id );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/config' );
		$response = rest_do_request( $request );

		$this->assertContains( $response->get_status(), [ 401, 403 ] );
	}
}
