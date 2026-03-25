/**
 * AldusErrorBoundary — catches any render error thrown inside the Aldus block
 * and shows a contained error panel instead of blanking the entire editor
 * canvas. Without this, an uncaught React render error (e.g. an undefined icon
 * prop) unmounts the whole editor tree and the user loses their work.
 */

import { Component } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export class AldusErrorBoundary extends Component {
	constructor( props ) {
		super( props );
		this.state = { hasError: false, error: null };
		this.handleReset = this.handleReset.bind( this );
	}

	static getDerivedStateFromError( error ) {
		return { hasError: true, error };
	}

	componentDidCatch( error, info ) {
		// eslint-disable-next-line no-console
		console.error(
			'[Aldus] Render error caught by ErrorBoundary:',
			error,
			info
		);
	}

	handleReset() {
		this.setState( { hasError: false, error: null } );
	}

	render() {
		if ( this.state.hasError ) {
			return (
				<div
					className="aldus-error-boundary"
					style={ {
						padding: '20px 24px',
						border: '1px solid #cc1818',
						borderRadius: '4px',
						background: '#fef7f7',
						margin: '8px 0',
						fontFamily:
							'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
					} }
				>
					<strong
						style={ {
							display: 'block',
							marginBottom: '6px',
							fontSize: '13px',
							color: '#cc1818',
						} }
					>
						{ __( 'Aldus encountered a render error.', 'aldus' ) }
					</strong>
					<p
						style={ {
							fontSize: '13px',
							color: '#555',
							margin: '0 0 12px',
							lineHeight: '1.5',
						} }
					>
						{ __(
							'The block could not render. Try refreshing the editor or checking for plugin updates. If the problem persists, contact support.',
							'aldus'
						) }
					</p>
					<button
						onClick={ this.handleReset }
						style={ {
							fontSize: '12px',
							padding: '4px 10px',
							cursor: 'pointer',
							border: '1px solid #cc1818',
							borderRadius: '3px',
							background: 'transparent',
							color: '#cc1818',
						} }
					>
						{ __( 'Try again', 'aldus' ) }
					</button>
					<details
						style={ {
							marginTop: '12px',
							fontSize: '11px',
							color: '#999',
						} }
					>
						<summary style={ { cursor: 'pointer' } }>
							{ __( 'Technical details', 'aldus' ) }
						</summary>
						<pre
							style={ {
								whiteSpace: 'pre-wrap',
								marginTop: '6px',
								padding: '8px',
								background: '#f5f5f5',
								borderRadius: '3px',
								fontSize: '11px',
								overflowX: 'auto',
							} }
						>
							{ this.state.error?.toString() }
						</pre>
					</details>
				</div>
			);
		}

		return this.props.children;
	}
}
