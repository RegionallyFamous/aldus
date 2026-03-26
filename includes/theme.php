<?php
declare(strict_types=1);
/**
 * Theme helpers — palette, fonts, spacing, gradients, luminance, pickers, and theme.json injection.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ---------------------------------------------------------------------------
// Theme helpers
// ---------------------------------------------------------------------------

/**
 * Returns the active theme's color palette, sorted by luminance.
 *
 * @return list<array{slug:string,color:string}>
 */
function aldus_get_theme_palette(): array {
	$cache_key = 'aldus_palette_' . ALDUS_VERSION;
	$cached    = wp_cache_get( $cache_key, 'aldus' );
	if ( false !== $cached ) {
		return (array) $cached;
	}

	$settings = wp_get_global_settings( array( 'color', 'palette' ) );
	if ( is_wp_error( $settings ) || ! is_array( $settings ) ) {
		$settings = array();
	}
	$palette = $settings['theme'] ?? $settings['default'] ?? array();

	if ( empty( $palette ) ) {
		$palette = array(
			array(
				'slug'  => 'black',
				'color' => '#000000',
			),
			array(
				'slug'  => 'white',
				'color' => '#ffffff',
			),
			array(
				'slug'  => 'primary',
				'color' => '#005f99',
			),
		);
	} else {
		usort(
			$palette,
			fn( $a, $b ) => aldus_hex_luminance( $a['color'] ?? '#888' ) <=> aldus_hex_luminance( $b['color'] ?? '#888' )
		);
	}

	// TTL of one hour prevents stale theme data from persisting indefinitely on
	// long-lived object-cache backends (Redis, Memcached) when a theme is updated
	// without flushing the cache manually.
	wp_cache_set( $cache_key, $palette, 'aldus', HOUR_IN_SECONDS );
	return $palette;
}

/**
 * Returns the theme's registered font size presets.
 *
 * @return list<array{slug:string,size:string}>
 */
function aldus_get_theme_font_sizes(): array {
	$cache_key = 'aldus_font_sizes_' . ALDUS_VERSION;
	$cached    = wp_cache_get( $cache_key, 'aldus' );
	if ( false !== $cached ) {
		return (array) $cached;
	}

	$settings = wp_get_global_settings( array( 'typography', 'fontSizes' ) );
	if ( is_wp_error( $settings ) || ! is_array( $settings ) ) {
		$settings = array();
	}
	$sizes = $settings['theme'] ?? $settings['default'] ?? array();

	if ( empty( $sizes ) ) {
		$sizes = array(
			array(
				'slug' => 'large',
				'size' => '1.5rem',
			),
			array(
				'slug' => 'x-large',
				'size' => '2rem',
			),
			array(
				'slug' => 'xx-large',
				'size' => '2.5rem',
			),
		);
	}

	wp_cache_set( $cache_key, $sizes, 'aldus', HOUR_IN_SECONDS );
	return $sizes;
}

/**
 * Returns the active theme's content width (contentSize) from layout settings.
 *
 * Used by template functions to size constrained group layouts to match the
 * site's actual content column width instead of a hardcoded 48rem.
 *
 * @return string CSS length value, e.g. '650px' or '48rem'.
 */
function aldus_theme_content_size(): string {
	$cache_key = 'aldus_content_size_' . ALDUS_VERSION;
	$cached    = wp_cache_get( $cache_key, 'aldus' );
	if ( false !== $cached ) {
		return (string) $cached;
	}

	$settings = wp_get_global_settings( array( 'layout' ) );
	$value    = ( is_array( $settings ) ? $settings['contentSize'] ?? '' : '' );
	if ( '' === $value ) {
		$value = '48rem';
	}

	wp_cache_set( $cache_key, $value, 'aldus', HOUR_IN_SECONDS );
	return $value;
}

/**
 * Returns the theme's wide layout width (wideSize) or a sensible default.
 *
 * @return string CSS width value, e.g. '72rem'.
 */
