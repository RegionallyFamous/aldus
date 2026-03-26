<?php
declare(strict_types=1);
/**
 * Aldus block pattern registration.
 *
 * Registers one representative pattern per content pack using the Aldus
 * block pattern category.  Patterns surface Aldus in the block inserter's
 * Patterns tab so users can discover the plugin before they've ever added
 * the Aldus block.
 *
 * Each pattern is a lightweight editorial layout:
 *   cover:dark  →  heading:h2  →  paragraph  →  buttons:cta
 *
 * No LLM call is made — content is embedded statically from the JS packs.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'init', 'aldus_register_block_patterns', 11 );

/**
 * Registers one block pattern per Aldus content pack.
 *
 * Priority 11 so it runs after the aldus_register_block() call at priority 10.
 */
function aldus_register_block_patterns(): void {

	// Pack definitions — id, title, tagline, primary color (hex), CTA label.
	$packs = array(
		array(
			'id'      => 'roast',
			'title'   => 'Roast — Specialty Coffee',
			'tagline' => 'Life Is Too Short for Coffee That Tastes Like Regret.',
			'body'    => 'We fly to origin twice a year — not for the vibes, but because you can\'t judge'
				. ' a coffee from a sample bag and a spec sheet. You have to stand on the farm at sunrise and taste it fresh.',
			'cta'     => 'Shop the latest roast',
			'color'   => '#3B1F0A',
		),
		array(
			'id'      => 'meridian',
			'title'   => 'Meridian — Developer Platform',
			'tagline' => 'Ship Product. Not YAML.',
			'body'    => 'Meridian exists because we got tired of watching senior engineers spend their'
				. ' Thursdays debugging Terraform instead of building product. Connect your repo. Define your environments. Push.',
			'cta'     => 'Start deploying free',
			'color'   => '#0D1B2A',
		),
		array(
			'id'      => 'hearth',
			'title'   => 'Hearth — Nonprofit & Community',
			'tagline' => 'Nobody Builds a Neighborhood Alone.',
			'body'    => 'Hearth has been in the same six neighborhoods since 2009. We didn\'t parachute in'
				. ' with a press release and leave when the grant cycle ended. We stayed. We hired locally.',
			'cta'     => 'Donate to Hearth',
			'color'   => '#1A2E1A',
		),
		array(
			'id'      => 'plume',
			'title'   => 'Plume — Travel & Culture',
			'tagline' => "The Places That Change You Don't Have Gift Shops.",
			'body'    => 'The train from Sarajevo to Mostar takes two and a half hours and passes through'
				. ' scenery that doesn\'t fit on a phone screen. There are things you can\'t learn about a country at 35,000 feet.',
			'cta'     => 'Read the full dispatch',
			'color'   => '#1C1410',
		),
		array(
			'id'      => 'grove',
			'title'   => 'Grove — Farm-to-Table Produce',
			'tagline' => 'Your Tomato Flew Here from Chile. Ours Walked.',
			'body'    => 'Grove connects 34 small farms within 150 miles to people who want to eat what\'s'
				. ' actually growing right now — not what\'s available year-round because it was picked green in another hemisphere.',
			'cta'     => 'Start your first delivery',
			'color'   => '#1B2A0E',
		),
		array(
			'id'      => 'loot',
			'title'   => 'Loot — Indie Games',
			'tagline' => 'Built by Four People in a Garage. Loved by Thousands.',
			'body'    => 'Loot is a marketplace for indie games made by people who play too much and sleep'
				. ' too little. No algorithms, no pay-to-win mechanics, no games that mistake grinding for fun.',
			'cta'     => 'Browse the catalog',
			'color'   => '#0D0D1A',
		),
		array(
			'id'      => 'signal',
			'title'   => 'Signal — Private Email',
			'tagline' => "Email That Doesn't Read Your Email.",
			'body'    => 'Signal Mail is email the way it should have been built in the first place:'
				. ' encrypted, private, and completely uninterested in what you\'re writing. Your messages are yours. That\'s the whole product.',
			'cta'     => 'Try it free for 30 days',
			'color'   => '#0C0C0C',
		),
		array(
			'id'      => 'forge',
			'title'   => 'Forge — Industrial Craft',
			'tagline' => 'We Make Things That Outlast the People Who Buy Them.',
			'body'    => "We don't use computer-controlled presses. We use hammers. The reason isn't nostalgia"
				. " — it's that hammers leave a mark the metal remembers, and the metal is honest about it in ways that machines are not.",
			'cta'     => 'Commission a Piece',
			'color'   => '#1C1C1C',
		),
		array(
			'id'      => 'slim',
			'title'   => 'Slim — Minimal Layout',
			'tagline' => 'A Clear Idea Deserves a Clear Layout.',
			'body'    => 'Aldus works with whatever you bring. Six items is enough to see every personality\'s'
				. ' point of view — the way it balances your headline against an image, how it frames a quote, where it puts the call to action.',
			'cta'     => 'Add your content',
			'color'   => '#333333',
		),
	);

	foreach ( $packs as $pack ) {
		aldus_register_pack_pattern( $pack );
	}
}

