// LetterMarkd Universal Text Selection Script
let currentBubble = null;
let currentPanel = null;
let currentPrompt = null;
let debounceTimer = null;
let hoverTimer = null; // New timer for hover-based detection

let allowlist = [];
let blocklist = [];
let isEnabledOnThisSite = false;
let isPromptedOnThisSite = false;
let maxWordCount = 12;

// Load settings
function loadSettings() {
  chrome.storage.local.get(['allowlist', 'blocklist', 'masterEnabled', 'maxWordCount'], (result) => {
    allowlist = result.allowlist || [];
    blocklist = result.blocklist || [];
    maxWordCount = result.maxWordCount || 12;
    const master = result.masterEnabled !== false;
    const host = window.location.hostname.replace('www.', '');
    
    if (!master || blocklist.includes(host)) {
      isEnabledOnThisSite = false;
      isPromptedOnThisSite = true;
    } else if (allowlist.includes(host)) {
      isEnabledOnThisSite = true;
      isPromptedOnThisSite = true;
    } else {
      isEnabledOnThisSite = false;
      isPromptedOnThisSite = false;
    }
  });
}

loadSettings();

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SETTINGS_UPDATED') loadSettings();
  if (msg.type === 'EXTRA_STATS_READY' && currentPanel) {
    // Only re-render if we are looking at the same movie
    renderFullPanel(msg.data, msg.data.title);
  }
});

document.addEventListener('selectionchange', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(handleSelection, 250);
});

document.addEventListener('mousedown', (e) => {
  if (currentBubble && !currentBubble.contains(e.target)) clearUI();
  if (currentPanel && !currentPanel.contains(e.target)) clearUI();
  if (currentPrompt && !currentPrompt.contains(e.target)) clearUI();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') clearUI();
});

function clearUI() {
  if (currentBubble) { currentBubble.remove(); currentBubble = null; }
  if (currentPanel) { currentPanel.remove(); currentPanel = null; }
  if (currentPrompt) { currentPrompt.remove(); currentPrompt = null; }
  clearTimeout(hoverTimer);
}

// Hover-based detection for streaming sites
function isStreamingSite() {
  const host = window.location.hostname;
  return /netflix\.com|primevideo\.com|disneyplus\.com|hulu\.com|max\.com|apple\.com/.test(host);
}

if (isStreamingSite()) {
  document.addEventListener('mouseover', (e) => {
    // Only trigger if we aren't already showing a panel
    if (currentPanel) return;

    const target = e.target.closest('[aria-label]');
    if (target) {
      const label = target.getAttribute('aria-label');
      // Basic heuristic to filter out non-movie labels
      if (label && label.length > 1 && label.length < 80 && !label.includes('Menu') && !label.includes('Search')) {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          showBubble(target.getBoundingClientRect(), label, true);
        }, 400); // 400ms hover debounce
      }
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (currentBubble && currentBubble.dataset.hover === 'true') {
      // Small delay before clearing to allow clicking the bubble
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        if (currentBubble && !currentBubble.matches(':hover')) {
          clearUI();
        }
      }, 500);
    }
  });
}

