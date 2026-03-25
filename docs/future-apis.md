# Future WordPress API Opportunities

This document catalogues WordPress APIs and their integration status in Aldus. Items marked **Shipped** are already implemented. Remaining items are candidates for future development.

---

## Item 5 — Interactivity API ✅ Shipped in 1.10.0

**WordPress version:** 6.5+  
**API surface:** `@wordpress/interactivity` package, `data-wp-*` HTML directives, `wp_register_script_module()`.

### What was implemented

`src/frontend/interactivity.js` registers an `aldus` interactive store with four effects: `parallax` (cover background shift), `revealOnScroll` (fade-in-up on viewport entry), `countUp` (stat number animation), and `animateDetails` (smooth accordion open/close). PHP renderers in `templates.php` inject `data-wp-interactive`, `data-wp-on-window--scroll`, `data-wp-watch`, and `data-wp-context` attributes into cover blocks, full-width group sections, stat rows, and details blocks — each gated on `function_exists('wp_interactivity_data_wp_context')` for WP 6.4 compatibility. The module is declared via `viewScriptModule` in `block.json` and registered as `@aldus/interactivity` in `aldus_register_block()`. Each personality controls which effects are active via an `interactivity` key in `aldus_personality_style_rules()`.

---

## Item 6 — Block Bindings API

**WordPress version:** 6.5+  
**API surface:** `register_block_bindings_source()`, `"bindings"` attribute in `block.json`.

### What it does

Block Bindings allow block attributes (like `core/paragraph`'s `content` or `core/image`'s `url`) to be dynamically bound to external data sources — post meta, custom fields, or plugin-registered sources — rather than hardcoded values in the serialised block HTML.

### Current status

Partially implemented. `includes/bindings.php` registers an `aldus/item` bindings source with `register_block_bindings_source()`, and the `_aldus_items` post meta stores the content item array. Generated block markup does not yet use `"bindings"` attributes — content is still baked in at insertion time.

### What would complete the implementation

- Generate block markup that uses `"bindings": { "content": { "source": "aldus/item", "args": { "key": "headline" } } }` so that editing the stored item updates the block automatically.
- Support "re-binding" — letting the user replace an item's value without re-running the full generation.
- Requires careful handling of the content distributor to track which item index each generated block consumed.

---

## Item 7 — Block Hooks ✅ Shipped in 1.9.0

**WordPress version:** 6.4+  
**API surface:** `"blockHooks"` key in `block.json`.

### What was implemented

`src/block.json` declares `"blockHooks": { "core/post-content": "firstChild" }`. On Full Site Editing pages, WordPress automatically inserts the Aldus block as the first child of `core/post-content` blocks in templates that include it. This surfaces Aldus as a contextual suggestion in FSE template editing without requiring the user to manually insert the block.

---

## Item 8 — wp_enqueue_block_style() ✅ Shipped in 1.9.0

**WordPress version:** 6.1+  
**API surface:** `wp_enqueue_block_style( $block_name, $args )`.

### What was implemented

`aldus_register_block()` in `aldus.php` calls `wp_enqueue_block_style()` to register `build/frontend.css` as a block-scoped stylesheet. It is loaded only on pages that contain an Aldus-generated block — zero overhead on pages without Aldus content. In 1.10.0, `build/frontend.scss` was extended with Interactivity API initial states (opacity, transform, transitions) and wrapper mode styles.

---

## Summary

| Item | API | WP Version | Status |
|------|-----|-----------|--------|
| 5 | Interactivity API | 6.5 | ✅ Shipped 1.10.0 |
| 6 | Block Bindings | 6.5 | 🔶 Partially implemented — bindings source registered, markup binding pending |
| 7 | Block Hooks | 6.4 | ✅ Shipped 1.9.0 |
| 8 | wp_enqueue_block_style | 6.1 | ✅ Shipped 1.9.0 |

Item 6 (Block Bindings) is the strongest remaining candidate: completing it would allow Aldus-generated content to stay live-synced with the original item values without re-running generation.
