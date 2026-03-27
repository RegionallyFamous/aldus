=== Aldus — Layout Explorer ===
Contributors: regionallyfamous
Tags: blocks, layout, design, ai, gutenberg
Requires at least: 6.4
Tested up to: 6.9
Stable tag: 1.26.0
Requires PHP: 8.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

You write it. Aldus shows you every way it could look — then you pick. Same words, different energy. No page builder, no design skills, no lock-in.

== Description ==

You wrote a headline, three paragraphs, and a call to action. Right now they're sitting in a column, looking like every other WordPress page. Aldus takes those same words and shows you how they'd look as a magazine spread, a dark cinematic landing page, a dense newspaper layout, a minimal essay — and a dozen more, all at once. Same words, different energy. Pick the one that fits and publish. It becomes real WordPress blocks you can edit, rearrange, or build on.

No page-builder grid. No template library to hunt through. No AI rewriting your copy — the layout model only sees *what kinds* of pieces you added (e.g. two paragraphs and an image), not the text itself. Your words stay on your server; the small on-device model runs in your browser.

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
* Code (syntax-highlighted snippet for docs, tutorials, or dev content)
* FAQ / Accordion (collapsible question-and-answer style sections)

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

**Mix & match.** Combine sections from different styles into a single custom layout.

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

The first time you run Aldus, the browser downloads the layout model (~200 MB). This is a one-time download — it's cached and reused every time. To skip the download and explore layouts instantly, use a themed Pack Preview instead.

== Frequently Asked Questions ==

= Does it require an account or subscription? =

No. Aldus runs entirely in the browser. No accounts, no API keys, no external services.

= Does it need an internet connection? =

Only for the first-time model download. After that, Aldus works fully offline. Pack Previews also work offline once the plugin is installed.

= Does Aldus rewrite my content? =

Never. The layout model only sees what types of content you have — "2 paragraphs, 1 image" — not what you wrote. It decides which blocks go where, not what goes in them. Your actual text is inserted verbatim. No AI rewrites, no suggestions, no edits.

= Which browsers are supported? =

Any browser with WebGPU support: Chrome 113+, Edge 113+, Safari 18+. Firefox does not yet support WebGPU. Pack Previews work in all browsers.

= What happens after I pick a layout? =

The layout becomes real WordPress blocks inside an Aldus wrapper. Edit your content freely — text, images, links, anything. Click "Redesign" in the toolbar anytime to try a different style. If you want to remove the Aldus wrapper entirely, click "Detach from Aldus" — the blocks stay, fully editable, with no plugin dependency.

= Can I have multiple Aldus blocks on one page? =

No — one at a time (`"multiple": false`). Aldus is a composition tool, not a repeatable widget.

= Where is my content saved? =

Your content is saved in the block's attributes and in post meta, so it survives page reloads and editor sessions. When you pick a layout, the content items are also stored in post meta — this is what powers the "Redesign" feature, letting you try new layouts without re-entering your content.

= What are Pack Previews? =

Nine themed content packs (Roast — specialty coffee; Meridian — B2B SaaS; Hearth — nonprofit; Plume — travel; Grove — farm-to-table; Loot — gaming/collectibles; Signal — tech/developer; Forge — manufacturing/industrial; Slim — minimalist fashion) that let you see every layout style with real copy instantly, no model download required. Switch the building screen to **Preview** mode and pick a pack.

= What is a Style Note? =

An optional free-text field on the building screen that steers the layout model — for example "lead with the image", "keep it minimal", or "bold CTA up top". It's passed directly into the model prompt.

== Changelog ==

= 1.26.0 =
* Layouts respect what you actually wrote — each style only pulls in block types that fit your content, so you see fewer empty slots or blocks that do not match your post (for example code blocks when you did not add code).
* Keeps Aldus dependable as WordPress grows — behind-the-scenes work only.

