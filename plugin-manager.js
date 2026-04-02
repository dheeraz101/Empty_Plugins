export const meta = {
  id: 'plugin-manager',
  name: 'Plugin Manager',
  version: '3.6.2',
  compat: '>=3.3.0'
};

let root = null;
let style = null;
let escHandler = null;
let contextMenuHandler = null;
let apiRef = null;

export function setup(api) {
  apiRef = api;
  const SELF_ID = meta.id;
  const COMMUNITY_URL = 'https://raw.githubusercontent.com/dheeraz101/Empty_Plugins/refs/heads/main/plugins.json';
  const DOCS_URL = 'https://empty-ad9a3406.mintlify.app/introduction';

  let lastCheckedTime = 0;
  const CACHE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

  let updateCount = 0; // number of plugins with available updates

  // ───────── STYLE ─────────
  style = document.createElement('style');
  style.textContent = `
  .pm-root {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 820px;
    height: 600px;
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(40px) saturate(210%);
    -webkit-backdrop-filter: blur(40px) saturate(210%);
    border-radius: 28px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 30px 80px rgba(0,0,0,0.15);
    display: flex;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    color: #1d1d1f;
    z-index: 10000;
  }

  .pm-sidebar {
    width: 220px;
    background: rgba(0, 0, 0, 0.03);
    border-right: 1px solid rgba(0, 0, 0, 0.05);
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .pm-sidebar-top {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .pm-logo {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: 0.05em;
  }

  .pm-dev-link {
    display: block;
    margin-bottom: 10px;
    padding: 10px 12px;
    background: #00d4ff;
    color: white;
    text-align: center;
    border-radius: 10px;
    text-decoration: none;
    font-size: 12px;
    font-weight: bold;
  }

  .pm-tagline {
    font-size: 11px;
    color: #666;
    margin-bottom: 10px;
    font-style: italic;
    line-height: 1.4;
  }

  .pm-sidebar-footer {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .pm-action-btn {
    padding: 12px 14px;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 700;
    transition: all 0.2s ease;
    width: 100%;
    box-sizing: border-box;
  }

  .pm-action-btn#check-updates { background: rgba(0,0,0,0.06); color: #1d1d1f; }
  .pm-action-btn#check-updates:hover { background: rgba(0,0,0,0.1); }
  .pm-action-btn#install-url { background: #0071e3; color: white; }
  .pm-action-btn#install-url:hover { background: #0065d4; }
  .pm-close-btn { background: rgba(255,255,255,0.9); color: #1d1d1f; border: 1px solid rgba(0,0,0,0.08); }
  .pm-close-btn:hover { background: #ff3b30; color: white; }

  .pm-tab {
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    color: #424245;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.2s;
  }

  .pm-tab.active { background: rgba(0, 0, 0, 0.06); color: #000; font-weight: 600; }
  .pm-tab:hover:not(.active) { background: rgba(0, 0, 0, 0.03); }

  .pm-main { flex: 1; padding: 40px; overflow-y: auto; }

  .pm-view-title { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 4px; }
  .pm-view-subtitle { font-size: 15px; color: #86868b; margin-bottom: 32px; font-weight: 400; }
  .pm-list { display: flex; flex-direction: column; gap: 12px; }

  .plugin-item {
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 20px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .plugin-item:hover {
    background: rgba(255, 255, 255, 0.6);
    border-color: rgba(0, 0, 0, 0.12);
    box-shadow: 0 8px 20px rgba(0,0,0,0.04);
  }

  .plugin-icon-box {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #007aff, #00c7ff);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 18px;
    flex-shrink: 0;
    box-shadow: 0 4px 10px rgba(0, 122, 255, 0.2);
  }

  .plugin-info { flex: 1; min-width: 0; }
  .plugin-name { font-weight: 600; font-size: 16px; color: #1d1d1f; display: block; overflow: hidden; text-overflow: ellipsis; }
  .plugin-meta { font-size: 13px; color: #86868b; margin-top: 2px; }

  .plugin-badge {
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .badge-enabled { background: rgba(52, 199, 89, 0.15); color: #248a3d; }
  .badge-update { background: rgba(0, 122, 255, 0.15); color: #007aff; }

  .pm-action-group { display: flex; gap: 8px; align-items: center; }

  .pm-btn {
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .pm-btn-primary { background: #0071e3; color: white; }
  .pm-btn-primary:hover { background: #0077ed; }
  .pm-btn-secondary { background: rgba(0,0,0,0.05); color: #1d1d1f; }
  .pm-btn-secondary:hover { background: rgba(0,0,0,0.1); }

  #close-pm:hover { background: #ff3b30 !important; color: white !important; }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .spinning svg { animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1); }

  .sidebar-footer-text {
    font-size: 11px;
    color: #86868b;
    line-height: 1.4;
    padding: 0 14px;
    margin-bottom: 12px;
    font-weight: 400;
  }

  .docs-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    font-size: 13px;
    color: #0071e3;
    text-decoration: none;
    font-weight: 500;
    border-radius: 10px;
    transition: background 0.2s;
  }
  .docs-link:hover { background: rgba(0, 113, 227, 0.05); }

  .pm-modal-overlay {
    position: fixed; top:0; left:0; right:0; bottom:0;
    background: rgba(0,0,0,0.2);
    backdrop-filter: blur(10px);
    z-index: 20000;
    display: flex; align-items: center; justify-content: center;
  }
  .pm-modal-content {
    background: rgba(255,255,255,0.9);
    width: 380px; padding: 24px; border-radius: 24px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    border: 1px solid rgba(0,0,0,0.05);
  }
  .pm-input {
    width: 100%; padding: 12px; border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.1); background: rgba(255,255,255,0.5);
    margin-bottom: 12px; font-size: 14px; outline: none;
    box-sizing: border-box; transition: border 0.2s;
  }
  .pm-input:focus { border-color: #0071e3; }

  @media (prefers-color-scheme: dark) {
    .pm-root { background: rgba(28, 28, 30, 0.75); border-color: rgba(255,255,255,0.1); color: #f5f5f7; }
    .pm-sidebar { background: rgba(255, 255, 255, 0.02); }
    .pm-tab { color: #a1a1a6; }
    .pm-tab.active { background: rgba(255, 255, 255, 0.1); color: #fff; }
    .plugin-item { background: rgba(255, 255, 255, 0.05); border-color: rgba(255,255,255,0.1); }
    .plugin-item:hover { background: rgba(255, 255, 255, 0.08); }
    .plugin-name { color: #f5f5f7; }
    .pm-btn-secondary { background: rgba(255,255,255,0.1); color: #f5f5f7; }
    .pm-modal-content { background: rgba(44, 44, 46, 0.95); color: white; border-color: rgba(255,255,255,0.1); }
    .pm-input { background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.1); color: white; }
    .last-checked { color: #6e6e73; }
  }
`;
  document.head.appendChild(style);

  // ───────── ROOT ─────────
  root = document.createElement('div');
  root.className = 'pm-root';
  root.style.display = 'none';

  root.innerHTML = `
  <div class="pm-sidebar">
    <div class="pm-sidebar-top">
      <div class="pm-logo">PM</div>
      <a href="${DOCS_URL}" target="_blank" class="pm-dev-link">
        Developer Portal
      </a>
      <div class="pm-tagline">Curate your workspace...</div>
      <div class="pm-tabs">
        <div class="pm-tab active" data-tab="installed">Installed</div>
        <div class="pm-tab" data-tab="community">Community</div>
      </div>
    </div>

    <div class="pm-sidebar-footer">
      <button class="pm-action-btn" id="check-updates">Check for Updates</button>
      <button class="pm-action-btn" id="install-url">Install via URL</button>
      <button id="close-pm" class="pm-action-btn pm-close-btn">Close</button>
    </div>
  </div>
  <div class="pm-main">
    <div id="installed"></div>
    <div id="community" style="display:none"></div>
  </div>
`;

  api.boardEl.appendChild(root);
  api.makeDraggable(root);
  api.makeResizable(root);

  const slots = { 'header-actions': root.querySelector('.pm-sidebar-footer') };
  const slotRegistry = new Map();

  api.registerUI = (slot, el, id) => {
    const pluginId = api.getPluginId();
    if (!pluginId || !slots[slot]) return;

    if (id) el.dataset.uiId = id;
    el.dataset.owner = pluginId;

    slots[slot].appendChild(el);

    if (!slotRegistry.has(pluginId)) slotRegistry.set(pluginId, []);
    slotRegistry.get(pluginId).push(el);
  };

  function cleanupPluginUI(pluginId) {
    const items = slotRegistry.get(pluginId);
    if (!items) return;
    items.forEach(el => el.remove());
    slotRegistry.delete(pluginId);
  }

  // ───────── FIX: CLOSE BUTTON ─────────
  root.querySelector('#close-pm').onclick = () => {
    root.style.display = 'none';
  };

  // ───────── FIX: ESC KEY CLOSE ─────────
  escHandler = (e) => {
    if (e.key === 'Escape' && root?.style.display === 'flex') {
      root.style.display = 'none';
    }
  };
  document.addEventListener('keydown', escHandler);

  // ───────── HEADER BUTTONS + BADGE ─────────
  const checkUpdatesBtn = root.querySelector('#check-updates');
  const installBtn = root.querySelector('#install-url');

  if (checkUpdatesBtn) {
    checkUpdatesBtn.onclick = async () => {
      checkUpdatesBtn.classList.add('spinning');
      await renderInstalled(true);
      setTimeout(() => checkUpdatesBtn.classList.remove('spinning'), 800);
    };
  }

  if (installBtn) {
    installBtn.onclick = openInstallModal;
  }

  // ───────── HELPERS ─────────
  function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 30) return "just now";
    if (seconds < 60) return "a few seconds ago";
    if (seconds < 3600) return Math.floor(seconds / 60) + " min ago";
    if (seconds < 86400) return Math.floor(seconds / 3600) + " hr ago";
    return Math.floor(seconds / 86400) + " days ago";
  }

  async function fetchRemoteMeta(url) {
    try {
      const res = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now());
      const code = await res.text();
      const metaMatch = code.match(/export const meta\s*=\s*(\{[\s\S]*?\})(?:;|$)/);
      if (!metaMatch) return null;
      return new Function(`return ${metaMatch[1]}`)();
    } catch (e) {
      return null;
    }
  }

  function compareVersions(a = '0.0.0', b = '0.0.0') {
    const pa = a.split('.').map(n => parseInt(n) || 0);
    const pb = b.split('.').map(n => parseInt(n) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) return 1;
      if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    }
    return 0;
  }

  function saveRegistryPluginVersion(pluginId, version) {
    if (!version) return;
    const registry = api.registry.getAll();
    const item = registry.find(entry => entry.id === pluginId);
    if (!item) return;
    item.version = version;
    api.registry.save([...registry]);
  }

  function updateBadge(count) {
    updateCount = count;
    const badgeContainer = document.getElementById('update-badge');
    const badgeCount = document.getElementById('badge-count');
    if (!badgeContainer || !badgeCount) return;

    if (count > 0) {
      badgeCount.textContent = count;
      badgeContainer.style.display = 'inline-flex';
    } else {
      badgeContainer.style.display = 'none';
    }
  }

  // ───────── INSTALL MODAL ─────────
  function openInstallModal() {
    const overlay = document.createElement('div');
    overlay.className = 'pm-modal-overlay';

    overlay.innerHTML = `
      <div class="pm-modal-content">
        <h3 style="margin-top:0; font-size:18px; font-weight:600; margin-bottom:16px;">Install Extension</h3>
        <input type="text" id="pm-url" class="pm-input" placeholder="https://source.com/plugin.js">
        <input type="text" id="pm-id" class="pm-input" placeholder="Unique Plugin ID">
        <div style="display:flex; gap:10px; margin-top:8px;">
          <button id="pm-cancel" class="pm-btn pm-btn-secondary" style="flex:1">Cancel</button>
          <button id="pm-confirm" class="pm-btn pm-btn-primary" style="flex:1">Install</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#pm-cancel').onclick = () => overlay.remove();
    overlay.querySelector('#pm-confirm').onclick = async () => {
      const url = overlay.querySelector('#pm-url').value.trim();
      const id = overlay.querySelector('#pm-id').value.trim();
      if (!url || !id) return api.notify('All fields required', 'error');

      try {
        const remoteMeta = await fetchRemoteMeta(url);
        const newDef = { id, url, name: remoteMeta?.name || id, enabled: true, source: 'registry', version: remoteMeta?.version };
        const registry = api.registry.getAll();
        api.registry.save([...registry, newDef]);
        await api.reloadPlugin(id);
        api.notify('Installed Successfully', 'success');
        overlay.remove();
        renderInstalled();
      } catch {
        api.notify('Installation failed', 'error');
      }
    };
  }

  // ───────── RENDER INSTALLED (with badge support) ─────────
  async function renderInstalled(forceCheck = false) {
    const now = Date.now();
    const shouldCheck = forceCheck || (now - lastCheckedTime > CACHE_TIMEOUT);

    if (shouldCheck) {
      lastCheckedTime = now;
    }

    const el = root.querySelector('#installed .pm-list');
    const plugins = api.registry.getAll();

    let html = '';
    let availableUpdates = 0;

    for (const p of plugins) {
      const isSelf = p.id === SELF_ID;
      let installedVer = p.version || null;
      let remoteVer = null;
      let remoteMeta = null;
      let updateBtn = '';
      let statusBadge = '';

      if (p.url && (shouldCheck || !installedVer)) {
        remoteMeta = await fetchRemoteMeta(p.url);
        remoteVer = remoteMeta?.version || null;
      }

      if (!installedVer && remoteVer) {
        saveRegistryPluginVersion(p.id, remoteVer);
        installedVer = remoteVer;
      }

      if (!p.icon && p.url && !remoteMeta) {
        remoteMeta = await fetchRemoteMeta(p.url);
      }

      if (installedVer && remoteVer) {
        const cmp = compareVersions(remoteVer, installedVer);
        if (cmp > 0) {
          availableUpdates++;
          updateBtn = `<button class="pm-btn pm-btn-primary" data-update="${p.id}">Update</button>`;
          statusBadge = '<span class="plugin-badge badge-update">Update Available</span>';
        }
      }

      if (isSelf) {
        statusBadge = '<span class="plugin-badge badge-enabled">System</span>';
      } else if (p.enabled) {
        statusBadge = '<span class="plugin-badge badge-enabled">Active</span>';
      }

      const versionText = installedVer ? `v${installedVer}` : 'Version unknown';
      const colors = ['#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500'];
      const iconBg = colors[p.id.length % colors.length];
      const iconContent = p.icon || remoteMeta?.icon || '📦';

      html += `
        <div class="plugin-item">
          <div class="plugin-icon-box" style="background: ${iconBg};">${iconContent}</div>
          <div class="plugin-info">
            <span class="plugin-name">${p.name || p.id}</span>
            <div class="plugin-meta">${versionText} • <span style="opacity: 0.7">${p.id}</span></div>
          </div>
          <div class="pm-action-group">
            <button class="pm-btn pm-btn-secondary reload-btn" data-act="reload" data-id="${p.id}">Reload</button>
            ${isSelf ? '' : `<button class="pm-btn ${p.enabled ? 'pm-btn-secondary' : 'pm-btn-primary'} toggle-btn" data-act="toggle" data-id="${p.id}">${p.enabled ? 'Disable' : 'Enable'}</button>`}
            ${isSelf ? '' : `<button class="pm-btn pm-btn-secondary delete-btn" data-act="delete" data-id="${p.id}" style="color:#ff3b30;">Delete</button>`}
            ${updateBtn}
          </div>
        </div>
      `;
    }

    const lastCheckedHTML = lastCheckedTime
      ? `<div class="last-checked">Last checked: ${timeAgo(lastCheckedTime)}</div>`
      : '';

    el.innerHTML = html + lastCheckedHTML;
    updateBadge(availableUpdates);
  }

  // ───────── RENDER COMMUNITY (unchanged) ─────────
  let communityCache = [];
  async function renderCommunity() {
    const el = root.querySelector('#community .pm-list');

    if (!communityCache.length) {
      try {
        communityCache = await fetch(COMMUNITY_URL + '?t=' + Date.now()).then(r => r.json());
      } catch {
        communityCache = [];
      }
    }

    const registry = api.registry.getAll();
    const installed = new Set(registry.map(p => p.id));
    const installedVersions = registry.reduce((acc, item) => {
      if (item.version) acc[item.id] = item.version;
      return acc;
    }, {});

    el.innerHTML = communityCache.map(p => {
      const displayVersion = p.version || installedVersions[p.id];
      const colors = ['#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500'];
      const iconBg = colors[p.id.length % colors.length];
      const isInstalled = installed.has(p.id);

      return `
      <div class="plugin-item">
        <div class="plugin-icon-box" style="background: ${iconBg};">${p.icon || '📦'}</div>
        <div class="plugin-info">
          <span class="plugin-name">${p.name}</span>
          <div class="plugin-meta">${displayVersion ? `v${displayVersion} • ` : ''}${p.author || 'Unknown'}</div>
          <div class="plugin-meta" style="margin-top: 10px; color: #8e8e93;">${p.description || ''}</div>
        </div>
        <div class="pm-action-group" style="min-width: 110px;">
          ${
            isInstalled
              ? `<button class="pm-btn pm-btn-secondary" disabled style="width:100%;opacity:0.5">Installed</button>`
              : `<button class="pm-btn pm-btn-primary" style="width:100%" data-install="${p.id}" data-url="${p.url}">Install Plugin</button>`
          }
        </div>
      </div>
    `;
    }).join('');
  }

  // ───────── CLICK HANDLER ─────────
  root.onclick = async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const id = btn.dataset.id;

    if (btn.dataset.act === 'toggle') {
      await api.togglePlugin(id);
      cleanupPluginUI(id);
    }

    if (btn.dataset.act === 'delete') {
      await api.deletePlugin(id);
      cleanupPluginUI(id);
    }

    if (btn.dataset.act === 'reload') {
      try {
        await api.reloadPlugin(id);
        api.notify(`Reloaded ${id}`, 'success');
        cleanupPluginUI(id);
      } catch {
        api.notify('Reload failed', 'error');
      }
    }

    if (btn.dataset.install) {
      const newDef = {
        id: btn.dataset.install,
        url: btn.dataset.url,
        name: btn.dataset.install,
        enabled: true,
        source: 'registry'
      };

      const registry = api.registry.getAll();
      api.registry.save([...registry, newDef]);

      try {
        cleanupPluginUI(newDef.id);
        await api.reloadPlugin(newDef.id);
      } catch {
        api.notify('Install failed', 'error');
      }
    }

    if (btn.dataset.update) {
      const updateId = btn.dataset.update;
      const registry = api.registry.getAll();
      const entry = registry.find(p => p.id === updateId);
      let remoteVersion = null;

      if (entry?.url) {
        const remoteMeta = await fetchRemoteMeta(entry.url);
        remoteVersion = remoteMeta?.version || null;
      }

      try {
        api.notify(`Updating ${updateId}...`, 'info');
        await api.reloadPlugin(updateId);
        if (remoteVersion) saveRegistryPluginVersion(updateId, remoteVersion);
        api.notify(`${updateId} updated successfully!`, 'success');
        if (updateId === SELF_ID) {
          setTimeout(() => window.location.reload(), 200);
        }
      } catch {
        api.notify('Update failed', 'error');
      }
    }

    renderInstalled();
    renderCommunity();
  };

  root.querySelectorAll('.pm-tab').forEach(tab => {
    tab.onclick = () => {
      root.querySelectorAll('.pm-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      root.querySelector('#installed').style.display = 'none';
      root.querySelector('#community').style.display = 'none';

      root.querySelector('#' + tab.dataset.tab).style.display = 'block';

      if (tab.dataset.tab === 'installed') renderInstalled();
      if (tab.dataset.tab === 'community') renderCommunity();
    };
  });

  contextMenuHandler = (e) => {
    if (e.target.closest('.pm-root')) return;
    e.preventDefault();
    root.style.display = 'flex';
    renderInstalled();
  };
  api.boardEl.addEventListener('contextmenu', contextMenuHandler);

  console.log('🔥 Plugin Manager v3.5.6 – Update badge + auto-check loaded');
}

export function teardown() {
  if (root) {
    root.remove();
    root = null;
  }

  if (style) {
    style.remove();
    style = null;
  }

  if (escHandler) {
    document.removeEventListener('keydown', escHandler);
    escHandler = null;
  }

  if (contextMenuHandler && apiRef?.boardEl) {
    apiRef.boardEl.removeEventListener('contextmenu', contextMenuHandler);
    contextMenuHandler = null;
  }

  apiRef = null;
}
