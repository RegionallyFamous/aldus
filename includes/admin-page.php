<?php
declare(strict_types=1);
/**
 * Aldus welcome / about admin page.
 *
 * Registered as a hidden top-level page (not shown in the menu) so it can
 * be linked from the plugin row and loaded on first activation.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the hidden welcome page under wp-admin.
 *
 * The page does not appear in the admin menu — access is via the activation
 * redirect or the "How to use" link in the plugin row.
 */
function aldus_register_admin_page(): void {
	// Passing an empty string hides the page from the admin menu while still making
	// it accessible via its URL (admin.php?page=aldus-welcome). This avoids the
	// PHPStan type error that a literal null would trigger and matches the WP core
	// behaviour for hidden subpages.
	add_submenu_page(
		'',
		__( 'Welcome to Aldus', 'aldus' ),
		__( 'Welcome to Aldus', 'aldus' ),
		'edit_posts',
		'aldus-welcome',
		'aldus_render_admin_page'
	);
}
add_action( 'admin_menu', 'aldus_register_admin_page' );

/**
 * Enqueues the Aldus admin stylesheet only on the welcome page.
 *
 * @param string $hook The current admin page hook suffix.
 */
function aldus_admin_enqueue_styles( string $hook ): void {
	if ( 'admin_page_aldus-welcome' !== $hook ) {
		return;
	}
	wp_enqueue_style( 'aldus-admin', ALDUS_URL . 'build/admin.css', array(), ALDUS_VERSION );
}
add_action( 'admin_enqueue_scripts', 'aldus_admin_enqueue_styles' );

/**
 * Renders the welcome / about admin page.
 */
