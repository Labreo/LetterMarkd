// LetterMarkd Universal Text Selection Script

let currentBubble = null;
let currentPanel = null;
let activeSelectionRange = null;

// Listen for selection changes
document.addEventListener('mouseup', handleSelection);
document.addEventListener('mousedown', clearUI);

async function handleSelection(e) {
  // Don't trigger if clicking on our own UI
  if (e.target.closest('#lm-selection-bubble') || e.target.closest('#lm-panel')) {
    return;
  }

  const { enabled } = await chrome.storage.local.get(['enabled']);
  if (enabled === false) return;

  // Brief timeout to allow selection to settle
  setTimeout(async () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 0 && text.length <= 60 && !text.includes('\n')) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Prevent rendering if the selection is invisible or empty
      if (rect.width === 0 || rect.height === 0) return;

      activeSelectionRange = range;
      showBubble(rect, text);
    } else {
      clearUI();
    }
  }, 10);
}

function clearUI(e) {
  if (e && (e.target.closest('#lm-selection-bubble') || e.target.closest('#lm-panel'))) {
    return;
  }
  
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
  clearUI();

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

async function showPanel(rect, text) {
  if (currentBubble) {
    currentBubble.remove();
    currentBubble = null;
  }

  currentPanel = document.createElement('div');
  currentPanel.id = 'lm-panel';
  
  const top = rect.top + window.scrollY;
  const left = rect.left + window.scrollX + (rect.width / 2);
  
  currentPanel.style.top = `${top}px`;
  currentPanel.style.left = `${left}px`;

  currentPanel.innerHTML = `
    <button class="lm-close">&times;</button>
    <div class="lm-panel-header">
      <div style="font-size:12px; color:#9ab; margin-bottom:4px;">Searching Letterboxd...</div>
      <div class="lm-panel-title">${text}</div>
    </div>
  `;

  document.body.appendChild(currentPanel);

  // Bind close button
  currentPanel.querySelector('.lm-close').addEventListener('click', () => clearUI());

  // Fetch Rating
  chrome.runtime.sendMessage({ type: 'FETCH_RATING', title: text, year: null }, (data) => {
    if (chrome.runtime.lastError || !data || !data.rating) {
      currentPanel.innerHTML = `
        <button class="lm-close">&times;</button>
        <div class="lm-panel-header">
          <div style="font-size:12px; color:#e00054; margin-bottom:4px;">Film not found</div>
          <div class="lm-panel-title">${text}</div>
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
