/**
 * ContentItem — drag-and-drop content item row with type-specific inputs.
 * Includes ListBuilder, ButtonInput, ImageInput, VideoInput, GalleryInput.
 */

import { forwardRef } from '@wordpress/element';
import {
	Button,
	TextControl,
	TextareaControl,
	Flex,
	FlexItem,
} from '@wordpress/components';
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { useFocusOnMount } from '@wordpress/compose';
import {
	close,
	dragHandle,
	chevronUp,
	chevronDown,
	plus,
} from '@wordpress/icons';
import { __, sprintf, _n } from '@wordpress/i18n';
import { TYPE_META } from '../data/content-types.js';
import { safeIcon } from '../utils/safeIcon';

// ---------------------------------------------------------------------------
// Content item card
// ---------------------------------------------------------------------------

export function ContentItem( {
	item,
	index,
	total,
	shouldFocus,
	onUpdate,
	onRemove,
	onMoveUp,
	onMoveDown,
	onDragStart,
	onDragEnd,
	onDragOver,
	onDragLeave,
	onDrop,
	isDragging,
	isDragOver,
	isRemoving,
} ) {
	const inputRef = useFocusOnMount( shouldFocus );
	const meta = TYPE_META[ item.type ] ?? {};

	// Pass 5: content preview in badge
	const preview = item.content
		? item.content.slice( 0, 28 ) + ( item.content.length > 28 ? '…' : '' )
		: '';

	const classes = [
		'aldus-item',
		`aldus-item--${ item.type }`,
		isDragging ? 'is-dragging' : '',
		isDragOver ? 'is-drag-over' : '',
		isRemoving ? 'is-removing' : '',
	]
		.filter( Boolean )
		.join( ' ' );

	return (
		<div
			className={ classes }
			role="listitem"
			onDragOver={ onDragOver }
			onDragLeave={ onDragLeave }
			onDrop={ onDrop }
		>
			<div
				className="aldus-drag-zone"
				draggable="true"
				aria-hidden="true"
				onDragStart={ ( e ) => {
					e.dataTransfer.effectAllowed = 'move';
					e.dataTransfer.setData( 'text/plain', item.id );
					onDragStart();
				} }
				onDragEnd={ onDragEnd }
			>
				<Button
					icon={ safeIcon( dragHandle ) }
					label={ __( 'Drag to reorder', 'aldus' ) }
					size="small"
					className="aldus-drag-btn"
					tabIndex={ -1 }
				/>
			</div>

			<span
				className={ `aldus-type-badge aldus-type-badge--${ item.type }` }
				aria-hidden="true"
			>
				{ meta.label }
				{ /* Pass 5: truncated content preview */ }
				{ preview && (
					<span className="aldus-badge-preview">
						&nbsp;—&nbsp;{ preview }
					</span>
				) }
			</span>

			<div className="aldus-item-input">
				{ meta.input === 'text' && (
					<TextControl
						ref={ inputRef }
						label={ meta.label }
						hideLabelFromVision
						value={ item.content }
						placeholder={ meta.placeholder }
						onChange={ ( val ) => onUpdate( { content: val } ) }
						help={
							! item.content
								? {
										headline: __(
											'Aim for 5–10 words',
											'aldus'
										),
										subheading: __(
											'Aim for 5–10 words',
											'aldus'
										),
										quote: __(
											'One strong sentence',
											'aldus'
										),
								  }[ item.type ] ?? undefined
								: undefined
						}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				) }
				{ meta.input === 'textarea' && item.type !== 'list' && (
					<TextareaControl
						ref={ inputRef }
						__nextHasNoMarginBottom
						label={ meta.label }
						hideLabelFromVision
						value={ item.content }
						placeholder={ meta.placeholder }
						onChange={ ( val ) => onUpdate( { content: val } ) }
						help={ ( () => {
							if ( item.content?.includes( '<' ) ) {
								return __(
									'Plain text only — HTML formatting will be stripped.',
									'aldus'
								);
							}
							if ( ! item.content && item.type === 'paragraph' ) {
								return __(
									'2–4 sentences works best',
									'aldus'
								);
							}
							return undefined;
						} )() }
						rows={ 3 }
					/>
				) }
				{ item.type === 'list' && (
					<ListBuilder
						ref={ inputRef }
						value={ item.content }
						onChange={ ( val ) => onUpdate( { content: val } ) }
					/>
				) }
				{ meta.input === 'image' && (
					<ImageInput
						ref={ inputRef }
						item={ item }
						onUpdate={ onUpdate }
						labelText={ meta.label }
					/>
				) }
				{ /* Pass 1: button type with label + URL fields */ }
				{ meta.input === 'button' && (
					<ButtonInput
						ref={ inputRef }
						item={ item }
						onUpdate={ onUpdate }
						labelText={ meta.label }
					/>
				) }
				{ meta.input === 'video' && (
					<VideoInput
						ref={ inputRef }
						item={ item }
						onUpdate={ onUpdate }
						labelText={ meta.label }
					/>
				) }
				{ meta.input === 'gallery' && (
					<GalleryInput
						ref={ inputRef }
						item={ item }
						onUpdate={ onUpdate }
						labelText={ meta.label }
					/>
				) }
			</div>

			<div
				className="aldus-reorder-btns"
				aria-label={ __( 'Reorder', 'aldus' ) }
			>
				<Button
					icon={ chevronUp }
					label={ __( 'Move up', 'aldus' ) }
					size="small"
					className="aldus-move-btn"
					onClick={ onMoveUp }
					disabled={ index === 0 }
				/>
				<Button
					icon={ chevronDown }
					label={ __( 'Move down', 'aldus' ) }
					size="small"
					className="aldus-move-btn"
					onClick={ onMoveDown }
					disabled={ index === total - 1 }
				/>
			</div>

			<Button
				icon={ safeIcon( close ) }
				label={ sprintf(
					/* translators: %s is the content item label, e.g. "Paragraph". */
					__( 'Remove %s', 'aldus' ),
					meta.label ?? item.type
				) }
				isDestructive
				size="small"
				className="aldus-remove-btn"
				onClick={ onRemove }
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// List builder — structured add/remove rows instead of raw textarea
// ---------------------------------------------------------------------------

export const ListBuilder = forwardRef( function ListBuilder(
	{ value, onChange },
	ref
) {
	const lines = value
		? value
				.split( '\n' )
				.filter( ( l, i, arr ) => l !== '' || i === arr.length - 1 )
		: [ '' ];
	const nonEmpty = lines.filter( Boolean );
	const displayLines = nonEmpty.length > 0 ? nonEmpty : [ '' ];

	const updateLine = ( index, text ) => {
		const next = [ ...displayLines ];
		next[ index ] = text;
		onChange( next.join( '\n' ) );
	};

	const removeLine = ( index ) => {
		const next = displayLines.filter( ( _, i ) => i !== index );
		onChange( ( next.length > 0 ? next : [ '' ] ).join( '\n' ) );
	};

	const addLine = () => {
		onChange( [ ...displayLines, '' ].join( '\n' ) );
	};

	return (
		<div className="aldus-list-builder">
			{ displayLines.map( ( line, i ) => (
				<div key={ i } className="aldus-list-builder-row">
					<span
						className="aldus-list-builder-bullet"
						aria-hidden="true"
					>
						•
					</span>
					<TextControl
						ref={ i === 0 ? ref : undefined }
						label={ sprintf(
							/* translators: %d is the list item number, e.g. "1". */
							__( 'List item %d', 'aldus' ),
							i + 1
						) }
						hideLabelFromVision
						value={ line }
						placeholder={ __( 'List item', 'aldus' ) }
						onChange={ ( text ) => updateLine( i, text ) }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					{ displayLines.length > 1 && (
						<Button
							icon={ safeIcon( close ) }
							label={ sprintf(
								/* translators: %d is the list item number, e.g. "1". */
								__( 'Remove item %d', 'aldus' ),
								i + 1
							) }
							size="small"
							isDestructive
							className="aldus-list-builder-remove"
							onClick={ () => removeLine( i ) }
						/>
					) }
				</div>
			) ) }
			<Button
				variant="tertiary"
				size="small"
				icon={ safeIcon( plus ) }
				className="aldus-list-builder-add"
				onClick={ addLine }
			>
				{ __( 'Add item', 'aldus' ) }
			</Button>
		</div>
	);
} );

// ---------------------------------------------------------------------------
// Pass 1: ButtonInput — label + URL fields for CTA/Button type
// ---------------------------------------------------------------------------

export const ButtonInput = forwardRef( function ButtonInput(
	{ item, onUpdate, labelText },
	ref
) {
	// Fetch nav menu items to suggest as link targets for the CTA URL field.
	const navItems = useSelect( ( select ) => {
		const menus = select( 'core' ).getEntityRecords( 'root', 'menu', {
			per_page: -1,
			context: 'view',
		} );
		if ( ! menus?.length ) {
			return [];
		}
		return (
			select( 'core' ).getEntityRecords( 'root', 'menu-item', {
				menus: menus[ 0 ].id,
				per_page: 12,
				context: 'view',
			} ) ?? []
		);
	}, [] );

	return (
		<div className="aldus-button-input" aria-label={ labelText }>
			<TextControl
				ref={ ref }
				label={ __( 'Label', 'aldus' ) }
				hideLabelFromVision
				value={ item.content }
				placeholder={ __( 'Button label', 'aldus' ) }
				onChange={ ( val ) => onUpdate( { content: val } ) }
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'URL', 'aldus' ) }
				hideLabelFromVision
				value={ item.url }
				placeholder={ __( 'https://…', 'aldus' ) }
				onChange={ ( val ) => onUpdate( { url: val } ) }
				type="url"
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			{ ! item.url && navItems?.length > 0 && (
				<div className="aldus-nav-suggestions">
					{ navItems.slice( 0, 6 ).map( ( m ) => (
						<button
							key={ m.id }
							type="button"
							className="aldus-nav-pill"
							onClick={ () => onUpdate( { url: m.url } ) }
						>
							{ m.title?.rendered ?? m.url }
						</button>
					) ) }
				</div>
			) }
		</div>
	);
} );

