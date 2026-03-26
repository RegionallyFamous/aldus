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
import { useSelect, useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';

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

	const { selectBlock } = useDispatch( 'core/block-editor' );
	const engineStatus = useEngineStatus();

	const aldusBlock = findAldusBlock( blocks );
	if ( ! aldusBlock ) {
		return null;
	}

	const styleNote = aldusBlock.attributes?.styleNote ?? '';
	const insertedPersonality =
		aldusBlock.attributes?.insertedPersonality ?? '';
	const hasItems =
		( aldusBlock.attributes?.items?.length ?? 0 ) > 0 ||
		( aldusBlock.attributes?.savedItems?.length ?? 0 ) > 0;

	function handleFocusBlock() {
		selectBlock( aldusBlock.clientId );
	}

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

				{ insertedPersonality && (
					<p className="aldus-doc-panel__field">
						<strong>{ __( 'Active style:', 'aldus' ) }</strong>{ ' ' }
						{ insertedPersonality }
					</p>
				) }

				{ styleNote && (
					<p className="aldus-doc-panel__field">
						<strong>{ __( 'Style note:', 'aldus' ) }</strong>{ ' ' }
						{ styleNote }
					</p>
				) }

				{ hasItems && (
					<Button
						variant="secondary"
						size="small"
						onClick={ handleFocusBlock }
						className="aldus-doc-panel__redesign-btn"
					>
						{ __( 'Try a different look', 'aldus' ) }
					</Button>
				) }

				{ ! hasItems && (
					<p className="aldus-doc-panel__hint">
						{ __(
							'Add content to the Aldus block to get started.',
							'aldus'
						) }
					</p>
				) }
			</div>
		</PluginDocumentSettingPanel>
	);
}

registerPlugin( 'aldus-ui', { render: AldusDocumentPanel } );
