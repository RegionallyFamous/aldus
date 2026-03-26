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
	<div class="wrap aldus-welcome-wrap" style="max-width:760px;margin:40px auto 0;">
		<h1 style="display:flex;align-items:center;gap:10px;font-size:28px;">
			<span style="font-size:32px;">✦</span>
			<?php esc_html_e( 'Welcome to Aldus', 'aldus' ); ?>
			<span style="font-size:14px;font-weight:400;color:#646970;margin-left:6px;">v<?php echo esc_html( ALDUS_VERSION ); ?></span>
		</h1>

		<p style="font-size:16px;color:#3c434a;max-width:620px;line-height:1.6;">
			<?php
			// phpcs:ignore Generic.Files.LineLength.MaxExceeded
			esc_html_e( 'You write it. Aldus designs it. Add your content pieces — a headline, a paragraph, an image — then hit "Make it happen". Aldus tries your content in every layout personality and shows you all of them at once. Pick the one that fits. It becomes real, fully-editable WordPress blocks.', 'aldus' );
			?>
		</p>

		<a href="<?php echo esc_url( $editor_url ); ?>" class="button button-primary button-hero" style="margin-top:8px;">
			<?php esc_html_e( 'Try it in the editor →', 'aldus' ); ?>
		</a>

		<hr style="margin:36px 0;">

		<h2 style="font-size:18px;"><?php esc_html_e( 'How it works', 'aldus' ); ?></h2>
		<ol style="font-size:15px;line-height:2;color:#3c434a;max-width:580px;">
			<li><?php esc_html_e( 'Open any post or page in the block editor.', 'aldus' ); ?></li>
			<li><?php esc_html_e( 'Find the Aldus block in the block inserter (search for "Aldus").', 'aldus' ); ?></li>
			<li><?php esc_html_e( 'Add your content pieces — headline, paragraphs, images, quotes, buttons.', 'aldus' ); ?></li>
			<li><?php esc_html_e( 'Click "Make it happen". The model downloads once (~200 MB) and is cached in your browser forever.', 'aldus' ); ?></li>
			<li><?php esc_html_e( 'Browse the layout previews. Click "Use this one" on the layout you like.', 'aldus' ); ?></li>
			<li><?php esc_html_e( 'Aldus replaces itself with standard, fully-editable WordPress blocks. Done.', 'aldus' ); ?></li>
		</ol>

		<hr style="margin:36px 0;">

		<h2 style="font-size:18px;"><?php esc_html_e( 'Resources', 'aldus' ); ?></h2>
		<p>
			<a href="<?php echo esc_url( $wiki_url ); ?>" target="_blank" rel="noopener noreferrer">
				<?php esc_html_e( 'Documentation & Wiki', 'aldus' ); ?>
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

		<p style="margin-top:24px;font-size:13px;color:#787c82;">
			<?php
			printf(
				/* translators: %s = privacy policy guide link */
				esc_html__( 'For details on what data Aldus sends to third-party services, see your site\'s %s.', 'aldus' ),
				'<a href="' . esc_url( admin_url( 'privacy.php' ) ) . '">' . esc_html__( 'Privacy Policy Guide', 'aldus' ) . '</a>'
			);
			?>
		</p>
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
 * Displays a one-time "What's New" admin notice after each version upgrade.
 *
 * The notice is shown once per user until they dismiss it or upgrade again.
 * Dismissal is handled via wp_ajax_aldus_dismiss_notice.
 */
