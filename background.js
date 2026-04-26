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
  // Update cache prefix to force invalidation of old data structures
  const cacheKey = `film_v4_${title.toLowerCase().replace(/\s+/g, '_')}_${year || ''}`;
  
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
    const reviews = parseReviews(html);
    const watchProviders = parseWatchProviders(html);
    
    // Fallback to Meta Tags if JSON-LD fails for basic rating
    if (!parsedData.rating) {
      const metaData = parseRatingFromMeta(html);
      parsedData.rating = metaData.rating;
    }

    const result = {
      ...parsedData,
      reviews,
      watchProviders,
      url: lbResult.url,
      title: lbResult.title,
      year: lbResult.year
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
  let cleanTitle = title;
  let detectedYear = year;

  // 1. Extract year if it's in the title string like "The Matrix (1999)"
  const yearMatch = title.match(/\(?(\d{4})\)?$/);
  if (yearMatch) {
    detectedYear = yearMatch[1];
    cleanTitle = title.replace(yearMatch[0], '').trim();
  }

  const toSlug = (text) => {
    return text.toLowerCase()
      .replace(/['".,;:!?()[\]{}]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const attempts = new Set();
  
  // Variation 1: Standard slug (handles spaces/symbols as hyphens)
  const base = toSlug(cleanTitle);
  attempts.add(base);

  // Variation 2: Replace & with 'and'
  if (cleanTitle.includes('&')) {
    attempts.add(toSlug(cleanTitle.replace(/&/g, 'and')));
  }

  // Add years to all current variations
  if (detectedYear) {
    const currentVars = Array.from(attempts);
    currentVars.forEach(v => attempts.add(`${v}-${detectedYear}`));
  }

  // Handle "The" prefix for all current variations
  const currentVars = Array.from(attempts);
  currentVars.forEach(v => {
    if (v.startsWith('the-')) {
      attempts.add(v.replace(/^the-/, ''));
    } else {
      attempts.add(`the-${v}`);
    }
  });

  console.log(`[LetterMarkd] Trying ${attempts.size} variations for "${title}"`);

  for (const slug of attempts) {
    const url = `https://letterboxd.com/film/${slug}/`;
    try {
      // Use GET request (standard)
      const res = await fetch(url);
      if (res.status === 200) {
        return { url, title: cleanTitle, year: detectedYear };
      }
    } catch (e) {
      console.error('[LetterMarkd] Slug probe error:', e);
    }
  }
  
  return null;
}

function parseRatingFromJsonLd(html) {
  try {
    const ldJsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!ldJsonMatch) return { rating: null, count: null };
    
    let jsonText = ldJsonMatch[1].trim();
    jsonText = jsonText.replace(/^\/\*\s*<!\[CDATA\[\s*\*\//, '').replace(/\/\*\s*\]\]>\s*\*\/$/, '').trim();
    const data = JSON.parse(jsonText);
    
    const extract = (obj) => {
      const ar = obj.aggregateRating || {};
      const imageObj = obj.image ? (Array.isArray(obj.image) ? obj.image[0] : obj.image) : null;
      
      const director = obj.director ? (Array.isArray(obj.director) ? obj.director.map(d => d.name).join(', ') : obj.director.name) : null;
      const cast = obj.actors ? obj.actors.slice(0, 3).map(a => a.name).join(', ') : null;
      const genres = Array.isArray(obj.genre) ? obj.genre : (obj.genre ? [obj.genre] : []);

      return {
        rating: (ar.ratingValue && !isNaN(parseFloat(ar.ratingValue))) ? parseFloat(ar.ratingValue).toFixed(2) : null,
        ratingCount: ar.ratingCount ? ar.ratingCount.toLocaleString() : null,
        reviewCount: ar.reviewCount ? ar.reviewCount.toLocaleString() : null,
        image: typeof imageObj === 'string' ? imageObj : (imageObj?.url || null),
        director,
        cast,
        genres
      };
    };

    if (Array.isArray(data)) {
      const film = data.find(i => i['@type'] === 'Movie');
      return film ? extract(film) : { rating: null };
    }
    return extract(data);
  } catch (e) { return { rating: null }; }
}

function parseReviews(html) {
  const reviews = [];
  try {
    const reviewRegex = /<div class="listitem js-listitem">([\s\S]*?)<\/div>\s*<\/article>\s*<\/div>/g;
    let match;
    while ((match = reviewRegex.exec(html)) !== null && reviews.length < 3) {
      const block = match[1];
      const authorMatch = block.match(/<strong class="displayname">(.*?)<\/strong>/);
      const ratingMatch = block.match(/aria-label="(.*?)"/);
      const textMatch = block.match(/<div class="body-text[^>]*?>\s*<p>(.*?)<\/p>/s);
      const isSpoiler = block.includes('review-spoiler') || block.includes('contains spoilers');
      
      if (textMatch) {
        reviews.push({
          author: authorMatch ? authorMatch[1] : 'Letterboxd Member',
          rating: ratingMatch ? ratingMatch[1] : null,
          text: textMatch[1].replace(/<[^>]*>?/gm, '').trim(),
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
    const watchSectionMatch = html.match(/<section class="watch-panel[^>]*">([\s\S]*?)<\/section>/);
    if (watchSectionMatch) {
      const links = watchSectionMatch[1].match(/<a[^>]*title="(.*?)"[^>]*>/g);
      if (links) {
        links.forEach(link => {
          const titleMatch = link.match(/title="(.*?)"/);
          if (titleMatch && providers.length < 5) {
            const providerName = titleMatch[1].replace(/^(Stream|Rent|Buy) from /, '').replace(/ on .*/, '').trim();
            if (!providers.includes(providerName)) {
              providers.push(providerName);
            }
          }
        });
      }
    }
  } catch (e) {}
  return providers;
}

function parseRatingFromMeta(html) {
  try {
    const twitterRatingMatch = html.match(/<meta name="twitter:data2" content="([\d.]+) out of 5">/);
    if (twitterRatingMatch) {
      return {
        rating: parseFloat(twitterRatingMatch[1]).toFixed(2),
        count: null,
        image: null
      };
    }
    
    // Last ditch: og:title might have year
    const ogTitleMatch = html.match(/<meta property="og:title" content="(.*?) \((\d{4})\)">/);
    if (ogTitleMatch) {
      return { rating: null, title: ogTitleMatch[1], year: ogTitleMatch[2] };
    }
  } catch (e) {}
  return { rating: null, count: null, image: null };
}

