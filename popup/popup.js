// LetterMarkd Popup Logic

document.addEventListener('DOMContentLoaded', async () => {
  const connectBtn = document.getElementById('connectBtn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const userText = document.getElementById('userText');

  // Check initial connection status
  const { authToken, username } = await chrome.storage.local.get(['authToken', 'username']);
  
  if (authToken) {
    updateUIConnected(username);
  }

  connectBtn.addEventListener('click', () => {
    if (authToken) {
      // Logic for logout or switching account
      chrome.storage.local.remove(['authToken', 'username'], () => {
        location.reload();
      });
    } else {
      startAuthFlow();
    }
  });

  function updateUIConnected(username) {
    statusDot.classList.add('connected');
    statusText.textContent = 'Connected';
    userText.textContent = username || 'Letterboxd User';
    connectBtn.textContent = 'Disconnect Account';
    connectBtn.style.background = '#345';
    connectBtn.style.color = '#fff';
  }

  async function startAuthFlow() {
    connectBtn.disabled = true;
    connectBtn.textContent = 'Connecting...';

    // Send message to background to start the flow
    chrome.runtime.sendMessage({ type: 'START_AUTH' }, (response) => {
      if (response && response.success) {
        updateUIConnected(response.username);
        location.reload();
      } else {
        alert('Authentication failed: ' + (response ? response.error : 'Unknown error'));
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect Letterboxd';
      }
    });
  }
});
