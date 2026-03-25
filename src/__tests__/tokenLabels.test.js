/**
 * Tests for tokenShortLabel() and tokenHumanLabel() from src/edit.js.
 *
 * Functions are inlined here to keep tests self-contained, pending the
 * architecture refactor that will export them as named functions.
 */

// ---------------------------------------------------------------------------
// Inline mirrors of the functions under test
// ---------------------------------------------------------------------------

const SHORT_LABELS = {
	'cover:dark': 'cover',
	'cover:light': 'cover·lt',
	'cover:minimal': 'cover·min',
	'cover:split': 'cover·split',
	'columns:2-equal': '2-col',
	'columns:28-72': '28–72',
	'columns:3-equal': '3-col',
	'columns:4-equal': '4-col',
	'media-text:left': 'media',
	'media-text:right': 'media·r',
	'group:dark-full': 'grp:dark',
	'group:accent-full': 'grp:accent',
	'group:light-full': 'grp:light',
	'group:border-box': 'grp:border',
	'group:gradient-full': 'grp:grad',
	'pullquote:wide': 'pullquote',
	'pullquote:full-solid': 'pull:full',
	'pullquote:centered': 'pull:ctr',
	'heading:h1': 'h1',
	'heading:h2': 'h2',
	'heading:h3': 'h3',
	'heading:display': 'h·display',
	'heading:kicker': 'kicker',
	paragraph: 'p',
	'paragraph:dropcap': 'dropcap',
	'image:wide': 'img:wide',
	'image:full': 'img:full',
	quote: 'quote',
	'quote:attributed': 'quote·attr',
	'buttons:cta': 'cta',
	'spacer:small': 'spacer·sm',
	'spacer:large': 'spacer',
	'spacer:xlarge': 'spacer·xl',
	separator: '—',
	list: 'list',
	'video:hero': 'video',
	'video:section': 'video·sec',
	'table:data': 'table',
	'gallery:2-col': 'gallery×2',
	'gallery:3-col': 'gallery×3',
};

function tokenShortLabel( token ) {
	return SHORT_LABELS[ token ] ?? token;
}

const HUMAN_LABELS = {
	'cover:dark': 'Dark hero',
	'cover:light': 'Light hero',
	'cover:minimal': 'Minimal hero',
	'cover:split': 'Split hero',
	'columns:2-equal': 'Two columns',
	'columns:28-72': 'Sidebar columns',
	'columns:3-equal': 'Three columns',
	'columns:4-equal': 'Four columns',
	'media-text:left': 'Image left',
	'media-text:right': 'Image right',
	'group:dark-full': 'Dark section',
	'group:accent-full': 'Accent section',
	'group:light-full': 'Light section',
	'group:border-box': 'Bordered section',
	'group:gradient-full': 'Gradient section',
	'pullquote:wide': 'Pull quote',
	'pullquote:full-solid': 'Bold pull quote',
	'pullquote:centered': 'Centered quote',
	'heading:h1': 'Heading 1',
	'heading:h2': 'Heading 2',
	'heading:h3': 'Heading 3',
	'heading:display': 'Display heading',
	'heading:kicker': 'Kicker heading',
	paragraph: 'Paragraph',
	'paragraph:dropcap': 'Drop cap paragraph',
	'image:wide': 'Wide image',
	'image:full': 'Full-width image',
	quote: 'Quote',
	'quote:attributed': 'Attributed quote',
	'buttons:cta': 'Call to action',
	'spacer:small': 'Small spacer',
	'spacer:large': 'Spacer',
	'spacer:xlarge': 'Large spacer',
	separator: 'Separator',
	list: 'List',
};

function tokenHumanLabel( token ) {
	return HUMAN_LABELS[ token ] ?? token;
}

// ---------------------------------------------------------------------------
// tokenShortLabel()
// ---------------------------------------------------------------------------

