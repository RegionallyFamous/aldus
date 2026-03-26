<?php
declare(strict_types=1);
/**
 * Aldus expanded block pattern library.
 *
 * Registers 17 curated patterns across 5 categories: hero, content, media,
 * typography, and structural. All patterns are theme-aware and use color
 * slugs from the active theme palette wherever possible.
 *
 * Hooked to 'init' at priority 12 so it runs after the base pattern
 * registration at priority 11.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'init', 'aldus_register_pattern_library', 12 );

/**
 * Registers all patterns from the Aldus pattern library.
 */
function aldus_register_pattern_library(): void {
	if ( ! function_exists( 'register_block_pattern' ) ) {
		return;
	}

	$definitions = aldus_get_pattern_definitions();

	foreach ( $definitions as $def ) {
		if ( empty( $def['slug'] ) || empty( $def['content'] ) ) {
			continue;
		}
		register_block_pattern(
			'aldus/' . $def['slug'],
			array(
				'title'       => $def['title'],
				'description' => $def['description'] ?? '',
				'keywords'    => $def['keywords'] ?? array(),
				'categories'  => array( 'aldus', $def['category'] ?? 'text' ),
				'content'     => $def['content'],
			)
		);
	}
}

/**
 * Returns all pattern definitions.
 *
 * @return array<int, array<string, mixed>>
 */
