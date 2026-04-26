// LetterMarkd Universal Popup Logic

document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    toggleMaster: document.getElementById('toggle-master')
  };

  // 1. Load Settings
  const settings = await chrome.storage.local.get(['enabled']);
  elements.toggleMaster.checked = settings.enabled !== false; // Default to true

  // 2. Event Listeners
  elements.toggleMaster.addEventListener('change', (e) => {
    chrome.storage.local.set({ enabled: e.target.checked });
  });
});

