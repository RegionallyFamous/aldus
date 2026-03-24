/** Meridian — developer tools & SaaS. Clean, confident, technical. */
export const meridian = {
	id: 'meridian',
	label: 'Meridian',
	emoji: '⚡',
	description: 'Developer tools & SaaS',
	palette: {
		primary: '#0D1B2A',
		secondary: '#1B3A5C',
		accent: '#0EA5E9',
		light: '#F0F6FF',
		image: [ '#0D1B2A', '#1B3A5C', '#0EA5E9', '#0369A1' ],
	},
	content: {
		'heading:h1': [
			'Ship Infrastructure. Not Glue Code.',
			'The Deployment Platform Your Team Will Actually Use.',
		],
		'heading:h2': [
			'Built for Engineering Teams',
			'From Zero to Production',
			'Why Teams Switch to Meridian',
		],
		'heading:h3': [
			'Zero Config Deploys',
			'Observability Built In',
			'SOC 2 Type II Certified',
		],
		paragraph: [
			'Meridian removes the operational overhead that slows down engineering teams. Connect your repo, define your environments, and let the platform handle provisioning, scaling, and rollbacks. Your engineers ship features, not YAML.',
			'Most deployment platforms optimize for the happy path. Meridian optimizes for 3am. Instant rollbacks, structured logging, distributed tracing, and anomaly alerts that page the right person — not everyone.',
			"We built Meridian after spending years inside fast-growing companies that kept reinventing the same internal deployment tooling. The problem wasn't engineering talent. It was undifferentiated infrastructure work stealing time from product.",
		],
		'paragraph:dropcap': [
			"Every engineering team eventually hits the same wall: the tooling that got you to ten engineers breaks at fifty. Meridian is built for the team you're becoming, not the one you are today.",
			'Complexity is debt. Every abstraction layer you build in-house is a surface area you own forever. Meridian exists to shrink that surface area to zero.',
		],
		quote: [
			'"We cut deployment time from 40 minutes to under 3. Our engineers stopped dreading releases and started shipping twice as often." — CTO, Series B fintech',
			'"Meridian replaced four internal tools we\'d been maintaining for years. The migration took a weekend." — Staff Engineer, enterprise SaaS',
		],
		'pullquote:wide': [
			'The best infrastructure is the infrastructure you never have to think about.',
			"Your engineers didn't join your company to write Terraform. Give them their time back.",
		],
		'pullquote:full-solid': [
			'Mean time to deploy: 2.4 minutes. Mean time to rollback: 11 seconds.',
			"Zero-downtime deploys shouldn't require a dedicated platform engineer.",
		],
		list: [
			[
				'Git-push deploys to any cloud provider',
				'Automatic preview environments on every PR',
				'Built-in secrets management with audit logging',
				'One-click rollback to any previous deployment',
			],
			[
				'Multi-region active-active out of the box',
				'Cost anomaly detection with spend forecasting',
				'SAML SSO and fine-grained RBAC on all plans',
				'SLA-backed uptime with dedicated support on Enterprise',
			],
		],
		'buttons:cta': [
			'Start Free — No Credit Card',
			'Book an Engineering Demo',
		],
		separator: true,
		'spacer:large': true,
		'image:wide': [
			{ alt: 'Meridian deployment dashboard', colorIndex: 0 },
			{ alt: 'Pipeline visualization', colorIndex: 1 },
		],
		'image:full': [
			{ alt: 'Infrastructure diagram', colorIndex: 2 },
			{ alt: 'Observability console', colorIndex: 3 },
		],
		'media-text:left': [
			{
				heading: 'Instant Preview Environments',
				body: 'Every pull request gets its own fully-provisioned environment. Share a URL with design, product, and QA before a single line merges to main. No more "works on my machine."',
				colorIndex: 0,
			},
			{
				heading: 'Intelligent Cost Controls',
				body: 'Meridian tracks spend at the service level and alerts you before surprises hit your bill. Auto-scale down during off-peak hours without touching a config file.',
				colorIndex: 1,
			},
		],
		'media-text:right': [
			{
				heading: 'Observability Without Setup',
				body: 'Structured logs, distributed traces, and custom metrics are available from the first deploy. No agents to install, no dashboards to configure. Open your app, see everything.',
				colorIndex: 2,
			},
			{
				heading: 'Compliance on Day One',
				body: "SOC 2 Type II, HIPAA-ready infrastructure, and audit logs that satisfy your security team. Enterprise deals close faster when compliance isn't a six-month project.",
				colorIndex: 3,
			},
		],
		'columns:28-72': [
			{
				label: 'Deploy',
				body: 'Push to your branch, Meridian handles the rest. Automated smoke tests, canary rollouts, and instant rollbacks mean no more deployment anxiety.',
			},
			{
				label: 'Observe',
				body: 'Logs, traces, metrics, and alerts — unified in one place. Correlate a spike in error rate with a specific deployment in seconds, not hours.',
			},
			{
				label: 'Scale',
				body: 'Horizontal auto-scaling responds to real traffic in under 60 seconds. Define your scaling policy in five lines; Meridian executes it across every region.',
			},
		],
		'columns:3-equal': [
			[
				{
					heading: '2.4 min',
					body: 'Average time from git push to live deployment across all Meridian customers.',
				},
				{
					heading: '99.997%',
					body: 'Platform uptime over the past 24 months, across all regions and availability zones.',
				},
				{
					heading: '4,200+',
					body: 'Engineering teams that have replaced their internal deployment tooling with Meridian.',
				},
			],
		],
		'group:dark-full': [
			{
				heading:
					'Enterprise-Grade Infrastructure. Startup-Speed Setup.',
				body: 'SOC 2 Type II certified. HIPAA-ready. SAML SSO. Fine-grained RBAC. Everything your security team needs, ready before your first deploy.',
				cta: 'Talk to Enterprise Sales',
			},
		],
		'group:accent-full': [
			{
				heading: 'Free Migration from Your Current Platform',
				body: "Our engineering team handles the migration. You're in production on Meridian in under a week, or we extend your trial free.",
				cta: 'Claim Your Migration',
			},
		],
		'group:light-full': [
			{
				heading: 'Trusted by Teams at Every Stage',
				body: 'From pre-launch startups to publicly-traded companies, Meridian scales with the infrastructure complexity your growth demands.',
			},
		],
		table: [
			{
				caption: 'Plan comparison',
				rows: [
					[ 'Feature', 'Starter', 'Growth', 'Enterprise' ],
					[
						'Monthly active users',
						'10,000',
						'250,000',
						'Unlimited',
					],
					[ 'API calls / month', '500K', '10M', 'Unlimited' ],
					[ 'SLA uptime', '99.5%', '99.9%', '99.99%' ],
					[ 'Custom domains', '1', '5', 'Unlimited' ],
					[ 'SSO / SAML', 'No', 'Yes', 'Yes' ],
					[ 'Priority support', 'No', 'Email', 'Dedicated CSM' ],
				],
			},
		],
	},
};
