// LetterMarkd Prime Video Content Script

async function getRating(title, year) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'FETCH_RATING', title, year }, (res) => resolve(res));
  });
}

async function injectPrime() {
  // Prime Video grid items
  const cards = document.querySelectorAll('div[data-testid="grid-item"]:not(.lm-processed), .tst-title-card:not(.lm-processed)');
  
  for (const card of cards) {
    card.classList.add('lm-processed');
    
    // Extract title (usually in aria-label of the link or alt of img)
    const link = card.querySelector('a');
    if (!link) continue;
    
    const title = link.getAttribute('aria-label') || card.querySelector('img')?.alt;
    if (!title) continue;

    // Use the card as the relative container
    card.classList.add('lettermarkd-container');

    const data = await getRating(title);
    if (data && data.rating && data.rating !== 'N/A') {
      const badge = document.createElement('div');
      badge.className = 'lettermarkd-badge';
      badge.innerHTML = `<span>★ ${parseFloat(data.rating).toFixed(1)}</span>`;
      card.appendChild(badge);
      
      // Threshold check for low rating fade
      const { threshold } = await chrome.storage.local.get('threshold');
      if (parseFloat(data.rating) < (threshold || 2.5)) {
        const img = card.querySelector('img');
        if (img) img.style.opacity = '0.5';
      }
    }
  }
}

const observer = new MutationObserver(injectPrime);
observer.observe(document.body, { childList: true, subtree: true });
injectPrime();
