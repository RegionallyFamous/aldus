=== Aldus — Layout Explorer ===
Contributors: regionallyfamous
Tags: blocks, gutenberg, layout, design, composer
Requires at least: 6.4
Tested up to: 6.9
Stable tag: 1.16.0
Requires PHP: 8.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

You write it. Aldus shows you every way it could look — then you pick. Same words, different energy. No page builder, no design skills, no lock-in.

== Description ==

You wrote a headline, three paragraphs, and a call to action. Right now they're sitting in a column, looking like every other WordPress page. Aldus takes those same words and shows you how they'd look as a magazine spread, a dark cinematic landing page, a dense newspaper layout, a minimal essay — and a dozen more, all at once. Same words, different energy. Pick the one that fits and publish. It becomes real WordPress blocks you can edit, rearrange, or build on.

You bring the words. Aldus brings the options. You pick.

**Bring your words. See every option. Pick.**

Add what the page needs — a headline, some paragraphs, an image, a quote, a button. Don't worry about order or arrangement.

Hit **Make it happen** and Aldus arranges your content in every layout style at once — editorial columns, cinematic heroes, dense newspaper grids, minimal typography. Each one has its own structure and mood.

Click the one that fits. It becomes real WordPress blocks — fully editable, rearrangeable, no plugin dependency. Aldus stays available if you want to try a different look later.

The same content in **Dispatch** feels like breaking news. In **Nocturne** it's cinematic and dark. In **Folio** it reads like a magazine spread. Every style, one set of words — one of them will click.

No settings. No external services. No subscriptions. The model downloads once (~200 MB) and lives in your browser cache forever after. Nothing you write ever leaves your computer — the AI runs entirely in your browser.

**Your words stay yours.** The layout model never reads what you wrote — it only knows you have "2 paragraphs, 1 image, 1 quote." It decides which blocks go where. Your actual text goes in verbatim, untouched, exactly as you typed it. No rewrites, no suggestions, no "AI-improved" copy.

**What you can add:**

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

**Layout styles:**

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

**Try before you commit — Pack Previews.** Not ready to add your own content yet? Pick from nine themed packs (Roast, Meridian, Hearth, Plume, Grove, Loot, Signal, Forge, Slim) to see how every layout style looks with real copy. No model download required.

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
5. Add what the page needs and click **Make it happen**.

The first time you generate layouts, the browser downloads the layout model (~200 MB). This is a one-time download — it's cached and reused on every subsequent generation. To skip the download and explore layouts instantly, use a themed Pack Preview instead.

== Frequently Asked Questions ==

= Does it require an account or subscription? =

No. Aldus runs entirely in the browser. No accounts, no API keys, no external services.

= Does it need an internet connection? =

Only for the first-time model download. After that, generation works fully offline. Pack Previews also work offline once the plugin is installed.

= Does Aldus rewrite my content? =

Never. The layout model only sees what types of content you have — "2 paragraphs, 1 image" — not what you wrote. It decides which blocks go where, not what goes in them. Your actual text is inserted verbatim. No AI rewrites, no suggestions, no edits.

= Which browsers are supported? =

Any browser with WebGPU support: Chrome 113+, Edge 113+, Safari 18+. Firefox does not yet support WebGPU. Pack Previews work in all browsers.

= What happens after I pick a layout? =

The layout becomes real WordPress blocks inside an Aldus wrapper. Edit your content freely — text, images, links, anything. Click "Redesign" in the toolbar anytime to try a different style. If you want to remove the Aldus wrapper entirely, click "Detach from Aldus" — the blocks stay, fully editable, with no plugin dependency.

= Can I have multiple Aldus blocks on one page? =

No — one at a time (`"multiple": false`). Aldus is a composition tool, not a repeatable widget.

= Where is my content saved? =

Your content is saved in the block's attributes and in post meta, so it survives page reloads and editor sessions. When you pick a layout, the content items are also stored in post meta — this is what powers the "Redesign" feature, letting you regenerate layouts without re-entering your content.

= What are Pack Previews? =

Nine themed content packs (Roast — specialty coffee; Meridian — B2B SaaS; Hearth — nonprofit; Plume — travel; Grove — farm-to-table; Loot — gaming/collectibles; Signal — tech/developer; Forge — manufacturing/industrial; Slim — minimalist fashion) that let you see every layout style with real copy instantly, no model download required. Switch the building screen to **Preview** mode and pick a pack.

= What is a Style Note? =

An optional free-text field on the building screen that steers the layout model — for example "lead with the image", "keep it minimal", or "bold CTA up top". It's passed directly into the model prompt.

== Changelog ==

= 1.16.0 =
* When the AI model is ready and you've added content, Aldus now suggests a style direction (e.g. "bold editorial", "minimal text-first") based on what you've written — one click applies it, another dismisses it.
* Layout cards now show a "✦ Recommended" badge for the styles that best match your content mix, so the most relevant options are obvious at a glance.
* A Compare button appears on each card when your page already has content — click it to see the new layout alongside your current page in a side-by-side modal.
* Every layout you apply is now saved to a history list in the block sidebar — scroll back, preview the details, and restore any previous version with one click.
* 17 new block patterns registered across five categories (hero, content, media, typography, structural), all theme-aware and available in the block inserter under Patterns → Aldus.
* Rewrote all user-facing copy to reflect what Aldus actually does: show you every way your words could look, so you can pick. "Layout Explorer" replaces "Block Compositor" everywhere.
* Fixed a critical error in the privacy policy statement — the previous text incorrectly described sending data to OpenAI. Aldus runs entirely in your browser; nothing is ever sent to an external AI service.

= 1.15.0 =
* The mixing screen has been redesigned as a three-zone layout editor: a vertical section timeline with personality colour coding, an alternatives grid with wireframe previews, and a live composite preview that updates as you make changes. A shuffle button randomly reassigns personalities across all sections with a staggered animation.

= 1.14.0 =
* The PHP backend has been split into focused modules — renderers, serialisers, theme helpers, and the REST controller each live in their own file. No user-facing changes; this makes the codebase easier to maintain and extend.

= 1.13.0 =
* The editor now loads faster. The block's internal JavaScript has been reorganised into focused modules — personalities, tokens, components, and screens each live in their own file. No user-facing changes; this lays the groundwork for easier feature additions.

= 1.11.0 =
* Any future render error in the block now shows a contained error panel instead of blanking the entire editor — you can keep editing the rest of your post.
* Build and CI now catch undefined icon imports and incomplete bundles before they can be released, preventing the class of bug fixed in 1.10.2.
* API responses from the server are now validated before use, so a malformed response fails gracefully instead of crashing the block.
* The block is better at extracting usable JSON from LLM output that includes extra preamble text, reducing generation failures.

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
* Your site's privacy policy guide (Tools > Privacy) now includes a statement confirming that Aldus runs entirely in the browser and sends no content to external services.

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
* Initial release. Add your content, see every layout style at once, pick the one that fits — no external services, no API keys, nothing leaves your browser.

== Upgrade Notice ==

= 1.16.0 =
Five new features — style suggestions, recommendation badges, before/after compare, layout history, and 17 new block patterns. Complete copy rewrite. Critical privacy policy correction. Safe to update.

= 1.15.0 =
The mixing screen has been redesigned. Safe to update — no block data or settings change.

= 1.14.0 =
Internal PHP refactor. No user-facing changes; safe to update.

= 1.13.0 =
Internal JavaScript reorganisation. No user-facing changes; safe to update.

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