function aldus_theme_wide_size(): string {
	$cache_key = 'aldus_wide_size_' . ALDUS_VERSION;
	$cached    = wp_cache_get( $cache_key, 'aldus' );
	if ( false !== $cached ) {
		return (string) $cached;
	}

	$settings = wp_get_global_settings( array( 'layout' ) );
	$value    = ( is_array( $settings ) ? $settings['wideSize'] ?? '' : '' );
	if ( '' === $value ) {
		$value = '72rem';
	}

	wp_cache_set( $cache_key, $value, 'aldus', HOUR_IN_SECONDS );
	return $value;
}

/**
 * Returns a theme spacing value mapped to a logical role.
 *
 * Roles map to positional percentiles in the theme's spacing preset scale so
 * the output feels native to any theme regardless of its specific values.
 *
 * @param string $role  One of 'sm' (≈1.5rem), 'md' (≈3rem), 'lg' (≈4rem), 'xl' (≈6rem).
 * @return string CSS value or var(--wp--preset--spacing--{slug}).
 */
function aldus_theme_spacing( string $role ): string {
	static $map = null;

	if ( null === $map ) {
		$cache_key = 'aldus_spacing_map_' . ALDUS_VERSION;
		$cached    = wp_cache_get( $cache_key, 'aldus' );

		if ( false !== $cached ) {
			$map = (array) $cached;
		} else {
			$fallbacks = array(
				'sm' => '1.5rem',
				'md' => '3rem',
				'lg' => '4rem',
				'xl' => '6rem',
			);

			$settings = wp_get_global_settings( array( 'spacing', 'spacingSizes' ) );
			$presets  = array();
			if ( is_array( $settings ) ) {
				$presets = $settings['theme'] ?? $settings['default'] ?? array();
			}

			if ( empty( $presets ) ) {
				$map = $fallbacks;
			} else {
				$n           = count( $presets );
				$percentiles = array(
					'sm' => (int) floor( $n * 0.25 ),
					'md' => (int) floor( $n * 0.55 ),
					'lg' => (int) floor( $n * 0.75 ),
					'xl' => max( 0, $n - 1 ),
				);
				$map         = array();
				foreach ( $percentiles as $r => $idx ) {
					$idx       = max( 0, min( $idx, $n - 1 ) );
					$slug      = $presets[ $idx ]['slug'] ?? '';
					$map[ $r ] = $slug !== '' ? "var(--wp--preset--spacing--{$slug})" : $fallbacks[ $r ];
				}
			}

			wp_cache_set( $cache_key, $map, 'aldus', HOUR_IN_SECONDS );
		}
	}

	return $map[ $role ] ?? '1.5rem';
}

/**
 * Returns 'generous', 'normal', or 'tight' based on the theme's block gap.
 *
 * This informs spacer block heights: when the theme already has generous
 * inter-block spacing, Aldus uses smaller explicit spacers so layouts don't
 * feel too airy.
 *
 * @return string 'generous' | 'normal' | 'tight'
 */
function aldus_theme_spacer_scale(): string {
	static $scale = null;

	if ( null !== $scale ) {
		return $scale;
	}

	$cache_key = 'aldus_spacer_scale_' . ALDUS_VERSION;
	$cached    = wp_cache_get( $cache_key, 'aldus' );
	if ( false !== $cached ) {
		$scale = (string) $cached;
		return $scale;
	}

	$gap = wp_get_global_settings( array( 'spacing', 'blockGap' ) );
	if ( ! is_string( $gap ) || '' === $gap ) {
		$gap = '1.5rem';
	}

	// Resolve CSS custom property references to their fallback if present.
	// e.g. "var(--wp--style--block-gap, 1.5rem)" → "1.5rem"
	if ( preg_match( '/var\([^,]+,\s*([^)]+)\)/', $gap, $m ) ) {
		$gap = trim( $m[1] );
	}

	// Convert common units to a rem float for comparison.
	$rem_val = 1.5;
	if ( preg_match( '/^([\d.]+)rem$/i', $gap, $m ) ) {
		$rem_val = (float) $m[1];
	} elseif ( preg_match( '/^([\d.]+)px$/i', $gap, $m ) ) {
		$rem_val = (float) $m[1] / 16;
	} elseif ( preg_match( '/^([\d.]+)em$/i', $gap, $m ) ) {
		$rem_val = (float) $m[1];
	}

	if ( $rem_val > 2.0 ) {
		$scale = 'generous';
	} elseif ( $rem_val < 1.0 ) {
		$scale = 'tight';
	} else {
		$scale = 'normal';
	}

	wp_cache_set( $cache_key, $scale, 'aldus', HOUR_IN_SECONDS );
	return $scale;
}

