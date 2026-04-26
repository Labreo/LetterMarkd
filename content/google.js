// LetterMarkd Google Search Content Script

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
 * Knowledge Panel Injection
 */
async function injectKnowledgePanel() {
  const kp = document.querySelector('div[data-attrid="title"]');
  if (!kp || kp.querySelector('.lm-google-kp-row')) return;

  const title = kp.innerText;
  
  // Try to find the year in the Knowledge Panel
  const yearMatch = document.body.innerText.match(/Release date:.*?(\d{4})/);
  const year = yearMatch ? yearMatch[1] : null;

  const data = await getRating(title, year);
  if (data && data.rating && data.rating !== 'N/A') {
    const row = document.createElement('div');
    row.className = 'lm-google-kp-row';
    row.innerHTML = `
      <div class="lm-google-kp-logo"></div>
      <span class="lm-google-kp-stars">★ ${parseFloat(data.rating).toFixed(2)}</span>
      <span class="lm-google-kp-count">on Letterboxd</span>
      <a href="${data.url}" target="_blank" style="margin-left: auto; font-size: 12px; color: #1a0dab;">View</a>
    `;
    
    // Inject below the title block or near other ratings
    const ratingsBlock = document.querySelector('div[data-attrid="kc:/common/topic:social_review"]') || kp;
    ratingsBlock.parentNode.insertBefore(row, ratingsBlock.nextSibling);
  }
}

/**
 * Organic Results Injection
 */
async function injectOrganicResults() {
  const searchContainer = document.querySelector('#search');
  if (!searchContainer) return;

  const results = searchContainer.querySelectorAll('div.g:not(.lm-processed), .MjjYud:not(.lm-processed)');
  
  for (const container of results) {
    // Skip if hidden, too small (ghost elements), or non-organic
    if (container.offsetHeight === 0 || container.offsetWidth === 0) continue;
    if (container.closest('.ULSxyf, .ezY8Gf, .kno-vrt-t')) continue;

    const titleLink = container.querySelector('a h3, h3');
    if (!titleLink || titleLink.querySelector('.lm-google-organic-pill')) continue;

    const parentLink = titleLink.closest('a');
    if (!parentLink) continue;

    const href = parentLink.href;
    const isMovieSite = /imdb\.com|letterboxd\.com|netflix\.com|rottentomatoes\.com|metacritic\.com/.test(href);

    if (isMovieSite) {
      container.classList.add('lm-processed');
      
      const rawTitle = titleLink.innerText;
      const cleanTitle = rawTitle.split(' - ')[0].split(' (')[0].replace(/ \d{4}.*$/, '').trim();
      
      const data = await getRating(cleanTitle);
      
      // FINAL VALIDATION: Rating must be a valid number and > 0
      if (data && data.rating && !isNaN(parseFloat(data.rating)) && parseFloat(data.rating) > 0) {
        const pill = document.createElement('span');
        pill.className = 'lm-google-organic-pill';
        pill.style.cssText = 'display:inline-flex !important; align-items:center !important; margin-left:8px !important;';
        pill.innerHTML = `★ ${parseFloat(data.rating).toFixed(1)}`;
        
        titleLink.appendChild(pill);
      }
    }
  }
}





// Initial run and observer
function runInjections() {
  injectKnowledgePanel();
  injectOrganicResults();
}

const observer = new MutationObserver(runInjections);
observer.observe(document.body, { childList: true, subtree: true });

runInjections();
