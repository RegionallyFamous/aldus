/**
 * LoadingScreen — download and generation progress screens.
 *
 * Renders two distinct states:
 *
 * - 'downloading': model is being fetched from the CDN for the first time
 * - 'loading': token inference + assembly is running, progress shown via
 *   role="progressbar" with aria-valuenow/min/max
 *
 * This file is the architectural home for the LoadingScreen component.
 * The implementation currently lives in edit.js (see the `LoadingScreen`
 * function there). Once the JS refactor is complete, the component will be
 * moved here and edit.js will import it.
 *
 * Props:
 *
 * @param {string}   mode               'downloading' | 'loading'
 * @param {Object}   dlProgress         { progress: number, text: string }
 * @param {Object}   genProgress        { done: number, total: number, lastLabel: string|null }
 * @param {boolean}  hasDownloadedModel Whether model was previously downloaded.
 * @param {Function} onCancel           Called when the user cancels a download.
 */

// Intentionally empty — implementation lives in edit.js pending full extraction.
