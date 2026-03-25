/** Forge — warm industrial maker brand. Craft, heat, process — no shortcuts. */
export const forge = {
	id: 'forge',
	label: 'Forge',
	emoji: '🔥',
	description: 'Handmade — warm industrial craft',
	palette: {
		primary: '#1C1C1C',
		secondary: '#4A4A4A',
		accent: '#D4621A',
		light: '#F0EBE3',
		image: [ '#1C1C1C', '#4A4A4A', '#D4621A', '#F0EBE3' ],
		imagePattern: 'strata',
	},
	content: {
		'heading:h1': [
			'We Make Things That Outlast the People Who Buy Them.',
			'The Forge Has Been Running Since 1987.',
		],
		'heading:h2': [
			'How We Work',
			'What Custom Work Actually Involves',
			'The Materials We Trust',
		],
		'heading:h3': [
			'Heat-Treated. Hand-Finished.',
			'No Shortcuts. No Exceptions.',
			'Every Piece Has a Number.',
		],
		paragraph: [
			"We don't use computer-controlled presses. We use hammers. The reason isn't nostalgia — it's that hammers leave a mark the metal remembers, and the metal is honest about it in ways that machines are not. Every dent, every fold, every seam is a record of the work. We consider that a feature.",
			"Custom work starts with a conversation, not a form. You describe what you need — the load it will bear, the environment it will live in, the hands that will use it. We ask questions you haven't thought of yet. Then we make a thing that fits, precisely, because fitting is the whole point.",
			'Lead times are what they are. Heat treatment takes 72 hours. Tempering cannot be rushed without ruining the piece. We have tried rushing it. We have ruined pieces. We no longer rush it. If your timeline requires compromising the metal, we will tell you, and we will wait.',
		],
		'paragraph:dropcap': [
			'There is a difference between made and manufactured. Manufactured means tolerances measured in millimeters, consistent across a thousand units, optimized for cost. Made means one person looked at one piece of metal, decided what it wanted to be, and spent three days finding out if they were right. We make things.',
			'The forge has been at this address since 1987. The neighborhood changed four times around it. The forge did not change. This is not stubbornness. It is precision about what matters.',
		],
		quote: [
			'"The metal doesn\'t care how long it takes. We\'ve learned not to either." — Amos Ridley, Head Smith',
			'"I asked for a railing that would last fifty years. He said he\'d never made one that didn\'t." — Client, renovation project, 2019',
		],
		'pullquote:wide': [
			'We have declined six orders this year. All six were projects we could not do correctly in the time available.',
			'Heat treatment is not a step you can skip. Neither is the conversation before we start.',
		],
		'pullquote:full-solid': [
			'Custom work. Eight-week lead time. No exceptions for either.',
			'If the piece is wrong, we remake it. That has never been a policy discussion.',
		],
		list: [
			[
				'High-carbon steel, tool steel, mild steel — matched to use case',
				'Forged, not cast — grain structure aligned with stress loads',
				'Heat treatment in-house: normalize, anneal, harden, temper',
				'Hand-finishing: grind, file, polish — no power tools on final surface',
			],
			[
				'Week 1–2: Design consultation and material specification',
				'Week 3–5: Forging and rough shaping',
				'Week 6: Heat treatment and hardness testing',
				'Week 7–8: Finishing, quality inspection, and delivery',
			],
		],
		'buttons:cta': [ 'Commission a Piece', 'See the Forge' ],
		'image:wide': [
			{
				alt: 'Hot steel under the hammer — forging in progress',
				colorIndex: 0,
			},
			{
				alt: 'Finished blade cooling after heat treatment',
				colorIndex: 2,
			},
		],
		'image:full': [
			{
				alt: 'The forge floor — forty years of soot and intention',
				colorIndex: 1,
			},
			{
				alt: 'Wall of finished commissions waiting for collection',
				colorIndex: 3,
			},
		],
		'media-text:left': [
			{
				heading: 'The Metal Remembers',
				body: "Every piece that comes out of this forge carries the history of what was done to it. The heat cycles, the hammer blows, the quench — all of it is recorded in the grain structure. A metallurgist could read that piece like a document. We think that's what craft means: the work is visible in the result.",
				colorIndex: 0,
			},
			{
				heading: 'Custom Work, Done Once',
				body: "We don't produce variants. When you commission a piece, you describe your exact need, and we make the exact thing. If your gate posts are 2.4 inches off-square, we account for that. If the handle needs to fit a left hand with three fingers missing, we make that handle. The conversation before we start is where the real work happens.",
				colorIndex: 2,
			},
		],
		'media-text:right': [
			{
				heading: 'Heat Treatment Is Not Optional',
				body: "Hardened steel that hasn't been properly tempered will shatter. Tempered steel that wasn't properly hardened will bend. The sequence matters, the temperatures matter, and the timing matters. We do not skip steps. We have never offered a faster option.",
				colorIndex: 1,
			},
			{
				heading: 'Thirty-Seven Years at This Address',
				body: 'The building is the same. The equipment is maintained, not replaced — a 1961 Chambersburg hammer that we have rebuilt three times from the frame up. The work is the same. We consider continuity a form of quality control.',
				colorIndex: 3,
			},
		],
		'columns:28-72': [
			{
				label: 'Carbon Steel',
				body: 'High-carbon for tools and blades. Medium-carbon for structural work. Low-carbon when weldability matters more than hardness. We select by application, not by inventory — which means we sometimes wait two weeks for the right stock. We wait.',
			},
			{
				label: 'Lead Time',
				body: 'Eight weeks from signed agreement to delivery. Six if the design is straightforward and materials are in stock. We have never delivered in four. Anyone who tells you four weeks is telling you something about their process that you should ask questions about.',
			},
			{
				label: 'Warranty',
				body: 'We have never had a structural failure on a piece we made correctly. On pieces we made incorrectly, we have remade them at our cost. This is not written into a contract. It is the reason we have been here since 1987.',
			},
		],
		'columns:3-equal': [
			[
				{
					heading: '1987',
					body: 'The year the forge opened. Same owner. Same building. Same insistence that the work be done right.',
				},
				{
					heading: '8 weeks',
					body: 'Standard lead time. Not negotiable, because the heat treatment schedule and the finishing work are not negotiable.',
				},
				{
					heading: '0 shortcuts',
					body: 'Every step in sequence, every time. The metal is unimpressed by urgency.',
				},
			],
		],
		'group:dark-full': [
			{
				heading: 'Made to Last. Not Made to Sell.',
				body: 'We are not interested in making things you replace. We are interested in making things that become unremarkable fixtures in your life — the gate you stop noticing because it has always been there, the hook that holds a hundred pounds without comment. That is what we are trying to build.',
				cta: 'Commission a Piece',
			},
		],
		'group:accent-full': [
			{
				heading: 'Architectural and Structural Commissions',
				body: 'Gates, railings, structural supports, custom hardware. If it needs to hold weight, hold up to weather, and still look right in thirty years, we are the right conversation to have. Lead times and minimums apply.',
				cta: 'Start the Conversation',
			},
		],
		'group:light-full': [
			{
				heading: "We Don't Take Every Job.",
				body: "If the timeline doesn't allow for correct work, we decline. If the design requires compromises we can't stand behind, we say so. We have lost commissions this way. We are at peace with that.",
			},
		],
	},
};
