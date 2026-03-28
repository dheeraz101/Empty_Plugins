export const meta = {
  id: 'theme-plugin',
  name: 'Theme Manager',
  version: '3.0.0',
  description: 'Modern theme system with real board support',
  compat: '>=3.3.0'
};

export function setup(api) {
  const STORAGE_KEY = 'activeTheme';

  const THEMES = {
    dark: {
      '--bg': '#0f0f0f',
      '--panel': '#1c1c1f',
      '--text': '#f5f5f7'
    },
    light: {
      '--bg': '#f5f5f7',
      '--panel': '#ffffff',
      '--text': '#111'
    },
    blue: {
      '--bg': '#0f172a',
      '--panel': '#1e293b',
      '--text': '#e2e8f0'
    },
    amoled: {
      '--bg': '#000000',
      '--panel': '#0a0a0a',
      '--text': '#ffffff'
    }
  };

  // ───────── APPLY THEME (FIXED) ─────────
  function applyTheme(name) {
    const theme = THEMES[name];
    if (!theme) return;

    // global vars
    Object.entries(theme).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });

    // 🔥 FORCE APPLY TO BOARD (FIX)
    if (api.boardEl) {
      api.boardEl.style.background = theme['--bg'];
      api.boardEl.style.color = theme['--text'];
    }

    document.body.style.background = theme['--bg'];

    api.storage.setForPlugin(meta.id, STORAGE_KEY, name);
  }

  function loadTheme() {
    const saved = api.storage.getForPlugin(meta.id, STORAGE_KEY) || 'dark';
    applyTheme(saved);
  }

  // ───────── PANEL UI (IMPROVED) ─────────
  function openPanel() {
    let panel = document.getElementById('theme-panel');

    if (panel) {
      panel.style.display = 'block';
      return;
    }

    panel = document.createElement('div');
    panel.id = 'theme-panel';

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
      box-shadow:0 10px 40px rgba(0,0,0,0.6);
      font-family:system-ui;
    `;

    panel.innerHTML = `
      <div style="font-weight:600;margin-bottom:10px">🎨 Themes</div>
      <div id="theme-grid" style="display:grid;gap:8px"></div>
      <button id="close-theme" style="margin-top:10px;width:100%">Close</button>
    `;

    document.body.appendChild(panel);

    const grid = panel.querySelector('#theme-grid');

    grid.innerHTML = Object.keys(THEMES).map(name => `
      <button data-theme="${name}" style="
        padding:8px;
        border:none;
        border-radius:8px;
        background:#2a2a2e;
        color:white;
        cursor:pointer;
      ">
        ${name}
      </button>
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

  // ───────── SAFE INJECTION (NEW SYSTEM) ─────────
  function injectButton() {
    const btn = document.createElement('button');
    btn.textContent = '🎨';
    btn.className = 'pm-btn primary';
    btn.onclick = openPanel;

    // 🔥 USE SLOT SYSTEM (NO DOM BREAKING)
    if (api.registerUI) {
      api.registerUI('header-actions', btn, 'theme-btn');
    }
  }

  api.bus.on('plugin:installed', ({ id }) => {
    if (id === meta.id) injectButton();
  });

  api.bus.on('board:allPluginsLoaded', () => {
    loadTheme();
    injectButton();
  });

  return {
    teardown() {}
  };
}