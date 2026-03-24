/** Grove — sustainable food & farm-to-table. Earthy, seasonal. */
export const grove = {
	id: 'grove',
	label: 'Grove',
	emoji: '🌿',
	description: 'Sustainable food & farm-to-table',
	palette: {
		primary: '#1B2A0E',
		secondary: '#3A5A1C',
		accent: '#7AAF35',
		light: '#F5F8EF',
		image: [ '#3A5A1C', '#1B2A0E', '#7AAF35', '#5A8A28' ],
	},
	content: {
		'heading:h1': [
			'Food That Knows Where It Came From.',
			'Grown Here. Eaten Here. As It Should Be.',
		],
		'heading:h2': [
			"This Week's Harvest",
			'The Farms Behind Your Food',
			'How Grove Works',
		],
		'heading:h3': [
			'In Season Now',
			'Meet the Growers',
			'From Soil to Table',
		],
		paragraph: [
			"Grove connects a network of 34 small farms within 150 miles of the city to households, restaurants, and institutions that want to eat what's actually growing. No global supply chains. No produce that traveled further than you did this week.",
			"Seasonal eating is not a sacrifice. It's an education. When you eat what's growing right now, you learn that winter squash is extraordinary, that spring peas are unlike anything you'll find in a freezer bag, and that the same tomato tastes completely different in July versus September.",
			'The farms in the Grove network are all family operations. Most have been farming the same land for two or three generations. None of them use synthetic pesticides. All of them are compensated at a price that keeps them in business — which is the only kind of food system worth building.',
		],
		'paragraph:dropcap': [
			"There is a particular sweetness to a carrot that was in the ground three days ago. It's not something you can describe to someone who's only eaten grocery-store carrots. It's something you have to taste.",
			"We started Grove because we kept asking where our food came from and getting vague answers. We thought we couldn't be the only ones asking. We weren't.",
		],
		quote: [
			"\"I've been cooking professionally for 22 years. Grove is the first produce delivery that makes me feel like I'm shopping at the best farmers market I've ever been to.\" — Chef, James Beard-nominated restaurant",
			'"My kids now ask which farm their vegetables are from. That\'s worth more than any discount." — Grove member, third year',
		],
		'pullquote:wide': [
			'The most radical thing you can do is know who grew your food.',
			"Local eating isn't a lifestyle. It's a relationship.",
		],
		'pullquote:full-solid': [
			"Within 150 miles. Within 72 hours. That's the Grove promise.",
			'34 farms. One network. Food that tastes like it was grown, not manufactured.',
		],
		list: [
			[
				"Weekly harvest boxes customized to what's actually growing",
				'Farm profiles for every item in your box',
				'Flexible subscription — skip, pause, or cancel anytime',
				'Add-ons: dairy, eggs, bread, and preserves from partner farms',
			],
			[
				'Restaurant accounts for chefs who want to cook seasonally',
				'Institutional supply for school cafeterias and corporate kitchens',
				'Harvest surplus program — reduced prices on abundance weeks',
				'Composting pickup included with every subscription',
			],
		],
		'buttons:cta': [ 'Start Your Harvest Box', "See What's Growing Now" ],
		separator: true,
		'spacer:large': true,
		'image:wide': [
			{ alt: 'Harvest baskets at Whitebrook Farm', colorIndex: 0 },
			{ alt: 'Spring greens at Ridgeline Gardens', colorIndex: 1 },
		],
		'image:full': [
			{ alt: 'Aerial view of Fernside Organic', colorIndex: 2 },
			{ alt: 'Early morning at Millbrook Farm', colorIndex: 3 },
		],
		'media-text:left': [
			{
				heading: 'Whitebrook Farm',
				body: 'Third-generation vegetable farm in the river valley. Eighty acres of mixed vegetables, certified organic since 1994. Tom and Carla Whitmore grow more variety than any other farm in our network.',
				colorIndex: 0,
			},
			{
				heading: 'Ridgeline Gardens',
				body: 'Specialty salad greens, herbs, and edible flowers grown on a former hillside orchard. Sarah Chen converted the land eight years ago and has won two regional awards for sustainable growing practices.',
				colorIndex: 1,
			},
		],
		'media-text:right': [
			{
				heading: "What's in the Box",
				body: 'Every Tuesday we publish the upcoming harvest box contents. Every item includes the farm name, the variety, and notes on how to store and cook it. You know your food before it arrives.',
				colorIndex: 2,
			},
			{
				heading: 'The Surplus Program',
				body: 'When farms have a bumper crop, we pass the abundance directly to members at reduced prices. Last summer, cherry tomatoes. This autumn, winter squash. Whatever the season gives, we share.',
				colorIndex: 3,
			},
		],
		'columns:28-72': [
			{
				label: 'Sourcing',
				body: 'All 34 farms are within 150 miles. We visit every farm annually, audit their growing practices, and publish our standards publicly. No surprises.',
			},
			{
				label: 'Logistics',
				body: "Harvested Monday. Packed Tuesday. Delivered Wednesday. The whole chain is 72 hours from field to your door. That's why it tastes the way it does.",
			},
			{
				label: 'Pricing',
				body: 'We pay farmers at a premium to conventional wholesale — on average 40% more. That margin is how good farms stay in business. Your subscription is an investment in the land.',
			},
		],
		'columns:3-equal': [
			[
				{
					heading: '34 farms',
					body: 'All within 150 miles, all meeting our growing standards, all named in every box we pack.',
				},
				{
					heading: '72 hours',
					body: 'Maximum time from harvest to your door. Usually less. This is what fresh actually means.',
				},
				{
					heading: '40% more',
					body: 'What we pay farmers above conventional wholesale prices. Because the economics have to work.',
				},
			],
		],
		'group:dark-full': [
			{
				heading: 'Feed Your Family. Support Your Farmers.',
				body: "A Grove subscription isn't just about better vegetables. It's about keeping small farms viable for the next generation of growers.",
				cta: 'Start Your Subscription',
			},
		],
		'group:accent-full': [
			{
				heading: 'Spring Boxes Now Available',
				body: 'Asparagus, snap peas, spring radishes, and the first lettuces of the season. Subscribe by Sunday for your first Wednesday delivery.',
				cta: 'Reserve Your Box',
			},
		],
		'group:light-full': [
			{
				heading: 'No Tricks. Just Food.',
				body: "No air miles. No cold storage. No waxed produce. No ingredients you can't pronounce. Just food grown by people we know, delivered while it's still alive.",
			},
		],
	},
};