function aldus_get_pattern_definitions(): array {
	return array(
		// ── Hero ────────────────────────────────────────────────────────────
		array(
			'slug'        => 'hero-dark-cover',
			'title'       => __( 'Hero: Dark full-bleed cover', 'aldus' ),
			'description' => __( 'A dark full-bleed cover with a headline and CTA.', 'aldus' ),
			'keywords'    => array( 'hero', 'cover', 'dark', 'landing' ),
			'category'    => 'aldus',
			'content'     => aldus_pattern_hero_dark_cover(),
		),
		array(
			'slug'        => 'hero-light-split',
			'title'       => __( 'Hero: Split cover — text left, image right', 'aldus' ),
			'description' => __( 'A split hero with text on the left and an image on the right.', 'aldus' ),
			'keywords'    => array( 'hero', 'split', 'cover', 'two-column' ),
			'category'    => 'aldus',
			'content'     => aldus_pattern_hero_light_split(),
		),
		array(
			'slug'        => 'hero-minimal-headline',
			'title'       => __( 'Hero: Minimal centered headline', 'aldus' ),
			'description' => __( 'A clean, minimal centered headline section.', 'aldus' ),
			'keywords'    => array( 'hero', 'minimal', 'headline', 'centered' ),
			'category'    => 'aldus',
			'content'     => aldus_pattern_hero_minimal_headline(),
		),

		// ── Content ─────────────────────────────────────────────────────────
		array(
			'slug'        => 'content-article-intro',
			'title'       => __( 'Content: Article intro with dropcap', 'aldus' ),
			'description' => __( 'A kicker, headline, and opening paragraph with drop cap.', 'aldus' ),
			'keywords'    => array( 'article', 'intro', 'dropcap', 'editorial' ),
			'category'    => 'aldus',
			'content'     => aldus_pattern_content_article_intro(),
		),
		array(
			'slug'        => 'content-feature-pull',
			'title'       => __( 'Content: Feature story with pullquote', 'aldus' ),
			'description' => __( 'Two paragraphs flanking a wide pullquote.', 'aldus' ),
			'keywords'    => array( 'feature', 'pullquote', 'article', 'magazine' ),
			'category'    => 'aldus',
			'content'     => aldus_pattern_content_feature_pull(),
		),
		array(
			'slug'        => 'content-two-column-text',
			'title'       => __( 'Content: Two-column text layout', 'aldus' ),
			'description' => __( 'A headline above a 50/50 split paragraph block.', 'aldus' ),
			'keywords'    => array( 'two-column', 'text', 'columns', 'magazine' ),
			'category'    => 'aldus',
			'content'     => aldus_pattern_content_two_column_text(),
		),
		array(
			'slug'        => 'content-cta-section',
			'title'       => __( 'Content: Call-to-action band', 'aldus' ),
			'description' => __( 'A full-width accent-color band with a headline and button.', 'aldus' ),
			'keywords'    => array( 'cta', 'button', 'action', 'band', 'landing' ),
			'category'    => 'aldus',
			'content'     => aldus_pattern_content_cta_section(),
		),

		// ── Media ───────────────────────────────────────────────────────────
		array(
			'slug'        => 'media-image-text-left',
			'title'       => __( 'Media: Image left, text right', 'aldus' ),
			'description' => __( 'A media-text block with the image on the left.', 'aldus' ),
			'keywords'    => array( 'image', 'media', 'feature', 'two-column' ),
			'category'    => 'aldus',
			'content'     => aldus_pattern_media_image_text_left(),
		),
		array(
			'slug'        => 'media-image-text-right',
			'title'       => __( 'Media: Text left, image right', 'aldus' ),
			'description' => __( 'A media-text block with the image on the right.', 'aldus' ),
			'keywords'    => array( 'image', 'media', 'feature', 'two-column' ),
			'category'    => 'aldus',
			'content'     => aldus_pattern_media_image_text_right(),
		),
		array(
			'slug'        => 'media-full-width-image',
			'title'       => __( 'Media: Full-width image with caption', 'aldus' ),
			'description' => __( 'A full-width aligned image with a centered caption.', 'aldus' ),
			'keywords'    => array( 'image', 'full-width', 'caption', 'photo' ),
			'category'    => 'aldus',
			'content'     => aldus_pattern_media_full_width_image(),
		),
		array(
			'slug'        => 'media-gallery-three-column',
			'title'       => __( 'Media: Three-column gallery', 'aldus' ),
			'description' => __( 'A 3-column image gallery for portfolio or feature pages.', 'aldus' ),
			'keywords'    => array( 'gallery', 'photos', 'grid', 'portfolio' ),
			'category'    => 'aldus',
			'content'     => aldus_pattern_media_gallery_three_column(),
		),

		// ── Typography ──────────────────────────────────────────────────────
		array(
			'slug'        => 'typography-display-opening',
			'title'       => __( 'Typography: Display headline opening', 'aldus' ),
			'description' => __( 'An oversized display heading with a subheading and spacer.', 'aldus' ),
			'keywords'    => array( 'display', 'headline', 'typography', 'opening' ),
			'category'    => 'aldus',
			'content'     => aldus_pattern_typography_display_opening(),
		),
		array(
			'slug'        => 'typography-kicker-headline',
			'title'       => __( 'Typography: Kicker + headline stack', 'aldus' ),
			'description' => __( 'A category kicker label above a large headline.', 'aldus' ),
			'keywords'    => array( 'kicker', 'headline', 'category', 'label' ),
			'category'    => 'aldus',
			'content'     => aldus_pattern_typography_kicker_headline(),
		),
		array(
			'slug'        => 'typography-centered-pullquote',
			'title'       => __( 'Typography: Centered pullquote', 'aldus' ),
			'description' => __( 'A centered, full-solid pullquote for emphasis.', 'aldus' ),
			'keywords'    => array( 'pullquote', 'quote', 'centered', 'emphasis' ),
			'category'    => 'aldus',
			'content'     => aldus_pattern_typography_centered_pullquote(),
		),

		// ── Structural ──────────────────────────────────────────────────────
		array(
			'slug'        => 'structural-dark-section',
			'title'       => __( 'Structural: Dark full-width section', 'aldus' ),
			'description' => __( 'A dark background group section for contrast and emphasis.', 'aldus' ),
			'keywords'    => array( 'dark', 'section', 'contrast', 'group' ),
			'category'    => 'aldus',
			'content'     => aldus_pattern_structural_dark_section(),
		),
		array(
			'slug'        => 'structural-three-column-features',
			'title'       => __( 'Structural: Three-column feature list', 'aldus' ),
			'description' => __( 'Three equal columns with a heading and text in each.', 'aldus' ),
			'keywords'    => array( 'features', 'three-column', 'grid', 'services' ),
			'category'    => 'aldus',
			'content'     => aldus_pattern_structural_three_column_features(),
		),
		array(
			'slug'        => 'structural-separator-spacer',
			'title'       => __( 'Structural: Separator + spacer divider', 'aldus' ),
			'description' => __( 'A visual break between sections using a separator and spacer.', 'aldus' ),
			'keywords'    => array( 'separator', 'spacer', 'divider', 'break' ),
			'category'    => 'aldus',
			'content'     => aldus_pattern_structural_separator_spacer(),
		),
	);
}

