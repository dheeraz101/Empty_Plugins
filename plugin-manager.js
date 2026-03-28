export const meta = {
  id: 'plugin-manager',
  name: 'Plugin Manager',
  version: '3.3.0',
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
      min-width: 500px;
      min-height: 400px;
      max-width: 95vw;
      max-height: 90vh;
      display: none;
      z-index: 10000;

      background: #1c1c1f;
      border-radius: 16px;
      color: #fff;
      font-family: system-ui;
      border: 1px solid rgba(255,255,255,0.08);

      display:flex;
      flex-direction:column;
    }

    .pm-header {
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:14px 18px;
      border-bottom:1px solid rgba(255,255,255,0.08);
    }

    .pm-right {
      display:flex;
      align-items:center;
      gap:8px;
    }

    #pm-actions {
      display:flex;
      gap:6px;
    }

    .pm-tabs {
      display:flex;
      border-bottom:1px solid rgba(255,255,255,0.05);
    }

    .pm-tab {
      flex:1;
      padding:12px;
      background:none;
      border:none;
      color:#888;
      cursor:pointer;
    }

    .pm-tab.active {
      color:#fff;
      border-bottom:2px solid #7c6fff;
    }

    .pm-body {
      flex:1;
      overflow:hidden;
    }

    .pm-panel {
      height:100%;
      overflow:auto;
      padding:16px;
    }

    .pm-card {
      background:#2a2a2e;
      padding:14px;
      border-radius:12px;
      margin-bottom:12px;
    }

    .pm-btn {
      margin-top:8px;
      padding:6px 10px;
      border:none;
      border-radius:8px;
      cursor:pointer;
    }

    .primary { background:#7c6fff; color:#fff; }
    .danger { background:#3a1a1a; color:#ff6666; }
    .secondary { background:#333; color:#ddd; }
  `;
  document.head.appendChild(style);

  // ───────── ROOT ─────────
  const root = document.createElement('div');
  root.className = 'pm-root';

  root.innerHTML = `
    <div class="pm-header">
      <div>
        <b>⚙️ Plugin Manager</b>
        <div id="pm-stats" style="font-size:12px;color:#888"></div>
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

  // ───────── SLOT SYSTEM (CONTROLLED) ─────────
  const slots = {
    'header-actions': root.querySelector('#pm-actions')
  };

  const slotRegistry = new Map(); // pluginId → elements[]

  api.registerUI = (slot, el, id, pluginId = 'unknown') => {
    if (!slots[slot]) return;

    // prevent duplicates
    if (id && slots[slot].querySelector(`[data-ui-id="${id}"]`)) return;

    if (id) el.dataset.uiId = id;
    el.dataset.owner = pluginId;

    slots[slot].appendChild(el);

    // track ownership
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
    const el = root.querySelector('#installed');
    const plugins = api.registry.getAll();

    el.innerHTML = plugins.map(p => `
      <div class="pm-card">
        <b>${p.name || p.id}</b>
        <div style="font-size:12px;color:#888">${p.id}</div>
        <div style="color:${p.enabled ? '#4caf50' : '#ff6666'}">
          ${p.enabled ? 'Active' : 'Paused'}
        </div>

        ${p.id !== SELF_ID ? `
          <button class="pm-btn secondary" data-act="toggle" data-id="${p.id}">
            ${p.enabled ? 'Pause' : 'Resume'}
          </button>
          <button class="pm-btn danger" data-act="delete" data-id="${p.id}">
            Delete
          </button>
        ` : `<div style="color:#ffaa00">Protected</div>`}
      </div>
    `).join('');

    root.querySelector('#pm-stats').textContent =
      `${plugins.length} plugins`;
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
    const el = root.querySelector('#community');
    const list = await loadCommunity();
    const installed = new Set(api.registry.getAll().map(p => p.id));

    el.innerHTML = list.map(p => `
      <div class="pm-card">
        <div>${p.icon || '📦'}</div>
        <b>${p.name}</b>
        <div style="font-size:12px;color:#888">${p.author || 'Unknown'}</div>
        <div style="font-size:13px">${p.description || ''}</div>

        ${
          installed.has(p.id)
            ? `<button class="pm-btn secondary" disabled>Installed</button>`
            : `<button class="pm-btn primary"
                data-install="${p.id}"
                data-url="${p.url}">
                Install
              </button>`
        }
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
      api.bus.emit('plugin:toggled', { id });
      renderInstalled();
      renderCommunity();
    }

    if (btn.dataset.act === 'delete') {
      cleanupPluginUI(id); // 🔥 FORCE UI CLEANUP
      await api.deletePlugin(id);
      api.storage.remove(`plugin:${id}`);
      api.bus.emit('plugin:deleted', { id });
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

  // ───────── AUTO REFRESH ─────────
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

  // 🔥 FIX EMPTY LOAD BUG
  requestAnimationFrame(() => {
    renderInstalled();
  });

  console.log('🔥 Plugin Manager v3.3 (Controlled System)');
}

export function teardown() {}