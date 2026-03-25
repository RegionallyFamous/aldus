=== Aldus — Block Compositor ===
Contributors: regionallyfamous
Tags: blocks, gutenberg, layout, design, composer
Requires at least: 6.4
Tested up to: 6.9
Stable tag: 1.10.2
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

= 1.10.2 =
* Fixed a crash that caused the block editor to go blank when the Aldus block was present on the page.

= 1.10.1 =
* Fixed a fatal error that caused the block to appear blank or show placeholder content on sites where the editor scripts weren't included in the distributed zip.
* Removed the automatic block insertion that was silently adding an Aldus block to every post and template — Aldus now only appears where you place it.

= 1.9.0 =
* New "Redesign with Aldus" option in the block Options menu: select any heading, paragraph, image, or similar block and convert it straight into an Aldus layout without starting from scratch.
* A new ✦ column on the Posts and Pages list screens shows at a glance which posts use the Aldus block — useful when you're managing a large site.
* Added `npm run release:zip` to package a clean distribution zip ready for WordPress.org or manual installs.
* Block inserter search now surfaces Aldus for terms like "ai", "generate", "builder", and "template".

= 1.8.0 =
* Keyboard and screen-reader users now land on the first inserted block immediately after choosing a layout — no need to hunt for where focus went.
* The plugin now works correctly in Windows High Contrast Mode: cards, buttons, tooltips, and error panels all use system color keywords so nothing disappears against the background.
* The model-download progress bar now announces its label to screen readers, matching the behaviour of the generation progress bar already in place.

= 1.7.0 =
* When the layout model outputs unreadable JSON, Aldus now retries automatically — silently, just once — before showing an error. Most transient failures resolve on their own without you ever seeing a message.
* Error screens now have a "Technical details" disclosure for those who want to see the raw error data.
* Assembled layouts are cached for 5 minutes so repeated requests for the same content + personality return instantly.
* The WebLLM runtime chunk is now hinted with both `modulepreload` and `prefetch` so more browsers begin downloading it as soon as you open the editor.

= 1.6.0 =
* Themes and plugins can now register custom layout personalities via `aldus_register_personality()`.
* New `GET /aldus/v1/config` REST endpoint returns all available personalities, theme layout settings, and version info — useful for headless or tooling integrations.
* A new `HOOKS.md` file documents every action, filter, and public API function available to developers.

= 1.5.0 =
* New users see three sequential tooltips on their first visit — pointing to where to add content, style hints, and the generate button. Dismiss each with "Got it".
* Activating the plugin now takes you directly to a welcome page explaining how it works, with a link to try it immediately.
* Plugin row now has an "About" link to the welcome page.

= 1.4.0 =
* After you update, a one-time notice tells you what changed in this release — dismiss it with the ✕ button.
* Your site's privacy policy guide (Tools > Privacy) now lists what Aldus sends to the AI API, so you can include it in your site's privacy statement.

= 1.3.0 =
* No changes to the editor or generated layouts. This release adds automated testing and static analysis so bugs are caught before they reach you.

= 1.2.0 =
* Generated layouts now feel like they belong in your theme. Spacing, widths, and button styles are pulled from your theme settings rather than baked in, so output looks right on any block theme without manual cleanup.
* CTA button fields now suggest your site's navigation links when the URL is empty — one click to fill it in.
* Image fields show your most recently uploaded media as a thumbnail grid, so you're not hunting through the media library.
* The layout model is now aware of your site name and tagline, which helps it make better style and tone choices.

= 1.1.0 =
* The card overlay is less intrusive. "Use this one" is the clear primary action; expand, copy, and swap are still there as small footer controls so they stay out of the way while you're browsing layouts.
* The empty state now leads with content type buttons so it's immediately obvious what to do first. Style options and the generate button stay hidden until you've added something to work with.
* Fixes block validation errors that appeared in WordPress 6.9.

= 1.0.0 =
* Initial release. Describe your content, pick a personality, and Aldus generates a complete block layout — no external services, no API keys, nothing leaves your browser until you hit generate.

== Upgrade Notice ==

= 1.9.0 =
Automatic retry on LLM parse failures reduces error rates. Assembled layout caching for repeat requests.

= 1.6.0 =
Adds developer APIs for registering custom personalities and a REST config endpoint. No user-facing changes.

= 1.5.0 =
New users will see a quick tooltip walkthrough on their first visit. Activating fresh also opens a welcome page.

= 1.4.0 =
Shows a one-time notice after upgrading and adds a privacy policy statement for Tools > Privacy.

= 1.3.0 =
No user-facing changes. Safe to update.

= 1.2.0 =
Generated layouts now adapt to your active theme — spacing, widths, and button styles should look right without any manual cleanup.

= 1.1.0 =
Cleaner card overlay and empty state. Fixes block validation errors on WordPress 6.9.
