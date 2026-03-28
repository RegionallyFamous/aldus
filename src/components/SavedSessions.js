/**
 * StyleNoteField — optional free-text prompt hint for generation style.
 * SavedSessions — panel for saving and loading generation sessions.
 */

import { useState, useCallback } from '@wordpress/element';
import {
	Button,
	TextControl,
	TextareaControl,
	Popover,
} from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as preferencesStore } from '@wordpress/preferences';
import { close } from '@wordpress/icons';
import { __, sprintf, _n } from '@wordpress/i18n';
import { dateI18n } from '@wordpress/date';
import { validateSavedItems } from '../hooks/useAldusItems.js';
import { safeIcon } from '../utils/safeIcon';

// ---------------------------------------------------------------------------
// Style note — optional free-text prompt hint threaded to LLM
// ---------------------------------------------------------------------------

const STYLE_CHIPS = [
	{ label: __( 'Image-forward', 'aldus' ), value: 'image-lead' },
	{ label: __( 'Text-heavy', 'aldus' ), value: 'text-first' },
	{ label: __( 'Minimal', 'aldus' ), value: 'minimal' },
	{ label: __( 'Bold CTA', 'aldus' ), value: 'cta-focus' },
	{ label: __( 'Dark mood', 'aldus' ), value: 'dark' },
	{ label: __( 'Magazine', 'aldus' ), value: 'magazine' },
];

export function StyleNoteField( {
	value,
	onChange,
	inferredStyle = null,
	onApplyInferredStyle,
	onDismissInferredStyle,
} ) {
	const [ expanded, setExpanded ] = useState( false );

	const appendChip = ( chipValue ) => {
		const current = value.trim();
		onChange( current ? current + ', ' + chipValue : chipValue );
		setExpanded( true );
	};

	const suggestionBanner = inferredStyle ? (
		<div className="aldus-style-suggestion">
			<span className="aldus-style-suggestion-label">
				{ __( 'Suggested:', 'aldus' ) }
			</span>
			<button
				className="aldus-style-suggestion-apply"
				onClick={ onApplyInferredStyle }
			>
				{ inferredStyle }
			</button>
			<button
				className="aldus-style-suggestion-dismiss"
				aria-label={ __( 'Dismiss suggestion', 'aldus' ) }
				onClick={ onDismissInferredStyle }
			>
				{ '✕' }
			</button>
		</div>
	) : null;

	if ( ! expanded && ! value ) {
		return (
			<div>
				<button
					className="aldus-style-note-trigger"
					onClick={ () => setExpanded( true ) }
				>
					{ __( 'Any special instructions? (optional)', 'aldus' ) }
				</button>
				<div className="aldus-style-chips">
					{ STYLE_CHIPS.map( ( chip ) => (
						<button
							key={ chip.value }
							className="aldus-style-chip"
							onClick={ () => appendChip( chip.value ) }
						>
							{ chip.label }
						</button>
					) ) }
				</div>
				{ suggestionBanner }
			</div>
		);
	}

	return (
		<div className="aldus-style-note">
			<div className="aldus-style-chips">
				{ STYLE_CHIPS.map( ( chip ) => (
					<button
						key={ chip.value }
						className="aldus-style-chip"
						onClick={ () => appendChip( chip.value ) }
					>
						{ chip.label }
					</button>
				) ) }
			</div>
			<TextareaControl
				label={ __( 'Special instructions', 'aldus' ) }
				hideLabelFromVision
				value={ value }
				placeholder={ __(
					'E.g. "lead with the image", "keep it minimal", "bold call to action"…',
					'aldus'
				) }
				onChange={ onChange }
				rows={ 2 }
				__nextHasNoMarginBottom
			/>
			{ suggestionBanner }
		</div>
	);
}

// ---------------------------------------------------------------------------
// Saved sessions — localStorage snapshots of item sets
// ---------------------------------------------------------------------------