// ── Pattern builder functions ────────────────────────────────────────────────

/**
 * Returns the block markup for the "Hero: Dark full-bleed cover" pattern.
 *
 * @return string Block HTML.
 */
function aldus_pattern_hero_dark_cover(): string {
	return '<!-- wp:cover {"dimRatio":70,"overlayColor":"contrast","isDark":true,"align":"full"} -->'
		. '<div class="wp-block-cover alignfull is-dark"><span aria-hidden="true" class="wp-block-cover__background has-contrast-background-color has-background-dim-70 has-background-dim"></span>'
		. '<div class="wp-block-cover__inner-container">'
		. '<!-- wp:heading {"textAlign":"center","level":1,"textColor":"base","style":{"typography":{"fontSize":"clamp(2.5rem,6vw,5rem)"}}} -->'
		. '<h1 class="wp-block-heading has-text-align-center has-base-color has-text-color">Your compelling headline here</h1>'
		. '<!-- /wp:heading -->'
		. '<!-- wp:paragraph {"align":"center","textColor":"base","style":{"typography":{"fontSize":"1.125rem"}}} -->'
		. '<p class="has-text-align-center has-base-color has-text-color">A short description that draws the reader in and sets the scene.</p>'
		. '<!-- /wp:paragraph -->'
		. '<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->'
		. '<div class="wp-block-buttons">'
		. '<!-- wp:button {"backgroundColor":"primary","textColor":"base"} -->'
		. '<div class="wp-block-button"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button">Get started</a></div>'
		. '<!-- /wp:button -->'
		. '</div>'
		. '<!-- /wp:buttons -->'
		. '</div></div><!-- /wp:cover -->';
}

/**
 * Returns the block markup for the "Hero: Split cover" pattern.
 *
 * @return string Block HTML.
 */
function aldus_pattern_hero_light_split(): string {
	return '<!-- wp:media-text {"mediaPosition":"right","mediaWidth":50,"verticalAlignment":"center"} -->'
		. '<div class="wp-block-media-text alignwide is-stacked-on-mobile has-media-on-the-right" style="grid-template-columns:1fr 50%">'
		. '<div class="wp-block-media-text__content">'
		. '<!-- wp:heading {"level":1} -->'
		. '<h1 class="wp-block-heading">A bold headline for your hero section</h1>'
		. '<!-- /wp:heading -->'
		. '<!-- wp:paragraph {"style":{"typography":{"fontSize":"1.125rem"}}} -->'
		. '<p>Lead with the most important thing you want your visitor to know. One or two sentences.</p>'
		. '<!-- /wp:paragraph -->'
		. '<!-- wp:buttons -->'
		. '<div class="wp-block-buttons">'
		. '<!-- wp:button -->'
		. '<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Primary action</a></div>'
		. '<!-- /wp:button -->'
		. '</div>'
		. '<!-- /wp:buttons -->'
		. '</div>'
		. '<figure class="wp-block-media-text__media"></figure>'
		. '</div><!-- /wp:media-text -->';
}

/**
 * Returns the block markup for the "Hero: Minimal centered headline" pattern.
 *
 * @return string Block HTML.
 */
