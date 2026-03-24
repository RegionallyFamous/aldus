=== Aldus ===
Contributors: regionallyfamous
Tags: blocks, gutenberg, layout, design, composer
Requires at least: 6.4
Tested up to: 6.9
Stable tag: 1.9.2
Requires PHP: 8.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Your words, sixteen personalities. Drop in your content and Aldus tries it in up to sixteen layout styles — pick the one that fits.

== Description ==

Aldus is named after Aldus Manutius — the 15th-century Venetian printer who invented italic type and shaped the modern page. Like him, Aldus takes your raw material and makes it look like it was designed on purpose.

You know what you want to say. Aldus figures out how it should look.

**Here's how it works:**

1. Add your content pieces — a headline, a paragraph, a quote, an image, a call to action, whatever you've got.
2. Hit **Make it happen**.
3. Aldus tries your content in **up to sixteen layout personalities** — each with its own visual character, mood, and structure.
4. Pick the one that fits. It's replaced in-place with real, fully-editable core WordPress blocks.

The same content in **Dispatch** feels like breaking news. In **Nocturne** it's cinematic and dark. In **Folio** it reads like a magazine spread. Eight personalities, one set of words — one of them will click.

No settings. No external services. No subscriptions. The model downloads once (~200 MB) and lives in your browser cache forever after.

**It never touches your words.** The layout engine only sees what *types* of content you have (e.g., "2 paragraphs, 1 image") — never the actual text. Your words go in verbatim, exactly as you typed them.

**Content types:**

* Headline
* Subheading
* Paragraph
* Quote
* Image (from media library or URL)
* Button / call to action
* List
* Video (YouTube, Vimeo, or direct URL)
* Table (CSV-style — first row becomes the header)
* Gallery (multi-image grid from your media library)

**The sixteen layout personalities:**

1. **Dispatch** — breaking-news urgency: dark full-bleed opener, bold pullquote, action
2. **Folio** — label left, body right — every section reads like a magazine spread
3. **Stratum** — dark, light, accent bands — the page as landscape
4. **Broadside** — cinematic alternating image-text panels with a CTA cut right in
5. **Manifesto** — quiet H1, then a dark declaration, then three columns erupt
6. **Nocturne** — dark cover bleeds into a full image, then surfaces into light
7. **Tribune** — newspaper front-page energy, split by a bold pullquote
8. **Overture** — light cover builds to a reveal, accent section drops the curtain
9. **Codex** — typographic restraint: display headline, kicker label, editorial border inset
10. **Dusk** — split-screen opener bleeds into gradient atmosphere
11. **Broadsheet** — four-column newspaper density, cleaved by a centered pullquote
12. **Solstice** — minimal cover, two-column rhythm, nothing superfluous
13. **Mirage** — gradient-drenched and lush, cover and color in conversation
14. **Ledger** — long-form essay structure: two columns, attributed quote, editorial inset
15. **Mosaic** — gallery-first: images lead, text stays lean (requires Gallery content)
16. **Prism** — three columns open into a full gallery grid (requires Gallery content)

All output is standard core WordPress blocks — Cover, Columns, Media & Text, Group, Pullquote, and more. No proprietary markup, no shortcodes, no plugin lock-in.

**Try before you commit — Pack Previews.** Not ready to add your own content yet? Pick from five themed packs (Roast, Meridian, Hearth, Plume, Grove) to see how all eight personalities look with real copy. No model download required.

**Style notes.** Add an optional free-text instruction — "lead with the image", "minimal", "bold CTA" — and the layout model steers toward it.

**Mix & match.** Combine sections from different personalities into a single custom layout.

**Per-card re-roll.** Not feeling one card? Regenerate just that slot without losing the rest.

**Saved sessions.** Bookmark your current set of content pieces and reload them later.

**Requires WebGPU.** Aldus runs its layout model in the browser using WebGPU. Chrome 113+, Edge 113+, and Safari 18+ all support it. Pack Previews work in any browser.

== Installation ==

1. Upload the `aldus` folder to `/wp-content/plugins/`.
2. Activate the plugin in **Plugins → Installed Plugins**.
3. Open a post or page in the block editor.
4. Insert the **Aldus** block from the block inserter.
5. Add your content pieces and click **Make it happen**.

The first time you generate layouts, the browser downloads the layout model (~200 MB). This is a one-time download — it's cached and reused on every subsequent generation. To skip the download and explore layouts instantly, use a themed Pack Preview instead.

== Frequently Asked Questions ==

= Does it require an account or subscription? =

No. Aldus runs entirely in the browser. No accounts, no API keys, no external services.

= Does it need an internet connection? =

Only for the first-time model download. After that, generation works fully offline. Pack Previews also work offline once the plugin is installed.

= Does Aldus rewrite my content? =

No. The layout engine only sees the count and type of your content pieces (e.g., "2 paragraphs, 1 image"). It picks a block arrangement. Your actual words are never touched.

= Which browsers are supported? =

Any browser with WebGPU support: Chrome 113+, Edge 113+, Safari 18+. Firefox does not yet support WebGPU. Pack Previews work in all browsers.

= What happens after I pick a layout? =

