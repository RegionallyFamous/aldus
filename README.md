# Aldus — Layout Explorer

**The block editor has everything a great page needs. What's missing is the design instinct — which blocks to combine, in what order, with what mood. Aldus brings that.**

You wrote a headline, three paragraphs, and a call to action. Right now they're sitting in a plain column. Aldus takes those same words and shows you how they'd look as a magazine spread, a dark cinematic landing page, a dense newspaper grid, a minimal essay — and a dozen more, all at once. Pick the one that fits and publish. It becomes real WordPress blocks you can edit, rearrange, or build on.

No page builder. No design skills. No lock-in.

---

## How it works

1. **Add what the page needs** — a headline, some paragraphs, an image, a quote, a button. Don't worry about order.
2. **Hit "Make it happen"** — Aldus arranges your content in 16 layout styles at once. Each one has its own structure and mood.
3. **Pick the one that fits** — it becomes real WordPress blocks. Fully editable. No plugin dependency.

The same content in **Dispatch** feels like breaking news. In **Nocturne** it's cinematic and dark. In **Folio** it reads like a magazine spread. Same words, different energy.

---

## What makes it different

**Everything runs in your browser.** The layout model (~200 MB, one-time download) runs locally via WebGPU. Nothing you write ever leaves your computer. No accounts, no API keys, no subscriptions, no external services.

**Your words stay yours.** The model never reads what you wrote — it only knows you have "2 paragraphs, 1 image, 1 quote." It decides which blocks go where. Your actual text goes in verbatim, untouched, exactly as you typed it.

**No proprietary markup.** All output is standard core blocks — Cover, Columns, Media & Text, Group, Pullquote, Heading, Paragraph, Image, Buttons. Deactivate Aldus and everything still renders.

---

## The 16 layout styles

| Style | What it does |
|---|---|
| **Dispatch** | Breaking-news urgency — dark full-bleed opener, bold pullquote, action |
| **Folio** | Label left, body right — every section reads like a magazine spread |
| **Stratum** | Dark, light, accent bands — the page as landscape |
| **Broadside** | Cinematic alternating image-text panels with a CTA cut right in |
| **Manifesto** | Quiet H1, then a dark declaration, then three columns erupt |
| **Nocturne** | Dark cover bleeds into a full image, then surfaces into light |
| **Tribune** | Newspaper front-page energy, split by a bold pullquote |
| **Overture** | Light cover builds to a reveal, accent section drops the curtain |
| **Codex** | Typographic restraint — display headline, kicker label, editorial inset |
| **Dusk** | Split-screen opener bleeds into gradient atmosphere |
| **Broadsheet** | Four-column newspaper density, cleaved by a centered pullquote |
| **Solstice** | Minimal cover, two-column rhythm, nothing superfluous |
| **Mirage** | Gradient-drenched and lush — cover and color in conversation |
| **Ledger** | Long-form essay structure — two columns, attributed quote, editorial inset |
| **Mosaic** | Gallery-first — images lead, text stays lean |
| **Prism** | Three columns open into a full gallery grid |

---

## Content types

Aldus accepts: **Headline**, **Subheading**, **Paragraph**, **Quote**, **Image**, **Button / CTA**, **List**, **Video**, **Table**, and **Gallery**.

---

## Features

**Pack Previews** — Not ready to add your own content? Pick from nine themed packs (Roast, Meridian, Hearth, Plume, Grove, Loot, Signal, Forge, Slim) to see how every style looks with real copy. No model download required.

**Style notes** — Add an optional instruction ("lead with the image", "minimal", "bold CTA") and the model steers toward it.

**Mix & match** — Combine sections from different styles into a single custom layout.

**Per-card re-roll** — Not feeling one card? Re-roll just that slot without losing the rest.

**Layout history** — Every layout you apply is saved. Scroll back, preview, restore any previous version.

**Style suggestions** — When the model is ready, Aldus suggests a style direction based on your content. One click to apply, one to dismiss.

**Recommendation badges** — Cards that best match your content mix get a "✦ Recommended" badge.

**Before/after compare** — See the new layout alongside your current page in a side-by-side modal.

**Saved sessions** — Bookmark your content set and reload it later.

**17 block patterns** — Hero, content, media, typography, and structural patterns, all theme-aware, available in the inserter under Patterns → Aldus.

**Developer APIs** — Register custom layout styles via `aldus_register_personality()`. REST config endpoint at `GET /aldus/v1/config`.

---

## Requirements

| | Minimum |
|---|---|
| WordPress | 6.4+ |
| PHP | 8.0+ |
| Browser | Chrome 113+, Edge 113+, or Safari 18+ (WebGPU required) |

Pack Previews work in any browser.

---

## Installation

1. Upload the `aldus` folder to `/wp-content/plugins/`.
2. Activate in **Plugins → Installed Plugins**.
3. Open any post or page in the block editor.
4. Insert the **Aldus** block from the inserter.
5. Add your content and click **Make it happen**.

The first run downloads the layout model (~200 MB). It's cached in your browser and reused every time after that. To skip the download and explore layouts instantly, use a Pack Preview.

---

## FAQ

**Does it require an account or subscription?**
No. Aldus runs entirely in the browser. No accounts, no API keys, no external services.

**Does it need an internet connection?**
Only for the first model download. After that, Aldus works fully offline.

**Does Aldus rewrite my content?**
Never. The model only sees content types ("2 paragraphs, 1 image") — not what you wrote. Your text is inserted verbatim.

**What happens after I pick a layout?**
It becomes real WordPress blocks inside an Aldus wrapper. Edit freely. Click "Redesign" anytime to try a different style. Click "Detach from Aldus" to remove the wrapper entirely — the blocks stay.

**Can I have multiple Aldus blocks on one page?**
One at a time. Aldus is a composition tool, not a repeatable widget.

**Where is my content saved?**
In block attributes and post meta. It survives page reloads and editor sessions. This is what powers Redesign — you can try new styles without re-entering content.

---

## Privacy

Aldus runs its layout model entirely within your browser using WebGPU. No content is transmitted to any external AI service. Your content items are sent to your own WordPress site's REST API for block assembly — the data never leaves your server. The model file is downloaded once from a public CDN (huggingface.co) and cached in your browser's storage. No account or API key is required.

---

## For developers

**Custom layout styles:** Register new styles with `aldus_register_personality()`. See `HOOKS.md` for the full API.

**REST endpoints:**
- `POST /aldus/v1/assemble` — assemble a layout from content items + tokens
- `POST /aldus/v1/record-use` — record a layout choice (analytics)
- `GET /aldus/v1/config` — all available styles, theme settings, version info
- `GET /aldus/v1/health` — plugin version, PHP/WP versions, object cache status, error rates

**Hooks and filters:**
- `aldus_tokens_before_render` — modify the token sequence before rendering
- `aldus_assembled_blocks` — modify the final block markup
- `aldus.personalities` (JS) — filter the personality list on the client
- `aldus.layout_chosen` / `aldus.layoutInserted` (JS) — react to layout events

**Debug mode:** Set `window.aldusDebug = true` in the browser console for verbose logging, including per-personality assembly timing.

---

## Credits

Aldus is named after [Aldus Manutius](https://en.wikipedia.org/wiki/Aldus_Manutius) — the 15th-century Venetian printer who invented italic type and shaped the modern page.

Built by [Regionally Famous](https://regionallyfamous.com).

---

## License

GPLv2 or later. See [LICENSE](https://www.gnu.org/licenses/gpl-2.0.html).
