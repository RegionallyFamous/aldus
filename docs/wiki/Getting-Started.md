# Getting Started

## Requirements

Before you install Aldus, make sure you have:

- **WordPress 6.2 or later** — Aldus uses the block editor exclusively
- **A WebGPU-capable browser** — required to run the layout model locally
  - Chrome 113 or later (recommended)
  - Edge 113 or later
  - Safari 18 or later (macOS / iOS)
  - Firefox does not yet support WebGPU
- **~200 MB of available browser cache** — the model downloads once and is cached permanently; subsequent uses are instant
- **No API key.** No account. No external service.

> If your browser does not support WebGPU, Aldus will still work — you can use the [Sample Packs](Sample-Packs) to preview all sixteen personalities without the model, and the plugin will tell you exactly which browser to switch to.

---

## Installation

### From a zip file

1. Download the latest `aldus-x.x.x.zip` from the [Releases page](../../releases)
2. In your WordPress dashboard: **Plugins → Add New Plugin → Upload Plugin**
3. Choose the zip file and click **Install Now**
4. Click **Activate Plugin**

### Manual upload

Upload the unzipped `aldus` folder to `/wp-content/plugins/aldus/` via FTP or SFTP, then activate from **Plugins → Installed Plugins**.

---

## Adding the block

1. Open any post or page in the block editor
2. Click the **+** button to add a block (or press `/` to open the quick inserter)
3. Search for **Aldus** and select it

The Aldus block appears as a full-width workspace with a content input area.

---

## Your first layout

### Step 1: Add some content

When the Aldus block is empty, the first thing you see is a grid of content type buttons — **Headline, Paragraph, Image, Quote, Button**, and more. Click a type to add that piece of content. A text field (or image picker, depending on the type) opens immediately so you can enter your content.

You need at least one piece of content to generate layouts. A good starting point for a blog post is:
- 1 Headline
- 2 Paragraphs
- 1 Image
- 1 Button

**Shortcuts to skip the manual entry:**

- If your post already has a title, a **"Use '[title]' as headline"** button appears below the type grid — one click adds your post title as a Headline item.
- If your post already contains blocks, an **Import content from this page** button appears — Aldus reads the headings and paragraphs from those blocks and offers them as importable items.
- For common content structures, click one of the **Quick Start preset** text links (Blog post · Landing page · Feature story · Product pitch) that appear in the empty state. The preset fills in the content types automatically — you then fill in your actual text and images.

Once you've added your first item, style chips and the **Make it happen** button appear below the content list.

### Step 2: Run Aldus

Click **Make it happen** (or press `⌘↵` on Mac / `Ctrl↵` on Windows).

The first time you run Aldus, it will download the layout model (~200 MB). This happens once — after that, it loads from your browser cache in seconds. A progress bar shows the download status.

Once the model is ready, Aldus generates a proposed layout for each of the sixteen personalities simultaneously.

### Step 3: Choose a layout

The results screen shows sixteen cards, one per personality. Each card displays:
- The personality name
- A wireframe thumbnail of the proposed layout
- A token strip showing the section sequence (e.g. `cover:dark → pullquote → columns → cta`)

**Choosing from the grid:** Hover any card to reveal the **Use this one** button at the bottom. Click it to insert that layout immediately.

**Expanding a card:** Click the eye icon (👁) in the top-right corner of any card to open a full-size block preview. From there you can still click **Use this one** to insert it.

**Footer actions:** Each card footer contains three compact icon buttons — re-roll (↺), copy blocks to clipboard, and "Try with my content" (swap icon). These let you regenerate, export, or pin a personality without inserting the layout.

### Step 4: Edit as usual

Aldus replaces itself with standard WordPress blocks. Everything it inserts is fully editable — just like blocks you placed yourself.

By default, Aldus automatically locks the structural container blocks (Groups, Columns, Covers) to **content-only editing mode** after insertion. This means you can edit all text, images, and links freely, but can't accidentally drag or delete a layout container. A snackbar at the bottom of the editor lets you **Unlock structure** if you want full access, or **Undo** the entire insertion.

**Want to keep the Aldus block around?** Enable **Persistent wrapper** in the **Insertion mode** panel in the block sidebar before generating. In this mode, the generated blocks become inner blocks inside the Aldus container — and a toolbar lets you **Redesign** (pick a new layout any time) or **Detach** (remove the Aldus wrapper and leave plain blocks). See [Features → Persistent Wrapper Mode](Features#persistent-wrapper-mode) for details.

**Already have blocks?** Select any two or more blocks, click **Transform** in the block toolbar, and choose **Aldus**. Your existing blocks are imported as content items and generation starts automatically. See [Features → Transform to Aldus](Features#transform-to-aldus).

---

## Trying without your own content

If you just want to see what Aldus looks like, use a **Sample Pack**:

1. Click the **Try a sample** link in the empty block state, or open the **Pack Previews** panel in the block sidebar
2. Choose one of the seven themed packs (Roast, Meridian, Hearth, Plume, Grove, Loot, Signal)
3. Aldus fills in sample content for that industry and shows all personalities instantly — no model download needed

See [Sample Packs](Sample-Packs) for details on each pack.

---

## Keyboard shortcuts

| Action | Mac | Windows / Linux |
|---|---|---|
| Generate layouts | `⌘↵` | `Ctrl↵` |
| Cancel / start over | `Esc` | `Esc` |
| Regenerate (results screen) | `⇧⌘R` | `Ctrl⇧R` |