function aldus_render_admin_page(): void {
	if ( ! current_user_can( 'edit_posts' ) ) {
		wp_die( esc_html__( 'You do not have permission to access this page.', 'aldus' ) );
	}

	$wiki_url    = 'https://github.com/RegionallyFamous/aldus/wiki';
	$release_url = 'https://github.com/RegionallyFamous/aldus/releases';
	$support_url = 'https://wordpress.org/support/plugin/aldus/';

	// Find the most recently edited post to link to the editor.
	$recent     = get_posts(
		array(
			'numberposts' => 1,
			'post_status' => array( 'draft', 'publish' ),
			'orderby'     => 'modified',
			'order'       => 'DESC',
		)
	);
	$editor_url = ! empty( $recent )
		? get_edit_post_link( $recent[0]->ID, 'raw' )
		: admin_url( 'post-new.php' );
	?>
	<div class="wrap aldus-welcome-wrap">

		<?php /* ---- Section 1: Hero ---- */ ?>
		<div class="aldus-welcome-hero">
			<h1>
				<span aria-hidden="true">✦</span>
				<?php esc_html_e( 'Aldus', 'aldus' ); ?>
				<span class="aldus-welcome-version">v<?php echo esc_html( ALDUS_VERSION ); ?></span>
			</h1>
			<p>
				<?php
				// phpcs:ignore Generic.Files.LineLength -- Long marketing copy; single literal required for i18n.
				esc_html_e( 'The block editor has everything a great page needs. What\'s missing is the design instinct — which blocks to combine, in what order, with what mood. You bring the words. Aldus shows you every way they could look. Pick the one that fits.', 'aldus' );
				?>
			</p>
			<a href="<?php echo esc_url( $editor_url ); ?>" class="button button-primary button-hero">
				<?php esc_html_e( 'Try it in the editor →', 'aldus' ); ?>
			</a>
			<p class="aldus-welcome-subtext">
				<?php esc_html_e( 'Add your content. See every arrangement. Pick the one that fits.', 'aldus' ); ?>
			</p>
		</div>

		<?php /* ---- Section 2: Before / after wireframe ---- */ ?>
		<div class="aldus-welcome-transform" aria-hidden="true">
			<div class="aldus-welcome-transform-side aldus-welcome-before">
				<div class="aldus-welcome-block is-heading"></div>
				<div class="aldus-welcome-block"></div>
				<div class="aldus-welcome-block"></div>
				<div class="aldus-welcome-block is-image"></div>
				<div class="aldus-welcome-block"></div>
				<div class="aldus-welcome-block is-button"></div>
			</div>
			<div class="aldus-welcome-transform-arrow">→</div>
			<div class="aldus-welcome-transform-side aldus-welcome-after">
				<div class="aldus-welcome-block is-cover"></div>
				<div class="aldus-welcome-columns">
					<div class="aldus-welcome-col"></div>
					<div class="aldus-welcome-col"></div>
				</div>
				<div class="aldus-welcome-block is-pullquote"></div>
				<div class="aldus-welcome-block is-cta"></div>
			</div>
		</div>
		<div class="aldus-welcome-transform-labels">
			<span class="aldus-welcome-transform-label">
				<?php esc_html_e( 'Your content as a stack of blocks.', 'aldus' ); ?>
			</span>
			<span class="aldus-welcome-transform-label">
				<?php esc_html_e( 'The same content, designed by Aldus.', 'aldus' ); ?>
			</span>
		</div>

		<?php /* ---- Section 3: How it works ---- */ ?>
		<div class="aldus-welcome-steps">
			<div class="aldus-welcome-step">
				<div class="aldus-welcome-step-number">01</div>
				<h3><?php esc_html_e( 'Add your words.', 'aldus' ); ?></h3>
				<p>
					<?php esc_html_e( 'A headline, paragraphs, an image, a quote — whatever the page needs. Don\'t worry about order.', 'aldus' ); ?>
				</p>
			</div>
			<div class="aldus-welcome-step">
				<div class="aldus-welcome-step-number">02</div>
				<h3><?php esc_html_e( 'See every option.', 'aldus' ); ?></h3>
				<p>
					<?php esc_html_e( 'Aldus arranges your content in every layout style at once — editorial, cinematic, minimal, and more.', 'aldus' ); ?>
				</p>
			</div>
			<div class="aldus-welcome-step">
				<div class="aldus-welcome-step-number">03</div>
				<h3><?php esc_html_e( 'Pick the one that fits.', 'aldus' ); ?></h3>
				<p>
					<?php esc_html_e( 'It becomes real WordPress blocks — edit, rearrange, or just publish. Try a different look anytime.', 'aldus' ); ?>
				</p>
			</div>
		</div>

		<?php /* ---- Section 4: Trust signals ---- */ ?>
		<div class="aldus-welcome-trust">
			<div class="aldus-welcome-trust-item">
				<span class="aldus-welcome-trust-icon" aria-hidden="true">🔒</span>
				<div class="aldus-welcome-trust-body">
					<h3><?php esc_html_e( 'Your words stay private.', 'aldus' ); ?></h3>
				<p>
					<?php
					// phpcs:ignore Generic.Files.LineLength.MaxExceeded
					esc_html_e( 'The AI only sees what types of content you have — never your actual text. Nothing leaves your browser.', 'aldus' );
					?>
				</p>
				</div>
			</div>
			<div class="aldus-welcome-trust-item">
				<span class="aldus-welcome-trust-icon" aria-hidden="true">📦</span>
				<div class="aldus-welcome-trust-body">
					<h3><?php esc_html_e( 'Pure WordPress blocks.', 'aldus' ); ?></h3>
				<p>
					<?php
					// phpcs:ignore Generic.Files.LineLength.MaxExceeded
					esc_html_e( 'Every layout is standard core blocks — Cover, Columns, Group, Pullquote. Deactivate Aldus and nothing breaks.', 'aldus' );
					?>
				</p>
				</div>
			</div>
			<div class="aldus-welcome-trust-item">
				<span class="aldus-welcome-trust-icon" aria-hidden="true">🌐</span>
				<div class="aldus-welcome-trust-body">
					<h3><?php esc_html_e( 'Works offline.', 'aldus' ); ?></h3>
				<p>
					<?php
					// phpcs:ignore Generic.Files.LineLength.MaxExceeded
					esc_html_e( 'The AI model downloads once (~200 MB) and is cached in your browser forever. After that, no internet needed.', 'aldus' );
					?>
				</p>
				</div>
			</div>
		</div>

		<?php /* ---- Section 5: Footer ---- */ ?>
		<div class="aldus-welcome-footer">
			<p>
				<a href="<?php echo esc_url( $wiki_url ); ?>" target="_blank" rel="noopener noreferrer">
					<?php esc_html_e( 'Documentation', 'aldus' ); ?>
				</a>
				&nbsp;·&nbsp;
				<a href="<?php echo esc_url( $release_url ); ?>" target="_blank" rel="noopener noreferrer">
					<?php esc_html_e( 'Release notes', 'aldus' ); ?>
				</a>
				&nbsp;·&nbsp;
				<a href="<?php echo esc_url( $support_url ); ?>" target="_blank" rel="noopener noreferrer">
					<?php esc_html_e( 'Support forum', 'aldus' ); ?>
				</a>
			</p>
			<p class="aldus-welcome-origin">
				<?php
				// phpcs:ignore Generic.Files.LineLength -- Long marketing copy; single literal required for i18n.
				esc_html_e( 'Aldus is free, open source, and named after Aldus Manutius — the 15th-century Venetian printer who invented italic type, pioneered the pocket-sized book, and defined what a printed page should look like.', 'aldus' );
				?>
			</p>
		</div>

	</div>
	<?php
}

// ---------------------------------------------------------------------------
// Admin hooks moved from aldus.php
// ---------------------------------------------------------------------------

