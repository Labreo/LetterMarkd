# 🎬 LetterMarkd

**Universal Letterboxd ratings and movie discovery for any webpage.**

[![Version](https://img.shields.io/badge/version-1.0.3-E9C46A.svg)](manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-264653.svg)](https://opensource.org/licenses/MIT)
[![Browser](https://img.shields.io/badge/Browser-Chrome%20%7C%20Firefox-2A9D8F.svg)](#)

LetterMarkd is a powerful browser extension that brings the best of Letterboxd, IMDb, and Box Office Mojo directly to your browsing experience. Simply highlight any movie title on any website (Reddit, IMDb, News, etc.) to instantly view ratings, reviews, financial data, and where to watch.

---

## 🌟 Features

- **🔍 Universal Discovery**: Highlight any text on any website to search for a movie match instantly.
- **📈 Comprehensive Stats**:
    - **Letterboxd**: Real-time ratings and recent community reviews.
    - **IMDb**: Integrated IMDb ratings for a broader critical perspective.
    - **Financials**: Budget and Worldwide Box Office data from Box Office Mojo.
- **🍿 Spoiler Blocker**: Advanced review parsing that hides spoilers by default with a "Click to Reveal" feature.
- **📺 Where to Watch**: Region-aware streaming provider detection powered by Letterboxd/JustWatch.
- **⚡ Performance First**:
    - **Instant Popups**: Letterboxd data loads first for zero-wait interaction.
    - **Lazy-Loaded Metadata**: Extra stats (IMDb/Mojo) pop in asynchronously as they arrive.
    - **Smart Caching**: Efficient local storage caching (v11 engine) to minimize network requests.
- **🎨 Premium UI**: A sleek, dark glassmorphism interface that feels like a native part of the modern web.
- **🔒 Privacy Minded**: Only runs on sites you permit. Includes an easy Allowlist/Blocklist management system.

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
3. Click **Load Temporary Add-on...** and select any file in the `dist/firefox` folder.

---

## 💻 Tech Stack

- **Core**: Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Design**: Modern Glassmorphism, CSS Variables, Flexbox/Grid.
- **Storage**: Chrome Storage API for permissions and high-speed caching.
- **Build**: custom `build.sh` script for cross-browser distribution.

---

## 🏗️ Development

To build the extension for both Chrome and Firefox:

```bash
# Ensure the script is executable
chmod +x build.sh

# Run the build
./build.sh
```

The build script will:
- Sync the `dist/` folders.
- Handle manifest differences between Chrome (MV3) and Firefox (MV2).
- Package everything into ready-to-upload `.zip` files.

---

## 📜 Irrelevant Files Removed
We keep the repository lean for production.
- Removed `Letterboxd-Extras` reference source.
- Removed temporary testing assets (`lb.html`).
- Organized all store assets into `/store_assets`.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---

Created with ❤️ by **Labreo**
