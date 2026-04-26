// LetterMarkd Service Worker - Core Resolution Engine
const TMDB_API_KEY = 'YOUR_TMDB_API_KEY_HERE'; // Replace with real key
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_RATING') {
    handleFetchRating(request.title, request.year)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
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
    // 2. TMDb Resolution (Title -> TMDb ID -> IMDb ID)
    const tmdbData = await resolveTMDb(title, year);
    if (!tmdbData || !tmdbData.imdb_id) {
      throw new Error('Could not resolve to IMDb ID');
    }

    // 3. Letterboxd Bridge (IMDb ID -> Letterboxd Canonical Page)
    const lbUrl = `https://letterboxd.com/imdb/${tmdbData.imdb_id}/`;
    const response = await fetch(lbUrl);
    if (!response.ok) throw new Error('Letterboxd redirect failed');
    
    // The final URL after redirect is the canonical Letterboxd slug
    const canonicalUrl = response.url;
    const html = await response.text();

    // 4. JSON-LD Parsing (Extract Rating)
    const rating = parseRatingFromJsonLd(html);

    const result = {
      rating: rating || 'N/A',
      url: canonicalUrl,
      title: tmdbData.title || title,
      year: tmdbData.year,
      imdb_id: tmdbData.imdb_id
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

async function resolveTMDb(title, year) {
  if (TMDB_API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
    console.error('TMDb API Key missing. Resolution will be limited.');
    return null;
  }

  // A. Search for the movie
  const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();

  if (!searchData.results || searchData.results.length === 0) return null;

  const topResult = searchData.results[0];
  
  // B. Get full details to retrieve IMDb ID
  const detailUrl = `https://api.themoviedb.org/3/movie/${topResult.id}?api_key=${TMDB_API_KEY}`;
  const detailRes = await fetch(detailUrl);
  const detailData = await detailRes.json();

  return {
    id: topResult.id,
    imdb_id: detailData.imdb_id,
    title: detailData.title,
    year: detailData.release_date ? detailData.release_date.split('-')[0] : null
  };
}

function parseRatingFromJsonLd(html) {
  try {
    // Find the JSON-LD script block
    const ldJsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!ldJsonMatch) return null;

    const data = JSON.parse(ldJsonMatch[1]);
    
    // Letterboxd uses an AggregateRating object
    if (data.aggregateRating && data.aggregateRating.ratingValue) {
      return parseFloat(data.aggregateRating.ratingValue).toFixed(1);
    }
    
    // Fallback if data is an array
    if (Array.isArray(data)) {
      const filmObj = data.find(item => item['@type'] === 'Movie');
      if (filmObj && filmObj.aggregateRating) {
        return parseFloat(filmObj.aggregateRating.ratingValue).toFixed(1);
      }
    }
  } catch (e) {
    console.error('JSON-LD Parse Error:', e);
  }
  return null;
}
