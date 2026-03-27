<?php
declare(strict_types=1);

/**
 * Integration tests for the GET /aldus/v1/health REST endpoint.
 *
 * Requires a real WordPress installation (WP_UnitTestCase).
 * Run with: vendor/bin/phpunit -c phpunit-integration.xml.dist
 */
class HealthEndpointTest extends WP_UnitTestCase {

	private int $admin_id;
	private int $editor_id;

	public function set_up(): void {
		parent::set_up();
		$this->admin_id  = self::factory()->user->create( [ 'role' => 'administrator' ] );
		$this->editor_id = self::factory()->user->create( [ 'role' => 'editor' ] );

		do_action( 'rest_api_init' );
	}

	public function tear_down(): void {
		// Clean up any test options written during the test.
		delete_option( 'aldus_errors_test' );
		delete_option( 'aldus_client_error_timeout' );
		parent::tear_down();
	}

	// -----------------------------------------------------------------------
	// Happy path
	// -----------------------------------------------------------------------

	public function test_health_returns_200_for_admin(): void {
		wp_set_current_user( $this->admin_id );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/health' );
		$response = rest_do_request( $request );

		$this->assertSame( 200, $response->get_status() );
	}

	public function test_health_response_contains_version(): void {
		wp_set_current_user( $this->admin_id );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/health' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertArrayHasKey( 'version', $data );
		$this->assertSame( ALDUS_VERSION, $data['version'] );
	}

	public function test_health_response_contains_environment_keys(): void {
		wp_set_current_user( $this->admin_id );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/health' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertArrayHasKey( 'php', $data );
		$this->assertArrayHasKey( 'wp', $data );
		$this->assertArrayHasKey( 'object_cache', $data );
		$this->assertArrayHasKey( 'theme', $data );
		$this->assertArrayHasKey( 'personalities', $data );
	}

	public function test_health_personalities_count_matches_builtin(): void {
		wp_set_current_user( $this->admin_id );

		$expected = count( array_keys( aldus_anchor_tokens() ) );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/health' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertSame( $expected, $data['personalities'] );
	}

	public function test_health_response_contains_error_counts_keys(): void {
		wp_set_current_user( $this->admin_id );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/health' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertArrayHasKey( 'error_counts', $data );
		$this->assertArrayHasKey( 'client_error_counts', $data );
		$this->assertIsArray( $data['error_counts'] );
		$this->assertIsArray( $data['client_error_counts'] );
	}

	public function test_health_reflects_stored_error_count(): void {
		// Pre-seed an error counter option.
		update_option( 'aldus_errors_dispatch', 5 );
		wp_set_current_user( $this->admin_id );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/health' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertArrayHasKey( 'Dispatch', $data['error_counts'] );
		$this->assertSame( 5, $data['error_counts']['Dispatch'] );

		delete_option( 'aldus_errors_dispatch' );
	}

	public function test_health_object_cache_is_boolean(): void {
		wp_set_current_user( $this->admin_id );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/health' );
		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertIsBool( $data['object_cache'] );
	}

	// -----------------------------------------------------------------------
	// Auth checks — health requires manage_options, not just edit_posts
	// -----------------------------------------------------------------------

	public function test_health_returns_403_for_editor(): void {
		wp_set_current_user( $this->editor_id );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/health' );
		$response = rest_do_request( $request );

		$this->assertContains( $response->get_status(), [ 401, 403 ] );
	}

	public function test_health_returns_401_for_unauthenticated(): void {
		wp_set_current_user( 0 );

		$request  = new WP_REST_Request( 'GET', '/aldus/v1/health' );
		$response = rest_do_request( $request );

		$this->assertContains( $response->get_status(), [ 401, 403 ] );
	}
}