function aldus_pattern_hero_minimal_headline(): string {
	return '<!-- wp:spacer {"height":"80px"} -->'
		. '<div style="height:80px" aria-hidden="true" class="wp-block-spacer"></div>'
		. '<!-- /wp:spacer -->'
		. '<!-- wp:heading {"textAlign":"center","level":1,"style":{"typography":{"fontSize":"clamp(2rem,5vw,4rem)"}}} -->'
		. '<h1 class="wp-block-heading has-text-align-center">A clean, minimal headline</h1>'
		. '<!-- /wp:heading -->'
		. '<!-- wp:paragraph {"align":"center","style":{"typography":{"fontSize":"1.125rem"},"color":{"text":"#6b7280"}}} -->'
		. '<p class="has-text-align-center has-text-color">A short subheading or tagline that adds context without clutter.</p>'
		. '<!-- /wp:paragraph -->'
		. '<!-- wp:spacer {"height":"80px"} -->'
		. '<div style="height:80px" aria-hidden="true" class="wp-block-spacer"></div>'
		. '<!-- /wp:spacer -->';
}

/**
 * Returns the block markup for the "Content: Article intro with dropcap" pattern.
 *
 * @return string Block HTML.
 */
function aldus_pattern_content_article_intro(): string {
	return '<!-- wp:paragraph {"style":{"typography":{"fontSize":"0.75rem","fontStyle":"normal","fontWeight":"700","letterSpacing":"0.1em","textTransform":"uppercase"},"color":{"text":"#9ca3af"}}} -->'
		. '<p class="has-text-color" style="color:#9ca3af;font-size:0.75rem;font-style:normal;font-weight:700;letter-spacing:0.1em;text-transform:uppercase">Culture &amp; Ideas</p>'
		. '<!-- /wp:paragraph -->'
		. '<!-- wp:heading {"level":1,"style":{"typography":{"fontSize":"clamp(1.75rem,4vw,3rem)"}}} -->'
		. '<h1 class="wp-block-heading">The article headline goes here — make it count</h1>'
		. '<!-- /wp:heading -->'
		. '<!-- wp:paragraph {"dropCap":true} -->'
		. '<p class="has-drop-cap">The opening paragraph leads with a drop cap and sets the tone for the piece. This is where you hook the reader — give them a reason to keep going. Write as if the next sentence depends on this one.</p>'
		. '<!-- /wp:paragraph -->';
}

/**
 * Returns the block markup for the "Content: Feature story with pullquote" pattern.
 *
 * @return string Block HTML.
 */
function aldus_pattern_content_feature_pull(): string {
	return '<!-- wp:paragraph -->'
		. '<p>Open with context. This paragraph sets up the story and introduces the main subject. Keep it tight — one strong idea per paragraph.</p>'
		. '<!-- /wp:paragraph -->'
		. '<!-- wp:pullquote {"align":"wide","className":"is-style-solid-color"} -->'
		. '<figure class="wp-block-pullquote alignwide is-style-solid-color">'
		. '<blockquote><p>The most memorable sentence from the piece. Short, punchy, and worth repeating.</p>'
		. '<cite>— Source or context</cite></blockquote>'
		. '</figure><!-- /wp:pullquote -->'
		. '<!-- wp:paragraph -->'
		. '<p>Continue the story here. Now that the pullquote has anchored the emotional beat, develop the idea further and build toward a conclusion.</p>'
		. '<!-- /wp:paragraph -->';
}

/**
 * Returns the block markup for the "Content: Two-column text layout" pattern.
 *
 * @return string Block HTML.
 */
function aldus_pattern_content_two_column_text(): string {
	return '<!-- wp:heading {"level":2} -->'
		. '<h2 class="wp-block-heading">A section heading for this two-column passage</h2>'
		. '<!-- /wp:heading -->'
		. '<!-- wp:columns {"align":"wide"} -->'
		. '<div class="wp-block-columns alignwide">'
		. '<!-- wp:column -->'
		. '<div class="wp-block-column">'
		. '<!-- wp:paragraph -->'
		. '<p>Left column copy. This layout works well for longer-form content where you want the page to breathe without sacrificing word count.</p>'
		. '<!-- /wp:paragraph -->'
		. '</div><!-- /wp:column -->'
		. '<!-- wp:column -->'
		. '<div class="wp-block-column">'
		. '<!-- wp:paragraph -->'
		. '<p>Right column copy. Keep both columns roughly equal in length so the visual balance holds. Readers scan columns faster than they read full-width paragraphs.</p>'
		. '<!-- /wp:paragraph -->'
		. '</div><!-- /wp:column -->'
		. '</div><!-- /wp:columns -->';
}