/**
 * Returns which theme appearance tools are enabled.
 *
 * When a theme disables a tool (e.g. border controls), Aldus should avoid
 * generating tokens that produce un-editable output for those features.
 *
 * @return array{border_width: bool, color_background: bool}
 */
function aldus_get_theme_appearance_tools(): array {
	$cache_key = 'aldus_appearance_tools_' . ALDUS_VERSION;
	$cached    = wp_cache_get( $cache_key, 'aldus' );
	if ( false !== $cached ) {
		return (array) $cached;
	}

	// wp_get_global_settings returns false (boolean) when a tool is explicitly
	// disabled, or the capability array / null when enabled or unset.
	$border_width     = wp_get_global_settings( array( 'border', 'width' ) );
	$color_background = wp_get_global_settings( array( 'color', 'background' ) );

	$tools = array(
		'border_width'     => false !== $border_width,
		'color_background' => false !== $color_background,
	);

	wp_cache_set( $cache_key, $tools, 'aldus', HOUR_IN_SECONDS );
	return $tools;
}

/**
 * Calculates relative luminance of a hex color string (for palette sorting).
 *
 * @param string $hex e.g. "#ff6600" or "ff6600"
 * @return float 0 (black) to 1 (white)
 */
function aldus_hex_luminance( string $hex ): float {
	$hex = ltrim( $hex, '#' );
	if ( strlen( $hex ) !== 6 ) {
		return 0.5;
	}
	$r = hexdec( substr( $hex, 0, 2 ) ) / 255;
	$g = hexdec( substr( $hex, 2, 2 ) ) / 255;
	$b = hexdec( substr( $hex, 4, 2 ) ) / 255;

	$linearize = fn( float $c ) => $c <= 0.03928 ? $c / 12.92 : ( ( $c + 0.055 ) / 1.055 ) ** 2.4;

	return 0.2126 * $linearize( $r ) + 0.7152 * $linearize( $g ) + 0.0722 * $linearize( $b );
}

/**
 * Returns the darkest palette slug (lowest luminance).
 *
 * @param list<array{slug:string,color:string}> $palette
 */
function aldus_pick_dark( array $palette ): string {
	return sanitize_html_class( $palette[0]['slug'] ?? 'black' );
}

/**
 * Returns the lightest palette slug (highest luminance).
 *
 * @param list<array{slug:string,color:string}> $palette
 */
function aldus_pick_light( array $palette ): string {
	$last = end( $palette );
	return sanitize_html_class( $last['slug'] ?? 'white' );
}

/**
 * Returns a mid-range palette slug to use as an accent.
 * Picks the entry closest to 40% luminance.
 *
 * @param list<array{slug:string,color:string}> $palette
 */
function aldus_pick_accent( array $palette ): string {
	if ( count( $palette ) < 3 ) {
		return sanitize_html_class( $palette[ (int) floor( count( $palette ) / 2 ) ]['slug'] ?? 'primary' );
	}
	$target = 0.4;
	$best   = $palette[0];
	$best_d = abs( aldus_hex_luminance( $best['color'] ?? '#000' ) - $target );
	foreach ( $palette as $entry ) {
		$d = abs( aldus_hex_luminance( $entry['color'] ?? '#000' ) - $target );
		if ( $d < $best_d ) {
			$best   = $entry;
			$best_d = $d;
		}
	}
	return sanitize_html_class( $best['slug'] ?? 'primary' );
}

/**
 * Returns the largest registered font size slug or a fallback.
 *
 * @param list<array{slug:string,size:string}> $font_sizes
 */
