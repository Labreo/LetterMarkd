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

async function handleSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    if (!currentPanel) clearUI();
    return;
  }

  const text = selection.toString().trim();

  // Validate selection length (2 to 60 chars)
  if (text.length >= 2 && text.length <= 60 && !text.includes('\n')) {
    const { enabled } = await chrome.storage.local.get(['enabled']);
    if (enabled === false) return;

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
  currentBubble.innerHTML = `<span>★</span> LB`;
  
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
    <div class="lm-panel-header">
      <div style="font-size:12px; color:#9ab; margin-bottom:4px;">Searching Letterboxd...</div>
      <div class="lm-panel-title" style="color: #666;">${query}</div>
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
        <div class="lm-panel-header">
          <div style="font-size:12px; color:#e00054; margin-bottom:4px;">Film not found</div>
          <div class="lm-panel-title">${query}</div>
        </div>
      `;
      currentPanel.querySelector('.lm-close').addEventListener('click', () => clearUI());
      return;
    }

    currentPanel.innerHTML = `
      <button class="lm-close">&times;</button>
      <div class="lm-panel-header">
        <a href="${data.url}" target="_blank" class="lm-panel-title">${data.title} ${data.year ? `(${data.year})` : ''}</a>
        <div class="lm-panel-rating">★ ${data.rating}</div>
      </div>
      <div class="lm-panel-actions">
        <a href="${data.url}" target="_blank" class="lm-btn lm-btn-primary">Open Letterboxd</a>
      </div>
    `;
    
    currentPanel.querySelector('.lm-close').addEventListener('click', () => clearUI());
  });
}
