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

Click **+ Add content** to open the content input. Each piece of content has a type — choose the type that matches what you're adding (Headline, Paragraph, Image, etc.).

You need at least one piece of content to generate layouts. A good starting point for a blog post is:
- 1 Headline
- 2 Paragraphs
- 1 Image
- 1 Button

You can also use a **Quick Start preset** from the block sidebar. The presets fill in a sensible set of content types for common use cases (Blog Post, Landing Page, Feature Story, Product Pitch).

### Step 2: Run Aldus

Click **Make it happen** (or press `⌘↵` on Mac / `Ctrl↵` on Windows).

The first time you run Aldus, it will download the layout model (~200 MB). This happens once — after that, it loads from your browser cache in seconds. A progress bar shows the download status.

Once the model is ready, Aldus generates a proposed layout for each of the sixteen personalities simultaneously.

### Step 3: Choose a layout

The results screen shows sixteen cards, one per personality. Each card displays:
- The personality name
- A wireframe thumbnail of the proposed layout
- A token strip showing the section sequence (e.g. `cover:dark → pullquote → columns → cta`)

Click any card to expand it and see a full block preview. If you like what you see, click **Use this one** to insert the layout.

### Step 4: Edit as usual

Aldus replaces itself with standard WordPress blocks. Everything it inserts is fully editable — just like blocks you placed yourself. You can rearrange sections, change copy, swap images, adjust colors, and do anything else the block editor supports.

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
