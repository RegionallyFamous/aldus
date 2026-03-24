# Layout Tokens

Layout tokens are the building blocks Aldus uses to compose a page. When the model proposes a layout, it outputs a sequence of tokens — an ordered list of sections — for each personality. The PHP assembler then maps each token to real WordPress blocks.

You don't choose tokens yourself. The model chooses them based on your content mix, the active personality, and any Style Notes you've set. This page documents what each token renders, so you understand what you're looking at in the wireframe thumbnails and token strips.

---

## Token quick reference

| Token | Category | What it renders |
|---|---|---|
| `cover:dark` | Covers | Full-width dark cover with title overlay |
| `cover:light` | Covers | Full-width light cover with title overlay |
| `cover:minimal` | Covers | Clean, nearly decoration-free cover |
| `cover:split` | Covers | Half-image, half-text full-height cover |
| `columns:2-equal` | Columns | Two 50/50 side-by-side columns |
| `columns:28-72` | Columns | Narrow label column + wide body column |
| `columns:3-equal` | Columns | Three equal-width columns |
| `columns:4-equal` | Columns | Four equal-width columns |
| `media-text:left` | Media | Image left, text right panel |
| `media-text:right` | Media | Text left, image right panel |
| `group:dark-full` | Groups | Full-width dark background section |
| `group:light-full` | Groups | Full-width light background section |
| `group:accent-full` | Groups | Full-width theme accent color section |
| `group:border-box` | Groups | Bordered inset editorial box |
| `group:gradient-full` | Groups | Full-width theme gradient section |
| `pullquote:wide` | Pull Quotes | Wide-aligned pullquote |
| `pullquote:full-solid` | Pull Quotes | Full-width solid-background pullquote |
| `pullquote:centered` | Pull Quotes | Centered pullquote with large type |
| `heading:h1` | Headings | Standalone H1 heading |
| `heading:h2` | Headings | Standalone H2 heading |
| `heading:h3` | Headings | Standalone H3 heading |
| `heading:display` | Headings | Extra-large display-style heading |
| `heading:kicker` | Headings | Small uppercase kicker label |
| `paragraph` | Paragraphs | Standard paragraph block |
| `paragraph:dropcap` | Paragraphs | Paragraph with decorative drop cap |
| `image:wide` | Images | Wide-aligned image |
| `image:full` | Images | Full-width edge-to-edge image |
| `quote` | Quotes | Standard blockquote |
| `quote:attributed` | Quotes | Blockquote with attribution line |
| `list` | Structure | Bulleted list |
| `separator` | Structure | Horizontal rule / divider |
| `spacer:small` | Structure | Small vertical space |
| `spacer:large` | Structure | Large vertical space |
| `spacer:xlarge` | Structure | Extra-large vertical space |
| `buttons:cta` | Structure | Call-to-action button section |
| `video:hero` | Video | Full-width hero video embed |
| `video:section` | Video | Standard embedded video section |
| `table:data` | Table | Formatted data table |
| `gallery:2-col` | Gallery | Two-column image grid |
| `gallery:3-col` | Gallery | Three-column image grid |

---

## Covers

### `cover:dark`

A `core/cover` block set to full width with a dark overlay color from your theme palette. Renders the headline as the cover title, optionally with a subheading and a CTA button layered on top.

The overlay color uses your theme's "darkest" palette color, so it adapts to different themes. Content is centered or positioned based on the personality's style rules.

**Needs:** Headline. Optionally: subheading, button, image (as the background).

---

### `cover:light`

Same structure as `cover:dark` but uses a light theme color for the overlay. Creates a bright, welcoming opener rather than a dramatic one.

**Needs:** Headline. Optionally: subheading, button, image.

---

### `cover:minimal`

A `core/cover` block with minimal or no overlay — the cover relies on typography rather than color. Looks closer to a typographic banner than a cinematic cover.

**Needs:** Headline. Works well with almost no imagery.

---

### `cover:split`

A `core/media-text` block set to full width and minimum 600px height with `imageFill: true`. The left half is a full-bleed image background; the right half holds text content. Creates a bold, full-viewport split.

**Needs:** An image is strongly recommended — without one the left side renders as a color placeholder. Headline and subheading fill the text side.

---

## Columns

### `columns:2-equal`

Two `core/column` blocks at 50% width each, side by side. Has multiple layout variants — depending on content and personality style, this can render as: heading + paragraph pairs in each column; heading in one column and a list in the other; a quote on the left and a paragraph on the right; or an image on one side.

**Needs:** At least two content pieces (two paragraphs, or a heading + paragraph, etc.).

---

### `columns:28-72`

The signature Folio layout: a narrow 28% column on the left and a wide 72% column on the right. The narrow column typically holds a label (subheading or image) while the wide column holds body text.

**Needs:** Works best with a subheading (for the narrow label column) and a paragraph (for the wide body column).

---

### `columns:3-equal`

Three equal-width `core/column` blocks, each with a background color from your theme palette. Typically renders with a subheading and paragraph in each column. Good for feature trios, step-by-step sections, or any "three things" structure.

**Needs:** Three paragraphs or subheadings work best.

---

### `columns:4-equal`

Four equal-width `core/column` blocks, each with a background color. Ideal for brief, scannable content: stats, features, quick facts. Each column typically holds a subheading or a short paragraph.

**Needs:** Four content pieces. Works best with short, punchy content in each slot.

---

## Media

### `media-text:left`

