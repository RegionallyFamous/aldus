# Personalities

Aldus ships with sixteen named layout personalities. Each one has a distinct visual voice, a set of layout anchors it always uses, and a range of supporting sections it can draw from depending on your content.

When you click **Make it happen**, Aldus runs every enabled personality simultaneously and shows you one layout card per personality. You can disable personalities you never use from the block sidebar's **Personalities** panel.

---

## Understanding anchor tokens

Each personality has **anchor tokens** — the layout sections that define its identity. No matter what content you provide, the model always includes these sections in the output. The remaining sections are chosen based on your content mix, the personality's style rules, and a small amount of randomness.

A personality with `creativity: strict` locks its anchors at the start of the sequence. A personality with `creativity: loose` allows anchors to appear anywhere — the model has more freedom to improvise.

---

## The sixteen personalities

### Dispatch

> Breaking-news urgency. Dark full-bleed opener, a statement pullquote that owns the page, then evidence and action.

**Anchors:** `cover:dark` · `pullquote:full-solid` · `buttons:cta`

**Style:** High contrast. Dense. Authoritative. The dark cover commands attention immediately. The solid pullquote breaks the content like a banner headline. Everything builds to a decisive call to action.

**Best for:** News articles, announcements, campaign launches, anything with a strong opening statement.

**Needs:** A headline (for the cover), a quote (for the pullquote), a button (for the CTA). Paragraphs and images amplify.

---

### Folio

> Classic asymmetric editorial. Every section labeled left, body text right, like a magazine feature spread.

**Anchors:** `columns:28-72` · `pullquote:wide`

**Style:** Disciplined. Elegant. Literary. The narrow left column acts as a label or caption; the wide right column holds the substance. Feels like a high-end print publication translated to the web.

**Best for:** Long-form articles, essays, case studies, editorial content.

**Needs:** Multiple paragraphs and subheadings work best. A quote becomes a wide pullquote that punctuates the reading experience.

---

### Stratum

> Three full-width bands of dark, light, and accent — the page as landscape, content buried in strata.

**Anchors:** `group:dark-full` · `group:light-full` · `group:accent-full`

**Style:** Geological. Layered. Each color band is a distinct section. The rhythm of dark-light-accent creates visual breathing room without any explicit structure.

**Best for:** Brand pages, campaign microsites, product overviews with distinct sections.

**Needs:** At least three content pieces to fill the three bands. Images work well inside dark and accent sections.

---

### Broadside

> Cinematic alternating image-text panels with a punchy CTA cut-in, like a Stripe product page.

**Anchors:** `media-text:left` · `media-text:right` · `group:accent-full`

**Style:** Product-page confidence. The left-right alternation creates momentum. The accent group delivers a conversion moment in the middle of the scroll. Feels purposeful and modern.

**Best for:** Product pages, feature showcases, service descriptions, SaaS landing pages.

**Needs:** Images are essential — without them, media-text panels render as text-only blocks. A button completes the CTA section.

---

### Manifesto

> Starts silent with a raw H1 and separator, then erupts into a full-dark declaration, then triptych columns.

**Anchors:** `heading:h1` · `group:dark-full` · `columns:3-equal`

**Style:** Declarative. Confident. The opening H1 stands alone with nothing but a separator. The dark group feels like a statement of intent. The three-column section delivers the substance in parallel.

**Best for:** About pages, brand manifestos, company values, bold mission statements.

**Needs:** A strong headline. Multiple paragraphs or subheadings fill the columns. A quote works well in the dark section.

---

### Nocturne

> Dark cover bleeds into full-bleed image, then the content surfaces into light. Maximum chiaroscuro.

**Anchors:** `cover:dark` · `image:full`

**Style:** Dramatic contrast. The page opens in darkness, passes through a full-bleed image, then arrives in light. Feels like a film sequence.

**Best for:** Photography portfolios, editorial features, cultural content, moody brand pages.

**Needs:** An image is required for the full-bleed section. A dark cover headline and body paragraphs set the tone.

---

### Tribune

> Three-column opener like a newspaper front page, anchored by a bold pullquote that splits the page in two.

**Anchors:** `columns:3-equal` · `pullquote:full-solid`

**Style:** Journalistic density. The three columns feel like a newspaper grid. The solid pullquote cuts across the full width like a banner. Dense with information but organized.

**Best for:** News sites, content hubs, editorial roundups, feature articles with multiple themes.

**Needs:** Multiple paragraphs or subheadings fill the three columns. A quote becomes the solid pullquote. A list works well as a column item.

---

### Overture

> A light cinematic cover builds to a media panel, then the accent section delivers the CTA like a curtain call.

**Anchors:** `cover:light` · `media-text:right` · `group:accent-full`

**Style:** Bright. Welcoming. Structured like a performance — opening, development, resolution. The light cover is inviting, the media panel adds depth, the accent section is the payoff.

**Best for:** Service pages, welcome pages, feature announcements, onboarding flows.

**Needs:** A light cover works best with a headline and subheading. An image powers the media panel. A button completes the accent CTA section.

---

### Codex

> Typographic restraint. Display headlines, kicker labels, editorial border-inset sections, generous white space.

