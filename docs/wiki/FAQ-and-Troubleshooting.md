# FAQ & Troubleshooting

---

## General questions

### What is Aldus?

Aldus is a single WordPress block that composes your content into a fully-laid-out page. You add content pieces (headlines, paragraphs, images, quotes, buttons, etc.), and Aldus generates sixteen different layout proposals — one per named personality — using a small AI model that runs entirely in your browser.

You pick the layout you like, click **Use this one**, and Aldus replaces itself with standard WordPress blocks.

### Does Aldus require an API key or account?

No. Aldus runs a local AI model inside your browser using WebGPU. There is no external service, no API key, and no account of any kind.

### What does Aldus output?

Standard WordPress core blocks: `core/cover`, `core/columns`, `core/group`, `core/media-text`, `core/heading`, `core/paragraph`, `core/pullquote`, `core/image`, `core/buttons`, `core/gallery`, and others. No shortcodes, no custom markup, no proprietary blocks. You can edit, move, or delete any block Aldus inserts.

### Does Aldus have a settings page?

No. All controls are in the block sidebar (Inspector Controls) and the block's own interface. There are no plugin-level settings.

### Is Aldus free?

Yes. Aldus is GPL-2.0-or-later licensed and free to use.

---

## Privacy & data

### Does Aldus send my content to an external server?

No. Your words, images, and links never leave your server during the layout generation process. Here is what actually happens:

1. The browser model receives a **content manifest** — a count of your content types and average word lengths. Not your actual text.
2. The model outputs a **token sequence** — an ordered list of layout sections.
3. That token sequence is sent to your own WordPress server (via the REST API) where the PHP assembler maps tokens to block markup using your actual content.

Your words are only ever processed on your own server. The only external network call is the one-time model download from a CDN.

### What data does the model actually see?

The model receives:
- A manifest of content types and quantities (e.g. "2 paragraphs, 1 image, 1 button")
- Average word counts for text content types
- Post type and title (if generating from inside a post)
- Your Style Notes (if any)

The model does not see your actual headline text, paragraph copy, quote text, button labels, or image URLs.

### Where is my content stored?

Content items are stored as a block attribute in the post's block data in your WordPress database — the same place all block content lives. Saved Sessions are stored in WordPress's block preferences store (also your own database), tied to your user account. Nothing is stored in external services.

---

## WebGPU & the model

### What is WebGPU?

WebGPU is a modern browser API for GPU-accelerated computing. Aldus uses it to run a neural network model directly inside your browser — the same way your browser uses the GPU to render graphics, but for AI inference instead.

### Which browsers support WebGPU?

| Browser | Support |
|---|---|
| Chrome 113+ | Full support |
| Edge 113+ | Full support |
| Safari 18+ (macOS / iOS) | Full support |
| Firefox | Not yet supported |
| Older Chrome / Edge | Not supported |

If your browser doesn't support WebGPU, Aldus will show a message explaining what to do. You can still use [Sample Packs](Sample-Packs) for instant previews without WebGPU.

### What model does Aldus use?

**SmolLM2-360M-Instruct** (quantized to 4-bit float16). It is a 360-million parameter instruction-tuned language model from Hugging Face, distributed via the MLC (Machine Learning Compilation) project's WebLLM runtime.

At 360M parameters it is far smaller than a typical conversational AI model. It is specifically good at following structured output instructions — which is all Aldus needs it to do.

### How big is the model download?

Approximately **200 MB**. This happens once — after the first download the model is cached in your browser's storage and loads in seconds on subsequent uses.

If you clear your browser cache, the model will need to download again.

### The model is taking a long time to download. Is that normal?

Yes, on a slow connection 200 MB can take a few minutes. The progress bar shows the download status. Once it's done, it never needs to download again (unless you clear your cache).

### Does the model need the internet to run?

Only for the initial download. Once cached, the model runs entirely offline. You can use Aldus on a site without internet access as long as the model has been downloaded previously in that browser.

---

## Layout generation

### Why do all sixteen personalities run at the same time?

Because it's faster and more useful. Running them in parallel means you see all sixteen layout proposals simultaneously rather than waiting for each one sequentially. It also makes comparison easy — the same content, sixteen different visual interpretations, side by side.

### Can I run just one personality?

Yes. Open the **Personalities** panel in the block sidebar and disable the personalities you don't want. Only enabled personalities run when you generate. You can save a single-personality configuration if you always want to use just one.

### Why does the model sometimes propose a layout that's missing some of my content?

The model proposes a token sequence — a list of section types. Each section type consumes certain content items. If your content mix doesn't match what a section expects (for example, a `cover:split` wants an image but you haven't added one), that section will render with a placeholder.

Adding more content types generally produces richer, more accurate layouts.

### Can I run Aldus on the same content multiple times?

Yes. Click **Regenerate** (or press `⇧⌘R`) to re-run all personalities with the same content. The model's small amount of randomness means you'll get different results each time. You can also [re-roll individual personalities](Features#per-card-re-roll) without regenerating everything.

---

## Block editor & WordPress

### What version of WordPress does Aldus require?

WordPress 6.2 or later. Aldus uses the block editor (Gutenberg) exclusively and requires block editor APIs introduced in WP 6.x.

### Does Aldus work with classic themes?

Aldus inserts standard WordPress blocks, so the blocks themselves work with any theme. However, the visual quality of the output — particularly the color sections, cover overlays, and typography — depends on your theme's block support. Full Site Editing (FSE) themes like Twenty Twenty-Four produce the best results because they expose a rich color palette, font sizes, and gradients that Aldus uses for styling.

Classic themes with limited block support will still produce valid, functional layouts — the color sections will use theme colors if available, or fall back to neutral defaults.

### I see "Block contains unexpected or invalid content" warnings. What should I do?

This warning means WordPress is having trouble validating a block that Aldus inserted. It typically happens because:

1. **You're on an older version of the plugin.** Make sure you're running the latest release from the [Releases page](../../releases).
2. **Your theme's block markup expectations differ from defaults.** This is rare. You can use the **Attempt Block Recovery** option that WordPress offers in the validation warning to let the editor reparse the blocks.

If you're on the latest version and still seeing these warnings, [open an issue](../../issues) with details about your WordPress version and theme.

### Aldus replaced itself with blocks — how do I get back to the Aldus interface?

You can't undo the insertion via Aldus itself, but you can undo it via the editor's standard Undo (`⌘Z` / `Ctrl+Z`). This restores the Aldus block with your content intact so you can choose a different layout.

Alternatively, delete the inserted blocks and add a new Aldus block. If you saved a session before inserting, reload it from the Sessions panel.

### Can I use Aldus multiple times on the same page?

Yes. Each Aldus block is independent — you can have multiple Aldus blocks on a single page, each with different content and generating different layout proposals. After insertion, each becomes a group of standard blocks.

---

## Still stuck?

If you're experiencing an issue not covered here, check [open issues](../../issues) or [open a new one](../../issues/new). Include:
- Your WordPress version
- Your browser and version
- A description of what you expected vs. what happened
- Any error messages from the browser console (F12 → Console)
