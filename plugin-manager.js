export const meta = {
  id: 'plugin-manager',
  name: 'Plugin Manager',
  version: '2.1.0',
  compat: '>=3.3.0'
};

export function setup(api) {
  const SELF_ID = meta.id;
  const COMMUNITY_JSON_URL = 'https://raw.githubusercontent.com/dheeraz101/Empty_Plugins/refs/heads/main/plugins.json';

  // ─────────────────────────────
  // 🎨 STYLE SYSTEM
  // ─────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .pm-root {
      background: rgba(20,20,22,0.75);
      backdrop-filter: blur(30px);
      border-radius: 22px;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 40px 120px rgba(0,0,0,0.85);
      color: #f5f5f7;
      font-family: -apple-system, system-ui;
    }

    .pm-card {
      background: rgba(30,30,34,0.6);
      border-radius:16px;
      padding:16px;
      border:1px solid rgba(255,255,255,0.05);
      transition:all 0.25s;
    }

    .pm-card:hover {
      transform:translateY(-5px);
      box-shadow:0 20px 50px rgba(0,0,0,0.6);
    }

    .pm-btn {
      padding:10px 14px;
      border-radius:10px;
      border:none;
      cursor:pointer;
      font-weight:500;
    }

    .pm-btn.primary {
      background:linear-gradient(135deg,#7c6fff,#5a4fff);
      color:white;
    }

    .pm-btn.danger {
      background:#3a1a1a;
      color:#ff6666;
    }

    .pm-btn.secondary {
      background:#2a2a2e;
      color:#ddd;
    }

    .pm-input {
      width:100%;
      padding:12px;
      border-radius:10px;
      border:none;
      background:#2a2a2e;
      color:white;
      margin-bottom:10px;
    }

    @keyframes pm-pop {
      from { transform:scale(0.9); opacity:0 }
      to { transform:scale(1); opacity:1 }
    }
  `;
  document.head.appendChild(style);

  // ─────────────────────────────
  // 🪟 MODAL SYSTEM
  // ─────────────────────────────
  function createModal(html) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed; inset:0;
      background:rgba(0,0,0,0.6);
      backdrop-filter:blur(20px);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:99999;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background:#1c1c1f;
      border-radius:18px;
      padding:22px;
      width:400px;
      animation:pm-pop 0.2s ease;
    `;

    modal.innerHTML = html;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };

    return overlay;
  }

  // ─────────────────────────────
  // 🧱 ROOT
  // ─────────────────────────────
  const root = document.createElement('div');
  root.className = 'pm-root';
  root.style.cssText = `
    position:absolute;
    left:240px; top:70px;
    width:900px;
    max-height:95vh;
    display:none;
    resize:both;
    overflow:hidden;
    z-index:9999;
 `;

  root.innerHTML = `
    <div style="padding:20px; display:flex; justify-content:space-between;">
      <div>
        <div style="font-weight:600;">⚙️ Plugin Manager</div>
        <div id="pm-stats" style="font-size:12px;color:#888;"></div>
      </div>
      <button id="pm-close" class="pm-btn">✕</button>
    </div>

    <div style="display:flex;">
      <button class="pm-btn" data-tab="installed">Installed</button>
      <button class="pm-btn" data-tab="community">Community</button>
      <button class="pm-btn" data-tab="debug">Debug</button>
    </div>

    <div id="pm-installed">
      <input id="pm-search" class="pm-input" placeholder="Search">
      <div id="pm-installed-list"></div>
    </div>

    <div id="pm-community" style="display:none;">
      <div id="pm-community-list"></div>
    </div>

    <div id="pm-debug" style="display:none;"></div>

    <div style="padding:20px;">
      <input id="pm-id" class="pm-input" placeholder="plugin-id">
      <input id="pm-url" class="pm-input" placeholder="url">
      <button id="pm-install" class="pm-btn primary">Install</button>
    </div>
  `;

  api.boardEl.appendChild(root);
  api.makeDraggable(root);
  api.makeResizable(root);

  const statsEl = root.querySelector('#pm-stats');

  // ─────────────────────────────
  // 🔐 PROTECTION
  // ─────────────────────────────
  const origDelete = api.deletePlugin;
  const origToggle = api.togglePlugin;

  api.deletePlugin = (id) => id === SELF_ID ? false : origDelete(id);
  api.togglePlugin = async (id) => id === SELF_ID ? false : await origToggle(id);

  // ─────────────────────────────
  // 📦 DEPENDENCY SYSTEM
  // ─────────────────────────────
  async function installWithDeps(plugin, seen = new Set()) {
    if (seen.has(plugin.id)) return;
    seen.add(plugin.id);

    const list = await fetch(COMMUNITY_JSON_URL).then(r => r.json());

    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!api.registry.getAll().some(p => p.id === dep)) {
          const depPlugin = list.find(p => p.id === dep);
          if (!depPlugin) return api.notify(`Missing: ${dep}`, 'error');
          await installWithDeps(depPlugin, seen);
        }
      }
    }

    if (!api.registry.getAll().some(p => p.id === plugin.id)) {
      await api.installPlugin(plugin.id, plugin.url, plugin.id);
    }
  }

  // ─────────────────────────────
  // 🧩 RENDER INSTALLED
  // ─────────────────────────────
  function renderInstalled(filter = '') {
    const list = root.querySelector('#pm-installed-list');

    list.innerHTML = api.registry.getAll()
      .filter(p => p.id.includes(filter))
      .map(p => `
        <div class="pm-card">
          <b>${p.name || p.id}</b>
          <div style="color:#888">${p.id}</div>
          <div style="color:${p.enabled ? '#4caf50' : '#ff6666'}">
            ${p.enabled ? 'Active' : 'Paused'}
          </div>

          ${p.id !== SELF_ID ? `
            <button data-act="toggle" data-id="${p.id}" class="pm-btn secondary">Toggle</button>
            <button data-act="delete" data-id="${p.id}" class="pm-btn danger">Delete</button>
          ` : `<div style="color:#ffaa00;">Protected</div>`}
        </div>
      `).join('');

    statsEl.textContent = `${api.registry.getAll().length} plugins`;
  }

  // ─────────────────────────────
  // 🌍 COMMUNITY
  // ─────────────────────────────
  async function renderCommunity() {
    const list = root.querySelector('#pm-community-list');
    const plugins = await fetch(COMMUNITY_JSON_URL).then(r => r.json());

    list.innerHTML = plugins.map(p => `
      <div class="pm-card">
        <div>${p.icon || '📦'}</div>
        <b>${p.name}</b>
        <div style="color:#888">${p.author || ''}</div>
        <div>${p.description || ''}</div>

        <button class="pm-btn primary"
          data-install='${JSON.stringify(p)}'>
          Install
        </button>
      </div>
    `).join('');
  }

  // ─────────────────────────────
  // 🧠 EVENTS
  // ─────────────────────────────
  root.onclick = async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const id = btn.dataset.id;

    if (btn.dataset.act === 'toggle') {
      await api.togglePlugin(id);
      renderInstalled();
    }

    if (btn.dataset.act === 'delete') {
      const modal = createModal(`
        <b>Delete ${id}?</b>
        <div style="margin-top:10px;">
          <button id="yes" class="pm-btn danger">Delete</button>
          <button id="no" class="pm-btn">Cancel</button>
        </div>
      `);

      modal.querySelector('#yes').onclick = () => {
        api.deletePlugin(id);
        modal.remove();
        renderInstalled();
      };

      modal.querySelector('#no').onclick = () => modal.remove();
    }

    if (btn.dataset.install) {
      const plugin = JSON.parse(btn.dataset.install);

      const modal = createModal(`
        <b>Install ${plugin.name}?</b>
        <div style="margin:10px 0;">${plugin.description || ''}</div>
        <button id="go" class="pm-btn primary">Install</button>
      `);

      modal.querySelector('#go').onclick = async () => {
        await installWithDeps(plugin);
        modal.remove();
        renderInstalled();
      };
    }
  };

  root.querySelector('#pm-install').onclick = async () => {
    const id = root.querySelector('#pm-id').value;
    const url = root.querySelector('#pm-url').value;

    await installWithDeps({ id, url });
    renderInstalled();
  };

  root.querySelector('#pm-search').oninput = e =>
    renderInstalled(e.target.value.toLowerCase());

  // tabs
  root.querySelectorAll('[data-tab]').forEach(tab => {
    tab.onclick = () => {
      ['installed','community','debug'].forEach(p =>
        root.querySelector('#pm-' + p).style.display = 'none'
      );
      root.querySelector('#pm-' + tab.dataset.tab).style.display = 'block';

      if (tab.dataset.tab === 'community') renderCommunity();
    };
  });

  // open
  api.boardEl.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.pm-root')) return;
    e.preventDefault();
    root.style.display = 'block';
    renderInstalled();
  });

  console.log('🚀 Plugin Manager v2.1 (macOS-style)');
}

export function teardown() {}