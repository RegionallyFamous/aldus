# Features

This page covers every tool and control Aldus provides beyond the basic generate-and-insert flow.

---

## Style Notes

Style Notes let you give the model a creative direction before generating layouts. Instead of changing your content, you're changing the model's aesthetic brief.

Style chips and the freeform note field appear in the building area automatically once you have at least one content item — they're hidden on the empty state to keep the first-use experience focused.

**How to use it:**
1. Add at least one content item
2. Click one or more style chips that appear below the content list, or write a freeform note in the text field

**Available chips:**

| Chip | What it signals |
|---|---|
| Image-forward | Prefer tokens that use images prominently |
| Text-heavy | More paragraphs and headings, fewer visual sections |
| Minimal | Keep the layout lean; avoid busy multi-column sections |
| Bold CTA | Prioritize the CTA section; give it more visual weight |
| Dark mood | Prefer dark backgrounds, dramatic contrast |
| Magazine | Lean into editorial asymmetry and typographic structure |

Chips and freeform text can be combined. Style Notes affect all personalities — each one interprets the note according to its own visual voice, so results will differ.

---

## Per-card Re-Roll

If you like a personality's general direction but not the specific layout it proposed, you can regenerate just that one personality without touching the others.

**How to use it:**
On the results screen, click the **Re-roll** icon (↺) in the card footer. The other fifteen cards stay as they are.

Each re-roll increments a counter that the model sees — so re-rolling multiple times produces increasingly diverse variations rather than repeating the same layout.

---

## Card footer actions

Each personality card has a row of compact icon buttons in its footer:

| Icon | Action |
|---|---|
| ↺ Re-roll | Regenerate just this personality |
| Clipboard | Copy this layout's blocks to the clipboard for pasting elsewhere |
| Swap arrows | Try with my content — preview this personality using your own content items instead of the sample pack |

These actions are available on all cards, including Sample Pack preview results.

---

## Expand preview

A small eye icon appears in the top-right corner of each card's preview area. It is faintly visible by default and becomes fully opaque when you hover the card. Clicking it opens a full-size block preview of that layout without leaving the results grid.

To insert the layout after expanding, click **Use this one** in the expanded view.

---

## Mix & Match

Mix & Match lets you pick the best sections from different personalities and combine them into a single custom layout.

**How to use it:**
1. On the results screen, click **Mix & Match** (or the blend icon)
2. The mixing screen shows your layout section by section
3. For each section (token position), Aldus shows which personality's version you're currently using
4. Click **Swap** on any section to cycle through alternatives from other personalities
5. When you're happy with the combination, click **Insert this mix**

Mix & Match is especially useful when one personality has the right opener but another has a better CTA section.

---

## Saved Sessions

Saved Sessions let you snapshot your current content and results so you can leave and come back later.

**How to use it:**

**Saving:** After generating layouts, click **Save session** (or the bookmark icon). Aldus saves your content items, style notes, and the current set of generated layouts as a named snapshot. You can save up to 10 sessions per block.

**Reloading:** Click the **Sessions** panel to see your saved snapshots. Each shows the session date, post context (if saved from a specific post), and a preview of the content. Click any session to reload it — your content and layouts are restored exactly as they were.

Sessions are stored in WordPress's block preferences store, tied to your user account. They persist across browser sessions and across devices (if you're logged into the same WordPress instance).

---

## Completeness Hints

As you add content, Aldus shows colored hint pills at the bottom of the content area. These hints tell you which content types would unlock new layout possibilities.

For example, if you have a headline and a paragraph but no image, a hint might read "Add an Image to unlock media layouts". Clicking the hint adds a placeholder for that content type so you can fill it in.

Hints are advisory — you can generate layouts without addressing them.

---

## Quick Start Presets

Instead of building your content list from scratch, you can load a preset that fills in a sensible content structure for a common use case.

**Available presets:**