/**
 * Returns the block markup for the "Content: Call-to-action band" pattern.
 *
 * @return string Block HTML.
 */
function aldus_pattern_content_cta_section(): string {
	return '<!-- wp:group {"align":"full","backgroundColor":"contrast","textColor":"base","layout":{"type":"constrained"}} -->'
		. '<div class="wp-block-group alignfull has-base-color has-contrast-background-color has-text-color has-background">'
		. '<!-- wp:spacer {"height":"48px"} -->'
		. '<div style="height:48px" aria-hidden="true" class="wp-block-spacer"></div>'
		. '<!-- /wp:spacer -->'
		. '<!-- wp:heading {"textAlign":"center","textColor":"base"} -->'
		. '<h2 class="wp-block-heading has-text-align-center has-base-color has-text-color">Ready to get started?</h2>'
		. '<!-- /wp:heading -->'
		. '<!-- wp:paragraph {"align":"center","textColor":"base"} -->'
		. '<p class="has-text-align-center has-base-color has-text-color">One sentence that makes taking action feel easy and worthwhile.</p>'
		. '<!-- /wp:paragraph -->'
		. '<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->'
		. '<div class="wp-block-buttons">'
		. '<!-- wp:button {"backgroundColor":"primary"} -->'
		. '<div class="wp-block-button"><a class="wp-block-button__link has-primary-background-color has-background wp-element-button">Take action now</a></div>'
		. '<!-- /wp:button -->'
		. '</div>'
		. '<!-- /wp:buttons -->'
		. '<!-- wp:spacer {"height":"48px"} -->'
		. '<div style="height:48px" aria-hidden="true" class="wp-block-spacer"></div>'
		. '<!-- /wp:spacer -->'
		. '</div><!-- /wp:group -->';
}

/**
 * Returns the block markup for the "Media: Image left, text right" pattern.
 *
 * @return string Block HTML.
 */
function aldus_pattern_media_image_text_left(): string {
	return '<!-- wp:media-text {"mediaPosition":"left","mediaWidth":50,"verticalAlignment":"center"} -->'
		. '<div class="wp-block-media-text alignwide is-stacked-on-mobile" style="grid-template-columns:50% 1fr">'
		. '<figure class="wp-block-media-text__media"></figure>'
		. '<div class="wp-block-media-text__content">'
		. '<!-- wp:heading {"level":2} -->'
		. '<h2 class="wp-block-heading">Section heading beside the image</h2>'
		. '<!-- /wp:heading -->'
		. '<!-- wp:paragraph -->'
		. '<p>Descriptive copy that accompanies the image. Use this layout when the visual and the text need equal weight on the page.</p>'
		. '<!-- /wp:paragraph -->'
		. '</div>'
		. '</div><!-- /wp:media-text -->';
}

/**
 * Returns the block markup for the "Media: Text left, image right" pattern.
 *
 * @return string Block HTML.
 */
function aldus_pattern_media_image_text_right(): string {
	return '<!-- wp:media-text {"mediaPosition":"right","mediaWidth":50,"verticalAlignment":"center"} -->'
		. '<div class="wp-block-media-text alignwide is-stacked-on-mobile has-media-on-the-right" style="grid-template-columns:1fr 50%">'
		. '<div class="wp-block-media-text__content">'
		. '<!-- wp:heading {"level":2} -->'
		. '<h2 class="wp-block-heading">Section heading with image on the right</h2>'
		. '<!-- /wp:heading -->'
		. '<!-- wp:paragraph -->'
		. '<p>Text-first layout that leads with the written content and uses the image to reinforce the message visually.</p>'
		. '<!-- /wp:paragraph -->'
		. '</div>'
		. '<figure class="wp-block-media-text__media"></figure>'
		. '</div><!-- /wp:media-text -->';
}

/**
 * Returns the block markup for the "Media: Full-width image with caption" pattern.
 *
 * @return string Block HTML.
 */