/**
 * Builds and registers a single block pattern for one pack.
 *
 * Layout:  cover:dark  ·  heading:h2  ·  paragraph  ·  buttons:cta
 *
 * @param array{id:string,title:string,tagline:string,body:string,cta:string,color:string} $pack
 */
function aldus_register_pack_pattern( array $pack ): void {
	// Guard: require all mandatory fields to be non-empty strings.
	$required = array( 'id', 'title', 'tagline', 'body', 'cta', 'color' );
	foreach ( $required as $field ) {
		if ( empty( $pack[ $field ] ) || ! is_string( $pack[ $field ] ) ) {
			return;
		}
	}

	// Only use the color value as a CSS class slug when it is a valid hex code.
	$raw_color  = str_replace( '#', '', $pack['color'] );
	$color_safe = preg_match( '/^[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/', $raw_color )
		? sanitize_html_class( $raw_color )
		: 'primary';
	$color_attr = esc_attr( $pack['color'] );
	$overlay_id = 'aldus-pattern-overlay-' . sanitize_html_class( $pack['id'] );
	$tagline    = esc_html( $pack['tagline'] );
	$body       = esc_html( $pack['body'] );
	$cta_text   = esc_html( $pack['cta'] );

	// Build cover block HTML (dark overlay, no image, fullwidth heading).
	$heading_block = serialize_block(
		array(
			'blockName'    => 'core/heading',
			'attrs'        => array(
				'level'     => 1,
				'textColor' => 'white',
				'textAlign' => 'center',
			),
			'innerBlocks'  => array(),
			'innerContent' => array(
				"<h1 class=\"wp-block-heading has-text-align-center has-white-color has-text-color\">$tagline</h1>",
			),
		)
	);

	$cover_inner_html = '<div class="' . aldus_cover_inner_classes() . "\">\n$heading_block\n</div>";

	$cover_style_attr = "background-color:{$color_attr};min-height:420px";
	$cover_block      = serialize_block(
		array(
			'blockName'    => 'core/cover',
			'attrs'        => array(
				'overlayColor'       => $overlay_id,
				'customOverlayColor' => $color_attr,
				'dimRatio'           => 80,
				'align'              => 'full',
				'contentPosition'    => 'center center',
				'minHeight'          => 420,
				'minHeightUnit'      => 'px',
				'layout'             => array( 'type' => 'constrained' ),
			),
			'innerBlocks'  => array(),
			'innerContent' => array(
				'<div class="wp-block-cover alignfull has-custom-content-position'
				. " is-position-center-center\" style=\"$cover_style_attr\">\n"
				. '<span aria-hidden="true" class="wp-block-cover__background'
				. " has-background-dim-80 has-background-dim\" style=\"background-color:{$color_attr}\"></span>\n"
					. $cover_inner_html
					. "\n</div>",
			),
		)
	);

	// Body paragraph.
	$paragraph_block = serialize_block(
		array(
			'blockName'    => 'core/paragraph',
			'attrs'        => array( 'align' => 'center' ),
			'innerBlocks'  => array(),
			'innerContent' => array(
				"<p class=\"has-text-align-center\">$body</p>",
			),
		)
	);

	// CTA button block.
	$button_block  = serialize_block(
		array(
			'blockName'    => 'core/button',
			'attrs'        => array(),
			'innerBlocks'  => array(),
			'innerContent' => array(
				"<div class=\"wp-block-button\"><a class=\"wp-block-button__link wp-element-button\">$cta_text</a></div>",
			),
		)
	);
	$buttons_block = serialize_block(
		array(
			'blockName'    => 'core/buttons',
			'attrs'        => array(
				'layout' => array(
					'type'           => 'flex',
					'justifyContent' => 'center',
				),
			),
			'innerBlocks'  => array(),
			'innerContent' => array(
				'<div class="wp-block-buttons is-layout-flex wp-block-buttons-is-layout-flex is-content-justification-center">' . "\n"
				. $button_block
				. "\n</div>",
			),
		)
	);

	// Assemble pattern content.
	$content = $cover_block . "\n\n" . $paragraph_block . "\n\n" . $buttons_block;

	register_block_pattern(
		'aldus/pack-' . sanitize_html_class( $pack['id'] ),
		array(
			'title'       => $pack['title'],
			'description' => sprintf(
				/* translators: %s: pack title */
				__( 'A sample layout using the %s content pack from Aldus.', 'aldus' ),
				$pack['title']
			),
			'categories'  => array( 'aldus' ),
			'keywords'    => array( 'aldus', 'layout', $pack['id'] ),
			'content'     => $content,
		)
	);
}
