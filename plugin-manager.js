export const meta = {
  id: 'plugin-manager',
  name: 'Plugin Manager',
  version: '3.8.6',
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
  :root {
    --pm-bg: rgba(255,255,255,0.96); 
    --pm-card: rgba(255,255,255,0.82); 
  }

  .pm-root {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 820px;
    height: 600px;
    background: var(--pm-bg);
    backdrop-filter: blur(30px) saturate(180%);
    -webkit-backdrop-filter: blur(30px) saturate(180%);
    border: 1px solid rgba(0, 0, 0, 0.12);
    box-shadow: 
      0 20px 60px rgba(0,0,0,0.12),
      0 2px 8px rgba(0,0,0,0.06);
    border-radius: 28px;
    display: flex;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    color: #1d1d1f;
    z-index: 10000;
    isolation: isolate;
  }

  .pm-sidebar {
    width: 210px;
    background: var(--pm-card);
    border-right: 1px solid rgba(0, 0, 0, 0.1);
    padding: 32px 12px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
  }

  .pm-sidebar-footer {
    margin-top: auto;
    padding-bottom: 60px;
    padding-top: 0px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

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

.pm-content {
    flex: 1;
    padding: 0 28px; 
    overflow-y: auto;
    padding-right: 12px; 
  }

  .pm-view-title { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 4px; }
  .pm-view-subtitle { font-size: 15px; color: #6e6e73; margin-bottom: 32px; font-weight: 400; }
  .pm-list { display: flex; flex-direction: column; gap: 12px; }

  .plugin-item {
    background: var(--pm-card);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 20px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .plugin-item:hover {
    background: color-mix(in srgb, var(--pm-card) 85%, white);
    border-color: rgba(0, 0, 0, 0.15);
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
  .plugin-meta { font-size: 13px; color: #8e8e93; margin-top: 2px; }

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

  .pm-content::-webkit-scrollbar {
      width: 12px; 
  }

  .pm-content::-webkit-scrollbar-track {
      background: transparent;
      border-top: 16px solid transparent;
      border-bottom: 16px solid transparent;
  }

  .pm-content::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.15); 
      border-radius: 20px;
      border: 3px solid transparent;
      background-clip: content-box;
  }

  .pm-content::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.3);
  }

  /* Firefox support */
  .pm-content {
    scrollbar-width: thin;
    scrollbar-color: rgba(0,0,0,0.2) transparent;
  }

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
  .pm-btn-secondary {
    background: color-mix(in srgb, var(--pm-card) 70%, black);
    border: 1px solid rgba(0,0,0,0.08);
  }
  .pm-btn-secondary:hover {
    background: color-mix(in srgb, var(--pm-card) 80%, black);
  }

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
    z-index: 2147483647;
    display: flex; align-items: center; justify-content: center;
  }
  .pm-modal-content {
    background: rgba(255,255,255,0.97);
    width: 380px; padding: 24px; border-radius: 24px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    border: 1px solid rgba(0,0,0,0.08);
  }
  .pm-input {
    width: 100%; padding: 12px; border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.1); background: rgba(255,255,255,0.5);
    margin-bottom: 12px; font-size: 14px; outline: none;
    box-sizing: border-box; transition: border 0.2s;
  }
  .last-checked {
    font-size: 11px;
    color: #86868b;
    margin-top: 2px;
    text-align: right;
    opacity: 0.8;
  }
  .pm-input:focus { border-color: #0071e3; }

  .pm-modal-title {
    margin: 0 0 18px 0;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.2px;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    color: #1d1d1f;
    line-height: 1.2;
  }

  .pm-modal-title::after {
    content: "";
    display: block;
    margin-top: 12px;
    height: 1px;
    width: 100%;
    background: rgba(0,0,0,0.08);
  }

  @media (prefers-color-scheme: dark) {
    :root {
    --pm-bg: rgba(28,28,30,0.75);
    --pm-card: rgba(255,255,255,0.05);
    }
    .pm-root { background: var(--pm-bg); border-color: rgba(255,255,255,0.1); color: #f5f5f7; }
    .pm-sidebar { background: var(--pm-card); }
    .pm-tab { color: #a1a1a6; }
    .pm-tab.active { background: rgba(255, 255, 255, 0.1); color: #fff; }
    .plugin-item { background: var(--pm-card); border-color: rgba(255,255,255,0.1); }
    .plugin-item:hover { background: rgba(255, 255, 255, 0.08); }
    .plugin-name { color: #f5f5f7; }
    .pm-btn-secondary { background: rgba(255,255,255,0.1); color: #f5f5f7; }
    .pm-modal-content { background: rgba(44, 44, 46, 0.95); color: white; border-color: rgba(255,255,255,0.1); }
    .pm-input { background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.1); color: white; }
    .last-checked { color: #6e6e73; }
    .pm-modal-title {
      color: #f5f5f7;
    }
    .pm-modal-title::after {
      background: rgba(255,255,255,0.08);
    }
      .pm-content::-webkit-scrollbar-thumb {
        background-color: rgba(255, 255, 255, 0.2);
      }
      .pm-content::-webkit-scrollbar-thumb:hover {
        background-color: rgba(255, 255, 255, 0.35);
      }

    .pm-content {
      scrollbar-color: rgba(255,255,255,0.3) transparent;
    }
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
    <div class="pm-sidebar-footer">
      <a href="${DOCS_URL}" target="_blank" class="docs-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
        Developer Portal
      </a>
       <p class="sidebar-footer-text">Add, manage, and control your tools in one place. Plugins extend and reshape your workspace.</p>
       <div style="padding: 0 12px 14px 12px;">
         <button id="close-pm" class="pm-btn pm-btn-secondary" style="width: 100%">Close</button>
       </div>
    </div>
  </div>

  <div class="pm-content">
    <div id="installed">
      <h1 class="pm-view-title">Installed Plugins</h1>
      <p class="pm-view-subtitle">Manage and configure your active workspace tools.</p>
      <div class="pm-list"></div>
    </div>
    <div id="community" style="display:none;">
      <h1 class="pm-view-title">Discovery</h1>
      <p class="pm-view-subtitle">Explore new extensions built by the community.</p>
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
  checkUpdatesBtn.className = 'pm-btn pm-btn-secondary check-updates';
  checkUpdatesBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
    Check Updates
  `;
  checkUpdatesBtn.onclick = async () => {
    checkUpdatesBtn.classList.add('spinning');
    await renderInstalled(true);
    setTimeout(() => checkUpdatesBtn.classList.remove('spinning'), 800);
  };
  actions.appendChild(checkUpdatesBtn);

  const installBtn = document.createElement('button');
  installBtn.className = 'pm-btn pm-btn-primary';
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

  function getCommunityIcon(id) {
    if (!communityCache || !communityCache.length) return null;
    const c = communityCache.find(p => p.id === id);
    return c?.icon || null;
  }

  async function ensureCommunityCache() {
    if (communityCache && communityCache.length) return;
    try {
      communityCache = await fetch(COMMUNITY_URL + '?t=' + Date.now()).then(r => r.json());
    } catch {
      communityCache = [];
    }
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

  function saveRemoteVersion(pluginId, version) {
    if (!version) return;
    const registry = api.registry.getAll();
    const item = registry.find(entry => entry.id === pluginId);
    if (!item) return;

    item.remoteVersion = version; // ✅ NEW FIELD
    api.registry.save([...registry]);
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
    // Ensure the modal always stacks above the plugin manager (and any app chrome).
    overlay.style.zIndex = '2147483647';

    overlay.innerHTML = `
      <div class="pm-modal-content">
        <h3 class="pm-modal-title">Install Extension</h3>
        <input type="text" id="pm-url" class="pm-input" placeholder="https://source.com/plugin.js">
        <input type="text" id="pm-id" class="pm-input" placeholder="Unique Plugin ID">
        <div style="display:flex; gap:10px; margin-top:8px;">
          <button id="pm-cancel" class="pm-btn pm-btn-secondary" style="flex:1">Cancel</button>
          <button id="pm-confirm" class="pm-btn pm-btn-primary" style="flex:1">Install</button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(overlay);

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

// ───────── RENDER INSTALLED (With Persistence Fix) ─────────
  async function renderInstalled(forceCheck = false) {
    if (!root || !document.body.contains(root)) return;
    await ensureCommunityCache();

    const now = Date.now();
    const shouldCheck = forceCheck || (now - lastCheckedTime > CACHE_TIMEOUT);

    if (shouldCheck) {
      lastCheckedTime = now;
    }

    const el = root.querySelector('#installed .pm-list') || root.querySelector('#installed');
    if (!el) return;

    const plugins = api.registry.getAll();

    let html = '';
    let availableUpdates = 0;

    for (const p of plugins) {
      const isSelf = p.id === SELF_ID;

      let remoteMeta = null;
      let installedVer = p.version || null;
      let remoteVer = p.remoteVersion || null; // use cached first

      // fetch latest
      if (p.url && shouldCheck) {
        remoteMeta = await fetchRemoteMeta(p.url);
        if (remoteMeta?.version) {
          remoteVer = remoteMeta.version;
          saveRemoteVersion(p.id, remoteVer);
        }
      }

      // 2. Resolve Name & Version
      const displayName = remoteMeta?.name || p.name || p.id;

      if (!installedVer && remoteVer) {
        saveRegistryPluginVersion(p.id, remoteVer);
        installedVer = remoteVer;
      }

      let hasUpdate = false;
      let updateBadge = '';
      let updateBtn = '';

      if (installedVer && remoteVer) {
        const cmp = compareVersions(remoteVer, installedVer);
        if (cmp > 0) {
          hasUpdate = true;
          availableUpdates++;
          updateBtn = `<button class="pm-btn pm-btn-primary" data-update="${p.id}">Update</button>`;
        }
      }
      
      if (hasUpdate) {
        updateBadge = '<span class="plugin-badge badge-update" style="margin-left:6px;">Update Available</span>';
      }

      // 3. Badges
      let typeBadge = '';
      if (isSelf) {
        typeBadge = '<span class="plugin-badge badge-enabled">System</span>';
      } else if (p.enabled) {
        typeBadge = '<span class="plugin-badge badge-enabled">Active</span>';
      } else {
        typeBadge = '<span class="plugin-badge" style="background:rgba(142,142,147,0.15);color:#8e8e93;">Inactive</span>';
      }

    const statusBadges = `<div style="margin-top:4px; display:flex; align-items:center;">${typeBadge}${updateBadge}</div>`;

      // 4. Icon
      const versionText = installedVer ? `v${installedVer}` : 'Version unknown';
      const colors = ['#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500'];
      const iconBg = colors[p.id.length % colors.length];
      const iconContent = p.icon || remoteMeta?.icon || getCommunityIcon(p.id) || '📦';
      const iconHtml = (typeof iconContent === 'string' && (iconContent.startsWith('http://') || iconContent.startsWith('https://')))
        ? `<img src="${iconContent}" alt="${displayName}" style="width:100%;height:100%;border-radius:10px;object-fit:cover;" />`
        : iconContent;

      // 5. Persistence fix (name + icon)
      if ((remoteMeta?.name && p.name !== remoteMeta.name) || (!p.icon && iconContent && iconContent !== '📦')) {
        const reg = api.registry.getAll();
        const entry = reg.find(item => item.id === p.id);
        if (entry) {
          if (remoteMeta?.name) entry.name = remoteMeta.name;
          if (iconContent && iconContent !== '📦') entry.icon = iconContent;
          api.registry.save([...reg]);
          p.name = entry.name;
          p.icon = entry.icon;
        }
      }

      const reloadDisabled = !p.enabled && !isSelf;
      const reloadBtnHTML = isSelf
        ? '' 
        : `
          <button class="pm-btn pm-btn-secondary reload-btn" 
                  data-act="reload" 
                  data-id="${p.id}"
                  ${reloadDisabled ? 'disabled style="opacity:0.5; cursor:not-allowed;" title="Enable the plugin first to reload"' : ''}>
            Reload
          </button>
        `;

      html += `
        <div class="plugin-item">
          <div class="plugin-icon-box" style="background: ${iconBg};">${iconHtml}</div>
          <div class="plugin-info">
            <span class="plugin-name">${displayName}</span>
            <div class="plugin-meta">${versionText} • <span style="opacity: 0.7">${p.id}</span></div>
            ${statusBadges}
          </div>
          <div class="pm-action-group">
            ${reloadBtnHTML}
            ${isSelf ? '' : `<button class="pm-btn ${p.enabled ? 'pm-btn-secondary' : 'pm-btn-primary'} toggle-btn" data-act="toggle" data-id="${p.id}">${p.enabled ? 'Disable' : 'Enable'}</button>`}
            ${isSelf ? '' : `<button class="pm-btn pm-btn-secondary delete-btn" data-act="delete" data-id="${p.id}" style="color:#ff3b30;">Delete</button>`}
            ${updateBtn}
          </div>
        </div>
      `;
    }

    const lastCheckedHTML = lastCheckedTime
      ? `<div class="last-checked">Last update checked: ${timeAgo(lastCheckedTime)}</div>`
      : '';

    el.innerHTML = html + lastCheckedHTML;
    updateBadge(availableUpdates);
  }

  // ───────── RENDER COMMUNITY (unchanged) ─────────
  let communityCache = [];
  async function renderCommunity() {
    if (!root || !document.body.contains(root)) return;
    const el = root.querySelector('#community .pm-list') || root.querySelector('#community');
    if (!el) return;

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
              : `<button class="pm-btn pm-btn-primary" style="width:100%" data-install="${p.id}" data-url="${p.url}" data-icon="${p.icon || ''}">Install Plugin</button>`
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
        if (id === SELF_ID) {
          api.notify('Plugin Manager cannot reload itself', 'warning');
          return;
        }
      const plugin = api.registry.getAll().find(p => p.id === id);
      if (!plugin || (!plugin.enabled && id !== SELF_ID)) {
        api.notify('Enable the plugin first before reloading', 'warning');
        return;
      }

      setTimeout(() => api.reloadPlugin(id), 0);
      api.notify(`Reloaded ${id}`, 'success');
      cleanupPluginUI(id);

      renderInstalled();
      return;
    }

    if (btn.dataset.install) {
      const newDef = {
        id: btn.dataset.install,
        url: btn.dataset.url,
        name: btn.dataset.install,
        enabled: true,
        source: 'registry',
        icon: btn.dataset.icon || undefined
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
        if (remoteVersion) {
          saveRegistryPluginVersion(updateId, remoteVersion);
          saveRemoteVersion(updateId, remoteVersion); // 🔥 REQUIRED
        }
        api.notify(`${updateId} updated successfully!`, 'success');
        if (updateId === SELF_ID) {
          setTimeout(() => window.location.reload(), 200);
          return;
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

  console.log('🔥 Plugin Manager v3.7.3 loaded');
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
