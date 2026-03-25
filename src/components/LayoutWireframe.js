/**
 * LayoutWireframe — visual skeleton thumbnails rendered inside layout cards.
 * Maps layout tokens to strip shapes, heights, and tones.
 */

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Layout wireframe — visual skeleton used in card thumbnails instead of
// BlockPreview (which renders poorly at small scale and can show validation
// errors). The wireframe maps each token to a strip with a shape, height,
// and tone so the user can scan the layout rhythm at a glance.
// ---------------------------------------------------------------------------

export const WF = {
	// token : [ height_px, type, bg_hint ]
	// types: full | split-v | cols-2 | cols-3 | cols-4 | media-l | media-r |
	//        text | text-lg | text-sm | quote | cta | rule | space | grid-2 | grid-3
	'cover:dark': [ 72, 'full', '#1a1a2e' ],
	'cover:light': [ 72, 'full', '#e4e4e4' ],
	'cover:minimal': [ 52, 'full', '#2d2d2d' ],
	'cover:split': [ 72, 'split-v', '#1e1e1e' ],
	'heading:display': [ 18, 'text-lg', '#222' ],
	'heading:h1': [ 14, 'text-lg', '#333' ],
	'heading:h2': [ 11, 'text', '#444' ],
	'heading:h3': [ 9, 'text-sm', '#555' ],
	'heading:kicker': [ 7, 'text-sm', '#888' ],
	paragraph: [ 22, 'lines', '#bbb' ],
	'paragraph:dropcap': [ 22, 'lines', '#bbb' ],
	'media-text:left': [ 48, 'media-l', '#c8c8c8' ],
	'media-text:right': [ 48, 'media-r', '#c8c8c8' ],
	'columns:2-equal': [ 34, 'cols-2', '#d4d4d4' ],
	'columns:28-72': [ 34, 'cols-2', '#d4d4d4' ],
	'columns:3-equal': [ 32, 'cols-3', '#d4d4d4' ],
	'columns:4-equal': [ 30, 'cols-4', '#d4d4d4' ],
	'group:dark-full': [ 56, 'full', '#181824' ],
	'group:accent-full': [ 52, 'full', '#2563eb' ],
	'group:light-full': [ 48, 'full', '#f3f4f6' ],
	'group:border-box': [ 42, 'full', '#fff' ],
	'group:gradient-full': [ 56, 'full', '#4f46e5' ],
	'pullquote:wide': [ 30, 'quote', '#f5f5f5' ],
	'pullquote:full-solid': [ 44, 'full', '#1a1a1a' ],
	'pullquote:centered': [ 30, 'quote', '#f0f0f0' ],
	quote: [ 22, 'quote', '#f5f5f5' ],
	'quote:attributed': [ 26, 'quote', '#f5f5f5' ],
	list: [ 20, 'lines', '#ccc' ],
	'buttons:cta': [ 16, 'cta', '#0070f3' ],
	separator: [ 5, 'rule', '#e0e0e0' ],
	'spacer:small': [ 6, 'space', 'transparent' ],
	'spacer:large': [ 10, 'space', 'transparent' ],
	'spacer:xlarge': [ 14, 'space', 'transparent' ],
	'image:wide': [ 40, 'full', '#c4c4c4' ],
	'image:full': [ 52, 'full', '#b8b8b8' ],
	'gallery:2-col': [ 36, 'grid-2', '#c4c4c4' ],
	'gallery:3-col': [ 30, 'grid-3', '#c4c4c4' ],
	'video:hero': [ 60, 'full', '#111' ],
	'video:section': [ 44, 'full', '#1a1a1a' ],
	'table:data': [ 32, 'cols-4', '#efefef' ],
	'group:grid': [ 52, 'grid-3', '#f0f0f0' ],
	'row:stats': [ 30, 'cols-4', '#fafafa' ],
	'details:accordion': [ 36, 'lines', '#e8e8e8' ],
	'code:block': [ 28, 'lines', '#1e1e2e' ],
	'paragraph:lead': [ 18, 'text', '#888' ],
};

export const WF_DEFAULT = [ 14, 'text', '#ccc' ];

