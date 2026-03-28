export const meta = {
  id: 'plugin-manager',
  name: 'Plugin Manager',
  version: '1.1.0',
  compat: '>=3.3.0'
};

export function setup(api) {
  const SELF_ID = meta.id;
  const COMMUNITY_JSON_URL = 'https://raw.githubusercontent.com/dheeraz101/Empty_Plugins/refs/heads/main/plugins.json';

  // ── Create Main Container ──
  const manager = document.createElement('div');
  manager.className = 'plugin-box';
  manager.style.cssText = `
    left: 260px; 
    top: 80px; 
    width: 860px; 
    max-height: 92vh; 
    background: #0f0f0f; 
    color: #e8e8e8; 
    border: 1px solid #444; 
    border-radius: 20px;
    box-shadow: 0 35px 100px rgba(0, 0, 0, 0.9);
    overflow: hidden;
    font-family: system-ui, -apple-system, sans-serif;
    z-index: 10000;
    display: none;
    resize: both;
    min-width: 600px;
    min-height: 400px;
  `;

  manager.innerHTML = `
    <!-- Header -->
    <div style="padding:22px 28px; background:#1a1a1a; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:14px;">
        <span style="font-size:26px;">⚙️</span>
        <div>
          <div style="font-size:20px; font-weight:700;">Plugin Manager</div>
          <div id="stats" style="font-size:13px; color:#888;">Loading plugins...</div>
        </div>
      </div>
      <div style="display:flex; gap:12px;">
        <button id="restart-btn" style="padding:9px 18px; background:#333; color:#fff; border:none; border-radius:10px; cursor:pointer; font-size:14px; display:flex; align-items:center; gap:6px;">
          ♻️ Restart Board
        </button>
        <button id="close-btn" style="background:none; border:none; color:#aaa; font-size:34px; cursor:pointer; width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:12px;">
          ×
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex; background:#1a1a1a; border-bottom:1px solid #333;" id="tabs-container">
      <button id="tab-installed" class="tab active">Installed</button>
      <button id="tab-community" class="tab">Community</button>
      <button id="tab-debug" class="tab">Debug</button>
    </div>

    <!-- Installed Panel -->
    <div id="panel-installed" class="panel-content">
      <div style="padding:16px 28px; background:#1a1a1a; border-bottom:1px solid #333;">
        <input id="search-installed" type="text" placeholder="Search plugins by name or id..." 
               style="width:100%; padding:14px 18px; background:#222; border:1px solid #555; border-radius:12px; color:#fff; font-size:15px;">
      </div>
      <div id="installed-list" style="padding:20px 28px; display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:18px; overflow:auto; max-height:calc(92vh - 260px);"></div>
    </div>

    <!-- Community Panel -->
    <div id="panel-community" class="panel-content" style="display:none; padding:24px; overflow:auto; max-height:calc(92vh - 200px);">
      <div id="community-loading" style="text-align:center; padding:100px 20px; color:#777;">Fetching community plugins from GitHub...</div>
      <div id="community-list" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:20px;"></div>
    </div>

    <!-- Debug Panel -->
    <div id="panel-debug" class="panel-content" style="display:none; padding:24px; background:#0a0a0a; font-family:monospace; font-size:13.5px; color:#bbb; overflow:auto; max-height:calc(92vh - 200px); line-height:1.5;">
      <div id="debug-content" style="white-space:pre-wrap;">Waiting for debug information...</div>
    </div>

    <!-- Manual Install -->
    <div style="padding:20px 28px; background:#1a1a1a; border-top:1px solid #333;">
      <div style="font-size:13.5px; color:#aaa; margin-bottom:12px;">Install from URL</div>
      <div style="display:grid; grid-template-columns:1fr 2.2fr; gap:14px;">
        <input id="install-id" placeholder="unique-plugin-id" style="padding:14px; background:#222; border:1px solid #555; border-radius:12px; color:#fff;">
        <input id="install-url" type="url" placeholder="https://raw.githubusercontent.com/user/repo/main/plugin.js" style="padding:14px; background:#222; border:1px solid #555; border-radius:12px; color:#fff;">
      </div>
      <button id="manual-install-btn" style="margin-top:16px; width:100%; padding:15px; background:#7c6fff; color:white; border:none; border-radius:12px; font-weight:600; cursor:pointer; font-size:15px;">
        Install Plugin
      </button>
    </div>
  `;

  api.boardEl.appendChild(manager);
  api.makeDraggable(manager);
  api.makeResizable(manager);

  // DOM Elements
  const closeBtn = manager.querySelector('#close-btn');
  const restartBtn = manager.querySelector('#restart-btn');
  const tabInstalled = manager.querySelector('#tab-installed');
  const tabCommunity = manager.querySelector('#tab-community');
  const tabDebug = manager.querySelector('#tab-debug');

  const panelInstalled = manager.querySelector('#panel-installed');
  const panelCommunity = manager.querySelector('#panel-community');
  const panelDebug = manager.querySelector('#panel-debug');

  const searchInput = manager.querySelector('#search-installed');
  const statsEl = manager.querySelector('#stats');

  // Close
  closeBtn.addEventListener('click', () => manager.style.display = 'none');

  // Restart Board
  restartBtn.addEventListener('click', () => {
    if (confirm('Restart the entire board?\nAll plugins will be reloaded.')) {
      api.restart();
      manager.style.display = 'none';
    }
  });

  // Tab System
  function showTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel-content').forEach(p => p.style.display = 'none');

    if (tab === 'installed') {
      tabInstalled.classList.add('active');
      panelInstalled.style.display = 'block';
      renderInstalled();
    } else if (tab === 'community') {
      tabCommunity.classList.add('active');
      panelCommunity.style.display = 'block';
      loadCommunityPlugins();
    } else if (tab === 'debug') {
      tabDebug.classList.add('active');
      panelDebug.style.display = 'block';
      renderDebugPanel();
    }
  }

  tabInstalled.addEventListener('click', () => showTab('installed'));
  tabCommunity.addEventListener('click', () => showTab('community'));
  tabDebug.addEventListener('click', () => showTab('debug'));

  // Tab styles
  const tabStyle = document.createElement('style');
  tabStyle.textContent = `
    .tab { flex: 1; padding: 18px 0; font-size: 15.5px; font-weight: 600; border: none; background: none; color: #888; cursor: pointer; transition: all 0.25s; }
    .tab.active { color: #fff; border-bottom: 4px solid #7c6fff; background: #151515; }
    .panel-content { padding: 0; overflow: auto; }
  `;
  document.head.appendChild(tabStyle);

  // ── Strong Self Protection ──
  function protectSelf() {
    const origDelete = api.deletePlugin;
    api.deletePlugin = (id) => {
      if (id === SELF_ID) {
        api.notify("❌ Plugin Manager is a protected core plugin and cannot be deleted.", "error", 7000);
        return false;
      }
      return origDelete(id);
    };

    const origToggle = api.togglePlugin;
    api.togglePlugin = async (id) => {
      if (id === SELF_ID) {
        api.notify("❌ Plugin Manager cannot be disabled.", "error", 5000);
        return false;
      }
      return await origToggle(id);
    };
  }
  protectSelf();

  // ── Extensibility Hooks ──
  api.registerHook('manager:renderInstalledCard', (plugin) => null);
  api.registerHook('manager:renderCommunityCard', (plugin) => null);
  api.registerHook('manager:renderDebugInfo', (data) => null);

  // Update stats
  function updateStats() {
    const all = api.registry.getAll();
    const enabled = all.filter(p => p.enabled).length;
    statsEl.textContent = `${all.length} plugins • ${enabled} enabled`;
  }

  // Render Installed (Modern Cards)
  function renderInstalled(filter = '') {
    const plugins = api.registry.getAll();
    const container = manager.querySelector('#installed-list');
    let html = '';

    plugins
      .filter(p => !filter || p.name?.toLowerCase().includes(filter) || p.id.toLowerCase().includes(filter))
      .forEach(p => {
        const isSelf = p.id === SELF_ID;
        let card = `
          <div style="background:#1a1a1a; border:1px solid #444; border-radius:16px; padding:20px;">
            <div style="display:flex; justify-content:space-between;">
              <div style="font-size:17px; font-weight:600;">${p.name || p.id}</div>
              <span style="padding:6px 16px; border-radius:999px; font-size:13px; background:${p.enabled ? '#1f3a1f' : '#3a1f1f'}; color:${p.enabled ? '#4caf50' : '#ff6666'}">
                ${p.enabled ? '● Active' : '⏸ Paused'}
              </span>
            </div>
            <div style="margin:8px 0 16px; font-size:13px; color:#777;">${p.id}</div>
            
            ${isSelf ? 
              `<div style="color:#ffaa00; font-size:14px; margin-bottom:12px;">🔒 Core Plugin — Protected</div>` : ''}
            
            <div style="display:flex; gap:10px;">
              ${isSelf ? '' : `
                <button data-action="toggle" data-id="${p.id}" style="flex:1; padding:11px; border-radius:10px; border:1px solid #555; background:#222; color:#ddd; cursor:pointer;">
                  ${p.enabled ? 'Pause' : 'Resume'}
                </button>
                <button data-action="delete" data-id="${p.id}" style="flex:1; padding:11px; border-radius:10px; border:1px solid #ff5555; background:#3a1a1a; color:#ff6666; cursor:pointer;">
                  Delete
                </button>`}
            </div>
          </div>`;

        const extras = api.useHook('manager:renderInstalledCard', p);
        extras.forEach(extra => { if (extra) card += extra; });

        html += card;
      });

    container.innerHTML = html || `<div style="text-align:center; padding:80px; color:#666;">No plugins match your search.</div>`;
    updateStats();
  }

  // Simple Debug Panel
  function renderDebugPanel() {
    const content = manager.querySelector('#debug-content');
    content.innerHTML = `
      <strong>Debug Information</strong><br><br>
      • Total plugins in registry: ${api.registry.getAll().length}<br>
      • Loaded plugins: ${Object.keys(api.getContainer ? 'containers' : 'N/A')}<br>
      • Core version: ${api.version}<br><br>
      <em>Plugin errors and logs will appear here in future updates.</em>
    `;
  }

  // Search with debounce
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      renderInstalled(e.target.value.toLowerCase().trim());
    }, 180);
  });

  // Load Community (kept functional)
  async function loadCommunityPlugins() {
    const loading = manager.querySelector('#community-loading');
    const container = manager.querySelector('#community-list');
    container.innerHTML = '';

    try {
      const res = await fetch(COMMUNITY_JSON_URL + '?t=' + Date.now());
      if (!res.ok) throw new Error();
      const plugins = await res.json();

      let html = '';
      plugins.forEach(p => {
        const installed = api.registry.getAll().some(i => i.id === p.id);
        let card = `
          <div style="background:#1a1a1a; border:1px solid #444; border-radius:16px; padding:20px;">
            <div style="font-size:24px; margin-bottom:10px;">${p.icon || '📦'}</div>
            <div style="font-weight:600; font-size:16px;">${p.name}</div>
            <div style="color:#777; font-size:13px;">by ${p.author || 'community'}</div>
            <div style="margin:12px 0; font-size:14px; color:#ccc; line-height:1.5;">${p.description || 'No description provided.'}</div>
            ${installed ? 
              `<div style="color:#4caf50; font-size:14px;">✓ Already installed</div>` : 
              `<button data-id="${p.id}" data-url="${p.url}" data-name="${p.name}" style="margin-top:12px; width:100%; padding:12px; background:#7c6fff; color:white; border:none; border-radius:10px; cursor:pointer;">Install</button>`}
          </div>`;

        const extras = api.useHook('manager:renderCommunityCard', p);
        extras.forEach(extra => { if (extra) card += extra; });

        html += card;
      });

      container.innerHTML = html;
      loading.style.display = 'none';
    } catch (e) {
      container.innerHTML = `<div style="color:#ff6666; text-align:center; padding:100px;">Failed to load community plugins.<br>Check your GitHub URL.</div>`;
    }
  }

  // Click handlers for Installed actions
  manager.querySelector('#installed-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === 'toggle') {
      await api.togglePlugin(id);
      renderInstalled(searchInput.value.toLowerCase().trim());
    } else if (action === 'delete') {
      if (confirm(`Permanently delete "${id}"?`)) {
        api.deletePlugin(id);
        renderInstalled(searchInput.value.toLowerCase().trim());
      }
    }
  });

  // Manual install
  manager.querySelector('#manual-install-btn').addEventListener('click', async () => {
    const id = manager.querySelector('#install-id').value.trim().toLowerCase().replace(/\s+/g, '-');
    const url = manager.querySelector('#install-url').value.trim();
    if (!id || !url) return alert('Both ID and URL are required');

    const success = await api.installPlugin(id, url, id);
    if (success) {
      api.notify(`Plugin "${id}" installed successfully`, 'success');
      renderInstalled();
      showTab('installed');
    }
  });

  // Right-click anywhere on board to open manager
  api.boardEl.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.plugin-box')) return;
    e.preventDefault();
    manager.style.left = `${Math.min(e.clientX + 30, window.innerWidth - 900)}px`;
    manager.style.top = `${e.clientY + 15}px`;
    manager.style.display = 'block';
    showTab('installed');
  });

  // Fallback protection
  api.bus.on('plugin:unloaded', (id) => {
    if (id === SELF_ID) manager.remove();
  });

  console.log('✅ Plugin Manager v1.1.0 — Modern & Powerful');
}

export function teardown() {
  console.log('🗑️ Plugin Manager unloaded');
}