| Preset | What it includes |
|---|---|
| Blog post | Headline · 2 Paragraphs · Image |
| Landing page | Headline · Subheading · Paragraph · Image · Button |
| Feature story | Headline · Quote · 2 Paragraphs · Image |
| Product pitch | Headline · Paragraph · List · Button |
| Portfolio | Headline · Paragraph · Gallery · Button |
| Tutorial | Headline · Intro · Code · Explanation · Image |
| Comparison | Headline · Table · Paragraph · Button |

Presets are shown as text links directly on the empty state screen — no need to open a sidebar panel. Click a preset name to instantly populate the content list with the appropriate content types, then fill in your actual text, images, and links.

---

## Pack Previews

Pack Previews let you see all layout styles with themed sample content — no model download required.

**How to use it:**
1. Open the **Pack Previews** panel in the block sidebar (or click **Try a sample** in the empty block state)
2. Choose one of the nine themed packs
3. Aldus instantly generates all layouts using the pack's content

You can browse the results, expand cards, and get a feel for each personality before using your own content.

Clicking the **swap-arrows** icon in a card's footer (labeled "Try with my content") pins that personality when you switch to your own content — useful if you already know which personality you want to use.

See [Sample Packs](Sample-Packs) for details on each pack.

---

## Keyboard Shortcuts

| Action | Mac | Windows / Linux | Available when |
|---|---|---|---|
| Generate layouts | `⌘↵` | `Ctrl↵` | Content input, at least one item |
| Cancel / start over | `Esc` | `Esc` | Loading, results, or error state |
| Regenerate all | `⇧⌘R` | `Ctrl⇧R` | Results screen only |

---

## Toolbar controls

When Aldus is in the results or loading state, the block toolbar shows:

- **Regenerate** — run the model again with the same content
- **Start fresh** — clear everything and return to the content input

The **How Aldus works** button (question mark icon) in the toolbar is always available and opens a brief explanation of the model, privacy, and the generate-and-insert flow.

---

## Personalities panel (block sidebar)

Open the **Personalities** panel in the Inspector Controls sidebar to:

- **Enable / disable personalities** using the multi-select token field — disabled personalities are skipped during generation
- **View personality tips** — each personality has a tooltip describing its visual voice and ideal use case
- **Browse theme palette swatches** — Aldus shows the colors it will use from your active theme so you can anticipate how sections will look

Your personality selection is saved as a block attribute and persists across sessions.

---

## Content import

If you have existing copy in your WordPress editor, you can pull it into Aldus without retyping:

- **Use post title as headline** — appears in the empty state if the post has a title. Adds the title as a Headline content item in one click.
- **Import content from this page** — appears in the empty state when other blocks exist on the post. Aldus reads the headings and paragraphs from those blocks and offers them as importable items.

Both options appear below a divider in the empty state, beneath the content type buttons, as secondary paths for users who already have copy in the editor.

---

## Post context

When you generate layouts from inside a post, Aldus can read the post title, post type, and excerpt to improve the model's layout decisions. This is done automatically — no action needed. The post context is part of the manifest that shapes the token sequence without exposing your actual content text to any external server.

---

## Transform to Aldus

If you already have blocks on your page — a heading, a paragraph, an image — you can convert them directly into Aldus content items without starting over.

**How to use it:**
1. Select two or more blocks in the editor (shift-click or drag-select)
2. Open the block toolbar and click **Transform** → **Aldus**
3. The selected blocks are converted into Aldus content items and generation begins automatically

Aldus extracts what it can from each block: text from headings and paragraphs becomes Headline, Subheading, or Paragraph items; image URLs become Image items; list content becomes a List item; quote text becomes a Quote item; and so on.

After the transform, generation starts automatically after a 300 ms delay — you go straight from "I have blocks" to seeing all layouts without any extra clicks.

---

## Content-Only Structure Lock

After you pick a layout and insert it, Aldus automatically locks the structural container blocks — Groups, Columns, Covers, and Media-Text panels — to **content-only editing mode**. This means you can freely edit all text, swap images, and change links without accidentally dragging, deleting, or rearranging the layout structure.

A snackbar notice appears at the bottom of the editor with two actions:

| Action | What it does |
|---|---|
| **Unlock structure** | Removes the lock and restores full editing on all containers |
| **Undo** | Reverts the entire insertion via the editor's undo stack |

