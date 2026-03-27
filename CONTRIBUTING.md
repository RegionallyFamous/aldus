# Contributing to Aldus

Thanks for your interest in contributing. This document covers how to set up a local dev environment, run the test suite, add a content pack, and submit a pull request.

---

## Requirements

- Node.js 20+ and npm
- PHP 8.2+ and Composer
- Docker (for integration tests and E2E tests via `wp-env`)

---

## Dev setup

```bash
# Install JS and PHP dependencies
npm ci --legacy-peer-deps
composer install

# Start the block editor watcher (rebuilds on save)
npm run start
```

The watcher compiles `src/` into `build/` and watches for changes. Open your local WordPress install and activate the Aldus plugin against the `build/` directory.

For a self-contained WordPress environment:

```bash
npm run env:start   # starts wp-env at http://localhost:8888
npm run env:stop    # tears it down
```

---

## Building

```bash
npm run build
```

This runs `wp-scripts build` and then `npm run i18n:json` to regenerate translation JSON files from any `.po` files in `languages/`.

---

## Running tests

```bash
# Run all tests (PHP unit + JS unit)
npm test

# JS unit tests only
npm run test:js

# PHP unit tests only (no WordPress install required)
npm run test:php:unit

# PHP integration tests (requires wp-env or a real WP install — see bin/install-wp-tests.sh)
npm run test:php:integration

# Playwright E2E tests (requires wp-env running)
npm run test:e2e
```

Lint checks:

```bash
npm run lint          # JS + CSS + PHP (CodeSniffer)
npm run lint:js       # JavaScript only
npm run lint:css      # SCSS only
npm run lint:php      # PHP CodeSniffer only
```

CI runs all of the above on every pull request. PRs must pass lint and unit tests before merging.

---

## Adding a content pack

A content pack is a themed dataset used to preview every personality style without entering your own content. Each pack has two parts:

### 1. JS pack file — `src/sample-data/<id>.js`

Export a single object with the pack's `id`, `label`, `description`, `palette`, and `content` map. Copy an existing pack (e.g. `src/sample-data/roast.js`) as a starting point. The `content` keys must match the token names used by the assemble engine (see `HOOKS.md` for the token reference).

Register the new pack in `src/sample-data/index.js`:

```js
import { mypack } from './mypack.js';

export const PACKS = [
    // ... existing packs ...
    mypack,
];
```

### 2. PHP block pattern — `includes/patterns.php`

Add an entry to the `$packs` array inside `aldus_register_block_patterns()`. The `title`, `tagline`, `body`, `cta`, and `color` must match the JS pack's theme — the PHP pattern is what appears in the block inserter's Patterns tab, so it should represent the pack accurately.

```php
array(
    'id'      => 'mypack',
    'title'   => 'My Pack — Short Description',
    'tagline' => 'One punchy line from the pack.',
    'body'    => 'Two sentences of pack copy drawn from the JS content.',
    'cta'     => 'Call-to-action label',
    'color'   => '#1a1a1a', // primary color from JS palette
),
```

Keep the two in sync: if you rename or re-theme the JS pack, update the PHP pattern to match.

---

## Submitting a pull request

1. Branch off `master` with a descriptive name: `fix/pattern-grove-title`, `feat/mypack-pack`, `chore/update-deps`.
2. Make your changes. Run `npm test` and `npm run lint` locally before pushing.
3. Add an entry to the **Changelog** section in `readme.txt` (newest version at the top). Frame each bullet as the **benefit to the user** — what they gain or avoid — not only which files or APIs changed.
4. Open a PR against `master`. The CI pipeline runs lint, unit tests, and block-markup validation automatically.
5. Request a review. All tests must be green before merging.

---

## Translations

To update the POT template after adding new translatable strings:

```bash
npm run i18n:pot
```

To generate JS-side JSON translation files from `.po` files in `languages/`:

```bash
npm run i18n:json
```

This is also run automatically as part of `npm run build`.
