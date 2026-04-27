// LetterMarkd Universal Text Selection Script
const DEFAULT_OPTIONS = {
  maxWordCount: 27,
  panelTheme: 'dark',
  showExtraStats: true
};

let currentBubble = null;
let currentPanel = null;
let currentPrompt = null;
let debounceTimer = null;
let options = { ...DEFAULT_OPTIONS };

/**
 * Safely sets the innerHTML of a container by using a static template 
 * and populating dynamic fields via textContent to satisfy strict security validators.
 */
function safeSet(container, html, textMap = {}, attrMap = {}) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  for (const [selector, text] of Object.entries(textMap)) {
    const els = doc.querySelectorAll(selector);
    els.forEach(el => { el.textContent = text; });
  }
  for (const [selector, attrs] of Object.entries(attrMap)) {
    const els = doc.querySelectorAll(selector);
    els.forEach(el => {
      for (const [attr, val] of Object.entries(attrs)) {
        if (attr === 'src' || attr === 'href') {
          // Basic URL validation
          if (val.startsWith('http') || val.startsWith('https') || val.startsWith('data:')) {
            el.setAttribute(attr, val);
          }
        } else {
          el.setAttribute(attr, val);
        }
      }
    });
  }
  
  container.replaceChildren(...doc.body.childNodes);
}

let allowlist = [];
let blocklist = [];
let isEnabledOnThisSite = false;
let isPromptedOnThisSite = false;
let maxWordCount = 27;

