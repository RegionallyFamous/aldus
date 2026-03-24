/** Signal — privacy-first email app. Dry, principled, sardonic about the state of the internet. */
export const signal = {
	id: 'signal',
	label: 'Signal',
	emoji: '🔒',
	description: 'Privacy-first email',
	palette: {
		primary: '#0C0C0C',
		secondary: '#2A2A2A',
		accent: '#22C55E',
		light: '#F0FDF4',
		image: [ '#2A2A2A', '#0C0C0C', '#22C55E', '#166534' ],
	},
	content: {
		'heading:h1': [
			"Email That Doesn't Read Your Email.",
			'Your Inbox Is None of Our Business. Literally.',
		],
		'heading:h2': [
			'How It Works',
			"What We Don't Do",
			'The Privacy You Stopped Expecting',
		],
		'heading:h3': [
			'End-to-End Encrypted',
			'Zero-Knowledge Architecture',
			'Calendar, Contacts, and a Conscience',
		],
		paragraph: [
			'Signal Mail is email the way it should have been built in the first place: encrypted, private, and completely uninterested in what you\'re writing. No scanning. No profiling. No "personalized ads" that know you searched for back pain remedies at 2 AM. Your messages are yours. That\'s the whole product.',
			"Most email providers give you a free inbox and charge you with your data. That's not a conspiracy theory — it's their business model, and they're very upfront about it if you read the 47-page terms of service they're counting on you not reading. We charge $4/month and read nothing. Absolutely nothing.",
			"We built Signal Mail after one of our founders realized he could predict his colleague's pregnancy before she announced it — based entirely on the targeted ads in his own inbox, because they'd exchanged three emails about a baby shower. That was the moment. That was enough.",
		],
		'paragraph:dropcap': [
			"Privacy isn't a feature. It's the absence of a hundred features that shouldn't have existed in the first place — ad targeting, behavioral profiling, \"smart\" sorting that's really just surveillance with a friendly UI. We removed all of it. What's left is email.",
			'There are two kinds of tech companies: the ones that make money from your data, and the ones that make money from your subscription. We are aggressively, boringly, unambiguously the second kind.',
		],
		quote: [
			'"I switched to Signal Mail and my ads across the internet got noticeably worse. Less relevant. Less creepy. It was the most satisfying downgrade of my life." — Elena V., journalist',
			'"My IT team evaluated Signal Mail expecting to find a catch. They found end-to-end encryption, zero-access architecture, and a privacy policy shorter than this quote." — CTO, healthcare startup',
		],
		'pullquote:wide': [
			'We can\'t read your email. Not "we promise not to." We architecturally cannot.',
			'The best privacy policy is one short enough to actually read. Ours is 400 words.',
		],
		'pullquote:full-solid': [
			'$4/month. No ads. No tracking. No business model that requires knowing your secrets.',
			'Zero-knowledge means zero knowledge. Not "some knowledge." Not "just metadata." Zero.',
		],
		list: [
			[
				'End-to-end encryption for every message, sent and received',
				"Zero-access architecture — we can't read your mail even if someone asks us to",
				'Custom domains with full encryption (yourname@yourdomain.com, privately)',
				"Calendar and contacts that don't phone home to an advertising network",
			],
			[
				'Import from Gmail, Outlook, or Yahoo in under 10 minutes — we tested with a 14GB inbox',
				'Browser, desktop, iOS, and Android — same encryption everywhere',
				"Aliases for when you want to sign up for things without becoming a lead in someone's CRM",
				'Open-source clients — audit the code yourself, we dare you (politely)',
			],
		],
		'buttons:cta': [
			'Start Your Free Trial — 30 Days, No Card',
			"Read Our Privacy Policy (It'll Take 2 Minutes. We Timed It.)",
		],
		'image:wide': [
			{
				alt: 'Signal Mail inbox — clean, calm, not watching you',
				colorIndex: 0,
			},
			{
				alt: 'Encryption key exchange diagram — the boring kind of beautiful',
				colorIndex: 1,
			},
		],
		'image:full': [
			{
				alt: 'Server room — your data lives here, encrypted, unbothered',
				colorIndex: 2,
			},
			{
				alt: 'Privacy policy printout — it fits on one page',
				colorIndex: 3,
			},
		],
		'media-text:left': [
			{
				heading: "Encryption That Isn't Theater",
				body: "Every message is encrypted on your device before it leaves. We hold the ciphertext. You hold the key. If our servers were seized tomorrow, the contents would be unreadable. This isn't a marketing claim. It's a mathematical guarantee.",
				colorIndex: 0,
			},
			{
				heading: 'Import Everything, Leave Nothing Behind',
				body: "Bring your entire Gmail or Outlook inbox with you. Contacts, folders, labels — all of it. The migration tool handles 14GB+ inboxes and finishes before your coffee does. Your old provider keeps nothing after you leave. (Okay, they probably keep some things. That's their problem now.)",
				colorIndex: 1,
			},
		],
		'media-text:right': [
			{
				heading: 'Aliases for the Cautious',
				body: "Generate a unique alias for every site, store, and newsletter. When one starts getting spam, you'll know exactly who sold your address. Disable it with one click. This isn't paranoia. It's data hygiene.",
				colorIndex: 2,
			},
			{
				heading: 'Open Source, Closed to Surveillance',
				body: 'Every client app is open source. Read the code. Compile it yourself. File a bug. Tell us what we got wrong. The kind of transparency where "trust us" is replaced by "verify us." We think that\'s how it should work.',
				colorIndex: 3,
			},
		],
		'columns:28-72': [
			{
				label: 'Encryption',
				body: 'AES-256 and RSA-4096 with forward secrecy. Keys are generated on your device and never transmitted. We hold encrypted blobs. To us, your inbox looks like static. Which is exactly the point.',
			},
			{
				label: 'Business Model',
				body: "$4/month. That's the business model. We sell you email. You pay for email. Nobody's attention is harvested. Nobody's data is auctioned. This is not a complicated arrangement.",
			},
			{
				label: 'Compliance',
				body: 'GDPR, HIPAA-compatible, SOC 2 Type II. Hosted in Switzerland and Iceland — jurisdictions chosen for legal frameworks, not tax advantages. (Okay, also a little for the tax advantages.)',
			},
		],
		'columns:3-equal': [
			[
				{
					heading: '400 words',
					body: "The length of our privacy policy. We think if you can't explain your data practices in under a page, your data practices need work.",
				},
				{
					heading: '0 bytes',
					body: 'The amount of your email we can read. Not "choose not to." Cannot. It\'s encrypted before it reaches us and decrypted after it leaves.',
				},
				{
					heading: '$4/mo',
					body: 'The price. No tiers. No "premium privacy." Everyone gets the same encryption, the same features, the same nothing-to-hide.',
				},
			],
		],
		'group:dark-full': [
			{
				heading:
					'Your Email Provider Knows More About You Than Your Therapist.',
				body: 'That\'s not an exaggeration. It\'s an architecture decision they made and you accepted when you clicked "I agree." Signal Mail is the alternative where "I agree" means "I agree to pay $4 and be left alone."',
				cta: 'Switch to Signal Mail',
			},
		],
		'group:accent-full': [
			{
				heading: 'Business Plans for Teams That Handle Sensitive Data',
				body: 'Custom domains. Admin controls. Audit logs. Everything your compliance team needs, without the part where a tech company reads your client communications. Starting at $6/user/month.',
				cta: 'See Business Plans',
			},
		],
		'group:light-full': [
			{
				heading: "We Make Money When You Pay Us. That's It.",
				body: 'No advertising partnerships. No data brokers. No "anonymized insights" that are one database join away from being very not anonymous. We sell email. You buy email. The incentives are aligned. Finally.',
			},
		],
	},
};
