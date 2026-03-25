/**
 * Aldus Interactivity Store
 *
 * Provides subtle front-end animations for Aldus-generated blocks using the
 * WordPress Interactivity API (WP 6.5+). No React, no external libraries.
 * Loaded as a Script Module only on pages that contain an Aldus-generated
 * layout with interactive blocks.
 *
 * Animations are opt-in per personality: the PHP renderers in templates.php
 * only inject data-wp-interactive attributes when the personality's
 * 'interactivity' style rule includes the relevant effect name.
 *
 * Effects:
 *   parallax       — cover blocks: background shifts at 15% of scroll speed.
 *   revealOnScroll — full-width sections: fade-in-up as they enter the viewport.
 *   countUp        — stat number headings: count from 0 on first reveal.
 *   animateDetails — accordion details blocks: smooth max-height open/close.
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

store( 'aldus', {
	state: {
		// Global scroll position — not used directly but kept for future
		// watchers that need a reactive scroll signal.
		scrollY: 0,
	},

	actions: {
		/**
		 * Parallax effect for cover blocks.
		 *
		 * Shifts the cover background overlay at 15% of the scroll speed so
		 * the background appears to move slower than the page, creating depth.
		 * Applied via: data-wp-on-window--scroll="actions.parallax"
		 */
		parallax() {
			const { ref } = getElement();
			if ( ! ref ) {
				return;
			}
			const rect = ref.getBoundingClientRect();
			const viewportHeight = window.innerHeight;

			if ( rect.bottom < 0 || rect.top > viewportHeight ) {
				return;
			}

			const offset = ( rect.top - viewportHeight / 2 ) * 0.15;
			const bg = ref.querySelector( '.wp-block-cover__background' );
			if ( bg ) {
				bg.style.transform = `translateY(${ offset }px)`;
			}
		},

		/**
		 * Fade-in-up reveal as a section scrolls into the viewport.
		 *
		 * Sets ctx.revealed = true once the element crosses the 85% threshold,
		 * which also triggers the countUp callback on any child stat headings
		 * watching the same context.
		 * Applied via: data-wp-on-window--scroll="actions.revealOnScroll"
		 */
		revealOnScroll() {
			const { ref } = getElement();
			if ( ! ref ) {
				return;
			}
			const ctx = getContext();

			if ( ctx.revealed ) {
				return;
			}

			const rect = ref.getBoundingClientRect();
			const threshold = window.innerHeight * 0.85;

			if ( rect.top < threshold ) {
				ctx.revealed = true;
				ref.style.opacity = '1';
				ref.style.transform = 'translateY(0)';
			}
		},
	},

	callbacks: {
		/**
		 * Count-up animation for stat number headings in row:stats blocks.
		 *
		 * Watches the `revealed` context property set by revealOnScroll (or set
		 * directly to true for always-visible stats). Animates from 0 to the
		 * target value over 1.2 seconds with an ease-out cubic curve. Preserves
		 * any non-numeric suffix (e.g. "4,200+" or "98%").
		 * Applied via: data-wp-watch="callbacks.countUp"
		 */
		countUp() {
			const { ref } = getElement();
			if ( ! ref ) {
				return;
			}
			const ctx = getContext();

			if ( ! ctx.revealed || ctx.counted ) {
				return;
			}
			ctx.counted = true;

			const raw = ref.textContent.trim();
			const match = raw.match( /^([\d,]+)(.*)$/ );
			if ( ! match ) {
				return;
			}

			const target = parseInt( match[ 1 ].replace( /,/g, '' ), 10 );
			const suffix = match[ 2 ] ?? '';
			const duration = 1200;
			const startTime = performance.now();

			const step = ( now ) => {
				const elapsed = now - startTime;
				const progress = Math.min( elapsed / duration, 1 );
				// Ease-out cubic: decelerate toward the target.
				const eased = 1 - Math.pow( 1 - progress, 3 );
				const current = Math.round( target * eased );
				ref.textContent = current.toLocaleString() + suffix;
				if ( progress < 1 ) {
					requestAnimationFrame( step );
				}
			};
			requestAnimationFrame( step );
		},

		/**
		 * Smooth max-height animation for details/accordion blocks.
		 *
		 * Runs whenever the details element's open state changes (the browser
		 * toggles the `open` attribute when the user clicks the summary).
		 * Applied via: data-wp-watch="callbacks.animateDetails"
		 */
		animateDetails() {
			const { ref } = getElement();
			if ( ! ref ) {
				return;
			}
			// Target the inner content region — WP 6.5+ renders it as a div
			// sibling of the <summary> element inside <details>.
			const content = ref.querySelector(
				'.wp-block-details__content, details > :not(summary)'
			);
			if ( ! content ) {
				return;
			}

			if ( ref.open ) {
				content.style.maxHeight = content.scrollHeight + 'px';
				content.style.opacity = '1';
			} else {
				content.style.maxHeight = '0';
				content.style.opacity = '0';
			}
		},
	},
} );