function aldus_pick_large_font( array $font_sizes ): string {
	if ( empty( $font_sizes ) ) {
		return 'x-large';
	}
	// Try to find a slug containing "large", "huge", "giant", "xl", "xxl".
	$hints = array( 'xx-large', 'xxlarge', 'huge', 'giant', 'x-large', 'xlarge', 'large' );
	foreach ( $hints as $hint ) {
		foreach ( $font_sizes as $fs ) {
			if ( str_contains( strtolower( $fs['slug'] ?? '' ), $hint ) ) {
				return sanitize_html_class( $fs['slug'] );
			}
		}
	}
	// Fall back to the last (assumed largest).
	$last = end( $font_sizes );
	return sanitize_html_class( $last['slug'] ?? 'large' );
}

/**
 * Returns the second-largest font size slug from the theme's registered sizes.
 * Used for paragraph:lead and H2 font size variation in high-contrast personalities.
 *
 * @param list<array{slug:string,size:string}> $font_sizes
 * @return string Font size slug.
 */
function aldus_pick_medium_font( array $font_sizes ): string {
	if ( count( $font_sizes ) < 2 ) {
		return 'large';
	}
	// Check for explicit "medium" or "md" slugs first.
	$medium_hints = array( 'medium', 'md', 'xl', 'x-large', 'xlarge' );
	foreach ( $medium_hints as $hint ) {
		foreach ( $font_sizes as $fs ) {
			if ( str_contains( strtolower( $fs['slug'] ?? '' ), $hint ) ) {
				return sanitize_html_class( $fs['slug'] );
			}
		}
	}
	// Fall back to the second-to-last (just below the largest).
	$count = count( $font_sizes );
	return sanitize_html_class( $font_sizes[ $count - 2 ]['slug'] ?? 'large' );
}

function aldus_get_theme_gradients(): array {
	$cache_key = 'aldus_gradients_' . ALDUS_VERSION;
	$cached    = wp_cache_get( $cache_key, 'aldus' );
	if ( false !== $cached ) {
		return (array) $cached;
	}

	$settings = wp_get_global_settings( array( 'color', 'gradients' ) );
	if ( is_wp_error( $settings ) || ! is_array( $settings ) ) {
		$settings = array();
	}
	$gradients = $settings['theme'] ?? $settings['default'] ?? array();

	if ( empty( $gradients ) ) {
		$gradients = array(
			array(
				'slug'     => 'vivid-cyan-blue-to-vivid-purple',
				'gradient' => 'linear-gradient(135deg,rgba(6,147,227,1) 0%,rgb(155,81,224) 100%)',
			),
			array(
				'slug'     => 'light-green-cyan-to-vivid-green-cyan',
				'gradient' => 'linear-gradient(135deg,rgb(122,220,180) 0%,rgb(0,208,130) 100%)',
			),
		);
	}

	wp_cache_set( $cache_key, $gradients, 'aldus', HOUR_IN_SECONDS );
	return $gradients;
}

/**
 * Returns the first gradient slug (or a safe fallback).
 *
 * @param list<array{slug:string,gradient:string}> $gradients
 * @return string
 */
function aldus_pick_gradient( array $gradients ): string {
	if ( empty( $gradients ) ) {
		return 'vivid-cyan-blue-to-vivid-purple';
	}
	return sanitize_html_class( $gradients[0]['slug'] ?? 'vivid-cyan-blue-to-vivid-purple' );
}

// ---------------------------------------------------------------------------
// Video renderers
// ---------------------------------------------------------------------------

/**
 * Renders a full-width video/embed block (video:hero token).
 * Uses core/embed, which handles YouTube, Vimeo, and most oEmbed providers.
 *
 * @param Aldus_Content_Distributor $dist
 * @return string
 */

/**
 * Flush all Aldus object-cache entries for theme data.
 *
 * Hooked to switch_theme and customize_save_after so the color palette,
 * font sizes, and gradient entries are re-read after any theme change.
 */
function aldus_flush_theme_cache(): void {
	$v = ALDUS_VERSION;
	wp_cache_delete( 'aldus_palette_' . $v, 'aldus' );
	wp_cache_delete( 'aldus_font_sizes_' . $v, 'aldus' );
	wp_cache_delete( 'aldus_gradients_' . $v, 'aldus' );
	wp_cache_delete( 'aldus_content_size_' . $v, 'aldus' );
	wp_cache_delete( 'aldus_wide_size_' . $v, 'aldus' );
	wp_cache_delete( 'aldus_spacing_map_' . $v, 'aldus' );
	wp_cache_delete( 'aldus_spacer_scale_' . $v, 'aldus' );
	wp_cache_delete( 'aldus_appearance_tools_' . $v, 'aldus' );
}

