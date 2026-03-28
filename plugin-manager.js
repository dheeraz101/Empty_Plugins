export const meta = {
  id: 'plugin-manager',
  name: 'Plugin Manager',
  version: '3.6.0',
  compat: '>=3.3.0'
};

export function setup(api) {
  const SELF_ID = meta.id;
  const COMMUNITY_URL = 'https://raw.githubusercontent.com/dheeraz101/Empty_Plugins/refs/heads/main/plugins.json';
  const DOCS_URL = 'https://empty-ad9a3406.mintlify.app/';

  // ───────── MODERN REVAMPED STYLES ─────────
  const style = document.createElement('style');
  style.textContent = `
    .pm-root {
      position: fixed;
      top: 10%;
      left: 50%;
      transform: translateX(-50%);
      width: 650px;
      height: 70vh;
      background: rgba(28, 28, 31, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 20px;
      color: #fff;
      font-family: 'Inter', system-ui, sans-serif;
      border: 1px solid rgba(255,255,255,0.1);
      display: none;
      flex-direction: column;
      z-index: 10000;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }

    .pm-header {
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .pm-tabs {
      display: flex;
      padding: 0 10px;
      background: rgba(0,0,0,0.2);
      gap: 5px;
    }

    .pm-tab {
      padding: 14px 20px;
      background: none;
      border: none;
      color: #888;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
    }

    .pm-tab.active {
      color: #7c6fff;
      border-bottom: 2px solid #7c6fff;
    }

    .pm-body { flex: 1; overflow: hidden; position: relative; }
    .pm-panel { height: 100%; overflow: auto; padding: 20px; scroll-behavior: smooth; }

    .pm-card {
      background: rgba(255,255,255,0.03);
      padding: 18px;
      border-radius: 14px;
      margin-bottom: 12px;
      border: 1px solid rgba(255,255,255,0.05);
      transition: transform 0.2s, border 0.2s;
    }

    .pm-card:hover {
      border-color: rgba(124, 111, 255, 0.4);
      background: rgba(255,255,255,0.05);
    }

    .pm-btn {
      padding: 8px 14px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-weight: 600;
      font-size: 12px;
      transition: 0.2s;
    }

    .pm-btn.primary { background: #7c6fff; color: #fff; }
    .pm-btn.danger { background: rgba(255, 102, 102, 0.1); color: #ff6666; border: 1px solid rgba(255, 102, 102, 0.2); }
    .pm-btn.secondary { background: #333; color: #ddd; }
    .pm-btn:hover { filter: brightness(1.2); transform: translateY(-1px); }

    .pm-footer {
      padding: 12px;
      text-align: center;
      background: rgba(0,0,0,0.2);
      border-top: 1px solid rgba(255,255,255,0.05);
    }

    .docs-link { color: #7c6fff; text-decoration: none; font-size: 12px; opacity: 0.8; }
    .docs-link:hover { opacity: 1; text-decoration: underline; }
  `;
  document.head.appendChild(style);

  // ───────── UI GENERATION ─────────
  const root = document.createElement('div');
  root.className = 'pm-root';
  root.innerHTML = `
    <div class="pm-header">
      <div>
        <div style="font-size:18px; font-weight:700; letter-spacing:-0.5px">Plugin Manager</div>
        <div id="pm-stats" style="font-size:12px;color:#666"></div>
      </div>
      <div style="display:flex; gap:12px; align-items:center;">
        <div id="pm-actions" style="display:flex; gap:6px;"></div>
        <button id="pm-close" class="pm-btn secondary" style="border-radius:50%; width:32px; height:32px; padding:0">✕</button>
      </div>
    </div>
    <div class="pm-tabs">
      <button class="pm-tab active" data-tab="installed">Installed</button>
      <button class="pm-tab" data-tab="community">Community Store</button>
    </div>
    <div class="pm-body">
      <div id="installed" class="pm-panel"></div>
      <div id="community" class="pm-panel" style="display:none"></div>
    </div>
    <div class="pm-footer">
      <a href="${DOCS_URL}" target="_blank" class="docs-link">📖 View Developer Documentation</a>
    </div>
  `;

  document.body.appendChild(root);
  api.makeDraggable(root);

  // ───────── SLOT SYSTEM ─────────
  const slotRegistry = new Map();
  api.registerUI = (slot, el, id) => {
    const target = root.querySelector('#pm-actions');
    if (slot !== 'header-actions' || !target) return;
    if (id && target.querySelector(`[data-ui-id="${id}"]`)) return;
    
    if (id) el.dataset.uiId = id;
    target.appendChild(el);

    const pluginId = api._currentPlugin || 'unknown';
    if (!slotRegistry.has(pluginId)) slotRegistry.set(pluginId, []);
    slotRegistry.get(pluginId).push(el);
  };

  function cleanupPluginUI(pluginId) {
    const items = slotRegistry.get(pluginId);
    if (items) {
      items.forEach(el => el.remove());
      slotRegistry.delete(pluginId);
    }
  }

  // ───────── RENDERING ─────────
  function renderInstalled() {
    if (!api.registry || !api.registry.getAll) return;
    const el = root.querySelector('#installed');
    const plugins = api.registry.getAll();

    el.innerHTML = plugins.map(p => `
      <div class="pm-card">
        <div style="display:flex; justify-content:space-between; align-items:start">
          <div>
            <div style="font-weight:700; font-size:15px">${p.name || p.id}</div>
            <div style="font-size:11px; color:#555; font-family:monospace">${p.id}</div>
          </div>
          <div style="font-size:10px; padding:3px 8px; border-radius:6px; background:${p.enabled ? 'rgba(76,175,80,0.1)' : 'rgba(255,102,102,0.1)'}; color:${p.enabled ? '#4caf50' : '#ff6666'}">
            ${p.enabled ? '● ACTIVE' : '○ PAUSED'}
          </div>
        </div>
        <div style="margin-top:14px; display:flex; gap:8px">
          ${p.id !== SELF_ID ? `
            <button class="pm-btn ${p.enabled ? 'secondary' : 'primary'}" data-act="toggle" data-id="${p.id}">
              ${p.enabled ? 'Pause' : 'Resume'}
            </button>
            <button class="pm-btn danger" data-act="delete" data-id="${p.id}">Delete</button>
          ` : `<span style="font-size:11px; color:#7c6fff; font-weight:600">Core System</span>`}
        </div>
      </div>
    `).join('');
    root.querySelector('#pm-stats').textContent = `${plugins.length} Plugins Loaded`;
  }

  async function renderCommunity() {
    const el = root.querySelector('#community');
    el.innerHTML = '<div style="text-align:center; padding:40px; color:#666">Connecting to GitHub...</div>';
    
    try {
      const data = await fetch(COMMUNITY_URL).then(r => r.json());
      const installed = new Set(api.registry.getAll().map(p => p.id));

      el.innerHTML = data.plugins.map(p => `
        <div class="pm-card">
          <div style="font-weight:700; font-size:15px">${p.name}</div>
          <div style="font-size:12px; color:#888; margin: 4px 0 12px 0">${p.description || ''}</div>
          ${installed.has(p.id) 
            ? `<button class="pm-btn secondary" disabled style="opacity:0.5">✓ Installed</button>`
            : `<button class="pm-btn primary" data-install="${p.id}" data-url="${p.url}">Install</button>`
          }
        </div>
      `).join('');
    } catch {
      el.innerHTML = '<div style="color:#ff6666">Failed to load community store.</div>';
    }
  }

  // ───────── INTERACTIONS ─────────
  root.onclick = async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.id === 'pm-close') { root.style.display = 'none'; return; }
    
    const { id, act, install, url } = btn.dataset;

    if (act === 'toggle') {
      await api.togglePlugin(id);
      cleanupPluginUI(id);
      renderInstalled();
    } else if (act === 'delete') {
      if(confirm('Delete this plugin?')) {
        await api.deletePlugin(id);
        cleanupPluginUI(id);
        api.storage.remove(`plugin:${id}`);
        renderInstalled();
      }
    } else if (install) {
      btn.textContent = 'Installing...';
      await api.installPlugin(install, url);
      renderInstalled();
      renderCommunity();
    }
  };

  root.querySelectorAll('.pm-tab').forEach(tab => {
    tab.onclick = () => {
      root.querySelectorAll('.pm-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isComm = tab.dataset.tab === 'community';
      root.querySelector('#installed').style.display = isComm ? 'none' : 'block';
      root.querySelector('#community').style.display = isComm ? 'block' : 'none';
      if (isComm) renderCommunity();
    };
  });

  // ───────── LIFECYCLE ─────────
  api.bus.on('plugin:installed', renderInstalled);
  api.bus.on('plugin:deleted', renderInstalled);
  api.bus.on('plugin:toggled', renderInstalled);
  
  // Right-click to open
  api.boardEl.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.pm-root')) return;
    e.preventDefault();
    root.style.display = 'flex';
    renderInstalled();
  });

  renderInstalled();
}

export function teardown() {
  document.querySelector('.pm-root')?.remove();
}