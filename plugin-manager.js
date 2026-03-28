export const meta = {
  id: 'plugin-manager',
  name: 'Plugin Manager',
  version: '3.5.0',
  compat: '>=3.3.0'
};

export function setup(api) {
  const SELF_ID = meta.id;
  const COMMUNITY_URL = 'https://raw.githubusercontent.com/dheeraz101/Empty_Plugins/refs/heads/main/plugins.json';
  const DOCS_URL = 'https://empty-ad9a3406.mintlify.app/';
  
  // Track UI elements registered by other plugins for cleanup
  const slotRegistry = new Map();

  // ───────── STYLES ─────────
  api.injectCSS?.(SELF_ID, `
    .pm-root {
      position: fixed;
      top: 80px;
      left: 240px;
      width: 600px;
      height: 650px;
      background: #1c1c1f;
      border-radius: 16px;
      color: #fff;
      font-family: system-ui, -apple-system, sans-serif;
      border: 1px solid rgba(255,255,255,0.1);
      display: none;
      flex-direction: column;
      z-index: 10000;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      overflow: hidden;
    }
    .pm-header { padding: 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); background: #232326; }
    .pm-tabs { display: flex; background: #111114; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .pm-tab { flex: 1; padding: 14px; border: none; background: none; color: #888; cursor: pointer; font-weight: 600; border-bottom: 2px solid transparent; transition: 0.2s; }
    .pm-tab.active { color: #7c6fff; border-bottom-color: #7c6fff; background: rgba(124, 111, 255, 0.05); }
    .pm-body { flex: 1; overflow-y: auto; padding: 16px; background: #1c1c1f; }
    .pm-card { background: #262629; padding: 16px; border-radius: 12px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.05); transition: transform 0.1s; }
    .pm-card:hover { border-color: rgba(124, 111, 255, 0.3); }
    .pm-footer { padding: 12px; background: #111114; border-top: 1px solid rgba(255,255,255,0.05); text-align: center; }
    .pm-btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
    .pm-btn:hover { filter: brightness(1.2); transform: translateY(-1px); }
    .pm-btn.primary { background: #7c6fff; color: white; }
    .pm-btn.danger { background: rgba(255, 102, 102, 0.1); color: #ff6666; border: 1px solid rgba(255, 102, 102, 0.2); }
    .pm-btn.secondary { background: #333336; color: #ddd; }
    .pm-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; text-transform: uppercase; }
    .docs-link { color: #7c6fff; text-decoration: none; font-size: 12px; font-weight: 500; }
    .docs-link:hover { text-decoration: underline; }
  `);

  // ───────── UI STRUCTURE ─────────
  const root = document.createElement('div');
  root.className = 'pm-root';
  root.innerHTML = `
    <div class="pm-header">
      <div>
        <div style="font-weight:700; font-size: 18px; letter-spacing: -0.5px;">Plugin Manager</div>
        <div id="pm-stats" style="font-size:11px; color: #666; margin-top: 2px;">Checking plugins...</div>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        <div id="pm-slot-header" style="display:flex; gap:6px;"></div>
        <button id="pm-close" class="pm-btn secondary" style="padding: 6px 10px;">✕</button>
      </div>
    </div>
    <div class="pm-tabs">
      <button class="pm-tab active" data-tab="installed">Installed</button>
      <button class="pm-tab" data-tab="community">Community</button>
    </div>
    <div class="pm-body">
      <div id="pm-list-installed"></div>
      <div id="pm-list-community" style="display:none"></div>
    </div>
    <div class="pm-footer">
      <a href="${DOCS_URL}" target="_blank" class="docs-link">📖 Developer Documentation & API Guide</a>
    </div>
  `;

  document.body.appendChild(root);
  api.makeDraggable(root);

  // ───────── SLOT SYSTEM ─────────
  api.registerUI = (slotName, element, uiId) => {
    const target = (slotName === 'header-actions') ? root.querySelector('#pm-slot-header') : null;
    if (!target) return;
    if (uiId && target.querySelector(`[data-ui-id="${uiId}"]`)) return;
    
    const ownerId = api.getPluginId?.() || 'unknown';
    element.dataset.uiId = uiId || 'anon';
    element.dataset.owner = ownerId;
    target.appendChild(element);

    if (!slotRegistry.has(ownerId)) slotRegistry.set(ownerId, []);
    slotRegistry.get(ownerId).push(element);
  };

  const cleanupPluginUI = (pluginId) => {
    const items = slotRegistry.get(pluginId);
    if (items) {
      items.forEach(el => el.remove());
      slotRegistry.delete(pluginId);
    }
  };

  // ───────── RENDERERS ─────────
  const renderInstalled = () => {
    const container = root.querySelector('#pm-list-installed');
    const plugins = api.registry.getAll();
    
    container.innerHTML = plugins.map(p => `
      <div class="pm-card">
        <div style="display:flex; justify-content:space-between; align-items:start;">
          <div>
            <div style="font-weight:700; font-size: 15px;">${p.name || p.id}</div>
            <div style="font-size:11px; color:#666; font-family: monospace;">ID: ${p.id}</div>
          </div>
          <span class="pm-badge" style="background:${p.enabled ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 102, 102, 0.1)'}; color:${p.enabled ? '#4caf50' : '#ff6666'}">
            ${p.enabled ? 'Enabled' : 'Paused'}
          </span>
        </div>
        <div style="margin-top:14px; display:flex; gap:8px;">
          ${p.id !== SELF_ID ? `
            <button class="pm-btn ${p.enabled ? 'secondary' : 'primary'}" data-act="toggle" data-id="${p.id}">
              ${p.enabled ? 'Pause' : 'Resume'}
            </button>
            <button class="pm-btn danger" data-act="delete" data-id="${p.id}">Delete</button>
          ` : `<span style="font-size:11px; color:#7c6fff; font-weight:600;">System Plugin</span>`}
        </div>
      </div>
    `).join('');
    
    root.querySelector('#pm-stats').textContent = `${plugins.length} plugins discovered`;
  };

  const renderCommunity = async () => {
    const container = root.querySelector('#pm-list-community');
    container.innerHTML = `<div style="text-align:center; padding:40px; color:#666;">Loading from GitHub...</div>`;
    
    try {
      const res = await fetch(COMMUNITY_URL);
      const data = await res.json();
      const installed = api.registry.getAll().map(p => p.id);

      container.innerHTML = data.plugins.map(p => {
        const isInstalled = installed.includes(p.id);
        return `
          <div class="pm-card">
            <div style="font-weight:700; font-size: 15px;">${p.name}</div>
            <div style="font-size:12px; color:#aaa; margin: 4px 0 12px 0;">${p.description || 'No description provided.'}</div>
            <button class="pm-btn primary" 
              data-act="install" 
              data-url="${p.url}" 
              data-id="${p.id}" 
              ${isInstalled ? 'disabled' : ''}>
              ${isInstalled ? '✓ Installed' : 'Install Plugin'}
            </button>
          </div>
        `;
      }).join('');
    } catch (err) {
      container.innerHTML = `<div style="color:#ff6666; text-align:center; padding:20px;">Failed to load community store.</div>`;
    }
  };

  // ───────── INTERACTION ─────────
  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    const tab = e.target.closest('.pm-tab');
    
    if (btn?.id === 'pm-close') { root.style.display = 'none'; return; }

    if (tab) {
      root.querySelectorAll('.pm-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isComm = tab.dataset.tab === 'community';
      root.querySelector('#pm-list-installed').style.display = isComm ? 'none' : 'block';
      root.querySelector('#pm-list-community').style.display = isComm ? 'block' : 'none';
      if (isComm) renderCommunity();
      return;
    }

    if (!btn?.dataset.act) return;
    const { act, id, url } = btn.dataset;

    if (act === 'toggle') {
      await api.togglePlugin(id);
      cleanupPluginUI(id); 
      renderInstalled();
    }

    if (act === 'delete') {
      if (confirm(`Are you sure you want to remove ${id}?`)) {
        await api.deletePlugin(id);
        cleanupPluginUI(id);
        api.storage.remove(`plugin:${id}`);
        renderInstalled();
      }
    }

    if (act === 'install') {
      btn.textContent = 'Installing...';
      btn.disabled = true;
      await api.installPlugin(id, url);
      renderCommunity();
    }
  });

  // ───────── SYSTEM EVENTS ─────────
  api.bus.on('plugin:loaded', renderInstalled);
  api.bus.on('plugin:unloaded', renderInstalled);

  // Global toggle for right-click or button access
  window.togglePluginManager = () => {
    const isHidden = root.style.display === 'none' || !root.style.display;
    root.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) renderInstalled();
  };

  renderInstalled();
}

export function teardown() {
  document.querySelector('.pm-root')?.remove();
}