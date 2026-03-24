/** Roast — specialty coffee brand. Warm, sensory, lifestyle. */
export const roast = {
	id: 'roast',
	label: 'Roast',
	emoji: '☕',
	description: 'Specialty coffee brand',
	palette: {
		primary: '#3B1F0A',
		secondary: '#7C4A1E',
		accent: '#D4832A',
		light: '#F5ECD7',
		image: [ '#7C4A1E', '#3B1F0A', '#D4832A', '#A0612B' ],
	},
	content: {
		'heading:h1': [
			'Every Cup Has a Story Worth Tasting',
			'Sourced at Origin. Roasted with Intention.',
		],
		'heading:h2': [
			'From Farm to Filter',
			'The Roastery',
			'What Makes Us Different',
		],
		'heading:h3': [
			'Single Origin',
			'Small Batch Roasting',
			'The Morning Ritual',
		],
		paragraph: [
			'We travel to the source — high-altitude farms in Ethiopia, Colombia, and Guatemala — to find coffees that taste like somewhere. Each bag carries GPS coordinates, a harvest date, and a name we know personally.',
			'Our roasting philosophy is simple: get out of the way. Light roasts that let terroir speak. No dark-roast smoke screen hiding mediocre beans. Just coffee, done right.',
			'Most specialty roasters talk about flavor notes. We talk about the farmer who picked those cherries at peak ripeness, the mill that processed them over 48 hours, and the exporter who kept the chain of custody intact.',
		],
		'paragraph:dropcap': [
			'There is a moment, about four minutes into a proper pour-over, when the bloom settles and the coffee begins to open up. This is why we do what we do.',
			"Good coffee asks something of you. It asks you to slow down, to pay attention, to notice what's in the cup. We built Roast around that simple invitation.",
		],
		quote: [
			'"This is the best coffee I\'ve had outside of a trip to Oaxaca. Somehow they put terroir in a bag." — Maria T., Portland',
			'"I\'ve been buying beans for 15 years. Roast changed what I think is possible from a mail-order subscription." — Dev K., Austin',
		],
		'pullquote:wide': [
			"We don't roast to a profile. We roast to a place.",
			"The best cup you've ever had is still out there. We're going to find it.",
		],
		'pullquote:full-solid': [
			'Specialty coffee is an argument that excellence is worth paying for.',
			"We've traveled 40,000 miles in the past year. All of it for your morning cup.",
		],
		list: [
			[
				'Direct trade with 14 farms across 6 countries',
				'Roasted to order — ships within 48 hours',
				'Free grind adjustment on every order',
				'Carbon-neutral shipping on all domestic orders',
			],
			[
				'Single origin espresso available year-round',
				'Tasting notes written by the roaster, not a copywriter',
				'Refillable tin subscription saves 30% on packaging',
				'Wholesale available for cafés and restaurants',
			],
		],
		'buttons:cta': [
			'Shop the Current Harvest',
			'Start Your Subscription',
		],
		separator: true,
		'spacer:large': true,
		'image:wide': [
			{ alt: 'Coffee farm at sunrise', colorIndex: 0 },
			{ alt: 'Roasting in progress', colorIndex: 1 },
		],
		'image:full': [
			{ alt: 'High-altitude farm, Ethiopia', colorIndex: 2 },
			{ alt: 'Green coffee cherry closeup', colorIndex: 3 },
		],
		'media-text:left': [
			{
				heading: 'The Ethiopian Yirgacheffe',
				body: 'Bergamot, blueberry, and a finish that lingers like a good conversation. Our most requested single-origin, back for its third consecutive year.',
				colorIndex: 0,
			},
			{
				heading: 'Guatemala Huehuetenango',
				body: 'Grown at 1,900 meters by the Orozco family. Brown sugar sweetness, stone fruit acidity, and a clean finish that rewards patience.',
				colorIndex: 1,
			},
		],
		'media-text:right': [
			{
				heading: 'The Art of the Blend',
				body: "Our house blend changes every quarter — not because we're chasing trends, but because the best coffees available change every quarter. Consistency of quality, not consistency of formula.",
				colorIndex: 2,
			},
			{
				heading: 'Brew Guides',
				body: "Pour-over, AeroPress, moka pot, cold brew. Every method is a different conversation with the same coffee. We've written guides for all of them.",
				colorIndex: 3,
			},
		],
		'columns:28-72': [
			{
				label: 'Origin',
				body: 'We work directly with smallholder farms in Ethiopia, Colombia, Guatemala, Kenya, and Honduras. Each relationship is at least three years old.',
			},
			{
				label: 'Process',
				body: 'Natural, washed, and honey-processed coffees, each bringing different clarity and sweetness to the cup. We let the farmer decide what suits their land.',
			},
			{
				label: 'Roast',
				body: "Light to medium only. We stop before second crack every time. If you want a dark roast, we respect that, but it's not what we do.",
			},
		],
		'columns:3-equal': [
			[
				{
					heading: 'Sourcing',
					body: 'Forty farms. Six countries. One standard: exceptional quality at a price that keeps farmers growing specialty.',
				},
				{
					heading: 'Roasting',
					body: 'Small batches on a Loring S35. Roasted to order, shipped the same week. No sitting in a warehouse.',
				},
				{
					heading: 'Community',
					body: 'Free brewing classes every Saturday. A newsletter that actually teaches you something. A loyalty program that rewards curiosity.',
				},
			],
		],
		'group:dark-full': [
			{
				heading: 'Join 40,000 Coffee Obsessives',
				body: 'Monthly coffee deliveries, early access to limited releases, and a community of people who take their morning cup seriously.',
				cta: 'Start Your Subscription',
			},
		],
		'group:accent-full': [
			{
				heading: 'New Arrival: Kenya AB Nyeri',
				body: 'Blackcurrant, brown sugar, sparkling acidity. Only 200 bags available.',
				cta: 'Reserve Your Bag',
			},
		],
		'group:light-full': [
			{
				heading: 'The Roast Promise',
				body: "If your coffee isn't the best you've had at this price, we'll send you something better. No questions, no forms, no hassle.",
			},
		],
		gallery: [
			{
				caption: 'Farm to cup — a visual journey',
				colorIndices: [ 0, 1, 2, 3 ],
			},
			{
				caption: 'Life on the farm: harvest season in Ethiopia',
				colorIndices: [ 1, 2, 3, 0 ],
			},
		],
	},
};
