// LetterMarkd Google Diagnostic Content Script

async function getRating(title, year) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'FETCH_RATING', title, year }, (response) => {
        if (chrome.runtime.lastError) {
          // If the extension was reloaded, the context is invalidated.
          resolve(null);
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      // Catch synchronous "Extension context invalidated" errors
      resolve(null);
    }
  });
}


async function injectKnowledgePanel() {
  const panel = document.querySelector('.kp-wholepage, .P69eS, #rhs');
  if (!panel || panel.querySelector('.lm-google-kp-row')) return;

  const titleEl = panel.querySelector('div[data-attrid="title"], h2[data-attrid="title"]');
  if (!titleEl) return;

  const title = titleEl.innerText;
  const data = await getRating(title);
  
  if (data && data.rating) {
    const row = document.createElement('div');
    row.className = 'lm-google-kp-row';
    row.innerHTML = `
      <a href="${data.url}" target="_blank" title="Matched as: ${data.title}" style="text-decoration:none; color:inherit; display:flex; align-items:center; gap:8px;">
        <span style="background:#14181c; color:#00e054; padding:2px 6px; border-radius:4px; font-size:12px; border:1px solid #00e054; font-weight:bold;">Letterboxd</span>
        <span style="color:#00e054; font-weight:bold;">★ ${data.rating}</span>
        <span style="font-size:12px; color:#70757a;">(${data.year || 'Film'})</span>
      </a>
    `;
    titleEl.parentElement.appendChild(row);
  }

}

async function injectOrganicResults() {
  // Target ONLY the main result containers within the results list
  const results = document.querySelectorAll('#rso div.g:not(.lm-processed)');
  
  for (const container of results) {
    // Strict visibility check
    if (container.offsetHeight === 0) continue;

    const titleLink = container.querySelector('h3');
    if (!titleLink || titleLink.querySelector('.lm-google-organic-pill')) continue;

    const parentLink = titleLink.closest('a');
    if (!parentLink) continue;

    const href = parentLink.href;
    if (!/imdb\.com|letterboxd\.com|netflix\.com|rottentomatoes\.com/.test(href)) continue;

    container.classList.add('lm-processed');
    const titleText = titleLink.innerText.split(' - ')[0].split(' (')[0].trim();
    
    console.log(`[LetterMarkd] Requesting: ${titleText}`);
    const data = await getRating(titleText);
    console.log(`[LetterMarkd] Got data for ${titleText}:`, data);

    if (data && data.rating && !isNaN(parseFloat(data.rating))) {
      const pill = document.createElement('span');
      pill.className = 'lm-google-organic-pill';
      pill.style.cssText = 'display:inline-block !important; margin-left:8px !important; color:#00e054 !important; font-weight:bold !important;';
      pill.innerHTML = `★ ${parseFloat(data.rating).toFixed(1)}`;
      titleLink.appendChild(pill);
    }
  }
}

setInterval(() => {
  injectKnowledgePanel();
  injectOrganicResults();
}, 2000);
