# 📝 Post-Mortem: LetterMarkd Development

**Date:** April 27, 2026
**Project:** LetterMarkd (Universal Movie Discovery Extension)
**Lead Developer:** Antigravity (AI) & Sanjay Waradkar (User)
**Current Version:** v1.0.4

---

## 🚀 1. Project Overview
LetterMarkd was built to solve the "context switching" problem for cinephiles. It allows users to highlight any movie title on any website and instantly view a premium overlay containing Letterboxd ratings, community reviews, IMDb scores, and financial data (Budget/Box Office) from Mojo.

## ✅ 2. What Went Right (Successes)

### 🎨 Premium UI Transformation
- **Glassmorphism Design**: Successfully implemented a high-end UI using `backdrop-filter`, multi-layered shadows, and the `Inter` font family.
- **Asynchronous "Pop-in" Stats**: refactored the engine to deliver Letterboxd data instantly (Stage 1) and "pop-in" secondary metadata (Stage 2: IMDb/Mojo) asynchronously.

### 🔍 Metadata Engine (No API Keys)
- **Scraping vs. APIs**: Successfully bypassed the need for expensive/restricted APIs (OMDb/TMDB) by using robust background scraping with customized `User-Agent` headers and `AbortController` timeouts.
- **Region-Sensing JustWatch**: Implemented a "Stage 2 CSI" fetch that forces Letterboxd to return region-accurate streaming providers.

### 🎢 Pivot: Simplified Interaction Model
- **Highlight-to-Search**: Decided to remove the universal hover-based discovery for streaming sites in favor of an explicit selection model. This significantly reduced complexity and eliminated unintended triggers.

## ⚠️ 3. What Went Wrong (Challenges & Blockers)

### 🦊 Firefox MV2 Compatibility
- **Storage Rejections**: Discovered that `chrome.storage.local.get` in Firefox MV2 (without a polyfill) does not return a Promise, causing `await` calls to return `undefined`. Fixed by wrapping calls in a standard Promise/callback wrapper.
- **Forbidden Headers**: Firefox strictly forbids setting the `User-Agent` header in `fetch()` calls. This caused IMDb and Mojo stats to fail on Firefox.
- **IMDb Reference Page Fallback**: Solved the Firefox IMDb block by implementing a fallback to the "Reference" view (`/reference`), which is less strictly protected than the modern IMDb title pages.

### 📅 Release Date Extraction
- **Missing Full Dates**: Initially, the extension only captured the release year. Users requested full dates.
- **Solution**: Enhanced the scraper to extract full date strings from Letterboxd metadata, page headers, and IMDb JSON-LD, then added a `formatDate` utility to present them in a user-friendly way.

### 🛑 Scraping Blocks
- **Bot Detection**: IMDb and Box Office Mojo initially blocked "headless" fetch calls.
- **Solution**: Implemented `COMMON_HEADERS` with a realistic browser fingerprint and a graceful fallback mechanism for browsers (Firefox) that reject forbidden headers.

## 🧠 4. LLM & Technical Insights
- **Regex vs. DOMParser**: Scraping via `match()` on raw HTML strings proved faster and more resilient in background workers than parsing full DOM trees.
- **Message Lifecycle**: In MV3, the service worker is ephemeral. We used `chrome.tabs.sendMessage` to push "Extra Stats" back to the content script after the initial response closed.

## 🏁 5. Final Status
LetterMarkd is now in a production-ready state (**v1.0.4**) with optimized performance for both Chrome and Firefox, robust anti-blocking measures, and a premium aesthetic.

---

**End of Document.**
