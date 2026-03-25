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
			esc_html_e( 'You write it. Aldus designs it. Add your content pieces — a headline, a paragraph, an image — then hit "Make it happen". Aldus tries your content in sixteen layout personalities and shows you all of them at once. Pick the one that fits. It becomes real, fully-editable WordPress blocks.', 'aldus' );
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
			<li><?php esc_html_e( 'Browse sixteen layout previews. Click "Use this one" on the layout you like.', 'aldus' ); ?></li>
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