export function LayoutWireframe( { tokens } ) {
	if ( ! tokens || tokens.length === 0 ) {
		return null;
	}
	return (
		<div className="aldus-wireframe" aria-hidden="true">
			{ tokens.map( ( token, i ) => {
				const [ h, type, bg ] = WF[ token ] ?? WF_DEFAULT;
				return (
					<WireframeStrip
						key={ i }
						height={ h }
						type={ type }
						bg={ bg }
					/>
				);
			} ) }
		</div>
	);
}

export function WireframeStrip( { height, type, bg } ) {
	const base = {
		height,
		flexShrink: 0,
		overflow: 'hidden',
		display: 'flex',
	};

	// Full-width solid or tinted fill (covers, groups, images, video).
	if ( type === 'full' ) {
		return (
			<div
				style={ {
					...base,
					background: bg,
					alignItems: 'center',
					justifyContent: 'center',
					padding: '0 12px',
				} }
			>
				<div
					style={ {
						width: '40%',
						height: 3,
						borderRadius: 2,
						background: 'rgba(255,255,255,0.25)',
						flexShrink: 0,
					} }
				/>
			</div>
		);
	}

	// Vertical split — left half image, right half text lines.
	if ( type === 'split-v' ) {
		return (
			<div style={ { ...base } }>
				<div
					style={ {
						flex: '0 0 50%',
						background: bg,
						height: '100%',
					} }
				/>
				<div
					style={ {
						flex: '0 0 50%',
						background: '#f4f4f4',
						height: '100%',
						padding: '8px 10px',
						display: 'flex',
						flexDirection: 'column',
						gap: 4,
						justifyContent: 'center',
					} }
				>
					<div
						style={ {
							width: '80%',
							height: 4,
							borderRadius: 2,
							background: '#bbb',
						} }
					/>
					<div
						style={ {
							width: '60%',
							height: 3,
							borderRadius: 2,
							background: '#d0d0d0',
						} }
					/>
				</div>
			</div>
		);
	}

	// Media-text (image left/right, text other side).
	if ( type === 'media-l' || type === 'media-r' ) {
		const imgSide = (
			<div
				style={ {
					flex: '0 0 40%',
					background: '#c0c0c0',
					height: '100%',
				} }
			/>
		);
		const txtSide = (
			<div
				style={ {
					flex: '1',
					background: '#f9f9f9',
					height: '100%',
					padding: '6px 8px',
					display: 'flex',
					flexDirection: 'column',
					gap: 4,
					justifyContent: 'center',
				} }
			>
				<div
					style={ {
						width: '70%',
						height: 3,
						borderRadius: 2,
						background: '#aaa',
					} }
				/>
				<div
					style={ {
						width: '90%',
						height: 2,
						borderRadius: 2,
						background: '#ccc',
					} }
				/>
				<div
					style={ {
						width: '75%',
						height: 2,
						borderRadius: 2,
						background: '#ccc',
					} }
				/>
			</div>
		);
		return (
			<div style={ { ...base } }>
				{ type === 'media-l' ? (
					<>
						{ imgSide }
						{ txtSide }
					</>
				) : (
					<>
						{ txtSide }
						{ imgSide }
					</>
				) }
			</div>
		);
	}

	// N-column layout.
	if ( type === 'cols-2' || type === 'cols-3' || type === 'cols-4' ) {
		let count = 2;
		if ( type === 'cols-3' ) {
			count = 3;
		}
		if ( type === 'cols-4' ) {
			count = 4;
		}
		return (
			<div
				style={ {
					...base,
					gap: 2,
					padding: '4px 6px',
					background: '#fafafa',
				} }
			>
				{ Array.from( { length: count } ).map( ( _, j ) => (
					<div
						key={ j }
						style={ {
							flex: 1,
							background: bg,
							borderRadius: 2,
							display: 'flex',
							flexDirection: 'column',
							gap: 3,
							padding: '4px 5px',
							justifyContent: 'center',
						} }
					>
						<div
							style={ {
								width: '80%',
								height: 2,
								borderRadius: 2,
								background: 'rgba(0,0,0,0.25)',
							} }
						/>
						<div
							style={ {
								width: '60%',
								height: 2,
								borderRadius: 2,
								background: 'rgba(0,0,0,0.15)',
							} }
						/>
					</div>
				) ) }
			</div>
		);
	}

	// 2×2 or 3×1 image grid (gallery).
	if ( type === 'grid-2' || type === 'grid-3' ) {
		const count = type === 'grid-3' ? 3 : 2;
		return (
			<div
				style={ {
					...base,
					gap: 2,
					padding: '4px 6px',
					background: '#fafafa',
				} }
			>
				{ Array.from( { length: count } ).map( ( _, j ) => (
					<div
						key={ j }
						style={ { flex: 1, background: bg, borderRadius: 2 } }
					/>
				) ) }
			</div>
		);
	}

	// Heading (single bold line).
	if ( type === 'text-lg' ) {
		return (
			<div
				style={ {
					...base,
					alignItems: 'center',
					padding: '0 12px',
					background: '#fff',
				} }
			>
				<div
					style={ {
						width: '55%',
						height: height * 0.45,
						maxHeight: 8,
						borderRadius: 2,
						background: bg,
					} }
				/>
			</div>
		);
	}

	// Simulated text lines (paragraph / list).
	if ( type === 'lines' ) {
		return (
			<div
				style={ {
					...base,
					flexDirection: 'column',
					justifyContent: 'center',
					gap: 4,
					padding: '4px 12px',
					background: '#fff',
				} }
			>
				<div
					style={ {
						width: '90%',
						height: 2,
						borderRadius: 2,
						background: bg,
					} }
				/>
				<div
					style={ {
						width: '75%',
						height: 2,
						borderRadius: 2,
						background: bg,
					} }
				/>
				<div
					style={ {
						width: '82%',
						height: 2,
						borderRadius: 2,
						background: bg,
					} }
				/>
			</div>
		);
	}

	// Pullquote — inset with left accent line.
	if ( type === 'quote' ) {
		return (
			<div
				style={ {
					...base,
					alignItems: 'center',
					padding: '0 14px',
					background: bg,
					gap: 8,
				} }
			>
				<div
					style={ {
						width: 3,
						height: '60%',
						borderRadius: 2,
						background: '#aaa',
						flexShrink: 0,
					} }
				/>
				<div
					style={ {
						display: 'flex',
						flexDirection: 'column',
						gap: 4,
						flex: 1,
					} }
				>
					<div
						style={ {
							width: '70%',
							height: 2,
							borderRadius: 2,
							background: '#999',
						} }
					/>
					<div
						style={ {
							width: '50%',
							height: 2,
							borderRadius: 2,
							background: '#bbb',
						} }
					/>
				</div>
			</div>
		);
	}

	// CTA button hint.
	if ( type === 'cta' ) {
		return (
			<div
				style={ {
					...base,
					alignItems: 'center',
					padding: '0 12px',
					background: '#fff',
				} }
			>
				<div
					style={ {
						height: height - 4,
						paddingLeft: 12,
						paddingRight: 12,
						borderRadius: 3,
						background: bg,
						display: 'flex',
						alignItems: 'center',
					} }
				>
					<div
						style={ {
							width: 36,
							height: 2,
							borderRadius: 2,
							background: 'rgba(255,255,255,0.7)',
						} }
					/>
				</div>
			</div>
		);
	}

	// Separator rule.
	if ( type === 'rule' ) {
		return (
			<div
				style={ {
					...base,
					alignItems: 'center',
					padding: '0 12px',
					background: '#fff',
				} }
			>
				<div style={ { width: '100%', height: 1, background: bg } } />
			</div>
		);
	}

	// Space / utility.
	if ( type === 'space' ) {
		return <div style={ { ...base, background: '#fff' } } />;
	}

	// Default: single medium text line.
	return (
		<div
			style={ {
				...base,
				alignItems: 'center',
				padding: '0 12px',
				background: '#fff',
			} }
		>
			<div
				style={ {
					width: '45%',
					height: 2,
					borderRadius: 2,
					background: bg,
				} }
			/>
		</div>
	);
}
