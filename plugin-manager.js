export const meta = {
  id: 'plugin-manager',
  name: 'Plugin Manager',
  version: '3.4.1',
  compat: '>=3.3.0'
};

export function setup(api) {
  const SELF_ID = meta.id;
  const COMMUNITY_URL = 'https://raw.githubusercontent.com/dheeraz101/Empty_Plugins/refs/heads/main/plugins.json';

  // ───────── STYLE ─────────
  const style = document.createElement('style');
  style.textContent = `
    .pm-root {
      position: fixed;
      top: 80px;
      left: 240px;
      width: 850px;
      height: 75vh;
      min-width: 520px;
      min-height: 420px;
      max-width: 95vw;
      max-height: 90vh;
      display: none;
      z-index: 10000;
      background: #161618;
      border-radius: 16px;
      color: #ececec;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      border: 1px solid rgba(255,255,255,0.1);
      display:flex;
      flex-direction:column;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      backdrop-filter: blur(10px);
    }

    .pm-header {
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:16px 20px;
      border-bottom:1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.02);
    }

    .pm-right {
      display:flex;
      align-items:center;
      gap:12px;
    }

    #pm-actions {
      display:flex;
      gap:8px;
    }

    .pm-tabs {
      display:flex;
      padding: 0 10px;
      background: rgba(0,0,0,0.2);
      border-bottom:1px solid rgba(255,255,255,0.05);
    }

    .pm-tab {
      padding:14px 20px;
      background:none;
      border:none;
      color:#888;
      cursor:pointer;
      font-weight: 500;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
    }

    .pm-tab:hover {
      color: #bbb;
    }

    .pm-tab.active {
      color:#7c6fff;
      border-bottom:2px solid #7c6fff;
    }

    .pm-body {
      flex:1;
      overflow:hidden;
      background: #1c1c1f;
    }

    .pm-panel {
      height:100%;
      overflow:auto;
      padding:20px;
    }

    .pm-card {
      background: rgba(255,255,255,0.04);
      padding:16px;
      border-radius:12px;
      margin-bottom:12px;
      border: 1px solid rgba(255,255,255,0.05);
      transition: transform 0.1s;
    }

    .pm-card:hover {
      background: rgba(255,255,255,0.06);
    }

    .pm-btn {
      padding:8px 14px;
      border:none;
      border-radius:8px;
      cursor:pointer;
      font-weight: 600;
      font-size: 13px;
      transition: opacity 0.2s, filter 0.2s;
    }

    .pm-btn:hover {
      filter: brightness(1.1);
    }

    .pm-btn:active {
      transform: scale(0.98);
    }

    .docs-link {
      color: #7c6fff;
      text-decoration: none;
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 6px;
      background: rgba(124, 111, 255, 0.1);
      border: 1px solid rgba(124, 111, 255, 0.2);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .primary { background:#7c6fff; color:#fff; }
    .danger { background:#e5484d22; color:#ff6b6b; border: 1px solid #e5484d44; }
    .secondary { background:rgba(255,255,255,0.08); color:#ddd; }
    #pm-close { background:transparent; color:#888; font-size: 18px; }
    #pm-close:hover { color:#fff; }
  `;
  document.head.appendChild(style);

  // ───────── ROOT ─────────
  const root = document.createElement('div');
  root.className = 'pm-root';
  root.style.display = 'none';

  root.innerHTML = `
    <div class="pm-header">
      <div>
        <div style="display:flex; align-items:center; gap:10px;">
            <b style="font-size:16px; letter-spacing:-0.2px">⚙️ Plugin Manager</b>
            <a href="https://empty-ad9a3406.mintlify.app/" target="_blank" class="docs-link">
               <span>Docs</span> ↗
            </a>
        </div>
        <div id="pm-stats" style="font-size:11px; color:#666; margin-top:2px; font-weight:500 uppercase"></div>
      </div>

      <div class="pm-right">
        <div id="pm-actions"></div>
        <button id="pm-close" class="pm-btn">✕</button>
      </div>
    </div>

    <div class="pm-tabs">
      <button class="pm-tab active" data-tab="installed">Installed</button>
      <button class="pm-tab" data-tab="community">Community</button>
    </div>

    <div class="pm-body">
      <div id="installed" class="pm-panel"></div>
      <div id="community" class="pm-panel" style="display:none"></div>
    </div>
  `;

  api.boardEl.appendChild(root);
  api.makeDraggable(root);
  api.makeResizable(root);

  // ───────── SLOT SYSTEM (FIXED) ─────────
  const slots = {
    'header-actions': root.querySelector('#pm-actions')
  };

  const slotRegistry = new Map();

  api.registerUI = (slot, el, id) => {
    const pluginId = api._currentPlugin || 'unknown';

    if (!slots[slot]) return;

    if (id && slots[slot].querySelector(`[data-ui-id="${id}"]`)) return;

    if (id) el.dataset.uiId = id;
    el.dataset.owner = pluginId;

    slots[slot].appendChild(el);

    if (!slotRegistry.has(pluginId)) {
      slotRegistry.set(pluginId, []);
    }
    slotRegistry.get(pluginId).push(el);
  };

  function cleanupPluginUI(pluginId) {
    const items = slotRegistry.get(pluginId);
    if (!items) return;

    items.forEach(el => el.remove());
    slotRegistry.delete(pluginId);
  }

  // ───────── STATE ─────────
  let communityCache = [];

  function renderInstalled() {
    if (!api.registry || !api.registry.getAll) return;

    const el = root.querySelector('#installed');
    const plugins = api.registry.getAll();

    el.innerHTML = plugins.map(p => `
      <div class="pm-card">
        <div style="display:flex; justify-content:space-between; align-items:start">
            <div>
                <b style="font-size:15px">${p.name || p.id}</b>
                <div style="font-size:11px;color:#666;font-family:monospace;margin-top:2px">${p.id}</div>
            </div>
            <div style="font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px; background:${p.enabled ? '#4caf5022' : '#ff666622'}; color:${p.enabled ? '#4caf50' : '#ff6666'}">
              ${p.enabled ? 'ACTIVE' : 'PAUSED'}
            </div>
        </div>

        <div style="margin-top:12px; display:flex; gap:8px">
            ${p.id !== SELF_ID ? `
              <button class="pm-btn secondary" data-act="toggle" data-id="${p.id}">
                ${p.enabled ? 'Pause' : 'Resume'}
              </button>
              <button class="pm-btn danger" data-act="delete" data-id="${p.id}">
                Delete
              </button>
            ` : `<div style="font-size:12px; color:#ffaa00; margin-top:8px">System Protected</div>`}
        </div>
      </div>
    `).join('');

    root.querySelector('#pm-stats').textContent =
      `${plugins.length} PLUGINS LOADED`;
  }

  async function loadCommunity() {
    if (communityCache.length) return communityCache;

    try {
      communityCache = await fetch(COMMUNITY_URL).then(r => r.json());
    } catch {
      communityCache = [];
    }

    return communityCache;
  }

  async function renderCommunity() {
    if (!api.registry) return;

    const el = root.querySelector('#community');
    const list = await loadCommunity();
    const installed = new Set(api.registry.getAll().map(p => p.id));

    el.innerHTML = list.map(p => `
      <div class="pm-card">
        <div style="display:flex; gap:12px">
            <div style="font-size:24px; background:rgba(255,255,255,0.05); padding:10px; border-radius:10px; display:flex; align-items:center; justify-content:center">${p.icon || '📦'}</div>
            <div style="flex:1">
                <b style="font-size:15px">${p.name}</b>
                <div style="font-size:11px;color:#7c6fff;margin-top:1px">by ${p.author || 'Unknown'}</div>
                <div style="font-size:13px; color:#aaa; margin-top:6px; line-height:1.4">${p.description || ''}</div>
            </div>
        </div>

        <div style="margin-top:12px">
            ${
              installed.has(p.id)
                ? `<button class="pm-btn secondary" style="width:100%; cursor:not-allowed; opacity:0.5" disabled>Installed</button>`
                : `<button class="pm-btn primary" style="width:100%"
                    data-install="${p.id}"
                    data-url="${p.url}">
                    Install Plugin
                  </button>`
            }
        </div>
      </div>
    `).join('');
  }

  // ───────── EVENTS ─────────
  root.onclick = async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const id = btn.dataset.id;

    if (btn.dataset.act === 'toggle') {
      await api.togglePlugin(id); 
      cleanupPluginUI(id); 
      renderInstalled();
      renderCommunity();
    }

    if (btn.dataset.act === 'delete') {
      await api.deletePlugin(id); 
      cleanupPluginUI(id);
      api.storage.remove(`plugin:${id}`);
      renderInstalled();
      renderCommunity();
    }

    if (btn.dataset.install) {
      await api.installPlugin(btn.dataset.install, btn.dataset.url, btn.dataset.install);
      api.bus.emit('plugin:installed', { id: btn.dataset.install });
      renderInstalled();
      renderCommunity();
    }
  };

  // ───────── LIFECYCLE FIX ─────────
  api.bus.on('board:allPluginsLoaded', () => {
    renderInstalled();
  });

  api.bus.on('plugin:installed', renderInstalled);
  api.bus.on('plugin:deleted', renderInstalled);
  api.bus.on('plugin:toggled', renderInstalled);

  // ───────── TABS ─────────
  root.querySelectorAll('.pm-tab').forEach(tab => {
    tab.onclick = () => {
      root.querySelectorAll('.pm-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      root.querySelector('#installed').style.display = 'none';
      root.querySelector('#community').style.display = 'none';

      root.querySelector('#' + tab.dataset.tab).style.display = 'block';

      if (tab.dataset.tab === 'community') renderCommunity();
    };
  });

  // ───────── OPEN ─────────
  api.boardEl.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.pm-root')) return;
    e.preventDefault();

    root.style.display = 'flex';
    renderInstalled();
  });

  root.querySelector('#pm-close').onclick = () => {
    root.style.display = 'none';
  };

  console.log('🔥 Plugin Manager v3.4.1 (Stable Core)');
}

export function teardown() {}