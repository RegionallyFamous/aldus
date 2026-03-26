/**
 * UI string collections — loading messages and personality taglines.
 */

import { __ } from '@wordpress/i18n';

export const LAYOUT_TAGLINES = {
	Dispatch: __(
		'Dark opener, bold declaration, then the ask — urgency in three acts',
		'aldus'
	),
	Folio: __(
		'Label left, body right — every section reads like a magazine spread',
		'aldus'
	),
	Stratum: __( 'Dark, light, accent — the page as landscape', 'aldus' ),
	Broadside: __(
		'Cinematic image-text panels, CTA cut right in the middle',
		'aldus'
	),
	Manifesto: __(
		'Quiet H1, then a dark declaration, then three columns erupt',
		'aldus'
	),
	Nocturne: __(
		'Dark cover bleeds into full image, then surfaces into light',
		'aldus'
	),
	Tribune: __(
		'Newspaper front page energy, split by a bold pullquote',
		'aldus'
	),
	Overture: __(
		'Light cover builds to a reveal, accent section drops the curtain',
		'aldus'
	),
	Codex: __(
		'Typographic restraint — kicker, display headline, editorial inset',
		'aldus'
	),
	Dusk: __( 'Split-screen opener bleeds into gradient atmosphere', 'aldus' ),
	Broadsheet: __(
		'Four-column newspaper density, cleaved by a centered pullquote',
		'aldus'
	),
	Solstice: __(
		'Minimal cover, two-column rhythm, nothing superfluous',
		'aldus'
	),
	Mirage: __(
		'Gradient-drenched and lush — cover and color converge',
		'aldus'
	),
	Ledger: __(
		'Essay structure: two columns, attributed quote, editorial inset',
		'aldus'
	),
	Mosaic: __(
		'Images lead, text stays lean — built for visual portfolios',
		'aldus'
	),
	Prism: __( 'Three columns open into a full gallery grid', 'aldus' ),
};

export const LOADING_MESSAGES = [
	__( 'Trying on every style…', 'aldus' ),
	__( 'Your words, every which way…', 'aldus' ),
	__( 'Same content. Different energy. Almost there…', 'aldus' ),
	__( 'Dispatch is being dramatic. Nocturne is being moody…', 'aldus' ),
	__( 'Folio is arranging everything very carefully…', 'aldus' ),
	__(
		'Broadsheet wants more columns. Broadsheet always wants more columns.',
		'aldus'
	),
	__( "Solstice is removing things. That's its whole thing.", 'aldus' ),
	__( 'Stratum is stacking. Dark, light, accent. In that order.', 'aldus' ),
	__( 'Tribune thinks this is front-page material.', 'aldus' ),
	__( "Codex is choosing fonts and judging everyone else's.", 'aldus' ),
	__( 'Mirage is adding more gradients. Obviously.', 'aldus' ),
	__( 'Mosaic keeps asking if there are more images.', 'aldus' ),
];
