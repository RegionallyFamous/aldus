/**
 * Jest global setup — fail on WordPress deprecation warnings.
 *
 * WordPress components call console.error() with a message beginning
 * "Bottom margin styles for wp.components.<X> is deprecated" (or similar)
 * when a deprecated prop pattern is used. This setup file intercepts those
 * calls and converts them into test failures so deprecations are caught in CI
 * rather than silently accumulating in the browser console.
 *
 * Add new patterns to DEPRECATION_PATTERNS when new WP deprecation messages
 * are encountered.
 */

const DEPRECATION_PATTERNS = [
	// WP 6.7: ToggleControl / TextareaControl / other components missing
	// __nextHasNoMarginBottom prop.
	/is deprecated since version \d+\.\d+/,
	// Generic WP deprecated() function output.
	/has been deprecated/,
	// WP 6.9: data-layer API removals.
	/getMediaItems.*deprecated/i,
];

// eslint-disable-next-line no-console
const originalError = console.error.bind( console );

beforeAll( () => {
	jest.spyOn( console, 'error' ).mockImplementation( ( ...args ) => {
		const message = args
			.map( ( a ) => ( typeof a === 'string' ? a : String( a ) ) )
			.join( ' ' );

		const matched = DEPRECATION_PATTERNS.find( ( pattern ) =>
			pattern.test( message )
		);

		if ( matched ) {
			throw new Error(
				`WordPress deprecation warning detected in test:\n${ message }\n\nFix the deprecated usage before merging.`
			);
		}

		// Pass non-deprecation errors through unchanged so other failures still
		// surface normally.
		// eslint-disable-next-line no-console
		originalError( ...args );
	} );
} );

afterAll( () => {
	// eslint-disable-next-line no-console
	console.error.mockRestore?.();
} );
