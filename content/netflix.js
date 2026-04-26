// LetterMarkd Netflix Content Script
console.log('LetterMarkd injected into Netflix');

function injectBadges() {
  // Logic to find movie titles on Netflix and inject LetterMarkd badges
  // This will be site-specific DOM scraping
}

// Observe DOM changes to handle dynamic loading
const observer = new MutationObserver(() => {
  injectBadges();
});

observer.observe(document.body, { childList: true, subtree: true });
injectBadges();