function handleSelection() {
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  // Allow letters, numbers, spaces, and common title punctuation: : & ' - ( ) , .
  if (text.length < 2 || text.length > 80 || !/^[a-zA-Z0-9\s:&'().,-]+$/.test(text)) {
    return;
  }

  // Stricter word count check
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount > maxWordCount) {
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  if (isEnabledOnThisSite) {
    showBubble(rect, text);
  } else if (!isPromptedOnThisSite) {
    showPermissionPrompt(rect);
  }
}

function showPermissionPrompt(rect) {
  if (currentPrompt) return;
  
  currentPrompt = document.createElement('div');
  currentPrompt.id = 'lm-permission-prompt';
  
  const top = rect.bottom + window.scrollY + 10;
  const left = rect.left + window.scrollX + (rect.width / 2);
  currentPrompt.style.top = `${top}px`;
  currentPrompt.style.left = `${Math.max(10, left - 110)}px`;

  currentPrompt.innerHTML = `
    <div style="margin-bottom:12px;">Enable LetterMarkd on this site?</div>
    <div class="lm-prompt-btns">
      <button id="lm-prompt-yes" class="lm-btn lm-btn-primary lm-btn-small">Enable</button>
      <button id="lm-prompt-no" class="lm-btn lm-btn-small" style="background:rgba(255,255,255,0.05); color:white; border:1px solid rgba(255,255,255,0.1);">Hide</button>
    </div>
  `;
  document.body.appendChild(currentPrompt);

  document.getElementById('lm-prompt-yes').onclick = () => {
    updateSitePermission(true);
    clearUI();
  };
  document.getElementById('lm-prompt-no').onclick = () => {
    updateSitePermission(false);
    clearUI();
  };
}

function updateSitePermission(enable) {
  const host = window.location.hostname.replace('www.', '');
  chrome.storage.local.get(['allowlist', 'blocklist'], (result) => {
    let listA = result.allowlist || [];
    let listB = result.blocklist || [];
    
    if (enable) {
      if (!listA.includes(host)) listA.push(host);
      listB = listB.filter(h => h !== host);
      isEnabledOnThisSite = true;
    } else {
      if (!listB.includes(host)) listB.push(host);
      listA = listA.filter(h => h !== host);
      isEnabledOnThisSite = false;
    }
    isPromptedOnThisSite = true;
    chrome.storage.local.set({ allowlist: listA, blocklist: listB });
  });
}

function showBubble(rect, text, isHover = false) {
  if (currentBubble || currentPanel) return;
  currentBubble = document.createElement('div');
  currentBubble.id = 'lm-selection-bubble';
  if (isHover) currentBubble.dataset.hover = 'true';
  
  const top = rect.bottom + window.scrollY + 8;
  const left = rect.left + window.scrollX + (rect.width / 2);
  currentBubble.style.top = `${top}px`;
  currentBubble.style.left = `${left}px`;
  currentBubble.style.transform = 'translateX(-50%)';

  currentBubble.innerHTML = `<span style="color:#E9C46A; font-size:16px;">★</span> LetterMarkd`;
  document.body.appendChild(currentBubble);

  currentBubble.onclick = (e) => {
    e.stopPropagation();
    showPanel(rect, text);
  };
}

function showPanel(rect, query) {
  clearUI();
  currentPanel = document.createElement('div');
  currentPanel.id = 'lm-panel';
  
  const left = Math.max(10, Math.min(window.innerWidth - 330, rect.left + window.scrollX + (rect.width / 2) - 160));
  const top = rect.bottom + window.scrollY + 10;
  
  currentPanel.style.top = `${top}px`;
  currentPanel.style.left = `${left}px`;

  currentPanel.innerHTML = `<button class="lm-close">&times;</button><div class="lm-panel-header" style="padding:40px;justify-content:center;"><div class="lm-spinner"></div></div>`;
  document.body.appendChild(currentPanel);

  // Smart parsing: Extract title and year if present like "Movie Title (2024)"
  let searchTitle = query;
  let searchYear = null;
  const yearMatch = query.match(/(.+?)\s*\((19\d{2}|20\d{2})\)/);
  if (yearMatch) {
    searchTitle = yearMatch[1].trim();
    searchYear = yearMatch[2];
  }

  chrome.runtime.sendMessage({ type: 'SEARCH_FILM', query: searchTitle, year: searchYear }, (data) => {
    if (chrome.runtime.lastError || !data || !data.rating) {
      currentPanel.innerHTML = `
        <button class="lm-close">&times;</button>
        <div class="lm-panel-header" style="padding:30px; flex-direction:column; align-items:center; text-align:center;">
          <div style="margin-bottom:20px; color:#9ab; font-size:14px;">No direct match found for "${query}"</div>
          <a href="https://letterboxd.com/search/films/${encodeURIComponent(query)}/" target="_blank" class="lm-btn lm-btn-primary" style="text-decoration:none; padding: 10px 20px;">Search on Letterboxd</a>
        </div>
      `;
      currentPanel.querySelector('.lm-close').onclick = clearUI;
      return;
    }
    renderFullPanel(data, query);
  });
}

function renderFullPanel(data, query) {
  if (!currentPanel) return;
  const stars = getStarString(data.rating);
  const activeTab = currentPanel.querySelector('.lm-tab.lm-active')?.getAttribute('data-tab') || 'info';

  const logoSvg = `
    <svg class="lm-header-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ribbon-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#ff8000" />
          <stop offset="50%" style="stop-color:#00e054" />
          <stop offset="100%" style="stop-color:#40bcf4" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="#12161b" />
      <!-- The White L -->
      <path d="M32 28 V72 H68" stroke="white" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <!-- The Branded Ribbon -->
      <path d="M50 25 V55 L60 48 L70 55 V25 Z" fill="url(#ribbon-grad)" />
    </svg>
  `;

  // Determine if we should show extra stats.
  // We ONLY show the IMDb/Mojo rows if they actually have data and are NOT loading.
  const hasExtraStats = data.extraStats && !data.extraStats.loading && 
                        (data.extraStats.imdbRating || data.extraStats.boxOffice || data.extraStats.budget);

  currentPanel.innerHTML = `
    <button class="lm-close">&times;</button>
    <div class="lm-panel-header">
      ${data.image ? `<img src="${data.image}" class="lm-poster">` : ''}
      <div class="lm-panel-info">
        <div class="lm-panel-title">
          ${logoSvg}
          <span style="flex:1;">${data.title}</span>
        </div>
        <div style="font-size:12px; color:var(--text-dim); margin-bottom:8px; margin-left:34px;">${data.year || ''}</div>
        <div class="lm-panel-rating" style="margin-left:34px;">
          <span class="lm-stars">${stars}</span>
          <span style="color:#fff;">${data.rating}</span>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:6px; font-weight:500; margin-left:34px;">
          ${data.ratingCount || '0'} ratings &bull; ${data.reviewCount || '0'} reviews
        </div>
      </div>
    </div>
    <div class="lm-panel-tabs">
      <div class="lm-tab ${activeTab === 'info' ? 'lm-active' : ''}" data-tab="info">Info</div>
      <div class="lm-tab ${activeTab === 'reviews' ? 'lm-active' : ''}" data-tab="reviews">Reviews</div>
    </div>
    <div class="lm-panel-body">
      <div id="lm-tab-info" class="lm-tab-content" style="display: ${activeTab === 'info' ? 'block' : 'none'};">
        <div class="lm-info-list">
          <div class="lm-info-item"><strong>Director</strong> ${data.director || 'N/A'}</div>
          <div class="lm-info-item"><strong>Cast</strong> ${data.cast || 'N/A'}</div>
          <div class="lm-info-item"><strong>Genres</strong> ${(data.genres || []).join(', ')}</div>
          
          ${hasExtraStats ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-glass);">
            ${data.extraStats.imdbRating ? `
            <div class="lm-info-item" style="margin-bottom:8px;">
              <strong>IMDb Rating</strong> 
              <span style="color:var(--accent); font-weight:700;">★ ${data.extraStats.imdbRating}</span>
            </div>` : ''}
            ${data.extraStats.boxOffice ? `<div class="lm-info-item"><strong>Box Office</strong> <span style="color:#fff;">${data.extraStats.boxOffice}</span></div>` : ''}
            ${data.extraStats.budget ? `<div class="lm-info-item"><strong>Budget</strong> <span style="color:#fff;">${data.extraStats.budget}</span></div>` : ''}
          </div>` : ''}
        </div>
        
        ${data.watchProviders?.length ? `
          <div class="lm-where-watch" style="margin-top: 16px; border-top: 1px solid var(--border-glass); padding-top: 15px;">
            <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Where to Watch</div>
            <div class="lm-watch-list">
              ${data.watchProviders.map(p => `<span class="lm-watch-item">${p}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
      <div id="lm-tab-reviews" class="lm-tab-content" style="display: ${activeTab === 'reviews' ? 'block' : 'none'};">
        ${(data.reviews || []).map((r, i) => `
          <div class="lm-review-card">
            <div class="lm-review-author">
              <span style="color:var(--text-dim)">${r.author}</span>
              <span style="color:var(--accent)">${r.rating || ''}</span>
            </div>
            ${r.isSpoiler ? `
              <div class="lm-spoiler-warning" id="lm-s-${i}">
                Contains Spoilers <span class="lm-reveal-link" data-r="lm-t-${i}" data-w="lm-s-${i}">Reveal</span>
              </div>
              <div class="lm-review-text" id="lm-t-${i}" style="display:none;">${r.text}</div>
            ` : `<div class="lm-review-text">${r.text}</div>`}
          </div>
        `).join('') || '<div style="text-align:center;padding:40px;color:var(--text-muted); font-size:13px;">No community reviews found.</div>'}
      </div>
    </div>
    <div class="lm-panel-actions">
      <a href="${data.url}" target="_blank" class="lm-btn lm-btn-primary">View on Letterboxd</a>
      <div style="margin-top:14px; text-align:center; display: flex; justify-content: center; gap: 15px; align-items: center;">
        <a href="https://letterboxd.com/search/films/${encodeURIComponent(query)}/" target="_blank" style="font-size:10px; color:var(--text-muted); text-decoration:none; font-weight:500;" onmouseover="this.style.color='var(--text-dim)'" onmouseout="this.style.color='var(--text-muted)'">Not the right movie?</a>
        <span style="color:rgba(255,255,255,0.1); font-size:10px;">|</span>
        <a href="https://buymeacoffee.com/kakeroth" target="_blank" style="font-size:10px; color:#FFBD00; text-decoration:none; font-weight:600; display: flex; align-items: center; gap: 4px;" onmouseover="this.style.filter='brightness(1.2)'" onmouseout="this.style.filter='none'">
          <span>☕</span> Buy me a coffee
        </a>
      </div>
    </div>
  `;

  currentPanel.querySelector('.lm-close').onclick = clearUI;
  const tabs = currentPanel.querySelectorAll('.lm-tab');
  tabs.forEach(t => t.onclick = () => {
    tabs.forEach(x => x.classList.remove('lm-active'));
    t.classList.add('lm-active');
    const target = t.getAttribute('data-tab');
    currentPanel.querySelector('#lm-tab-info').style.display = target === 'info' ? 'block' : 'none';
    currentPanel.querySelector('#lm-tab-reviews').style.display = target === 'reviews' ? 'block' : 'none';
  });

  currentPanel.querySelectorAll('.lm-reveal-link').forEach(l => l.onclick = (e) => {
    currentPanel.querySelector(`#${l.getAttribute('data-r')}`).style.display = 'block';
    currentPanel.querySelector(`#${l.getAttribute('data-w')}`).style.display = 'none';
  });
}

function getStarString(rating) {
  if (!rating) return '';
  const num = parseFloat(rating);
  const full = Math.floor(num);
  const half = num % 1 >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(Math.max(0, 5 - full - half));
}
