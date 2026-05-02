#!/bin/bash

# LetterMarkd Build Script (TMDb-Free)
# Usage: ./build.sh

echo "🚀 Building LetterMarkd..."

# Clean dist
rm -rf dist/
mkdir -p dist/chrome dist/firefox dist/edge

# Helper function to copy files
prepare_build() {
    local target=$1
    echo "  📦 Preparing $target..."
    mkdir -p "$target/popup" "$target/icons"
    
    cp content.js "$target/content.js"
    cp content.css "$target/content.css"
    cp -r popup/ "$target/popup/"
    cp -r icons/ "$target/icons/"
    cp -r options/ "$target/options/"
    
    # Copy background.js (no injection needed anymore)
    cp background.js "$target/background.js"
}

# Build Chrome
prepare_build "dist/chrome"
cp manifest.json dist/chrome/

# Build Edge
prepare_build "dist/edge"
cp manifest.edge.json dist/edge/manifest.json

# Build Firefox
prepare_build "dist/firefox"
cp manifest.firefox.json dist/firefox/manifest.json

# Create ZIPs
echo "  🤐 Zipping packages..."
(cd dist/chrome && zip -qr ../lettermarkd_chrome.zip .)
(cd dist/edge && zip -qr ../lettermarkd_edge.zip .)
(cd dist/firefox && zip -qr ../lettermarkd_firefox.zip .)

echo "✅ Build Complete! ZIPs available in dist/"