// ---------------------------------------------------------------------------
// Image input
// ---------------------------------------------------------------------------

export const ImageInput = forwardRef( function ImageInput(
	{ item, onUpdate, labelText },
	ref
) {
	const hasUrl = !! item.url;

	// Fetch recent media library images to show as quick-select thumbnails
	// when no image has been chosen yet.
	const recentMedia = useSelect(
		( select ) =>
			select( 'core' ).getEntityRecords( 'postType', 'attachment', {
				per_page: 8,
				orderby: 'date',
				order: 'desc',
				media_type: 'image',
			} ) ?? [],
		[]
	);

	return (
		<div className="aldus-image-input" aria-label={ labelText }>
			{ hasUrl && (
				<img
					className="aldus-image-preview"
					src={ item.url }
					alt={ __( 'Selected image preview', 'aldus' ) }
				/>
			) }
			<Flex align="center" gap={ 2 } wrap className="aldus-image-row">
				<FlexItem>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( media ) =>
								onUpdate( {
									url: media.url,
									content: media.alt || media.filename || '',
								} )
							}
							allowedTypes={ [ 'image' ] }
							value={ item.mediaId }
							render={ ( { open } ) => (
								<Button
									ref={ ref }
									variant="secondary"
									size="small"
									onClick={ open }
								>
									{ hasUrl
										? __( 'Change image', 'aldus' )
										: __( 'Choose from library', 'aldus' ) }
								</Button>
							) }
						/>
					</MediaUploadCheck>
				</FlexItem>
				<FlexItem>
					<span className="aldus-image-or">
						{ __( 'or', 'aldus' ) }
					</span>
				</FlexItem>
				<FlexItem isBlock>
					<TextControl
						label={ __( 'Image URL', 'aldus' ) }
						hideLabelFromVision
						value={ item.url }
						placeholder={ __( 'Paste image URL…', 'aldus' ) }
						onChange={ ( val ) => onUpdate( { url: val } ) }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</FlexItem>
				{ hasUrl && (
					<FlexItem>
						<Button
							icon={ safeIcon( close ) }
							label={ __( 'Remove image', 'aldus' ) }
							size="small"
							isDestructive
							onClick={ () =>
								onUpdate( { url: '', content: '' } )
							}
						/>
					</FlexItem>
				) }
			</Flex>
			{ ! hasUrl && recentMedia.length > 0 && (
				<div className="aldus-recent-media">
					{ recentMedia.map( ( m ) => (
						<button
							key={ m.id }
							type="button"
							className="aldus-media-thumb"
							onClick={ () =>
								onUpdate( {
									url: m.source_url,
									content:
										m.alt_text || m.title?.rendered || '',
									mediaId: m.id,
								} )
							}
						>
							<img
								src={
									m.media_details?.sizes?.thumbnail
										?.source_url ?? m.source_url
								}
								alt=""
							/>
						</button>
					) ) }
				</div>
			) }
		</div>
	);
} );