export function SavedSessions( { items, styleNote, onLoad } ) {
	const [ isOpen, setIsOpen ] = useState( false );
	const [ saveName, setSaveName ] = useState( '' );
	const [ anchorEl, setAnchorEl ] = useState( null );

	// Persist sessions in the WP preferences store — no raw localStorage access.
	const sessions = useSelect(
		( select ) =>
			select( preferencesStore ).get( 'aldus', 'sessions' ) ?? [],
		[]
	);
	const { set: setPref } = useDispatch( preferencesStore );

	// Capture post context to attach to saved sessions.
	const { postTitle, postId } = useSelect( ( select ) => {
		const editor = select( 'core/editor' );
		return {
			postTitle: editor?.getEditedPostAttribute( 'title' ) ?? '',
			postId: editor?.getEditedPostAttribute( 'id' ) ?? null,
		};
	}, [] );

	const autoName = sprintf(
		/* translators: %s: date string, e.g. "Mar 23" */
		__( 'Set — %s', 'aldus' ),
		dateI18n( 'M j', new Date() )
	);

	const saveSession = useCallback( () => {
		const name = saveName.trim() || autoName;
		const updated = [
			{
				name,
				items,
				styleNote: styleNote || null,
				savedAt: Date.now(),
				postTitle: postTitle || null,
				postId: postId || null,
			},
			...sessions,
		].slice( 0, 10 );
		setPref( 'aldus', 'sessions', updated );
		setSaveName( '' );
	}, [
		items,
		styleNote,
		sessions,
		saveName,
		autoName,
		postTitle,
		postId,
		setPref,
	] );

	const deleteSession = useCallback(
		( idx ) => {
			const updated = sessions.filter( ( _, i ) => i !== idx );
			setPref( 'aldus', 'sessions', updated );
		},
		[ sessions, setPref ]
	);

	return (
		<div ref={ setAnchorEl } className="aldus-saved-sessions-wrap">
			<Button
				variant="tertiary"
				size="small"
				className="aldus-saved-btn"
				onClick={ () => setIsOpen( ( v ) => ! v ) }
				aria-expanded={ isOpen }
			>
				{ sessions.length > 0
					? sprintf(
							/* translators: %d is the number of saved sessions. */
							_n(
								'Saved (%d)',
								'Saved (%d)',
								sessions.length,
								'aldus'
							),
							sessions.length
					  )
					: __( 'Saved', 'aldus' ) }
			</Button>
			{ isOpen && (
				<Popover
					anchor={ anchorEl }
					placement="bottom-end"
					onClose={ () => setIsOpen( false ) }
					noArrow
				>
					<div className="aldus-sessions">
						<div className="aldus-sessions-header">
							<span className="aldus-sessions-title">
								{ __( 'Saved sets', 'aldus' ) }
							</span>
							{ items.length > 0 && (
								<Button
									variant="secondary"
									size="small"
									onClick={ saveSession }
								>
									{ __( 'Save current', 'aldus' ) }
								</Button>
							) }
						</div>
						{ items.length > 0 && (
							<div className="aldus-sessions-name-row">
								<TextControl
									__next40pxDefaultSize
									value={ saveName }
									placeholder={ autoName }
									onChange={ setSaveName }
									hideLabelFromVision
									label={ __( 'Session name', 'aldus' ) }
									__nextHasNoMarginBottom
								/>
							</div>
						) }
						{ sessions.length === 0 && (
							<p className="aldus-sessions-empty">
								{ __( 'No saved sets yet.', 'aldus' ) }
							</p>
						) }
						{ sessions.map( ( session, i ) => (
							<div
								key={ session.savedAt }
								className="aldus-session-row"
							>
								<button
									className="aldus-session-load"
									onClick={ () => {
										onLoad(
											validateSavedItems( session.items ),
											session.styleNote ?? ''
										);
										setIsOpen( false );
									} }
								>
									<span className="aldus-session-name">
										{ session.name }
									</span>
									<span className="aldus-session-date">
										{ dateI18n(
											'M j, Y',
											session.savedAt
										) }
										{ session.postTitle && (
											<>
												{ ' · ' }
												{ session.postTitle.length > 24
													? session.postTitle.slice(
															0,
															24
													  ) + '…'
													: session.postTitle }
											</>
										) }
									</span>
								</button>
								<Button
									icon={ safeIcon( close ) }
									label={ __( 'Delete', 'aldus' ) }
									size="small"
									isDestructive
									onClick={ () => deleteSession( i ) }
								/>
							</div>
						) ) }
					</div>
				</Popover>
			) }
		</div>
	);
}
