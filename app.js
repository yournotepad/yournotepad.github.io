// app.js
// Storage keys
const KEY_PASSWORD = 'notepad.password';
const KEY_TABS = 'notepad.tabs';
const KEY_THEME = 'notepad.theme';
const KEY_PROTECTION_SET = 'notepad.protectionSet';
const KEY_PAGE_TITLE = 'notepad.pageTitle';
const KEY_FAVICON = 'notepad.faviconDataUrl';

// State
let tabs = []; // [{id, name, content, updatedAt}]
let activeId = null;

// Elements
const authOverlay = document.getElementById('authOverlay');
const authTitle = document.getElementById('authTitle');
const authDesc = document.getElementById('authDesc');
const setPassFields = document.getElementById('setPassFields');
const enterPassFields = document.getElementById('enterPassFields');
const newPass = document.getElementById('newPass');
const confirmPass = document.getElementById('confirmPass');
const enterPass = document.getElementById('enterPass');
const noPasswordSetup = document.getElementById('noPasswordSetup');
const authPrimary = document.getElementById('authPrimary');
const authSecondary = document.getElementById('authSecondary');
const authMessage = document.getElementById('authMessage');

const app = document.getElementById('app');
const tabsEl = document.getElementById('tabs');
const addTabBtn = document.getElementById('addTab');
const deleteTabBtn = document.getElementById('deleteTab');
const searchTabs = document.getElementById('searchTabs');

const toggleThemeBtn = document.getElementById('toggleTheme');
const changePasswordBtn = document.getElementById('changePassword');
const exportDataBtn = document.getElementById('exportData');
const importDataBtn = document.getElementById('importData');

const tabTitle = document.getElementById('tabTitle');
const renameTabBtn = document.getElementById('renameTab');
const clearContentBtn = document.getElementById('clearContent');
const content = document.getElementById('content');

const pageTitleBtn = document.getElementById('pageTitleBtn');
const faviconBtn = document.getElementById('faviconBtn');

const popupOverlay = document.getElementById('popupOverlay');
const popupLabel = document.getElementById('popupLabel');
const popupInput = document.getElementById('popupInput');
const popupCancel = document.getElementById('popupCancel');
const popupOk = document.getElementById('popupOk');

const mainTitle = document.getElementById('mainTitle');

// Helpers
function saveTabs() {
  localStorage.setItem(KEY_TABS, JSON.stringify(tabs));
  renderTabs();
}
function loadTabs() {
  const raw = localStorage.getItem(KEY_TABS);
  if (raw) {
    try { tabs = JSON.parse(raw) || []; } catch { tabs = []; }
  } else {
    tabs = [
      { id: crypto.randomUUID(), name: 'Ideas', content: '', updatedAt: Date.now() },
      { id: crypto.randomUUID(), name: 'Work', content: '', updatedAt: Date.now() },
      { id: crypto.randomUUID(), name: 'Personal', content: '', updatedAt: Date.now() },
    ];
    saveTabs();
  }
  if (!activeId && tabs.length) activeId = tabs[0].id;
}
function getActiveTab() {
  return tabs.find(t => t.id === activeId) || null;
}

