/** Plume — travel & culture editorial. Wanderlust, slow travel. */
export const plume = {
	id: 'plume',
	label: 'Plume',
	emoji: '✈️',
	description: 'Travel & culture editorial',
	palette: {
		primary: '#1C1410',
		secondary: '#4A3728',
		accent: '#C4773A',
		light: '#FBF5EE',
		image: [ '#4A3728', '#1C1410', '#C4773A', '#8B5E3C' ],
	},
	content: {
		'heading:h1': [
			'The Places That Change You',
			"Slow Travel in a World That Won't Stop Moving",
		],
		'heading:h2': [
			'In This Issue',
			'Letters from the Road',
			'Where to Go Next',
		],
		'heading:h3': [ 'The Long Way', 'Off the Itinerary', 'Dispatches' ],
		paragraph: [
			"The train from Sarajevo to Mostar takes two and a half hours and passes through landscapes that look like they belong to a different century. We almost flew. We are so glad we didn't. There are things you cannot learn at 35,000 feet.",
			'The best travel advice we ever received was simple: stay longer. Everyone we spoke to who had been somewhere once wished they had stayed a week more. The second visit is always better. The third begins to feel like something else entirely.',
			"We started Plume because we were tired of travel writing that told you where to eat and where to sleep and in what order to see things. We wanted the other kind — the kind that made you feel like you'd already been somewhere before you arrived.",
		],
		'paragraph:dropcap': [
			'There is a particular quality of light in the Azores in October that photographers have been trying to describe for a century. The closest anyone has come is this: it looks like the day has decided to take its time.',
			'Not all who wander are lost. But some of the best ones are, at least briefly, and they come back with something the direct-route travelers never find.',
		],
		quote: [
			'"Plume is the only travel magazine I read cover to cover, then read again. It makes me want to go everywhere and rush nowhere." — Reader, issue 22',
			'"I booked a flight to Tbilisi after reading a single paragraph in your Georgia feature. Still the best decision I\'ve made this decade." — Subscriber, since issue 4',
		],
		'pullquote:wide': [
			"The best souvenir is a story you're still telling five years later.",
			'Travel is the only thing you can spend money on that makes you richer.',
		],
		'pullquote:full-solid': [
			"We don't write about destinations. We write about experiences that happen to have addresses.",
			"The place is never the point. The point is who you become while you're there.",
		],
		list: [
			[
				'Six weeks in the Azores: what the slow season reveals',
				'The overnight train network that connects a forgotten Europe',
				'Staying with strangers: a guide to trust and hospitality across cultures',
				"The 40 best markets in the world, ranked by the things you can't buy online",
			],
			[
				"How to travel for three months on a teacher's salary",
				"The photographer's guide to arriving before the light changes",
				'Border crossings: the bureaucracy, the anxiety, and the moments after',
				'Eating alone in restaurants: a defense and a guide',
			],
		],
		'buttons:cta': [ 'Read the Current Issue', 'Subscribe to Plume' ],
		separator: true,
		'spacer:large': true,
		'image:wide': [
			{ alt: 'Mostar old bridge at dusk', colorIndex: 0 },
			{ alt: 'Night market in Chiang Mai', colorIndex: 1 },
		],
		'image:full': [
			{ alt: 'Salt flats at sunrise, Bolivia', colorIndex: 2 },
			{ alt: 'Train station, rural Portugal', colorIndex: 3 },
		],
		'media-text:left': [
			{
				heading: 'The Azores Issue',
				body: "Nine islands, each with its own personality. We spent six weeks. We covered four. This is what we found on the ones the itinerary doesn't mention.",
				colorIndex: 0,
			},
			{
				heading: 'Georgia on Our Minds',
				body: "Tbilisi is the city every traveler discovers and immediately wants to keep secret. It's too late for that. Here's what to do before the boutique hotels outnumber the Soviet apartments.",
				colorIndex: 1,
			},
		],
		'media-text:right': [
			{
				heading: 'The Overnight Train',
				body: 'There is no better way to move between cities than to fall asleep in one country and wake up in another. We map the surviving overnight rail routes in Europe that are worth every uncomfortable hour.',
				colorIndex: 2,
			},
			{
				heading: 'How to Read a Menu',
				body: "Sixteen years of eating in places where we didn't speak the language. Everything we learned about ordering well, tipping correctly, and knowing when to just point.",
				colorIndex: 3,
			},
		],
		'columns:28-72': [
			{
				label: 'Feature',
				body: "This issue's long-form journey follows a writer across the length of Albania by bus — a country most Europeans couldn't place on a map and couldn't stop talking about after visiting.",
			},
			{
				label: 'Photography',
				body: "Twelve photographers. Twelve cities. One constraint: only images taken within 48 hours of arriving, before the eye adjusts and stops seeing what's actually there.",
			},
			{
				label: 'Almanac',
				body: 'Practical intelligence from our network of 200 contributors: visa changes, new direct routes, restaurant closures, hotel openings, festival dates, and the seasonal intelligence that changes everything.',
			},
		],
		'columns:3-equal': [
			[
				{
					heading: 'Long reads',
					body: "Six to ten thousand words per feature. We don't do short. Neither do the places worth writing about.",
				},
				{
					heading: 'Quarterly',
					body: 'Four issues a year, each themed around a region, a season, or a way of moving through the world.',
				},
				{
					heading: 'No algorithms',
					body: 'Our recommendations come from writers who went, stayed, paid their own way, and came back changed.',
				},
			],
		],
		'group:dark-full': [
			{
				heading: 'The Plume Archive: 22 Issues, Every Word',
				body: "Digital access to the complete Plume archive. Six hundred long-form pieces. Fifteen hundred photographs. Every journey we've published since 2017.",
				cta: 'Access the Archive',
			},
		],
		'group:accent-full': [
			{
				heading: 'Issue 23: The Balkans',
				body: 'On sale now. Bosnia, Albania, North Macedonia, and the roads that connect them. Our most ambitious issue yet.',
				cta: 'Get Issue 23',
			},
		],
		'group:light-full': [
			{
				heading: 'Written by People Who Actually Went',
				body: 'No press trips. No affiliate links. No sponsored content. Plume is funded entirely by readers who believe that honest travel writing is worth paying for.',
			},
		],
		gallery: [
			{
				caption: 'Dispatch: Northern Albania — landscapes and faces',
				colorIndices: [ 0, 1, 2, 3 ],
			},
			{
				caption: 'Readers in the field — your best shots from Issue 22',
				colorIndices: [ 1, 3, 0, 2 ],
			},
		],
	},
};