// ---------------------------------------------------------------------------
// VideoInput — URL for YouTube, Vimeo, or direct video
// ---------------------------------------------------------------------------

export const VideoInput = forwardRef( function VideoInput(
	{ item, onUpdate, labelText },
	ref
) {
	const url = item.url ?? '';
	let videoSource = null;
	if ( /youtube\.com|youtu\.be/i.test( url ) ) {
		videoSource = 'YouTube';
	} else if ( /vimeo\.com/i.test( url ) ) {
		videoSource = 'Vimeo';
	} else if ( url.trim() ) {
		videoSource = __( 'Video', 'aldus' );
	}

	return (
		<div className="aldus-video-input" aria-label={ labelText }>
			<TextControl
				ref={ ref }
				label={ __( 'Video URL', 'aldus' ) }
				hideLabelFromVision
				value={ url }
				placeholder={ __(
					'YouTube, Vimeo, or direct video URL',
					'aldus'
				) }
				onChange={ ( val ) => onUpdate( { url: val } ) }
				type="url"
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			{ videoSource && (
				<p className="aldus-video-detected">
					{ sprintf(
						/* translators: %s is the video platform name, e.g. "YouTube". */
						__( '%s detected', 'aldus' ),
						videoSource
					) }
				</p>
			) }
		</div>
	);
} );

