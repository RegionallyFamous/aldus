# Future WordPress API Opportunities

This document catalogues WordPress APIs that are not yet used by Aldus but represent clear, high-value integration points for future development. Each entry explains what the API does, why it is relevant to Aldus, and what feature would justify implementing it.

---

## Item 5 — Interactivity API

**WordPress version:** 6.5+  
**API surface:** `@wordpress/interactivity` package, `data-wp-*` HTML directives, `wp_register_script_module()`, `wp_enqueue_script_module()`.

### What it does

The Interactivity API lets PHP-rendered blocks define reactive client-side behaviour using declarative `data-wp-*` HTML attributes and a corresponding JavaScript store. The store is a small reactive state object that drives DOM updates without a full React tree.

### Why it is relevant to Aldus

Aldus is currently an editor-only block — it replaces itself with core blocks and has no front-end presence. However, a future "Live Preview" or "Deferred Layout" mode could allow the block to remain in a saved post as a placeholder that renders its chosen layout lazily on the front end (useful for draft posts, preview URLs, or headless setups).

If that mode is added, the Interactivity API is the right tool to drive the front-end rendering logic — it would replace a static `src/render.php` output with a reactive placeholder that fetches and hydrates the chosen layout on demand.

### What would justify implementation

- A "Keep block on save" attribute that stores the chosen layout label and token sequence in post meta.
- A front-end render mode that either shows the assembled HTML (cached) or a loading placeholder (fetching).
- `src/render.php` would use `wp_interactivity_state()` to pass the layout context to the browser, where a small store handles the fetch/render lifecycle.

---

## Item 6 — Block Bindings API

**WordPress version:** 6.5+  
**API surface:** `register_block_bindings_source()`, `"bindings"` attribute in `block.json`.

### What it does

Block Bindings allow block attributes (like `core/paragraph`'s `content` or `core/image`'s `url`) to be dynamically bound to external data sources — post meta, custom fields, or plugin-registered sources — rather than hardcoded values in the serialised block HTML.

### Why it is relevant to Aldus

When Aldus inserts a layout, all content is baked into the block markup at insertion time. This means:

1. Changing the content later requires re-running Aldus.
2. Dynamic data (post title, featured image URL, custom field values) cannot be live-synced.

With Block Bindings, Aldus could register a `aldus/content-item` binding source. Each generated block would bind its content attribute to the corresponding Aldus content item stored in post meta. Editing the content item would update every place it appears in the layout automatically.

### What would justify implementation

- A `store content items in post meta` option that persists the item array as post meta rather than block attributes.
- An `Aldus` block bindings source that resolves `aldus/headline`, `aldus/paragraph[0]`, `aldus/image[1]` etc. to the corresponding stored item.
- Support for "re-binding" — letting the user replace an item's value without re-running the full generation.

---

## Item 7 — Block Hooks

**WordPress version:** 6.4+  
**API surface:** `"blockHooks"` key in `block.json`.

### What it does

Block Hooks let a plugin declare that its block should be automatically inserted before, after, or inside another block — without requiring the theme or post to explicitly include the hook block. The insertion is managed by WordPress core and is reversible (the user can remove the hooked block).

### Why it is relevant to Aldus

Block Hooks are the right way to surface the Aldus block as a contextual suggestion without intrusively adding it to every post. A common use case:

- **Pattern discovery:** Insert an Aldus "Start from scratch" prompt block at the beginning of any `core/post-content` block in Full Site Editing templates that have no user content yet.
- **Editor nudge:** Surface the Aldus inserter as a sibling suggestion below `core/group` or `core/cover` blocks, letting users immediately explore alternative layouts for a section they've just added.

### What would justify implementation

- Identifying the right anchor block (e.g. an empty `core/post-content`) and insertion position.
- Confirming that the UX benefit outweighs the risk of unexpected block insertion in FSE templates.
- Building a minimal "hook block" variant of Aldus that renders as a small, dismissible prompt rather than the full compositor UI.

---

## Item 8 — wp_enqueue_block_style()

**WordPress version:** 6.1+  
**API surface:** `wp_enqueue_block_style( $block_name, $args )`.

### What it does

`wp_enqueue_block_style()` registers a stylesheet that is loaded **only when a specific block is rendered on the page** — unlike `wp_enqueue_style()` which loads unconditionally. The stylesheet is inlined when the block appears above the fold or loaded asynchronously otherwise.

### Why it is relevant to Aldus

Aldus-generated layouts often use specific CSS class combinations (e.g. `has-black-background-color`, `wp-block-cover__inner-container`, Aldus's own utility classes in `editor.scss`) that are not included in the active theme's stylesheet. Currently these styles are either absent on the front end or rely on the theme having equivalent rules.

Using `wp_enqueue_block_style()`, Aldus could register a minimal `frontend.css` that:

1. Provides the utility classes used by generated layouts (spacing, overlay colours, typography tweaks).
2. Loads **only on pages that contain at least one Aldus-generated block** — zero overhead everywhere else.
3. Integrates correctly with WordPress's block style deduplication so the same rule is not emitted twice if multiple Aldus layouts appear on the same page.

### What would justify implementation

- The addition of a `frontend.css` build step that extracts Aldus-specific utility classes from `editor.scss` into a separate file.
- A `wp_enqueue_block_style()` call in `aldus_register_block()` pointing at the compiled `build/frontend.css`.
- Verification that the utility classes do not conflict with Twenty Twenty-Four or other popular themes.

---

## Summary

| Item | API | WP Version | Priority | Trigger |
|------|-----|-----------|----------|---------|
| 5 | Interactivity API | 6.5 | Medium | "Keep on save" / headless mode |
| 6 | Block Bindings | 6.5 | High | Dynamic content / live-sync items |
| 7 | Block Hooks | 6.4 | Low | FSE template integration |
| 8 | wp_enqueue_block_style | 6.1 | High | Any front-end CSS work |

Items 6 and 8 are the strongest near-term candidates: Block Bindings would meaningfully improve the editing workflow, and `wp_enqueue_block_style()` is a straightforward build addition with immediate performance benefits on the front end.
