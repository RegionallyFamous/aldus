/**
 * Slim — minimal content showcase.
 *  Six items only: shows which personalities shine with lean input.
 *  Deliberately sparse so previews reflect real-world minimal use cases.
 */
export const slim = {
	id: 'slim',
	label: 'Slim',
	emoji: '📄',
	description: 'Minimal content (6 items)',
	palette: {
		primary: '#1A1A1A',
		secondary: '#4A4A4A',
		accent: '#2563EB',
		light: '#F4F4F5',
		image: [ '#2563EB', '#1A1A1A', '#4A4A4A', '#93C5FD' ],
	},
	content: {
		'heading:h1': [ 'The afternoon everything changed' ],
		'heading:h2': [ 'What came after' ],
		paragraph: [
			'There are moments that rewrite the story you thought you were living. This is one of them — told simply, without ornament, because the truth needs no decoration.',
		],
		'image:wide': [ { alt: 'A single decisive moment', colorIndex: 0 } ],
		'pullquote:wide': [ 'Some ideas are too important to bury in prose.' ],
		'buttons:cta': [ 'Read the full story' ],
	},
};
