# Aldus — Developer Hooks Reference

All documented action and filter hooks provided by the Aldus plugin. Use these to extend personalities, modify tokens, react to layout events, or customise behaviour.

---

## Filters

### `aldus_personalities`

Modify the built-in personality map. Add custom personalities, remove built-ins, or change the anchor tokens required for existing ones.

**File:** `includes/tokens.php`

```php
apply_filters( 'aldus_personalities', array<string, string[]> $personalities )
```

**Parameters:**
- `$personalities` — associative array of `label => anchor_tokens[]`. Each key is a personality name (e.g. `'Dispatch'`); each value is an array of token strings that must appear in that personality's layout output.

**Example:**

```php
add_filter( 'aldus_personalities', function( $personalities ) {
    // Add a custom "Seasonal" personality.
    $personalities['Seasonal'] = [ 'cover:full', 'columns:2' ];
    return $personalities;
} );
```

---

### `aldus_valid_tokens`

Add custom token strings to the allowed list. Tokens not in this list are stripped before rendering.

**File:** `includes/tokens.php`

```php
apply_filters( 'aldus_valid_tokens', string[] $tokens )
```

**Example:**

```php
add_filter( 'aldus_valid_tokens', function( $tokens ) {
    $tokens[] = 'my-custom-block:wide';
    return $tokens;
} );
```

---

### `aldus_tokens_before_render`

Modify or reorder the token sequence for a specific personality just before the block renderer processes them.

**File:** `includes/api.php`

```php
apply_filters( 'aldus_tokens_before_render', string[] $tokens, string $personality, array $items )
```

**Parameters:**
- `$tokens` — ordered list of token strings.
- `$personality` — personality label (e.g. `'Dispatch'`).
- `$items` — sanitised content items array.

---

### `aldus_assembled_blocks`

Filter the final serialised block markup after a layout has been assembled.

**File:** `includes/api.php`

```php
apply_filters( 'aldus_assembled_blocks', string $markup, string $personality, array $items )
```

---

### `aldus_personality_style_rules`

Override or extend the CSS/style rules injected for a given personality. Runs inside `aldus_get_personality_style_rules()`.

**File:** `includes/personality.php`

```php
apply_filters( 'aldus_personality_style_rules', array $rules )
```

---

### `aldus_meta_post_types`

Customise the list of post types that get the Aldus metadata bindings registered.

**File:** `includes/bindings.php`

```php
apply_filters( 'aldus_meta_post_types', string[] $post_types )
```

**Default:** `['post', 'page']`

---

## Actions

### `aldus_layout_generated`

Fired immediately after a layout is assembled on the server, before the response is sent.

**File:** `includes/api.php`

```php
do_action( 'aldus_layout_generated', string $personality, string[] $tokens, string $markup )
```

**Parameters:**
- `$personality` — personality label.
- `$tokens` — final ordered token list.
- `$markup` — serialised block markup string.

---

### `aldus_layout_chosen`

Fired when the user clicks "Use this one" and the chosen personality is recorded.

**File:** `includes/api.php`

```php
do_action( 'aldus_layout_chosen', string $personality )
```

---

## Public API Functions

### `aldus_register_personality()`

Register a custom personality from a theme or plugin. The registered personality appears in the Aldus editor alongside the built-in sixteen.

**File:** `includes/api.php`

```php
aldus_register_personality( string $slug, string $label, string $prompt_fragment ): void
```

**Parameters:**
- `$slug` — unique machine-readable identifier (e.g. `'my-theme-hero'`).
- `$label` — human-readable name shown in the UI (e.g. `'My Theme Hero'`).
- `$prompt_fragment` — one-sentence style description appended to the LLM prompt (e.g. `'Bold hero section with full-bleed image and centered text.'`).

**Example:**

```php
add_action( 'init', function() {
    aldus_register_personality(
        'my-magazine',
        'My Magazine',
        'Dense editorial grid, serif typography, byline-style subheadings.'
    );
} );
```

---

## REST Endpoints

### `GET /aldus/v1/config`

Returns the current Aldus configuration: registered personalities, plugin version, and active theme layout settings.

**Requires:** `edit_posts` capability.

**Response shape:**

```json
{
  "version": "1.14.0",
  "personalities": [
    { "slug": "dispatch", "label": "Dispatch", "source": "builtin" },
    { "slug": "my-magazine", "label": "My Magazine", "source": "registered" }
  ],
  "theme": {
    "contentSize": "48rem",
    "wideSize": "72rem",
    "spacing": { "sm": "1rem", "md": "1.5rem", "lg": "2.5rem", "xl": "4rem" }
  }
}
```
