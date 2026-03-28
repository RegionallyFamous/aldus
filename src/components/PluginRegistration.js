/**
 * PluginRegistration — editor SlotFill registrations for Aldus.
 *
 * Registers two SlotFills under `registerPlugin('aldus-ui')`:
 *
 * - PluginDocumentSettingPanel: "Aldus AI" panel in the document sidebar.
 *   Visible only when the current post contains an Aldus block.
 *   Shows AI model status, the active style note, and a quick redesign link.
 *
 * Import this module from src/index.js (side-effect import only).
 */

import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { useSelect, useDispatch, dispatch } from '@wordpress/data';
import { createBlock } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { useState, useEffect, useCallback } from '@wordpress/element';
import { collectItemsFromEditorBlocks } from '../lib/extract-helpers.js';
import { validateSavedItems } from '../hooks/useAldusItems.js';

const ALDUS_BLOCK_NAME = 'aldus/layout-generator';

/**
 * Derives a human-readable AI engine status string.
 *
 * Reads `window.__aldusEngineReady` (set by the Edit component when the
 * WebLLM model finishes loading) and `window.__aldusCapabilities.serverAI`
 * (set by PHP via inline script in Phase 5).
 *
 * @return {{ label: string, color: string }} Status label and indicator color.
 */
function useEngineStatus() {
	const [ status, setStatus ] = useState( () => resolveStatus() );

	useEffect( () => {
		const interval = setInterval( () => {
			const next = resolveStatus();
			setStatus( ( prev ) =>
				prev.label !== next.label ? next : prev
			);
		}, 2000 );
		return () => clearInterval( interval );
	}, [] );

	return status;
}

function resolveStatus() {
	if ( window.__aldusEngineReady === true ) {
		return { label: __( 'Model ready', 'aldus' ), color: '#00a32a' };
	}
	if ( window.__aldusEngineReady === 'error' ) {
		return { label: __( 'Model unavailable', 'aldus' ), color: '#cc1818' };
	}
	if ( window.__aldusCapabilities?.serverAI ) {
		return {
			label: __( 'Server AI available', 'aldus' ),
			color: '#007cba',
		};
	}
	return { label: __( 'Model not loaded', 'aldus' ), color: '#757575' };
}

/**
 * Finds the first Aldus block in the block list (shallow scan).
 *
 * @param {Array} blocks Editor block list.
 * @return {Object|null} The first matching Aldus block, or null.
 */
function findAldusBlock( blocks ) {
	for ( const block of blocks ) {
		if ( block.name === ALDUS_BLOCK_NAME ) {
			return block;
		}
	}
	return null;
}

function AldusDocumentPanel() {
	const blocks = useSelect( ( select ) => {
		return select( 'core/block-editor' ).getBlocks();
	}, [] );

	const { insertBlocks, selectBlock, updateBlockAttributes } =
		useDispatch( 'core/block-editor' );
	const engineStatus = useEngineStatus();

	const aldusBlock = findAldusBlock( blocks );

	const styleNote = aldusBlock?.attributes?.styleNote ?? '';
	const insertedPersonality =
		aldusBlock?.attributes?.insertedPersonality ?? '';
	const hasItems =
		( aldusBlock?.attributes?.items?.length ?? 0 ) > 0 ||
		( aldusBlock?.attributes?.savedItems?.length ?? 0 ) > 0;

	const handleFocusBlock = useCallback( () => {
		if ( aldusBlock ) {
			selectBlock( aldusBlock.clientId );
		}
	}, [ aldusBlock, selectBlock ] );

	const showNoImportableNotice = useCallback( () => {
		dispatch( 'core/notices' ).createNotice(
			'info',
			__(
				'No importable content found. Add headings, paragraphs, images, or other supported blocks on the page, then try again.',
				'aldus'
			),
			{ type: 'snackbar', isDismissible: true }
		);
	}, [] );

	const handleAddAldusAndImport = useCallback( () => {
		const collected = collectItemsFromEditorBlocks( blocks );
		const validated = validateSavedItems( collected );
		if ( validated.length === 0 ) {
			showNoImportableNotice();
			return;
		}
		const newBlock = createBlock( ALDUS_BLOCK_NAME, {
			savedItems: validated,
		} );
		insertBlocks( [ newBlock ], undefined, undefined, true );
		selectBlock( newBlock.clientId );
	}, [ blocks, insertBlocks, selectBlock, showNoImportableNotice ] );

	const handleAppendImportFromPage = useCallback( () => {
		if ( ! aldusBlock ) {
			return;
		}
		const collected = collectItemsFromEditorBlocks( blocks );
		const validated = validateSavedItems( collected );
		if ( validated.length === 0 ) {
			showNoImportableNotice();
			return;
		}
		const existing = validateSavedItems(
			aldusBlock.attributes?.savedItems
		);
		const merged = validateSavedItems( [ ...existing, ...validated ] );
		updateBlockAttributes( aldusBlock.clientId, {
			savedItems: merged,
		} );
		selectBlock( aldusBlock.clientId );
	}, [
		aldusBlock,
		blocks,
		selectBlock,
		updateBlockAttributes,
		showNoImportableNotice,
	] );

	return (
		<PluginDocumentSettingPanel
			name="aldus-ai-panel"
			title={ __( 'Aldus AI', 'aldus' ) }
			icon="layout"
		>
			<div className="aldus-doc-panel">
				<div className="aldus-doc-panel__status">
					<span
						className="aldus-doc-panel__status-dot"
						style={ { backgroundColor: engineStatus.color } }
					/>
					<span className="aldus-doc-panel__status-label">
						{ engineStatus.label }
					</span>
				</div>

				{ ! aldusBlock && (
					<>
						<Button
							variant="primary"
							className="aldus-doc-panel__add-import-btn"
							onClick={ handleAddAldusAndImport }
							__next40pxDefaultSize
						>
							{ __( 'Add Aldus & import page content', 'aldus' ) }
						</Button>
						<p className="aldus-doc-panel__hint">
							{ __(
								'Inserts an Aldus block and pulls in headings, paragraphs, and other supported blocks from this post.',
								'aldus'
							) }
						</p>
					</>
				) }

				{ aldusBlock && insertedPersonality && (
					<p className="aldus-doc-panel__field">
						<strong>{ __( 'Active style:', 'aldus' ) }</strong>{ ' ' }
						{ insertedPersonality }
					</p>
				) }

				{ aldusBlock && styleNote && (
					<p className="aldus-doc-panel__field">
						<strong>{ __( 'Style note:', 'aldus' ) }</strong>{ ' ' }
						{ styleNote }
					</p>
				) }

				{ aldusBlock && (
					<Button
						variant="secondary"
						className="aldus-doc-panel__import-append-btn"
						onClick={ handleAppendImportFromPage }
						__next40pxDefaultSize
					>
						{ __( 'Import more from page', 'aldus' ) }
					</Button>
				) }

				{ aldusBlock && hasItems && (
					<Button
						variant="secondary"
						size="small"
						onClick={ handleFocusBlock }
						className="aldus-doc-panel__redesign-btn"
					>
						{ __( 'Try a different look', 'aldus' ) }
					</Button>
				) }

				{ aldusBlock && ! hasItems && (
					<p className="aldus-doc-panel__hint">
						{ __(
							'Use Import more from page to pull post content in, or add items inside the block.',
							'aldus'
						) }
					</p>
				) }
			</div>
		</PluginDocumentSettingPanel>
	);
}

registerPlugin( 'aldus-ui', { render: AldusDocumentPanel } );
