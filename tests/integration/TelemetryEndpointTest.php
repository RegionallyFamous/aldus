<?php
declare(strict_types=1);

/**
 * Integration tests for the POST /aldus/v1/telemetry REST endpoint.
 *
 * Requires a real WordPress installation (WP_UnitTestCase).
 * Run with: vendor/bin/phpunit -c phpunit-integration.xml.dist
 */
class TelemetryEndpointTest extends WP_UnitTestCase {

	private int $editor_id;

	public function set_up(): void {
		parent::set_up();
		$this->editor_id = self::factory()->user->create( [ 'role' => 'editor' ] );

		do_action( 'rest_api_init' );
	}

	public function tear_down(): void {
		delete_option( 'aldus_client_error_timeout' );
		delete_option( 'aldus_client_error_unexpected_error' );
		delete_option( 'aldus_client_error_no_layouts' );
		parent::tear_down();
	}

	// -----------------------------------------------------------------------
	// Happy path
	// -----------------------------------------------------------------------

	public function test_telemetry_returns_200_for_valid_event(): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/telemetry' );
		$request->set_body_params( [
			'event' => 'client_error',
			'code'  => 'timeout',
		] );

		$response = rest_do_request( $request );
		$this->assertSame( 200, $response->get_status() );
	}

	public function test_telemetry_returns_ok_true_for_valid_event(): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/telemetry' );
		$request->set_body_params( [
			'event' => 'client_error',
			'code'  => 'unexpected_error',
		] );

		$response = rest_do_request( $request );
		$data     = $response->get_data();

		$this->assertTrue( $data['ok'] );
	}

	public function test_telemetry_stores_counter_for_new_code(): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/telemetry' );
		$request->set_body_params( [
			'event' => 'client_error',
			'code'  => 'no_layouts',
		] );

		rest_do_request( $request );

		$count = (int) get_option( 'aldus_client_error_no_layouts', 0 );
		$this->assertGreaterThanOrEqual( 1, $count );
	}

	public function test_telemetry_increments_counter_on_repeated_calls(): void {
		wp_set_current_user( $this->editor_id );

		for ( $i = 0; $i < 3; $i++ ) {
			$request = new WP_REST_Request( 'POST', '/aldus/v1/telemetry' );
			$request->set_body_params( [
				'event' => 'client_error',
				'code'  => 'timeout',
			] );
			rest_do_request( $request );
		}

		$count = (int) get_option( 'aldus_client_error_timeout', 0 );
		$this->assertGreaterThanOrEqual( 3, $count );
	}

	// -----------------------------------------------------------------------
	// Validation
	// -----------------------------------------------------------------------

	public function test_telemetry_returns_400_for_invalid_event_enum(): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/telemetry' );
		$request->set_body_params( [
			'event' => 'invalid_event_type',
			'code'  => 'timeout',
		] );

		$response = rest_do_request( $request );
		$this->assertSame( 400, $response->get_status() );
	}

	public function test_telemetry_returns_400_when_event_missing(): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/telemetry' );
		$request->set_body_params( [ 'code' => 'timeout' ] );

		$response = rest_do_request( $request );
		$this->assertSame( 400, $response->get_status() );
	}

	public function test_telemetry_returns_400_when_code_missing(): void {
		wp_set_current_user( $this->editor_id );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/telemetry' );
		$request->set_body_params( [ 'event' => 'client_error' ] );

		$response = rest_do_request( $request );
		$this->assertSame( 400, $response->get_status() );
	}

	// -----------------------------------------------------------------------
	// Auth checks
	// -----------------------------------------------------------------------

	public function test_telemetry_returns_401_for_unauthenticated(): void {
		wp_set_current_user( 0 );

		$request = new WP_REST_Request( 'POST', '/aldus/v1/telemetry' );
		$request->set_body_params( [
			'event' => 'client_error',
			'code'  => 'timeout',
		] );

		$response = rest_do_request( $request );
		$this->assertContains( $response->get_status(), [ 401, 403 ] );
	}
}