= 1.25.0 =
* If something goes wrong, diagnostics and site health line up with what really happened in the editor — easier for you or your host to understand the story.
* Layout history in the sidebar stays trustworthy: your saved previews stay readable and do not get corrupted in the database.
* Heavier editing sessions are less likely to hit confusing rate limits or flaky errors from background checks.

= 1.21.1 =
* Editing normally will not chew through the API rate limit twice as fast as it should.

= 1.21.0 =
* First layout cards appear in about a second or two; you can browse and click while the rest stream in — no more waiting on a silent grid.
* Descriptions fill in after the grid is usable, so you are not blocked waiting for copy.
* One less slow AI step when reading your content, so generation feels snappier overall.
* Styles that do not fit what you added are tucked away automatically; open "Show more styles" when you want the full catalog.
* Stronger protection around prompts and third-party code that hooks into Aldus.
* Press Escape to back out of confirmations cleanly; starting a new run will not flash an old result by mistake.
* Heroes, headings, and sections pick up your theme's fonts, shadows, and colors more faithfully — output feels native to your site.
* Fewer "This block contains unexpected or invalid content" warnings after you insert a layout; WordPress is happier with columns, groups, covers, and media-and-text blocks.
* Leaving the editor while the model is still loading no longer floods the browser console with scary GPU messages that were not your fault.
* Under the hood: server code reorganized for faster fixes and safer releases — nothing you need to click differently.

= 1.18.0 =
* A clearer welcome when you first install — you see what Aldus does before you open the editor.
* If one piece of a generated layout cannot render, you still get real blocks instead of a blank broken card.
* Back-to-back layout options feel more different from each other — less sameness when you are comparing styles.

= 1.17.0 =
* Faster block editor load; pack previews download only when you open them — better on shared hosting.
* Lighter work on normal pages that do not use Aldus — visitors are not paying for editor features they never see.
* If the browser cannot store the AI model (common on phones or locked-down networks), you get a clear message and next steps instead of a vague failure.
* First-visit hints follow your WordPress profile across devices when you are logged in.
* Tidier database for usage stats; **Tools → Site Health → Info** shows how Aldus is used — helpful when you are working with support.
* Block output stays in sync with WordPress — fewer mystery validation warnings; spacing presets no longer vanish on WordPress 6.4 and 6.7.
* Uninstall leaves no leftover junk. Theme colors stay accurate after you update your theme.
* Content and Preview tabs work better with keyboard and screen readers. The welcome screen behaves better under strict security policies.
* Site owners and hosts get richer health and error insight when tracking down issues.

= 1.16.0 =
* Aldus suggests a style direction from your draft (for example "bold editorial" or "minimal text-first") — one click applies it, another dismisses it.
* "Recommended" badges highlight the styles that fit your content mix best.
* Compare a new layout side-by-side with your current page when you already have content.
* Every applied layout is saved in the sidebar history — preview, scroll back, restore in one click.
* 17 new block patterns (hero, content, media, typography, structural) under **Patterns → Aldus**, tuned to your theme.
* Copy and naming now reflect the product: explore every way your words could look, then pick — "Layout Explorer" everywhere.
* Privacy policy helper text corrected: Aldus runs in the browser; your content is not sent to an external AI service.

= 1.15.0 =
* Mixing screen rebuilt: timeline of sections, alternatives grid with previews, live composite preview, and shuffle — easier to build a custom page from multiple styles.

= 1.14.0 =
* Nothing changes in the editor or in the blocks you get — internal PHP structure only, so we can ship fixes and features faster later.

= 1.13.0 =
* Snappier block load; same on-screen experience. Internal JavaScript reorganized for future features.

= 1.11.0 =
* If Aldus hits a render error, the rest of your post keeps working — you see a contained error instead of a blank editor.
* Server responses are validated before use, so a bad reply fails gracefully instead of crashing the block.
* Messy model output (extra text around the JSON) is handled more often, so fewer failed generations.

= 1.10.2 =
* Fixes the editor going blank when the Aldus block was on the page.

