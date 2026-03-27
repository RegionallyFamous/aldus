/**
 * RTL tests for AldusErrorBoundary component.
 */

/* eslint-disable no-console */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AldusErrorBoundary } from '../components/AldusErrorBoundary.js';

// A child that throws when the `shouldThrow` prop is truthy.
function ThrowingChild( { shouldThrow } ) {
	if ( shouldThrow ) {
		throw new Error( 'Test render error' );
	}
	return <div>Child rendered successfully</div>;
}

beforeEach( () => {
	jest.spyOn( console, 'error' ).mockImplementation( () => {} );
} );

afterEach( () => {
	console.error.mockRestore?.();
} );

describe( 'AldusErrorBoundary', () => {
	it( 'renders children normally when no error', () => {
		render(
			<AldusErrorBoundary>
				<ThrowingChild shouldThrow={ false } />
			</AldusErrorBoundary>
		);
		expect(
			screen.getByText( 'Child rendered successfully' )
		).toBeInTheDocument();
	} );

	it( 'shows error headline when a child throws', () => {
		render(
			<AldusErrorBoundary>
				<ThrowingChild shouldThrow={ true } />
			</AldusErrorBoundary>
		);
		expect(
			screen.getByText( /aldus encountered a render error/i )
		).toBeInTheDocument();
	} );

	it( 'shows a "Try again" button in error state', () => {
		render(
			<AldusErrorBoundary>
				<ThrowingChild shouldThrow={ true } />
			</AldusErrorBoundary>
		);
		expect(
			screen.getByRole( 'button', { name: /try again/i } )
		).toBeInTheDocument();
	} );

	it( 'shows technical details disclosure in error state', () => {
		render(
			<AldusErrorBoundary>
				<ThrowingChild shouldThrow={ true } />
			</AldusErrorBoundary>
		);
		expect( screen.getByText( /technical details/i ) ).toBeInTheDocument();
	} );

	it( 'hides children and shows error UI when throw occurs', () => {
		render(
			<AldusErrorBoundary>
				<ThrowingChild shouldThrow={ true } />
			</AldusErrorBoundary>
		);
		expect(
			screen.queryByText( 'Child rendered successfully' )
		).not.toBeInTheDocument();
		expect(
			screen.getByText( /block could not render/i )
		).toBeInTheDocument();
	} );

	it( 'resets and renders children after clicking "Try again"', () => {
		const { rerender } = render(
			<AldusErrorBoundary>
				<ThrowingChild shouldThrow={ true } />
			</AldusErrorBoundary>
		);
		// In error state
		const resetBtn = screen.getByRole( 'button', { name: /try again/i } );
		// Re-render with non-throwing child before clicking reset
		rerender(
			<AldusErrorBoundary>
				<ThrowingChild shouldThrow={ false } />
			</AldusErrorBoundary>
		);
		fireEvent.click( resetBtn );
		expect(
			screen.getByText( 'Child rendered successfully' )
		).toBeInTheDocument();
	} );

	it( 'calls console.error with [Aldus] prefix when error is caught', () => {
		render(
			<AldusErrorBoundary>
				<ThrowingChild shouldThrow={ true } />
			</AldusErrorBoundary>
		);
		expect( console.error ).toHaveBeenCalledWith(
			expect.stringContaining( '[Aldus]' ),
			expect.any( Error ),
			expect.anything()
		);
	} );

	it( 'shows the caught error message in the details panel', () => {
		render(
			<AldusErrorBoundary>
				<ThrowingChild shouldThrow={ true } />
			</AldusErrorBoundary>
		);
		expect( screen.getByText( /Test render error/i ) ).toBeInTheDocument();
	} );
} );
