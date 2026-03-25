/**
 * Quick-start presets — sample item lists for common content patterns.
 */

import { __ } from '@wordpress/i18n';

export const PRESETS = [
	{
		id: 'blog',
		name: __( 'Blog post', 'aldus' ),
		description: __( 'Headline · 2 paragraphs · Image', 'aldus' ),
		items: [
			{
				type: 'headline',
				content: __( 'The Afternoon Everything Changed', 'aldus' ),
			},
			{
				type: 'paragraph',
				content: __(
					"It started with a question nobody in the room wanted to answer. Not because it was hard — because the answer meant admitting that everything we'd built for the last eighteen months was pointing in the wrong direction.",
					'aldus'
				),
			},
			{
				type: 'paragraph',
				content: __(
					'What happened next took six weeks, two whiteboards, and a conversation in a parking lot that probably should have happened a year earlier. This is that story.',
					'aldus'
				),
			},
			{ type: 'image' },
		],
	},
	{
		id: 'landing',
		name: __( 'Landing page', 'aldus' ),
		description: __(
			'Headline · Subheading · Paragraph · Image · Button',
			'aldus'
		),
		items: [
			{
				type: 'headline',
				content: __( 'Build Something People Actually Use', 'aldus' ),
			},
			{
				type: 'subheading',
				content: __(
					'From first idea to first customer in one tool',
					'aldus'
				),
			},
			{
				type: 'paragraph',
				content: __(
					'Most tools promise to save you time. This one promises to save you from building the wrong thing. Start with what your users need, prototype it in hours, and ship it before the enthusiasm wears off.',
					'aldus'
				),
			},
			{ type: 'image' },
			{
				type: 'cta',
				content: __( 'Start building — free', 'aldus' ),
				url: '#',
			},
		],
	},
	{
		id: 'feature',
		name: __( 'Feature story', 'aldus' ),
		description: __( 'Headline · Quote · 2 paragraphs · Image', 'aldus' ),
		items: [
			{
				type: 'headline',
				content: __(
					'The Train That Goes Nowhere on Purpose',
					'aldus'
				),
			},
			{
				type: 'quote',
				content: __(
					'The destination was never the point. The point was the four hours between departure and arrival where nobody could reach us.',
					'aldus'
				),
			},
			{
				type: 'paragraph',
				content: __(
					'The overnight train from Belgrade to Bar has been running since 1976. It crosses 435 bridges and passes through 254 tunnels. It is never on time. Nobody who rides it cares.',
					'aldus'
				),
			},
			{
				type: 'paragraph',
				content: __(
					'We rode it three times in two weeks. Each time the landscape revealed something the previous trip had hidden — a gorge that only catches light at sunset, a village that appears for exactly forty seconds between two tunnels.',
					'aldus'
				),
			},
			{ type: 'image' },
		],
	},
	{
		id: 'product',
		name: __( 'Product pitch', 'aldus' ),
		description: __( 'Headline · Paragraph · List · Button', 'aldus' ),
		items: [
			{
				type: 'headline',
				content: __( 'Your Data. Your Rules. No Exceptions.', 'aldus' ),
			},
			{
				type: 'paragraph',
				content: __(
					"We built this because every alternative required trusting someone who had a financial incentive to read your files. We removed the incentive. What's left is a tool that does its job and minds its own business.",
					'aldus'
				),
			},
			{
				type: 'list',
				content:
					"End-to-end encryption on every file, every time\nZero-knowledge architecture — we can't see your data\nOpen-source clients you can audit yourself\nWorks offline after the first sync",
			},
			{
				type: 'cta',
				content: __( 'Try it free — no credit card', 'aldus' ),
				url: '#',
			},
		],
	},
	{
		id: 'portfolio',
		name: __( 'Portfolio', 'aldus' ),
		description: __( 'Headline · Paragraph · Gallery · Button', 'aldus' ),
		items: [
			{
				type: 'headline',
				content: __( 'Selected Work, 2023–2025', 'aldus' ),
			},
			{
				type: 'paragraph',
				content: __(
					'A collection of projects from the last two years — brand identities, editorial layouts, and the occasional thing that started as a napkin sketch and ended up on a billboard.',
					'aldus'
				),
			},
			{ type: 'gallery' },
			{
				type: 'cta',
				content: __( 'Get in touch', 'aldus' ),
				url: '#',
			},
		],
	},
	{
		id: 'tutorial',
		name: __( 'Tutorial', 'aldus' ),
		description: __(
			'Headline · Intro · Code · Explanation · Image',
			'aldus'
		),
		items: [
			{
				type: 'headline',
				content: __( 'How to Set Up Your First API Key', 'aldus' ),
			},
			{
				type: 'paragraph',
				content: __(
					'Before you can make your first request, you need an API key. This takes about two minutes and only needs to happen once.',
					'aldus'
				),
			},
			{
				type: 'code',
				content:
					'curl -X POST https://api.example.com/v1/auth \\\n  -H "Content-Type: application/json" \\\n  -d \'{"email": "you@example.com"}\'',
			},
			{
				type: 'paragraph',
				content: __(
					"The response includes a token field. Copy it — you'll use it as the Authorization header in every subsequent request. Tokens expire after 24 hours.",
					'aldus'
				),
			},
			{ type: 'image' },
		],
	},
	{
		id: 'comparison',
		name: __( 'Comparison', 'aldus' ),
		description: __( 'Headline · Table · Paragraph · Button', 'aldus' ),
		items: [
			{
				type: 'headline',
				content: __( 'How We Stack Up', 'aldus' ),
			},
			{
				type: 'table',
				content:
					'Feature, Us, Them\nPrice, $9/mo, $29/mo\nStorage, Unlimited, 10 GB\nSupport, Human, Chatbot',
			},
			{
				type: 'paragraph',
				content: __(
					"We could have made this table longer. We didn't need to.",
					'aldus'
				),
			},
			{
				type: 'cta',
				content: __( 'Switch today', 'aldus' ),
				url: '#',
			},
		],
	},
];
