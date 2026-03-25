<?php
declare(strict_types=1);

namespace Aldus;

/**
 * REST API controller for all Aldus endpoints.
 *
 * Re-exports the procedural Aldus_REST_Controller defined in
 * includes/class-rest-controller.php under the Aldus namespace so that
 * PSR-4 autoloading can resolve it and PHPUnit tests can import it without
 * loading the full WordPress bootstrap.
 *
 * The canonical implementation lives in includes/class-rest-controller.php.
 * This stub provides the namespaced alias for tooling and test infrastructure.
 *
 * @see includes/class-rest-controller.php for the full class definition.
 */
class RestController extends \Aldus_REST_Controller {}