/**
 * Injects site identity (name, description) for the editor LLM prompt.
 *
 * Hooked onto enqueue_block_editor_assets so the variable is available
 * as soon as the editor script loads — before the user interacts.
 */
function aldus_inline_site_data(): void {
	wp_add_inline_script(
		'aldus-aldus-layout-generator-editor-script',
		'window.__aldusSite = ' . wp_json_encode(
			array(
				'name'        => get_bloginfo( 'name' ),
				'description' => get_bloginfo( 'description' ),
			)
		) . ';',
		'before'
	);

	// Expose the PHP-side plugin version so the JS bundle can detect a
	// cache/version mismatch (e.g. stale browser cache after an update).
	wp_add_inline_script(
		'aldus-aldus-layout-generator-editor-script',
		'window.__aldusPhpVersion = ' . wp_json_encode( ALDUS_VERSION ) . ';',
		'before'
	);

	// Signal to the JS bundle whether a server-side AI fallback is available.
	// Requires WP 7.0+ wp_ai_client_prompt() AND the editor to have prompt_ai capability.
	// The JS generation hook reads this flag before deciding which engine to use.
	$server_ai_available = function_exists( 'wp_ai_client_prompt' ) && current_user_can( 'prompt_ai' );
	wp_add_inline_script(
		'aldus-aldus-layout-generator-editor-script',
		'window.__aldusCapabilities = window.__aldusCapabilities || {};' .
		' window.__aldusCapabilities.serverAI = ' . ( $server_ai_available ? 'true' : 'false' ) . ';',
		'before'
	);
}
add_action( 'enqueue_block_editor_assets', 'aldus_inline_site_data' );

/**
 * Merges Aldus-specific design tokens into the active theme's theme.json data.
 *
 * Injects custom spacing presets and CSS custom properties that generated
 * layouts depend on so they render consistently regardless of the active theme.
 *
 * spacingSizes are injected by directly modifying the raw data array rather
 * than via update_with(). WP_Theme_JSON::merge() processes presets with
 * origin-tracking that silently discards injected entries in some WP versions
 * (observed on WP 6.4 and 6.7). Direct manipulation is reliable from WP 6.4+.
 *
 * @param mixed $theme_json Mutable theme.json data object (WP_Theme_JSON_Data expected).
 * @return mixed
 */
