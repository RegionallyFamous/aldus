/** Grove — farm-to-table produce delivery. Opinionated, earthy, self-aware about the preachiness. */
export const grove = {
	id: 'grove',
	label: 'Grove',
	emoji: '🌿',
	description: 'Farm-to-table produce',
	palette: {
		primary: '#1B2A0E',
		secondary: '#3A5A1C',
		accent: '#7AAF35',
		light: '#F5F8EF',
		image: [ '#3A5A1C', '#1B2A0E', '#7AAF35', '#5A8A28' ],
		imagePattern: 'grain',
	},
	content: {
		'heading:h1': [
			'Your Tomato Flew Here from Chile. Ours Walked.',
			'Grown Here. Eaten Here. No Boarding Pass Required.',
		],
		'heading:h2': [
			"This Week's Harvest",
			'The Farms Behind the Box',
			"How It Works (It's Not Complicated)",
		],
		'heading:h3': [
			'In Season Now',
			'Meet the People Who Grow Your Lunch',
			'From Mud to Mouth',
		],
		paragraph: [
			"Grove connects 34 small farms within 150 miles to people who want to eat what's actually growing right now. Not what's available year-round because it was picked green in another hemisphere and ripened under fluorescent lights in a warehouse the size of a football field. Actual food. From actual dirt.",
			'Seasonal eating sounds like a sacrifice until you try it. Then you learn that a January carrot from cold storage and a June carrot from the ground are two completely different vegetables sharing a name. One of them tastes like a carrot. The other tastes like a forgetting.',
			'Every farm in the Grove network is a family operation. Most have been farming the same land for two or three generations. None use synthetic pesticides. All are compensated at prices that keep them farming — which is the only kind of food system worth having, no matter how many TED talks suggest otherwise.',
		],
		'paragraph:dropcap': [
			"There is a sweetness to a carrot that was in the ground 72 hours ago. You can't describe it to someone who's only eaten grocery store carrots, for the same reason you can't describe color to someone who's only seen beige. You just have to taste it.",
			"We started Grove because we kept asking \"where did this come from?\" and kept getting a shrug. We thought we couldn't be the only ones asking. We weren't. There are thousands of us now. We're very annoying at dinner parties.",
		],
		quote: [
			"\"I've been a professional chef for 22 years. Grove is the first produce delivery that makes me feel like I'm shopping at the farmers market I always say I'll go to but don't because it's at 7 AM on a Saturday.\" — Chef, James Beard semifinalist",
			'"My kids now ask which farm their broccoli is from. This is either a parenting win or a parenting problem, and I choose to believe it\'s the first one." — Grove member, year three',
		],
		'pullquote:wide': [
			'The most radical thing you can do with a credit card is know who grew your dinner.',
			"Local isn't a lifestyle. It's a relationship with someone who has soil under their fingernails.",
		],
		'pullquote:full-solid': [
			"Within 150 miles. Within 72 hours. That's the entire business model.",
			'34 farms. No warehouses. Food that tastes like it was grown, not assembled.',
		],
		list: [
			[
				"Weekly harvest boxes customized to what's actually in the ground this week",
				"Farm profiles for every item — name, location, growing method, and the farmer's dog's name",
				'Flexible subscription — skip, pause, or cancel without talking to a human or lying to a chatbot',
				'Add-ons: eggs, bread, dairy, preserves, and whatever Tom at Whitebrook is experimenting with this month',
			],
			[
				'Restaurant accounts for chefs who want menus that change with the weather',
				'School cafeteria supply — because kids deserve better than beige',
				'Surplus program: when farms have a bumper week, you get the abundance at a discount',
				'Composting pickup included, because we thought about the full cycle and so should you',
			],
		],
		'buttons:cta': [
			'Start Your Harvest Box',
			"See What's Growing Right Now",
		],
		'image:wide': [
			{
				alt: 'Morning harvest at Whitebrook — baskets and dew',
				colorIndex: 0,
			},
			{
				alt: 'Spring greens at Ridgeline, absurdly photogenic',
				colorIndex: 1,
			},
		],
		'image:full': [
			{
				alt: 'Aerial view of Fernside Organic — rows and rows of intention',
				colorIndex: 2,
			},
			{
				alt: 'First light at Millbrook Farm, fog still making up its mind',
				colorIndex: 3,
			},
		],
		'media-text:left': [
			{
				heading: 'Whitebrook Farm',
				body: 'Third-generation vegetable farm in the river valley. Eighty acres. Certified organic since 1994, back when organic meant "weird" instead of "expensive." Tom and Carla Whitmore grow more variety than any farm in our network. They\'re competitive about it.',
				colorIndex: 0,
			},
			{
				heading: 'Ridgeline Gardens',
				body: 'Specialty greens, herbs, and edible flowers on a former hillside orchard. Sarah Chen converted the land eight years ago with zero farming experience and a conviction that the internet could teach her anything. She was right. Two regional awards agree.',
				colorIndex: 1,
			},
		],
		'media-text:right': [
			{
				heading: "What's In The Box",
				body: "Every Tuesday we publish the upcoming box contents with farm names, varieties, and cooking notes. You'll know your dinner before it leaves the field. Some members plan their whole week around the Tuesday email. We respect the commitment.",
				colorIndex: 2,
			},
			{
				heading: 'The Surplus Program',
				body: 'When nature overdelivers, we pass it on. Last summer: cherry tomatoes for days. This autumn: enough butternut squash to build a fort. Whatever the season gives, we share — at a price that makes you feel like you got away with something.',
				colorIndex: 3,
			},
		],
		'columns:28-72': [
			{
				label: 'Sourcing',
				body: "All 34 farms are within 150 miles. We visit each one annually, audit growing practices, and publish our standards publicly. If a farm cuts corners, they're out. This has happened once. It was awkward.",
			},
			{
				label: 'Logistics',
				body: "Harvested Monday. Packed Tuesday. Delivered Wednesday. The whole chain is 72 hours. That's why the lettuce is still crispy when you open the box instead of already composting itself.",
			},
			{
				label: 'Pricing',
				body: "We pay farmers 40% above conventional wholesale. That's the margin that keeps small farms farming. Your subscription isn't just food. It's an argument that the land matters. The land matters.",
			},
		],
		'columns:3-equal': [
			[
				{
					heading: '34 farms',
					body: "All within 150 miles. All meeting our standards. All named on every box. If we can't name it, we don't sell it.",
				},
				{
					heading: '72 hours',
					body: 'Field to fridge. Usually less. This is what "fresh" means. Everything else is marketing.',
				},
				{
					heading: '40% more',
					body: "What we pay above wholesale. Because if farmers can't make a living, there won't be farms. Math.",
				},
			],
		],
		'group:dark-full': [
			{
				heading: 'Feed Your Family. Keep a Farm Alive.',
				body: "A Grove box isn't just dinner. It's a vote for a food system where the person who grew your salad can afford to eat one too. That sentence shouldn't be radical, but here we are.",
				cta: 'Start Your Subscription',
			},
		],
		'group:accent-full': [
			{
				heading: 'Spring Boxes: Now Open',
				body: 'Asparagus, snap peas, radishes, and the first lettuces of the season — the ones that taste like the earth finally exhaled. Subscribe by Sunday for Wednesday delivery.',
				cta: 'Reserve a Box',
			},
		],
		'group:light-full': [
			{
				heading: 'No Tricks. Just Food.',
				body: "No wax. No gas-ripening. No variety bred for shelf life instead of flavor. No ingredients you can't pronounce. Just food, grown by people we know, delivered while it still remembers being alive.",
			},
		],
	},
};
