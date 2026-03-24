/** Meridian — developer deployment platform. Confident, dry, built by engineers who lived the pain. */
export const meridian = {
	id: 'meridian',
	label: 'Meridian',
	emoji: '⚡',
	description: 'Developer tools & deployment',
	palette: {
		primary: '#0D1B2A',
		secondary: '#1B3A5C',
		accent: '#0EA5E9',
		light: '#F0F6FF',
		image: [ '#0D1B2A', '#1B3A5C', '#0EA5E9', '#0369A1' ],
	},
	content: {
		'heading:h1': [
			'Ship Product. Not YAML.',
			"The Deployment Platform That Doesn't Need a Dedicated Person to Babysit It.",
		],
		'heading:h2': [
			'Built for Teams That Ship',
			'From Localhost to Production in Under 3 Minutes',
			'Why Engineering Leads Switch and Never Look Back',
		],
		'heading:h3': [
			'Zero-Config Deploys',
			"Observability That's Already On",
			'SOC 2 Certified (Yes, Really)',
		],
		paragraph: [
			"Meridian exists because we got tired of watching senior engineers spend their Thursdays debugging Terraform instead of building product. Connect your repo. Define your environments. Push. That's it. Everything else is our problem now.",
			'Most deployment platforms work great on the happy path. Meridian optimizes for 3 AM on a Saturday. Instant rollbacks, structured logging, and anomaly alerts that page the on-call engineer — not the entire Slack channel, because nobody needs that kind of energy at 3 AM.',
			"We didn't set out to build a deployment platform. We set out to stop building the same internal deployment tooling at every company we joined. The fourth time you solve the same problem, you either start a company or start therapy. We chose both.",
		],
		'paragraph:dropcap': [
			"Every engineering team hits the same wall at around fifty engineers: the tooling that got you here starts actively fighting you. Meridian is built for the team you're growing into, not the one you duct-taped together at Series A.",
			"Complexity is debt, and every internal abstraction layer is a surface area you maintain forever. We exist to make that surface area someone else's problem. (Ours. It's our problem. We're fine with this.)",
		],
		quote: [
			'"We cut deploy time from 40 minutes to 2.4. Our engineers stopped dreading Fridays and started deploying on Fridays. On purpose." — CTO, Series B fintech',
			'"Meridian replaced four internal tools we\'d been maintaining since 2019. The migration took a weekend. I\'m still upset about all the weekends I lost to those tools." — Staff Engineer, enterprise SaaS',
		],
		'pullquote:wide': [
			'The best infrastructure is the infrastructure nobody has to think about.',
			"Your engineers didn't accept your offer letter to write Terraform. Give them their weekends back.",
		],
		'pullquote:full-solid': [
			'Mean time to deploy: 2.4 minutes. Mean time to rollback: 11 seconds. Mean time to regret: zero.',
			'Zero-downtime deploys should not require a "deployment czar." That\'s not a real job.',
		],
		list: [
			[
				'Git-push deploys to any cloud provider (yes, even that one)',
				'Automatic preview environments on every PR — share a URL, not a Loom',
				'Built-in secrets management with audit logging your security team will actually like',
				'One-click rollback to any previous deploy — time travel, but for infrastructure',
			],
			[
				'Multi-region active-active with zero configuration (we mean it)',
				'Cost anomaly detection that emails you before your CFO does',
				'SAML SSO and fine-grained RBAC on all plans, including free',
				'SLA-backed uptime with an on-call team that picks up the phone',
			],
		],
		'buttons:cta': [
			'Start Free — No Credit Card, No "Let\'s Schedule a Demo" Email',
			"Book an Engineering Demo (We'll Show You, Not Pitch You)",
		],
		'image:wide': [
			{
				alt: 'Meridian dashboard showing a successful deploy',
				colorIndex: 0,
			},
			{
				alt: 'Pipeline visualization with green checkmarks everywhere',
				colorIndex: 1,
			},
		],
		'image:full': [
			{
				alt: 'Infrastructure topology map — nodes and edges, beautifully',
				colorIndex: 2,
			},
			{
				alt: 'Observability console with traces flowing in real time',
				colorIndex: 3,
			},
		],
		'media-text:left': [
			{
				heading: 'Preview Environments That Actually Work',
				body: 'Every PR gets its own environment with its own URL. Share it with design. Share it with product. Share it with your mom. No more "works on my machine" because it literally works on a machine we gave you.',
				colorIndex: 0,
			},
			{
				heading: 'Cost Controls for Grown-Ups',
				body: "Meridian tracks spend at the service level and alerts you before the surprise hits. Auto-scales down during off-peak. You'll know exactly why your bill is what it is, which is more than we can say for our phone plans.",
				colorIndex: 1,
			},
		],
		'media-text:right': [
			{
				heading: 'Observability Without the Setup Weekend',
				body: 'Logs, traces, and metrics from your first deploy. No agents. No config files. No weekend lost to "just getting Datadog working." Open the dashboard and everything\'s already there. Like magic, except it\'s engineering.',
				colorIndex: 2,
			},
			{
				heading: 'Compliance on Day One, Not Month Six',
				body: "SOC 2 Type II, HIPAA-ready, and audit logs that make your security team smile. (We've seen it happen.) Enterprise deals close faster when compliance isn't a six-month side quest.",
				colorIndex: 3,
			},
		],
		'columns:28-72': [
			{
				label: 'Deploy',
				body: "Push to your branch. Go get coffee. By the time you're back, your code is in production with automated smoke tests, canary rollouts, and a rollback button you'll hopefully never need.",
			},
			{
				label: 'Observe',
				body: 'Logs, traces, and metrics in one place. Correlate a spike in errors with the exact deploy that caused it. In seconds, not hours. Without convening a war room.',
			},
			{
				label: 'Scale',
				body: 'Horizontal auto-scaling responds to real traffic in under 60 seconds. Define your policy in five lines. We handle the rest across every region. Even the ones with weird latency.',
			},
		],
		'columns:3-equal': [
			[
				{
					heading: '2.4 min',
					body: 'Average deploy time across all Meridian customers. Some of them are faster. They know who they are.',
				},
				{
					heading: '99.997%',
					body: "Platform uptime over 24 months. The 0.003% was a Tuesday in April. We don't talk about that Tuesday.",
				},
				{
					heading: '4,200+',
					body: 'Engineering teams that have deleted their internal deployment scripts. The interns were thrilled.',
				},
			],
		],
		'group:dark-full': [
			{
				heading: 'Enterprise Infrastructure. Startup Impatience.',
				body: 'SOC 2. HIPAA. SAML. RBAC. Every acronym your security team requires, ready before your first deploy. No six-month procurement process required (but we can do that too if it makes someone feel better).',
				cta: 'Talk to Enterprise Sales',
			},
		],
		'group:accent-full': [
			{
				heading: "We'll Migrate You. For Free. This Week.",
				body: "Our engineering team handles the migration from your current platform. You'll be in production on Meridian in under a week, or we extend your trial until we get it right. That's not a promotion — that's the standard offer.",
				cta: 'Claim Your Migration',
			},
		],
		'group:light-full': [
			{
				heading: "Trusted by Teams Who've Been Burned Before",
				body: 'From pre-seed startups shipping their first feature to public companies managing traffic spikes on earnings day. We scale with whatever your growth throws at us. Yes, even that Black Friday thing.',
			},
		],
		table: [
			{
				caption: 'Meridian vs. the Competition',
				rows: [
					[ 'Feature', 'Meridian', 'Heroku', 'Fly.io', 'Render' ],
					[ 'Deploy time', '2.4 min', '8 min', '4 min', '5 min' ],
					[
						'Preview envs',
						'Every PR',
						'Manual',
						'Manual',
						'Manual',
					],
					[ 'Rollback', '11 sec', '3 min', '2 min', '2 min' ],
					[
						'SOC 2 (all plans)',
						'✓',
						'Enterprise',
						'✓',
						'Enterprise',
					],
					[ 'Free tier', '✓', '✗', '✓', '✓' ],
				],
			},
		],
	},
};