The lock applies only to container blocks — individual paragraph, heading, image, and button blocks inside them are always fully editable.

---

## Persistent Wrapper Mode

By default, Aldus replaces itself with plain WordPress blocks after you pick a layout. In **Persistent Wrapper** mode, the blocks are inserted *inside* the Aldus block instead — it stays in the editor tree as a named container, and you can redesign or swap personalities at any time without losing your content.

**How to enable it:**

Open the **Insertion mode** panel in the block sidebar (Inspector Controls) and toggle **Persistent wrapper** on before generating.

**After insertion in wrapper mode:**

The editor shows the generated blocks inline and editable. A toolbar appears on the Aldus block with two buttons:

| Button | What it does |
|---|---|
| **Redesign with Aldus** | Returns to the results screen so you can pick a different personality |
| **Detach from Aldus** | Removes the Aldus wrapper and leaves the blocks in place as plain blocks |

On the front end, the wrapper renders as `<div class="aldus-layout" data-personality="[name]">` — a transparent container that carries no visual weight (`display: contents`).

---

## Block Style Variations

Every personality you see in Aldus is also available as a **named block style** for core blocks site-wide. Select any Cover, Group, Pullquote, or Columns block, open the **Styles** panel (the paintbrush icon), and you'll find six Aldus personality styles to apply:

| Style | Visual character |
|---|---|
| Aldus: Dispatch | High-contrast dark background, bold weight headings, urgent press energy |
| Aldus: Folio | Left border accent, editorial asymmetry, generous whitespace |
| Aldus: Nocturne | Near-black background, muted light text, cinematic atmosphere |
| Aldus: Codex | Restrained max-width container, light heading weight, typographic calm |
| Aldus: Solstice | Warm off-white surface, clean radius, luminous minimal feel |
| Aldus: Dusk | Deep gradient background (navy to teal), atmospheric dark palette |

These styles are registered globally — they work on any Cover or Group block on your site, whether it was created by Aldus or manually.

---

## Layout Intelligence

Starting in 1.10.0, Aldus runs additional lightweight inference passes before and after the main token generation to provide smarter context.

### Style detection

Before generating, Aldus reads your content manifest and infers a suggested style direction — for example "text-heavy editorial" or "minimal product". This auto-style is prepended to your Style Notes and influences the token sequence. A small hint line appears at the top of the results screen showing what Aldus detected.

### Personality recommendations

Based on your content mix, Aldus identifies the three personalities most likely to produce a complete layout. These are marked with a **Recommended** badge in the Personalities panel sidebar.

### Content coverage badges

After generation, each personality card shows an amber badge if any of your content items will not appear in that layout — for example "1 item unused". This tells you before insertion which layouts make full use of your content.

### Layout narration

Each personality card shows a dynamic description of the actual layout that was generated for your content, rather than a static tagline. The description reflects the real token sequence — "Your headline opens as a dark hero, followed by a full-bleed image, then a pullquote surfaces your quote."

### Content hints

While the model is loading, Aldus may display dismissible hint pills if it detects content that is likely to cause problems — for example a headline that is too long for cover sections, or no image when image-dependent layouts would benefit from one. These are advisory; you can dismiss them and generate anyway.

---

## Front-End Animations

Layouts generated by personalities that use the `parallax`, `reveal`, or `countup` interactivity styles include subtle front-end animations powered by the WordPress Interactivity API (WP 6.5+). No JavaScript library is required — the animations use a small native Script Module loaded only on pages containing Aldus-generated blocks.

| Effect | Where it appears | Personalities |
|---|---|---|
| Parallax | Cover block backgrounds shift at 15% of scroll speed | Dispatch, Nocturne, Dusk, Manifesto |
| Reveal on scroll | Full-width sections fade in and translate up as they enter the viewport | Most personalities |
| Count-up | Stat numbers in `row:stats` sections animate from 0 to their final value | Tribune |
| Accordion | Details/accordion blocks animate open and close with a smooth max-height transition | All personalities |

Animations respect the user's `prefers-reduced-motion` preference — all transitions are disabled for users who have requested reduced motion in their operating system settings.
