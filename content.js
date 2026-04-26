// LetterMarkd Universal Text Selection Script
let currentBubble = null;
let currentPanel = null;
let currentPrompt = null;
let debounceTimer = null;

let allowlist = [];
let blocklist = [];
let isEnabledOnThisSite = false;
let isPromptedOnThisSite = false;

// Load settings
function loadSettings() {
  chrome.storage.local.get(['allowlist', 'blocklist', 'masterEnabled'], (result) => {
    allowlist = result.allowlist || [];
    blocklist = result.blocklist || [];
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
  
  if (text.length < 2 || text.length > 60 || !/^[a-zA-Z0-9\s:&'-]+$/.test(text)) {
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
    <div>Enable LetterMarkd on this site?</div>
    <div class="lm-prompt-btns">
      <button id="lm-prompt-yes" class="lm-btn lm-btn-primary lm-btn-small">Enable</button>
      <button id="lm-prompt-no" class="lm-btn lm-btn-small">Hide</button>
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

function showBubble(rect, text) {
  if (currentBubble || currentPanel) return;
  currentBubble = document.createElement('div');
  currentBubble.id = 'lm-selection-bubble';
  
  const top = rect.bottom + window.scrollY + 8;
  const left = rect.left + window.scrollX + (rect.width / 2);
  currentBubble.style.top = `${top}px`;
  currentBubble.style.left = `${left}px`;
  currentBubble.className = 'lm-pos-bottom';

  currentBubble.innerHTML = `<span style="color:#E9C46A;">★</span> LetterMarkd`;
  document.body.appendChild(currentBubble);

  currentBubble.onclick = (e) => {
    e.stopPropagation();
    showPanel(rect, text);
  };
}

async function showPanel(rect, query) {
  clearUI();
  currentPanel = document.createElement('div');
  currentPanel.id = 'lm-panel';
  
  const panelWidth = 320;
  const left = Math.max(10, Math.min(window.innerWidth - 330, rect.left + window.scrollX + (rect.width / 2) - 160));
  const top = rect.bottom + window.scrollY + 10;
  
  currentPanel.style.top = `${top}px`;
  currentPanel.style.left = `${left}px`;
  currentPanel.style.transform = 'none';

  currentPanel.innerHTML = `<button class="lm-close">&times;</button><div class="lm-panel-header" style="padding:20px;justify-content:center;"><div class="lm-spinner"></div></div>`;
  document.body.appendChild(currentPanel);

  chrome.runtime.sendMessage({ type: 'SEARCH_FILM', query: query }, (data) => {
    if (chrome.runtime.lastError || !data || !data.rating) {
      currentPanel.innerHTML = `
        <button class="lm-close">&times;</button>
        <div class="lm-panel-header" style="padding:20px; flex-direction:column; align-items:center; text-align:center;">
          <div style="margin-bottom:15px; color:#9ab;">No direct match found for "${query}"</div>
          <a href="https://letterboxd.com/search/films/${encodeURIComponent(query)}/" target="_blank" class="lm-btn lm-btn-primary" style="text-decoration:none;">Search on Letterboxd</a>
        </div>
      `;
      currentPanel.querySelector('.lm-close').onclick = clearUI;
      return;
    }

    const stars = getStarString(data.rating);
    currentPanel.innerHTML = `
      <button class="lm-close">&times;</button>
      <div class="lm-panel-header">
        ${data.image ? `<img src="${data.image}" class="lm-poster">` : ''}
        <div class="lm-panel-info">
          <div class="lm-panel-title">${data.title} <span style="color:#9ab;font-weight:normal;">${data.year || ''}</span></div>
          <div class="lm-panel-rating">
            <span style="letter-spacing:2px;">${stars}</span>
            <span style="color:#fff;margin-left:6px;">${data.rating}</span>
          </div>
          <div style="font-size:11px;color:#70757a;margin-top:4px;">${data.ratingCount || ''} ratings &bull; ${data.reviewCount || ''} reviews</div>
        </div>
      </div>
      <div class="lm-panel-tabs">
        <div class="lm-tab lm-active" data-tab="info">Info</div>
        <div class="lm-tab" data-tab="reviews">Reviews</div>
      </div>
      <div class="lm-panel-body">
        <div id="lm-tab-info" class="lm-tab-content lm-active">
          <div class="lm-info-list">
            <div class="lm-info-item"><strong>Director:</strong> ${data.director || 'N/A'}</div>
            <div class="lm-info-item"><strong>Cast:</strong> ${data.cast || 'N/A'}</div>
            <div class="lm-info-item"><strong>Genres:</strong> ${data.genres?.join(', ') || 'N/A'}</div>
            <div class="lm-info-item" style="border-top: 1px solid rgba(255,255,255,0.05); margin-top: 12px; padding-top: 12px;">
              <strong>IMDb Rating:</strong> <span style="color:var(--accent); font-weight: bold;">★ ${data.extraStats?.imdbRating || 'N/A'}</span>
            </div>
            <div class="lm-info-item"><strong>Box Office:</strong> <span style="color: #fff;">${data.extraStats?.boxOffice || 'N/A'}</span></div>
            <div class="lm-info-item"><strong>Budget:</strong> <span style="color: #fff;">${data.extraStats?.budget || 'N/A'}</span></div>
          </div>
          
          ${data.watchProviders?.length ? `
            <div class="lm-where-watch" style="margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">
              <div style="font-size: 11px; color: #9ab; margin-bottom: 8px; font-weight: bold; text-transform: uppercase;">Where to Watch</div>
              <div class="lm-watch-list">
                ${data.watchProviders.map(p => `<span class="lm-watch-item">${p}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
        <div id="lm-tab-reviews" class="lm-tab-content">
          ${(data.reviews || []).map((r, i) => `
            <div class="lm-review-card">
              <div class="lm-review-author"><span>${r.author}</span><span style="color:#E9C46A;">${r.rating || ''}</span></div>
              ${r.isSpoiler ? `<div class="lm-spoiler-warning" id="lm-s-${i}">Spoiler! <span class="lm-reveal-link" data-r="lm-t-${i}" data-w="lm-s-${i}">Show</span></div><div class="lm-review-text" id="lm-t-${i}" style="display:none;">${r.text}</div>` : `<div class="lm-review-text">${r.text}</div>`}
            </div>
          `).join('') || '<div style="text-align:center;padding:20px;color:#70757a;">No reviews yet.</div>'}
        </div>
      </div>
      <div class="lm-panel-actions">
        <a href="${data.url}" target="_blank" class="lm-btn lm-btn-primary">View on Letterboxd</a>
        <div style="margin-top:12px; text-align:center;">
          <a href="https://letterboxd.com/search/films/${encodeURIComponent(query)}/" target="_blank" style="font-size:10px; color:#70757a; text-decoration:none; cursor:pointer;" onmouseover="this.style.color='#9ab'" onmouseout="this.style.color='#70757a'">Not the right movie? Search Letterboxd</a>
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
  });
}

function getStarString(rating) {
  if (!rating) return '';
  const num = parseFloat(rating);
  const full = Math.floor(num);
  const half = num % 1 >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
}