**Anchors:** `heading:display` · `heading:kicker` · `group:border-box`

**Style:** Literary precision. No color fills, no photography — just type hierarchy and structure. The kicker label sits above the display headline. The border-inset group creates an editorial pull-out.

**Best for:** Essays, documentation, research articles, literary content, premium editorial.

**Needs:** A headline becomes the display heading. Subheadings become kickers. A quote or key paragraph goes in the border-box inset. Works beautifully with minimal content.

---

### Dusk

> A full-height split-screen opener bleeds into a gradient section. Cinematic atmosphere from the first pixel.

**Anchors:** `cover:split` · `group:gradient-full`

**Style:** Atmospheric. Immersive. The split-screen cover divides text and image across the full viewport height. The gradient section creates a warm, transitional moment.

**Best for:** Brand intros, portfolio openers, event pages, creative agency pages.

**Needs:** An image is required for the split-screen cover. A headline and subheading fill the text side. Paragraphs and a centered pullquote work well in the gradient section.

---

### Broadsheet

> Newspaper-grid density. Four equal columns, a centered pullquote that cleaves the page.

**Anchors:** `columns:4-equal` · `pullquote:centered`

**Style:** Information-dense. Tabloid-proportioned. The four equal columns hold maximum content in minimum vertical space. The centered pullquote is a pause in the scroll — a moment to breathe before continuing.

**Best for:** Content-heavy pages, news sites, feature roundups, documentation pages with multiple topics.

**Needs:** Four distinct content pieces fill the four columns well. A quote becomes the centered pullquote. A list is ideal for one of the column slots.

---

### Solstice

> Clean and luminous. Minimal color cover, two-column rhythm, nothing that doesn't need to be there.

**Anchors:** `cover:minimal` · `columns:2-equal`

**Style:** Restrained. Spacious. Every element is purposeful. The minimal cover is almost typographic — a headline with almost no decoration. The two-column sections create an easy reading rhythm.

**Best for:** Personal sites, portfolios, minimal brand pages, editorial content that trusts the words.

**Needs:** Works well with minimal content — a headline, a couple of paragraphs, and a button. Adding images and quotes adds warmth without disrupting the restraint.

---

### Mirage

> Gradient-drenched and lush. Where the split-screen cover and layered color sections converge into atmosphere.

**Anchors:** `group:gradient-full` · `pullquote:centered` · `cover:split`

**Style:** Rich. Evocative. Multiple gradient sections layer color across the page. The split-screen cover and centered pullquote reinforce a sense of visual depth. Nothing about this layout is quiet.

**Best for:** Creative brands, luxury products, immersive campaign pages, fashion or lifestyle content.

**Needs:** An image for the split-screen cover. Paragraphs fill the gradient sections. A quote becomes the centered pullquote. The more content you provide, the richer the result.

---

### Ledger

> Long-form essay or report structure. Two-column flow, attributed quote, editorial border-inset for the key section.

**Anchors:** `columns:2-equal` · `quote:attributed` · `group:border-box`

**Style:** Scholarly. Analytical. Looks like a well-typeset report or journal article. The attributed quote is cited with a name or source. The border-inset pulls out the most important section.

**Best for:** Whitepapers, research summaries, case studies, long-form essays, annual report-style content.

**Needs:** Multiple paragraphs. An attributed quote (include a `— Name` citation). Subheadings label the sections. Works with more content than most personalities.

---

### Mosaic

> Gallery-first. Images lead and dominate, text stays lean. Built for photographers and visual portfolios.

**Anchors:** `gallery:3-col` · `buttons:cta`

**Style:** Visual. Expansive. Images fill most of the vertical space; text is secondary — a headline here, a paragraph there. The three-column gallery grid is the hero section.

**Best for:** Photography portfolios, image-heavy product pages, visual case studies, creative work showcases.

**Needs:** Gallery images are essential — Mosaic is built around them. A headline and short paragraph provide context. A button completes the CTA.

---

### Prism

> Three equal columns open into a full gallery grid. Structure and imagery in dialogue.

**Anchors:** `columns:3-equal` · `gallery:3-col`

**Style:** Structured then visual. The three-column section provides organized, scannable content. The gallery grid then lets images take over. Two distinct modes — one for reading, one for seeing.

**Best for:** Agency work showcases, portfolio landing pages, product category pages with both features and imagery.

**Needs:** Three content pieces for the columns, and gallery images for the grid. An accent group and a button add a conversion moment.

---

## Enabling and disabling personalities

Open the block sidebar and find the **Personalities** panel. Use the multi-select field to enable or disable any personality. Disabled personalities are skipped during generation — useful if you always want a specific subset, or if certain layouts don't fit your site's aesthetic.

Your personality selection is saved per-block.

---

## Tips for better results

- **More content = more variety.** Each personality has more to work with and produces more differentiated layouts.
- **Match content to personality intent.** If you want Mosaic, add gallery images. If you want Codex, a strong headline and a well-written paragraph are enough.
- **Use Style Notes** to push results in a direction — "image-forward", "dark mood", "bold CTA". See [Features](Features) for details.
- **Re-roll individual personalities** if you like the direction but not the specific layout. See [Features](Features).
