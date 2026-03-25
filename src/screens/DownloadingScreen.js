/**
 * DownloadingScreen — model download progress screen.
 *
 * Shows the staged progress bar during the one-time WebLLM model download.
 */

import { Button } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

function GenerationSteps( { step } ) {
	const steps = [
		__( 'Model ready', 'aldus' ),
		__( 'Generating', 'aldus' ),
		__( 'Done', 'aldus' ),
	];
	return (
		<div className="aldus-gen-steps" aria-hidden="true">
			{ steps.map( ( label, i ) => (
				<div
					key={ i }
					className={ [
						'aldus-gen-step',
						i < step ? 'is-done' : '',
						i === step ? 'is-active' : '',
					]
						.filter( Boolean )
						.join( ' ' ) }
				>
					<span className="aldus-gen-step-dot" />
					<span className="aldus-gen-step-label">{ label }</span>
				</div>
			) ) }
		</div>
	);
}

/**
 * @param {Object}   props
 * @param {Object}   props.progress { progress: number (0–1), text: string }.
 * @param {Function} props.onAbort  Abort callback.
 */
export function DownloadingScreen( { progress, onAbort } ) {
	const pct = Math.round( ( progress.progress ?? 0 ) * 100 );
	const progressText = ( progress.text ?? '' ).toLowerCase();

	// Detect stage from WebLLM progress text
	let stage = 0;
	if ( progressText.includes( 'finish' ) || pct >= 100 ) {
		stage = 2;
	} else if (
		progressText.includes( 'fetch' ) ||
		progressText.includes( 'loading' ) ||
		pct > 5
	) {
		stage = 1;
	}

	const stages = [
		__( 'Preparing', 'aldus' ),
		__( 'Downloading', 'aldus' ),
		__( 'Starting up', 'aldus' ),
	];

	return (
		<div className="aldus-downloading" role="status" aria-live="polite">
			<GenerationSteps step={ 0 } />
			<span className="aldus-stamp aldus-stamp--hero" aria-hidden="true">
				aldus
			</span>
			<div className="aldus-stages" aria-hidden="true">
				{ stages.map( ( label, i ) => (
					<div
						key={ i }
						className={ [
							'aldus-stage',
							i < stage ? 'is-done' : '',
							i === stage ? 'is-active' : '',
						]
							.filter( Boolean )
							.join( ' ' ) }
					>
						<span className="aldus-stage-dot" />
						<span className="aldus-stage-label">{ label }</span>
					</div>
				) ) }
			</div>
			<div
				className="aldus-progress-bar"
				role="progressbar"
				aria-valuenow={ pct }
				aria-valuemin={ 0 }
				aria-valuemax={ 100 }
				aria-label={ sprintf(
					/* translators: %d is download progress as a percentage, e.g. 42. */
					__( 'Downloading AI model: %d%%', 'aldus' ),
					pct
				) }
			>
				<div
					className="aldus-progress-fill"
					style={ { width: `${ pct }%` } }
				/>
			</div>
			{ pct < 100 && (
				<p className="aldus-downloading-sub">
					{ pct > 0
						? sprintf(
								/* translators: %d is a download percentage number, e.g. 42. */
								__(
									'%d%% · One-time download — lives in your browser forever after',
									'aldus'
								),
								pct
						  )
						: __( 'Starting download…', 'aldus' ) }
				</p>
			) }
			{ onAbort && (
				<Button
					__next40pxDefaultSize
					variant="tertiary"
					className="aldus-abort-btn"
					onClick={ onAbort }
				>
					{ __( 'Cancel', 'aldus' ) }
				</Button>
			) }
		</div>
	);
}
