/**
 * Content type definitions — metadata for each item type the user can add.
 */

import { __ } from '@wordpress/i18n';
import {
	heading as headingIcon,
	paragraph as paragraphIcon,
	quote as quoteIcon,
	image as imageIcon,
	link as linkIcon,
	formatListBullets,
	video as videoIcon,
	table as tableIcon,
	gallery as galleryIcon,
	code as codeIcon,
} from '@wordpress/icons';

export const CONTENT_TYPES = [
	{
		type: 'headline',
		label: __( 'Headline', 'aldus' ),
		icon: headingIcon,
		placeholder: __( 'Your main heading', 'aldus' ),
		input: 'text',
		description: __( 'The big, bold title', 'aldus' ),
	},
	{
		type: 'subheading',
		label: __( 'Subheading', 'aldus' ),
		icon: headingIcon,
		placeholder: __( 'A section title', 'aldus' ),
		input: 'text',
		description: __( 'A section header', 'aldus' ),
	},
	{
		type: 'paragraph',
		label: __( 'Paragraph', 'aldus' ),
		icon: paragraphIcon,
		placeholder: __( 'Your body copy here', 'aldus' ),
		input: 'textarea',
		description: __( 'Your body copy', 'aldus' ),
	},
	{
		type: 'quote',
		label: __( 'Quote', 'aldus' ),
		icon: quoteIcon,
		placeholder: __( 'A compelling line', 'aldus' ),
		input: 'text',
		description: __( 'A line worth highlighting', 'aldus' ),
	},
	{
		type: 'image',
		label: __( 'Image', 'aldus' ),
		icon: imageIcon,
		placeholder: __( 'Paste image URL', 'aldus' ),
		input: 'image',
		description: __( 'A photo or graphic', 'aldus' ),
	},
	{
		type: 'cta',
		label: __( 'Button', 'aldus' ),
		icon: linkIcon,
		placeholder: __( 'Button label', 'aldus' ),
		input: 'button',
		description: __( 'A link that pops', 'aldus' ),
	},
	{
		type: 'list',
		label: __( 'List', 'aldus' ),
		icon: formatListBullets,
		placeholder: __( 'One item per line', 'aldus' ),
		input: 'textarea',
		description: __( 'Bullet points', 'aldus' ),
	},
	{
		type: 'video',
		label: __( 'Video', 'aldus' ),
		icon: videoIcon,
		placeholder: __( 'YouTube or Vimeo URL', 'aldus' ),
		input: 'video',
		description: __( 'A video or embed', 'aldus' ),
	},
	{
		type: 'table',
		label: __( 'Table', 'aldus' ),
		icon: tableIcon,
		/* translators: table placeholder — two lines showing column headers then a sample row */
		placeholder:
			__( 'Header 1, Header 2', 'aldus' ) +
			'\n' +
			__( 'Row 1 A, Row 1 B', 'aldus' ),
		input: 'textarea',
		description: __( 'Structured data', 'aldus' ),
	},
	{
		type: 'gallery',
		label: __( 'Gallery', 'aldus' ),
		icon: galleryIcon,
		placeholder: __( 'Add images from your media library', 'aldus' ),
		input: 'gallery',
		description: __( 'A grid of images', 'aldus' ),
	},
	{
		type: 'code',
		label: __( 'Code', 'aldus' ),
		icon: codeIcon,
		placeholder: __( 'Paste your code snippet here', 'aldus' ),
		input: 'textarea',
		description: __( 'A code block', 'aldus' ),
	},
	{
		type: 'details',
		label: __( 'FAQ / Accordion', 'aldus' ),
		icon: formatListBullets,
		placeholder: __( 'Question or section heading', 'aldus' ),
		input: 'text',
		description: __( 'A collapsible FAQ section', 'aldus' ),
	},
];

export const TYPE_META = Object.fromEntries(
	CONTENT_TYPES.map( ( t ) => [ t.type, t ] )
);

// Primary (80% use case) vs secondary (specialist) content types for the tiered inserter.
export const PRIMARY_CONTENT_TYPE_IDS = new Set( [
	'headline',
	'paragraph',
	'image',
	'quote',
	'cta',
] );
export const PRIMARY_CONTENT_TYPES = CONTENT_TYPES.filter( ( t ) =>
	PRIMARY_CONTENT_TYPE_IDS.has( t.type )
);
export const SECONDARY_CONTENT_TYPES = CONTENT_TYPES.filter(
	( t ) => ! PRIMARY_CONTENT_TYPE_IDS.has( t.type )
);