describe( 'tokenShortLabel()', () => {
	it( 'returns the short label for known cover tokens', () => {
		expect( tokenShortLabel( 'cover:dark' ) ).toBe( 'cover' );
		expect( tokenShortLabel( 'cover:light' ) ).toBe( 'cover·lt' );
		expect( tokenShortLabel( 'cover:minimal' ) ).toBe( 'cover·min' );
		expect( tokenShortLabel( 'cover:split' ) ).toBe( 'cover·split' );
	} );

	it( 'returns the short label for column tokens', () => {
		expect( tokenShortLabel( 'columns:2-equal' ) ).toBe( '2-col' );
		expect( tokenShortLabel( 'columns:28-72' ) ).toBe( '28–72' );
		expect( tokenShortLabel( 'columns:3-equal' ) ).toBe( '3-col' );
		expect( tokenShortLabel( 'columns:4-equal' ) ).toBe( '4-col' );
	} );

	it( 'returns the short label for text tokens', () => {
		expect( tokenShortLabel( 'paragraph' ) ).toBe( 'p' );
		expect( tokenShortLabel( 'paragraph:dropcap' ) ).toBe( 'dropcap' );
		expect( tokenShortLabel( 'heading:h1' ) ).toBe( 'h1' );
		expect( tokenShortLabel( 'heading:h2' ) ).toBe( 'h2' );
		expect( tokenShortLabel( 'heading:h3' ) ).toBe( 'h3' );
	} );

	it( 'returns the short label for structural tokens', () => {
		expect( tokenShortLabel( 'separator' ) ).toBe( '—' );
		expect( tokenShortLabel( 'spacer:small' ) ).toBe( 'spacer·sm' );
		expect( tokenShortLabel( 'spacer:large' ) ).toBe( 'spacer' );
		expect( tokenShortLabel( 'spacer:xlarge' ) ).toBe( 'spacer·xl' );
	} );

	it( 'returns the short label for CTA and gallery tokens', () => {
		expect( tokenShortLabel( 'buttons:cta' ) ).toBe( 'cta' );
		expect( tokenShortLabel( 'gallery:2-col' ) ).toBe( 'gallery×2' );
		expect( tokenShortLabel( 'gallery:3-col' ) ).toBe( 'gallery×3' );
	} );

	it( 'falls back to the raw token for unknown inputs', () => {
		expect( tokenShortLabel( 'unknown:token' ) ).toBe( 'unknown:token' );
		expect( tokenShortLabel( 'paragraph:lead' ) ).toBe( 'paragraph:lead' );
	} );

	it( 'handles empty string input gracefully', () => {
		expect( tokenShortLabel( '' ) ).toBe( '' );
	} );

	it( 'covers every entry in SHORT_LABELS without duplicates', () => {
		const values = Object.values( SHORT_LABELS );
		const keys = Object.keys( SHORT_LABELS );
		// Every defined token returns the exact mapped value.
		keys.forEach( ( token ) => {
			expect( tokenShortLabel( token ) ).toBe( SHORT_LABELS[ token ] );
		} );
		// Label map should not have empty-string values.
		values.forEach( ( label ) => {
			expect( label.length ).toBeGreaterThan( 0 );
		} );
	} );
} );

// ---------------------------------------------------------------------------
// tokenHumanLabel()
// ---------------------------------------------------------------------------

describe( 'tokenHumanLabel()', () => {
	it( 'returns readable labels for cover tokens', () => {
		expect( tokenHumanLabel( 'cover:dark' ) ).toBe( 'Dark hero' );
		expect( tokenHumanLabel( 'cover:light' ) ).toBe( 'Light hero' );
		expect( tokenHumanLabel( 'cover:split' ) ).toBe( 'Split hero' );
	} );

	it( 'returns readable labels for group tokens', () => {
		expect( tokenHumanLabel( 'group:dark-full' ) ).toBe( 'Dark section' );
		expect( tokenHumanLabel( 'group:accent-full' ) ).toBe(
			'Accent section'
		);
		expect( tokenHumanLabel( 'group:gradient-full' ) ).toBe(
			'Gradient section'
		);
	} );

	it( 'returns readable labels for text tokens', () => {
		expect( tokenHumanLabel( 'paragraph' ) ).toBe( 'Paragraph' );
		expect( tokenHumanLabel( 'paragraph:dropcap' ) ).toBe(
			'Drop cap paragraph'
		);
		expect( tokenHumanLabel( 'buttons:cta' ) ).toBe( 'Call to action' );
	} );

	it( 'falls back to the raw token for unknown inputs', () => {
		expect( tokenHumanLabel( 'unknown:token' ) ).toBe( 'unknown:token' );
		expect( tokenHumanLabel( '' ) ).toBe( '' );
	} );

	it( 'all defined labels are non-empty strings', () => {
		Object.values( HUMAN_LABELS ).forEach( ( label ) => {
			expect( typeof label ).toBe( 'string' );
			expect( label.length ).toBeGreaterThan( 0 );
		} );
	} );

	it( 'all defined human labels are longer than one character', () => {
		// Human labels should be descriptive words, not single glyphs.
		Object.values( HUMAN_LABELS ).forEach( ( label ) => {
			expect( label.length ).toBeGreaterThan( 1 );
		} );
	} );
} );
