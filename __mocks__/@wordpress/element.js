/**
 * @wordpress/element mock — re-exports React so components work in jsdom.
 * forwardRef, Component, etc. all come from React.
 */
const React = require( 'react' );

module.exports = {
	...React,
	Component: React.Component,
	Fragment: React.Fragment,
	createContext: React.createContext,
	createElement: React.createElement,
	forwardRef: React.forwardRef,
	memo: React.memo,
	useCallback: React.useCallback,
	useContext: React.useContext,
	useEffect: React.useEffect,
	useId: React.useId,
	useLayoutEffect: React.useLayoutEffect,
	useMemo: React.useMemo,
	useReducer: React.useReducer,
	useRef: React.useRef,
	useState: React.useState,
	render: jest.fn(),
	RawHTML: ( { children } ) =>
		React.createElement( 'span', { dangerouslySetInnerHTML: { __html: children } } ),
};