function renderTabs() {
  const q = searchTabs.value.trim().toLowerCase();
  tabsEl.innerHTML = '';

  const filteredTabs = tabs.filter(t => t.name.toLowerCase().includes(q));
  filteredTabs.forEach(t => {
    const div = document.createElement('div');
    div.className = 'tab' + (t.id === activeId ? ' active' : '');
    div.onclick = () => switchTab(t.id);

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = t.name;

    const badge = document.createElement('div');
    badge.className = 'badge';
    const chars = t.content?.length || 0;
    badge.textContent = chars ? chars + ' chars' : 'empty';

    div.appendChild(name);
    div.appendChild(badge);
    tabsEl.appendChild(div);
  });

  const active = getActiveTab();

  if (!active) {
    // Hide note editing controls
    tabTitle.style.display = 'none';
    content.style.display = 'none';
    renameTabBtn.disabled = true;
    clearContentBtn.disabled = true;
    deleteTabBtn.disabled = true;

    // Show placeholder message if not present
    if (!document.getElementById('noTabsMessage')) {
      const msg = document.createElement('div');
      msg.id = 'noTabsMessage';
      msg.style.padding = '1em';
      msg.style.color = 'var(--text-muted)';
      msg.style.fontStyle = 'italic';
      msg.style.textAlign = 'center';
      msg.textContent = 'Please create a tab to take notes.';
      // Insert placeholder just before content textarea container
      if (content.parentNode) {
        content.parentNode.insertBefore(msg, content);
      } else {
        app.appendChild(msg);
      }
    }
  } else {
    // Show note editing controls
    tabTitle.style.display = '';
    content.style.display = '';
    renameTabBtn.disabled = false;
    clearContentBtn.disabled = false;
    deleteTabBtn.disabled = false;

    // Remove placeholder message if present
    const msg = document.getElementById('noTabsMessage');
    if (msg) msg.remove();

    tabTitle.value = active.name;
    content.value = active.content || '';
  }
}

function switchTab(id) {
  activeId = id;
  renderTabs();
  content.focus();
}

// Autosave (debounced)
let saveTimer = null;
function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const active = getActiveTab();
    if (!active) return;
    active.content = content.value;
    active.updatedAt = Date.now();
    saveTabs();
  }, 250);
}

// Theme
function applyTheme() {
  const theme = localStorage.getItem(KEY_THEME) || 'dark';
  document.body.classList.toggle('light', theme === 'light');
}
function toggleTheme() {
  const current = localStorage.getItem(KEY_THEME) || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(KEY_THEME, next);
  applyTheme();
}

// Export/Import
function exportData() {
  const data = {
    version: 1,
    tabs,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'notepad-export.json';
  a.click();
  URL.revokeObjectURL(url);
}
function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.tabs)) throw new Error('Invalid file');
        tabs = data.tabs.map(t => ({
          id: t.id || crypto.randomUUID(),
          name: String(t.name || 'Untitled'),
          content: String(t.content || ''),
          updatedAt: Number(t.updatedAt || Date.now())
        }));
        activeId = tabs[0]?.id || null;
        saveTabs();
        showPopup('Import successful.');
      } catch (e) {
        showPopup('Import failed: ' + e.message, true);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// Password flows
function showAuth(mode) {
  authMessage.textContent = '';
  noPasswordSetup.checked = false;
  authPrimary.disabled = false;

  if (mode === 'setup') {
    authTitle.textContent = 'Welcome';
    authDesc.textContent = 'Set a password to protect your notepad, or choose no password.';
    setPassFields.classList.remove('hidden');
    enterPassFields.classList.add('hidden');
    authPrimary.textContent = 'Save password';
    authOverlay.classList.remove('hidden');
    newPass.focus();   // autofocus here
  } else if (mode === 'unlock') {
    authTitle.textContent = 'Enter password';
    authDesc.textContent = 'Unlock your notepad.';
    setPassFields.classList.add('hidden');
    enterPassFields.classList.remove('hidden');
    authPrimary.textContent = 'Unlock';
    authOverlay.classList.remove('hidden');
    enterPass.focus();  // autofocus here
  } else if (mode === 'change') {
    authTitle.textContent = 'Change password';
    authDesc.textContent = 'Enter new password and confirm, or select no password.';
    setPassFields.classList.remove('hidden');
    enterPassFields.classList.add('hidden');
    authPrimary.textContent = 'Update password';
    authOverlay.classList.remove('hidden');
    newPass.focus();   // autofocus here
  }
}
function hideAuth() {
  authOverlay.classList.add('hidden');
  newPass.value = '';
  confirmPass.value = '';
  enterPass.value = '';
  noPasswordSetup.checked = false;
  authMessage.textContent = '';
}

function hasPassword() {
  return !!localStorage.getItem(KEY_PASSWORD);
}
function setPassword(pw) {
  if (!pw) {
    localStorage.removeItem(KEY_PASSWORD);
  } else {
    localStorage.setItem(KEY_PASSWORD, btoa(pw));
  }
}
function verifyPassword(pw) {
  const stored = localStorage.getItem(KEY_PASSWORD);
  if (!stored) return !pw;
  return stored && btoa(pw) === stored;
}

// Popup message (temporary)
function showPopup(message, isError = false) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? 'var(--danger)' : 'var(--accent)';
}

