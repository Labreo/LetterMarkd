// LetterMarkd Netflix Content Script
const LOW_RATING_THRESHOLD = 2.5;
let fadeOutTimer = null;

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

function createCard(data) {
  const card = document.createElement('div');
  card.className = 'lettermarkd-card';
  
  // Genres (Top 3)
  const genresHtml = (data.genres || ['Drama', 'Thriller', 'Action']).slice(0, 3)
    .map(g => `<span class="lm-genre-tag">${g}</span>`).join('');

  const displayRating = parseFloat(data.rating).toFixed(2);

  card.innerHTML = `
    <div class="lm-title">${data.title}</div>
    <div class="lm-meta">${data.year || ''} • Directed by ...</div>
    
    <div class="lm-rating-section">
      <div class="lm-stars">★ ${displayRating}</div>
      <div class="lm-count">(47,342 ratings)</div>
    </div>

    <div class="lm-genres">${genresHtml}</div>

    <div class="lm-actions">
      <button class="lm-btn lm-btn-primary" data-action="watchlist">+ Watchlist</button>
      <button class="lm-btn" data-action="watched">✓ Mark Watched</button>
    </div>

    <a href="${data.url}" target="_blank" class="lm-link">Open on Letterboxd</a>
  `;

  // Prevent clicks inside card from bubbling to Netflix
  card.onclick = (e) => e.stopPropagation();

  // Action listeners
  card.querySelectorAll('button').forEach(btn => {
    btn.onclick = (e) => {
      const action = btn.dataset.action;
      chrome.runtime.sendMessage({ type: 'PERFORM_ACTION', action, filmId: data.imdb_id });
      btn.textContent = '...';
      setTimeout(() => btn.textContent = action === 'watchlist' ? 'Added!' : 'Watched!', 500);
    };
  });

  return card;
}

function createBadge(data) {
  if (!data.rating || data.rating === 'N/A' || data.rating === '?') return null;

  const container = document.createElement('div');
  container.className = 'lettermarkd-badge';
  
  const pillText = document.createElement('span');
  pillText.innerHTML = `★ ${parseFloat(data.rating).toFixed(1)}`;
  container.appendChild(pillText);

  const card = createCard(data);
  container.appendChild(card);

  // Position detection logic
  container.onmouseenter = () => {
    if (fadeOutTimer) clearTimeout(fadeOutTimer);
    
    const rect = container.getBoundingClientRect();
    if (rect.right + 250 > window.innerWidth) {
      card.classList.add('flip-left');
    } else {
      card.classList.remove('flip-left');
    }
  };

  container.onmouseleave = () => {
    fadeOutTimer = setTimeout(() => {
      // Logic handled by CSS hover, but timer keeps container "active" if needed
    }, 300);
  };

  return container;
}

async function injectNetflix() {
  const cards = document.querySelectorAll('.title-card');
  
  for (const card of cards) {
    if (card.querySelector('.lettermarkd-badge')) continue;

    const link = card.querySelector('a[aria-label]');
    if (!link) continue;

    const title = link.getAttribute('aria-label');
    const posterContainer = card.querySelector('.boxshot-container') || card;
    posterContainer.classList.add('lettermarkd-container');

    const data = await getRating(title);
    if (data && data.rating && data.rating !== 'N/A') {
      const badge = createBadge(data);
      if (badge) {
        posterContainer.appendChild(badge);
        if (parseFloat(data.rating) < LOW_RATING_THRESHOLD) {
          const img = posterContainer.querySelector('img');
          if (img) img.classList.add('lettermarkd-low-rating-poster');
        }
      }
    }
  }
}

const observer = new MutationObserver(() => injectNetflix());
observer.observe(document.body, { childList: true, subtree: true });

injectNetflix();
