// LetterMarkd Service Worker - Diagnostic Build
const CACHE_TTL = 24 * 60 * 60 * 1000;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_RATING') {
    console.log(`[LetterMarkd] Request for: ${request.title}`);
    handleFetchRating(request.title, request.year)
      .then(res => {
        console.log(`[LetterMarkd] Response for ${request.title}:`, res);
        sendResponse(res);
      })
      .catch(err => {
        console.error(`[LetterMarkd] Error for ${request.title}:`, err);
        sendResponse({ error: err.message });
      });
    return true;
  }

  if (request.type === 'START_AUTH') {
    handleAuthFlow().then(sendResponse).catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function handleFetchRating(title, year) {
  const cacheKey = `film_${title.toLowerCase().replace(/\s+/g, '_')}_${year || ''}`;
  
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey] && (Date.now() - cached[cacheKey].timestamp < CACHE_TTL)) {
    return cached[cacheKey].data;
  }

  try {
    const lbResult = await resolveLetterboxdSearch(title, year);
    if (!lbResult || !lbResult.url) throw new Error('Film not found on Letterboxd');

    console.log(`[LetterMarkd] Found slug: ${lbResult.url}`);

    const response = await fetch(lbResult.url);
    const html = await response.text();

    const rating = parseRatingFromJsonLd(html);
    console.log(`[LetterMarkd] Scraped rating: ${rating}`);

    const result = {
      rating: rating, // Should be null or string "4.15"
      url: response.url,
      title: lbResult.title || title,
      year: lbResult.year || year,
      genres: []
    };

    await chrome.storage.local.set({ [cacheKey]: { data: result, timestamp: Date.now() } });
    return result;
  } catch (error) {
    return { rating: null, error: error.message };
  }
}

async function resolveLetterboxdSearch(title, year) {
  const searchUrl = `https://letterboxd.com/search/films/${encodeURIComponent(title)}/`;
  const res = await fetch(searchUrl);
  const html = await res.text();
  
  const filmResults = [];
  const regex = /href="(\/film\/[^"]+\/)"[^>]*>([^<]+)<\/a>\s*(?:<small class="metadata">)?(\d{4})?/g;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    filmResults.push({
      url: `https://letterboxd.com${match[1]}`,
      title: match[2],
      year: match[3] || null
    });
    if (filmResults.length >= 3) break;
  }

  if (filmResults.length === 0) return null;
  if (year) {
    const yearMatch = filmResults.find(f => f.year === year.toString());
    if (yearMatch) return yearMatch;
  }
  return filmResults[0];
}

function parseRatingFromJsonLd(html) {
  try {
    const ldJsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!ldJsonMatch) return null;
    const data = JSON.parse(ldJsonMatch[1]);
    
    const extract = (obj) => {
      const val = obj.aggregateRating ? obj.aggregateRating.ratingValue : null;
      return (val && !isNaN(parseFloat(val))) ? parseFloat(val).toFixed(2) : null;
    };

    if (Array.isArray(data)) {
      const film = data.find(i => i['@type'] === 'Movie');
      return film ? extract(film) : null;
    }
    return extract(data);
  } catch (e) { return null; }
}

async function handleAuthFlow() { /* placeholder */ }
