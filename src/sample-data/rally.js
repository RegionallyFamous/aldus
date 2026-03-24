/** Rally — event / conference. Energetic, inspiring, action-oriented. */
export const rally = {
	id: 'rally',
	label: 'Rally',
	emoji: '🎯',
	description: 'Event & conference',
	palette: {
		primary: '#0A2342',
		secondary: '#1B4F72',
		accent: '#F4D03F',
		light: '#FDFBF0',
		image: [ '#0A2342', '#1B4F72', '#F4D03F', '#2C7BB6' ],
	},
	content: {
		'heading:h1': [
			'Three Days That Change Everything.',
			'The Conference for People Who Do, Not Just Think.',
		],
		'heading:h2': [
			'Speakers',
			'Schedule',
			'The Venue',
			'Why Rally Is Different',
		],
		'heading:h3': [
			'Day One: Foundations',
			'Day Two: Systems',
			'Day Three: Action',
			'Workshops & Breakouts',
		],
		paragraph: [
			'Rally is an annual three-day gathering for operators, founders, and creative professionals who believe that ideas only matter when they ship. We built a conference around that conviction.',
			"We cap attendance at 600. Not because we can't fill more seats, but because the conversations that matter at Rally happen in hallways, at dinner tables, and on evening walks — not in stadium auditoriums.",
			"Every talk at Rally is new. We ban speakers from recycling their TED content, their conference circuit material, or anything they've said before. If you're on the Rally stage, you're saying something for the first time.",
		],
		'paragraph:dropcap': [
			"Rally started as a one-room gathering of 80 people who were tired of conferences that taught you nothing you couldn't learn from a podcast. Five years later, we've kept everything that made that first year work and thrown out everything that didn't.",
		],
		quote: [
			'"The single most useful three days I spend each year. Not an exaggeration." — Marcus T., startup founder',
			'"The hallway conversations alone were worth the ticket price. The talks were a bonus." — Priya N., product director',
		],
		'pullquote:wide': [
			'600 attendees. Every one of them worth meeting.',
			"We cap tickets so the people who couldn't get in want them more than ever.",
		],
		'pullquote:full-solid': [
			"Every speaker says something they've never said before. On camera.",
			'Three days. No filler. No vendor pitches. No wasted afternoons.',
		],
		list: [
			[
				'40 speakers across 3 main stages',
				'12 hands-on workshops with limited enrollment',
				'Curated dinner groups each evening',
				'Full recordings of every session',
			],
			[
				'Networking app with attendee matching',
				'Dedicated tracks for operators, founders, and creatives',
				'Office hours with 20 speakers by application',
				'Alumni network access post-event',
			],
		],
		'buttons:cta': [ 'Apply for Tickets', 'View the Schedule' ],
		separator: true,
		'spacer:large': true,
		'image:wide': [
			{ alt: 'Main stage keynote, packed room', colorIndex: 0 },
			{ alt: 'Workshop session, small group', colorIndex: 1 },
		],
		'image:full': [
			{ alt: 'Evening reception, city backdrop', colorIndex: 2 },
			{ alt: 'Speaker on stage, dramatic lighting', colorIndex: 3 },
		],
		'media-text:left': [
			{
				heading: 'The Venue',
				body: "Union Hall, Portland, Oregon. A converted rail terminal with three distinct stage environments, breakout rooms that don't feel like conference rooms, and enough natural light to stay awake through day three.",
				colorIndex: 0,
			},
			{
				heading: 'The Dinner Program',
				body: "Each evening, we seat 60 curated tables of 10. You'll be placed with people whose work intersects yours in ways you won't expect. This is where Rally actually happens.",
				colorIndex: 1,
			},
		],
		'media-text:right': [
			{
				heading: 'Speaker Office Hours',
				body: '20 speakers hold one-on-one office hours by application. 20 minutes, your agenda. Applications open 6 weeks before the event and fill in hours.',
				colorIndex: 2,
			},
			{
				heading: 'Workshops',
				body: '12 half-day workshops run in parallel with the main stage. Enrollment is capped at 30. They go deep on one thing and come out with a deliverable.',
				colorIndex: 3,
			},
		],
		'columns:28-72': [
			{
				label: 'Individual',
				body: '$1,495 — Full three-day access, all sessions, dinner program, and recordings. Early registration discount available through March 15.',
			},
			{
				label: 'Team of 3',
				body: '$3,900 — Best value for teams. Includes three individual passes and one guaranteed workshop enrollment per attendee.',
			},
			{
				label: 'Sponsor',
				body: '$12,000 — Ten passes, a branded dinner table, fifteen-minute stage time on day two, and logo placement across all event materials.',
			},
		],
		'columns:3-equal': [
			[
				{
					heading: 'October 14',
					body: 'Foundations. Keynotes and frameworks from operators who built things that lasted. Full day, three stages.',
				},
				{
					heading: 'October 15',
					body: 'Systems. Deep dives on the organizational and creative structures that make ambitious work possible.',
				},
				{
					heading: 'October 16',
					body: 'Action. Workshops, office hours, and a closing session that sends you home with a plan, not just inspiration.',
				},
			],
		],
		'group:dark-full': [
			{
				heading: 'Early Registration Closes March 15.',
				body: 'Rally sells out every year. Early registration saves $300 and guarantees your spot before the waitlist opens.',
				cta: 'Register Now — Save $300',
			},
		],
		'group:accent-full': [
			{
				heading: 'Scholarships Available.',
				body: "We reserve 40 tickets for founders, creators, and operators who couldn't otherwise attend. Applications open January 1.",
				cta: 'Apply for a Scholarship',
			},
		],
		'group:light-full': [
			{
				heading: 'The Rally Guarantee',
				body: "If you attend all three days and don't feel it was worth your time and money, we'll refund your ticket in full. We've offered this since year one. We've never had to honor it.",
			},
		],
	},
};
