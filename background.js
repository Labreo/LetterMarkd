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
});


async function handleFetchRating(title, year) {
  // Update cache prefix to force invalidation of old broken Cloudflare cache
  const cacheKey = `film_v2_${title.toLowerCase().replace(/\s+/g, '_')}_${year || ''}`;
  
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey] && (Date.now() - cached[cacheKey].timestamp < CACHE_TTL)) {
    if (cached[cacheKey].data && cached[cacheKey].data.rating !== null) {
      return cached[cacheKey].data;
    }
  }

  try {
    const lbResult = await guessLetterboxdSlug(title, year);
    if (!lbResult || !lbResult.url) throw new Error('Film not found or Cloudflare blocked');

    console.log(`[LetterMarkd] Resolved slug: ${lbResult.url}`);

    const response = await fetch(lbResult.url);
    const html = await response.text();

    const rating = parseRatingFromJsonLd(html);
    console.log(`[LetterMarkd] Scraped rating: ${rating}`);

    const result = {
      rating: rating,
      url: response.url,
      title: lbResult.title || title,
      year: lbResult.year || year,
      genres: []
    };

    if (rating !== null && rating !== undefined) {
      await chrome.storage.local.set({ [cacheKey]: { data: result, timestamp: Date.now() } });
    }
    return result;
  } catch (error) {
    return { rating: null, error: error.message };
  }
}

async function guessLetterboxdSlug(title, year) {
  // Letterboxd's search endpoint is heavily protected by Cloudflare Turnstile challenges.
  // MV3 Service Workers cannot solve JS captchas, so fetch() fails silently.
  // Instead, we predict the canonical slug and hit the unprotected /film/ page directly.
  
  let baseSlug = title.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['".,;:!?()[\]{}]/g, '') // remove punctuation
    .replace(/[^a-z0-9]+/g, '-')       // replace spaces/symbols with hyphens
    .replace(/^-+|-+$/g, '');          // trim leading/trailing hyphens

  const attempts = [
    `https://letterboxd.com/film/${baseSlug}/`
  ];
  
  if (year) {
    attempts.push(`https://letterboxd.com/film/${baseSlug}-${year}/`);
  }

  for (const url of attempts) {
    try {
      const res = await fetch(url);
      if (res.status === 200) {
        return { url, title, year };
      }
    } catch (e) {
      console.error('[LetterMarkd] Slug fetch error:', e);
    }
  }
  
  return null;
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

