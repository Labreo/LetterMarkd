# 🚀 Release Notes: LetterMarkd v1.0.4

**Date:** April 27, 2026
**Status:** Stable / Production-Ready

This version focuses on **cross-browser stability**, **Firefox compatibility**, and **enhanced metadata detail**.

---

## 💎 New Features & Enhancements

### 📅 Full Release Dates
- **What's new**: The "Details" tab now displays the full release date (e.g., "March 31, 1999") instead of just the year.
- **How it works**: Intelligent scraping from both Letterboxd metadata and IMDb global release info.
- **Formatting**: Dates are now automatically formatted into a human-readable style based on your locale.

### 🦊 Full Firefox Parity
- **The Fix**: Resolved a critical issue where IMDb ratings and Box Office data were missing on Firefox due to forbidden header restrictions.
- **Reference Fallback**: Implemented a secondary fetch mechanism targeting IMDb's "Reference" page to bypass scraping blocks on Firefox.
- **Storage Fix**: Fixed a bug where caching failed on Firefox due to asynchronous storage API differences.

### ⚡ Scraper Hardening
- **Mojo Extraction**: Improved regex patterns for Box Office Mojo to handle varied HTML structures and whitespace.
- **Better Title Matching**: Added accent normalization (e.g., "Molière" → "moliere") to the direct-match slug guessing logic.

---

## 🛠️ Changes & Fixes

- **Interaction Model**: Formally removed the experimental "hover search" for streaming sites to prioritize a clean, intent-based highlight model.
- **Word Limit**: Increased the default word limit for highlights to **27 words** to better support long movie titles and descriptions.
- **Error Handling**: Added detailed background logging to help diagnose connection issues in real-time.
- **Cleanup**: Removed legacy TMDB configuration and temporary testing files.

---

## 🏗️ Build Information
- **Chrome**: Manifest V3 (Service Worker)
- **Firefox**: Manifest V2 (Background Scripts)
- **Engine**: Scraper v14

---

Created by **Labreo**
