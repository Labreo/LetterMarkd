
async function guessLetterboxdSlug(title, year) {
  let cleanTitle = title;
  let detectedYear = year;

  const yearMatch = title.match(/\(?(\d{4})\)?$/);
  if (yearMatch) {
    detectedYear = yearMatch[1];
    cleanTitle = title.replace(yearMatch[0], '').trim();
  }

  const toSlug = (text) => {
    return text.toLowerCase()
      .replace(/&/g, 'and')
      .replace(/['".,;:!?()[\]{}]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const baseSlug = toSlug(cleanTitle);
  const attempts = new Set();
  attempts.add(baseSlug);
  if (detectedYear) attempts.add(`${baseSlug}-${detectedYear}`);

  if (baseSlug.startsWith('the-')) {
    const noThe = baseSlug.replace(/^the-/, '');
    attempts.add(noThe);
    if (detectedYear) attempts.add(`${noThe}-${detectedYear}`);
  } else {
    const withThe = `the-${baseSlug}`;
    attempts.add(withThe);
    if (detectedYear) attempts.add(`${withThe}-${detectedYear}`);
  }

  console.log(`   [Test] Trying variations for "${title}":`, Array.from(attempts));

  for (const slug of attempts) {
    const url = `https://letterboxd.com/film/${slug}/`;
    try {
      const res = await fetch(url);
      if (res.status === 200) {
        return { url, title: cleanTitle, year: detectedYear };
      }
    } catch (e) {}
  }
  return null;
}

function parseRatingFromJsonLd(html) {
  try {
    const ldJsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!ldJsonMatch) return { rating: null, count: null };
    
    let jsonText = ldJsonMatch[1].trim();
    // Strip CDATA if present
    jsonText = jsonText.replace(/^\/\*\s*<!\[CDATA\[\s*\*\//, '').replace(/\/\*\s*\]\]>\s*\*\/$/, '').trim();
    const data = JSON.parse(jsonText);
    
    const extract = (obj) => {
      if (!obj.aggregateRating) return { rating: null, count: null, image: null };
      const val = obj.aggregateRating.ratingValue;
      const count = obj.aggregateRating.ratingCount;
      return {
        rating: (val && !isNaN(parseFloat(val))) ? parseFloat(val).toFixed(2) : null,
        count: count ? count.toLocaleString() : null
      };
    };

    if (Array.isArray(data)) {
      const film = data.find(i => i['@type'] === 'Movie');
      return film ? extract(film) : { rating: null, count: null, image: null };
    }
    return extract(data);
  } catch (e) { 
    console.log("Parse Error:", e.message);
    return { rating: null, count: null, image: null }; 
  }
}

async function runTests() {
  const cases = ["The Matrix", "The Matrix (1999)", "Backrooms"];
  
  for (const title of cases) {
    console.log(`\nTesting: "${title}"`);
    const result = await guessLetterboxdSlug(title, null);
    if (result) {
      console.log(`   ✅ Success! URL: ${result.url}`);
      const res = await fetch(result.url);
      const html = await res.text();
      const rating = parseRatingFromJsonLd(html);
      console.log(`   ⭐ Rating: ${rating.rating} (${rating.count} ratings)`);
    } else {
      console.log(`   ❌ Failed to find slug.`);
    }
  }
}

runTests();
