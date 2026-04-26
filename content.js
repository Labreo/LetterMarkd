// LetterMarkd Universal Text Selection Script

let currentBubble = null;
let currentPanel = null;
let debounceTimer = null;

// Listen for selection changes as specified
document.addEventListener('selectionchange', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(handleSelection, 200);
});

document.addEventListener('mousedown', (e) => {
  // Clear UI if clicking outside our elements
  if (!e.target.closest('#lm-selection-bubble') && !e.target.closest('#lm-panel')) {
    clearUI();
  }
});

// Dismiss on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    clearUI();
  }
});

function getStarString(rating) {
  if (!rating) return '';
  const num = parseFloat(rating);
  const fullStars = Math.floor(num);
  const hasHalf = (num - fullStars) >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  
  return '★'.repeat(fullStars) + (hasHalf ? '½' : '') + '☆'.repeat(emptyStars);
}

async function handleSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    if (!currentPanel) clearUI();
    return;
  }

  const text = selection.toString().trim();

  // Validate selection length (2 to 60 chars)
  if (text.length >= 2 && text.length <= 60 && !text.includes('\n')) {
    // Safety check for extension reloads
    if (!chrome.runtime?.id) return;

    try {
      const { enabled } = await chrome.storage.local.get(['enabled']);
      if (enabled === false) return;
    } catch (e) {
      // Extension context invalidated - script is orphaned
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Prevent rendering if the selection is invisible or empty
    if (rect.width === 0 || rect.height === 0) return;

    // Only show bubble if panel isn't already open
    if (!currentPanel) {
      showBubble(rect, text);
    }
  } else {
    if (!currentPanel) clearUI();
  }
}

function clearUI() {
  if (currentBubble) {
    currentBubble.remove();
    currentBubble = null;
  }
  if (currentPanel) {
    currentPanel.remove();
    currentPanel = null;
  }
}

function showBubble(rect, text) {
  if (currentBubble) currentBubble.remove();

  currentBubble = document.createElement('div');
  currentBubble.id = 'lm-selection-bubble';
  currentBubble.innerHTML = `<span>★</span> Lettermarkd`;
  
  // Position above the center of the selection
  const top = rect.top + window.scrollY;
  const left = rect.left + window.scrollX + (rect.width / 2);
  
  currentBubble.style.top = `${top}px`;
  currentBubble.style.left = `${left}px`;

  currentBubble.addEventListener('mousedown', (e) => {
    e.preventDefault(); // Keep text selected
    e.stopPropagation();
    showPanel(rect, text);
  });

  document.body.appendChild(currentBubble);
}

async function showPanel(rect, query) {
  clearUI();

  currentPanel = document.createElement('div');
  currentPanel.id = 'lm-panel';
  
  const top = rect.top + window.scrollY;
  const left = rect.left + window.scrollX + (rect.width / 2);
  
  currentPanel.style.top = `${top}px`;
  currentPanel.style.left = `${left}px`;

  // Display panel immediately in a loading state
  currentPanel.innerHTML = `
    <button class="lm-close">&times;</button>
    <div class="lm-panel-header" style="justify-content:center; align-items:center; padding: 24px;">
      <div class="lm-spinner" style="margin-right: 12px;"></div>
      <div style="color:#9ab; font-size:13px;">Searching Letterboxd...</div>
    </div>
  `;

  document.body.appendChild(currentPanel);

  // Bind close button
  currentPanel.querySelector('.lm-close').addEventListener('click', () => clearUI());

  // Send SEARCH_FILM message as specified
  chrome.runtime.sendMessage({ type: 'SEARCH_FILM', query: query }, (data) => {
    if (chrome.runtime.lastError || !data || !data.rating) {
      currentPanel.innerHTML = `
        <button class="lm-close">&times;</button>
        <div class="lm-panel-header" style="padding: 24px; flex-direction: column; align-items: center; text-align: center;">
          <div style="color:#e00054; font-size:13px; margin-bottom: 12px;">No rating found for "${query}"</div>
          <a href="https://letterboxd.com/search/films/${encodeURIComponent(query)}/" target="_blank" class="lm-btn lm-btn-primary" style="width: 100%;">Search on Letterboxd</a>
        </div>
      `;
      currentPanel.querySelector('.lm-close').addEventListener('click', () => clearUI());
      return;
    }

    const starVisual = getStarString(data.rating);

    currentPanel.innerHTML = `
      <button class="lm-close">&times;</button>
      <div class="lm-panel-header">
        ${data.image ? `<img src="${data.image}" class="lm-poster" alt="Poster">` : ''}
        <div class="lm-panel-info">
          <a href="${data.url}" target="_blank" class="lm-panel-title">${data.title} ${data.year ? `<span style="color:#9ab; font-weight:normal;">${data.year}</span>` : ''}</a>
          <div class="lm-panel-rating">
            <span style="letter-spacing: 2px;">${starVisual}</span>
            <span style="color:#fff; margin-left:6px;">${data.rating} / 5</span>
            ${data.count ? `<span style="font-size:11px; color:#70757a; font-weight:normal; margin-left:6px;">${data.count} ratings</span>` : ''}
          </div>
        </div>
      </div>
      <div class="lm-panel-actions">
        <a href="${data.url}" target="_blank" class="lm-btn lm-btn-primary">View on Letterboxd</a>
        <a href="${data.url}" target="_blank" class="lm-btn">+ Watchlist</a>
        <a href="${data.url}" target="_blank" class="lm-btn">Mark Watched</a>
        <div style="border-top: 1px solid rgba(255,255,255,0.1); margin: 4px 0;"></div>
        <a href="https://letterboxd.com/search/films/${encodeURIComponent(query)}/" target="_blank" style="font-size: 11px; color: #9ab; text-align: center; text-decoration: none;">Not the right film? Search Letterboxd</a>
      </div>
    `;
    
    currentPanel.querySelector('.lm-close').addEventListener('click', () => clearUI());
  });
}
