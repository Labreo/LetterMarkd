// LetterMarkd Popup Logic

document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    connectBtn: document.getElementById('connectBtn'),
    authContainer: document.getElementById('authContainer'),
    userContainer: document.getElementById('userContainer'),
    username: document.getElementById('username'),
    thresholdSlider: document.getElementById('threshold-slider'),
    thresholdVal: document.getElementById('threshold-val'),
    openOptions: document.getElementById('openOptions'),
    toggles: {
      netflix: document.getElementById('toggle-netflix'),
      prime: document.getElementById('toggle-prime'),
      disney: document.getElementById('toggle-disney'),
      google: document.getElementById('toggle-google')
    }
  };

  // 1. Load Settings
  const settings = await chrome.storage.local.get([
    'authToken', 'username', 'threshold', 
    'enabled_netflix', 'enabled_prime', 'enabled_disney', 'enabled_google'
  ]);

  // Auth State
  if (settings.authToken) {
    elements.authContainer.style.display = 'none';
    elements.userContainer.style.display = 'block';
    elements.username.textContent = `@${settings.username || 'user'}`;
  }

  // Threshold
  const currentThreshold = settings.threshold || 2.5;
  elements.thresholdSlider.value = currentThreshold;
  elements.thresholdVal.textContent = currentThreshold;

  // Toggles
  Object.keys(elements.toggles).forEach(site => {
    const key = `enabled_${site}`;
    elements.toggles[site].checked = settings[key] !== false; // Default to true
  });

  // 2. Event Listeners
  
  // Auth
  elements.connectBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'START_AUTH' }, (response) => {
      if (response && response.success) location.reload();
    });
  });

  // Threshold Slider
  elements.thresholdSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    elements.thresholdVal.textContent = val;
    chrome.storage.local.set({ threshold: parseFloat(val) });
  });

  // Site Toggles
  Object.keys(elements.toggles).forEach(site => {
    elements.toggles[site].addEventListener('change', (e) => {
      chrome.storage.local.set({ [`enabled_${site}`]: e.target.checked });
    });
  });

  // Open Options
  elements.openOptions.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});