The Aldus block removes itself and is replaced in-place with the chosen layout — made entirely from standard core WordPress blocks. Edit them however you like.

= Can I have multiple Aldus blocks on one page? =

No — one at a time (`"multiple": false`). Aldus is a composition tool, not a repeatable widget.

= Where are my content pieces saved? =

Your content pieces are saved inside the block itself, so they survive page reloads and editor sessions. You can also snapshot a set using **Saved sets** and reload it later from the same menu.

= What are Pack Previews? =

Five themed content packs (Roast — specialty coffee; Meridian — B2B SaaS; Hearth — nonprofit; Plume — travel; Grove — farm-to-table) that let you see all eight layouts with real copy instantly, no model download required. Switch the building screen to **Preview** mode and pick a pack.

= What is a Style Note? =

An optional free-text field on the building screen that steers the layout model — for example "lead with the image", "keep it minimal", or "bold CTA up top". It's passed directly into the model prompt.

== Changelog ==

= 1.5.1 =
* Fix: Token sanitisation now preserves colons — tokens like `cover:dark` and `columns:28-72` were being silently corrupted by `sanitize_key`, causing most non-anchor block types to produce empty output.
* Fix: Pack Preview item limit raised from 20 to 80 — `packToItems()` produces ~60 items for a full pack, which was causing every preview request to fail validation.
* Security: Added per-token allowlist validation against all known token strings.
* Reliability: `handleRemove` animation timeout now cleared on component unmount.
* Reliability: `savedItems` block attribute now syncs back to React state on undo/redo.
* Reliability: `MixingScreen` slot state resets correctly when layouts change during a re-roll.
* Reliability: Re-roll guard added for LLM mode when the inference engine is not yet initialised.
* Code quality: `sample-data/index.js` redundant import+export pattern cleaned up.
* Code quality: `savedItems` and session data now schema-validated before loading to prevent corrupted data from crashing the UI.
* Performance: `packToItems()` now computed once per preview run instead of once per personality (8×).

= 1.5.0 =
* New: Content persistence — items survive block saves, page reloads, and editor sessions.
* New: Style notes — optional free-text field that steers the layout model prompt.
* New: Completeness hints — clickable pills show which content types would unlock more layout sections.
* New: Per-card re-roll — regenerate a single layout slot without losing the others.
* New: Token recipe strip — each layout card shows the structural block sequence it uses.
* New: Saved sessions — save and reload named snapshots of content items via localStorage.
* New: Mix & match — combine sections from different layouts into a custom arrangement.
* API: `/assemble` endpoint now returns per-token `sections` array alongside `blocks` and `tokens`.

= 1.4.1 =
* Fix: Pack selector correctly uses `pack.label` and `pack.palette.image` after the pack data structure update.

= 1.4.0 =
* New: Pack Previews — five themed content packs (Roast, Meridian, Hearth, Plume, Grove) for instant, model-free layout previews.
* New: Solid-color SVG image placeholders per pack — no external dependencies.
* New: Pack selector toggle on the building screen.

= 1.3.0 =
* New: Eight redesigned layout personalities — Dispatch, Folio, Stratum, Broadside, Manifesto, Nocturne, Tribune, Overture.
* New: All generated groups named in the WordPress List View.
* Improved: Layout prompts now include `fullSequence` for more structured, exciting results.

= 1.2.1 =
* Improved: Quick-start presets (blog post, landing page, feature story, product pitch).
* Improved: Drag-and-drop reordering of content items with animated transitions.
* Improved: Exit animation on item removal.

= 1.2.0 =
* New: Layout card hover overlay with "Use this layout" action.
* New: Block Preview thumbnails on layout cards.
* New: Block editor sidebar personality toggles.
* Improved: Error screen with structured headline + detail messaging.

= 1.1.4 =
* Improved: Loading message rotation with fade transition.
* Improved: Retry logic with exponential back-off on generation errors.

= 1.1.3 =
* Improved: Fun, friendly copy throughout the editor UI.
* Improved: "AI" renamed to "Aldus" in all user-facing text.

= 1.1.2 =
* Improved: Font sizes bumped up two steps across all editor UI text.
* Improved: Minimal styles aligned with WordPress core conventions.

= 1.1.1 =
* Fix: Cover block markup now matches modern WP serialisation (position classes, dim-ratio classes).
* Fix: TextControl deprecation warnings resolved.
* Fix: Empty-layout error response changed from 502 to 422.

= 1.1.0 =
* Refreshed editor UI — minimal styles matching WP core conventions.
* Updated copy throughout — friendlier, less robotic.

= 1.0.0 =
* Initial release.
* 8 layout personalities with PHP-enforced structural anchors.
* 7 content types: headline, subheading, paragraph, quote, image, cta, list.
* In-browser WebLLM inference via WebGPU (SmolLM2-360M).
* Dynamic theme color palette and font size integration.
* Accessibility: ARIA labels, aria-live regions, focus management, prefers-reduced-motion.

== Upgrade Notice ==

= 1.5.1 =
Critical fix: layout tokens were being silently corrupted by PHP sanitisation, causing most block types (media panels, column groups, full-width groups) to produce empty output. Upgrade immediately.
