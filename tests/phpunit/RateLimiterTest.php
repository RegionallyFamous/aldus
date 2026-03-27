<?php
declare(strict_types=1);

namespace Aldus\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Tests for the fixed-window rate limiter in Aldus_REST_Controller::check_rate_limit().
 *
 * check_rate_limit() is private, so we use ReflectionClass to invoke it.
 * The transient functions are stubbed by tests/phpunit/bootstrap.php using
 * $GLOBALS['_aldus_test_transients'] so no database is needed.
 */
class RateLimiterTest extends TestCase {

	/** @var \Aldus_REST_Controller */
	private \Aldus_REST_Controller $controller;

	/** @var \ReflectionMethod */
	private \ReflectionMethod $method;

	protected function setUp(): void {
		parent::setUp();

		// Start with a clean transient store for each test.
		$GLOBALS['_aldus_test_transients']     = array();
		$GLOBALS['_aldus_test_current_user_id'] = 1;

		$this->controller = new \Aldus_REST_Controller();

		$reflection   = new \ReflectionClass( $this->controller );
		$this->method = $reflection->getMethod( 'check_rate_limit' );
		$this->method->setAccessible( true );
	}

	protected function tearDown(): void {
		$GLOBALS['_aldus_test_transients']      = array();
		$GLOBALS['_aldus_test_current_user_id'] = 1;
		parent::tearDown();
	}

	// -----------------------------------------------------------------------
	// Helpers
	// -----------------------------------------------------------------------

	/** Invoke check_rate_limit() on our controller instance. */
	private function call_rate_limit(): true|\WP_Error {
		return $this->method->invoke( $this->controller );
	}

	// -----------------------------------------------------------------------
	// Tests
	// -----------------------------------------------------------------------

	/** @test */
	public function first_request_is_allowed(): void {
		$result = $this->call_rate_limit();
		$this->assertTrue( $result );
	}

	/** @test */
	public function sixtieth_request_is_allowed(): void {
		for ( $i = 0; $i < 59; $i++ ) {
			$this->call_rate_limit();
		}
		$result = $this->call_rate_limit(); // 60th
		$this->assertTrue( $result );
	}

	/** @test */
	public function sixty_first_request_is_rate_limited(): void {
		for ( $i = 0; $i < 60; $i++ ) {
			$this->call_rate_limit();
		}
		$result = $this->call_rate_limit(); // 61st
		$this->assertInstanceOf( \WP_Error::class, $result );
		$this->assertSame( 'rate_limited', $result->get_error_code() );
	}

	/** @test */
	public function counter_increments_by_one_per_call(): void {
		$this->call_rate_limit(); // 1st
		$this->call_rate_limit(); // 2nd

		$store = $GLOBALS['_aldus_test_transients'] ?? array();
		$entry = reset( $store );
		$this->assertNotFalse( $entry );
		$this->assertSame( 2, $entry['value']['c'] );
	}

	/** @test */
	public function window_start_is_fixed_after_first_request(): void {
		$this->call_rate_limit(); // sets window start

		$store_after_1  = $GLOBALS['_aldus_test_transients'];
		$entry_after_1  = reset( $store_after_1 );
		$start_after_1  = $entry_after_1['value']['s'] ?? null;

		$this->call_rate_limit(); // 2nd — must not move the start
		$this->call_rate_limit(); // 3rd

		$store_after_3 = $GLOBALS['_aldus_test_transients'];
		$entry_after_3 = reset( $store_after_3 );
		$start_after_3 = $entry_after_3['value']['s'] ?? null;

		$this->assertNotNull( $start_after_1 );
		$this->assertSame(
			$start_after_1,
			$start_after_3,
			'Window start time changed between writes — fixed-window invariant violated'
		);
	}

	/** @test */
	public function different_users_have_independent_counters(): void {
		$GLOBALS['_aldus_test_current_user_id'] = 1;
		// Exhaust user 1's quota.
		for ( $i = 0; $i < 61; $i++ ) {
			$this->call_rate_limit();
		}
		$last_user_1 = $this->call_rate_limit();

		// Switch to user 2 — should be allowed.
		$GLOBALS['_aldus_test_current_user_id'] = 2;
		$first_user_2 = $this->call_rate_limit();

		$this->assertInstanceOf( \WP_Error::class, $last_user_1 );
		$this->assertTrue( $first_user_2 );
	}

	/** @test */
	public function rate_limit_error_has_correct_error_code(): void {
		for ( $i = 0; $i < 61; $i++ ) {
			$this->call_rate_limit();
		}
		$result = $this->call_rate_limit();
		$this->assertInstanceOf( \WP_Error::class, $result );
		$this->assertSame( 'rate_limited', $result->get_error_code() );
	}
}
