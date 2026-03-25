=== Aldus ===
Contributors: regionallyfamous
Tags: blocks, gutenberg, layout, design, composer
Requires at least: 6.4
Tested up to: 6.9
Stable tag: 1.3.0
Requires PHP: 8.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Turn your content into a professionally designed layout. Add what you've got — Aldus shows you sixteen ways it could look.

== Description ==

You wrote the content. Now it needs to look like a real website — not a stack of paragraphs in a default template. Aldus takes what you've written and shows you sixteen different ways to lay it out: editorial spreads, cinematic hero sections, newspaper columns, minimal typography, and more. Pick the one that fits. It becomes real WordPress blocks. Edit them, rearrange them, or just publish. No page builder. No design skills. No subscription.

You know what you want to say. Aldus figures out how it should look.

**Here's how it works:**

1. Add your content pieces — a headline, a paragraph, a quote, an image, a call to action, whatever you've got.
2. Hit **Make it happen**.
3. Aldus tries your content in **up to sixteen layout personalities** — each with its own visual character, mood, and structure.
4. Pick the one that fits. It's replaced in-place with real, fully-editable core WordPress blocks.

The same content in **Dispatch** feels like breaking news. In **Nocturne** it's cinematic and dark. In **Folio** it reads like a magazine spread. Sixteen styles, one set of words — one of them will click.

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

**Try before you commit — Pack Previews.** Not ready to add your own content yet? Pick from seven themed packs (Roast, Meridian, Hearth, Plume, Grove, Loot, Signal) to see how all sixteen layout styles look with real copy. No model download required.

**Style notes.** Add an optional free-text instruction — "lead with the image", "minimal", "bold CTA" — and the layout model steers toward it.

**Mix & match.** Combine sections from different personalities into a single custom layout.

**Per-card re-roll.** Not feeling one card? Regenerate just that slot without losing the rest.

**Saved sessions.** Bookmark your current set of content pieces and reload them later.

**Requires WebGPU.** Aldus runs its layout model in the browser using WebGPU. Chrome 113+, Edge 113+, and Safari 18+ all support it. Pack Previews work in any browser.

Aldus is named after Aldus Manutius — the 15th-century Venetian printer who invented italic type and shaped the modern page. Like him, Aldus takes your raw material and makes it look like it was designed on purpose.

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

= 1.3.0 =
* Testing & linting infrastructure: added PHPCS with WordPress Coding Standards, PHPStan static analysis at level 6, and stricter ESLint config — 0 errors across all PHP source files.
* Auto-fixed 1,430 PHPCS style violations (indentation, array syntax, spacing) via phpcbf.
* Expanded PHP unit test suite: new ContentDistributorTest (17 tests), SanitizeTokenTest (11 tests), SanitizeItemTest (15 tests), and ThemeHelpersTest (18 tests) — 93 unit tests total.
* Corrected existing BlockHtmlTest, EnforceAnchorsTest, and PruneTokensTest to use accurate function names and non-anchor token fixtures.
* Added Jest configuration (jest.config.js) and tokenLabels.test.js — 57 JS unit tests total.
* Added PHP integration test suite (tests/integration/) with AssembleEndpointTest and RendererCoverTest; requires WordPress test library via bin/install-wp-tests.sh.
* Added test fixtures (tests/fixtures/) for blog post and landing page content scenarios.
* Updated CI pipeline: PHPCS and PHPStan added to lint job; PHP unit tests now run against PHP 8.0, 8.2, and 8.3 in a matrix; integration tests run against WP 6.4/6.7/latest with MySQL service.
* New npm scripts: lint:php, analyze:php, fix:php, test:js, test:php:unit, test:php:integration, coverage:php, coverage:js, ci.

