// LetterMarkd Service Worker (Background Script)
console.log('LetterMarkd Service Worker Initialized');

// Handle fetch requests (to bypass CORS)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchRating') {
    // Logic to fetch from Letterboxd API or TMDB
    // For now, returning a mock response
    sendResponse({ rating: '3.8', url: 'https://letterboxd.com/film/example/' });
  }
  return true;
});
