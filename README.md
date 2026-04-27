# 🎬 LetterMarkd

**Universal Letterboxd ratings and movie discovery for any webpage.**

[![Version](https://img.shields.io/badge/version-1.0.4-E9C46A.svg)](manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-264653.svg)](https://opensource.org/licenses/MIT)
[![Browser](https://img.shields.io/badge/Browser-Chrome%20%7C%20Firefox-2A9D8F.svg)](#)

LetterMarkd is a premium browser extension that brings the best of Letterboxd, IMDb, and Box Office Mojo directly to your browsing experience. Simply highlight any movie title on any website (Reddit, Wikipedia, News, etc.) to instantly view ratings, reviews, financial data, and release dates in a beautiful glassmorphism overlay.

---

## 🌟 Features

- **🔍 Universal Discovery**: Highlight any text on any website to search for a movie match instantly.
- **📈 Comprehensive Stats**:
    - **Letterboxd**: Real-time ratings and recent community reviews.
    - **IMDb**: Integrated ratings and full release dates for a broader critical perspective.
    - **Financials**: Budget and Worldwide Box Office data from Box Office Mojo.
- **🍿 Spoiler Blocker**: Advanced review parsing that hides spoilers by default with a "Click to Reveal" feature.
- **📺 Where to Watch**: Region-aware streaming provider detection powered by Letterboxd/JustWatch.
- **⚡ Performance First**:
    - **Instant Popups**: Letterboxd data loads first for zero-wait interaction.
    - **Lazy-Loaded Metadata**: Extra stats (IMDb/Mojo) pop in asynchronously.
    - **Smart Caching**: High-speed local storage caching to minimize network requests.
- **🎨 Premium UI**: A sleek, dark glassmorphism interface with smooth animations and professional typography.
- **🔒 Privacy Minded**: Only runs on sites you permit. Includes a built-in Allowlist/Blocklist system.

---

## 📸 Preview

![LetterMarkd Promo](store_assets/promo_banner.png)

---

## 🛠️ Installation

### Chrome / Edge (Chromium)
1. Download or clone this repository.
2. Go to `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the `dist/chrome` folder.

### Firefox
1. Download or clone this repository.
2. Go to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on...** and select any file in the `dist/firefox` folder (e.g., `manifest.json`).

---

## 🏗️ Development

To build the extension for both Chrome and Firefox:

```bash
# Ensure the script is executable
chmod +x build.sh

# Run the build
./build.sh
```

The build script manages the structural differences between Chrome (MV3) and Firefox (MV2), packaging everything into ready-to-upload `.zip` files in the `dist/` directory.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---

Created with ❤️ by **Labreo**