A `core/media-text` block with the image on the left and text on the right (38/62 split). Has four layout variants based on available content: default (heading + paragraph); quote alongside image; heading + CTA button; heading + bullet list.

**Needs:** An image. A headline or subheading. Optionally a paragraph, quote, list, or button.

---

### `media-text:right`

Same as `media-text:left` but mirrored — image on the right, text on the left. Alternating `media-text:left` and `media-text:right` creates the classic "Broadside" product-page rhythm.

**Needs:** Same as `media-text:left`.

---

## Groups

### `group:dark-full`

A full-width `core/group` block with a dark theme background color. Renders heading, paragraph, list, and button content on a dark background. Uses constrained layout to keep text readable width.

**Needs:** Any combination of headline, subheading, paragraph, list, and button.

---

### `group:light-full`

Same structure as `group:dark-full` with a light theme color. Creates contrast when paired with a dark section.

---

### `group:accent-full`

Full-width group using the theme's accent color. Often used as the CTA section — a visually distinct moment that prompts action. The button in this section uses the accent color's contrast color (typically white) for maximum legibility.

**Needs:** Works best with a heading, a short paragraph, and a button.

---

### `group:border-box`

A `core/group` block with a 2px solid border and generous padding — no background fill. Creates an editorial inset effect that highlights a key section of content. Has two variants: default (heading + paragraph + quote) and dense (heading + paragraph + list + CTA).

**Needs:** Heading or subheading, paragraph. A quote in the default variant.

---

### `group:gradient-full`

Full-width group using a theme gradient rather than a solid color. Creates atmospheric visual richness. Has two variants: default content section and testimonial (centered quote + attribution + CTA).

**Needs:** Any content. Quote + attribution works especially well in the testimonial variant.

---

## Pull Quotes

### `pullquote:wide`

A `core/pullquote` block aligned wide. The quote text is displayed large within the column content width but with extra horizontal emphasis. Less imposing than `pullquote:full-solid`.

**Needs:** A quote item.

---

### `pullquote:full-solid`

A full-width `core/pullquote` block with a solid background color. Cuts dramatically across the full page width. The signature section of Dispatch and Tribune.

**Needs:** A quote item.

---

### `pullquote:centered`

A `core/pullquote` centered in the content width with enlarged type. More refined than full-solid — suited to editorial and atmospheric layouts.

**Needs:** A quote item.

---

## Headings

### `heading:h1`

A standalone `core/heading` block at H1 level. Used as a page-level title — often at the very top of the layout before a cover or group section.

### `heading:h2`

A standalone H2 heading. Used to introduce major sections.

### `heading:h3`

A standalone H3 heading. Used to introduce subsections or as a column label.

### `heading:display`

An H1-level heading rendered at a display size — larger than a standard H1, intended to be the most visually dominant element on the page. The signature heading of the Codex personality.

### `heading:kicker`

A small, uppercase, letter-spaced label — rendered as a styled H6. Sits above the main heading to provide context or category. Works like a magazine "section label" or a news "category tag".

---

## Paragraphs

### `paragraph`

A standard `core/paragraph` block. Plain body text.

### `paragraph:dropcap`

A `core/paragraph` block with `dropCap: true` — the first letter is rendered large and decorative. Used to open long-form sections in editorial personalities.

---

## Images

### `image:wide`

A `core/image` block aligned wide — extends beyond the text column width but does not reach the full viewport edge.

### `image:full`

A `core/image` block aligned full — full viewport width. Creates a dramatic, edge-to-edge visual break.

---

## Quotes

### `quote`

A standard `core/quote` block. Simple blockquote with a paragraph inside.

### `quote:attributed`

A `core/quote` block with a `cite` element — the quote text plus a `— Name` attribution line. Used in Ledger and other long-form editorial personalities.

---

## Structure

### `list`

A `core/list` block with `core/list-item` children. Items come from a List content type — one item per line.

### `separator`

A `core/separator` block. A horizontal rule that creates a visual pause between sections.

### `spacer:small`

A `core/spacer` with a small height (24px). Creates minimal breathing room.

### `spacer:large`

A `core/spacer` with a larger height (60px). Creates deliberate section spacing.

### `spacer:xlarge`

A `core/spacer` with extra-large height (120px). Creates dramatic section spacing for cinematic-feeling layouts.

### `buttons:cta`

A `core/buttons` block containing a single `core/button`. Renders the CTA button with the theme's accent background color. The button's label and URL come from your Button content type.

**Needs:** A button content item with a label and URL.

---

## Video

### `video:hero`

A `core/group` wrapping a `core/embed` block at full width. Renders the video as a large, prominent section.

### `video:section`

A `core/group` wrapping a `core/embed` block in a standard content-width section.

**Both need:** A Video content item with a YouTube or Vimeo URL.

---

## Table

### `table:data`

A `core/table` block rendered from CSV-formatted table content. Column headers are in the first row; data rows follow.

**Needs:** A Table content item in CSV format.

---

## Gallery

### `gallery:2-col`

A `core/gallery` block with two columns. Each image links to the full-size version.

### `gallery:3-col`

A `core/gallery` block with three columns. The defining section of Mosaic and Prism.

**Both need:** A Gallery content item with at least two images selected.

---

## Token sequences in the editor

After generation, each layout card shows a **token strip** below the personality name — a compressed visual recipe of the proposed sequence, for example:

```
cover:dark  →  pullquote  →  para:dropcap  →  image  →  group:accent  →  cta
```

This lets you compare layouts at a glance before clicking into any card.
