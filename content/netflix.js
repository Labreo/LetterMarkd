// LetterMarkd Netflix Content Script
const LOW_RATING_THRESHOLD_DEFAULT = 2.5;

/**
 * Fetch rating from background service worker
 */
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

/**
 * --- GRID INJECTION ---
 * Targets the standard browsing rows
 */
async function injectBrowseGrid() {
  const cards = document.querySelectorAll('.title-card:not(.lm-processed)');
  
  for (const card of cards) {
    card.classList.add('lm-processed');
    
    const link = card.querySelector('a[aria-label]');
    if (!link) continue;

    const title = link.getAttribute('aria-label');
    const posterContainer = card.querySelector('.boxshot-container');
    if (!posterContainer) continue;

    posterContainer.classList.add('lettermarkd-container');

    const data = await getRating(title);
    if (data && data.rating && data.rating !== 'N/A') {
      const badge = document.createElement('div');
      badge.className = 'lettermarkd-badge';
      badge.innerHTML = `<span>★ ${parseFloat(data.rating).toFixed(1)}</span>`;
      
      posterContainer.appendChild(badge);

      // Low Rating Fade
      const settings = await chrome.storage.local.get('threshold');
      const threshold = settings.threshold || LOW_RATING_THRESHOLD_DEFAULT;
      if (parseFloat(data.rating) < threshold) {
        const img = posterContainer.querySelector('img');
        if (img) img.classList.add('lettermarkd-low-rating-poster');
      }
    }
  }
}

/**
 * --- HOVER CARD INJECTION ---
 * Targets the large preview modal
 */
async function injectHoverCard() {
  const modal = document.querySelector('.preview-modal-container:not(.lm-processed)');
  if (!modal) return;

  modal.classList.add('lm-processed');

  // Extract title from the modal
  const titleEl = modal.querySelector('.previewModal--text, .previewModal-title-text');
  if (!titleEl) return;

  const title = titleEl.innerText;
  
  // Extract year if available
  const yearEl = modal.querySelector('.year');
  const year = yearEl ? yearEl.innerText : null;

  const data = await getRating(title, year);
  if (data && data.rating && data.rating !== 'N/A') {
    const metaContainer = modal.querySelector('.previewModal--metadataview-container');
    if (!metaContainer) return;

    const ratingRow = document.createElement('div');
    ratingRow.style.cssText = 'display:flex; flex-direction:column; gap:8px; margin-top:8px; width:100%;';
    ratingRow.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; font-weight:700; color:#00e054;">
        <a href="${data.url}" target="_blank" title="${data.title}" style="text-decoration:none; color:inherit; display:flex; align-items:center; gap:8px;">
          <span style="background:#14181c; padding:2px 6px; border-radius:4px; font-size:12px; border:1px solid #00e054;">Letterboxd</span>
          <span>★ ${parseFloat(data.rating).toFixed(2)}</span>
          <span style="font-size:12px; color:#aaa; font-weight:400;">(${data.year || 'Film'})</span>
        </a>
        <a href="mailto:support@lettermarkd.com?subject=Wrong Film Match: ${encodeURIComponent(title)}" style="margin-left:auto; font-size:10px; color:#666; text-decoration:underline; font-weight:400;">Report mismatch</a>
      </div>
      
      <!-- Pro Features Scaffold -->
      <div class="lm-pro-features" style="display:flex; gap:12px; font-size:11px; color:#9ab; align-items:center; border-top:1px solid rgba(255,255,255,0.1); padding-top:6px; margin-top:2px;">
        <span style="display:flex; align-items:center; gap:4px;" title="Your Rating (Pro)">
          <span style="color:#ff8000; font-size:14px;">★</span> You: 4.0
        </span>
        <span style="display:flex; align-items:center; gap:4px; color:#00e054;" title="In Watchlist (Pro)">
          <span style="font-size:14px;">👁</span> Watchlist
        </span>
        <span style="display:flex; align-items:center; gap:4px; margin-left:auto;" title="Friends (Pro)">
          👥 3 friends
        </span>
      </div>
    `;

    metaContainer.appendChild(ratingRow);
  }
}

/**
 * Main Observer Logic
 */
const observer = new MutationObserver(() => {
  injectBrowseGrid();
  injectHoverCard();
});

observer.observe(document.body, { 
  childList: true, 
  subtree: true 
});

// Initial runs
injectBrowseGrid();
injectHoverCard();
