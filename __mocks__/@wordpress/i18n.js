/**
 * Manual Jest mock for @wordpress/i18n.
 *
 * Provides passthrough implementations of the i18n functions so modules
 * that call __(), _n(), sprintf(), etc. work correctly in tests without
 * requiring the actual @wordpress/i18n package to be a direct dependency.
 * @param text
 */
const __ = ( text ) => text;
const _n = ( single, plural, number ) => ( number === 1 ? single : plural );
const _x = ( text ) => text;
const _nx = ( single, plural, number ) => ( number === 1 ? single : plural );
const sprintf = ( format, ...args ) => {
	let i = 0;
	return format.replace( /%[sd]/g, () => args[ i++ ] ?? '' );
};
const setLocaleData = jest.fn();
const resetLocaleData = jest.fn();
const getLocaleData = jest.fn( () => ( {} ) );
const isRTL = jest.fn( () => false );

module.exports = {
	__,
	_n,
	_x,
	_nx,
	sprintf,
	setLocaleData,
	resetLocaleData,
	getLocaleData,
	isRTL,
};
