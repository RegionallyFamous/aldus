/**
 * Block-to-item extraction helpers.
 *
 * Converts WordPress block objects into Aldus content item arrays.
 * These are pure functions (plus uid() for id generation) with no
 * dependency on React, WordPress data layer, or block editor APIs,
 * making them testable in a plain Node.js / jsdom environment.
 */

import { uid as generateId } from './uid.js';

/**
 * Normalises a media URL (embed, video, audio) for storage.
 *
 * @param {string} raw Raw URL from block attributes.
 * @return {string}
 */
function normalizeMediaUrl( raw ) {
	if ( typeof raw !== 'string' || ! raw.trim() ) {
		return '';
	}
	const t = raw.trim();
	return t.startsWith( '//' ) ? 'https:' + t : t;
}

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
		const fromAttr = extractPlainText( block.attributes?.value ?? '' );
		if ( fromAttr.trim() ) {
			return [
				{
					id: generateId(),
					type: 'quote',
					content: fromAttr,
					url: '',
				},
			];
		}
		const innerParas = ( block.innerBlocks ?? [] )
			.filter( ( b ) => b.name === 'core/paragraph' )
			.map( ( b ) => extractPlainText( b.attributes?.content ?? '' ) )
			.filter( ( t ) => t.trim() );
		if ( innerParas.length > 0 ) {
			return [
				{
					id: generateId(),
					type: 'quote',
					content: innerParas.join( '\n' ),
					url: '',
				},
			];
		}
		return [];
	}
	if ( block.name === 'core/list' ) {
		const listText = ( block.innerBlocks ?? [] )
			.map( ( li ) => extractPlainText( li.attributes?.content ?? '' ) )
			.filter( ( t ) => t.trim() )
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
	if ( block.name === 'core/button' ) {
		return [
			{
				id: generateId(),
				type: 'cta',
				content: block.attributes?.text ?? '',
				url: block.attributes?.url ?? '',
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
	if ( block.name === 'core/video' || block.name === 'core/audio' ) {
		const raw =
			block.attributes?.src ??
			block.attributes?.url ??
			'';
		const url = normalizeMediaUrl( typeof raw === 'string' ? raw : '' );
		if ( ! url ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'video',
				content: '',
				url,
			},
		];
	}
	if ( block.name === 'core/file' ) {
		const href = normalizeMediaUrl(
			typeof block.attributes?.href === 'string'
				? block.attributes.href
				: ''
		);
		const label =
			typeof block.attributes?.fileName === 'string'
				? block.attributes.fileName
				: typeof block.attributes?.text === 'string'
					? block.attributes.text
					: '';
		if ( ! href && ! label.trim() ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'cta',
				content: label,
				url: href,
			},
		];
	}
	if ( block.name === 'core/embed' ) {
		const embedUrl = normalizeMediaUrl(
			typeof block.attributes?.url === 'string' ? block.attributes.url : ''
		);
		if ( embedUrl && /^https?:\/\//i.test( embedUrl ) ) {
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
	if ( block.name === 'core/html' || block.name === 'core/freeform' ) {
		const raw = block.attributes?.content ?? '';
		const text = extractPlainText(
			typeof raw === 'string' ? raw : String( raw ?? '' )
		);
		if ( ! text.trim() ) {
			return [];
		}
		return [
			{
				id: generateId(),
				type: 'paragraph',
				content: text,
				url: '',
			},
		];
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
		const inners = block.innerBlocks ?? [];
		const summaryBlock = inners.find(
			( b ) =>
				b.name === 'core/details-summary' ||
				b.name === 'core/paragraph' ||
				b.name === 'core/heading'
		);
		const raw =
			summaryBlock?.attributes?.content ??
			summaryBlock?.attributes?.value ??
			'';
		const content = extractPlainText(
			typeof raw === 'string' ? raw : String( raw ?? '' )
		);
		if ( ! content.trim() ) {
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
	if (
		block.name === 'core/cover' ||
		block.name === 'core/media-text' ||
		block.name === 'core/row' ||
		block.name === 'core/stack'
	) {
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
	if ( item.type === 'video' ) {
		const u = String( item.url ?? '' ).trim();
		return (
			u.length > 0 ||
			String( item.content ?? '' ).trim().length > 0
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
