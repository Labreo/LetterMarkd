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
  
  const bubbleWidth = 110;
  const bubbleHeight = 26;
  const gap = 8;
  
  // Calculate horizontal center
  let left = rect.left + window.scrollX + (rect.width / 2);
  
  // Guard horizontal edges
  const padding = 10;
  const minLeft = window.scrollX + (bubbleWidth / 2) + padding;
  const maxLeft = window.scrollX + window.innerWidth - (bubbleWidth / 2) - padding;
  left = Math.max(minLeft, Math.min(maxLeft, left));

  // Determine vertical position (prefer below)
  let top = rect.bottom + window.scrollY + gap;
  let posClass = 'lm-pos-bottom';
  
  // Flip to top if no space below
  if (top + bubbleHeight > window.scrollY + window.innerHeight) {
    top = rect.top + window.scrollY - bubbleHeight - gap;
    posClass = 'lm-pos-top';
  }
  
  currentBubble.className = posClass;
  currentBubble.style.top = `${top}px`;
  currentBubble.style.left = `${left}px`;

  currentBubble.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showPanel(rect, text);
  });

  document.body.appendChild(currentBubble);
}

async function showPanel(rect, query) {
  clearUI();

  currentPanel = document.createElement('div');
  currentPanel.id = 'lm-panel';
  
  const panelWidth = 320;
  const panelHeight = 400; 
  const gap = 8;
  
  let left = rect.left + window.scrollX + (rect.width / 2);
  const padding = 10;
  const minLeft = window.scrollX + (panelWidth / 2) + padding;
  const maxLeft = window.scrollX + window.innerWidth - (panelWidth / 2) - padding;
  left = Math.max(minLeft, Math.min(maxLeft, left));

  let top = rect.bottom + window.scrollY + gap;
  if (top + panelHeight > window.scrollY + window.innerHeight) {
    top = rect.top + window.scrollY - panelHeight - gap;
    top = Math.max(window.scrollY + padding, top);
  }
  
  currentPanel.style.top = `${top}px`;
  currentPanel.style.left = `${left}px`;
  
  currentPanel.innerHTML = `
    <button class="lm-close">&times;</button>
    <div class="lm-panel-header" style="padding: 24px; align-items: center; justify-content: center;">
      <div class="lm-spinner"></div>
    </div>
  `;
  document.body.appendChild(currentPanel);

  chrome.runtime.sendMessage({ type: 'SEARCH_FILM', query: query }, (data) => {
    if (chrome.runtime.lastError || !data || (!data.rating && !data.title)) {
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
            <span style="letter-spacing: 2px;">${starVisual || 'No rating'}</span>
            ${data.rating ? `<span style="color:#fff; margin-left:6px;">${data.rating}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="lm-panel-tabs">
        <div class="lm-tab lm-active" data-tab="info">Info</div>
        <div class="lm-tab" data-tab="reviews">Reviews ${data.reviews?.length ? `(${data.reviews.length})` : ''}</div>
      </div>

      <div class="lm-panel-body">
        <div id="lm-tab-info" class="lm-tab-content">
          ${data.director ? `
            <div class="lm-meta-item">
              <span class="lm-meta-label">Directed by</span>
              ${data.director}
            </div>
          ` : ''}
          
          ${data.cast ? `
            <div class="lm-meta-item">
              <span class="lm-meta-label">Starring</span>
              ${data.cast}
            </div>
          ` : ''}

          <div class="lm-meta-item">
            ${data.genres?.map(g => `<span class="lm-genre-tag">${g}</span>`).join('')}
          </div>
        </div>

        <div id="lm-tab-reviews" class="lm-tab-content" style="display: none;">
          ${data.reviews?.length ? data.reviews.map(r => `
            <div class="lm-review-card">
              <div class="lm-review-author">
                <span>${r.author}</span>
                <span style="color:#E9C46A;">${r.rating || ''}</span>
              </div>
              <div class="lm-review-text">${r.text}</div>
            </div>
          `).join('') : '<div style="color:#70757a; font-size:12px; text-align:center; padding: 20px;">No reviews found.</div>'}
        </div>
      </div>

      <div class="lm-panel-actions">
        <a href="${data.url}" target="_blank" class="lm-btn lm-btn-primary">View on Letterboxd</a>
        <a href="https://letterboxd.com/search/films/${encodeURIComponent(query)}/" target="_blank" style="font-size: 11px; color: #9ab; text-align: center; text-decoration: none; margin-top: 4px;">Not the right film? Search Letterboxd</a>
      </div>
    `;
    
    // Tab Switching Logic
    const tabs = currentPanel.querySelectorAll('.lm-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('lm-active'));
        tab.classList.add('lm-active');
        
        const target = tab.getAttribute('data-tab');
        currentPanel.querySelector('#lm-tab-info').style.display = target === 'info' ? 'block' : 'none';
        currentPanel.querySelector('#lm-tab-reviews').style.display = target === 'reviews' ? 'block' : 'none';
      });
    });

    currentPanel.querySelector('.lm-close').addEventListener('click', () => clearUI());
  });
}
