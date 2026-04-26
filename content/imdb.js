// LetterMarkd IMDb Content Script

async function getRating(title, year) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'FETCH_RATING', title, year }, resolve);
  });
}

async function injectIMDbHeader() {
  // Target the main title h1 on IMDb film pages
  const titleEl = document.querySelector('h1[data-testid="hero__pageTitle"]');
  if (!titleEl || titleEl.querySelector('.lm-imdb-badge')) return;

  const rawTitle = titleEl.innerText;
  
  // Extract year from the metadata list right below the title
  const yearEl = document.querySelector('ul[data-testid="hero-title-block__metadata"] li a');
  const year = yearEl ? yearEl.innerText.trim() : null;

  const data = await getRating(rawTitle, year);

  if (data && data.rating) {
    const badge = document.createElement('a');
    badge.href = data.url;
    badge.target = '_blank';
    badge.title = `View ${data.title} on Letterboxd`;
    badge.className = 'lm-imdb-badge';
    badge.style.cssText = 'display:inline-flex; align-items:center; gap:6px; background:#14181c; color:#00e054; padding:4px 10px; border-radius:6px; font-size:16px; border:1px solid rgba(0, 224, 84, 0.4); text-decoration:none; margin-left:16px; font-weight:bold; vertical-align:middle; transition: background 0.2s;';
    
    // Add hover effect
    badge.onmouseover = () => badge.style.background = '#1b2228';
    badge.onmouseout = () => badge.style.background = '#14181c';

    badge.innerHTML = `<span style="color:#fff;">Letterboxd</span> <span>★ ${data.rating}</span>`;
    
    titleEl.appendChild(badge);
  }
}

// IMDb acts as an SPA sometimes, use an observer or interval for navigation
setInterval(injectIMDbHeader, 1500);
