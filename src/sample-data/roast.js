/** Roast — specialty coffee roaster. Warm, precise, a little obsessive. */
export const roast = {
	id: 'roast',
	label: 'Roast',
	emoji: '☕',
	description: 'Specialty coffee roaster',
	palette: {
		primary: '#3B1F0A',
		secondary: '#7C4A1E',
		accent: '#D4832A',
		light: '#F5ECD7',
		image: [ '#7C4A1E', '#3B1F0A', '#D4832A', '#A0612B' ],
		imagePattern: 'grain',
	},
	content: {
		'heading:h1': [
			'Life Is Too Short for Coffee That Tastes Like Regret.',
			'Sourced at Altitude. Roasted with Opinions.',
		],
		'heading:h2': [
			'From Cherry to Cup',
			'The Roastery Floor',
			"Why We're Like This",
		],
		'heading:h3': [
			'Single Origin',
			'Small Batch, Big Feelings',
			'The 6 AM Ritual',
		],
		paragraph: [
			"We fly to origin twice a year. Not for the vibes — although the vibes are excellent — but because you can't judge a coffee from a sample bag and a spec sheet. You have to stand on the farm at sunrise, cup it at the wet mill, and watch the farmer's face when you tell them it's the best lot you've tasted all year.",
			"Our roasting philosophy is simple: stop before you ruin it. Light roasts that let the bean tell you where it grew. If you want something dark enough to dissolve a spoon, we respect that, but we can't help you. We physically cannot.",
			'The difference between good coffee and great coffee is about four decisions made correctly across three continents over nine months. We obsess over all of them so you can just drink it and go "huh, that\'s really good" on a Tuesday morning.',
		],
		'paragraph:dropcap': [
			"There is a moment, roughly four minutes into a proper pour-over, when the bloom settles and the coffee opens up like it has something to tell you. This is not a metaphor. It actually does this. We've been chasing this moment since 2016.",
			'Good coffee is patient. It asks you to slow down, heat the water to exactly 205°F, and wait. We built this company for people who think the waiting is the best part.',
		],
		quote: [
			'"I used to think I liked dark roast. Turns out I just liked caffeine and had never met a Yirgacheffe. Roast ruined me." — Priya K., Portland',
			'"My coworkers now complain that the office Keurig tastes like hot cardboard. I take full responsibility and zero blame." — Marcus T., Austin',
		],
		'pullquote:wide': [
			"We don't roast to a profile. We roast to a place.",
			"The best cup you've ever had is out there. We're going to find it and mail it to you.",
		],
		'pullquote:full-solid': [
			'Specialty coffee is an argument that paying attention is worth paying for.',
			'40,000 air miles last year. All for your morning cup. We need to talk about our carbon offsets.',
		],
		list: [
			[
				'Direct trade with 14 farms across 6 countries',
				'Roasted to order — ships within 48 hours of roasting',
				"Free grind adjustment because we trust no one's grinder",
				"Carbon-neutral shipping (we're working on carbon-negative, give us a minute)",
			],
			[
				'Single origin espresso available year-round for the committed',
				'Tasting notes written by the roaster, not a marketing intern with a thesaurus',
				'Refillable tin subscription — saves 30% on packaging and 100% on guilt',
				'Wholesale for cafés that care (application includes a cupping test, sorry)',
			],
		],
		'buttons:cta': [
			'Shop the Current Harvest',
			'Start a Subscription (Your Future Self Will Thank You)',
		],
		'image:wide': [
			{
				alt: 'Coffee cherries drying on raised beds at sunrise',
				colorIndex: 0,
			},
			{
				alt: 'Roaster pulling a sample mid-roast, squinting',
				colorIndex: 1,
			},
		],
		'image:full': [
			{ alt: 'Yirgacheffe hillside at golden hour', colorIndex: 2 },
			{
				alt: "Green coffee closeup — the good stuff before it's roasted",
				colorIndex: 3,
			},
		],
		'media-text:left': [
			{
				heading: 'The Ethiopian Yirgacheffe',
				body: "Bergamot, blueberry, and a finish that lingers like a good conversation with someone you haven't seen in years. Our most requested single origin. Back for year three. We'd apologize for the dependency but we're not sorry.",
				colorIndex: 0,
			},
			{
				heading: 'Guatemala Huehuetenango',
				body: 'Grown at 1,900 meters by the Orozco family, who have been farming this land since before specialty coffee was a phrase. Brown sugar sweetness, stone fruit, and a clean finish that rewards patience. Pronouncing the name is optional.',
				colorIndex: 1,
			},
		],
		'media-text:right': [
			{
				heading: 'The Art of the Blend',
				body: "Our house blend changes every quarter. Not because we're chasing trends, but because the best available coffees change every quarter. Consistency of quality, not consistency of formula. If you liked last quarter's, tough. This quarter's is better.",
				colorIndex: 2,
			},
			{
				heading: 'Brew Guides for the Overthinking',
				body: 'Pour-over, AeroPress, moka pot, cold brew, and "I just have a Mr. Coffee and I\'m not ashamed." Every method is a different conversation with the same bean. We\'ve written guides for all of them, including the last one.',
				colorIndex: 3,
			},
		],
		'columns:28-72': [
			{
				label: 'Origin',
				body: "We work directly with smallholder farms in Ethiopia, Colombia, Guatemala, Kenya, and Honduras. Every relationship is at least three years old. We've been to every farm. They've been to our roastery. We exchange holiday cards.",
			},
			{
				label: 'Process',
				body: "Natural, washed, and honey-processed lots — each with a different clarity and sweetness. We don't tell the farmer how to process. They've been doing this longer than we've been alive.",
			},
			{
				label: 'Roast',
				body: "Light to medium. Always. We stop before second crack every time. If you want a French roast, we hear Costco has a lovely option. (We're kidding. Mostly.)",
			},
		],
		'columns:3-equal': [
			[
				{
					heading: 'Sourcing',
					body: "Fourteen farms. Six countries. One standard: if we wouldn't drink it every morning, we won't sell it to you.",
				},
				{
					heading: 'Roasting',
					body: 'Small batches on a Loring S35. Roasted to order. Shipped the same week. No warehouse. No shelf. No sadness.',
				},
				{
					heading: 'Community',
					body: 'Free cupping classes every Saturday. A newsletter that actually teaches you something. A loyalty program that rewards curiosity, not just spending.',
				},
			],
		],
		'group:dark-full': [
			{
				heading: 'Join 40,000 People Who Take Mornings Personally',
				body: "Monthly deliveries. Early access to limited lots. A community of humans who have opinions about water temperature. You'll fit right in.",
				cta: 'Start Your Subscription',
			},
		],
		'group:accent-full': [
			{
				heading: 'New Arrival: Kenya AB Nyeri',
				body: 'Blackcurrant, brown sugar, sparkling acidity. Only 200 bags made it through customs. (Kidding. But only 200 bags.)',
				cta: 'Reserve Your Bag',
			},
		],
		'group:light-full': [
			{
				heading: 'The Roast Promise',
				body: "If this isn't the best coffee you've had at this price, we'll send you something better. No forms. No receipts. No passive-aggressive survey. Just better coffee.",
			},
		],
	},
};
