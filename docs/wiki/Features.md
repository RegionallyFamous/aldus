# Features

This page covers every tool and control Aldus provides beyond the basic generate-and-insert flow.

---

## Style Notes

Style Notes let you give the model a creative direction before generating layouts. Instead of changing your content, you're changing the model's aesthetic brief.

**How to use it:**
1. Open the **Style Notes** panel (click the paintbrush icon or scroll down in the input area)
2. Click one or more style chips, or write a freeform note in the text field

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
On the results screen, click the **Re-roll** icon on the personality card you want to regenerate. The other fifteen cards stay as they are.

Each re-roll increments a counter that the model sees — so re-rolling multiple times produces increasingly diverse variations rather than repeating the same layout.

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
| Blog Post | Headline, 2 Paragraphs, Image |
| Landing Page | Headline, Subheading, 2 Paragraphs, Image, Button |
| Feature Story | Headline, 2 Paragraphs, Quote, Image |
| Product Pitch | Headline, Subheading, Paragraph, List, Image, Button |

To use a preset, open the **Quick Start** panel in the block sidebar and click the preset name. Aldus populates the content input with the preset's content types — you then fill in your actual text, images, and links.

---

## Pack Previews

Pack Previews let you see all sixteen personalities with themed sample content — no model download required.

**How to use it:**
1. Open the **Pack Previews** panel in the block sidebar (or click **Try a sample** in the empty block state)
2. Choose one of the nine themed packs
3. Aldus instantly generates all sixteen layouts using the pack's content

You can browse the results, expand cards, and get a feel for each personality before using your own content.

Clicking **Try with my content** in the preview results pinned to that personality when you switch to your own content — useful if you already know which personality you want to use.

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

If you have existing copy in your WordPress editor, you can pull it into Aldus as content items using the **Import from post** option (available in the content input area when you're editing a post that already has blocks). Aldus reads the headings and paragraphs from other blocks on the same post and offers them as importable items.

---

## Post context

When you generate layouts from inside a post, Aldus can read the post title, post type, and excerpt to improve the model's layout decisions. This is done automatically — no action needed. The post context is part of the manifest that shapes the token sequence without exposing your actual content text to any external server.
