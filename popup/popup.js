document.addEventListener('DOMContentLoaded', async () => {
  const toggleSite = document.getElementById('toggle-site');
  const toggleMaster = document.getElementById('toggle-master');
  
  // Get current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url.startsWith('http')) {
    toggleSite.disabled = true;
    return;
  }

  const host = new URL(tab.url).hostname.replace('www.', '');

  // Initialize toggles
  chrome.storage.local.get(['allowlist', 'blocklist', 'masterEnabled'], (res) => {
    const allowlist = res.allowlist || [];
    const blocklist = res.blocklist || [];
    const master = res.masterEnabled !== false;
    
    toggleMaster.checked = master;
    toggleSite.checked = allowlist.includes(host) && !blocklist.includes(host);
  });

  toggleSite.addEventListener('change', () => {
    chrome.storage.local.get(['allowlist', 'blocklist'], (res) => {
      let listA = res.allowlist || [];
      let listB = res.blocklist || [];
      
      if (toggleSite.checked) {
        if (!listA.includes(host)) listA.push(host);
        listB = listB.filter(h => h !== host);
      } else {
        if (!listB.includes(host)) listB.push(host);
        listA = listA.filter(h => h !== host);
      }
      
      chrome.storage.local.set({ allowlist: listA, blocklist: listB }, () => {
        // Notify tab to refresh its local state
        chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' });
      });
    });
  });

  toggleMaster.addEventListener('change', () => {
    chrome.storage.local.set({ masterEnabled: toggleMaster.checked });
  });
});
