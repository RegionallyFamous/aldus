/**
 * useAldusItems — content items lifecycle.
 *
 * Owns the items array, its attribute-persistence, undo/redo sync, and all
 * CRUD operations. Extracted from the monolithic Edit component so item
 * management can be reasoned about independently.
 *
 * @param {Object}   options
 * @param {Array}    options.savedItems    Current value of the savedItems attribute.
 * @param {Function} options.setAttributes Block setAttributes callback.
 * @param {Function} options.markAldusUsed Marks the plugin as used in preferences.
 * @param {Object}   options.lastFocusRef  Ref to track last-focused item id (for scroll).
 * @return {{
 *   items:        Array,
 *   itemsRef:     React.MutableRefObject,
 *   setItems:     Function,
 *   addItem:      Function,
 *   updateItem:   Function,
 *   removeItem:   Function,
 *   reorderItems: Function,
 *   moveItem:     Function,
 *   loadPreset:   Function,
 * }}
 */

import { useState, useEffect, useRef, useCallback } from '@wordpress/element';

// ---------------------------------------------------------------------------
// Helpers (duplicated from module scope in edit.js; kept local so the hook
// is self-contained and can be unit-tested without the full edit.js bundle)
// ---------------------------------------------------------------------------

const uid = () => {
	if (
		typeof crypto !== 'undefined' &&
		typeof crypto.randomUUID === 'function'
	) {
		return crypto.randomUUID();
	}
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, ( c ) => {
		const r = Math.floor( Math.random() * 16 );
		const v = c === 'x' ? r : ( r % 4 ) + 8;
		return v.toString( 16 );
	} );
};

const VALID_ITEM_TYPES = new Set( [
	'headline',
	'subheading',
	'paragraph',
	'quote',
	'image',
	'cta',
	'list',
	'video',
	'table',
	'gallery',
	'code',
	'details',
] );

/**
 * Filters and normalises items loaded from block attributes or localStorage.
 * Drops any entry with an unrecognised type so corrupted data cannot crash the UI.
 *
 * @param {unknown} raw Value from savedItems attribute or a stored session.
 * @return {Array} Validated, normalised item array.
 */
function validateSavedItems( raw ) {
	if ( ! Array.isArray( raw ) ) {
		return [];
	}
	return raw
		.filter(
			( item ) =>
				item !== null &&
				typeof item === 'object' &&
				VALID_ITEM_TYPES.has( item.type ) &&
				typeof item.content === 'string' &&
				typeof ( item.url ?? '' ) === 'string'
		)
		.map( ( item ) => {
			const clean = {
				id:
					typeof item.id === 'string' && item.id !== ''
						? item.id
						: uid(),
				type: item.type,
				content: item.content,
				url: item.url ?? '',
			};
			if ( Number.isInteger( item.mediaId ) ) {
				clean.mediaId = item.mediaId;
			}
			if ( Array.isArray( item.urls ) ) {
				clean.urls = item.urls.filter( ( u ) => typeof u === 'string' );
			}
			return clean;
		} );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAldusItems( {
	savedItems,
	setAttributes,
	markAldusUsed,
	lastFocusRef,
} ) {
	const [ items, setItems ] = useState( () =>
		validateSavedItems( savedItems )
	);

	// Always-current ref so callbacks and effects read the latest items even
	// when they're inside stale closures.
	const itemsRef = useRef( items );
	useEffect( () => {
		itemsRef.current = items;
	} );

	// Guard: distinguish our own attribute writes from external undo/redo changes.
	const selfWriteRef = useRef( false );

	// Persist items in block attributes on every change.
	useEffect( () => {
		selfWriteRef.current = true;
		setAttributes( { savedItems: items } );
		const id = setTimeout( () => {
			selfWriteRef.current = false;
		}, 0 );
		return () => clearTimeout( id );
	}, [ items ] ); // eslint-disable-line react-hooks/exhaustive-deps

	// Pull attribute changes back into state when undo/redo fires externally.
	useEffect( () => {
		if ( selfWriteRef.current ) {
			return;
		}
		setItems( validateSavedItems( savedItems ) );
	}, [ savedItems ] ); // eslint-disable-line react-hooks/exhaustive-deps

	// ---------------------------------------------------------------------------
	// CRUD
	// ---------------------------------------------------------------------------

	const addItem = useCallback(
		( type ) => {
			const id = uid();
			setItems( ( prev ) => [
				...prev,
				{ id, type, content: '', url: '' },
			] );
			if ( lastFocusRef ) {
				lastFocusRef.current = id;
			}
			markAldusUsed?.();
		},
		[ markAldusUsed, lastFocusRef ]
	);

	const updateItem = useCallback(
		( id, patch ) =>
			setItems( ( prev ) =>
				prev.map( ( i ) => ( i.id === id ? { ...i, ...patch } : i ) )
			),
		[]
	);

	const removeItem = useCallback(
		( id ) => setItems( ( prev ) => prev.filter( ( i ) => i.id !== id ) ),
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

	/**
	 * Replaces the current item list with a preset's items.
	 * Each preset item gets a fresh id so items are always unique.
	 *
	 * @param {Object} preset Preset object with an `items` array.
	 */
	const loadPreset = useCallback( ( preset ) => {
		setItems(
			preset.items.map( ( i ) => ( {
				id: uid(),
				content: '',
				url: '',
				...i,
			} ) )
		);
	}, [] );

	return {
		items,
		itemsRef,
		setItems,
		addItem,
		updateItem,
		removeItem,
		reorderItems,
		moveItem,
		loadPreset,
	};
}
