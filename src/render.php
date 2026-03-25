<?php
declare(strict_types=1);
/**
 * Server-side render callback for the Aldus block.
 *
 * Aldus is an editor-only tool — it replaces itself with standard core blocks
 * the moment the user picks a layout. A saved post therefore never contains an
 * Aldus block, so this file intentionally renders nothing.
 *
 * If a future version adds a "draft preview" mode (showing a placeholder on
 * the front end before the user has chosen a layout), the output would be
 * generated here using the $attributes array.
 *
 * @param array<string, mixed> $attributes Block attributes.
 * @param string               $content    Inner block content (unused).
 * @param WP_Block             $block      Block instance.
 */

// $attributes, $content, and $block are available but intentionally unused.
// phpcs:disable VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable
return '';
