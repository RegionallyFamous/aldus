/**
 * Block-to-item extraction helpers.
 *
 * Converts WordPress block objects into Aldus content item arrays.
 * These are pure functions (plus uid() for id generation) with no
 * dependency on React, WordPress data layer, or block editor APIs,
 * making them testable in a plain Node.js / jsdom environment.
 */

import { uid as generateId } from './uid.js';

const VIDEO_HOSTS = /youtube\.com|youtu\.be|vimeo\.com/i;

/**
 * Safely extracts a plain-text string from a block's content attribute.
 * In WordPress 6.x the attribute value may be a string or a RichText value object.
 *
 * @param {string|Object|*} content Block content attribute value.
 * @return {string} Plain text without HTML tags.
 */
export function extractPlainText( content ) {
	if ( typeof content === 'string' ) {
		return content.replace( /<[^>]*>/g, '' );
	}
	if ( content && typeof content === 'object' ) {
		const str = String( content.text ?? content.originalHTML ?? '' );
		return str.replace( /<[^>]*>/g, '' );
	}
	return '';
}

/**
 * Converts a single WordPress block into zero or more Aldus content items.
 * Handles all content-bearing core block types plus recursive container blocks.
 *
 * @param {Object} block Parsed WordPress block object.
 * @return {Array} Array of Aldus content item objects (may be empty).
 */
export function extractItemFromBlock( block ) {
	if ( block.name === 'core/heading' ) {
		return [
			{
				id: generateId(),
				type: block.attributes.level === 1 ? 'headline' : 'subheading',
				content: extractPlainText( block.attributes.content ?? '' ),
				url: '',
			},
		];
	}
	if ( block.name === 'core/paragraph' ) {
		return [
			{
				id: generateId(),
				type: 'paragraph',
				content: extractPlainText( block.attributes.content ?? '' ),
				url: '',
			},
		];
	}
	if ( block.name === 'core/image' ) {
		return [
			{
				id: generateId(),
				type: 'image',
				content: '',
				url: block.attributes.url ?? '',
			},
		];
	}
	if ( block.name === 'core/pullquote' ) {
		const content = extractPlainText( block.attributes?.value ?? '' );
		if ( ! content ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'quote',
				content,
				url: '',
			},
		];
	}
	if ( block.name === 'core/quote' ) {
		return [
			{
				id: generateId(),
				type: 'quote',
				content: block.attributes.value ?? '',
				url: '',
			},
		];
	}
	if ( block.name === 'core/list' ) {
		const listText = ( block.innerBlocks ?? [] )
			.map( ( li ) => li.attributes?.content ?? '' )
			.filter( Boolean )
			.join( '\n' );
		if ( ! listText ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'list',
				content: listText,
				url: '',
			},
		];
	}
	if ( block.name === 'core/buttons' ) {
		const firstBtn = ( block.innerBlocks ?? [] ).find(
			( b ) => b.name === 'core/button'
		);
		if ( ! firstBtn ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'cta',
				content: firstBtn.attributes?.text ?? '',
				url: firstBtn.attributes?.url ?? '',
			},
		];
	}
	if ( block.name === 'core/embed' ) {
		const rawUrl = block.attributes?.url ?? '';
		const embedUrl = rawUrl.startsWith( '//' ) ? 'https:' + rawUrl : rawUrl;
		if ( embedUrl && VIDEO_HOSTS.test( embedUrl ) ) {
			return [
				{
					id: generateId(),
					type: 'video',
					content: '',
					url: embedUrl,
				},
			];
		}
		return [];
	}
	if ( block.name === 'core/table' ) {
		const rows = [
			...( block.attributes?.head ?? [] ),
			...( block.attributes?.body ?? [] ),
		];
		const cellText = rows
			.flatMap( ( row ) =>
				( row.cells ?? [] ).map( ( cell ) => cell.content ?? '' )
			)
			.filter( Boolean )
			.join( ' | ' );
		if ( ! cellText ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'table',
				content: cellText,
				url: '',
			},
		];
	}
	if ( block.name === 'core/gallery' ) {
		const images = ( block.innerBlocks ?? [] )
			.filter( ( b ) => b.name === 'core/image' )
			.slice( 0, 4 );
		const galleryUrls = images
			.map( ( b ) => b.attributes?.url )
			.filter( Boolean );
		if ( galleryUrls.length === 0 ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'gallery',
				content: '',
				url: galleryUrls[ 0 ],
				urls: galleryUrls,
			},
		];
	}
	if ( block.name === 'core/details' ) {
		const summaryBlock = ( block.innerBlocks ?? [] ).find(
			( b ) => b.name === 'core/paragraph' || b.name === 'core/heading'
		);
		const content = summaryBlock?.attributes?.content ?? '';
		if ( ! content ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'details',
				content,
				url: '',
			},
		];
	}
	if ( block.name === 'core/verse' ) {
		const content = block.attributes?.content ?? '';
		if ( ! content ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'quote',
				content,
				url: '',
			},
		];
	}
	if ( block.name === 'core/code' || block.name === 'core/preformatted' ) {
		const content = block.attributes?.content ?? '';
		if ( ! content ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'code',
				content,
				url: '',
			},
		];
	}
	if ( block.name === 'core/separator' ) {
		return [];
	}
	if ( block.name === 'core/columns' ) {
		return ( block.innerBlocks ?? [] ).flatMap( ( column ) =>
			( column.innerBlocks ?? [] ).flatMap( extractItemFromBlock )
		);
	}
	if ( block.name === 'core/group' ) {
		return ( block.innerBlocks ?? [] ).flatMap( extractItemFromBlock );
	}
	return [];
}

