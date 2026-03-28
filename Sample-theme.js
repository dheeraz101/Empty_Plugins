export const meta = {
  id: 'theme-plugin',
  name: 'Theme Manager',
  version: '2.0.0',
  description: 'Real theme system with presets + persistence',
  compat: '>=3.3.0'
};

export function setup(api) {
  const STORAGE_KEY = 'activeTheme';

  console.log('🎨 Theme Manager v2 loaded');

  // ─────────────────────────────
  // 🎨 THEMES
  // ─────────────────────────────
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

  // ─────────────────────────────
  // 🎯 APPLY THEME
  // ─────────────────────────────
  function applyTheme(name) {
    const theme = THEMES[name];
    if (!theme) return;

    Object.entries(theme).forEach(([key, val]) => {
      document.documentElement.style.setProperty(key, val);
    });

    document.body.style.background = theme['--bg'];

    api.storage.setForPlugin(meta.id, STORAGE_KEY, name);
    api.notify(`Theme: ${name}`, 'success', 2000);
  }

  function loadTheme() {
    const saved = api.storage.getForPlugin(meta.id, STORAGE_KEY) || 'dark';
    applyTheme(saved);
  }

  // ─────────────────────────────
  // 🪟 FLOATING THEME PANEL (REAL UI)
  // ─────────────────────────────
  function openThemePanel() {
    let panel = document.getElementById('theme-panel');

    if (panel) {
      panel.style.display = 'block';
      return;
    }

    panel = document.createElement('div');
    panel.id = 'theme-panel';

    panel.style.cssText = `
      position:absolute;
      top:120px;
      left:300px;
      width:320px;
      background:rgba(30,30,34,0.85);
      backdrop-filter:blur(20px);
      border-radius:16px;
      padding:20px;
      z-index:99999;
      color:white;
      box-shadow:0 20px 60px rgba(0,0,0,0.6);
    `;

    panel.innerHTML = `
      <div style="font-weight:600; margin-bottom:12px;">🎨 Themes</div>
      <div id="theme-list"></div>
      <button id="close-theme" style="margin-top:14px;">Close</button>
    `;

    document.body.appendChild(panel);

    // render themes
    const list = panel.querySelector('#theme-list');

    list.innerHTML = Object.keys(THEMES).map(name => `
      <div style="margin-bottom:10px;">
        <button data-theme="${name}" style="width:100%; padding:10px;">
          ${name}
        </button>
      </div>
    `).join('');

    list.onclick = (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      applyTheme(btn.dataset.theme);
    };

    panel.querySelector('#close-theme').onclick = () => {
      panel.style.display = 'none';
    };

    api.makeDraggable(panel);
  }

  // ─────────────────────────────
  // 🧠 INTEGRATION (WORKING WAY)
  // ─────────────────────────────

  // Add button into Plugin Manager header instead of broken tab hook
  function injectThemeButton() {
    if (document.getElementById('theme-btn')) return;

    const header = document.querySelector('.pm-header');
    if (!header) return;

    const btn = document.createElement('button');
    btn.id = 'theme-btn';
    btn.textContent = '🎨 Themes';

    btn.className = 'pm-btn primary';
    btn.onclick = openThemePanel;

    header.appendChild(btn);
  }

  api.bus.on('plugin:loaded', injectThemeButton);

  // ─────────────────────────────
  // 🚀 INIT
  // ─────────────────────────────
  api.bus.on('board:allPluginsLoaded', loadTheme);

  return {
    teardown() {
      console.log('🎨 Theme Manager unloaded');
    }
  };
}