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

  if (request.type === 'START_AUTH') {
    handleAuthFlow()
      .then(sendResponse)
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.type === 'PERFORM_ACTION') {
    handleWriteAction(request.action, request.filmId)
      .then(sendResponse)
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function handleWriteAction(action, filmId) {
  const { authToken } = await chrome.storage.local.get('authToken');
  if (!authToken) throw new Error('Not authenticated');

  console.log(`Performing ${action} for film ${filmId}`);
  
  // Logic to hit api.letterboxd.com or web endpoints
  // Example for Watchlist:
  // await fetch('https://api.letterboxd.com/api/v0/watchlist', { 
  //   method: 'POST', 
  //   headers: { 'Authorization': `Bearer ${authToken}` },
  //   body: JSON.stringify({ filmId })
  // });

  return { success: true };
}


async function handleFetchRating(title, year) {
  const cacheKey = `film_${title.toLowerCase().replace(/\s+/g, '_')}_${year || ''}`;
  
  // 1. Cache Check
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey] && (Date.now() - cached[cacheKey].timestamp < CACHE_TTL)) {
    return cached[cacheKey].data;
  }

  try {
    // 2. TMDb Resolution
    const tmdbData = await resolveTMDb(title, year);
    let lbUrl = '';

    if (tmdbData && tmdbData.imdb_id) {
      // Primary: Use IMDb redirect
      lbUrl = `https://letterboxd.com/imdb/${tmdbData.imdb_id}/`;
    } else {
      // Fallback: Use Letterboxd search to find the slug
      lbUrl = await resolveLetterboxdSlug(title);
    }

    if (!lbUrl) throw new Error('Could not find Letterboxd page');

    const response = await fetch(lbUrl);
    if (!response.ok) throw new Error('Letterboxd page fetch failed');
    
    const canonicalUrl = response.url;
    const html = await response.text();

    // 4. JSON-LD Parsing
    const rating = parseRatingFromJsonLd(html);

    const result = {
      rating: rating || 'N/A',
      url: canonicalUrl,
      title: tmdbData?.title || title,
      year: tmdbData?.year || year,
      genres: tmdbData?.genres || []
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
    return null;
  }

  let searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
  if (year) searchUrl += `&year=${year}`;

  let searchRes = await fetch(searchUrl);
  let searchData = await searchRes.json();

  if ((!searchData.results || searchData.results.length === 0) && year) {
    searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    searchRes = await fetch(searchUrl);
    searchData = await searchRes.json();
  }

  if (!searchData.results || searchData.results.length === 0) return null;

  const topResult = searchData.results[0];
  const detailUrl = `https://api.themoviedb.org/3/movie/${topResult.id}?api_key=${TMDB_API_KEY}`;
  const detailRes = await fetch(detailUrl);
  const detailData = await detailRes.json();

  return {
    id: topResult.id,
    imdb_id: detailData.imdb_id,
    title: detailData.title,
    year: detailData.release_date ? detailData.release_date.split('-')[0] : null,
    genres: detailData.genres ? detailData.genres.map(g => g.name) : []
  };
}

async function resolveLetterboxdSlug(title) {
  const searchUrl = `https://letterboxd.com/search/films/${encodeURIComponent(title)}/`;
  try {
    const res = await fetch(searchUrl);
    const html = await res.text();
    const slugMatch = html.match(/href="(\/film\/[^"]+\/)"/);
    return slugMatch ? `https://letterboxd.com${slugMatch[1]}` : null;
  } catch (e) {
    return null;
  }
}

function parseRatingFromJsonLd(html) {
  try {
    const ldJsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!ldJsonMatch) return null;

    const data = JSON.parse(ldJsonMatch[1]);
    if (data.aggregateRating && data.aggregateRating.ratingValue) {
      return parseFloat(data.aggregateRating.ratingValue).toFixed(1);
    }
    if (Array.isArray(data)) {
      const filmObj = data.find(item => item['@type'] === 'Movie');
      if (filmObj && filmObj.aggregateRating) {
        return parseFloat(filmObj.aggregateRating.ratingValue).toFixed(1);
      }
    }
  } catch (e) {}
  return null;
}

async function handleAuthFlow() {
  const redirectUri = chrome.identity.getRedirectURL();
  const clientId = 'YOUR_CLIENT_ID'; // Placeholder
  const authUrl = `https://letterboxd.com/api/v0/auth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=write`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, async (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        reject(new Error(chrome.runtime.lastError?.message || 'User cancelled or failed to auth'));
        return;
      }

      const url = new URL(redirectUrl);
      const code = url.searchParams.get('code');
      
      if (code) {
        // Exchange code for token
        const mockToken = 'lb_token_' + Math.random().toString(36).substr(2);
        await chrome.storage.local.set({ authToken: mockToken, username: 'LetterboxdUser' });
        resolve({ success: true, username: 'LetterboxdUser' });
      } else {
        reject(new Error('No auth code returned'));
      }
    });
  });
}

