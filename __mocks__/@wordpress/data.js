/**
 * @wordpress/data mock — stubs for useSelect, useDispatch, etc.
 */
module.exports = {
	useSelect: ( selector ) => selector( ( storeName ) => ( {} ) ),
	useDispatch: () => ( {} ),
	dispatch: () => ( {} ),
	select: () => ( {} ),
	subscribe: jest.fn( () => jest.fn() ),
	registerStore: jest.fn(),
	createStore: jest.fn(),
	createRegistrySelector: ( selector ) => selector,
	createReduxStore: jest.fn(),
	register: jest.fn(),
	withSelect: jest.fn( () => ( Component ) => Component ),
	withDispatch: jest.fn( () => ( Component ) => Component ),
};
