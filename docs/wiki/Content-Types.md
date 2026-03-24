# Content Types

Aldus accepts ten types of content. You add them in the block's input area before generating layouts. The types you add — and how many of each — directly shape what the model proposes.

You don't need every type for every layout. Start with what you have. The completeness hints (the colored pills at the bottom of the content area) will tell you when adding a certain type would unlock more layout options.

---

## Headline

**The big, bold title.**

Your main page or article heading. Most personalities will place this at or near the top of the layout — sometimes inside a cover section, sometimes as a standalone H1.

- Use it for: page title, article name, campaign slogan, product name
- One headline is usually enough; add a second if you have a meaningful subheading that functions as a secondary title
- Kept short and punchy, headlines work best in full-bleed cover sections

---

## Subheading

**A section header.**

A secondary heading used to introduce different parts of your content. Personalities use subheadings to label columns, lead media-text panels, or introduce content sections.

- Use it for: section titles, feature names, step labels, column labels
- Multiple subheadings are welcome — the model distributes them across sections
- In asymmetric column layouts (like Folio), subheadings serve as the narrow left-column labels

---

## Paragraph

**Your body copy.**

The main written content of your page. You can add multiple paragraphs; the model assigns them to different sections based on the layout it chooses.

- Use it for: article body, product descriptions, feature explanations, about text
- Aim for 2–5 sentences per paragraph — very long blocks may get truncated in some sections
- Adding two or more paragraphs unlocks two-column layouts and side-by-side panels
- The first paragraph in some personalities gets a decorative drop cap

---

## Quote

**A line worth highlighting.**

A short, punchy statement that deserves visual emphasis. Quotes appear in pullquote sections, quote blocks, and side-by-side panels.

- Use it for: testimonials, key statistics, memorable lines, mission statements
- Keep it short — one or two sentences works best as a pullquote
- Adding an attributed quote (with a `—` citation) unlocks the `quote:attributed` token, which renders with the attribution line
- You can add multiple quotes; the model places them in different pullquote positions

---

## Image

**A photo or graphic.**

Add an image by URL or by selecting from your media library. Images appear in cover sections, media-text panels, image blocks, and gallery grids depending on the personality.

- Use it for: hero photos, product images, illustrations, team portraits
- Provide a full URL or use the media picker to select from your library
- Adding an image is required for personalities that anchor on `cover:split`, `media-text:left`, `media-text:right`, `image:wide`, or `image:full`
- If no image is provided, image-dependent sections fall back to a color-filled placeholder

---

## Button

**A link that pops.**

A call-to-action button with a label and a URL. Buttons appear in CTA sections, cover overlays, and accent groups — always as a visually distinct, clickable element.

- Use it for: "Get started", "Learn more", "Buy now", "Contact us", "Sign up"
- Enter the button label in the text field and the destination URL in the URL field
- Most personalities end with a `buttons:cta` section — if you don't add a button, that section won't appear
- You can add multiple buttons; the model picks the most relevant one for each CTA section

---

## List

**Bullet points.**

A set of items, one per line. Lists appear as formatted bullet lists, feature grids, or structured columns depending on the layout.

- Use it for: features, benefits, steps, ingredients, agenda items, FAQ answers
- Enter one item per line in the textarea
- Lists pair well with the Tribune, Broadsheet, and Ledger personalities
- Adding a list alongside columns can trigger feature-grid layouts (three or four equal columns with a list item in each)

---

## Video

**A video or embed.**

A YouTube or Vimeo URL. Videos appear in dedicated video sections — either as a full-width hero embed or as a smaller embedded section within the page.

- Use it for: product demos, trailers, interviews, tutorials, event recordings
- Paste the full video URL (e.g. `https://www.youtube.com/watch?v=...`)
- Video sections use the `video:hero` and `video:section` tokens
- If the personality doesn't include video tokens, the video won't appear in that layout

---

## Table

**Structured data.**

A table defined in CSV format — column headers on the first line, rows below. Renders as a formatted `core/table` block.

- Use it for: pricing tables, comparison grids, specs, schedules, data summaries
- Format: `Header 1, Header 2` on line one, then `Value A, Value B` for each row
- Keep tables focused — 2–5 columns, up to 8–10 rows work well visually
- Tables appear via the `table:data` token; most personalities don't include this token by default, so it's best used with personalities that are explicitly content-rich

---

## Gallery

**A grid of images.**

Multiple images arranged in a gallery grid. Select images from your media library to build a two-column or three-column gallery.

- Use it for: portfolio grids, product shots, event photos, team photos, case study images
- Add multiple images using the media picker; they are displayed in the order you add them
- Gallery sections use the `gallery:2-col` and `gallery:3-col` tokens
- The **Mosaic** and **Prism** personalities are designed specifically for gallery-heavy content and anchor their layouts on gallery sections

---

## How the model uses your content

Aldus never sends your text to any external server. The model receives only a **manifest** — a count of each content type you've added (e.g. "2 paragraphs, 1 image, 1 button") along with word-count averages. Your actual words stay in the browser until the PHP assembly step, which runs on your own server.

The richer your content mix, the more layout options the model can propose. If you only add a headline, the model will still produce layouts — but adding a paragraph, an image, and a button opens up significantly more diverse results.
