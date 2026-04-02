export const meta = {
  id: 'plugin-manager',
  name: 'Plugin Manager',
  version: '3.5.8',
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
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(40px) saturate(200%);
    -webkit-backdrop-filter: blur(40px) saturate(200%);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 40px 100px rgba(0,0,0,0.2);
    display: flex;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    color: #1d1d1f;
    z-index: 10000;
  }

  /* Left Sidebar Navigation */
  .pm-sidebar {
    width: 220px;
    background: rgba(255, 255, 255, 0.3);
    border-right: 1px solid rgba(0,0,0,0.05);
    padding: 32px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .pm-tab {
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    color: #424245;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .pm-tab.active {
    background: rgba(0,0,0,0.05);
    color: #1d1d1f;
    font-weight: 600;
  }

  /* Content Area */
  .pm-content {
    flex: 1;
    padding: 40px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .pm-view-title {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
    margin-bottom: 8px;
  }

  /* Plugin Cards */
  .plugin-item {
    background: rgba(255, 255, 255, 0.5);
    border: 0.5px solid rgba(0,0,0,0.1);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 18px;
    transition: transform 0.2s ease;
  }

  .plugin-item:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.8);
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
    font-weight: bold;
    font-size: 20px;
  }

  .plugin-info { flex: 1; }
  .plugin-name { font-weight: 600; font-size: 16px; color: #1d1d1f; }
  .plugin-meta { font-size: 13px; color: #86868b; margin-top: 2px; }

  .pm-card {
    background: rgba(255, 255, 255, 0.5);
    border: 0.5px solid rgba(0,0,0,0.1);
    border-radius: 16px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 18px;
    transition: transform 0.2s ease;
  }

  .pm-card:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.8);
  }

  /* Buttons */
  .pm-btn {
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .pm-btn-primary,
  .primary {
    background: #0071e3;
    color: white;
  }

  .pm-btn-primary:hover,
  .primary:hover {
    background: #0077ed;
  }
  
  .pm-btn-secondary,
  .secondary {
    background: rgba(0,0,0,0.05);
    color: #1d1d1f;
  }

  /* Dark Mode Overrides */
  @media (prefers-color-scheme: dark) {
    .pm-root {
      background: rgba(30, 30, 32, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #f5f5f7;
    }
    .pm-sidebar { background: rgba(0,0,0,0.2); border-right: 1px solid rgba(255,255,255,0.05); }
    .pm-tab { color: #a1a1a6; }
    .pm-tab.active { background: rgba(255,255,255,0.1); color: #fff; }
    .plugin-item { background: rgba(255, 255, 255, 0.05); border-color: rgba(255,255,255,0.1); }
    .plugin-name { color: #f5f5f7; }
    .pm-btn-secondary { background: rgba(255,255,255,0.1); color: #f5f5f7; }
  }
`;
  document.head.appendChild(style);

  // ───────── ROOT ─────────
  root = document.createElement('div');
  root.className = 'pm-root';
  root.style.display = 'none';

  root.innerHTML = `
  <div class="pm-sidebar">
    <div style="padding: 0 14px 20px 14px;">
      <div style="font-size: 12px; font-weight: 700; color: #86868b; text-transform: uppercase; letter-spacing: 1px;">Library</div>
    </div>
    <div class="pm-tab active" data-tab="installed">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
      Installed
    </div>
    <div class="pm-tab" data-tab="community">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
      Community
    </div>
    <div id="pm-actions" style="padding: 14px; display: flex; flex-direction: column; gap: 10px;"></div>
    <div style="margin-top: auto; padding: 14px;">
       <button id="close-pm" class="pm-btn pm-btn-secondary" style="width: 100%">Close</button>
    </div>
  </div>

  <div class="pm-content">
    <div id="installed">
      <h1 class="pm-view-title">Installed Plugins</h1>
      <p style="color: #86868b; margin-bottom: 24px;">Manage and configure your active workspace tools.</p>
      <div class="pm-list"></div>
    </div>

    <div id="community" style="display:none;">
      <h1 class="pm-view-title">Discovery</h1>
      <p style="color: #86868b; margin-bottom: 24px;">Explore new extensions built by the community.</p>
      <div class="pm-list"></div>
    </div>
  </div>
`;

  api.boardEl.appendChild(root);
  api.makeDraggable(root);
  api.makeResizable(root);

  const slots = { 'header-actions': root.querySelector('#pm-actions') };
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
  const actions = root.querySelector('#pm-actions');

  const checkUpdatesBtn = document.createElement('button');
  checkUpdatesBtn.className = 'pm-btn secondary check-updates';
  checkUpdatesBtn.innerHTML = `
    🔄 Check Updates
    <span class="update-badge" id="update-badge" style="display:none;">
      <span class="badge" id="badge-count">0</span>
    </span>
  `;
  checkUpdatesBtn.onclick = () => renderInstalled(true);
  actions.appendChild(checkUpdatesBtn);

  const installBtn = document.createElement('button');
  installBtn.className = 'pm-btn primary';
  installBtn.textContent = 'Install via URL';
  installBtn.onclick = openInstallModal;
  actions.appendChild(installBtn);

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
    const wrap = document.createElement('div');

    wrap.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <b style="font-size:14px;">Install Plugin</b>
        <button id="pm-modal-close" style="
          background:none;
          border:none;
          font-size:18px;
          cursor:pointer;
          color:#888;
        ">✕</button>
      </div>

      <input placeholder="Plugin URL" id="pm-url" style="width:100%; margin-bottom:8px; padding:6px;" />
      <input placeholder="Plugin ID" id="pm-id" style="width:100%; margin-bottom:10px; padding:6px;" />

      <button id="pm-install" style="
        width:100%;
        padding:8px;
        background:#7c6fff;
        color:#fff;
        border:none;
        border-radius:6px;
        cursor:pointer;
      ">
        Install
      </button>
    `;

    const modal = api.showModal({ content: wrap });
    const overlay = document.querySelector('div[style*="z-index: 100001"]');
    if (overlay) overlay.style.zIndex = 2147483648;

    wrap.querySelector('#pm-modal-close').onclick = () => {
      modal.close();
    };

    wrap.querySelector('#pm-install').onclick = async () => {
      const url = wrap.querySelector('#pm-url').value.trim();
      const id = wrap.querySelector('#pm-id').value.trim();

      if (!url || !id) return api.notify('Missing fields', 'error');

      try {
        const remoteMeta = await fetchRemoteMeta(url);
        const newDef = {
          id,
          url,
          name: remoteMeta?.name || id,
          enabled: true,
          source: 'registry',
          version: remoteMeta?.version || undefined,
        };

        const registry = api.registry.getAll();
        api.registry.save([...registry, newDef]);

        cleanupPluginUI(id);
        await api.reloadPlugin(id);
        api.notify('Installed', 'success');
        modal.close();
      } catch {
        api.notify('Install failed', 'error');
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
      let versionInfo = '';
      let updateBtn = '';
      let installedVer = p.version || null;
      let remoteVer = null;
      let remoteMeta = null;

      if (p.url && (shouldCheck || !installedVer)) {
        remoteMeta = await fetchRemoteMeta(p.url);
        remoteVer = remoteMeta?.version || null;
      }

      if (!installedVer && remoteVer) {
        saveRegistryPluginVersion(p.id, remoteVer);
        installedVer = remoteVer;
      }

      if (installedVer && remoteVer) {
        const cmp = compareVersions(remoteVer, installedVer);
        if (cmp > 0) {
          availableUpdates++;
          versionInfo = `<span class="pm-version update-available">v${installedVer} → v${remoteVer}</span>`;
          updateBtn = `<button class="pm-btn pm-update-btn" data-update="${p.id}">Update</button>`;
        } else {
          versionInfo = `<span class="pm-version">v${installedVer}</span>`;
        }
      } else if (installedVer) {
        versionInfo = `<span class="pm-version">v${installedVer}</span>`;
      } else {
        versionInfo = `<span class="pm-version">Version unknown</span>`;
      }

      html += `
        <div class="pm-card">
          <div style="display:flex; gap:12px; align-items:flex-start;">
            <div style="
              font-size:22px;
              background:rgba(255,255,255,0.05);
              padding:8px;
              border-radius:8px;
              display:flex;
              align-items:center;
              justify-content:center;
            ">
              ${p.icon || '📦'}
            </div>

            <div style="flex:1">
              <b style="font-size:15px">${p.name || p.id}</b>
              ${versionInfo}
              <div style="font-size:11px;color:#7c6fff;margin-top:2px">
                ${p.author ? 'by ' + p.author : ''}
              </div>
              <div style="font-size:11px;color:#666;margin-top:2px">
                ${p.id}
              </div>
            </div>
          </div>

          <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            ${
              isSelf
                ? `<span style="color:#ffaa00;font-size:12px">System Protected</span>`
                : `
                <button class="pm-btn secondary" data-act="toggle" data-id="${p.id}">
                  ${p.enabled ? 'Pause' : 'Resume'}
                </button>
                <button class="pm-btn danger" data-act="delete" data-id="${p.id}">
                  Delete
                </button>
                ${updateBtn}
              `
            }
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
      return `
      <div class="pm-card">
        <div style="display:flex; gap:12px;">

          <div style="
            font-size:24px;
            background:rgba(255,255,255,0.05);
            padding:10px;
            border-radius:10px;
            display:flex;
            align-items:center;
            justify-content:center;
          ">
            ${p.icon || '📦'}
          </div>

          <div style="flex:1">
            <b style="font-size:15px">${p.name}</b>

            ${displayVersion ? `<div style="font-size:11px;color:#888;margin-top:2px">v${displayVersion}</div>` : ''}

            <div style="font-size:11px;color:#7c6fff;margin-top:2px">
              by ${p.author || 'Unknown'}
            </div>

            <div style="font-size:13px;color:#aaa;margin-top:6px;line-height:1.4">
              ${p.description || ''}
            </div>
          </div>

        </div>

        <div style="margin-top:12px">
          ${
            installed.has(p.id)
              ? `<button class="pm-btn secondary" disabled style="width:100%;opacity:0.5">Installed</button>`
              : `<button class="pm-btn primary" style="width:100%" data-install="${p.id}" data-url="${p.url}">Install Plugin</button>`
          }
        </div>
      </div>
    `}).join('');
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
