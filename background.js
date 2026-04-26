// LetterMarkd Service Worker - Search-First Resolution Engine (TMDb-Free)
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_RATING') {
    handleFetchRating(request.title, request.year)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (request.type === 'START_AUTH') {
    handleAuthFlow()
      .then(sendResponse)
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function handleFetchRating(title, year) {
  const cacheKey = `film_${title.toLowerCase().replace(/\s+/g, '_')}_${year || ''}`;
  
  // 1. Cache Check
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey] && (Date.now() - cached[cacheKey].timestamp < CACHE_TTL)) {
    return cached[cacheKey].data;
  }

  try {
    // 2. Resolve Title to Letterboxd Slug (using LB Search)
    const lbResult = await resolveLetterboxdSearch(title, year);
    if (!lbResult || !lbResult.url) throw new Error('Film not found on Letterboxd');

    // 3. Fetch canonical film page
    const response = await fetch(lbResult.url);
    if (!response.ok) throw new Error('Letterboxd page fetch failed');
    
    const canonicalUrl = response.url;
    const html = await response.text();

    // 4. JSON-LD Parsing
    const rating = parseRatingFromJsonLd(html);

    const result = {
      rating: rating || 'N/A',
      url: canonicalUrl,
      title: lbResult.title || title,
      year: lbResult.year || year,
      genres: parseGenresFromHtml(html)
    };

    // 5. Caching
    await chrome.storage.local.set({
      [cacheKey]: { data: result, timestamp: Date.now() }
    });

    return result;
  } catch (error) {
    console.warn(`Resolution failed for "${title}":`, error.message);
    return { rating: '?', url: `https://letterboxd.com/search/${encodeURIComponent(title)}/`, title };
  }
}

/**
 * Hits Letterboxd's own search and returns the first matching film result
 */
async function resolveLetterboxdSearch(title, year) {
  const searchUrl = `https://letterboxd.com/search/films/${encodeURIComponent(title)}/`;
  try {
    const res = await fetch(searchUrl);
    const html = await res.text();
    
    // Pattern to find film results: <span class="film-title-wrapper">...<a href="/film/slug/">Title</a> <small class="metadata">year</small>
    // We look for multiple results to find the best year match
    const filmResults = [];
    const regex = /href="(\/film\/[^"]+\/)"[^>]*>([^<]+)<\/a>\s*(?:<small class="metadata">)?(\d{4})?/g;
    let match;
    
    while ((match = regex.exec(html)) !== null) {
      filmResults.push({
        url: `https://letterboxd.com${match[1]}`,
        title: match[2],
        year: match[3] || null
      });
      if (filmResults.length >= 5) break; // Check first 5 results
    }

    if (filmResults.length === 0) return null;

    // If we have a target year, find the closest match
    if (year) {
      const yearMatch = filmResults.find(f => f.year === year.toString());
      if (yearMatch) return yearMatch;
    }

    // Default to the first (most popular/relevant) result
    return filmResults[0];
  } catch (e) {
    return null;
  }
}

function parseRatingFromJsonLd(html) {
  try {
    const ldJsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!ldJsonMatch) return null;

    const data = JSON.parse(ldJsonMatch[1]);
    
    // Check for standard AggregateRating
    const ratingValue = data.aggregateRating ? data.aggregateRating.ratingValue : null;
    if (ratingValue && !isNaN(parseFloat(ratingValue))) {
      return parseFloat(ratingValue).toFixed(2);
    }
    
    // Check for Movie object in array
    if (Array.isArray(data)) {
      const filmObj = data.find(item => item['@type'] === 'Movie');
      if (filmObj && filmObj.aggregateRating && !isNaN(parseFloat(filmObj.aggregateRating.ratingValue))) {
        return parseFloat(filmObj.aggregateRating.ratingValue).toFixed(2);
      }
    }
  } catch (e) {}
  return null; // Return null if anything fails or is NaN
}

function parseGenresFromHtml(html) {
  // Scrape genres from the sidebar links in Letterboxd
  const genreMatch = html.match(/href="\/films\/genre\/([^/]+)\/"/g);
  if (genreMatch) {
    return genreMatch.slice(0, 3).map(m => {
      const slug = m.match(/genre\/([^/]+)\//)[1];
      return slug.charAt(0).toUpperCase() + slug.slice(1);
    });
  }
  return [];
}

async function handleAuthFlow() {
  const redirectUri = chrome.identity.getRedirectURL();
  const clientId = 'YOUR_CLIENT_ID'; // Placeholder
  const authUrl = `https://letterboxd.com/api/v0/auth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=write`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        reject(new Error(chrome.runtime.lastError?.message || 'Auth failed'));
        return;
      }
      const url = new URL(redirectUrl);
      const code = url.searchParams.get('code');
      if (code) {
        await chrome.storage.local.set({ authToken: 'MOCK_TOKEN', username: 'LetterMarkdUser' });
        resolve({ success: true, username: 'LetterMarkdUser' });
      } else {
        reject(new Error('No auth code'));
      }
    });
  });
}
