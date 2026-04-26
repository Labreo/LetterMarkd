// LetterMarkd Service Worker
const TMDB_API_KEY = 'YOUR_TMDB_API_KEY_HERE'; // Placeholder
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_RATING') {
    handleFetchRating(request.title, request.year)
      .then(sendResponse)
      .catch(error => {
        console.error('Fetch error:', error);
        sendResponse({ error: error.message });
      });
    return true; // Keep channel open for async response
  }
});

async function handleFetchRating(title, year) {
  const cacheKey = `film_${title.toLowerCase().replace(/\s+/g, '_')}_${year || 'any'}`;
  
  // 1. Check Cache
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey] && (Date.now() - cached[cacheKey].timestamp < CACHE_TTL)) {
    console.log('Cache hit for:', title);
    return cached[cacheKey].data;
  }

  // 2. Cache Miss: Resolve TMDb -> Letterboxd -> Parse
  try {
    const filmData = await fetchFilmData(title, year);
    
    // 3. Store in Cache
    await chrome.storage.local.set({
      [cacheKey]: {
        data: filmData,
        timestamp: Date.now()
      }
    });

    return filmData;
  } catch (error) {
    throw new Error(`Failed to fetch film data: ${error.message}`);
  }
}

async function fetchFilmData(title, year) {
  // Step A: Search TMDb to get the canonical slug/ID
  // For now, we'll simulate the TMDb -> Letterboxd slug logic
  // Real implementation will use TMDB_API_KEY
  const slug = title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, '-');
  const lbUrl = `https://letterboxd.com/film/${slug}/`;

  try {
    const response = await fetch(lbUrl);
    if (!response.ok) throw new Error('Letterboxd page not found');
    
    const html = await response.text();
    const rating = parseRatingFromHTML(html);

    return {
      rating: rating || 'N/A',
      url: lbUrl,
      title: title
    };
  } catch (error) {
    return { rating: '?', url: lbUrl, title: title };
  }
}

function parseRatingFromHTML(html) {
  // Letterboxd uses ld+json or specific meta tags for ratings
  // We'll search for the ratingValue in the HTML
  const ratingMatch = html.match(/"ratingValue":\s*([\d.]+)/);
  if (ratingMatch && ratingMatch[1]) {
    return parseFloat(ratingMatch[1]).toFixed(1);
  }
  
  // Fallback: look for average-rating meta tag
  const metaMatch = html.match(/<meta name="twitter:data2" content="([\d.]+) out of 5">/);
  return metaMatch ? metaMatch[1] : null;
}