// Initialization with protection check
function init() {
  applyTheme();

  const protectionSet = localStorage.getItem(KEY_PROTECTION_SET) === 'true';
  const passwordSet = hasPassword();

  if (!protectionSet) {
    showAuth('setup');
  } else {
    if (passwordSet) {
      showAuth('unlock');
    } else {
      app.classList.remove('hidden');
      loadTabs();
      renderTabs();
      initializePageTitleAndFavicon();
    }
  }
}

// Update browser tab title
function updatePageTitle(title) {
  document.title = title || 'Personal Notepad';
  mainTitle.textContent = title || 'Personal Notepad';
  localStorage.setItem(KEY_PAGE_TITLE, title || '');
}

// Update favicon dynamically from data URL
function updateFavicon(dataUrl) {
  if (!dataUrl) {
    const existing = document.querySelector('link[rel="icon"]');
    if (existing) existing.remove();
    localStorage.removeItem(KEY_FAVICON);
    return;
  }
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = dataUrl;
  localStorage.setItem(KEY_FAVICON, dataUrl);
}

// Initialize the page title and favicon inputs on app load
function initializePageTitleAndFavicon() {
  const savedTitle = localStorage.getItem(KEY_PAGE_TITLE);
  if (savedTitle) {
    updatePageTitle(savedTitle);
  }
  const savedFavicon = localStorage.getItem(KEY_FAVICON);
  if (savedFavicon) {
    updateFavicon(savedFavicon);
  }
}

// Styled popup dialog
function showPopupDialog({ label, value = '', inputType = 'text' }) {
  return new Promise((resolve) => {
    popupLabel.textContent = label;
    popupInput.type = inputType;
    popupInput.value = value;
    popupInput.style.display = '';
    popupOverlay.style.display = 'flex';
    popupInput.focus();
    popupInput.select();

    function cleanup() {
      popupOverlay.style.display = 'none';
      popupOk.removeEventListener('click', onOk);
      popupCancel.removeEventListener('click', onCancel);
      popupInput.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keydown', onKeyDownDoc);
    }

    function onOk() {
      cleanup();
      resolve(popupInput.value.trim());
    }
    function onCancel() {
      cleanup();
      resolve(null);
    }
    function onKeyDown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onOk();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    }
    function onKeyDownDoc(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    }

    popupOk.addEventListener('click', onOk);
    popupCancel.addEventListener('click', onCancel);
    popupInput.addEventListener('keydown', onKeyDown);
    document.addEventListener('keydown', onKeyDownDoc);
  });
}

// Confirm popup dialog (no input, just message + OK/Cancel)
function showConfirmDialog(message) {
  return new Promise((resolve) => {
    popupLabel.textContent = message;
    popupInput.style.display = 'none';
    popupOverlay.style.display = 'flex';

    function cleanup() {
      popupOverlay.style.display = 'none';
      popupOk.removeEventListener('click', onOk);
      popupCancel.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKeyDown);
    }

    function onOk() {
      cleanup();
      resolve(true);
    }
    function onCancel() {
      cleanup();
      resolve(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onOk();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    }

    popupOk.addEventListener('click', onOk);
    popupCancel.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKeyDown);
  });
}

// Prompt for page title input
async function promptPageTitle() {
  const currentTitle = localStorage.getItem(KEY_PAGE_TITLE) || '';
  const newTitle = await showPopupDialog({ label: 'Enter new browser tab title:', value: currentTitle });
  if (newTitle !== null) {
    updatePageTitle(newTitle);
  }
}

