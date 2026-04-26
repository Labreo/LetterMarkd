// LetterMarkd Disney+ Content Script

async function getRating(title, year) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'FETCH_RATING', title, year }, resolve);
  });
}

async function injectDisneyPlus() {
  const cards = document.querySelectorAll('a[data-testid*="asset-"]:not(.lm-processed), .gv2-asset:not(.lm-processed), div[data-testid="meta-data-container"]:not(.lm-processed)');
  
  for (const card of cards) {
    card.classList.add('lm-processed');
    
    // Disney+ usually puts the title in the aria-label of the link or alt text of the image
    const title = card.getAttribute('aria-label') || (card.querySelector('img') && card.querySelector('img').alt);
    if (!title) continue;

    // Ensure relative positioning for the badge
    card.style.position = 'relative';

    const data = await getRating(title);
    if (data && data.rating && data.rating !== 'N/A') {
      const badge = document.createElement('div');
      badge.className = 'lettermarkd-badge';
      badge.innerHTML = `<span>★ ${parseFloat(data.rating).toFixed(1)}</span>`;
      card.appendChild(badge);
      
      const { threshold } = await chrome.storage.local.get('threshold');
      if (parseFloat(data.rating) < (threshold || 2.5)) {
        const img = card.querySelector('img');
        if (img) img.style.opacity = '0.5';
      }
    }
  }
}

const observer = new MutationObserver(injectDisneyPlus);
observer.observe(document.body, { childList: true, subtree: true });
injectDisneyPlus();