// Load settings
function loadSettings() {
  chrome.storage.local.get(['allowlist', 'blocklist', 'masterEnabled', 'maxWordCount'], (result) => {
    allowlist = result.allowlist || [];
    blocklist = result.blocklist || [];
    maxWordCount = result.maxWordCount || 27;
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

}



function handleSelection() {
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  // Allow letters, numbers, spaces, and common title punctuation: : & ' - ( ) , .
  if (text.length < 2 || text.length > 80 || !/^[a-zA-Z0-9\s:&'().,-]+$/.test(text)) {
    return;
  }

  // Fetch settings dynamically to ensure sync (Crucial for Firefox)
  chrome.storage.local.get(['allowlist', 'blocklist', 'masterEnabled', 'maxWordCount'], (res) => {
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const currentMax = res.maxWordCount || 27;
    if (wordCount > currentMax) return;

    const host = window.location.hostname.replace('www.', '');
    const master = res.masterEnabled !== false;
    const isAllowed = (res.allowlist || []).includes(host);
    const isBlocked = (res.blocklist || []).includes(host);

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (master && isAllowed && !isBlocked) {
      showBubble(rect, text);
    } else if (master && !isAllowed && !isBlocked) {
      showPermissionPrompt(rect);
    }
  });
}

function showPermissionPrompt(rect) {
  if (currentPrompt) return;
  
  currentPrompt = document.createElement('div');
  currentPrompt.id = 'lm-permission-prompt';
  
  const top = rect.bottom + window.scrollY + 10;
  const left = rect.left + window.scrollX + (rect.width / 2);
  currentPrompt.style.top = `${top}px`;
  currentPrompt.style.left = `${Math.max(10, left - 110)}px`;

  safeSet(currentPrompt, `
    <div style="margin-bottom:12px;">Enable LetterMarkd on this site?</div>
    <div class="lm-prompt-btns">
      <button id="lm-prompt-yes" class="lm-btn lm-btn-primary lm-btn-small">Enable</button>
      <button id="lm-prompt-no" class="lm-btn lm-btn-small" style="background:rgba(255,255,255,0.05); color:white; border:1px solid rgba(255,255,255,0.1);">Hide</button>
    </div>
  `);
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

function showBubble(rect, text) {
  if (currentBubble || currentPanel) return;
  currentBubble = document.createElement('div');
  currentBubble.id = 'lm-selection-bubble';
  
  const top = rect.bottom + window.scrollY + 8;
  const left = rect.left + window.scrollX + (rect.width / 2);
  currentBubble.style.top = `${top}px`;
  currentBubble.style.left = `${left}px`;
  currentBubble.style.transform = 'translateX(-50%)';

  safeSet(currentBubble, `<span style="color:#E9C46A; font-size:16px;">★</span> LetterMarkd`);
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

  safeSet(currentPanel, `<button class="lm-close">&times;</button><div class="lm-panel-header" style="padding:40px;justify-content:center;"><div class="lm-spinner"></div></div>`);
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
      safeSet(currentPanel, `
        <button class="lm-close">&times;</button>
        <div class="lm-panel-header" style="padding:30px; flex-direction:column; align-items:center; text-align:center;">
          <div class="lm-error-msg" style="margin-bottom:20px; color:#9ab; font-size:14px;"></div>
          <a href="#" target="_blank" class="lm-search-link lm-btn lm-btn-primary" style="text-decoration:none; padding: 10px 20px;">Search on Letterboxd</a>
        </div>
      `, 
      { '.lm-error-msg': `No direct match found for "${query}"` },
      { '.lm-search-link': { href: `https://letterboxd.com/search/films/${encodeURIComponent(query)}/` } });
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
        <linearGradient id="brand-grad-vertical" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#ff8000" />
          <stop offset="50%" style="stop-color:#00e054" />
          <stop offset="100%" style="stop-color:#00b0ff" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="#12161b" />
      <path d="M32 28 V72 H68" stroke="white" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M50 25 V55 L60 48 L70 55 V25 Z" fill="url(#brand-grad-vertical)" />
    </svg>
  `;

  // Determine if we should show extra stats.
  const hasExtraStats = data.extraStats && !data.extraStats.loading && 
                        (data.extraStats.imdbRating || data.extraStats.boxOffice || data.extraStats.budget);

  // 1. Set Static Skeleton
  const parser = new DOMParser();
  const doc = parser.parseFromString(`
    <button class="lm-close">&times;</button>
    <div class="lm-panel-header">
      <img class="lm-poster" style="display:none;">
      <div class="lm-panel-info">
        <div class="lm-panel-title">
          ${logoSvg}
          <span class="lm-title-text" style="flex:1;"></span>
        </div>
        <div class="lm-year-text" style="font-size:12px; color:var(--text-dim); margin-bottom:8px; margin-left:34px;"></div>
        <div class="lm-panel-rating" style="margin-left:34px;">
          <span class="lm-stars"></span>
          <span class="lm-rating-num" style="color:#fff;"></span>
        </div>
        <div class="lm-counts-text" style="font-size:11px;color:var(--text-muted);margin-top:6px; font-weight:500; margin-left:34px;"></div>
      </div>
    </div>
    <div class="lm-panel-tabs">
      <div class="lm-tab" data-tab="info">Info</div>
      <div class="lm-tab" data-tab="details">Details</div>
      <div class="lm-tab" data-tab="reviews">Reviews</div>
    </div>
    <div class="lm-panel-body">
      <div id="lm-tab-info" class="lm-tab-content">
        <div class="lm-info-list">
          <div class="lm-info-item" style="margin-bottom: 12px; line-height: 1.5; color: #fff;">
            <div class="lm-tagline-text" style="font-style: italic; color: var(--accent); margin-bottom: 8px; display:none;"></div>
            <div class="lm-desc-text"></div>
          </div>
          <div class="lm-extra-stats-box" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-glass); display:none;">
            <div class="lm-imdb-row lm-info-item" style="margin-bottom:8px; display:none;">
              <strong>IMDb Rating</strong> 
              <span class="lm-imdb-rating" style="color:var(--accent); font-weight:700;"></span>
            </div>
            <div class="lm-boxoffice-row lm-info-item" style="display:none;"><strong>Box Office</strong> <span class="lm-box-office-val" style="color:#fff;"></span></div>
            <div class="lm-budget-row lm-info-item" style="display:none;"><strong>Budget</strong> <span class="lm-budget-val" style="color:#fff;"></span></div>
          </div>
        </div>
      </div>
      <div id="lm-tab-details" class="lm-tab-content" style="display:none;">
        <div class="lm-info-list">
          <div class="lm-info-item"><strong>Director</strong> <span class="lm-dir-val"></span></div>
          <div class="lm-info-item"><strong>Cast</strong> <span class="lm-cast-val"></span></div>
          <div class="lm-info-item"><strong>Genres</strong> <span class="lm-genres-val"></span></div>
          <div class="lm-info-item"><strong>Release</strong> <span class="lm-release-val"></span></div>
        </div>
      </div>
      <div id="lm-tab-reviews" class="lm-tab-content" style="display:none;">
        <div class="lm-reviews-list"></div>
      </div>
    </div>
    <div class="lm-panel-actions">
      <a href="#" target="_blank" class="lm-lb-link lm-btn lm-btn-primary">View on Letterboxd</a>
      <div style="margin-top:14px; text-align:center; display: flex; justify-content: center; gap: 15px; align-items: center;">
        <a href="#" target="_blank" class="lm-wrong-link" style="font-size:10px; color:var(--text-muted); text-decoration:none; font-weight:500;">Not the right movie?</a>
        <span style="color:rgba(255,255,255,0.1); font-size:10px;">|</span>
        <a href="https://buymeacoffee.com/kakeroth" target="_blank" style="font-size:10px; color:#FFBD00; text-decoration:none; font-weight:600; display: flex; align-items: center; gap: 4px;">
          <span>☕</span> Buy me a coffee
        </a>
      </div>
    </div>
  `, 'text/html');
  currentPanel.replaceChildren(...doc.body.childNodes);

  // 2. Populate Dynamic Values via textContent and setAttribute
  if (data.image) {
    const poster = currentPanel.querySelector('.lm-poster');
    poster.src = data.image;
    poster.style.display = 'block';
  }
  currentPanel.querySelector('.lm-title-text').textContent = data.title;
  currentPanel.querySelector('.lm-year-text').textContent = data.year || '';
  currentPanel.querySelector('.lm-stars').textContent = stars;
  currentPanel.querySelector('.lm-rating-num').textContent = data.rating || '';
  currentPanel.querySelector('.lm-counts-text').textContent = `${data.ratingCount || '0'} ratings • ${data.reviewCount || '0'} reviews`;
  
  if (data.tagline) {
    const tag = currentPanel.querySelector('.lm-tagline-text');
    tag.textContent = `"${data.tagline}"`;
    tag.style.display = 'block';
  }
  currentPanel.querySelector('.lm-desc-text').textContent = data.description || 'No description available.';

  if (hasExtraStats) {
    currentPanel.querySelector('.lm-extra-stats-box').style.display = 'block';
    if (data.extraStats.imdbRating) {
      currentPanel.querySelector('.lm-imdb-row').style.display = 'block';
      currentPanel.querySelector('.lm-imdb-rating').textContent = `★ ${data.extraStats.imdbRating}`;
    }
    if (data.extraStats.boxOffice) {
      currentPanel.querySelector('.lm-boxoffice-row').style.display = 'block';
      currentPanel.querySelector('.lm-box-office-val').textContent = data.extraStats.boxOffice;
    }
    if (data.extraStats.budget) {
      currentPanel.querySelector('.lm-budget-row').style.display = 'block';
      currentPanel.querySelector('.lm-budget-val').textContent = data.extraStats.budget;
    }
  }

  currentPanel.querySelector('.lm-dir-val').textContent = data.director || 'N/A';
  currentPanel.querySelector('.lm-cast-val').textContent = data.cast || 'N/A';
  currentPanel.querySelector('.lm-genres-val').textContent = (data.genres || []).join(', ') || 'N/A';
  currentPanel.querySelector('.lm-release-val').textContent = formatDate(data.year) || 'N/A';

  // Populating Reviews
  const reviewsList = currentPanel.querySelector('.lm-reviews-list');
  if (data.reviews && data.reviews.length > 0) {
    data.reviews.forEach((r, i) => {
      const card = document.createElement('div');
      card.className = 'lm-review-card';
      
      const authorDiv = document.createElement('div');
      authorDiv.className = 'lm-review-author';
      const authorSpan = document.createElement('span');
      authorSpan.style.color = 'var(--text-dim)';
      authorSpan.textContent = r.author;
      const ratingSpan = document.createElement('span');
      ratingSpan.style.color = 'var(--accent)';
      ratingSpan.textContent = r.rating || '';
      authorDiv.appendChild(authorSpan);
      authorDiv.appendChild(ratingSpan);
      card.appendChild(authorDiv);

      if (r.isSpoiler) {
        const warning = document.createElement('div');
        warning.className = 'lm-spoiler-warning';
        safeSet(warning, 'Contains Spoilers <span class="lm-reveal-link">Reveal</span>');
        
        const textDiv = document.createElement('div');
        textDiv.className = 'lm-review-text';
        textDiv.style.display = 'none';
        textDiv.textContent = r.text;
        
        warning.querySelector('.lm-reveal-link').onclick = () => {
          textDiv.style.display = 'block';
          warning.style.display = 'none';
        };
        
        card.appendChild(warning);
        card.appendChild(textDiv);
      } else {
        const textDiv = document.createElement('div');
        textDiv.className = 'lm-review-text';
        textDiv.textContent = r.text;
        card.appendChild(textDiv);
      }
      reviewsList.appendChild(card);
    });
  } else {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted); font-size:13px;';
    empty.textContent = 'No community reviews found.';
    reviewsList.appendChild(empty);
  }

  // Links
  currentPanel.querySelector('.lm-lb-link').href = data.url;
  currentPanel.querySelector('.lm-wrong-link').href = `https://letterboxd.com/search/films/${encodeURIComponent(query)}/`;

  // Tab switching logic
  const tabElems = currentPanel.querySelectorAll('.lm-tab');
  const updateTabs = (target) => {
    tabElems.forEach(x => x.classList.toggle('lm-active', x.getAttribute('data-tab') === target));
    currentPanel.querySelector('#lm-tab-info').style.display = target === 'info' ? 'block' : 'none';
    currentPanel.querySelector('#lm-tab-details').style.display = target === 'details' ? 'block' : 'none';
    currentPanel.querySelector('#lm-tab-reviews').style.display = target === 'reviews' ? 'block' : 'none';
  };
  tabElems.forEach(t => t.onclick = () => updateTabs(t.getAttribute('data-tab')));
  updateTabs(activeTab);

  currentPanel.querySelector('.lm-close').onclick = clearUI;
}

function getStarString(rating) {
  if (!rating) return '';
  const num = parseFloat(rating);
  const full = Math.floor(num);
  const half = num % 1 >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(Math.max(0, 5 - full - half));
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  // If it's just a year (4 digits), return as is
  if (/^\d{4}$/.test(dateStr)) return dateStr;
  
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return d.toLocaleDateString(undefined, options);
  } catch (e) {
    return dateStr;
  }
}
