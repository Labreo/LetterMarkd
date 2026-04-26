// LetterMarkd Netflix Content Script
const LOW_RATING_THRESHOLD = 2.5;

async function getRating(title, year) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'FETCH_RATING', title, year },
      (response) => {
        if (chrome.runtime.lastError || !response || response.error) {
          resolve(null);
        } else {
          resolve(response);
        }
      }
    );
  });
}

function createBadge(rating, url) {
  if (!rating || rating === 'N/A' || rating === '?') return null;

  const badge = document.createElement('a');
  badge.href = url;
  badge.target = '_blank';
  badge.className = 'lettermarkd-badge';
  
  // Format to two decimals if possible, otherwise use what we have
  const displayRating = parseFloat(rating).toFixed(2).replace(/\.00$/, '');

  badge.innerHTML = `
    <span>★ ${displayRating}</span>
    <div class="lettermarkd-tooltip">
      View on Letterboxd
    </div>
  `;
  
  badge.onclick = (e) => e.stopPropagation();
  return badge;
}

async function injectNetflix() {
  // Target title cards in rows
  const cards = document.querySelectorAll('.title-card');
  
  for (const card of cards) {
    if (card.querySelector('.lettermarkd-badge')) continue;

    const link = card.querySelector('a[aria-label]');
    if (!link) continue;

    const title = link.getAttribute('aria-label');
    
    // The visual container for the poster
    const posterContainer = card.querySelector('.boxshot-container') || card;
    posterContainer.classList.add('lettermarkd-container');

    const data = await getRating(title);
    if (data && data.rating && data.rating !== 'N/A') {
      const badge = createBadge(data.rating, data.url);
      if (badge) {
        posterContainer.appendChild(badge);

        // Apply low rating fade if below threshold
        if (parseFloat(data.rating) < LOW_RATING_THRESHOLD) {
          const img = posterContainer.querySelector('img');
          if (img) img.classList.add('lettermarkd-low-rating-poster');
        }
      }
    }
  }
}

// Observe DOM changes
const observer = new MutationObserver(() => injectNetflix());
observer.observe(document.body, { childList: true, subtree: true });

injectNetflix();
