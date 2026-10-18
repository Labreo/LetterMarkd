document.addEventListener('DOMContentLoaded', () => {
  const toggleSite = document.getElementById('toggle-site');
  const toggleMaster = document.getElementById('toggle-master');

  function notifyTabSettingsUpdated(tabId) {
    if (!tabId) return;
    try {
      chrome.tabs.sendMessage(tabId, { type: 'SETTINGS_UPDATED' }, () => {
        if (chrome.runtime.lastError) {
          /* ignore missing listener in non-supported tabs */
        }
      });
    } catch (e) {
      console.warn('[LetterMarkd] Could not send message to tab:', e);
    }
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.url || !tab.url.startsWith('http')) {
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
          notifyTabSettingsUpdated(tab.id);
        });
      });
    });

    toggleMaster.addEventListener('change', () => {
      chrome.storage.local.set({ masterEnabled: toggleMaster.checked }, () => {
        notifyTabSettingsUpdated(tab.id);
      });
    });
  });
});
