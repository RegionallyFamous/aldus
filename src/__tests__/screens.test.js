/**
 * RTL tests for all implemented screen components:
 * LoadingScreen, DownloadingScreen, ErrorScreen, MixingScreen.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// ---------------------------------------------------------------------------
// LoadingScreen
// ---------------------------------------------------------------------------
import { LoadingScreen } from '../screens/LoadingScreen.js';

describe( 'LoadingScreen', () => {
	it( 'renders with role="status" and aria-live="polite"', () => {
		render(
			<LoadingScreen
				message="Warming up…"
				msgVisible={ true }
				onAbort={ null }
				genProgress={ null }
			/>
		);
		const el = screen.getByRole( 'status' );
		expect( el ).toBeInTheDocument();
		expect( el ).toHaveAttribute( 'aria-live', 'polite' );
	} );

	it( 'renders the provided message text', () => {
		render(
			<LoadingScreen
				message="Thinking hard…"
				msgVisible={ true }
				onAbort={ null }
				genProgress={ null }
			/>
		);
		expect( screen.getByText( 'Thinking hard…' ) ).toBeInTheDocument();
	} );

	it( 'applies is-visible class when msgVisible is true', () => {
		const { container } = render(
			<LoadingScreen
				message="Go!"
				msgVisible={ true }
				onAbort={ null }
				genProgress={ null }
			/>
		);
		expect( container.querySelector( '.aldus-loading-msg' ) ).toHaveClass( 'is-visible' );
	} );

	it( 'applies is-hidden class when msgVisible is false', () => {
		const { container } = render(
			<LoadingScreen
				message="Go!"
				msgVisible={ false }
				onAbort={ null }
				genProgress={ null }
			/>
		);
		expect( container.querySelector( '.aldus-loading-msg' ) ).toHaveClass( 'is-hidden' );
	} );

	it( 'shows Cancel button and calls onAbort when clicked', () => {
		const onAbort = jest.fn();
		render(
			<LoadingScreen
				message=""
				msgVisible={ true }
				onAbort={ onAbort }
				genProgress={ null }
			/>
		);
		const btn = screen.getByRole( 'button', { name: /cancel/i } );
		fireEvent.click( btn );
		expect( onAbort ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'does not render Cancel button when onAbort is null', () => {
		render(
			<LoadingScreen
				message=""
				msgVisible={ true }
				onAbort={ null }
				genProgress={ null }
			/>
		);
		expect( screen.queryByRole( 'button', { name: /cancel/i } ) ).not.toBeInTheDocument();
	} );

	it( 'renders a progressbar when genProgress.total > 0', () => {
		render(
			<LoadingScreen
				message=""
				msgVisible={ true }
				onAbort={ null }
				genProgress={ { done: 3, total: 16, lastLabel: 'Dispatch' } }
			/>
		);
		expect( screen.getByRole( 'progressbar' ) ).toBeInTheDocument();
	} );

	it( 'shows the last personality label when provided', () => {
		render(
			<LoadingScreen
				message=""
				msgVisible={ true }
				onAbort={ null }
				genProgress={ { done: 5, total: 16, lastLabel: 'Folio' } }
			/>
		);
		expect( screen.getByText( 'Folio' ) ).toBeInTheDocument();
	} );
} );

// ---------------------------------------------------------------------------
// DownloadingScreen
// ---------------------------------------------------------------------------
import { DownloadingScreen } from '../screens/DownloadingScreen.js';

describe( 'DownloadingScreen', () => {
	it( 'renders with role="status" and aria-live="polite"', () => {
		render(
			<DownloadingScreen
				progress={ { progress: 0, text: '' } }
				onAbort={ null }
			/>
		);
		expect( screen.getByRole( 'status' ) ).toBeInTheDocument();
	} );

	it( 'renders a progressbar with correct aria-valuenow', () => {
		render(
			<DownloadingScreen
				progress={ { progress: 0.42, text: 'fetching' } }
				onAbort={ null }
			/>
		);
		const bar = screen.getByRole( 'progressbar' );
		expect( bar ).toHaveAttribute( 'aria-valuenow', '42' );
	} );

	it( 'shows percentage text while downloading', () => {
		render(
			<DownloadingScreen
				progress={ { progress: 0.65, text: 'loading' } }
				onAbort={ null }
			/>
		);
		expect( screen.getByText( /65%/i ) ).toBeInTheDocument();
	} );

	it( 'shows "Starting download…" when progress is 0', () => {
		render(
			<DownloadingScreen
				progress={ { progress: 0, text: '' } }
				onAbort={ null }
			/>
		);
		expect( screen.getByText( /starting download/i ) ).toBeInTheDocument();
	} );

	it( 'hides the sub-text when download is complete', () => {
		render(
			<DownloadingScreen
				progress={ { progress: 1, text: 'finish' } }
				onAbort={ null }
			/>
		);
		expect( screen.queryByText( /starting download/i ) ).not.toBeInTheDocument();
	} );

	it( 'shows Cancel button and calls onAbort when clicked', () => {
		const onAbort = jest.fn();
		render(
			<DownloadingScreen
				progress={ { progress: 0.5, text: 'loading' } }
				onAbort={ onAbort }
			/>
		);
		const btn = screen.getByRole( 'button', { name: /cancel/i } );
		fireEvent.click( btn );
		expect( onAbort ).toHaveBeenCalledTimes( 1 );
	} );
} );

// ---------------------------------------------------------------------------
// ErrorScreen
// ---------------------------------------------------------------------------
import { ErrorScreen } from '../screens/ErrorScreen.js';

describe( 'ErrorScreen', () => {
	it( 'renders the headline for a known error code', () => {
		render(
			<ErrorScreen
				code="connection_failed"
				retryCount={ 0 }
				errorDetail={ null }
				onRetry={ jest.fn() }
				onRegenerate={ jest.fn() }
			/>
		);
		expect( screen.getByText( /couldn't connect/i ) ).toBeInTheDocument();
	} );

	it( 'falls back to parse_failed message for unknown codes', () => {
		render(
			<ErrorScreen
				code="totally_unknown_code"
				retryCount={ 0 }
				errorDetail={ null }
				onRetry={ jest.fn() }
				onRegenerate={ jest.fn() }
			/>
		);
		expect( screen.getByText( /something got scrambled/i ) ).toBeInTheDocument();
	} );

	it( 'does not show "Go for it again" for connection_failed', () => {
		render(
			<ErrorScreen
				code="connection_failed"
				retryCount={ 0 }
				errorDetail={ null }
				onRetry={ jest.fn() }
				onRegenerate={ jest.fn() }
			/>
		);
		expect(
			screen.queryByRole( 'button', { name: /go for it again/i } )
		).not.toBeInTheDocument();
	} );

	it( 'shows "Go for it again" for other error codes', () => {
		render(
			<ErrorScreen
				code="parse_failed"
				retryCount={ 0 }
				errorDetail={ null }
				onRetry={ jest.fn() }
				onRegenerate={ jest.fn() }
			/>
		);
		expect(
			screen.getByRole( 'button', { name: /go for it again/i } )
		).toBeInTheDocument();
	} );

	it( 'shows retry hint after 2 or more failed attempts', () => {
		render(
			<ErrorScreen
				code="parse_failed"
				retryCount={ 2 }
				errorDetail={ null }
				onRetry={ jest.fn() }
				onRegenerate={ jest.fn() }
			/>
		);
		expect( screen.getByText( /quick start presets/i ) ).toBeInTheDocument();
	} );

	it( 'does not show retry hint before 2 failed attempts', () => {
		render(
			<ErrorScreen
				code="parse_failed"
				retryCount={ 1 }
				errorDetail={ null }
				onRetry={ jest.fn() }
				onRegenerate={ jest.fn() }
			/>
		);
		expect( screen.queryByText( /quick start presets/i ) ).not.toBeInTheDocument();
	} );

	it( 'shows technical details when errorDetail is provided', () => {
		const err = new Error( 'Network error' );
		render(
			<ErrorScreen
				code="api_error"
				retryCount={ 0 }
				errorDetail={ err }
				onRetry={ jest.fn() }
				onRegenerate={ jest.fn() }
			/>
		);
		expect( screen.getByText( /technical details/i ) ).toBeInTheDocument();
	} );

	it( 'calls onRetry when "Edit my content" is clicked', () => {
		const onRetry = jest.fn();
		render(
			<ErrorScreen
				code="parse_failed"
				retryCount={ 0 }
				errorDetail={ null }
				onRetry={ onRetry }
				onRegenerate={ jest.fn() }
			/>
		);
		fireEvent.click( screen.getByRole( 'button', { name: /edit my content/i } ) );
		expect( onRetry ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'calls onRegenerate when "Go for it again" is clicked', () => {
		const onRegenerate = jest.fn();
		render(
			<ErrorScreen
				code="parse_failed"
				retryCount={ 0 }
				errorDetail={ null }
				onRetry={ jest.fn() }
				onRegenerate={ onRegenerate }
			/>
		);
		fireEvent.click( screen.getByRole( 'button', { name: /go for it again/i } ) );
		expect( onRegenerate ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'renders correct message for all known error codes', () => {
		const KNOWN_CODES = [
			[ 'timeout', /took way too long/i ],
			[ 'parse_failed', /got scrambled/i ],
			[ 'llm_parse_failed', /went sideways/i ],
			[ 'api_error', /assembler hit an issue/i ],
			[ 'wasm_compile_failed', /compilation failed/i ],
			[ 'gpu_device_lost', /disconnected/i ],
			[ 'out_of_memory', /not enough gpu memory/i ],
			[ 'rate_limited', /too many requests/i ],
			[ 'no_layouts', /not enough to work with/i ],
			[ 'storage_full', /not enough browser storage/i ],
			[ 'unexpected_error', /unexpected happened/i ],
			[ 'insert_failed', /couldn't insert/i ],
			[ 'corrupt_markup', /came back garbled/i ],
		];
		for ( const [ code, pattern ] of KNOWN_CODES ) {
			const { unmount } = render(
				<ErrorScreen
					code={ code }
					retryCount={ 0 }
					errorDetail={ null }
					onRetry={ jest.fn() }
					onRegenerate={ jest.fn() }
				/>
			);
			expect( screen.getByText( pattern ) ).toBeInTheDocument();
			unmount();
		}
	} );
} );

// ---------------------------------------------------------------------------
// MixingScreen
// ---------------------------------------------------------------------------
import { MixingScreen } from '../screens/MixScreen.js';

// Minimal fixture data — two layouts each with two sections.
const LAYOUTS = [
	{
		label: 'Dispatch',
		sections: [
			{ token: 'cover:dark', markup: '<div>A</div>' },
			{ token: 'paragraph', markup: '<div>B</div>' },
		],
	},
	{
		label: 'Folio',
		sections: [
			{ token: 'cover:light', markup: '<div>C</div>' },
			{ token: 'paragraph', markup: '<div>D</div>' },
		],
	},
];

describe( 'MixingScreen', () => {
	it( 'renders without crashing', () => {
		render(
			<MixingScreen
				layouts={ LAYOUTS }
				onInsert={ jest.fn() }
				onBack={ jest.fn() }
			/>
		);
		expect( document.querySelector( '.aldus-mixing' ) ).toBeTruthy();
	} );

	it( 'renders a section tile for each section in the base layout', () => {
		render(
			<MixingScreen
				layouts={ LAYOUTS }
				onInsert={ jest.fn() }
				onBack={ jest.fn() }
			/>
		);
		const tiles = document.querySelectorAll( '.aldus-mix-section-tile' );
		// Base layout is whichever has most sections (both have 2).
		expect( tiles.length ).toBeGreaterThanOrEqual( 2 );
	} );

	it( 'marks the first tile as active on mount', () => {
		render(
			<MixingScreen
				layouts={ LAYOUTS }
				onInsert={ jest.fn() }
				onBack={ jest.fn() }
			/>
		);
		const activeTile = document.querySelector( '.aldus-mix-section-tile.is-active' );
		expect( activeTile ).toBeTruthy();
	} );

	it( 'changes active tile when a different tile is clicked', () => {
		render(
			<MixingScreen
				layouts={ LAYOUTS }
				onInsert={ jest.fn() }
				onBack={ jest.fn() }
			/>
		);
		const tiles = document.querySelectorAll( '.aldus-mix-section-tile' );
		// Click the second tile
		if ( tiles.length > 1 ) {
			fireEvent.click( tiles[ 1 ] );
			expect( tiles[ 1 ] ).toHaveClass( 'is-active' );
		}
	} );

	it( 'renders a "Back to layouts" button', () => {
		render(
			<MixingScreen
				layouts={ LAYOUTS }
				onInsert={ jest.fn() }
				onBack={ jest.fn() }
			/>
		);
		expect( screen.getByRole( 'button', { name: /back to layouts/i } ) ).toBeInTheDocument();
	} );

	it( 'calls onBack when "Back to layouts" button is clicked', () => {
		const onBack = jest.fn();
		render(
			<MixingScreen
				layouts={ LAYOUTS }
				onInsert={ jest.fn() }
				onBack={ onBack }
			/>
		);
		fireEvent.click( screen.getByRole( 'button', { name: /back to layouts/i } ) );
		expect( onBack ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'renders an "Insert this mix" button', () => {
		render(
			<MixingScreen
				layouts={ LAYOUTS }
				onInsert={ jest.fn() }
				onBack={ jest.fn() }
			/>
		);
		expect( screen.getByRole( 'button', { name: /insert this mix/i } ) ).toBeInTheDocument();
	} );

	it( 'calls onInsert with a string when "Insert this mix" is clicked', () => {
		const onInsert = jest.fn();
		render(
			<MixingScreen
				layouts={ LAYOUTS }
				onInsert={ onInsert }
				onBack={ jest.fn() }
			/>
		);
		fireEvent.click( screen.getByRole( 'button', { name: /insert this mix/i } ) );
		expect( onInsert ).toHaveBeenCalledTimes( 1 );
		expect( typeof onInsert.mock.calls[ 0 ][ 0 ] ).toBe( 'string' );
	} );

	it( 'renders a shuffle button', () => {
		render(
			<MixingScreen
				layouts={ LAYOUTS }
				onInsert={ jest.fn() }
				onBack={ jest.fn() }
			/>
		);
		expect( screen.getByRole( 'button', { name: /shuffle/i } ) ).toBeInTheDocument();
	} );
} );
