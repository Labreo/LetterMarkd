// LetterMarkd Service Worker - Diagnostic Build
const CACHE_TTL = 24 * 60 * 60 * 1000;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SEARCH_FILM') {
    const query = request.query;
    console.log(`[LetterMarkd] Request for: ${query}`);
    handleFetchRating(query, null)
      .then(res => {
        console.log(`[LetterMarkd] Response for ${query}:`, res);
        sendResponse(res);
      })
      .catch(err => {
        console.error(`[LetterMarkd] Error for ${query}:`, err);
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

    const parsedData = parseRatingFromJsonLd(html);
    console.log(`[LetterMarkd] Scraped rating: ${parsedData.rating}`);

    const result = {
      rating: parsedData.rating,
      count: parsedData.count,
      image: parsedData.image,
      url: response.url,
      title: lbResult.title || title,
      year: lbResult.year || year,
      genres: []
    };

    if (parsedData.rating !== null && parsedData.rating !== undefined) {
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
    if (!ldJsonMatch) return { rating: null, count: null };
    const data = JSON.parse(ldJsonMatch[1]);
    
    const extract = (obj) => {
      if (!obj.aggregateRating) return { rating: null, count: null, image: null };
      const val = obj.aggregateRating.ratingValue;
      const count = obj.aggregateRating.ratingCount;
      const imageObj = obj.image ? (Array.isArray(obj.image) ? obj.image[0] : obj.image) : null;
      return {
        rating: (val && !isNaN(parseFloat(val))) ? parseFloat(val).toFixed(2) : null,
        count: count ? count.toLocaleString() : null,
        image: typeof imageObj === 'string' ? imageObj : (imageObj?.url || null)
      };
    };

    if (Array.isArray(data)) {
      const film = data.find(i => i['@type'] === 'Movie');
      return film ? extract(film) : { rating: null, count: null, image: null };
    }
    return extract(data);
  } catch (e) { return { rating: null, count: null, image: null }; }
}

