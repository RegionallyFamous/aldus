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
 * Returns a stable cache-key suffix scoped to the active theme's identity.
 *
 * Using the theme stylesheet slug and version (rather than ALDUS_VERSION)
 * means the cache survives Aldus plugin updates when the theme hasn't changed,
 * while still invalidating correctly after a theme switch or theme update.
 * The result is memoised in a static variable so wp_get_theme() is only called
 * once per request.
 *
 * @return string Sanitized key fragment, e.g. "twentytwentyfive_1-2".
 */
function aldus_theme_cache_suffix(): string {
	static $suffix = null;
	if ( null === $suffix ) {
		$theme  = wp_get_theme();
		$suffix = sanitize_key( get_stylesheet() . '_' . $theme->get( 'Version' ) );
	}
	return $suffix;
}

/**
 * Returns the active theme's color palette, sorted by luminance.
 *
 * @return list<array{slug:string,color:string}>
 */
function aldus_get_theme_palette(): array {
	$cache_key = 'aldus_palette_' . aldus_theme_cache_suffix();
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
	$cache_key = 'aldus_font_sizes_' . aldus_theme_cache_suffix();
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
	$cache_key = 'aldus_content_size_' . aldus_theme_cache_suffix();
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
	$cache_key = 'aldus_wide_size_' . aldus_theme_cache_suffix();
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
		$cache_key = 'aldus_spacing_map_' . aldus_theme_cache_suffix();
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

	$cache_key = 'aldus_spacer_scale_' . aldus_theme_cache_suffix();
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
	$cache_key = 'aldus_appearance_tools_' . aldus_theme_cache_suffix();
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
 * Returns true when the palette has fewer than four entries.
 *
 * Themes with very small palettes (black + white only, or three colours)
 * need special handling because the accent picker can otherwise return the
 * same slug as the dark picker, producing no visual contrast.
 *
 * @param list<array{slug:string,color:string}> $palette
 * @return bool
 */
function aldus_palette_is_minimal( array $palette ): bool {
	return count( $palette ) < 4;
}

/**
 * Lightens a six-digit hex color by the given percentage (0–100).
 *
 * Useful for generating inline style values from the theme palette when
 * a derived shade is needed without registering a new colour preset.
 * Returns the original (prefixed with #) unchanged on invalid input.
 *
 * @param string $hex     Six-digit hex string with or without the leading '#'.
 * @param int    $percent Lightening amount as a percentage of the max channel value.
 * @return string Lightened hex colour string including the '#' prefix.
 */
function aldus_lighten_hex( string $hex, int $percent ): string {
	$hex = ltrim( $hex, '#' );
	if ( strlen( $hex ) !== 6 ) {
		return '#' . $hex;
	}
	$r = min( 255, (int) ( hexdec( substr( $hex, 0, 2 ) ) + 255 * $percent / 100 ) );
	$g = min( 255, (int) ( hexdec( substr( $hex, 2, 2 ) ) + 255 * $percent / 100 ) );
	$b = min( 255, (int) ( hexdec( substr( $hex, 4, 2 ) ) + 255 * $percent / 100 ) );
	return sprintf( '#%02x%02x%02x', $r, $g, $b );
}

/**
 * Calculates relative luminance of a color value (WCAG 2.x definition).
 *
 * Accepts six-digit hex strings (with or without '#'), rgb()/rgba() functional
 * notation, or any other CSS value.  oklch(), hsl(), and var() references
 * require a CSS runtime to resolve and are returned as the 0.5 sentinel so
 * they sort to the middle of the palette and don't skew dark/light picks.
 *
 * @param string $hex e.g. "#ff6600", "ff6600", "rgb(255,102,0)"
 * @return float 0 (black) to 1 (white); 0.5 for unresolvable values
 */
function aldus_hex_luminance( string $hex ): float {
	$linearize = static fn( float $c ): float => $c <= 0.03928
		? $c / 12.92
		: ( ( $c + 0.055 ) / 1.055 ) ** 2.4;

	// Fast-path: rgb()/rgba() functional notation used by many modern themes.
	if ( preg_match( '/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i', $hex, $m ) ) {
		$r = min( 255, (int) $m[1] ) / 255;
		$g = min( 255, (int) $m[2] ) / 255;
		$b = min( 255, (int) $m[3] ) / 255;
		return 0.2126 * $linearize( $r ) + 0.7152 * $linearize( $g ) + 0.0722 * $linearize( $b );
	}

	$hex = ltrim( $hex, '#' );
	if ( strlen( $hex ) !== 6 ) {
		// oklch(), hsl(), var() — cannot resolve without a CSS runtime.
		return 0.5;
	}
	$r = hexdec( substr( $hex, 0, 2 ) ) / 255;
	$g = hexdec( substr( $hex, 2, 2 ) ) / 255;
	$b = hexdec( substr( $hex, 4, 2 ) ) / 255;

	return 0.2126 * $linearize( $r ) + 0.7152 * $linearize( $g ) + 0.0722 * $linearize( $b );
}

/**
 * Returns the HSL saturation (0–1) of a six-digit hex color.
 *
 * Used by aldus_pick_accent() to prefer the most visually vivid color over
 * a mid-gray that happens to share the same luminance.  Non-hex or achromatic
 * values return 0.0 so they are ranked last during accent selection.
 *
 * @param string $hex Six-digit hex with or without '#'.
 * @return float 0 (achromatic / unresolvable) to 1 (fully saturated).
 */
function aldus_hex_saturation( string $hex ): float {
	$hex = ltrim( $hex, '#' );
	if ( strlen( $hex ) !== 6 ) {
		return 0.0;
	}
	$r = hexdec( substr( $hex, 0, 2 ) ) / 255;
	$g = hexdec( substr( $hex, 2, 2 ) ) / 255;
	$b = hexdec( substr( $hex, 4, 2 ) ) / 255;

	$max   = max( $r, $g, $b );
	$min   = min( $r, $g, $b );
	$delta = $max - $min;

	if ( $delta < 0.0001 ) {
		return 0.0; // achromatic (gray)
	}

	$l = ( $max + $min ) / 2.0;
	// HSL saturation formula — avoids division-by-zero on pure black/white
	// because delta > 0 means (1 - |2L-1|) > 0.
	return $delta / ( 1.0 - abs( 2.0 * $l - 1.0 ) );
}

/**
 * Computes the WCAG 2.x contrast ratio between two relative luminances.
 *
 * Returns a value in the range [1, 21]. WCAG AA for normal text requires ≥ 4.5.
 *
 * @param float $l1 Relative luminance of the first color (0–1).
 * @param float $l2 Relative luminance of the second color (0–1).
 * @return float Contrast ratio.
 */
function aldus_contrast_ratio( float $l1, float $l2 ): float {
	$lighter = max( $l1, $l2 );
	$darker  = min( $l1, $l2 );
	return ( $lighter + 0.05 ) / ( $darker + 0.05 );
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
 * Returns the most visually vivid mid-range palette slug for use as an accent.
 *
 * Algorithm (in order of preference):
 *   1. Exclude the darkest (index 0) and lightest (last index) entries — those
 *      are reserved for the dark/light pickers.
 *   2. Sort remaining candidates by HSL saturation descending (most vivid first).
 *   3. Walk the sorted list and return the first entry that achieves ≥ 4.5:1
 *      WCAG AA contrast against either white or black text.
 *   4. If no candidate passes the contrast check, return the most saturated one
 *      anyway — it is still more useful than a gray.
 *   5. When fewer than 3 palette entries exist, or after excluding extremes no
 *      candidates remain, fall back to the old luminance-closest-to-40% logic.
 *
 * Minimal-palette guard: if the fallback path resolves to the same slug as the
 * dark picker (can happen on 2-color themes), return palette[1] — the second-
 * darkest entry — which is guaranteed to differ from both the darkest and, on
 * palettes with > 2 entries, the lightest.
 *
 * @param list<array{slug:string,color:string}> $palette Luminance-sorted palette.
 */
function aldus_pick_accent( array $palette ): string {
	$count = count( $palette );

	if ( $count < 3 ) {
		return sanitize_html_class( $palette[ (int) floor( $count / 2 ) ]['slug'] ?? 'primary' );
	}

	// Candidates: everything between the darkest (index 0) and lightest (last).
	$candidates = array_slice( $palette, 1, $count - 2 );

	if ( ! empty( $candidates ) ) {
		// Sort by HSL saturation descending — most vivid first.
		usort(
			$candidates,
			static fn( array $a, array $b ) =>
				aldus_hex_saturation( $b['color'] ?? '' ) <=> aldus_hex_saturation( $a['color'] ?? '' )
		);

		// Pick the most saturated entry that achieves WCAG AA (4.5:1) contrast
		// with either white or black, so generated text is always readable.
		foreach ( $candidates as $entry ) {
			$lum = aldus_hex_luminance( $entry['color'] ?? '#888' );
			if (
				aldus_contrast_ratio( $lum, 1.0 ) >= 4.5 ||
				aldus_contrast_ratio( $lum, 0.0 ) >= 4.5
			) {
				return sanitize_html_class( $entry['slug'] ?? 'primary' );
			}
		}

		// No candidate passes WCAG AA — return the most saturated one anyway.
		return sanitize_html_class( $candidates[0]['slug'] ?? 'primary' );
	}

	// Fallback (< 3 usable candidates after slicing): luminance closest to 40%.
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
	$accent = sanitize_html_class( $best['slug'] ?? 'primary' );

	// Minimal-palette guard: if the luminance search picked the darkest color,
	// fall back to palette[1] (second-darkest) rather than the lightest — it is
	// guaranteed to differ from the darkest while avoiding light-on-light risk.
	if ( aldus_palette_is_minimal( $palette ) && $accent === aldus_pick_dark( $palette ) ) {
		return sanitize_html_class( $palette[1]['slug'] ?? $palette[0]['slug'] ?? 'primary' );
	}

	return $accent;
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
	$cache_key = 'aldus_gradients_' . aldus_theme_cache_suffix();
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
// Shadow presets
// ---------------------------------------------------------------------------

/**
 * Returns the active theme's shadow presets.
 *
 * WordPress ships 5 defaults (Natural, Deep, Sharp, Outlined, Crisp) via
 * `shadow.presets` in theme.json (stable since WP 6.2). Themes may override
 * or extend them. Returns the theme-defined presets when available, falling
 * back to the core defaults, and ultimately to an empty array.
 *
 * @return list<array{slug:string, shadow:string}>
 */
function aldus_get_theme_shadows(): array {
	$cache_key = 'aldus_shadows_' . aldus_theme_cache_suffix();
	$cached    = wp_cache_get( $cache_key, 'aldus' );
	if ( false !== $cached ) {
		return (array) $cached;
	}

	$settings = wp_get_global_settings( array( 'shadow', 'presets' ) );
	if ( is_wp_error( $settings ) || ! is_array( $settings ) ) {
		$settings = array();
	}
	$presets = $settings['theme'] ?? $settings['default'] ?? array();

	// Keep only entries that have both slug and shadow value.
	$presets = array_values(
		array_filter(
			$presets,
			fn( $p ) => is_array( $p ) && ! empty( $p['slug'] ) && ! empty( $p['shadow'] )
		)
	);

	wp_cache_set( $cache_key, $presets, 'aldus', HOUR_IN_SECONDS );
	return $presets;
}

/**
 * Picks a shadow preset CSS var for a given visual weight preference.
 *
 * Preference 'soft' picks the lightest shadow (smallest box-shadow spread
 * / alpha); preference 'deep' picks the most dramatic. When no presets
 * exist the function returns an empty string (no shadow).
 *
 * The heuristic reads the `shadow` CSS value and scores it by the first
 * rgba/hsla alpha component or a fixed keyword.  This is intentionally
 * approximate — the goal is a "lighter vs heavier" ordering, not pixel-
 * perfect measurement.
 *
 * @param list<array{slug:string, shadow:string}> $presets Shadow preset list.
 * @param string                                  $preference 'soft' | 'deep'
 * @return string CSS var reference or empty string.
 */
function aldus_pick_shadow( array $presets, string $preference = 'soft' ): string {
	if ( empty( $presets ) ) {
		return '';
	}

	// First try known WP default slugs that map well to the two preferences.
	$soft_slugs = array( 'natural', 'outlined', 'crisp' );
	$deep_slugs = array( 'deep', 'sharp' );

	$priority = 'deep' === $preference ? $deep_slugs : $soft_slugs;
	$fallback = 'deep' === $preference ? $soft_slugs : $deep_slugs;

	foreach ( $priority as $target ) {
		foreach ( $presets as $p ) {
			if ( sanitize_html_class( $p['slug'] ) === $target ) {
				return 'var(--wp--preset--shadow--' . sanitize_html_class( $p['slug'] ) . ')';
			}
		}
	}
	// No priority slug found — fall back to any matching fallback group slug.
	foreach ( $fallback as $target ) {
		foreach ( $presets as $p ) {
			if ( sanitize_html_class( $p['slug'] ) === $target ) {
				return 'var(--wp--preset--shadow--' . sanitize_html_class( $p['slug'] ) . ')';
			}
		}
	}
	// Last resort: use the first (soft) or last (deep) preset.
	$index = 'deep' === $preference ? count( $presets ) - 1 : 0;
	$slug  = sanitize_html_class( $presets[ $index ]['slug'] );
	return $slug ? "var(--wp--preset--shadow--{$slug})" : '';
}

// ---------------------------------------------------------------------------
// Font families and heading font detection
// ---------------------------------------------------------------------------

/**
 * Returns the active theme's font family presets (merged theme + default).
 *
 * Each entry is an associative array with at minimum `slug`, `name`, and
 * `fontFamily` (the CSS value). An optional `fontFace` key holds @font-face
 * declaration objects when the font is bundled with the theme.
 *
 * @return list<array{slug:string, name:string, fontFamily:string}>
 */
function aldus_get_theme_font_families(): array {
	$cache_key = 'aldus_font_families_' . aldus_theme_cache_suffix();
	$cached    = wp_cache_get( $cache_key, 'aldus' );
	if ( false !== $cached ) {
		return (array) $cached;
	}

	$settings = wp_get_global_settings( array( 'typography', 'fontFamilies' ) );
	if ( is_wp_error( $settings ) || ! is_array( $settings ) ) {
		$settings = array();
	}

	// Merge in priority order: theme first, then custom (user-installed), then
	// core defaults. Slug uniqueness is maintained — first occurrence wins.
	$merged = array();
	$seen   = array();
	foreach ( array( 'theme', 'custom', 'default' ) as $origin ) {
		foreach ( $settings[ $origin ] ?? array() as $fam ) {
			if ( ! is_array( $fam ) || empty( $fam['slug'] ) ) {
				continue;
			}
			$slug = sanitize_html_class( $fam['slug'] );
			if ( ! isset( $seen[ $slug ] ) ) {
				$seen[ $slug ] = true;
				$merged[]      = $fam;
			}
		}
	}

	wp_cache_set( $cache_key, $merged, 'aldus', HOUR_IN_SECONDS );
	return $merged;
}

/**
 * Returns the slug of the theme's heading font, or null when headings share
 * the body font.
 *
 * Detection strategy (in order):
 * 1. Read `styles.elements.heading.typography.fontFamily` via
 *    `wp_get_global_styles()` with variable resolution (WP 5.9+).
 * 2. Parse the preset reference: `var:preset|font-family|{slug}` or
 *    `var(--wp--preset--font-family--{slug})`.
 * 3. Compare slug to the body font slug resolved from root
 *    `styles.typography.fontFamily`.  Return `null` if they are the same.
 *
 * Returns `null` on WP < 5.9 or when no distinct heading font is defined.
 *
 * @return string|null Font family slug or null.
 */
function aldus_get_theme_heading_font_slug(): ?string {
	if ( ! function_exists( 'wp_get_global_styles' ) ) {
		return null;
	}

	$cache_key = 'aldus_heading_font_' . aldus_theme_cache_suffix();
	$cached    = wp_cache_get( $cache_key, 'aldus' );
	if ( false !== $cached ) {
		return ( 'null' === $cached ) ? null : (string) $cached;
	}

	/**
	 * Helper: extract slug from a font-family CSS var reference.
	 *
	 * @param mixed $value
	 * @return string|null
	 */
	$extract_slug = function ( $value ): ?string {
		if ( ! is_string( $value ) || '' === $value ) {
			return null;
		}
		// Serialized theme.json form: "var:preset|font-family|{slug}"
		if ( preg_match( '/^var:preset\|font-family\|(.+)$/', $value, $m ) ) {
			return sanitize_html_class( $m[1] );
		}
		// CSS custom property form: "var(--wp--preset--font-family--{slug})"
		if ( preg_match( '/var\(--wp--preset--font-family--([^)]+)\)/', $value, $m ) ) {
			return sanitize_html_class( $m[1] );
		}
		return null;
	};

	$heading_raw  = wp_get_global_styles(
		array( 'elements', 'heading', 'typography', 'fontFamily' )
	);
	$heading_slug = $extract_slug( $heading_raw );

	// No heading font defined at the element level.
	if ( null === $heading_slug ) {
		wp_cache_set( $cache_key, 'null', 'aldus', HOUR_IN_SECONDS );
		return null;
	}

	// Compare against the body/root font slug.
	$body_raw  = wp_get_global_styles( array( 'typography', 'fontFamily' ) );
	$body_slug = $extract_slug( $body_raw );

	if ( null !== $body_slug && $body_slug === $heading_slug ) {
		// Heading font is the same as body font — no distinct pairing.
		wp_cache_set( $cache_key, 'null', 'aldus', HOUR_IN_SECONDS );
		return null;
	}

	wp_cache_set( $cache_key, $heading_slug, 'aldus', HOUR_IN_SECONDS );
	return $heading_slug;
}

// ---------------------------------------------------------------------------
// Element-level and per-block styles
// ---------------------------------------------------------------------------

/**
 * Returns the resolved global styles for a given element type.
 *
 * Supported $element values (following theme.json): 'heading', 'button',
 * 'link', 'caption', 'cite'.  Returns an empty array on WP < 5.9 or when
 * no element styles are defined.
 *
 * Pass `'transforms' => ['resolve-variables']` so callers receive actual
 * hex/rem values rather than CSS var() references — this is used when Aldus
 * needs to make design decisions (e.g. dark vs light text), not to produce
 * block markup (which should reference vars, not resolved values).
 *
 * @param string $element Element name: 'heading' | 'button' | 'link' | etc.
 * @return array<string, mixed>
 */
function aldus_get_theme_element_styles( string $element ): array {
	if ( ! function_exists( 'wp_get_global_styles' ) ) {
		return array();
	}
	$element = sanitize_key( $element );
	if ( '' === $element ) {
		return array();
	}
	$styles = wp_get_global_styles(
		array( 'elements', $element ),
		array( 'transforms' => array( 'resolve-variables' ) )
	);
	return is_array( $styles ) ? $styles : array();
}

/**
 * Returns the resolved global styles for a specific block type.
 *
 * Uses `wp_get_global_styles()` with `block_name` context so the returned
 * values already reflect any block-scoped theme overrides.
 *
 * Useful for detecting the Cover block's overlay color, the Pullquote
 * border color, or the Group block's background as defined in theme.json.
 *
 * @param string $block_name Full block name, e.g. 'core/cover'.
 * @return array<string, mixed>
 */
function aldus_get_theme_block_styles( string $block_name ): array {
	if ( ! function_exists( 'wp_get_global_styles' ) ) {
		return array();
	}
	$block_name = sanitize_text_field( $block_name );
	if ( '' === $block_name ) {
		return array();
	}
	$styles = wp_get_global_styles(
		array(),
		array(
			'block_name' => $block_name,
			'transforms' => array( 'resolve-variables' ),
		)
	);
	return is_array( $styles ) ? $styles : array();
}

/**
 * Returns the Cover block's theme-defined overlay color or gradient CSS value.
 *
 * Reads `styles.blocks.core/cover.color.background` (solid color) or
 * `styles.blocks.core/cover.color.gradient` from the active theme.json.
 * Returns `null` when neither is defined — in that case the cover renderer
 * keeps its default overlay.
 *
 * The result is cached for HOUR_IN_SECONDS.
 *
 * @return string|null CSS value (hex, hsl, or gradient string) or null.
 */
function aldus_get_theme_cover_overlay(): ?string {
	$cache_key = 'aldus_cover_overlay_' . aldus_theme_cache_suffix();
	$cached    = wp_cache_get( $cache_key, 'aldus' );
	if ( false !== $cached ) {
		return ( 'null' === $cached ) ? null : (string) $cached;
	}

	$styles  = aldus_get_theme_block_styles( 'core/cover' );
	$overlay = $styles['color']['background'] ?? $styles['color']['gradient'] ?? null;

	// Only return a non-empty string.
	if ( ! is_string( $overlay ) || '' === trim( $overlay ) ) {
		$overlay = null;
	}

	wp_cache_set( $cache_key, $overlay ?? 'null', 'aldus', HOUR_IN_SECONDS );
	return $overlay;
}

// ---------------------------------------------------------------------------
// Section styles (WP 6.6+)
// ---------------------------------------------------------------------------

/**
 * Returns the registered block styles for `core/group` that qualify as
 * section-level style variations (introduced in WordPress 6.6).
 *
 * Each entry is a minimal array with `name` (slug) and `label` (human-
 * readable name) plus an optional `style_data` key when available.
 *
 * Guarded by `class_exists` + `method_exists` so it runs safely on older WP.
 * Returns an empty array when the registry is unavailable.
 *
 * @return list<array{name:string, label:string}>
 */
function aldus_get_theme_section_styles(): array {
	if (
		! class_exists( 'WP_Block_Styles_Registry' )
		|| ! method_exists( 'WP_Block_Styles_Registry', 'get_instance' )
	) {
		return array();
	}

	$registry = WP_Block_Styles_Registry::get_instance();
	if ( ! method_exists( $registry, 'get_registered_styles_for_block' ) ) {
		return array();
	}

	$raw = $registry->get_registered_styles_for_block( 'core/group' );
	if ( ! is_array( $raw ) ) {
		return array();
	}

	$styles = array();
	foreach ( $raw as $style ) {
		if ( empty( $style['name'] ) ) {
			continue;
		}
		$entry = array(
			'name'  => (string) $style['name'],
			'label' => (string) ( $style['label'] ?? $style['name'] ),
		);
		if ( isset( $style['style_data'] ) && is_array( $style['style_data'] ) ) {
			$entry['style_data'] = $style['style_data'];
		}
		$styles[] = $entry;
	}
	return $styles;
}

/**
 * Picks the most appropriate section style name (slug) for a given intent.
 *
 * Matching strategy:
 * - For 'dark': looks for styles whose label contains dark/contrast/inverse,
 *   or whose style_data sets a dark color background.
 * - For 'light': labels containing light/subtle/muted.
 * - For 'accent': labels containing accent/vibrant/bold.
 *
 * Returns the matching style's `name` (slug), or `null` when no match is
 * found.  Callers apply the slug as `is-style-{slug}` on the Group block.
 *
 * @param list<array{name:string, label:string}> $available_styles
 * @param string                                 $intent 'dark' | 'light' | 'accent'
 * @return string|null Section style slug or null.
 */
function aldus_pick_section_style( array $available_styles, string $intent = 'dark' ): ?string {
	if ( empty( $available_styles ) ) {
		return null;
	}

	$keywords = array(
		'dark'   => array( 'dark', 'contrast', 'inverse', 'night', 'black' ),
		'light'  => array( 'light', 'subtle', 'muted', 'soft', 'pale' ),
		'accent' => array( 'accent', 'vibrant', 'bold', 'vivid', 'primary' ),
	);

	$targets = $keywords[ $intent ] ?? $keywords['dark'];

	foreach ( $available_styles as $style ) {
		$label_lower = strtolower( $style['label'] ?? '' );
		$name_lower  = strtolower( $style['name'] ?? '' );
		foreach ( $targets as $kw ) {
			if ( str_contains( $label_lower, $kw ) || str_contains( $name_lower, $kw ) ) {
				return (string) $style['name'];
			}
		}
	}
	return null;
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
	// Use group flush when the object cache backend supports it (Redis, Memcached
	// with grouping); otherwise fall back to individual key deletes so every
	// known key is explicitly invalidated.
	if ( function_exists( 'wp_cache_flush_group' ) ) {
		wp_cache_flush_group( 'aldus' );
		return;
	}

	$v = aldus_theme_cache_suffix();
	wp_cache_delete( 'aldus_palette_' . $v, 'aldus' );
	wp_cache_delete( 'aldus_font_sizes_' . $v, 'aldus' );
	wp_cache_delete( 'aldus_gradients_' . $v, 'aldus' );
	wp_cache_delete( 'aldus_shadows_' . $v, 'aldus' );
	wp_cache_delete( 'aldus_font_families_' . $v, 'aldus' );
	wp_cache_delete( 'aldus_heading_font_' . $v, 'aldus' );
	wp_cache_delete( 'aldus_cover_overlay_' . $v, 'aldus' );
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
