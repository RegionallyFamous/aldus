/**
 * ErrorScreen — generation error with retry actions.
 *
 * Shows a structured error message keyed by error code, a technical
 * details disclosure, and retry/edit-content buttons.
 */

import { Button, Flex } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const ERROR_MESSAGES = {
	connection_failed: {
		headline: __( "Couldn't connect.", 'aldus' ),
		detail: __( 'Check your network and give it another shot.', 'aldus' ),
	},
	timeout: {
		headline: __( 'That took way too long.', 'aldus' ),
		detail: __(
			'The AI model may be struggling with this content. Try simplifying your items or using fewer styles.',
			'aldus'
		),
	},
	parse_failed: {
		headline: __( 'Something got scrambled.', 'aldus' ),
		detail: __(
			'Worth trying once more — it usually sorts itself out.',
			'aldus'
		),
	},
	llm_parse_failed: {
		headline: __( 'The model went sideways.', 'aldus' ),
		detail: __(
			'Try regenerating — the small model sometimes stumbles on the first pass.',
			'aldus'
		),
	},
	api_error: {
		headline: __( 'The layout assembler hit an issue.', 'aldus' ),
		detail: __(
			'Check your content items for any unusual characters, then try again.',
			'aldus'
		),
	},
	wasm_compile_failed: {
		headline: __( 'GPU compilation failed.', 'aldus' ),
		detail: __(
			"Your GPU doesn't support the model format. Browse sample layouts in the Personalities tab instead.",
			'aldus'
		),
	},
	gpu_device_lost: {
		headline: __( 'The GPU disconnected.', 'aldus' ),
		detail: __(
			'This sometimes happens when the tab is backgrounded. Clicking "Try again" usually works.',
			'aldus'
		),
	},
	out_of_memory: {
		headline: __( 'Not enough GPU memory.', 'aldus' ),
		detail: __(
			'Close some other browser tabs and try again. The model needs around 500 MB of free memory.',
			'aldus'
		),
	},
	rate_limited: {
		headline: __( 'Too many requests.', 'aldus' ),
		detail: __( 'Wait a moment, then try again.', 'aldus' ),
	},
	no_layouts: {
		headline: __( 'Not enough to work with.', 'aldus' ),
		detail: __(
			'Add a headline and at least one paragraph — that gives every layout style enough content to arrange.',
			'aldus'
		),
	},
	storage_full: {
		headline: __( 'Not enough browser storage.', 'aldus' ),
		detail: __(
			'The AI model needs ~200 MB of browser storage. Try clearing your browser cache or closing other tabs, then try again.',
			'aldus'
		),
	},
	unexpected_error: {
		headline: __( 'Something unexpected happened.', 'aldus' ),
		detail: __(
			'Try again — if it keeps happening, reload the editor.',
			'aldus'
		),
	},
	insert_failed: {
		headline: __( "Couldn't insert the layout.", 'aldus' ),
		detail: __(
			'This can happen if another plugin is modifying the editor. Try undoing and regenerating.',
			'aldus'
		),
	},
	corrupt_markup: {
		headline: __( 'The layout came back garbled.', 'aldus' ),
		detail: __(
			'This usually means the server response was interrupted. Try regenerating.',
			'aldus'
		),
	},
};

/**
 * @param {Object}     props
 * @param {string}     props.code         Error code string.
 * @param {number}     props.retryCount   Number of failed attempts so far.
 * @param {Error|null} props.errorDetail  Raw error for technical details panel.
 * @param {Function}   props.onRetry      Back to building screen.
 * @param {Function}   props.onRegenerate Retry generation.
 */
export function ErrorScreen( {
	code,
	retryCount,
	errorDetail,
	onRetry,
	onRegenerate,
} ) {
	const msg = ERROR_MESSAGES[ code ] ?? ERROR_MESSAGES.parse_failed;
	const canRegenerate = code !== 'connection_failed';

	const technicalInfo = errorDetail
		? JSON.stringify(
				{
					code,
					message: errorDetail?.message,
					status: errorDetail?.data?.status,
					detail: errorDetail?.data,
				},
				null,
				2
		  )
		: null;

	return (
		<div className="aldus-error">
			<div className="aldus-error-body">
				<strong className="aldus-error-headline">
					{ msg.headline }
				</strong>
				<p className="aldus-error-detail">{ msg.detail }</p>
				{ retryCount >= 2 && (
					<p className="aldus-retry-hint">
						{ __(
							'Still stuck? Try the Quick start presets in the sidebar.',
							'aldus'
						) }
					</p>
				) }
				{ technicalInfo && (
					<details className="aldus-error-details">
						<summary>
							{ __( 'Technical details', 'aldus' ) }
						</summary>
						<pre className="aldus-error-details-pre">
							{ technicalInfo }
						</pre>
					</details>
				) }
			</div>
			<Flex gap={ 2 } className="aldus-error-actions">
				{ canRegenerate && (
					<Button
						__next40pxDefaultSize
						variant="primary"
						onClick={ onRegenerate }
					>
						{ __( 'Go for it again', 'aldus' ) }
					</Button>
				) }
				<Button
					__next40pxDefaultSize
					variant="secondary"
					onClick={ onRetry }
				>
					{ __( 'Edit my content', 'aldus' ) }
				</Button>
			</Flex>
		</div>
	);
}
