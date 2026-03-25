/**
 * safeIcon — validates an icon value before it reaches a WordPress component.
 *
 * WordPress components like ToolbarButton and Button accept either a React
 * element or a string dashicon name for their `icon` prop. If the value is
 * undefined (e.g. because a named import from @wordpress/icons doesn't exist),
 * the component throws a render error that can blank the entire editor canvas.
 *
 * This helper returns the icon unchanged if it is defined, or logs a warning
 * and returns a safe string fallback so the component renders without crashing.
 *
 * @param {*}      icon         The icon value to validate.
 * @param {string} fallbackName A dashicon string name to use when icon is falsy.
 * @return {*} The original icon, or the fallback string.
 */
export function safeIcon( icon, fallbackName = 'layout' ) {
	if ( icon === undefined || icon === null ) {
		// Only warn in development; production bundles strip process.env.NODE_ENV.
		if ( process.env.NODE_ENV !== 'production' ) {
			// eslint-disable-next-line no-console
			console.warn(
				`[Aldus] safeIcon: received ${
					icon === null ? 'null' : 'undefined'
				} icon, ` +
					`using fallback "${ fallbackName }". ` +
					'Check for a missing named export in @wordpress/icons.'
			);
		}
		return fallbackName;
	}
	return icon;
}