// Prompt for favicon file upload and update favicon
function promptFaviconUpload() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      updateFavicon(dataUrl);
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// Event wiring
authPrimary.addEventListener('click', () => {
  authMessage.textContent = '';
  const isSetupOrChange = !setPassFields.classList.contains('hidden');
  const isUnlock = !enterPassFields.classList.contains('hidden');

  if (isSetupOrChange) {
    if (noPasswordSetup.checked) {
      setPassword('');
      localStorage.setItem(KEY_PROTECTION_SET, 'true');
      hideAuth();
      app.classList.remove('hidden');
      loadTabs();
      renderTabs();
      initializePageTitleAndFavicon();
      return;
    }

    const pw = newPass.value.trim();
    const cf = confirmPass.value.trim();
    if (pw.length > 0 && pw.length < 4) {
      showPopup('Password must be at least 4 characters.', true);
      return;
    }
    if (pw !== cf) {
      showPopup('Passwords do not match.', true);
      return;
    }
    if (pw.length === 0) {
      showPopup('Password cannot be empty unless "No password" is checked.', true);
      return;
    }
    setPassword(pw);
    localStorage.setItem(KEY_PROTECTION_SET, 'true');
    hideAuth();
    app.classList.remove('hidden');
    loadTabs();
    renderTabs();
    initializePageTitleAndFavicon();
  } else if (isUnlock) {
    const pw = enterPass.value;
    if (!verifyPassword(pw)) {
      showPopup('Incorrect password.', true);
      return;
    }
    hideAuth();
    app.classList.remove('hidden');
    loadTabs();
    renderTabs();
    initializePageTitleAndFavicon();
  }
});
authSecondary.addEventListener('click', () => {
  hideAuth();
  const protectionSet = localStorage.getItem(KEY_PROTECTION_SET) === 'true';
  if (!protectionSet) {
    showAuth('setup');
  } else {
    // Close tab on Cancel at lock screen
    window.close();
  }
});

// Submit unlock on Enter key press
enterPass.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    authPrimary.click();
  }
});

// Change password
changePasswordBtn.addEventListener('click', () => {
  showAuth('change');
});

// Tabs actions
addTabBtn.addEventListener('click', async () => {
  const name = await showPopupDialog({ label: 'New tab name:', value: 'New Tab' });
  if (!name) return;
  const tab = { id: crypto.randomUUID(), name, content: '', updatedAt: Date.now() };
  tabs.unshift(tab);
  activeId = tab.id;
  saveTabs();
});
deleteTabBtn.addEventListener('click', async () => {
  const active = getActiveTab();
  if (!active) return;
  const confirmed = await showConfirmDialog(`Are you sure you want to delete the tab "${active.name}"? This cannot be undone.`);
  if (!confirmed) return;
  tabs = tabs.filter(t => t.id !== active.id);
  activeId = tabs[0]?.id || null;
  saveTabs();
});

// Remove renameTabBtn click handler — rename done inline below

// Editor
content.addEventListener('input', queueSave);

// Rename tab inline via tabTitle input events
tabTitle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    submitTabRename();
    content.focus();
  }
});
tabTitle.addEventListener('blur', () => {
  submitTabRename();
});

function submitTabRename() {
  const active = getActiveTab();
  if (!active) return;
  const newName = tabTitle.value.trim() || 'Untitled';
  if (newName !== active.name) {
    active.name = newName;
    active.updatedAt = Date.now();
    saveTabs();
  }
}

clearContentBtn.addEventListener('click', async () => {
  const active = getActiveTab();
  if (!active) return;
  const confirmed = await showConfirmDialog(`Clear content of "${active.name}"?`);
  if (!confirmed) return;
  content.value = '';
  queueSave();
});

// Search
searchTabs.addEventListener('input', renderTabs);

// Theme
toggleThemeBtn.addEventListener('click', toggleTheme);

// Export/Import
exportDataBtn.addEventListener('click', exportData);
importDataBtn.addEventListener('click', importData);

// Page title and favicon buttons event listeners
pageTitleBtn.addEventListener('click', () => {
  promptPageTitle();
});
faviconBtn.addEventListener('click', () => {
  promptFaviconUpload();
});

// Start
init();