function saveOptions() {
  const blocklist = document.getElementById('blocklist').value.split('\n').map(s => s.trim().toLowerCase()).filter(s => s);
  const allowlist = document.getElementById('allowlist').value.split('\n').map(s => s.trim().toLowerCase()).filter(s => s);
  
  chrome.storage.local.set({
    blocklist: blocklist,
    allowlist: allowlist
  }, () => {
    const status = document.getElementById('status');
    status.classList.add('visible');
    setTimeout(() => {
      status.classList.remove('visible');
    }, 2000);
  });
}

function restoreOptions() {
  chrome.storage.local.get({
    blocklist: [],
    allowlist: []
  }, (items) => {
    document.getElementById('blocklist').value = items.blocklist.join('\n');
    document.getElementById('allowlist').value = items.allowlist.join('\n');
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