= 1.10.1 =
* Fixes the block appearing empty or placeholder-only when scripts were missing from the zip.
* Aldus no longer inserts itself into every post and template silently — it only appears where you put it.

= 1.9.0 =
* **Redesign with Aldus** in the block menu: turn selected blocks into an Aldus layout without starting from scratch.
* Posts and Pages list shows which content uses Aldus — easier on large sites.
* Block inserter finds Aldus for searches like "ai", "generate", "builder", and "template".

= 1.8.0 =
* Keyboard and screen-reader users land on the first inserted block right after you pick a layout.
* High Contrast Mode on Windows: controls stay visible; nothing disappears into the background.
* Model download progress is announced to screen readers like the generation bar.

= 1.7.0 =
* Garbled model output retries once in the background before you see an error — many hiccups never surface.
* Optional "Technical details" on error screens when you need to dig in.
* Repeat requests for the same layout return instantly for a few minutes.
* The layout engine starts downloading sooner when you open the editor.

= 1.6.0 =
* **Developers:** Theme and plugin authors can register custom layout personalities.
* **Integrations:** A config REST endpoint exposes personalities and theme layout info for headless sites and tools.
* **Developers:** Documentation for hooks and public APIs (see HOOKS.md in the plugin).

= 1.5.0 =
* First-time visitors get short tooltips for content, style hints, and generate — dismiss with "Got it".
* Fresh installs land on a welcome page with a direct path to try Aldus.
* Plugins screen links to **About** for the same welcome content.

= 1.4.0 =
* After updating, a one-time notice summarizes what is new — dismiss with ✕.
* **Tools → Privacy** guide can include accurate wording that Aldus runs locally and does not ship your content to third parties.

= 1.3.0 =
* Nothing changes in the editor or in generated layouts — quality and safety checks behind the scenes so fewer bugs reach you.

= 1.2.0 =
* Generated layouts inherit your theme's spacing, widths, and buttons — less manual cleanup on block themes.
* CTA buttons can suggest your site's own links when the URL is empty.
* Image pickers surface recent uploads so you are not lost in the media library.
* Layout choices can use your site name and tagline for better tone.

= 1.1.0 =
* Cleaner card UI: "Use this one" is obvious; secondary actions stay out of the way.
* Empty state starts with content types — you know what to add first before style options appear.
* Fixes block validation issues on WordPress 6.9.

= 1.0.0 =
* First release: add your content, see every layout style at once, pick the one that fits — no external services, no API keys, nothing leaves your browser.

== Upgrade Notice ==

= 1.26.0 =
Layouts align more closely with your real content; fewer odd or empty blocks. No change to how you use the editor. Safe to update.

= 1.17.0 =
Faster loads, lighter front-end when Aldus is not on the page, clearer errors, cleaner uninstall, spacing fixes on WP 6.4/6.7, better Site Health. Safe to update.

= 1.16.0 =
Style suggestions, recommendations, compare, layout history, new patterns, copy refresh, privacy policy correction. Safe to update.

= 1.15.0 =
New mixing screen. Your saved block data is unchanged. Safe to update.

= 1.14.0 =
No change to what you see in the editor. Safe to update.

= 1.13.0 =
Faster block load; same experience. Safe to update.

= 1.9.0 =
Smarter retries, faster repeat layouts, fewer failures. Safe to update.

= 1.6.0 =
Developer APIs and REST config for custom styles and integrations. Editor unchanged for most sites. Safe to update.

= 1.5.0 =
Gentler first-run tour and welcome page for new installs. Safe to update.

= 1.4.0 =
Release notice after update; privacy guide wording. Safe to update.

= 1.3.0 =
Behind-the-scenes quality only. Safe to update.

= 1.2.0 =
Layouts match your theme better — less cleanup after you pick a style. Safe to update.

= 1.1.0 =
Clearer browsing UI and WP 6.9 validation fix. Safe to update.
