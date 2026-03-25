#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# release-zip.sh — build and package Aldus for distribution
#
# Usage:  bash bin/release-zip.sh [--out <dir>]
#
# Produces:  aldus-<version>.zip  (default: repo root, override with --out)
#
# The zip contains a single top-level folder named "aldus/" that mirrors
# the standard WordPress plugin layout expected by the Plugin Installer.
# ---------------------------------------------------------------------------

set -euo pipefail

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
OUT_DIR="$(pwd)"

while [[ $# -gt 0 ]]; do
	case $1 in
		--out)
			OUT_DIR="$2"
			shift 2
			;;
		*)
			echo "Unknown option: $1" >&2
			exit 1
			;;
	esac
done

# ---------------------------------------------------------------------------
# Derived values
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"
VERSION="$(grep "ALDUS_VERSION" "$PLUGIN_DIR/aldus.php" | head -1 | grep -oE "[0-9]+\.[0-9]+\.[0-9]+")"
ZIP_NAME="aldus-${VERSION}.zip"
ZIP_PATH="${OUT_DIR}/${ZIP_NAME}"
STAGING_DIR="$(mktemp -d)"

echo "Building Aldus ${VERSION}…"

# ---------------------------------------------------------------------------
# Build assets
# ---------------------------------------------------------------------------
cd "$PLUGIN_DIR"

if [ ! -d node_modules ]; then
	echo "Installing npm dependencies…"
	npm ci --silent
fi

echo "Running npm build…"
npm run build --silent

# ---------------------------------------------------------------------------
# Assemble staging directory
# ---------------------------------------------------------------------------
STAGE="$STAGING_DIR/aldus"
mkdir -p "$STAGE"

# Files and directories to include in the release.
# Excludes: source files, dev tooling, tests, node_modules, etc.
INCLUDE=(
	aldus.php
	readme.txt
	HOOKS.md
	build
	includes
	languages
	src/block.json
	src/render.php
)

for item in "${INCLUDE[@]}"; do
	if [ -e "$PLUGIN_DIR/$item" ]; then
		rsync -a "$PLUGIN_DIR/$item" "$STAGE/"
	else
		echo "Warning: expected file/dir not found: $item" >&2
	fi
done

# ---------------------------------------------------------------------------
# Create the zip
# ---------------------------------------------------------------------------
mkdir -p "$OUT_DIR"
rm -f "$ZIP_PATH"

cd "$STAGING_DIR"
zip -r "$ZIP_PATH" aldus/ --quiet

# Cleanup
rm -rf "$STAGING_DIR"

echo "Done: $ZIP_PATH"
echo "Size: $(du -sh "$ZIP_PATH" | cut -f1)"