// ---------------------------------------------------------------------------
// GalleryInput — multi-image picker from media library
// ---------------------------------------------------------------------------

export const GalleryInput = forwardRef( function GalleryInput(
	{ item, onUpdate, labelText },
	ref
) {
	const urls = Array.isArray( item.urls ) ? item.urls : [];

	return (
		<div className="aldus-gallery-input" aria-label={ labelText }>
			{ urls.length > 0 && (
				<div className="aldus-gallery-thumbs" aria-hidden="true">
					{ urls.slice( 0, 6 ).map( ( url, i ) => (
						<img
							key={ i }
							src={ url }
							alt=""
							className="aldus-gallery-thumb"
						/>
					) ) }
				</div>
			) }
			<MediaUploadCheck>
				<MediaUpload
					multiple
					gallery
					allowedTypes={ [ 'image' ] }
					onSelect={ ( media ) => {
						const arr = Array.isArray( media ) ? media : [ media ];
						onUpdate( {
							urls: arr.map( ( m ) => m.url ),
							mediaIds: arr.map( ( m ) => m.id ?? 0 ),
							content: arr.length > 0 ? arr[ 0 ].alt || '' : '',
						} );
					} }
					render={ ( { open } ) => (
						<Button
							ref={ ref }
							variant="secondary"
							size="small"
							onClick={ open }
							className="aldus-gallery-btn"
						>
							{ urls.length > 0
								? sprintf(
										/* translators: %d is the number of images selected */
										_n(
											'%d image — change',
											'%d images — change',
											urls.length,
											'aldus'
										),
										urls.length
								  )
								: __( 'Add images', 'aldus' ) }
						</Button>
					) }
				/>
			</MediaUploadCheck>
			{ urls.length > 0 && (
				<Button
					icon={ safeIcon( close ) }
					label={ __( 'Remove gallery', 'aldus' ) }
					size="small"
					isDestructive
					onClick={ () => onUpdate( { urls: [], content: '' } ) }
				/>
			) }
		</div>
	);
} );