function aldus_whats_new_notice(): void {
	$user_id     = get_current_user_id();
	$dismissed_v = get_user_meta( $user_id, 'aldus_dismissed_notice_version', true );

	if ( $dismissed_v === ALDUS_VERSION ) {
		return;
	}

	if ( ! current_user_can( 'edit_posts' ) ) {
		return;
	}

	$nonce   = wp_create_nonce( 'aldus_dismiss_notice' );
	$version = esc_html( ALDUS_VERSION );
	$label   = sprintf(
		/* translators: plugin name + version number */
		__( 'Aldus %s is installed.', 'aldus' ),
		$version
	);
	$label = esc_html( $label );
	$see   = esc_html__( 'See what improved in this release:', 'aldus' );
	// phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText -- arrow character is intentional.
	$notes = esc_html__( 'Release notes &rarr;', 'aldus' );
	$url   = 'https://github.com/RegionallyFamous/aldus/wiki';
	$js    = esc_js( $nonce );

	// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- all variables escaped above.
	echo '<div class="notice notice-info is-dismissible" id="aldus-whats-new">';
	echo '<p><strong>' . $label . '</strong> ' . $see . ' ';
	echo '<a href="' . esc_url( $url ) . '" target="_blank" rel="noopener noreferrer">' . $notes . '</a></p></div>';
	echo '<script>document.querySelector("#aldus-whats-new .notice-dismiss")?.addEventListener("click",function(){';
	echo 'fetch(ajaxurl,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},';
	echo 'body:"action=aldus_dismiss_notice&nonce=' . $js . '"});});</script>';
	// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
}

/**
 * AJAX handler: marks the current version's notice as dismissed for the current user.
 */
function aldus_dismiss_notice(): void {
	check_ajax_referer( 'aldus_dismiss_notice', 'nonce' );
	if ( ! current_user_can( 'edit_posts' ) ) {
		wp_die( '-1', '', array( 'response' => 403 ) );
	}
	update_user_meta( get_current_user_id(), 'aldus_dismissed_notice_version', ALDUS_VERSION );
	wp_die();
}

/**
 * Registers Aldus privacy policy content in the Tools > Privacy Policy Guide.
 *
 * Informs site administrators that content items entered in the Aldus editor
 * are sent to a third-party AI API (OpenAI) for layout generation.
 */
function aldus_add_privacy_policy_content(): void {
	if ( ! function_exists( 'wp_add_privacy_policy_content' ) ) {
		return;
	}

	/* translators: Do not translate the product/company names in these strings. */
	// phpcs:ignore Generic.Files.LineLength.MaxExceeded
	$para1 = esc_html__( 'When you use the Aldus block to generate a layout, the content items you enter (headlines, paragraphs, image URLs, button labels, quotes) along with your site title and tagline are sent to a third-party AI API (OpenAI) for layout generation. No personally identifiable information about your site visitors is collected or transmitted.', 'aldus' );
	/* translators: "api.openai.com" is a domain name and should not be translated. */
	// phpcs:ignore Generic.Files.LineLength.MaxExceeded
	$para2 = esc_html__( 'The OpenAI API key you supply in the Aldus settings is stored in your WordPress database and is only transmitted to api.openai.com over an encrypted (HTTPS) connection.', 'aldus' );
	$para3 = sprintf(
		/* translators: %s = linked text "OpenAI Privacy Policy" */
		esc_html__( 'For details on how OpenAI handles your data, see the %s.', 'aldus' ),
		'<a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer">'
		. esc_html__( 'OpenAI Privacy Policy', 'aldus' )
		. '</a>'
	);

	$content = '<h2>' . esc_html__( 'Aldus — Block Compositor', 'aldus' ) . '</h2>'
		. '<p>' . $para1 . '</p>'
		. '<p>' . $para2 . '</p>'
		. '<p>' . $para3 . '</p>';

	wp_add_privacy_policy_content( 'Aldus — Block Compositor', $content );
}

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
		echo '<span style="color:#0073aa;font-size:16px;" aria-label="' . esc_attr__( 'Uses Aldus', 'aldus' ) . '" title="' . esc_attr__( 'This post uses the Aldus block.', 'aldus' ) . '">✦</span>';
	} else {
		echo '<span style="color:#ccc;" aria-hidden="true">—</span>';
	}
}
