export const meta = {
  id: 'plugin-manager',
  name: 'Plugin Manager',
  version: '1.2.0',
  compat: '>=3.3.0'
};

export function setup(api) {
  const SELF_ID = meta.id;
  const COMMUNITY_JSON_URL = 'https://raw.githubusercontent.com/dheeraz101/Empty_Plugins/refs/heads/main/plugins.json';

  // ── UI Container ──
  const manager = document.createElement('div');
  manager.className = 'plugin-box';
  manager.style.cssText = `
    left: 240px;
    top: 70px;
    width: 880px;
    max-height: 94vh;
    background: #111113;
    color: #f0f0f0;
    border: 1px solid #333;
    border-radius: 20px;
    box-shadow: 0 40px 120px rgba(0,0,0,0.85);
    overflow: hidden;
    z-index: 10000;
    display: none;
    resize: both;
    min-width: 620px;
    min-height: 420px;
  `;

  manager.innerHTML = `
  <!-- Header -->
    <div style="padding:24px 32px 20px; background:#1c1c1f; border-bottom:1px solid #333; display:flex; align-items:center; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:14px;">
        <span style="font-size:28px;">⚙️</span>
        <div>
          <div style="font-size:22px; font-weight:600; letter-spacing:-0.5px;">Plugin Manager</div>
          <div id="stats" style="font-size:13.5px; color:#888;">Loading...</div>
        </div>
      </div>
      <div style="display:flex; gap:12px; align-items:center;">
        <a href="https://empty-ad9a3406.mintlify.app/" target="_blank" style="color:#7c6fff; text-decoration:none; font-size:14px; font-weight:500; display:flex; align-items:center; gap:6px;">
          📘 Docs
        </a>
        <button id="restart-btn" style="padding:8px 18px; background:#2c2c2e; color:#fff; border:none; border-radius:10px; cursor:pointer; font-size:14px; display:flex; align-items:center; gap:6px;">
          ♻️ Restart Board
        </button>
        <button id="close-btn" style="background:none; border:none; color:#aaa; font-size:32px; cursor:pointer; width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
          ×
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex; background:#1c1c1f; border-bottom:1px solid #333;" id="tabs-container">
      <button id="tab-installed" class="tab active">Installed</button>
      <button id="tab-community" class="tab">Community</button>
      <button id="tab-debug" class="tab">Debug</button>
    </div>

    <!-- Installed -->
    <div id="panel-installed" class="panel-content">
      <div style="padding:16px 32px; background:#1c1c1f; border-bottom:1px solid #333;">
        <input id="search-installed" type="text" placeholder="Search plugins..." 
               style="width:100%; padding:14px 20px; background:#2c2c2e; border:none; border-radius:14px; color:#fff; font-size:15px; outline:none;">
      </div>
      <div id="installed-list" style="padding:24px 32px; display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:18px; overflow:auto; max-height:calc(94vh - 260px);"></div>
    </div>

    <!-- Community -->
    <div id="panel-community" class="panel-content" style="display:none; padding:24px 32px; overflow:auto; max-height:calc(94vh - 200px);">
      <div id="community-loading" style="text-align:center; padding:120px 20px; color:#888;">Fetching community plugins...</div>
      <div id="community-list" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:20px;"></div>
    </div>

    <!-- Debug -->
    <div id="panel-debug" class="panel-content" style="display:none; padding:28px; background:#0a0a0a; font-family:monospace; font-size:13.5px; color:#ccc; overflow:auto; max-height:calc(94vh - 200px); line-height:1.6;">
      <div id="debug-content">Debug panel ready.</div>
    </div>

    <!-- Install from URL -->
    <div style="padding:24px 32px; background:#1c1c1f; border-top:1px solid #333;">
      <div style="font-size:13.5px; color:#aaa; margin-bottom:12px;">Install from URL</div>
      <div style="display:grid; grid-template-columns:1fr 2.5fr; gap:14px;">
        <input id="install-id" placeholder="plugin-id" style="padding:14px 18px; background:#2c2c2e; border:none; border-radius:12px; color:#fff;">
        <input id="install-url" type="url" placeholder="https://raw.githubusercontent.com/.../plugin.js" style="padding:14px 18px; background:#2c2c2e; border:none; border-radius:12px; color:#fff;">
      </div>
      <button id="manual-install-btn" style="margin-top:18px; width:100%; padding:16px; background:#7c6fff; color:white; border:none; border-radius:14px; font-weight:600; font-size:15.5px; cursor:pointer;">
        Install Plugin
      </button>
    </div>
  `;

  api.boardEl.appendChild(manager);
  api.makeDraggable(manager);
  api.makeResizable(manager);

  // ── Elements ──
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

  // ── Close ──
  closeBtn.onclick = () => manager.style.display = 'none';

  // ── Restart ──
  restartBtn.onclick = () => {
    if (confirm('Restart the entire board?')) {
      api.restart();
      manager.style.display = 'none';
    }
  };

  // ── Self Protection ──
  const origDelete = api.deletePlugin;
  const origToggle = api.togglePlugin;

  api.deletePlugin = (id) => {
    if (id === SELF_ID) {
      api.notify("Protected plugin.", "error");
      return false;
    }
    return origDelete(id);
  };

  api.togglePlugin = async (id) => {
    if (id === SELF_ID) {
      api.notify("Cannot disable Plugin Manager.", "error");
      return false;
    }
    return await origToggle(id);
  };

  // ── Tabs ──
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
    } else {
      tabDebug.classList.add('active');
      panelDebug.style.display = 'block';
      renderDebugPanel();
    }
  }

  tabInstalled.onclick = () => showTab('installed');
  tabCommunity.onclick = () => showTab('community');
  tabDebug.onclick = () => showTab('debug');

  // ── Stats ──
  function updateStats() {
    const all = api.registry.getAll();
    const enabled = all.filter(p => p.enabled).length;
    statsEl.textContent = `${all.length} plugins • ${enabled} enabled`;
  }

  // ── Installed Renderer (WITH BUTTONS RESTORED) ──
  function renderInstalled(filter = '') {
    const container = manager.querySelector('#installed-list');

    const html = api.registry.getAll()
      .filter(p => !filter || (p.name || p.id).toLowerCase().includes(filter))
      .map(p => {
        const isSelf = p.id === SELF_ID;

        return `
        <div style="background:#1c1c1f; border:1px solid #333; border-radius:16px; padding:20px;">
          <div style="display:flex; justify-content:space-between;">
            <div>
              <div style="font-weight:600">${p.name || p.id}</div>
              <div style="font-size:12px; color:#888">${p.id}</div>
            </div>
            <span style="color:${p.enabled ? '#4caf50' : '#ff6666'}">
              ${p.enabled ? 'Active' : 'Paused'}
            </span>
          </div>

          ${isSelf ? `<div style="color:#ffaa00; margin-top:10px;">🔒 Protected</div>` : ''}

          ${!isSelf ? `
          <div style="display:flex; gap:10px; margin-top:14px;">
            <button data-action="toggle" data-id="${p.id}">
              ${p.enabled ? 'Pause' : 'Resume'}
            </button>
            <button data-action="delete" data-id="${p.id}">
              Delete
            </button>
          </div>` : ''}
        </div>`;
      }).join('');

    container.innerHTML = html || 'No plugins';
    updateStats();
  }

  // ── Click Actions ──
  manager.querySelector('#installed-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === 'toggle') {
      await api.togglePlugin(id);
      renderInstalled(searchInput.value);
    }

    if (action === 'delete') {
      if (confirm(`Delete ${id}?`)) {
        api.deletePlugin(id);
        renderInstalled(searchInput.value);
      }
    }
  });

  // ── Search ──
  let t;
  searchInput.oninput = (e) => {
    clearTimeout(t);
    t = setTimeout(() => {
      renderInstalled(e.target.value.toLowerCase());
    }, 150);
  };

  // ── Debug ──
  function renderDebugPanel() {
    manager.querySelector('#debug-content').innerHTML = `
      Plugins: ${api.registry.getAll().length}<br>
      Version: ${api.version}
    `;
  }

  // ── Community ──
  async function loadCommunityPlugins() {
    const container = manager.querySelector('#community-list');

    try {
      const res = await fetch(COMMUNITY_JSON_URL + '?t=' + Date.now());
      const plugins = await res.json();

      container.innerHTML = plugins.map(p => `
        <div>
          <b>${p.name}</b>
          <button data-id="${p.id}" data-url="${p.url}">Install</button>
        </div>
      `).join('');
    } catch {
      container.innerHTML = 'Failed to load';
    }
  }

  // Install from community
  manager.querySelector('#community-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const { id, url } = btn.dataset;
    await api.installPlugin(id, url, id);
    renderInstalled();
  });

  // ── Manual Install ──
  manager.querySelector('#manual-install-btn').onclick = async () => {
    const id = manager.querySelector('#install-id').value.trim();
    const url = manager.querySelector('#install-url').value.trim();

    if (!id || !url) return alert('Missing fields');

    await api.installPlugin(id, url, id);
    renderInstalled();
    showTab('installed');
  };

  // ── Right Click Open ──
  api.boardEl.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.plugin-box')) return;
    e.preventDefault();

    manager.style.left = `${e.clientX}px`;
    manager.style.top = `${e.clientY}px`;
    manager.style.display = 'block';

    showTab('installed');
  });

  console.log('✅ Plugin Manager v1.2.0 FULL');
}

export function teardown() {
  console.log('🗑️ Plugin Manager unloaded');
}