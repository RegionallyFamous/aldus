# Aldus

**Your content is great. Let Aldus make it look that way.**

Aldus is a single Gutenberg block that turns a list of content pieces into a fully-composed page layout — using a tiny AI model that runs entirely inside your browser, no account required, no API key, no data leaving your site.

You drop in a headline, a few paragraphs, maybe an image or a quote. You click **Make it happen**. Sixteen distinct layout personalities each propose a different layout for your content. You pick the one that feels right, hit **Use this one**, and Aldus replaces itself with clean, standards-compliant WordPress blocks.

That's it. No templates. No drag-and-drop. No theme builder. Just your content, composed.

---

## Sixteen ways to be interesting

Aldus ships with sixteen named layout personalities. Each one has a different visual voice and a different opinion about how your content should be arranged.

| Personality | Vibe |
|---|---|
| **Dispatch** | Breaking-news urgency. Dark full-bleed opener, a statement pullquote, then evidence and action. |
| **Folio** | Classic magazine spread. Every section labeled left, body text right, like a feature layout. |
| **Stratum** | The page as landscape. Dark, light, and accent bands stacked like geological strata. |
| **Broadside** | Cinematic product page energy. Alternating image-text panels, punchy CTA cut-in. |
| **Manifesto** | Starts quiet with a raw H1, then erupts into a full-dark declaration, then triptych columns. |
| **Nocturne** | Dark cover bleeds into full-bleed image, content surfaces into light. Maximum chiaroscuro. |
| **Tribune** | Newspaper front page. Three-column opener anchored by a bold pullquote that splits the page. |
| **Overture** | Light cinematic cover builds to a media panel, then the accent section delivers the curtain call. |
| **Codex** | Typographic restraint. Display headlines, kicker labels, editorial border-inset, white space. |
| **Dusk** | Full-height split-screen opener bleeds into a gradient section. Cinematic from the first pixel. |
| **Broadsheet** | Newspaper-grid density. Four equal columns, a centered pullquote that cleaves the page. |
| **Solstice** | Clean and luminous. Minimal color cover, two-column rhythm, nothing that doesn't need to be there. |
| **Mirage** | Gradient-drenched and lush. Split-screen cover, layered color sections, all atmosphere. |
| **Ledger** | Long-form essay structure. Two-column flow, attributed quote, editorial border-inset. |
| **Mosaic** | Gallery-first. Images lead and dominate. Built for photographers and visual portfolios. |
| **Prism** | Three equal columns open into a full gallery grid. Structure and imagery in dialogue. |

---

## How it works

**1. Add your content.**
Drop in a headline, paragraphs, images, quotes, bullet lists, buttons, videos, tables, or a gallery. You're describing what you have, not how it should look.

**2. The model picks a layout.**
A 360M-parameter model downloads once to your browser (~200 MB, cached forever). It reads a manifest of your content and outputs a token sequence — an ordered list of layout sections — for each personality. No words, no text, no personal data ever leave your site.

**3. You choose and insert.**
Browse the sixteen cards. Each shows a wireframe of the proposed layout. Click **Use this one** and Aldus replaces itself with real, editable WordPress blocks. You're done.

---

## What you get

- **16 layout personalities** — each with a distinct visual voice and layout logic
- **10 content types** — Headline, Subheading, Paragraph, Quote, Image, Button, List, Video, Table, Gallery
- **35+ layout tokens** — the building blocks each personality can use to compose a layout
- **In-browser AI** — WebLLM / WebGPU, runs locally, zero server calls
- **No API key, no account, no subscription**
- **9 themed sample packs** — try Aldus instantly without your own content (Roast, Meridian, Hearth, Plume, Grove, Forge, Bazaar, Rally, Slim)
- **Style Notes** — tell personalities to go image-forward, minimal, dark mood, bold CTA, and more
- **Per-card re-roll** — regenerate a single personality without touching the rest
- **Mix & Match** — pick the best sections from different personalities and combine them
- **Saved Sessions** — snapshot your content and results, reload them later
- **Quick Start presets** — Blog Post, Landing Page, Feature Story, Product Pitch to jump-start your input

---

## Requirements

- WordPress 6.2 or later
- A WebGPU-capable browser (Chrome 113+, Edge 113+, or a recent Safari Technology Preview)
- No API key. No account. No server LLM.

---

## Install

1. Download the latest release zip from [Releases](../../releases)
2. In WordPress: **Plugins → Add New → Upload Plugin**
3. Upload the zip, activate, done
4. Add an **Aldus** block to any post or page

Or via WP-CLI:
```bash
wp plugin install aldus --activate
```

---

## Documentation

Full docs are in the [Wiki](../../wiki):

- [Getting Started](../../wiki/Getting-Started)
- [Content Types](../../wiki/Content-Types)
- [Personalities](../../wiki/Personalities)
- [Layout Tokens](../../wiki/Tokens)
- [Features](../../wiki/Features)
- [Sample Packs](../../wiki/Sample-Packs)
- [FAQ & Troubleshooting](../../wiki/FAQ-and-Troubleshooting)

---

## License

GPL-2.0-or-later. See [LICENSE](LICENSE) for details.

Named after [Aldus Manutius](https://en.wikipedia.org/wiki/Aldus_Manutius) — the 15th-century Venetian printer who invented the paperback, the italic typeface, and the idea that beautiful typography should be affordable. He would have figured out Gutenberg by lunchtime.
