// LetterMarkd Netflix Content Script

/**
 * Sends a message to the background script to fetch a rating
 */
async function getRating(title, year) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'FETCH_RATING', title, year },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error fetching rating:', chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(response);
        }
      }
    );
  });
}

/**
 * Creates and injects the LetterMarkd badge
 */
function createBadge(rating, url) {
  const badge = document.createElement('a');
  badge.href = url;
  badge.target = '_blank';
  badge.className = 'lettermarkd-badge';
  if (parseFloat(rating) >= 3.5) badge.classList.add('high-rating');
  
  badge.innerHTML = `
    <span>★ ${rating}</span>
    <div class="lettermarkd-tooltip">
      View on Letterboxd
    </div>
  `;
  
  badge.onclick = (e) => e.stopPropagation();
  return badge;
}

/**
 * Netflix-specific injection logic
 */
async function injectNetflix() {
  // Target title cards in rows
  const cards = document.querySelectorAll('.title-card');
  
  for (const card of cards) {
    if (card.querySelector('.lettermarkd-badge')) continue;

    // Netflix cards often hide the title in the aria-label of the link
    const link = card.querySelector('a[aria-label]');
    if (!link) continue;

    const title = link.getAttribute('aria-label');
    
    // Create a container for the badge if it doesn't exist
    const container = card.querySelector('.ptrack-content') || card;
    
    // Fetch rating
    const data = await getRating(title);
    if (data && data.rating) {
      const badge = createBadge(data.rating, data.url);
      container.appendChild(badge);
    }
  }
}

// Observe DOM changes for dynamic content loading
const observer = new MutationObserver((mutations) => {
  // Debounce or throttle could be added here
  injectNetflix();
});

observer.observe(document.body, { 
  childList: true, 
  subtree: true 
});

// Initial run
injectNetflix();
