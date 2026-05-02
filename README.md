# 🎬 LetterMarkd

**Universal Letterboxd ratings and movie discovery for any webpage.**

[![Version](https://img.shields.io/badge/version-1.0.6-E9C46A.svg)](manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-264653.svg)](LICENSE)
[![Browser](https://img.shields.io/badge/Browser-Chrome%20%7C%20Firefox%20%7C%20Edge-2A9D8F.svg)](#)

LetterMarkd is a premium browser extension that brings the best of Letterboxd, IMDb, and Box Office Mojo directly to your browsing experience. Simply highlight any movie title on any website (Reddit, Wikipedia, News, etc.) to instantly view ratings, reviews, financial data, and release dates in a beautiful glassmorphism overlay.

---

## 🌟 Features

- **🔍 Universal Discovery**: Highlight any text on any website to search for a movie match instantly.
- **📈 Comprehensive Stats**:
    - **Letterboxd**: Real-time ratings and recent community reviews.
    - **IMDb**: Integrated ratings and full release dates.
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

## 🚀 Installation

### Chrome / Edge (Chromium)
1. Download the latest [release](https://github.com/Labreo/LetterMarkd/releases) or clone this repository.
2. Go to your browser's extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode** (usually a toggle in the corner).
4. Click **Load unpacked** and select the `dist/chrome` (for Chrome) or `dist/edge` (for Edge) folder.

### Firefox
1. Download or clone this repository.
2. Go to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on...** and select `manifest.json` from the `dist/firefox` folder.

---

## 🛠️ Development & Building

This extension uses a custom build script to handle manifest differences between browsers.

```bash
# Ensure the script is executable
chmod +x build.sh

# Run the build
./build.sh
```

The `build.sh` script generates optimized folders and `.zip` packages for Chrome, Firefox, and Edge in the `dist/` directory.

### Project Structure
- `background.js`: Handles data fetching and scraping logic.
- `content.js`: Injects the overlay and manages text selection.
- `popup/`: The extension menu for settings and quick search.
- `options/`: Detailed configuration for allowlists and preferences.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Created with ❤️ by [Labreo](https://github.com/Labreo)
