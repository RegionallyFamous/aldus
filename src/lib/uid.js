/**
 * Generates a UUID v4 string, with a fallback for non-secure contexts.
 *
 * @return {string} A unique identifier.
 */
export const uid = () => {
	if (
		typeof crypto !== 'undefined' &&
		typeof crypto.randomUUID === 'function'
	) {
		return crypto.randomUUID();
	}
	// Fallback for non-secure contexts and older engines.
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, ( c ) => {
		const r = Math.floor( Math.random() * 16 );
		const v = c === 'x' ? r : ( r % 4 ) + 8;
		return v.toString( 16 );
	} );
};
