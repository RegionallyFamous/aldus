/**
 * useAldusItems — content item CRUD and reorder logic.
 *
 * Owns the `items` state array and exposes a stable API for adding, updating,
 * removing, reordering, and importing content items. Extracted from the
 * monolithic Edit component so item logic can be tested independently.
 *
 * @param {Object}   options
 * @param {Array}    options.savedItems    Initial items from block attributes.
 * @param {Function} options.validateItems Function to validate/sanitize saved items.
 * @param {Function} options.generateId    Function that returns a unique id string.
 * @param {Function} [options.onFirstItem] Called when the user adds their first item.
 * @return {{
 *   items: Array,
 *   setItems: Function,
 *   addItem: Function,
 *   updateItem: Function,
 *   removeItem: Function,
 *   reorderItems: Function,
 *   moveItem: Function,
 *   loadPreset: Function,
 *   clearItems: Function,
 * }}
 */

import { useState, useCallback, useRef } from '@wordpress/element';

export function useAldusItems( {
	savedItems,
	validateItems,
	generateId,
	onFirstItem,
	setScreen,
} ) {
	const [ items, setItems ] = useState( () => validateItems( savedItems ) );

	// Track the id of the most recently added item so the editor can auto-focus it.
	const lastFocusRef = useRef( null );

	const addItem = useCallback(
		( type ) => {
			const id = generateId();
			setItems( ( prev ) => [
				...prev,
				{ id, type, content: '', url: '' },
			] );
			lastFocusRef.current = id;
			onFirstItem?.();
		},
		[ generateId, onFirstItem ]
	);

	const updateItem = useCallback(
		( id, patch ) =>
			setItems( ( prev ) =>
				prev.map( ( item ) =>
					item.id === id ? { ...item, ...patch } : item
				)
			),
		[]
	);

	const removeItem = useCallback(
		( id ) =>
			setItems( ( prev ) => prev.filter( ( item ) => item.id !== id ) ),
		[]
	);

	const reorderItems = useCallback( ( fromId, toId ) => {
		setItems( ( prev ) => {
			const from = prev.findIndex( ( i ) => i.id === fromId );
			const to = prev.findIndex( ( i ) => i.id === toId );
			if ( from < 0 || to < 0 || from === to ) {
				return prev;
			}
			const next = [ ...prev ];
			const [ moved ] = next.splice( from, 1 );
			next.splice( to, 0, moved );
			return next;
		} );
	}, [] );

	const moveItem = useCallback( ( id, dir ) => {
		setItems( ( prev ) => {
			const idx = prev.findIndex( ( i ) => i.id === id );
			if ( idx < 0 ) {
				return prev;
			}
			const swap = idx + dir;
			if ( swap < 0 || swap >= prev.length ) {
				return prev;
			}
			const next = [ ...prev ];
			[ next[ idx ], next[ swap ] ] = [ next[ swap ], next[ idx ] ];
			return next;
		} );
	}, [] );

	const loadPreset = useCallback(
		( preset ) => {
			setItems(
				preset.items.map( ( i ) => ( {
					// Preserve preset content and url so presets with sample text
					// are shown to the user as-is. Assign a fresh id for uniqueness.
					content: '',
					url: '',
					...i,
					id: generateId(),
				} ) )
			);
			setScreen?.( 'building' );
		},
		[ generateId, setScreen ]
	);

	const clearItems = useCallback( () => setItems( [] ), [] );

	return {
		items,
		setItems,
		lastFocusRef,
		addItem,
		updateItem,
		removeItem,
		reorderItems,
		moveItem,
		loadPreset,
		clearItems,
	};
}
