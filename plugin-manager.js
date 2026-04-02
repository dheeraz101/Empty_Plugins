export const meta = {
  id: 'plugin-manager',
  name: 'Plugin Manager',
  version: '3.5.5',
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
    /* YOUR ORIGINAL UI — untouched */
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
      pointer-events: auto;
      z-index: 2147483647;
      background: #161618;
      border-radius: 16px;
      color: #ececec;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      border: 1px solid rgba(255,255,255,0.1);
      display:flex;
      flex-direction:column;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      backdrop-filter: blur(10px);
      overflow: hidden;
    }

    .pm-header {
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:16px 20px;
      border-bottom:1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.02);
    }

    #pm-close {
      background: transparent;
      color: #aaa;
      font-size: 18px;
      border: none;
      cursor: pointer;
    }

    #pm-close:hover { color: #fff; }

    .pm-right { display:flex; align-items:center; gap:12px; }
    #pm-actions { display:flex; gap:8px; }

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

    .pm-tab:hover { color: #bbb; }

    .pm-tab.active {
      color:#7c6fff;
      border-bottom:2px solid #7c6fff;
    }

    .pm-body { flex:1; overflow:hidden; background: #1c1c1f; }
    .pm-panel {
      height:100%;
      overflow:auto;
      padding:20px;
      padding-bottom:40px; /* FIX: bottom breathing space */
    }

    .pm-panel::after {
      content: "";
      display: block;
      height: 30px; /* controls bottom spacing */
    }

    /* 🔥 SCROLLBAR FIX */
    .pm-panel::-webkit-scrollbar {
      width: 8px;
    }

    .pm-panel::-webkit-scrollbar-track {
      background: transparent;
    }

    .pm-panel::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.15);
      border-radius: 10px;
    }

    .pm-panel::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.25);
    }

    .pm-card {
      background: rgba(255,255,255,0.04);
      padding:16px;
      border-radius:12px;
      margin-bottom:12px;
      border: 1px solid rgba(255,255,255,0.05);
      transition: transform 0.1s;
    }

    .pm-card:hover { background: rgba(255,255,255,0.06); }

    .pm-btn {
      padding:8px 14px;
      border:none;
      border-radius:8px;
      cursor:pointer;
      font-weight: 600;
      font-size: 13px;
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
    .danger { background:#e5484d22; color:#ff6b6b; }
    .secondary { background:rgba(255,255,255,0.08); color:#ddd; }

    .bb-modal-overlay {
      z-index: 2147483648 !important;
    }

    .pm-version {
      font-size: 11px;
      color: #888;
      margin-left: 6px;
    }

    .update-available {
      color: #ffaa00 !important;
      font-weight: 600;
    }

    .pm-update-btn {
      background: #ffaa00;
      color: #000;
      font-size: 12px;
      padding: 6px 12px;
      margin-left: 8px;
    }

    .pm-update-btn:hover { background: #ffc107; }

    .last-checked {
      font-size: 11px;
      color: #666;
      margin-top: 6px;
      text-align: center;
    }

    .update-badge {
      position: absolute;
      top: 50%;
      right: 12px;
      transform: translateY(-50%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
    }

    .update-badge .badge {
      background: #ff3b30;
      color: white;
      font-size: 10px;
      font-weight: 700;
      min-width: 18px;
      height: 18px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      box-shadow: 0 0 0 2px #161618;
    }

    .check-updates {
      position: relative;
      padding-right: 40px;
    }
  `;
  document.head.appendChild(style);

  // ───────── ROOT ─────────
  root = document.createElement('div');
  root.className = 'pm-root';
  root.style.display = 'none';

  root.innerHTML = `
    <div class="pm-header">
      <div>
        <div style="display:flex; align-items:center; gap:10px;">
            <b style="font-size:16px;">⚙️ Plugin Manager</b>
            <a href="https://empty-ad9a3406.mintlify.app/" target="_blank" class="docs-link">
               <span>Docs</span> ↗
            </a>
        </div>
        <div id="pm-stats" style="font-size:11px; color:#666; margin-top:2px;"></div>
      </div>

      <div class="pm-right">
        <div id="pm-actions"></div>
        <button id="pm-close">✕</button>
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
  root.querySelector('#pm-close').onclick = () => {
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
      const metaMatch = code.match(/export const meta\s*=\s*(\{[\s\S]*?\})/);
      if (!metaMatch) return null;

      let metaStr = metaMatch[1]
        .replace(/\/\/.*$/gm, '')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*\]/g, ']');

      try {
        return JSON.parse(metaStr);
      } catch {
        return new Function(`return (${metaStr})`)();
      }
    } catch (e) {
      console.warn('Meta fetch failed:', e);
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

    const el = root.querySelector('#installed');
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
    const el = root.querySelector('#community');

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
    `).join('');
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

  console.log('🔥 Plugin Manager v3.5.5 – Update badge + auto-check loaded');
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
