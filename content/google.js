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
  const searchResults = document.querySelectorAll('h3');
  
  for (const h3 of searchResults) {
    if (h3.querySelector('.lm-google-organic-pill')) continue;

    const titleText = h3.innerText;
    
    // Simple heuristic: if the title contains common movie patterns or the URL looks like IMDb/Letterboxd/Netflix
    const parentLink = h3.closest('a');
    if (!parentLink) continue;

    const href = parentLink.href;
    const isMovieSite = /imdb\.com|letterboxd\.com|netflix\.com|rottentomatoes\.com/.test(href);

    if (isMovieSite) {
      // Extract clean title (remove " - IMDb", etc.)
      const cleanTitle = titleText.split(' - ')[0].split(' (')[0];
      
      const data = await getRating(cleanTitle);
      if (data && data.rating && data.rating !== 'N/A') {
        const pill = document.createElement('a');
        pill.href = data.url;
        pill.target = '_blank';
        pill.className = 'lm-google-organic-pill';
        pill.innerHTML = `★ ${parseFloat(data.rating).toFixed(1)}`;
        
        h3.appendChild(pill);
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
