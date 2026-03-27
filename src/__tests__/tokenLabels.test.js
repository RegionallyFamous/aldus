/**
 * Tests for tokenShortLabel() from src/data/tokens.js and
 * tokenHumanLabel() from src/data/tokens.js.
 *
 * Previously these tests contained inlined copies of both functions.
 * They now import the real exports so any change to tokens.js or
 * MixScreen.js label tables is caught immediately.
 */

import {
	tokenShortLabel,
	tokenHumanLabel,
	VALID_TOKENS,
	TOKEN_HUMAN_LABELS,
} from '../data/tokens.js';

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

	it( 'returns short labels for video and table tokens', () => {
		expect( tokenShortLabel( 'video:hero' ) ).toBe( 'video' );
		expect( tokenShortLabel( 'video:section' ) ).toBe( 'video·sec' );
		expect( tokenShortLabel( 'table:data' ) ).toBe( 'table' );
	} );

	it( 'falls back to the raw token for unknown inputs', () => {
		expect( tokenShortLabel( 'unknown:token' ) ).toBe( 'unknown:token' );
		expect( tokenShortLabel( 'paragraph:lead' ) ).toBe( 'paragraph:lead' );
	} );

	it( 'handles empty string input gracefully', () => {
		expect( tokenShortLabel( '' ) ).toBe( '' );
	} );

	it( 'returns a non-empty label for every token in VALID_TOKENS', () => {
		VALID_TOKENS.forEach( ( token ) => {
			const label = tokenShortLabel( token );
			expect( typeof label ).toBe( 'string' );
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

	it( 'returns readable labels for video and table tokens', () => {
		expect( tokenHumanLabel( 'video:hero' ) ).toBe( 'Video hero' );
		expect( tokenHumanLabel( 'video:section' ) ).toBe( 'Video section' );
		expect( tokenHumanLabel( 'table:data' ) ).toBe( 'Data table' );
	} );

	it( 'falls back to the raw token for unknown inputs', () => {
		expect( tokenHumanLabel( 'unknown:token' ) ).toBe( 'unknown:token' );
		expect( tokenHumanLabel( '' ) ).toBe( '' );
	} );

	it( 'returns a non-empty label for every token in VALID_TOKENS', () => {
		VALID_TOKENS.forEach( ( token ) => {
			const label = tokenHumanLabel( token );
			expect( typeof label ).toBe( 'string' );
			expect( label.length ).toBeGreaterThan( 0 );
		} );
	} );

	it( 'all defined labels in TOKEN_HUMAN_LABELS are non-empty strings', () => {
		Object.values( TOKEN_HUMAN_LABELS ).forEach( ( label ) => {
			expect( typeof label ).toBe( 'string' );
			expect( label.length ).toBeGreaterThan( 0 );
		} );
	} );

	it( 'all defined human labels are longer than one character', () => {
		Object.values( TOKEN_HUMAN_LABELS ).forEach( ( label ) => {
			expect( label.length ).toBeGreaterThan( 1 );
		} );
	} );
} );
