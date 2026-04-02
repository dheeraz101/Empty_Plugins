let currentApi = null;
let themeBtn = null;
let panel = null;
let styleEl = null;

export const meta = {
  id: 'theme-plugin',
  name: 'Theme Manager',
  version: '4.0.0',
  compat: '>=3.3.0'
};

const THEMES = {
  dark: {
    name: 'Midnight',
    icon: '🌙',
    vars: {
      '--board-bg': '#0a0a12',
      '--board-text': '#e4e4ed',
      '--board-accent': '#7c6fff',
      '--board-accent-glow': 'rgba(124,111,255,0.15)',
      '--board-border': 'rgba(255,255,255,0.07)',
      '--board-surface': '#12121e',
      '--board-surface-hover': '#1a1a2e',
      '--board-muted': '#6b6b80',
      '--board-danger': '#ff5c5c',
      '--board-success': '#2ecc71',
      '--board-grid': 'rgba(255,255,255,0.02)',
    }
  },
  light: {
    name: 'Clean Light',
    icon: '☀️',
    vars: {
      '--board-bg': '#f4f4f8',
      '--board-text': '#1a1a2e',
      '--board-accent': '#6c5ce7',
      '--board-accent-glow': 'rgba(108,92,231,0.12)',
      '--board-border': 'rgba(0,0,0,0.08)',
      '--board-surface': '#ffffff',
      '--board-surface-hover': '#f8f8fc',
      '--board-muted': '#8888a0',
      '--board-danger': '#e5484d',
      '--board-success': '#30a46c',
      '--board-grid': 'rgba(0,0,0,0.03)',
    }
  },
  ocean: {
    name: 'Ocean',
    icon: '🌊',
    vars: {
      '--board-bg': '#0b1929',
      '--board-text': '#c8d6e5',
      '--board-accent': '#0abde3',
      '--board-accent-glow': 'rgba(10,189,227,0.15)',
      '--board-border': 'rgba(255,255,255,0.06)',
      '--board-surface': '#0f2440',
      '--board-surface-hover': '#153050',
      '--board-muted': '#546e8a',
      '--board-danger': '#ff6b6b',
      '--board-success': '#1dd1a1',
      '--board-grid': 'rgba(255,255,255,0.02)',
    }
  },
  forest: {
    name: 'Forest',
    icon: '🌲',
    vars: {
      '--board-bg': '#0d1a0d',
      '--board-text': '#c8e6c9',
      '--board-accent': '#66bb6a',
      '--board-accent-glow': 'rgba(102,187,106,0.15)',
      '--board-border': 'rgba(255,255,255,0.06)',
      '--board-surface': '#122112',
      '--board-surface-hover': '#1a2e1a',
      '--board-muted': '#5a7a5a',
      '--board-danger': '#ef5350',
      '--board-success': '#81c784',
      '--board-grid': 'rgba(255,255,255,0.015)',
    }
  },
  sunset: {
    name: 'Sunset',
    icon: '🌅',
    vars: {
      '--board-bg': '#1a0a0a',
      '--board-text': '#ffe0cc',
      '--board-accent': '#ff7043',
      '--board-accent-glow': 'rgba(255,112,67,0.15)',
      '--board-border': 'rgba(255,255,255,0.06)',
      '--board-surface': '#221010',
      '--board-surface-hover': '#2e1818',
      '--board-muted': '#8a6060',
      '--board-danger': '#ff5252',
      '--board-success': '#69f0ae',
      '--board-grid': 'rgba(255,255,255,0.015)',
    }
  },
  amoled: {
    name: 'AMOLED',
    icon: '⬛',
    vars: {
      '--board-bg': '#000000',
      '--board-text': '#ffffff',
      '--board-accent': '#a78bfa',
      '--board-accent-glow': 'rgba(167,139,250,0.2)',
      '--board-border': 'rgba(255,255,255,0.1)',
      '--board-surface': '#0a0a0a',
      '--board-surface-hover': '#141414',
      '--board-muted': '#666666',
      '--board-danger': '#ff4444',
      '--board-success': '#00e676',
      '--board-grid': 'rgba(255,255,255,0.03)',
    }
  }
};

function generateCSS(theme) {
  const v = theme.vars;
  return `
    :root {
      ${Object.entries(v).map(([k, val]) => `${k}: ${val};`).join('\n      ')}
    }

    body, html {
      background: var(--board-bg) !important;
      color: var(--board-text) !important;
    }

    #board, .board, [class*="board"] {
      background: var(--board-bg) !important;
      color: var(--board-text) !important;
      background-image:
        linear-gradient(var(--board-grid) 1px, transparent 1px),
        linear-gradient(90deg, var(--board-grid) 1px, transparent 1px) !important;
      background-size: 40px 40px !important;
    }

    .plugin-box, [data-plugin-id] {
      background: var(--board-surface) !important;
      color: var(--board-text) !important;
      border-color: var(--board-border) !important;
    }

    .plugin-box:hover, [data-plugin-id]:hover {
      background: var(--board-surface-hover) !important;
      border-color: rgba(255,255,255,0.12) !important;
    }

    .pm-btn.primary, .primary {
      background: var(--board-accent) !important;
      color: #fff !important;
    }

    .pm-btn.secondary, .secondary {
      background: rgba(255,255,255,0.06) !important;
      color: var(--board-text) !important;
      border: 1px solid var(--board-border) !important;
    }

    .pm-btn.danger, .danger {
      background: rgba(255,92,92,0.12) !important;
      color: var(--board-danger) !important;
    }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

    ::selection { background: var(--board-accent-glow); color: #fff; }

    input, textarea, select {
      background: rgba(255,255,255,0.04) !important;
      border: 1px solid var(--board-border) !important;
      color: var(--board-text) !important;
      border-radius: 8px !important;
    }

    input:focus, textarea:focus, select:focus {
      border-color: var(--board-accent) !important;
      box-shadow: 0 0 0 2px var(--board-accent-glow) !important;
    }

    .bb-zone {
      border-color: var(--board-border) !important;
      background: rgba(255,255,255,0.015) !important;
    }

    .bb-zone.highlight {
      border-color: var(--board-accent) !important;
      background: var(--board-accent-glow) !important;
    }
  `;
}