= 1.2.0 =
* Theme awareness: Aldus now reads theme.json layout settings and uses the active theme's contentSize for constrained group blocks instead of a hardcoded 48rem.
* Theme spacing: padding values in generated blocks now map to the theme's spacing preset scale (via CSS custom properties) when declared; hardcoded rem values are used as fallback.
* Theme spacer adaptation: spacer block heights are reduced when the theme already has a generous blockGap, preventing double whitespace.
* Theme appearance tools: tokens that rely on borders or background colors are automatically filtered out when the theme has disabled those appearance tools.
* Plain button variant: the default CTA button no longer overrides theme colors — it renders as a bare core/button so the theme's global button styles apply natively. Outline and ghost variants are unchanged.
* Custom block styles: the editor detects registered styles for core/pullquote, core/image, and core/button and passes them to the assembler; pullquotes use a theme's "plain" style when available.
* Site identity in LLM prompt: the site title and tagline are now passed to the layout model as context ("Site: Name — Tagline"), giving the model a signal about the site's domain and tone.
* Nav menu URL suggestions: CTA button inputs now show clickable suggestion pills for the site's primary navigation items when the URL field is empty.
* Recent media thumbnails: image inputs now show the 8 most recently uploaded media library images as clickable thumbnails when no image has been selected yet.

= 1.1.0 =
* Redesigned card overlay: replaced full-cover dark overlay with a slim gradient bar at the bottom of each card. "Use this one" is now the sole primary action in the overlay, styled with the theme accent color.
* Moved "Expand preview" button to the top-right corner of the card; semi-transparent by default, fully visible on hover.
* Moved "Copy blocks" and "Try with my content" to the card footer as compact icon-only buttons (clipboard and swap icons) with tooltips. These power-user actions no longer block the layout preview.
* Redesigned empty state: content type buttons are now the first interactive elements, making the primary action immediately obvious. Import options ("Use post title as headline", "Import content from this page") appear below a visual divider as a secondary path.
* Style chips, special instructions, and the "Make it happen" button are now hidden in the empty state and only appear once at least one content item has been added.
* Fixed WordPress 6.9 block serialization: padding shorthand expanded to longhand (padding-top / right / bottom / left), cover inner-container class list corrected, button class order fixed, media-text grid-template updated, group border migrated to longhand with has-border-color class.

= 1.0.0 =
* Initial public release.
* Hybrid architecture: client-side WebLLM (SmolLM2-360M) for probabilistic layout planning; server-side PHP for deterministic WordPress block assembly. No external services, no subscriptions.
* 16 layout personalities: Dispatch, Folio, Stratum, Broadside, Manifesto, Nocturne, Tribune, Overture, Codex, Dusk, Broadsheet, Solstice, Mirage, Ledger, Mosaic, Prism.
* 10 content types: headline, subheading, paragraph, quote, image, button/CTA, list, video, table, gallery.
* 9 themed sample packs for instant model-free previews: Roast, Meridian, Hearth, Plume, Grove, Bazaar, Forge, Rally, Slim.
* Block transforms from core/group, core/heading, core/paragraph, core/image, core/quote, core/list, core/buttons, core/embed, core/table, core/gallery.
* Mix & match — combine sections from different personalities into one layout.
* Per-card re-roll — regenerate a single layout slot without losing the rest.
* Quick peek — instant personality previews using your own content, no model required.
* Saved sessions with post title and ID context.
* Live content preview drawer on the building screen.
* Keyboard shortcuts: ⌘↵ generate, ⇧⌘Z undo, ⇧⌘R regenerate.
* Style notes — free-text steering for the layout model.
* Completeness hints — outcome-based suggestions for missing content types.
* Full CI via GitHub Actions; Dependabot for npm and Actions updates.

== Upgrade Notice ==

= 1.3.0 =
Maintenance release: adds comprehensive testing and linting infrastructure with no functional changes to layouts or the editor UI.

= 1.2.0 =
Generated layouts now adapt to your theme's spacing scale, content width, and button styles — output feels native to any block theme out of the box.

= 1.1.0 =
Redesigned card overlay and empty state for a cleaner first-use experience. Fixes block serialization errors that appeared after upgrading to WordPress 6.9.
