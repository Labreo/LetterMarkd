const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseRatingFromJsonLd } = require('../background.js');

describe('parseRatingFromJsonLd', () => {
  it('returns { rating: null } for empty or invalid HTML without JSON-LD script', () => {
    assert.deepEqual(parseRatingFromJsonLd(''), { rating: null });
    assert.deepEqual(parseRatingFromJsonLd('<html><body>No script here</body></html>'), { rating: null });
  });

  it('returns { rating: null } when JSON inside script is malformed', () => {
    const html = '<script type="application/ld+json">{ invalid json content }</script>';
    assert.deepEqual(parseRatingFromJsonLd(html), { rating: null });
  });

  it('correctly handles CDATA wrapper inside script tag', () => {
    const jsonLd = {
      '@type': 'Movie',
      name: 'Dune',
      aggregateRating: {
        ratingValue: 4.156,
        ratingCount: 50000,
        reviewCount: 12000
      }
    };
    const html = `<script type="application/ld+json">/* <![CDATA[ */${JSON.stringify(jsonLd)}/* ]]> */</script>`;
    const result = parseRatingFromJsonLd(html);
    assert.equal(result.rating, '4.16');
    assert.equal(result.ratingCount, (50000).toLocaleString());
    assert.equal(result.reviewCount, (12000).toLocaleString());
  });

  it('parses a single Movie JSON-LD object with complete metadata', () => {
    const movieData = {
      '@context': 'http://schema.org',
      '@type': 'Movie',
      name: 'Oppenheimer',
      description: 'The story of J. Robert Oppenheimer.',
      tagline: 'The world forever changes.',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: 4.25,
        ratingCount: 123456,
        reviewCount: 7890
      },
      director: [{ '@type': 'Person', name: 'Christopher Nolan' }],
      actors: [
        { '@type': 'Person', name: 'Cillian Murphy' },
        { '@type': 'Person', name: 'Emily Blunt' },
        { '@type': 'Person', name: 'Matt Damon' },
        { '@type': 'Person', name: 'Robert Downey Jr.' }
      ],
      genre: ['Biography', 'Drama', 'History'],
      image: { '@type': 'ImageObject', url: 'https://example.com/oppenheimer.jpg' },
      releasedEvent: [{ '@type': 'PublicationEvent', startDate: '2023-07-21' }]
    };

    const html = `<script type="application/ld+json">${JSON.stringify(movieData)}</script>`;
    const result = parseRatingFromJsonLd(html);

    assert.equal(result.rating, '4.25');
    assert.equal(result.ratingCount, (123456).toLocaleString());
    assert.equal(result.reviewCount, (7890).toLocaleString());
    assert.equal(result.director, 'Christopher Nolan');
    assert.equal(result.cast, 'Cillian Murphy, Emily Blunt, Matt Damon'); // Top 3
    assert.deepEqual(result.genres, ['Biography', 'Drama', 'History']);
    assert.equal(result.image, 'https://example.com/oppenheimer.jpg');
    assert.equal(result.year, '2023-07-21');
    assert.equal(result.description, 'The story of J. Robert Oppenheimer.');
    assert.equal(result.tagline, 'The world forever changes.');
  });

  it('parses JSON-LD when root data is an array containing a Movie object', () => {
    const arrayData = [
      { '@type': 'WebPage', name: 'Movie Page' },
      {
        '@type': 'Movie',
        name: 'The Dark Knight',
        aggregateRating: { ratingValue: 4.5 },
        director: { name: 'Christopher Nolan' }
      }
    ];

    const html = `<script type="application/ld+json">${JSON.stringify(arrayData)}</script>`;
    const result = parseRatingFromJsonLd(html);

    assert.equal(result.rating, '4.50');
    assert.equal(result.director, 'Christopher Nolan');
  });

  it('handles various director formats (single object, array of objects, missing)', () => {
    // Single object director
    const html1 = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Movie',
      director: { name: 'Quentin Tarantino' }
    })}</script>`;
    assert.equal(parseRatingFromJsonLd(html1).director, 'Quentin Tarantino');

    // Array of directors
    const html2 = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Movie',
      director: [{ name: 'Joel Coen' }, { name: 'Ethan Coen' }]
    })}</script>`;
    assert.equal(parseRatingFromJsonLd(html2).director, 'Joel Coen, Ethan Coen');

    // Missing director
    const html3 = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Movie'
    })}</script>`;
    assert.equal(parseRatingFromJsonLd(html3).director, null);
  });

  it('handles various genre formats (single string, array, missing)', () => {
    // Single string genre
    const html1 = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Movie',
      genre: 'Sci-Fi'
    })}</script>`;
    assert.deepEqual(parseRatingFromJsonLd(html1).genres, ['Sci-Fi']);

    // Array of genres
    const html2 = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Movie',
      genre: ['Sci-Fi', 'Thriller']
    })}</script>`;
    assert.deepEqual(parseRatingFromJsonLd(html2).genres, ['Sci-Fi', 'Thriller']);

    // Missing genre
    const html3 = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Movie'
    })}</script>`;
    assert.deepEqual(parseRatingFromJsonLd(html3).genres, []);
  });

  it('handles various image formats (string, object, array, missing)', () => {
    // Image as string
    const html1 = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Movie',
      image: 'https://example.com/poster.jpg'
    })}</script>`;
    assert.equal(parseRatingFromJsonLd(html1).image, 'https://example.com/poster.jpg');

    // Image as object
    const html2 = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Movie',
      image: { url: 'https://example.com/poster2.jpg' }
    })}</script>`;
    assert.equal(parseRatingFromJsonLd(html2).image, 'https://example.com/poster2.jpg');

    // Image as array
    const html3 = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Movie',
      image: [{ url: 'https://example.com/poster3.jpg' }]
    })}</script>`;
    assert.equal(parseRatingFromJsonLd(html3).image, 'https://example.com/poster3.jpg');

    // Missing image
    const html4 = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Movie'
    })}</script>`;
    assert.equal(parseRatingFromJsonLd(html4).image, null);
  });

  it('extracts year/date from releasedEvent or datePublished fallbacks', () => {
    // releasedEvent with full date
    const html1 = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Movie',
      releasedEvent: [{ startDate: '2022' }, { startDate: '2022-03-04' }]
    })}</script>`;
    assert.equal(parseRatingFromJsonLd(html1).year, '2022-03-04');

    // releasedEvent without full date uses first element
    const html2 = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Movie',
      releasedEvent: [{ startDate: '2022' }]
    })}</script>`;
    assert.equal(parseRatingFromJsonLd(html2).year, '2022');

    // Fallback to datePublished
    const html3 = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Movie',
      datePublished: '2019-11-27'
    })}</script>`;
    assert.equal(parseRatingFromJsonLd(html3).year, '2019-11-27');

    // Neither available
    const html4 = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Movie'
    })}</script>`;
    assert.equal(parseRatingFromJsonLd(html4).year, null);
  });

  it('handles missing or non-numeric ratingValue gracefully', () => {
    const html1 = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Movie',
      aggregateRating: { ratingValue: 'N/A' }
    })}</script>`;
    assert.equal(parseRatingFromJsonLd(html1).rating, null);

    const html2 = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Movie',
      aggregateRating: {}
    })}</script>`;
    assert.equal(parseRatingFromJsonLd(html2).rating, null);
  });
});
