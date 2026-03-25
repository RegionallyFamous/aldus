/**
 * LoadingScreen — token inference + assembly progress screen.
 *
 * Renders the pulsing stamp and cycling messages shown while generation is
 * running. Also renders an abort button and an optional progress bar.
 */

import { Button } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

/**
 * @param {Object}   props
 * @param {string}   props.message     Current loading message text.
 * @param {boolean}  props.msgVisible  Whether the message should be visible (fade).
 * @param {Function} props.onAbort     Abort callback.
 * @param {Object}   props.genProgress { done, total, lastLabel }.
 */
export function LoadingScreen( { message, msgVisible, onAbort, genProgress } ) {
	return (
		<div className="aldus-loading" role="status" aria-live="polite">
			<span
				className="aldus-stamp aldus-stamp--hero aldus-stamp--pulse"
				aria-hidden="true"
			>
				aldus
			</span>
			<p
				className={ `aldus-loading-msg ${
					msgVisible ? 'is-visible' : 'is-hidden'
				}` }
			>
				{ message }
			</p>
			{ genProgress?.total > 0 && (
				<div
					className="aldus-gen-progress"
					role="progressbar"
					aria-valuenow={ genProgress.done }
					aria-valuemin={ 0 }
					aria-valuemax={ genProgress.total }
					aria-label={ sprintf(
						/* translators: 1: number of layouts built so far, 2: total number of layouts */
						__( 'Building layouts: %1$d of %2$d', 'aldus' ),
						genProgress.done,
						genProgress.total
					) }
				>
					<p>
						{ sprintf(
							/* translators: 1: number of layouts built so far, 2: total number of layouts */
							__( 'Building %1$d of %2$d layouts…', 'aldus' ),
							genProgress.done,
							genProgress.total
						) }
						{ genProgress?.lastLabel && (
							<span className="aldus-gen-progress-label">
								{ genProgress.lastLabel }
							</span>
						) }
					</p>
				</div>
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
