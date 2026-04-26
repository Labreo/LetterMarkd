// LetterMarkd Service Worker - Final Scraper Build
const CACHE_TTL = 24 * 60 * 60 * 1000;

const DEFAULT_ALLOWLIST = [
  'reddit.com', 'imdb.com', 'wikipedia.org', 'youtube.com', 'netflix.com', 
  'primevideo.com', 'amazon.com', 'disneyplus.com', 'max.com', 'hbomax.com',
  'hulu.com', 'rottentomatoes.com', 'metacritic.com', 'boxofficemojo.com',
  'mubi.com', 'criterion.com', 'letterboxd.com', 'google.com'
];

chrome.runtime.onInstalled.addListener(() => {
  // Clear old version caches (v1 to v11)
  chrome.storage.local.get(null, (items) => {
    const keysToRemove = Object.keys(items).filter(key => key.startsWith('film_v') && !key.startsWith('film_v12'));
    if (keysToRemove.length > 0) {
      chrome.storage.local.remove(keysToRemove);
      console.log(`[LetterMarkd] Cleared ${keysToRemove.length} old cache entries.`);
    }
  });

  chrome.storage.local.get(['allowlist', 'blocklist'], (result) => {
    if (!result.allowlist) chrome.storage.local.set({ allowlist: DEFAULT_ALLOWLIST });
    if (!result.blocklist) chrome.storage.local.set({ blocklist: [] });
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SEARCH_FILM') {
    handleFetchRating(request.query, null, sender.tab?.id)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

async function handleFetchRating(title, year, tabId) {
  const cacheKey = `film_v12_${title.toLowerCase().replace(/\s+/g, '_')}_${year || ''}`;
  const cached = await chrome.storage.local.get(cacheKey);
  
  if (cached[cacheKey] && (Date.now() - cached[cacheKey].timestamp < CACHE_TTL)) {
    return cached[cacheKey].data;
  }

  try {
    const lbResult = await guessLetterboxdSlug(title, year);
    if (!lbResult || !lbResult.url) throw new Error('Film not found');

    const response = await fetch(lbResult.url);
    const html = await response.text();

    const parsedData = parseRatingFromJsonLd(html);
    const reviews = parseReviews(html);
    let watchProviders = parseWatchProviders(html);
    
    // Stage 2: CSI Fetch for dynamic watch data if main page had none
    if (watchProviders.length === 0) {
      try {
        const slug = lbResult.url.split('/film/')[1].split('/')[0];
        const csiUrl = `https://letterboxd.com/csi/film/${slug}/justwatch/?esiAllowUser=true&esiAllowCountry=true`;
        const csiRes = await fetch(csiUrl);
        const csiHtml = await csiRes.text();
        watchProviders = parseWatchProviders(csiHtml);
      } catch (e) {}
    }

    // Initial result with just Letterboxd data (FAST)
    const result = { 
      ...parsedData, 
      reviews, 
      watchProviders, 
      extraStats: { loading: true }, 
      url: lbResult.url, 
      title: lbResult.title, 
      year: lbResult.year 
    };

    // Trigger extra stats in the background (SLOW)
    const imdbId = extractImdbId(html);
    if (imdbId && tabId) {
      fetchExtraStatsAndNotify(imdbId, result, cacheKey, tabId);
    } else {
      chrome.storage.local.set({ [cacheKey]: { data: result, timestamp: Date.now() } });
    }

    return result;
  } catch (e) { return { error: e.message }; }
}

async function guessLetterboxdSlug(title, year) {
  let cleanTitle = title;
  let detectedYear = year;
  const yearMatch = title.match(/\(?(\d{4})\)?$/);
  if (yearMatch) {
    detectedYear = yearMatch[1];
    cleanTitle = title.replace(yearMatch[0], '').trim();
  }

  const toSlug = (text) => text.toLowerCase().replace(/['".,;:!?()[\]{}]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const attempts = new Set();
  const base = toSlug(cleanTitle);
  attempts.add(base);
  if (cleanTitle.includes('&')) attempts.add(toSlug(cleanTitle.replace(/&/g, 'and')));
  if (detectedYear) {
    const currentVars = Array.from(attempts);
    currentVars.forEach(v => attempts.add(`${v}-${detectedYear}`));
  }
  const currentVars = Array.from(attempts);
  currentVars.forEach(v => {
    if (v.startsWith('the-')) attempts.add(v.replace(/^the-/, ''));
    else attempts.add(`the-${v}`);
  });

  for (const slug of attempts) {
    const url = `https://letterboxd.com/film/${slug}/`;
    try {
      const res = await fetch(url);
      if (res.status === 200) return { url, title: cleanTitle, year: detectedYear };
    } catch (e) {}
  }
  return null;
}

function parseRatingFromJsonLd(html) {
  try {
    const ldJsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!ldJsonMatch) return { rating: null };
    let jsonText = ldJsonMatch[1].trim();
    jsonText = jsonText.replace(/^\/\*\s*<!\[CDATA\[\s*\*\//, '').replace(/\/\*\s*\]\]>\s*\*\/$/, '').trim();
    const data = JSON.parse(jsonText);
    const extract = (obj) => {
      const ar = obj.aggregateRating || {};
      const director = obj.director ? (Array.isArray(obj.director) ? obj.director.map(d => d.name).join(', ') : obj.director.name) : null;
      const cast = obj.actors ? obj.actors.slice(0, 3).map(a => a.name).join(', ') : null;
      const genres = Array.isArray(obj.genre) ? obj.genre : (obj.genre ? [obj.genre] : []);
      const imageObj = obj.image ? (Array.isArray(obj.image) ? obj.image[0] : obj.image) : null;
      return {
        rating: (ar.ratingValue && !isNaN(parseFloat(ar.ratingValue))) ? parseFloat(ar.ratingValue).toFixed(2) : null,
        ratingCount: ar.ratingCount ? parseInt(ar.ratingCount).toLocaleString() : null,
        reviewCount: ar.reviewCount ? parseInt(ar.reviewCount).toLocaleString() : null,
        image: typeof imageObj === 'string' ? imageObj : (imageObj?.url || null),
        director, cast, genres
      };
    };
    return Array.isArray(data) ? extract(data.find(i => i['@type'] === 'Movie')) : extract(data);
  } catch (e) { return { rating: null }; }
}

function parseReviews(html) {
  const reviews = [];
  try {
    // Robust review block detection based on provided HTML
    const reviewBlocks = html.match(/<article class="production-viewing([\s\S]*?)<\/article>/g) || [];
    
    for (const block of reviewBlocks) {
      if (reviews.length >= 3) break;
      
      const authorMatch = block.match(/<strong class="displayname">(.*?)<\/strong>/);
      const ratingMatch = block.match(/aria-label="(.*?)"/);
      const isSpoiler = block.includes('js-spoiler-container') || block.includes('contains spoilers');
      
      let text = '';
      // Extract from hidden body if spoiler, otherwise normal body
      const bodyMatch = block.match(/<div[^>]*class="[^"]*js-review-body[^"]*"[^>]*>([\s\S]*?)<\/div>/) ||
                        block.match(/<div[^>]*class="[^"]*body-text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      
      if (bodyMatch) {
        text = bodyMatch[1].replace(/<[^>]*>?/gm, '').replace(/&hellip;/g, '...').trim();
        // Clean up redundant whitespace
        text = text.replace(/\s+/g, ' ');
      }

      if (text && authorMatch) {
        reviews.push({
          author: authorMatch[1],
          rating: ratingMatch ? ratingMatch[1] : null,
          text: text.length > 300 ? text.substring(0, 300) + '...' : text,
          isSpoiler: !!isSpoiler
        });
      }
    }
  } catch (e) {}
  return reviews;
}

function extractImdbId(html) {
  // Handle both maindetails and standard title URLs
  const match = html.match(/imdb\.com\/title\/(tt\d+)/);
  return match ? match[1] : null;
}

const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};

async function fetchExtraStatsAndNotify(imdbId, baseData, cacheKey, tabId) {
  try {
    const [imdbRes, mojoRes] = await Promise.all([
      fetchWithTimeout(`https://www.imdb.com/title/${imdbId}/`, 3500, { headers: COMMON_HEADERS }).catch(() => null),
      fetchWithTimeout(`https://www.boxofficemojo.com/title/${imdbId}/`, 3500, { headers: COMMON_HEADERS }).catch(() => null)
    ]);

    let imdbRating = null;
    let boxOffice = null;
    let budget = null;

    if (imdbRes) {
      const html = await imdbRes.text();
      const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      if (ldMatch) {
        try {
          const data = JSON.parse(ldMatch[1]);
          imdbRating = data.aggregateRating?.ratingValue || null;
        } catch (e) {}
      }
    }

    if (mojoRes) {
      const html = await mojoRes.text();
      const wwMatch = html.match(/Worldwide<\/span><span class="money">([^<]+)<\/span>/);
      if (wwMatch) boxOffice = wwMatch[1];
      const bMatch = html.match(/Budget<\/span><span class="money">([^<]+)<\/span>/);
      if (bMatch) budget = bMatch[1];
    }

    const finalData = { ...baseData, extraStats: { imdbRating, boxOffice, budget, loading: false } };
    chrome.storage.local.set({ [cacheKey]: { data: finalData, timestamp: Date.now() } });
    
    // Notify the content script that extra stats are ready
    chrome.tabs.sendMessage(tabId, { type: 'EXTRA_STATS_READY', data: finalData });
  } catch (e) {
    const failedData = { ...baseData, extraStats: { loading: false } };
    chrome.storage.local.set({ [cacheKey]: { data: failedData, timestamp: Date.now() } });
  }
}

async function fetchWithTimeout(url, timeout = 3000, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(url, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
}

function parseWatchProviders(html) {
  const providers = new Set();
  try {
    // Stage 1: Already handled in handleFetchRating for main page, 
    // but this function is also called for CSI.
    
    // Look for standard title attributes (Stream/Rent/Buy)
    const titleMatches = html.match(/title="[^"]*(Stream|Rent|Buy) from ([^"]+)"/g) || [];
    titleMatches.forEach(m => {
      const match = m.match(/from (.*?)"/);
      if (match) providers.add(match[1].replace(/ on .*/, '').trim());
    });

    // Look for data-track attributes
    const trackMatches = html.match(/data-track-action="([^"]+)"/g) || [];
    trackMatches.forEach(m => {
      const name = m.match(/"([^"]+)"/)[1];
      if (!['Buy', 'Rent', 'Stream', 'All'].includes(name)) providers.add(name);
    });

    // Look for Alt tags in watch images
    const altMatches = html.match(/alt="Watch (.*?) on/g) || [];
    altMatches.forEach(m => {
      const match = m.match(/Watch (.*?) on/);
      if (match) providers.add(match[1].trim());
    });
  } catch (e) {}
  return Array.from(providers).slice(0, 5);
}
