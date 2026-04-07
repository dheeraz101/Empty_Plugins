export const meta = {
  id: 'plugin-manager',
  name: 'Plugin Manager',
  version: '5.3.7',
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
  const CACHE_TIMEOUT = 10 * 60 * 1000;
  let updateCount = 0;
  const reloadCooldowns = new Map();
  let installedFilter = 'all';
  let communityFilter = 'all';
  let globalSearch = '';
  let activeTab = 'installed';

  // ───────── STATUS HELPERS ─────────
  // Persistent status/error fields on registry entries.
  // status: 'active' | 'installing' | 'updating' | 'failed' | 'disabled'
  // error:  string | null
  function setPluginStatus(pluginId, status, error) {
    const registry = api.registry.getAll();
    const entry = registry.find(p => p.id === pluginId);
    if (!entry) return;
    const prev = entry.status || 'unknown';
    entry.status = status;
    entry.error = error || null;
    api.registry.save(registry);
    api.bus.emit('pm:status-change', { id: pluginId, from: prev, to: status, ...(error ? { error } : {}) });
  }

  function getPluginStatus(entry) {
    // Derive display status from persisted field + enabled flag
    if (entry.status === 'installing' || entry.status === 'updating' || entry.status === 'failed') {
      return entry.status;
    }
    return entry.enabled ? 'active' : 'disabled';
  }

  // Returns true if the plugin is mid-transition (block duplicate actions)
  function isBusy(entry) {
    return entry.status === 'installing' || entry.status === 'updating';
  }

  // ───────── STYLE ─────────
  style = document.createElement('style');
  style.textContent = `
  .pm-root {
    --pm-bg: rgba(255,255,255,0.96); 
    --pm-card: rgba(255,255,255,0.82); 
    --apple-red: #ff3b30;
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
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif;
    color: #1d1d1f;
    z-index: 10000;
    isolation: isolate;
  }

  .pm-sidebar {
    width: 220px;
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
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 500;
    color: #424245;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.15s ease;
    margin-bottom: 2px;
  }

  .pm-tab.active { background: rgba(0, 0, 0, 0.06); color: #000; font-weight: 600; }
  .pm-tab:hover:not(.active) { background: rgba(0, 0, 0, 0.03); }

  .pm-search-sidebar {
    padding: 0px 0px;
    margin-bottom: 2px;
    position: relative;
  }

  .pm-search-sidebar .pm-search-input {
    height: 30px;
    width: 100%;
    padding: 0;
    padding-left: 40px;
    padding-right: 35px;
    border: none;
    border-radius: 0;
    background: transparent;
    font-size: 13.5px;
    font-weight: 500;
    color: #424245;
    outline: none;
  }

  .pm-search-sidebar .pm-search-input::placeholder {
    color: #86868b;
  }

  .pm-search-sidebar .pm-search-input:focus {
    outline: none;
  }

  .pm-search-sidebar .pm-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #86868b;
    pointer-events: none;
  }

  .pm-search-sidebar .pm-search-clear {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.15);
    border: none;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    color: #424245;
    font-size: 11px;
    line-height: 1;
    font-weight: 600;
  }

  .pm-search-sidebar .pm-search-clear:hover {
    background: rgba(0, 0, 0, 0.25);
  }

  .pm-search-sidebar .pm-search-clear.visible {
    display: flex;
  }
  }

  .pm-search-sidebar .pm-search-clear.visible {
    display: flex;
  }

  .pm-content {
    flex: 1;
    margin: 0; 
    padding: 40px 32px;
    overflow-y: auto;
    scroll-behavior: smooth;
    scrollbar-gutter: stable;
    position: relative; 
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
  .badge-disabled { background: rgba(142,142,147,0.15); color: #8e8e93; }
  .badge-installing { background: rgba(0, 122, 255, 0.15); color: #007aff; }
  .badge-updating { background: rgba(255, 149, 0, 0.15); color: #cc7700; }
  .badge-failed { background: rgba(255, 59, 48, 0.15); color: #ff3b30; }
  .badge-update { background: rgba(0, 122, 255, 0.15); color: #007aff; }
  .badge-system { background: rgba(88, 86, 214, 0.15); color: #5856d6; }
  .badge-new { background: rgba(255, 149, 0, 0.15); color: #cc7700; }

  .pm-filter-bar {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
  }

  .pm-filter-btn {
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    background: rgba(0, 0, 0, 0.04);
    color: #424245;
    transition: all 0.15s ease;
  }

  .pm-filter-btn:hover { background: rgba(0, 0, 0, 0.08); }
  .pm-filter-btn.active { background: #0071e3; color: white; }

  .pm-divider {
    height: 1px;
    background: rgba(0, 0, 0, 0.1);
    margin: 16px 0;
    border-radius: 1px;
  }

  .pm-search-container {
    position: relative;
    margin-bottom: 20px;
  }

  .pm-search-input {
    width: 100%;
    padding: 10px 16px 10px 38px;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(0, 0, 0, 0.04);
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
    color: #1d1d1f;
    outline: none;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  .pm-search-input::placeholder {
    color: #86868b;
  }

  .pm-search-input:focus {
    background: rgba(255, 255, 255, 0.8);
    border-color: #5e5e60;
  }

  .pm-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #86868b;
    pointer-events: none;
  }

  .pm-search-clear {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.15);
    border: none;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    color: #424245;
    font-size: 14px;
    line-height: 1;
    transition: all 0.15s ease;
  }

  .pm-search-clear:hover {
    background: rgba(0, 0, 0, 0.25);
    color: #1d1d1f;
  }

  .pm-search-clear.visible {
    display: flex;
  }

  .pm-no-results {
    text-align: center;
    padding: 40px 20px;
    color: #86868b;
    font-size: 14px;
  }

  .pm-error-msg {
    font-size: 12px; color: #ff3b30; margin-top: 4px;
    max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .pm-btn-retry {
    background: rgba(255, 59, 48, 0.1); color: #ff3b30;
    border: 1px solid rgba(255, 59, 48, 0.2);
  }
  .pm-btn-retry:hover { background: rgba(255, 59, 48, 0.18); }

  .pm-btn[disabled] { opacity: 0.45; cursor: not-allowed; pointer-events: none; }

  @keyframes pm-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .badge-installing, .badge-updating { animation: pm-pulse 1.2s ease-in-out infinite; }

  .pm-action-group { display: flex; gap: 8px; align-items: center; }

  .pm-content::-webkit-scrollbar {
      width: 12px;
  }

  .pm-content::-webkit-scrollbar-track {
      background: transparent;
  }

  .pm-content::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.08);
      border-radius: 20px;
      border: 3px solid transparent;
      background-clip: padding-box;
      box-shadow: inset 0 100px 0 100px transparent;  /* ~17% inset for 600px; increase to 120px for 20% */
      min-height: 40px;
      transition: background-color 0.2s;
  }

  .pm-content:hover::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
  }

  .pm-content::-webkit-scrollbar-button,
  .pm-content::-webkit-scrollbar-corner {
      display: none;
  }

  /* Firefox support */
  .pm-content {
    scrollbar-width: thin;
    scrollbar-color: rgba(0,0,0,0.1) transparent;
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

  .pm-tab-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .pm-badge {
    background: var(--apple-red);
    color: white;
    font-size: 11px;
    font-weight: 600;
    font-family: -apple-system, "SF Pro Text", sans-serif;
    min-width: 20px;
    height: 20px;
    border-radius: 10px;
    display: none;
    align-items: center;
    justify-content: center;
    margin-left: auto;
    padding: 0 6px;
    box-shadow: 0 2px 5px rgba(255, 59, 48, 0.3);
    letter-spacing: -0.3px;
    line-height: 1;
  }

  @media (prefers-color-scheme: dark) {
    .pm-root {
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
    .badge-disabled { background: rgba(142,142,147,0.2); color: #98989d; }
    .badge-installing { background: rgba(0, 122, 255, 0.2); color: #409cff; }
    .badge-updating { background: rgba(255, 149, 0, 0.2); color: #ffb340; }
    .badge-failed { background: rgba(255, 59, 48, 0.2); color: #ff6961; }
    .pm-error-msg { color: #ff6961; }
    .pm-btn-retry { background: rgba(255, 59, 48, 0.15); color: #ff6961; border-color: rgba(255, 59, 48, 0.25); }
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
    .pm-divider { background: rgba(255, 255, 255, 0.15); }
    .pm-filter-btn { background: rgba(255,255,255,0.08); color: #a1a1a6; }
    .pm-filter-btn:hover { background: rgba(255,255,255,0.15); }
    .pm-filter-btn.active { background: #0071e3; color: white; }
    .pm-search-sidebar .pm-search-input { color: #f5f5f7; }
    .pm-search-sidebar .pm-search-input::placeholder { color: #6e6e73; }
    .pm-search-sidebar .pm-search-icon { color: #a1a1a6; }
    .pm-search-sidebar .pm-search-clear { background: rgba(255,255,255,0.15); color: #a1a1a6; }
    .pm-search-sidebar .pm-search-clear:hover { background: rgba(255,255,255,0.25); color: #fff; }
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
      <div class="pm-tab-container">
        <div style="display: flex; align-items: center; gap: 10px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          <span style="flex: 1;">Installed</span>
          </div>
          <span id="update-badge-count" class="pm-badge"></span>
      </div>
    </div>
    <div class="pm-tab" data-tab="community">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
      Community
    </div>
    <div class="pm-search-sidebar" style="margin-top: 6px;">
      <svg class="pm-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
      <input type="text" class="pm-search-input" id="pm-search" placeholder="Search...">
      <button class="pm-search-clear" id="pm-search-clear">&times;</button>
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
      <div class="pm-filter-bar">
        <button class="pm-filter-btn active" data-filter-installed="all">All</button>
        <button class="pm-filter-btn" data-filter-installed="system">System</button>
      </div>
      <div class="pm-list"></div>
    </div>
    <div id="community" style="display:none;">
      <h1 class="pm-view-title">Discovery</h1>
      <p class="pm-view-subtitle">Explore new extensions built by the community.</p>
      <div class="pm-filter-bar">
        <button class="pm-filter-btn active" data-filter-community="all">All</button>
        <button class="pm-filter-btn" data-filter-community="system">System</button>
        <button class="pm-filter-btn" data-filter-community="new">New</button>
      </div>
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

  // Resolve the URL to use for fetching remote meta / checking updates.
  // If a plugin has been rolled back, entry.url may be a data: URL containing
  // snapshot code — in that case use entry.originalUrl (the real remote URL).
  function getRemoteUrl(entry) {
    if (entry.originalUrl && !entry.originalUrl.startsWith('blob:') && !entry.originalUrl.startsWith('data:')) {
      return entry.originalUrl;
    }
    if (entry.url && !entry.url.startsWith('blob:') && !entry.url.startsWith('data:')) {
      return entry.url;
    }
    return null;
  }

  async function fetchRemoteMeta(url) {
    if (!url || url.startsWith('blob:') || url.startsWith('data:')) return null;
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

  function updateBadge(count) {
    updateCount = count;
    const badge = root.querySelector('#update-badge-count');
    if (!badge) return;

    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  function saveRegistryPluginVersion(pluginId, version) {
    if (!version) return;
    const registry = api.registry.getAll();
    const item = registry.find(entry => entry.id === pluginId);
    if (!item) return;
    item.version = version;
    api.registry.save([...registry]);
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

    overlay.querySelector('#pm-confirm').onclick = async () => {
      const confirmBtn = overlay.querySelector('#pm-confirm');
      const url = overlay.querySelector('#pm-url').value.trim();
      const inputId = overlay.querySelector('#pm-id').value.trim();

      if (!url || !inputId) {
        return api.notify('All fields required', 'error');
      }

      // Lock the button to prevent double-click
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Installing…';
      api.bus.emit('pm:install-start', { id: inputId, url });

      try {
        const remoteMeta = await fetchRemoteMeta(url);

        if (!remoteMeta) {
          confirmBtn.disabled = false; confirmBtn.textContent = 'Install';
          return api.notify('Invalid plugin (meta not found)', 'error');
        }

        // 🔴 STRICT VALIDATION
        if (!remoteMeta.id || typeof remoteMeta.id !== 'string') {
          confirmBtn.disabled = false; confirmBtn.textContent = 'Install';
          return api.notify('Invalid plugin (missing id)', 'error');
        }

        if (remoteMeta.id !== inputId) {
          api.bus.emit('pm:install-id-mismatch', { expected: inputId, got: remoteMeta.id });
          confirmBtn.disabled = false; confirmBtn.textContent = 'Install';
          return api.notify(
            `ID mismatch → Expected "${inputId}", got "${remoteMeta.id}"`,
            'error'
          );
        }

        const newDef = {
          id: remoteMeta.id,
          url,
          name: remoteMeta.name,
          version: remoteMeta.version,
          icon: remoteMeta.icon,
          enabled: true,
          source: 'registry',
          remoteVersion: remoteMeta.version,
          status: 'installing',
          error: null
        };

        const registry = api.registry.getAll();

        if (registry.some(p => p.id === newDef.id)) {
          confirmBtn.disabled = false; confirmBtn.textContent = 'Install';
          return api.notify('Plugin already installed', 'warning');
        }

        api.registry.save([...registry, newDef]);
        renderInstalled(); // show "Installing…" badge immediately

        await api.reloadPlugin(newDef.id);

        setPluginStatus(newDef.id, 'active');
        api.bus.emit('pm:install-success', { id: newDef.id, version: newDef.version });
        api.notify('Installed Successfully', 'success');
        overlay.remove();
        renderInstalled();

      } catch (e) {
        api.bus.emit('pm:install-fail', { id: inputId, error: e.message });
        // Mark as failed in registry so user can retry
        if (inputId) setPluginStatus(inputId, 'failed', e.message || 'Installation failed');
        api.notify('Installation failed', 'error');
        confirmBtn.disabled = false; confirmBtn.textContent = 'Install';
        renderInstalled();
      }
    };

    overlay.querySelector('#pm-cancel').onclick = () => overlay.remove();

  }

  let remoteMetaCache = new Map();

  function isPluginNew(pluginDate) {
    if (!pluginDate) return false;
    const now = Date.now();
    const published = new Date(pluginDate).getTime();
    const sixDays = 6 * 24 * 60 * 60 * 1000;
    return (now - published) < sixDays;
  }

  function isSystemPlugin(plugin) {
    if (plugin.id === SELF_ID) return true;
    if (plugin.category === 'system') return true;
    // Also check community cache for system status
    const communityPlugin = communityCache.find(c => c.id === plugin.id);
    if (communityPlugin && communityPlugin.category === 'system') return true;
    return false;
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
    let remoteMetas = [];

    if (shouldCheck) {
      const results = await Promise.all(
        plugins.map(p => fetchRemoteMeta(getRemoteUrl(p)))
      );

      results.forEach((meta, i) => {
        if (plugins[i]?.id && meta) {
          remoteMetaCache.set(plugins[i].id, meta);
        }
      });

      remoteMetas = results;
    } else {
      remoteMetas = plugins.map(p => remoteMetaCache.get(p.id) || null);
    }
    let registryChanged = false;
    const registryCopy = [...plugins];

    // Separate system and normal plugins
    const systemPlugins = [];
    const normalPlugins = [];

    for (let i = 0; i < plugins.length; i++) {
      const p = plugins[i];
      const remoteMeta = shouldCheck ? remoteMetas[i] : null;
      
      // Check if it's a system plugin via category or id
      const isSystem = isSystemPlugin(p);
      
      // Update remote version
      if (remoteMeta?.version) {
        const entry = registryCopy.find(e => e.id === p.id);
        if (entry && entry.remoteVersion !== remoteMeta.version) {
          entry.remoteVersion = remoteMeta.version;
          registryChanged = true;
        }
      }
      
      const pluginData = { ...p, remoteMeta, index: i };
      if (isSystem) {
        systemPlugins.push(pluginData);
      } else {
        normalPlugins.push(pluginData);
      }
    }

    // Apply filter
    let displaySystemPlugins = systemPlugins;
    let displayNormalPlugins = normalPlugins;
    
    if (installedFilter === 'system') {
      displaySystemPlugins = systemPlugins;
      displayNormalPlugins = [];
    } else if (installedFilter === 'all') {
      displaySystemPlugins = systemPlugins;
      displayNormalPlugins = normalPlugins;
    }

    // Apply search filter
    if (globalSearch.trim()) {
      const searchTerm = globalSearch.toLowerCase().trim();
      displaySystemPlugins = displaySystemPlugins.filter(p => {
        const pItem = plugins[p.index];
        return (pItem.name || pItem.id).toLowerCase().includes(searchTerm);
      });
      displayNormalPlugins = displayNormalPlugins.filter(p => {
        const pItem = plugins[p.index];
        return (pItem.name || pItem.id).toLowerCase().includes(searchTerm);
      });
    }

    let html = '';
    let availableUpdates = 0;

    // Update clear button visibility
    const globalClear = root.querySelector('#pm-search-clear');
    if (globalClear) {
      globalClear.classList.toggle('visible', globalSearch.length > 0);
    }

    // Show no results message
    if (displaySystemPlugins.length === 0 && displayNormalPlugins.length === 0) {
      el.innerHTML = `<div class="pm-no-results">No plugins found${globalSearch ? ` matching "${globalSearch}"` : ''}</div>`;
      updateBadge(0);
      return;
    }

    // Render system plugins first
    for (const pData of displaySystemPlugins) {
      const p = plugins[pData.index];
      const remoteMeta = pData.remoteMeta;
      const isSelf = p.id === SELF_ID;
      const isSystem = true;

      let installedVer = p.version || null;
      let remoteVer = p.remoteVersion || null;

      if (remoteMeta?.version) {
        remoteVer = remoteMeta.version;
      }

      const displayName = remoteMeta?.name || p.name || p.id;

      if (!installedVer && remoteVer) {
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

      const pStatus = isSelf ? 'active' : getPluginStatus(p);
      let typeBadge = '';
      if (isSelf) {
        typeBadge = '<span class="plugin-badge badge-system">System</span>';
      } else if (pStatus === 'installing') {
        typeBadge = '<span class="plugin-badge badge-installing">Installing…</span>';
      } else if (pStatus === 'updating') {
        typeBadge = '<span class="plugin-badge badge-updating">Updating…</span>';
      } else if (pStatus === 'failed') {
        typeBadge = '<span class="plugin-badge badge-failed">Failed</span>';
      } else if (pStatus === 'disabled') {
        typeBadge = '<span class="plugin-badge badge-disabled">Inactive</span>';
      } else {
        typeBadge = '<span class="plugin-badge badge-system">System</span>';
      }

      const errorHtml = p.error ? `<div class="pm-error-msg" title="${p.error.replace(/"/g, '&quot;')}">⚠ ${p.error}</div>` : '';
      const statusBadges = `<div style="margin-top:4px; display:flex; align-items:center;">${typeBadge}${updateBadge}</div>${errorHtml}`;

      const versionText = installedVer ? `v${installedVer}` : 'Version unknown';
      const colors = ['#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500'];
      const iconBg = colors[p.id.length % colors.length];
      const iconContent = p.icon || remoteMeta?.icon || getCommunityIcon(p.id) || '📦';
      const iconHtml = (typeof iconContent === 'string' && (iconContent.startsWith('http://') || iconContent.startsWith('https://')))
        ? `<img src="${iconContent}" alt="${displayName}" style="width:100%;height:100%;border-radius:10px;object-fit:cover;" />`
        : iconContent;

      const busy = isBusy(p);
      const reloadDisabled = (!p.enabled && !isSelf) || busy;
      const reloadBtnHTML = isSelf ? '' : `
        <button class="pm-btn pm-btn-secondary reload-btn" 
                data-act="reload" 
                data-id="${p.id}"
                ${reloadDisabled ? 'disabled title="' + (busy ? 'Operation in progress' : 'Enable the plugin first to reload') + '"' : ''}>
          Reload
        </button>
      `;

      const retryBtn = pStatus === 'failed'
        ? `<button class="pm-btn pm-btn-retry" data-act="retry" data-id="${p.id}">Retry</button>`
        : '';

      html += `
        <div class="plugin-item" data-plugin-id="${p.id}">
          <div class="plugin-icon-box" style="background: ${iconBg};">${iconHtml}</div>
          <div class="plugin-info">
            <span class="plugin-name">${displayName}</span>
            <div class="plugin-meta">${versionText} • <span style="opacity: 0.7">${p.id}</span></div>
            ${statusBadges}
          </div>
          <div class="pm-action-group">
            ${retryBtn}
            ${reloadBtnHTML}
            ${isSelf ? '' : `<button class="pm-btn ${p.enabled ? 'pm-btn-secondary' : 'pm-btn-primary'} toggle-btn" data-act="toggle" data-id="${p.id}" ${busy ? 'disabled' : ''}>${p.enabled ? 'Disable' : 'Enable'}</button>`}
            ${isSelf ? '' : `<button class="pm-btn pm-btn-secondary delete-btn" data-act="delete" data-id="${p.id}" style="color:#ff3b30;" ${busy ? 'disabled' : ''}>Delete</button>`}
            ${busy ? '' : updateBtn}
          </div>
        </div>
      `;
    }

    // Add divider if there are both system and normal plugins
    if (displaySystemPlugins.length > 0 && displayNormalPlugins.length > 0) {
      html += `<div class="pm-divider"></div>`;
    }

    // Render normal plugins
    for (const pData of displayNormalPlugins) {
      const p = plugins[pData.index];
      const remoteMeta = pData.remoteMeta;
      const isSelf = p.id === SELF_ID;

      let installedVer = p.version || null;
      let remoteVer = p.remoteVersion || null;

      if (remoteMeta?.version) {
        remoteVer = remoteMeta.version;
      }

      const displayName = remoteMeta?.name || p.name || p.id;

      if (!installedVer && remoteVer) {
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

      const pStatus = isSelf ? 'active' : getPluginStatus(p);
      let typeBadge = '';
      if (isSelf) {
        typeBadge = '<span class="plugin-badge badge-system">System</span>';
      } else if (pStatus === 'installing') {
        typeBadge = '<span class="plugin-badge badge-installing">Installing…</span>';
      } else if (pStatus === 'updating') {
        typeBadge = '<span class="plugin-badge badge-updating">Updating…</span>';
      } else if (pStatus === 'failed') {
        typeBadge = '<span class="plugin-badge badge-failed">Failed</span>';
      } else if (pStatus === 'disabled') {
        typeBadge = '<span class="plugin-badge badge-disabled">Inactive</span>';
      } else {
        typeBadge = '<span class="plugin-badge badge-enabled">Active</span>';
      }

      const errorHtml = p.error ? `<div class="pm-error-msg" title="${p.error.replace(/"/g, '&quot;')}">⚠ ${p.error}</div>` : '';
      const statusBadges = `<div style="margin-top:4px; display:flex; align-items:center;">${typeBadge}${updateBadge}</div>${errorHtml}`;

      const versionText = installedVer ? `v${installedVer}` : 'Version unknown';
      const colors = ['#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500'];
      const iconBg = colors[p.id.length % colors.length];
      const iconContent = p.icon || remoteMeta?.icon || getCommunityIcon(p.id) || '📦';
      const iconHtml = (typeof iconContent === 'string' && (iconContent.startsWith('http://') || iconContent.startsWith('https://')))
        ? `<img src="${iconContent}" alt="${displayName}" style="width:100%;height:100%;border-radius:10px;object-fit:cover;" />`
        : iconContent;

      const busy = isBusy(p);
      const reloadDisabled = (!p.enabled && !isSelf) || busy;
      const reloadBtnHTML = isSelf ? '' : `
        <button class="pm-btn pm-btn-secondary reload-btn" 
                data-act="reload" 
                data-id="${p.id}"
                ${reloadDisabled ? 'disabled title="' + (busy ? 'Operation in progress' : 'Enable the plugin first to reload') + '"' : ''}>
          Reload
        </button>
      `;

      const retryBtn = pStatus === 'failed'
        ? `<button class="pm-btn pm-btn-retry" data-act="retry" data-id="${p.id}">Retry</button>`
        : '';

      html += `
        <div class="plugin-item" data-plugin-id="${p.id}">
          <div class="plugin-icon-box" style="background: ${iconBg};">${iconHtml}</div>
          <div class="plugin-info">
            <span class="plugin-name">${displayName}</span>
            <div class="plugin-meta">${versionText} • <span style="opacity: 0.7">${p.id}</span></div>
            ${statusBadges}
          </div>
          <div class="pm-action-group">
            ${retryBtn}
            ${reloadBtnHTML}
            ${isSelf ? '' : `<button class="pm-btn ${p.enabled ? 'pm-btn-secondary' : 'pm-btn-primary'} toggle-btn" data-act="toggle" data-id="${p.id}" ${busy ? 'disabled' : ''}>${p.enabled ? 'Disable' : 'Enable'}</button>`}
            ${isSelf ? '' : `<button class="pm-btn pm-btn-secondary delete-btn" data-act="delete" data-id="${p.id}" style="color:#ff3b30;" ${busy ? 'disabled' : ''}>Delete</button>`}
            ${busy ? '' : updateBtn}
          </div>
        </div>
      `;
    }

    const lastCheckedHTML = lastCheckedTime
      ? `<div class="last-checked">Last update checked: ${timeAgo(lastCheckedTime)}</div>`
      : '';
      if (registryChanged) {
        setTimeout(() => {
          api.registry.save(registryCopy);
        }, 0);
      }

    el.innerHTML = html + lastCheckedHTML;
    updateBadge(availableUpdates);
  }

  // ───────── RENDER COMMUNITY (with filters) ─────────
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

    // Filter plugins based on communityFilter
    let filteredPlugins = communityCache;
    if (communityFilter === 'system') {
      filteredPlugins = communityCache.filter(p => p.category === 'system');
    } else if (communityFilter === 'new') {
      filteredPlugins = communityCache.filter(p => isPluginNew(p.date));
    }

    // Apply search filter
    if (globalSearch.trim()) {
      const searchTerm = globalSearch.toLowerCase().trim();
      filteredPlugins = filteredPlugins.filter(p => 
        (p.name || p.id).toLowerCase().includes(searchTerm) ||
        (p.description || '').toLowerCase().includes(searchTerm) ||
        (p.author || '').toLowerCase().includes(searchTerm)
      );
    }

    // Show no results message
    if (filteredPlugins.length === 0) {
      el.innerHTML = `<div class="pm-no-results">No plugins found${globalSearch ? ` matching "${globalSearch}"` : ''}</div>`;
      return;
    }

    el.innerHTML = filteredPlugins.map(p => {
      const displayVersion = p.version || installedVersions[p.id];
      const colors = ['#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500'];
      const iconBg = colors[p.id.length % colors.length];
      const isInstalled = installed.has(p.id);
      const isNew = isPluginNew(p.date);
      const isSystem = p.category === 'system';

      let badges = '';
      if (isSystem) {
        badges += '<span class="plugin-badge badge-system" style="margin-right: 4px;">System</span>';
      }
      if (isNew) {
        badges += '<span class="plugin-badge badge-new">New</span>';
      }

      return `
      <div class="plugin-item">
        <div class="plugin-icon-box" style="background: ${iconBg};">${p.icon || '📦'}</div>
        <div class="plugin-info">
          <span class="plugin-name">${p.name}</span>
          <div class="plugin-meta">${displayVersion ? `v${displayVersion} • ` : ''}${p.author || 'Unknown'}</div>
          <div style="margin-top: 4px; display: flex; align-items: center; gap: 6px;">${badges}</div>
          <div class="plugin-meta" style="margin-top: 6px; color: #8e8e93;">${p.description || ''}</div>
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

    if (btn.dataset.act === 'retry') {
      const retryEntry = api.registry.getAll().find(p => p.id === id);
      if (!retryEntry || isBusy(retryEntry)) return;

      btn.disabled = true;
      btn.textContent = 'Retrying…';
      api.bus.emit('pm:retry-start', { id });
      setPluginStatus(id, 'installing');
      renderInstalled();

      try {
        await api.reloadPlugin(id);
        setPluginStatus(id, 'active');
        api.bus.emit('pm:retry-success', { id });
        api.notify(`${retryEntry.name || id} loaded successfully`, 'success');
      } catch (e) {
        api.bus.emit('pm:retry-fail', { id, error: e.message });
        setPluginStatus(id, 'failed', e.message || 'Retry failed');
        api.notify('Retry failed', 'error');
      }
      renderInstalled();
      return;
    }

    if (btn.dataset.act === 'toggle') {
      const tEntry = api.registry.getAll().find(p => p.id === id);
      if (tEntry && isBusy(tEntry)) return;
      const newState = tEntry?.enabled ? 'disabled' : 'active';
      api.bus.emit('pm:toggle', { id, to: newState });
      await api.togglePlugin(id);
      cleanupPluginUI(id);
      setPluginStatus(id, tEntry?.enabled ? 'active' : 'disabled');
    }

    if (btn.dataset.act === 'delete') {
      const dEntry = api.registry.getAll().find(p => p.id === id);
      if (dEntry && isBusy(dEntry)) return;
      api.bus.emit('pm:delete', { id });
      await api.deletePlugin(id);
      cleanupPluginUI(id);
    }

    if (btn.dataset.act === 'reload') {
        if (id === SELF_ID) {
          api.notify('Plugin Manager cannot reload itself', 'warning');
          return;
        }

      const rEntry = api.registry.getAll().find(p => p.id === id);
      if (rEntry && isBusy(rEntry)) return;

      const cooldownMs = 30000;
      const lastReload = reloadCooldowns.get(id) || 0;
      const now = Date.now();
      if (now - lastReload < cooldownMs) {
        api.notify('Please wait before reloading again', 'warning');
        return;
      }
      reloadCooldowns.set(id, now);

      if (!rEntry || (!rEntry.enabled && id !== SELF_ID)) {
        api.notify('Enable the plugin first before reloading', 'warning');
        return;
      }

      api.bus.emit('pm:reload-start', { id });
      try {
        await api.reloadPlugin(id);
        setPluginStatus(id, 'active');
        api.bus.emit('pm:reload-success', { id });
        api.notify(`Reloaded ${id}`, 'success');
      } catch (e) {
        api.bus.emit('pm:reload-fail', { id, error: e.message });
        setPluginStatus(id, 'failed', e.message || 'Reload failed');
        api.notify('Reload failed', 'error');
      }
      cleanupPluginUI(id);

      renderInstalled();
      return;
    }

    if (btn.dataset.install) {
      // Prevent double-click
      btn.disabled = true;
      btn.textContent = 'Installing…';

      const installId = btn.dataset.install;
      api.bus.emit('pm:install-start', { id: installId, url: btn.dataset.url, source: 'community' });

      const remoteMeta = await fetchRemoteMeta(btn.dataset.url);

      if (!remoteMeta) {
        btn.disabled = false; btn.textContent = 'Install Plugin';
        return api.notify('Invalid plugin (meta not found)', 'error');
      }

      if (!remoteMeta.id || typeof remoteMeta.id !== 'string') {
        btn.disabled = false; btn.textContent = 'Install Plugin';
        return api.notify('Invalid plugin (missing id)', 'error');
      }

      if (remoteMeta.id !== installId) {
        api.bus.emit('pm:install-id-mismatch', { expected: installId, got: remoteMeta.id, source: 'community' });
        btn.disabled = false; btn.textContent = 'Install Plugin';
        return api.notify(
          `Plugin ID mismatch (expected "${installId}", got "${remoteMeta.id}")`,
          'error'
        );
      }

      const newDef = {
        id: remoteMeta.id || installId,
        url: btn.dataset.url,
        name: remoteMeta.name,
        version: remoteMeta.version,
        icon: remoteMeta.icon || btn.dataset.icon,
        enabled: true,
        source: 'registry',
        remoteVersion: remoteMeta.version,
        status: 'installing',
        error: null
      };

      const registry = api.registry.getAll();

      if (registry.some(p => p.id === newDef.id)) {
        btn.disabled = false; btn.textContent = 'Install Plugin';
        return api.notify('Plugin already installed', 'warning');
      }

      api.registry.save([...registry, newDef]);
      renderInstalled(); // show "Installing…" badge

      try {
        cleanupPluginUI(newDef.id);
        await api.reloadPlugin(newDef.id);
        setPluginStatus(newDef.id, 'active');
        api.bus.emit('pm:install-success', { id: newDef.id, version: newDef.version, source: 'community' });
      } catch (e) {
        api.bus.emit('pm:install-fail', { id: newDef.id, error: e.message, source: 'community' });
        setPluginStatus(newDef.id, 'failed', e.message || 'Install failed');
        api.notify('Install failed', 'error');
      }
    }

    if (btn.dataset.update) {
      const updateId = btn.dataset.update;
      const registry = api.registry.getAll();
      const entry = registry.find(p => p.id === updateId);

      // Block if already busy
      if (entry && isBusy(entry)) return;

      // Prevent double-click
      btn.disabled = true;
      btn.textContent = 'Updating…';
      api.bus.emit('pm:update-start', { id: updateId });

      let remoteVersion = null;
      const updateUrl = getRemoteUrl(entry);
      if (updateUrl) {
        const remoteMeta = await fetchRemoteMeta(updateUrl);
        remoteVersion = remoteMeta?.version || null;
      }

      try {
        setPluginStatus(updateId, 'updating');
        renderInstalled(); // show "Updating…" badge

        // If the plugin was rolled back, entry.url is a data: URL (snapshot code).
        // Restore the real remote URL so core loads the latest version.
        if (updateUrl && entry.url !== updateUrl) {
          const freshReg = api.registry.getAll();
          const freshEntry = freshReg.find(p => p.id === updateId);
          if (freshEntry) {
            freshEntry.url = updateUrl;
            api.registry.save(freshReg);
          }
        }

        await api.reloadPlugin(updateId);
        if (remoteVersion) {
          saveRegistryPluginVersion(updateId, remoteVersion);
          saveRemoteVersion(updateId, remoteVersion);
        }
        setPluginStatus(updateId, 'active');
        api.bus.emit('pm:update-success', { id: updateId, version: remoteVersion });
        api.notify(`${updateId} updated successfully!`, 'success');
        if (updateId === SELF_ID) {
          setTimeout(() => window.location.reload(), 200);
          return;
        }
      } catch (e) {
        api.bus.emit('pm:update-fail', { id: updateId, error: e.message });
        setPluginStatus(updateId, 'failed', e.message || 'Update failed');
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

      activeTab = tab.dataset.tab;

      if (tab.dataset.tab === 'installed') renderInstalled();
      if (tab.dataset.tab === 'community') renderCommunity();
    };
  });

  // Filter button handlers
  root.querySelectorAll('.pm-filter-btn').forEach(btn => {
    btn.onclick = () => {
      const container = btn.closest('.pm-filter-bar');
      container.querySelectorAll('.pm-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (btn.dataset.filterInstalled) {
        installedFilter = btn.dataset.filterInstalled;
        renderInstalled();
      } else if (btn.dataset.filterCommunity) {
        communityFilter = btn.dataset.filterCommunity;
        renderCommunity();
      }
    };
  });

  // Search input handlers
  const globalSearchInput = root.querySelector('#pm-search');

  if (globalSearchInput) {
    globalSearchInput.addEventListener('input', (e) => {
      globalSearch = e.target.value;
      renderInstalled();
      renderCommunity();
    });
  }

  // Search clear button handlers
  const globalSearchClear = root.querySelector('#pm-search-clear');
  if (globalSearchClear) {
    globalSearchClear.onclick = () => {
      globalSearch = '';
      if (globalSearchInput) globalSearchInput.value = '';
      globalSearchClear.classList.remove('visible');
      renderInstalled();
      renderCommunity();
    };
  }

  contextMenuHandler = (e) => {
    if (e.target.closest('.pm-root')) return;
    e.preventDefault();
    root.style.display = 'flex';
    renderInstalled();
  };
  api.boardEl.addEventListener('contextmenu', contextMenuHandler);

  api.bus.emit('pm:loaded', { version: meta.version });
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