function aldus_maybe_redirect_to_welcome(): void {
	if ( ! get_transient( 'aldus_activation_redirect' ) ) {
		return;
	}
	delete_transient( 'aldus_activation_redirect' );

	// Do not redirect on bulk activations.
	if ( isset( $_GET['activate-multi'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return;
	}

	wp_safe_redirect( admin_url( 'admin.php?page=aldus-welcome' ) );
	exit;
}

/**
 * Registers Aldus privacy policy content in the Tools > Privacy Policy Guide.
 *
 * Aldus runs its layout model entirely in the browser using WebGPU — no content
 * is ever sent to an external AI service. This statement reflects that accurately.
 */
function aldus_add_privacy_policy_content(): void {
	if ( ! function_exists( 'wp_add_privacy_policy_content' ) ) {
		return;
	}

	// phpcs:ignore Generic.Files.LineLength.MaxExceeded
	$para1 = esc_html__( 'Aldus runs its layout model entirely within your browser using WebGPU. No content is transmitted to any external AI service. Your content items (headlines, paragraphs, image URLs, button labels) are sent to your own WordPress site\'s REST API for block assembly — the data never leaves your server.', 'aldus' );
	// phpcs:ignore Generic.Files.LineLength.MaxExceeded
	$para2 = esc_html__( 'The AI model file (~200 MB) is downloaded once from a public CDN (huggingface.co) and cached in your browser\'s storage. No account or API key is required.', 'aldus' );
	// phpcs:ignore Generic.Files.LineLength.MaxExceeded
	$para3 = esc_html__( 'Your site name and tagline are read locally to inform layout decisions. No personally identifiable information about your site visitors is collected or transmitted.', 'aldus' );

	$content = '<h2>' . esc_html__( 'Aldus — Layout Explorer', 'aldus' ) . '</h2>'
		. '<p>' . $para1 . '</p>'
		. '<p>' . $para2 . '</p>'
		. '<p>' . $para3 . '</p>';

	wp_add_privacy_policy_content( 'Aldus — Layout Explorer', $content );
}

/**
 * Exposes Aldus usage stats in Tools → Site Health → Info.
 *
 * The `debug_information` filter is the standard hook for adding plugin data
 * to the Site Health Info tab (WP 5.2+). This lets admins and support teams
 * find usage stats without diving into the database.
 *
 * @param mixed $info Existing debug info sections.
 * @return mixed
 */
add_filter(
	'debug_information',
	static function ( $info ) {
		if ( ! is_array( $info ) ) {
			return $info;
		}
		$stats = get_option( 'aldus_usage', array() );
		$total = array_sum( array_map( 'intval', $stats ) );
		$top   = 'none';
		if ( $total > 0 ) {
			$max = max( $stats );
			$key = array_search( $max, $stats, true );
			if ( false !== $key ) {
				$top = (string) $key;
			}
		}
		$info['aldus'] = array(
			'label'  => __( 'Aldus Layout Explorer', 'aldus' ),
			'fields' => array(
				'version'       => array(
					'label' => __( 'Version', 'aldus' ),
					'value' => ALDUS_VERSION,
				),
				'total_layouts' => array(
					'label' => __( 'Layouts generated', 'aldus' ),
					'value' => $total,
				),
				'top_style'     => array(
					'label' => __( 'Most used style', 'aldus' ),
					'value' => $top,
				),
			),
		);
		return $info;
	}
);

/**
 * Adds an "Aldus" indicator column to the Posts and Pages admin list screens.
 *
 * @param mixed $columns Existing columns (array expected).
 * @return mixed
 */
function aldus_add_posts_column( mixed $columns ): mixed {
	if ( ! is_array( $columns ) ) {
		return $columns;
	}
	$columns['aldus_used'] = '<span title="' . esc_attr__( 'Uses Aldus', 'aldus' ) . '" aria-label="' . esc_attr__( 'Uses Aldus', 'aldus' ) . '">✦</span>';
	return $columns;
}

/**
 * Renders the Aldus column cell for a given post.
 *
 * @param mixed $column  The current column ID.
 * @param mixed $post_id The post ID for this row.
 */
function aldus_render_posts_column( mixed $column, mixed $post_id ): void {
	if ( 'aldus_used' !== $column ) {
		return;
	}
	$post = get_post( (int) $post_id );
	if ( ! $post instanceof \WP_Post ) {
		return;
	}
	if ( has_block( 'aldus/layout-generator', $post ) ) {
		echo '<span class="aldus-used-indicator" aria-label="' . esc_attr__( 'Uses Aldus', 'aldus' ) . '" title="' . esc_attr__( 'This post was designed with Aldus.', 'aldus' ) . '">✦</span>';
	} else {
		echo '<span class="aldus-unused-indicator" aria-hidden="true">—</span>';
	}
}
