/**
 * BuildScreen — the content item list and generate button.
 *
 * Renders the main composing interface: the list of content items, the
 * completeness hints, the style note input, the "Make it happen" button,
 * and the quick-start presets.
 *
 * This file is the architectural home for the BuildScreen component.
 * The implementation currently lives in edit.js (see the `BuildScreen`
 * function there). Once the JS refactor is complete, the component will be
 * moved here and edit.js will import it.
 *
 * Props:
 *
 * @param {Array}    items           Current content items array.
 * @param {Function} onAddItem       Adds an item of the given type.
 * @param {Function} onUpdateItem    Patches an item by id.
 * @param {Function} onRemoveItem    Removes an item by id.
 * @param {Function} onReorderItems  Swaps two items by id.
 * @param {Function} onMoveItem      Moves an item by one position.
 * @param {Function} onGenerate      Triggers layout generation.
 * @param {boolean}  isGenerating    Whether generation is in progress.
 * @param {string}   styleNote       Free-text style direction.
 * @param {Function} onStyleNote     Updates the style note.
 * @param {Function} onLoadPreset    Loads a quick-start preset.
 * @param {Function} onImport        Imports content from the current post.
 * @param {boolean}  hasEngine       Whether the engine is ready.
 * @param {boolean}  webGPUSupported Whether WebGPU is available.
 */

// Intentionally empty — implementation lives in edit.js pending full extraction.
