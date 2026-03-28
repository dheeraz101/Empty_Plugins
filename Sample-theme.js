export const meta = {
  id: 'theme-plugin',
  name: 'Theme Manager',
  version: '3.1.0',
  compat: '>=3.3.0'
};

export function setup(api) {
  const STORAGE_KEY = 'activeTheme';

  let themeBtn = null;
  let panel = null;

  const THEMES = {
    dark: { '--bg': '#0f0f0f', '--text': '#f5f5f7' },
    light: { '--bg': '#f5f5f7', '--text': '#111' },
    blue: { '--bg': '#0f172a', '--text': '#e2e8f0' },
    amoled: { '--bg': '#000000', '--text': '#ffffff' }
  };

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

  function resetTheme() {
    document.documentElement.removeAttribute('style');
    document.body.style.background = '';

    if (api.boardEl) {
      api.boardEl.style.background = '';
      api.boardEl.style.color = '';
    }
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
    `;

    panel.innerHTML = `
      <div style="font-weight:600;margin-bottom:10px">🎨 Themes</div>
      <div id="theme-grid"></div>
      <button id="close-theme">Close</button>
    `;

    document.body.appendChild(panel);

    const grid = panel.querySelector('#theme-grid');

    grid.innerHTML = Object.keys(THEMES).map(name => `
      <button data-theme="${name}">${name}</button>
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

    api.registerUI?.('header-actions', themeBtn, 'theme-btn');
  }

  function cleanup() {
    if (themeBtn) {
      themeBtn.remove();
      themeBtn = null;
    }

    if (panel) {
      panel.remove();
      panel = null;
    }

    resetTheme();
  }

  // INIT
  injectButton();
  api.bus.on('board:allPluginsLoaded', loadTheme);

  return {
    teardown() {
      cleanup();
    }
  };
}