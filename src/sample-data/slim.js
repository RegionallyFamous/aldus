/**
 * Slim — minimal 6-item neutral pack.
 *
 * Demonstrates what Aldus personalities do with the absolute minimum
 * input: one headline, one paragraph, one image, one CTA, one quote,
 * and one list.  Monochrome palette so the layout shape is the focus.
 */
export const slim = {
	id: 'slim',
	label: 'Slim',
	emoji: '◽',
	description: 'Minimal input — shows layout shape',
	palette: {
		primary: '#333333',
		secondary: '#555555',
		accent: '#111111',
		light: '#f5f5f5',
		image: [ '#333333', '#555555', '#777777', '#999999' ],
		imagePattern: 'diagonal',
	},
	content: {
		'heading:h1': [ 'A Clear Idea Deserves a Clear Layout.' ],
		'heading:h2': [ 'Less Input, More Signal' ],
		paragraph: [
			"Aldus works with whatever you bring. Six items is enough to see every personality's point of view — the way it balances your headline against an image, how it frames a quote, where it puts the call to action. Add more content to unlock richer arrangements.",
		],
		quote: [ 'Structure is the first form of generosity.' ],
		list: [
			'One headline\nOne paragraph\nOne image\nOne quote\nOne list\nOne CTA',
		],
		cta: [ 'Add your content' ],
		image: [],
	},
};