/**
 * Returns true if an extracted item carries enough data for Aldus to use.
 *
 * @param {{ type: string, content?: string, url?: string, urls?: string[] }} item Extracted item.
 * @return {boolean} True when the item has non-empty text, media URLs, or a meaningful CTA link.
 */
function itemHasExtractablePayload( item ) {
	if ( ! item || typeof item.type !== 'string' ) {
		return false;
	}
	if ( item.type === 'image' || item.type === 'gallery' ) {
		const hasUrl = !! ( item.url && String( item.url ).trim() );
		const hasUrls =
			Array.isArray( item.urls ) &&
			item.urls.some( ( u ) => u && String( u ).trim() );
		return hasUrl || hasUrls;
	}
	if ( item.type === 'cta' ) {
		return (
			!! String( item.content ?? '' ).trim() ||
			( !! item.url &&
				item.url !== '#' &&
				String( item.url ).trim() !== '' )
		);
	}
	return String( item.content ?? '' ).trim().length > 0;
}

/**
 * Walks the editor block tree (top-level and nested containers) and collects
 * Aldus content items, skipping the Aldus block itself. Uses the same rules as
 * "Redesign with Aldus" ({@link extractItemFromBlock}).
 *
 * @param {Object[]} blocks Root list from `wp.data.select('core/block-editor').getBlocks()`.
 * @return {Object[]} Items suitable for `savedItems` (each includes `id` from extract).
 */
export function collectItemsFromEditorBlocks( blocks ) {
	if ( ! Array.isArray( blocks ) ) {
		return [];
	}
	const out = [];
	const walk = ( list ) => {
		for ( const block of list ) {
			if ( ! block?.name ) {
				continue;
			}
			if ( block.name === 'aldus/layout-generator' ) {
				continue;
			}
			const extracted = extractItemFromBlock( block );
			if ( extracted.length > 0 ) {
				for ( const item of extracted ) {
					if ( itemHasExtractablePayload( item ) ) {
						out.push( item );
					}
				}
			} else if ( ( block.innerBlocks ?? [] ).length > 0 ) {
				walk( block.innerBlocks );
			}
		}
	};
	walk( blocks );
	return out;
}
