
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
    jsonText = jsonText.replace(/^\/\*\s*<!\[CDATA\[\s*\*\//, '').replace(/\/\*\s*\]\]>\s*\*\/$/, '').trim();
    const data = JSON.parse(jsonText);
    const extract = (obj) => {
      if (!obj.aggregateRating) return { rating: null, count: null };
      const val = obj.aggregateRating.ratingValue;
      const count = obj.aggregateRating.ratingCount;
      return {
        rating: (val && !isNaN(parseFloat(val))) ? parseFloat(val).toFixed(2) : null,
        count: count ? count.toLocaleString() : null
      };
    };
    if (Array.isArray(data)) {
      const film = data.find(i => i['@type'] === 'Movie');
      return film ? extract(film) : { rating: null, count: null };
    }
    return extract(data);
  } catch (e) { return { rating: null, count: null }; }
}

async function runTests() {
  const cases = [
    "Michael", "Mother Mary", "Over Your Dead Body",
    "Freddy Got Fingered", "Crocodile Dundee in Los Angeles",
    "Lee Cronin's The Mummy", "Normal", "Exit 8",
    "You, Me & Tuscany", "Faces of Death", "Beast",
    "Super Mario Galaxy", "The Drama", "Outcome",
    "Thrash", "Pizza Movie", "Mike & Nick & Nick & Alice",
    "War Machine", "Peaky Blinders: The Immortal Man"
  ];
  
  console.log(`| Title | Status | Rating | Slug |`);
  console.log(`|-------|--------|--------|------|`);

  for (const title of cases) {
    const result = await guessLetterboxdSlug(title, null);
    if (result) {
      const res = await fetch(result.url);
      const html = await res.text();
      const rating = parseRatingFromJsonLd(html);
      console.log(`| ${title} | ✅ | ${rating.rating || 'N/A'} | ${result.url.replace('https://letterboxd.com/film/', '')} |`);
    } else {
      console.log(`| ${title} | ❌ | - | - |`);
    }
  }
}

runTests();
