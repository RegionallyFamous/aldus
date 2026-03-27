/**
 * RTL tests for ContentItem component.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContentItem } from '../components/ContentItem.js';

// Minimal no-op props shared across tests.
const noop = () => {};
const baseProps = {
	index: 0,
	total: 1,
	shouldFocus: false,
	onUpdate: noop,
	onRemove: noop,
	onMoveUp: noop,
	onMoveDown: noop,
	onDragStart: noop,
	onDragEnd: noop,
	onDragOver: noop,
	onDragLeave: noop,
	onDrop: noop,
	isDragging: false,
	isDragOver: false,
	isRemoving: false,
};

function makeItem( overrides = {} ) {
	return {
		id: 'test-1',
		type: 'headline',
		content: '',
		...overrides,
	};
}

describe( 'ContentItem', () => {
	it( 'renders with role="listitem"', () => {
		render( <ContentItem { ...baseProps } item={ makeItem() } /> );
		expect( screen.getByRole( 'listitem' ) ).toBeInTheDocument();
	} );

	it( 'applies aldus-item class and type class', () => {
		render( <ContentItem { ...baseProps } item={ makeItem( { type: 'paragraph' } ) } /> );
		const el = screen.getByRole( 'listitem' );
		expect( el ).toHaveClass( 'aldus-item' );
		expect( el ).toHaveClass( 'aldus-item--paragraph' );
	} );

	it( 'applies is-dragging class when isDragging is true', () => {
		render(
			<ContentItem
				{ ...baseProps }
				item={ makeItem() }
				isDragging={ true }
			/>
		);
		expect( screen.getByRole( 'listitem' ) ).toHaveClass( 'is-dragging' );
	} );

	it( 'applies is-drag-over class when isDragOver is true', () => {
		render(
			<ContentItem
				{ ...baseProps }
				item={ makeItem() }
				isDragOver={ true }
			/>
		);
		expect( screen.getByRole( 'listitem' ) ).toHaveClass( 'is-drag-over' );
	} );

	it( 'applies is-removing class when isRemoving is true', () => {
		render(
			<ContentItem
				{ ...baseProps }
				item={ makeItem() }
				isRemoving={ true }
			/>
		);
		expect( screen.getByRole( 'listitem' ) ).toHaveClass( 'is-removing' );
	} );

	it( 'shows the type badge with the correct label', () => {
		render( <ContentItem { ...baseProps } item={ makeItem( { type: 'quote' } ) } /> );
		// Badge renders the label from TYPE_META
		const badge = document.querySelector( '.aldus-type-badge' );
		expect( badge ).toBeTruthy();
		expect( badge.textContent ).toMatch( /quote/i );
	} );

	it( 'shows content preview in badge when content is set', () => {
		const content = 'Hello, world! This is a test headline.';
		render(
			<ContentItem
				{ ...baseProps }
				item={ makeItem( { type: 'headline', content } ) }
			/>
		);
		// Preview is truncated to 28 chars + ellipsis.
		const badge = document.querySelector( '.aldus-badge-preview' );
		expect( badge ).toBeTruthy();
		expect( badge.textContent ).toContain( 'Hello' );
	} );

	it( 'does not show badge preview when content is empty', () => {
		render( <ContentItem { ...baseProps } item={ makeItem( { content: '' } ) } /> );
		expect( document.querySelector( '.aldus-badge-preview' ) ).toBeFalsy();
	} );

	it( 'calls onRemove when the remove button is clicked', () => {
		const onRemove = jest.fn();
		render(
			<ContentItem
				{ ...baseProps }
				item={ makeItem() }
				onRemove={ onRemove }
			/>
		);
		const removeBtn = screen.getByRole( 'button', { name: /remove/i } );
		fireEvent.click( removeBtn );
		expect( onRemove ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'calls onMoveUp when the move-up button is clicked', () => {
		const onMoveUp = jest.fn();
		render(
			<ContentItem
				{ ...baseProps }
				item={ makeItem() }
				index={ 1 }
				total={ 3 }
				onMoveUp={ onMoveUp }
			/>
		);
		const upBtn = screen.getByRole( 'button', { name: /move up/i } );
		fireEvent.click( upBtn );
		expect( onMoveUp ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'calls onMoveDown when the move-down button is clicked', () => {
		const onMoveDown = jest.fn();
		render(
			<ContentItem
				{ ...baseProps }
				item={ makeItem() }
				index={ 0 }
				total={ 3 }
				onMoveDown={ onMoveDown }
			/>
		);
		const downBtn = screen.getByRole( 'button', { name: /move down/i } );
		fireEvent.click( downBtn );
		expect( onMoveDown ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'calls onUpdate when text content changes', () => {
		const onUpdate = jest.fn();
		render(
			<ContentItem
				{ ...baseProps }
				item={ makeItem( { type: 'headline', content: 'Old' } ) }
				onUpdate={ onUpdate }
			/>
		);
		// The TextControl mock renders a real <input>.
		const input = screen.getByDisplayValue( 'Old' );
		fireEvent.change( input, { target: { value: 'New headline' } } );
		expect( onUpdate ).toHaveBeenCalledWith( { content: 'New headline' } );
	} );

	it( 'renders a textarea for paragraph items', () => {
		render(
			<ContentItem
				{ ...baseProps }
				item={ makeItem( { type: 'paragraph', content: 'Body text' } ) }
			/>
		);
		const textarea = screen.getByDisplayValue( 'Body text' );
		expect( textarea.tagName ).toBe( 'TEXTAREA' );
	} );
} );
