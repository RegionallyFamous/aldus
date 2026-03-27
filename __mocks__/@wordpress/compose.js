/**
 * @wordpress/compose mock — stubs hooks and HOCs used in components.
 */
const React = require( 'react' );

module.exports = {
	useFocusOnMount: () => React.createRef(),
	useRefEffect: () => React.createRef(),
	useInstanceId: () => 'test-id',
	useDebounce: ( fn ) => fn,
	useThrottle: ( fn ) => fn,
	withState: jest.fn( () => ( Component ) => Component ),
	compose: ( ...fns ) => ( arg ) => fns.reduceRight( ( acc, fn ) => fn( acc ), arg ),
	ifCondition: jest.fn( () => ( Component ) => Component ),
	pure: ( Component ) => Component,
};