function applyTheme(name) {
  const theme = THEMES[name];
  if (!theme) return;

  const css = generateCSS(theme);

  if (currentApi?.injectCSS) {
    currentApi.removeCSS(meta.id);
    currentApi.injectCSS(meta.id, css, { global: true });
  } else {
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = `bb-css-${meta.id}`;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }

  Object.entries(theme.vars).forEach(([k, v]) => {
    document.documentElement.style.setProperty(k, v);
  });

  if (currentApi?.boardEl) {
    currentApi.boardEl.style.background = theme.vars['--board-bg'];
  }
  document.body.style.background = theme.vars['--board-bg'];

  currentApi?.storage?.setForPlugin(meta.id, 'activeTheme', name);
}

function openPanel() {
  if (panel) {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    return;
  }

  panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    width: 320px;
    background: rgba(18,18,30,0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 16px;
    z-index: 99999;
    color: #e4e4ed;
    font-family: system-ui, sans-serif;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  `;

  const saved = currentApi?.storage?.getForPlugin(meta.id, 'activeTheme') || 'dark';

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <b style="font-size:15px;letter-spacing:-0.02em;">🎨 Themes</b>
      <button id="theme-close" style="background:none;border:none;color:#888;cursor:pointer;font-size:16px;">✕</button>
    </div>
    <div id="theme-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;"></div>
  `;

  const grid = panel.querySelector('#theme-grid');
  Object.entries(THEMES).forEach(([key, theme]) => {
    const btn = document.createElement('button');
    const isActive = key === saved;
    btn.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 14px 8px;
      background: ${isActive ? 'rgba(124,111,255,0.15)' : 'rgba(255,255,255,0.04)'};
      border: 1.5px solid ${isActive ? '#7c6fff' : 'rgba(255,255,255,0.06)'};
      border-radius: 12px;
      color: #ddd;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.15s;
    `;
    btn.innerHTML = `<span style="font-size:22px;">${theme.icon}</span>${theme.name}`;
    btn.dataset.theme = key;

    btn.onmouseenter = () => {
      if (!btn.dataset.active) btn.style.background = 'rgba(255,255,255,0.08)';
    };
    btn.onmouseleave = () => {
      if (!btn.dataset.active) btn.style.background = 'rgba(255,255,255,0.04)';
    };

    btn.onclick = () => {
      applyTheme(key);
      grid.querySelectorAll('button').forEach(b => {
        b.style.background = 'rgba(255,255,255,0.04)';
        b.style.borderColor = 'rgba(255,255,255,0.06)';
        delete b.dataset.active;
      });
      btn.style.background = 'rgba(124,111,255,0.15)';
      btn.style.borderColor = '#7c6fff';
      btn.dataset.active = '1';
    };

    grid.appendChild(btn);
  });

  panel.querySelector('#theme-close').onclick = () => {
    panel.style.display = 'none';
  };

  document.body.appendChild(panel);
  if (currentApi?.makeDraggable) currentApi.makeDraggable(panel);
}

function injectButton() {
  if (themeBtn) return;
  themeBtn = document.createElement('button');
  themeBtn.textContent = '🎨';
  themeBtn.className = 'pm-btn secondary';
  themeBtn.style.fontSize = '16px';
  themeBtn.onclick = openPanel;

  if (currentApi?.registerUI) {
    currentApi.registerUI('header-actions', themeBtn, 'theme-btn');
  } else {
    themeBtn.style.cssText = 'position:fixed;top:8px;right:200px;z-index:99999;padding:6px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#aaa;cursor:pointer;font-size:16px;';
    document.body.appendChild(themeBtn);
  }
}

export function setup(api) {
  currentApi = api;
  injectButton();

  const loadSaved = () => {
    const saved = api.storage.getForPlugin(meta.id, 'activeTheme');
    if (saved && THEMES[saved]) applyTheme(saved);
  };

  if (api.bus) {
    api.bus.on('board:allPluginsLoaded', loadSaved);
  } else {
    setTimeout(loadSaved, 500);
  }
}

export function teardown() {
  if (themeBtn) { themeBtn.remove(); themeBtn = null; }
  if (panel) { panel.remove(); panel = null; }

  if (currentApi?.removeCSS) {
    currentApi.removeCSS(meta.id);
  } else if (styleEl) {
    styleEl.remove();
    styleEl = null;
  }

  document.documentElement.removeAttribute('style');
  document.body.style.background = '';
  if (currentApi?.boardEl) currentApi.boardEl.style.background = '';
  currentApi = null;
}
