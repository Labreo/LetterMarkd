// LetterMarkd Service Worker - Final Scraper Build
const CACHE_TTL = 24 * 60 * 60 * 1000;

const DEFAULT_ALLOWLIST = [
  'reddit.com', 'imdb.com', 'wikipedia.org', 'youtube.com', 'netflix.com', 
  'primevideo.com', 'amazon.com', 'disneyplus.com', 'max.com', 'hbomax.com',
  'hulu.com', 'rottentomatoes.com', 'metacritic.com', 'boxofficemojo.com',
  'mubi.com', 'criterion.com', 'letterboxd.com', 'google.com'
];

chrome.runtime.onInstalled.addListener(() => {
  // Clear old version caches (v1 to v7)
  chrome.storage.local.get(null, (items) => {
    const keysToRemove = Object.keys(items).filter(key => key.startsWith('film_v') && !key.startsWith('film_v8'));
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
    handleFetchRating(request.query, null)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

async function handleFetchRating(title, year) {
  const cacheKey = `film_v8_${title.toLowerCase().replace(/\s+/g, '_')}_${year || ''}`;
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
    
    // CSI Fetch for dynamic watch data
    if (watchProviders.length === 0) {
      try {
        const slug = lbResult.url.split('/film/')[1].split('/')[0];
        const csiUrl = `https://letterboxd.com/csi/film/${slug}/justwatch/`;
        const csiRes = await fetch(csiUrl);
        const csiHtml = await csiRes.text();
        watchProviders = parseWatchProviders(csiHtml);
      } catch (e) {}
    }

    const result = { ...parsedData, reviews, watchProviders, url: lbResult.url, title: lbResult.title, year: lbResult.year };
    chrome.storage.local.set({ [cacheKey]: { data: result, timestamp: Date.now() } });
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

function parseWatchProviders(html) {
  const providers = [];
  try {
    // Look for any title containing Stream/Rent/Buy from...
    const matches = html.match(/title="[^"]*(Stream|Rent|Buy) from ([^"]+)"/g) || [];
    
    for (const match of matches) {
      const nameMatch = match.match(/from (.*?)"/);
      if (nameMatch) {
        const name = nameMatch[1].replace(/ on .*/, '').trim();
        if (!providers.includes(name) && providers.length < 5) {
          providers.push(name);
        }
      }
    }
  } catch (e) {}
  return providers;
}