function aldus_pattern_media_full_width_image(): string {
	return '<!-- wp:image {"align":"full","sizeSlug":"full","linkDestination":"none"} -->'
		. '<figure class="wp-block-image alignfull size-full">'
		. '<img src="" alt="" />'
		. '<figcaption class="wp-element-caption has-text-align-center">Image caption — describe what\'s happening here</figcaption>'
		. '</figure><!-- /wp:image -->';
}

/**
 * Returns the block markup for the "Media: Three-column gallery" pattern.
 *
 * @return string Block HTML.
 */
function aldus_pattern_media_gallery_three_column(): string {
	return '<!-- wp:gallery {"columns":3,"linkTo":"none","align":"wide"} -->'
		. '<figure class="wp-block-gallery alignwide has-nested-images columns-3 is-cropped">'
		. '<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->'
		. '<figure class="wp-block-image size-large"><img src="" alt="" /></figure>'
		. '<!-- /wp:image -->'
		. '<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->'
		. '<figure class="wp-block-image size-large"><img src="" alt="" /></figure>'
		. '<!-- /wp:image -->'
		. '<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} -->'
		. '<figure class="wp-block-image size-large"><img src="" alt="" /></figure>'
		. '<!-- /wp:image -->'
		. '</figure><!-- /wp:gallery -->';
}

/**
 * Returns the block markup for the "Typography: Display headline opening" pattern.
 *
 * @return string Block HTML.
 */
function aldus_pattern_typography_display_opening(): string {
	return '<!-- wp:spacer {"height":"40px"} -->'
		. '<div style="height:40px" aria-hidden="true" class="wp-block-spacer"></div>'
		. '<!-- /wp:spacer -->'
		. '<!-- wp:heading {"textAlign":"center","level":1,"style":{"typography":{"fontSize":"clamp(3rem,8vw,7rem)","lineHeight":"1","fontWeight":"900","letterSpacing":"-0.03em"}}} -->'
		. '<h1 class="wp-block-heading has-text-align-center">Display</h1>'
		. '<!-- /wp:heading -->'
		. '<!-- wp:heading {"textAlign":"center","level":2,"style":{"typography":{"fontSize":"clamp(1rem,2.5vw,1.5rem)","fontWeight":"400","letterSpacing":"0.05em","textTransform":"uppercase"},"color":{"text":"#9ca3af"}}} -->'
		. '<h2 class="wp-block-heading has-text-align-center has-text-color" style="color:#9ca3af;font-size:clamp(1rem,2.5vw,1.5rem);font-weight:400;letter-spacing:0.05em;text-transform:uppercase">Subheading in restrained contrast</h2>'
		. '<!-- /wp:heading -->'
		. '<!-- wp:spacer {"height":"40px"} -->'
		. '<div style="height:40px" aria-hidden="true" class="wp-block-spacer"></div>'
		. '<!-- /wp:spacer -->';
}

/**
 * Returns the block markup for the "Typography: Kicker + headline stack" pattern.
 *
 * @return string Block HTML.
 */
function aldus_pattern_typography_kicker_headline(): string {
	return '<!-- wp:paragraph {"style":{"typography":{"fontSize":"0.75rem","fontWeight":"700","letterSpacing":"0.12em","textTransform":"uppercase"},"color":{"text":"#6b7280"}}} -->'
		. '<p class="has-text-color" style="color:#6b7280;font-size:0.75rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase">Category · Topic</p>'
		. '<!-- /wp:paragraph -->'
		. '<!-- wp:heading {"level":1,"style":{"typography":{"fontSize":"clamp(2rem,5vw,3.5rem)","lineHeight":"1.1"}}} -->'
		. '<h1 class="wp-block-heading">The main headline follows the kicker and can run long</h1>'
		. '<!-- /wp:heading -->';
}

/**
 * Returns the block markup for the "Typography: Centered pullquote" pattern.
 *
 * @return string Block HTML.
 */
function aldus_pattern_typography_centered_pullquote(): string {
	return '<!-- wp:pullquote {"textAlign":"center","align":"full","className":"is-style-solid-color"} -->'
		. '<figure class="wp-block-pullquote alignfull is-style-solid-color has-text-align-center">'
		. '<blockquote>'
		. '<p>A sentence worth pausing on. Something true and a little unexpected.</p>'
		. '<cite>— Attribution or context</cite>'
		. '</blockquote>'
		. '</figure><!-- /wp:pullquote -->';
}