function aldus_inject_theme_json( mixed $theme_json ): mixed {
	if ( ! $theme_json instanceof WP_Theme_JSON_Data ) {
		return $theme_json;
	}

	// -------------------------------------------------------------------------
	// Step 1: Inject spacing presets directly into the raw data array.
	// -------------------------------------------------------------------------
	$data = $theme_json->get_data();

	$aldus_sizes = array(
		array(
			'slug' => 'aldus-section',
			'size' => '80px',
			'name' => 'Aldus Section',
		),
		array(
			'slug' => 'aldus-gap',
			'size' => '40px',
			'name' => 'Aldus Gap',
		),
		array(
			'slug' => 'aldus-tight',
			'size' => '20px',
			'name' => 'Aldus Tight',
		),
	);

	// WP 6.6+ stores spacingSizes keyed by origin: {'default': [...], 'theme': [...]}.
	// WP 6.4–6.5 stores them as a flat array.  Handle both formats.
	$existing = $data['settings']['spacing']['spacingSizes'] ?? array();
	$first    = ! empty( $existing ) ? reset( $existing ) : null;

	if ( null !== $first && is_array( $first ) && ! isset( $first['slug'] ) ) {
		// WP 6.6+ origin-keyed format: append to the 'theme' bucket so that
		// WordPress generates the correct --wp--preset--spacing--* CSS variables.
		$existing['theme'] = array_merge( $existing['theme'] ?? array(), $aldus_sizes );
	} else {
		// Pre-6.6 flat array or no existing sizes: simply append.
		$existing = array_merge( $existing, $aldus_sizes );
	}

	$data['settings']['spacing']['spacingSizes'] = $existing;

	// -------------------------------------------------------------------------
	// Step 2: Inject CSS custom properties and personality block-style rules.
	// Append to any existing styles.css so the theme's own CSS is preserved.
	// update_with() uses array_replace_recursive which would REPLACE the CSS
	// string rather than append it, so we concatenate directly in $data.
	// -------------------------------------------------------------------------
	$aldus_css = '
			:root {
				--aldus-section-spacing: 80px;
				--aldus-gap: 40px;
				--aldus-tight: 20px;
				--aldus-overlay-dark: rgba(0,0,0,0.55);
				--aldus-overlay-accent: rgba(0,0,0,0.35);
			}

			/* --- Aldus Personality Block Style Variations --- */

			/* Dispatch: high-contrast, urgent, dark */
			.is-style-aldus-dispatch {
				background-color: #111 !important;
				color: #fff !important;
				padding: var(--aldus-section-spacing) var(--aldus-gap);
			}
			.is-style-aldus-dispatch .wp-block-heading {
				font-weight: 800;
				letter-spacing: -0.02em;
			}

			/* Nocturne: cinematic, atmospheric dark */
			.is-style-aldus-nocturne {
				background-color: #0a0a14 !important;
				color: #e8e8e8 !important;
				padding: var(--aldus-section-spacing) var(--aldus-gap);
			}
			.is-style-aldus-nocturne .wp-block-cover__background {
				opacity: 0.7;
			}

			/* Codex: restrained, typographic, generous whitespace */
			.is-style-aldus-codex {
				padding: calc(var(--aldus-section-spacing) * 1.5) var(--aldus-gap);
				max-width: 42rem;
				margin-left: auto;
				margin-right: auto;
			}
			.is-style-aldus-codex .wp-block-heading {
				font-weight: 300;
				letter-spacing: 0.01em;
			}

			/* Solstice: minimal, luminous, clean */
			.is-style-aldus-solstice {
				background-color: #fafafa !important;
				color: #222 !important;
				padding: var(--aldus-section-spacing) var(--aldus-gap);
				border-radius: 8px;
			}

			/* Folio: editorial asymmetry */
			.is-style-aldus-folio {
				border-left: 3px solid currentColor;
				padding-left: var(--aldus-gap);
			}

			/* Dusk: gradient atmosphere */
			.is-style-aldus-dusk {
				background: linear-gradient(
					135deg,
					#1a1a2e 0%,
					#16213e 50%,
					#0f3460 100%
				) !important;
				color: #e8e8e8 !important;
				padding: var(--aldus-section-spacing) var(--aldus-gap);
			}

			/* Soft lift on hover for card-style personalities */
			.is-style-aldus-solstice:hover,
			.is-style-aldus-codex:hover {
				box-shadow: 0 4px 24px rgba(0,0,0,0.08);
				transition: box-shadow 0.2s ease;
			}

			/* Keyboard-focus ring for all Aldus wrapper styles */
			.is-style-aldus-dispatch:focus-within,
			.is-style-aldus-nocturne:focus-within,
			.is-style-aldus-codex:focus-within,
			.is-style-aldus-solstice:focus-within,
			.is-style-aldus-folio:focus-within,
			.is-style-aldus-dusk:focus-within {
				outline: 2px solid var(--wp--preset--color--primary, #005f99);
				outline-offset: 4px;
			}

			/* Active press state for interactive Aldus sections */
			.is-style-aldus-dispatch:active,
			.is-style-aldus-nocturne:active {
				filter: brightness(1.05);
				transition: filter 0.1s ease;
			}
	';

	$data['styles']['css'] = ( $data['styles']['css'] ?? '' ) . $aldus_css;

	// Rebuild and return a fresh WP_Theme_JSON_Data from the fully-patched array.
	// The WP constructor re-validates presets but respects data already in the
	// origin-keyed format, so the aldus spacingSizes survive intact.
	return new WP_Theme_JSON_Data( $data, 'theme' );
}
