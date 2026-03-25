/**
 * ResultsScreen — the 16-card layout grid.
 *
 * Renders the grid of generated layout cards. Each card shows a wireframe
 * preview, the personality name and tagline, and action buttons (select,
 * favorite, re-roll). Handles keyboard navigation (roving tabindex / role=grid)
 * and focus management after layout insertion.
 *
 * This file is the architectural home for the ResultsScreen component.
 * The implementation currently lives in edit.js (see the `ResultsScreen`
 * function there). Once the JS refactor is complete, the component will be
 * moved here and edit.js will import it.
 *
 * Props:
 *
 * @param {Array}    layouts          Generated layout objects.
 * @param {Function} onUseLayout      Called when user selects a layout.
 * @param {Function} onReroll         Called to regenerate a single card.
 * @param {Function} onMixMode        Enters mix-and-match mode.
 * @param {Function} onStartOver      Resets to the building screen.
 * @param {Object}   genProgress      { done, total } for the progress bar.
 * @param {boolean}  isGenerating     Whether re-roll generation is running.
 * @param {Array}    favoriteLabels   Favorited personality names.
 * @param {Function} onToggleFavorite Toggles a favorite.
 * @param {boolean}  isCompact        Whether compact grid mode is active.
 * @param {Function} onToggleCompact  Toggles compact mode.
 */

// Intentionally empty — implementation lives in edit.js pending full extraction.