/**
 * Returns the block markup for the "Structural: Dark full-width section" pattern.
 *
 * @return string Block HTML.
 */
function aldus_pattern_structural_dark_section(): string {
	return '<!-- wp:group {"align":"full","backgroundColor":"contrast","textColor":"base","layout":{"type":"constrained"}} -->'
		. '<div class="wp-block-group alignfull has-base-color has-contrast-background-color has-text-color has-background">'
		. '<!-- wp:spacer {"height":"56px"} -->'
		. '<div style="height:56px" aria-hidden="true" class="wp-block-spacer"></div>'
		. '<!-- /wp:spacer -->'
		. '<!-- wp:heading {"textColor":"base"} -->'
		. '<h2 class="wp-block-heading has-base-color has-text-color">Dark section heading</h2>'
		. '<!-- /wp:heading -->'
		. '<!-- wp:paragraph {"textColor":"base"} -->'
		. '<p class="has-base-color has-text-color">This section uses a dark background to create contrast and signal a tonal shift. Use it to separate major themes or for emphasis.</p>'
		. '<!-- /wp:paragraph -->'
		. '<!-- wp:spacer {"height":"56px"} -->'
		. '<div style="height:56px" aria-hidden="true" class="wp-block-spacer"></div>'
		. '<!-- /wp:spacer -->'
		. '</div><!-- /wp:group -->';
}

/**
 * Returns the block markup for the "Structural: Three-column feature list" pattern.
 *
 * @return string Block HTML.
 */
function aldus_pattern_structural_three_column_features(): string {
	return '<!-- wp:columns {"align":"wide"} -->'
		. '<div class="wp-block-columns alignwide">'
		. '<!-- wp:column -->'
		. '<div class="wp-block-column">'
		. '<!-- wp:heading {"level":3} -->'
		. '<h3 class="wp-block-heading">Feature one</h3>'
		. '<!-- /wp:heading -->'
		. '<!-- wp:paragraph -->'
		. '<p>A short description of this feature. Two to three sentences is plenty. Let the heading do the heavy lifting.</p>'
		. '<!-- /wp:paragraph -->'
		. '</div><!-- /wp:column -->'
		. '<!-- wp:column -->'
		. '<div class="wp-block-column">'
		. '<!-- wp:heading {"level":3} -->'
		. '<h3 class="wp-block-heading">Feature two</h3>'
		. '<!-- /wp:heading -->'
		. '<!-- wp:paragraph -->'
		. '<p>A short description of this feature. Keep these parallel in length so the three-column grid reads as a cohesive unit.</p>'
		. '<!-- /wp:paragraph -->'
		. '</div><!-- /wp:column -->'
		. '<!-- wp:column -->'
		. '<div class="wp-block-column">'
		. '<!-- wp:heading {"level":3} -->'
		. '<h3 class="wp-block-heading">Feature three</h3>'
		. '<!-- /wp:heading -->'
		. '<!-- wp:paragraph -->'
		. '<p>A short description of this feature. Three is the natural number for feature grids — enough to feel complete without overwhelming.</p>'
		. '<!-- /wp:paragraph -->'
		. '</div><!-- /wp:column -->'
		. '</div><!-- /wp:columns -->';
}

/**
 * Returns the block markup for the "Structural: Separator + spacer divider" pattern.
 *
 * @return string Block HTML.
 */
function aldus_pattern_structural_separator_spacer(): string {
	return '<!-- wp:spacer {"height":"32px"} -->'
		. '<div style="height:32px" aria-hidden="true" class="wp-block-spacer"></div>'
		. '<!-- /wp:spacer -->'
		. '<!-- wp:separator {"align":"wide"} -->'
		. '<hr class="wp-block-separator alignwide has-alpha-channel-opacity"/>'
		. '<!-- /wp:separator -->'
		. '<!-- wp:spacer {"height":"32px"} -->'
		. '<div style="height:32px" aria-hidden="true" class="wp-block-spacer"></div>'
		. '<!-- /wp:spacer -->';
}
