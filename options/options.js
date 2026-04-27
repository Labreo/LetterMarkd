function saveOptions() {
  const blocklist = document.getElementById('blocklist').value.split('\n').map(s => s.trim().toLowerCase()).filter(s => s);
  const allowlist = document.getElementById('allowlist').value.split('\n').map(s => s.trim().toLowerCase()).filter(s => s);
  const maxWordCount = parseInt(document.getElementById('maxWordCount').value) || 27;
  
  chrome.storage.local.set({
    blocklist: blocklist,
    allowlist: allowlist,
    maxWordCount: maxWordCount
  }, () => {
    const status = document.getElementById('status');
    status.classList.add('visible');
    setTimeout(() => {
      status.classList.remove('visible');
    }, 2000);
    // Notify background and content scripts
    chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
  });
}

function restoreOptions() {
  chrome.storage.local.get({
    blocklist: [],
    allowlist: [],
    maxWordCount: 27
  }, (items) => {
    document.getElementById('blocklist').value = items.blocklist.join('\n');
    document.getElementById('allowlist').value = items.allowlist.join('\n');
    document.getElementById('maxWordCount').value = items.maxWordCount;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
