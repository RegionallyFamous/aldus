/**
 * Safe icon imports for Aldus.
 *
 * WordPress components accept either a React element or a dashicon string for
 * their `icon` prop. Named exports from @wordpress/icons can be undefined in
 * older WordPress versions. Importing through this module guarantees a
 * non-crashing value: the original icon when it exists, or a dashicon string
 * fallback when it does not.
 *
 * Usage:
 *   import { closeIcon, undoIcon } from '../utils/icons';
 *   <Button icon={ closeIcon } />
 *
 * For one-off icons not listed here, use the underlying safeIcon() directly:
 *   import { safeIcon } from '../utils/icons';
 *   // then import your icon from the package and wrap it:
 *   <Button icon={ safeIcon( myIcon, 'admin-generic' ) } />
 */

import {
	close,
	undo,
	help,
	plus,
	replace as refresh,
	unlock,
} from '@wordpress/icons';

export { safeIcon } from './safeIcon';

export const closeIcon = close ?? 'no';
export const undoIcon = undo ?? 'undo';
export const helpIcon = help ?? 'editor-help';
export const plusIcon = plus ?? 'plus';
export const refreshIcon = refresh ?? 'update';
export const unlockIcon = unlock ?? 'unlock';
