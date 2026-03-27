/**
 * @wordpress/icons mock — stubs icon objects as simple strings.
 * All icons are represented as an SVG stub so safeIcon() doesn't throw.
 */
const iconStub = { type: 'svg', props: { children: [] } };

const handler = {
	get: ( target, prop ) => iconStub,
};

module.exports = new Proxy( {}, handler );
