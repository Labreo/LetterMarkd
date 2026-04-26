# LetterMarkd - Chrome Web Store Assets

## Store Description
**LetterMarkd: The Missing Film Ratings for Streaming Services**

Never waste time Googling a movie's rating again. LetterMarkd seamlessly brings Letterboxd’s community ratings directly to your favorite streaming platforms and search engines.

Whether you're browsing Netflix or searching Google, LetterMarkd injects beautiful, non-intrusive rating badges into the interface, helping you decide what to watch in seconds.

**✨ Features:**
- **Streaming Overlays**: See Letterboxd ratings instantly on Netflix, Amazon Prime Video, and Disney+.
- **Low-Rating Fade**: Automatically fade out movies that fall below your personal rating threshold (customizable from 1.0 to 5.0 stars).
- **Google Search Integration**: View Letterboxd ratings directly in Google Search Knowledge Panels and organic results.
- **IMDb Integration**: Instantly see the Letterboxd community rating next to IMDb's score on any film page.
- **Action Buttons**: Quickly add films to your Watchlist or mark them as Watched right from the Netflix hover card (requires Letterboxd login).
- **Privacy First**: We do not track your browsing history. Ratings are fetched securely and cached locally.

**🔒 Note on Permissions:**
LetterMarkd requests access to specific streaming sites (Netflix, Prime, Disney+) and Google/IMDb solely to inject the rating badges. It also requests `storage` to cache ratings (saving network requests) and `identity` for the optional Letterboxd login flow.

---

## Privacy Policy
**Last Updated: 2026-04-26**

LetterMarkd ("we," "our," or "us") is committed to protecting your privacy. This policy explains what information our browser extension collects and how it is used.

**1. Data Collection and Usage**
- **Film Titles**: When you browse supported streaming sites (Netflix, Prime Video, Disney+) or search for films on Google/IMDb, the extension reads the film title from the webpage to fetch the corresponding Letterboxd rating. This data is processed locally and securely. We do not track, log, or store your viewing history on any external servers.
- **Local Storage**: We use your browser's local storage (`chrome.storage.local`) to cache film ratings for 24 hours. This improves performance and reduces network requests. This data never leaves your device.
- **Authentication**: If you choose to log in to Letterboxd via the extension to use the "Watchlist" or "Watched" features, the authentication token is stored securely in your browser. We do not have access to your Letterboxd account credentials.

**2. Third-Party Services**
- The extension communicates directly with Letterboxd.com to resolve film search queries and fetch public ratings. No third-party analytics or tracking pixels are included in this extension.

**3. Permissions Explained**
- `host_permissions`: Access is restricted strictly to the websites where the extension operates (e.g., netflix.com, google.com). The extension does not read data on unrelated websites.
- `storage`: Required to save user preferences (like your fade-out threshold) and cache ratings locally.
- `identity`: Required to securely facilitate the Letterboxd OAuth login flow.

**4. Contact**
If you have any questions or concerns regarding this privacy policy, please contact us at support@lettermarkd.com.
