export const meta = {
  id: 'theme-plugin',
  name: 'Theme Manager',
  version: '3.1.1',
  compat: '>=3.3.0'
};

// State variables held outside setup so teardown can access them
let themeBtn = null;
let panel = null;
let currentApi = null;

const THEMES = {
  dark: { '--bg': '#0f0f0f', '--text': '#f5f5f7' },
  light: { '--bg': '#f5f5f7', '--text': '#111' },
  blue: { '--bg': '#0f172a', '--text': '#e2e8f0' },
  amoled: { '--bg': '#000000', '--text': '#ffffff' }
};

export function setup(api) {
  currentApi = api;
  const STORAGE_KEY = 'activeTheme';

  function applyTheme(name) {
    const theme = THEMES[name];
    if (!theme) return;

    Object.entries(theme).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });

    if (api.boardEl) {
      api.boardEl.style.background = theme['--bg'];
      api.boardEl.style.color = theme['--text'];
    }

    document.body.style.background = theme['--bg'];
    api.storage.setForPlugin(meta.id, STORAGE_KEY, name);
  }

  function loadTheme() {
    const saved = api.storage.getForPlugin(meta.id, STORAGE_KEY);
    if (saved) applyTheme(saved);
  }

  function openPanel() {
    if (panel) {
      panel.style.display = 'block';
      return;
    }

    panel = document.createElement('div');
    panel.style.cssText = `
      position:fixed;
      top:120px;
      left:300px;
      width:260px;
      background:#1c1c1f;
      border-radius:14px;
      padding:14px;
      z-index:99999;
      color:white;
      border: 1px solid rgba(255,255,255,0.1);
    `;

    panel.innerHTML = `
      <div style="font-weight:600;margin-bottom:10px;display:flex;justify-content:space-between;">
        <span>🎨 Themes</span>
      </div>
      <div id="theme-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;"></div>
      <button id="close-theme" class="pm-btn secondary" style="width:100%">Close</button>
    `;

    document.body.appendChild(panel);

    const grid = panel.querySelector('#theme-grid');
    grid.innerHTML = Object.keys(THEMES).map(name => `
      <button class="pm-btn secondary" data-theme="${name}">${name}</button>
    `).join('');

    grid.onclick = (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      applyTheme(btn.dataset.theme);
    };

    panel.querySelector('#close-theme').onclick = () => {
      panel.style.display = 'none';
    };

    api.makeDraggable(panel);
  }

  function injectButton() {
    if (themeBtn) return;

    themeBtn = document.createElement('button');
    themeBtn.textContent = '🎨';
    themeBtn.className = 'pm-btn primary';
    themeBtn.onclick = openPanel;

    // Registering UI via the API ensures the Plugin Manager knows who owns this button
    api.registerUI?.('header-actions', themeBtn, 'theme-btn');
  }

  // Initialization
  injectButton();
  
  // Listen for the board ready event to apply saved settings
  api.bus.on('board:allPluginsLoaded', loadTheme);
}

/**
 * Top-level teardown function called by core.js when plugin is paused or deleted
 */
export function teardown() {
  // 1. Remove the UI button
  if (themeBtn) {
    themeBtn.remove();
    themeBtn = null;
  }

  // 2. Remove the theme selection panel
  if (panel) {
    panel.remove();
    panel = null;
  }

  // 3. Reset visual styles to default
  document.documentElement.removeAttribute('style');
  document.body.style.background = '';

  if (currentApi && currentApi.boardEl) {
    currentApi.boardEl.style.background = '';
    currentApi.boardEl.style.color = '';
  }
}