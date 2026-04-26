
async function guessLetterboxdSlug(title) {
  const toSlug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const url = `https://letterboxd.com/film/${toSlug(title)}/`;
  const res = await fetch(url);
  return res.status === 200 ? { url, title } : null;
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
      const imageObj = obj.image ? (Array.isArray(obj.image) ? obj.image[0] : obj.image) : null;
      const director = obj.director ? (Array.isArray(obj.director) ? obj.director.map(d => d.name).join(', ') : obj.director.name) : null;
      const cast = obj.actors ? obj.actors.slice(0, 3).map(a => a.name).join(', ') : null;
      const genres = Array.isArray(obj.genre) ? obj.genre : (obj.genre ? [obj.genre] : []);
      return {
        rating: ar.ratingValue || null,
        director, cast, genres, image: imageObj?.url || imageObj
      };
    };
    return Array.isArray(data) ? extract(data.find(i => i['@type'] === 'Movie')) : extract(data);
  } catch (e) { return { error: e.message }; }
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
      if (textMatch) {
        reviews.push({
          author: authorMatch ? authorMatch[1] : 'Member',
          rating: ratingMatch ? ratingMatch[1] : null,
          text: textMatch[1].replace(/<[^>]*>?/gm, '').trim()
        });
      }
    }
  } catch (e) {}
  return reviews;
}

async function diagnostic() {
  console.log("Testing 'The Matrix'...");
  const slug = await guessLetterboxdSlug("The Matrix");
  const res = await fetch(slug.url);
  const html = await res.text();
  
  const info = parseRatingFromJsonLd(html);
  const reviews = parseReviews(html);
  
  console.log("INFO EXTRACTED:", JSON.stringify(info, null, 2));
  console.log("REVIEWS EXTRACTED count:", reviews.length);
  if (reviews.length > 0) console.log("FIRST REVIEW:", reviews[0].text.substring(0, 50) + "...");
}

diagnostic();
