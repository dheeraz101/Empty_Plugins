export const meta = {
  id: 'plugin-manager',
  name: 'Plugin Manager',
  version: '2.5.0',
  compat: '>=3.3.0'
};

export function setup(api) {
  const SELF_ID = meta.id;
  const COMMUNITY_JSON_URL = 'https://raw.githubusercontent.com/dheeraz101/Empty_Plugins/refs/heads/main/plugins.json';

  // ─────────────────────────────
  // 🎨 STYLE SYSTEM (APPLE FIXED)
  // ─────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .pm-root {
      backdrop-filter: blur(30px);
      background: rgba(20,20,22,0.75);
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 40px 120px rgba(0,0,0,0.85);
      color: #f5f5f7;
      font-family: -apple-system, system-ui;
      display:flex;
      flex-direction:column;
    }

    .pm-header {
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:18px 24px;
      border-bottom:1px solid rgba(255,255,255,0.08);
    }

    .pm-tabs {
      display:flex;
      border-bottom:1px solid rgba(255,255,255,0.05);
    }

    .pm-tab {
      flex:1;
      padding:14px;
      background:none;
      border:none;
      color:#aaa;
      cursor:pointer;
      font-weight:600;
    }

    .pm-tab.active {
      color:#fff;
      border-bottom:3px solid #7c6fff;
    }

    .pm-body {
      flex:1;
      overflow:hidden;
      display:flex;
      flex-direction:column;
    }

    .pm-panel {
      flex:1;
      overflow:auto;
      padding:20px;
    }

    .pm-grid {
      display:grid;
      grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
      gap:16px;
    }

    .pm-card {
      background:rgba(30,30,34,0.6);
      border-radius:14px;
      padding:16px;
      border:1px solid rgba(255,255,255,0.05);
      transition:all 0.25s;
    }

    .pm-card:hover {
      transform:translateY(-4px);
      box-shadow:0 20px 50px rgba(0,0,0,0.6);
    }

    .pm-btn {
      padding:8px 12px;
      border-radius:10px;
      border:none;
      cursor:pointer;
      margin-top:8px;
    }

    .primary { background:#7c6fff; color:white; }
    .danger { background:#3a1a1a; color:#ff6666; }
    .secondary { background:#2a2a2e; color:#ddd; }

    /* MODAL */
    .pm-modal-bg {
      position:fixed;
      inset:0;
      background:rgba(0,0,0,0.5);
      backdrop-filter:blur(10px);
      z-index:999999;
      display:flex;
      align-items:center;
      justify-content:center;
    }

    .pm-modal {
      background:#1c1c1f;
      padding:24px;
      border-radius:16px;
      width:320px;
    }
  `;
  document.head.appendChild(style);

  // ─────────────────────────────
  // 🧱 ROOT
  // ─────────────────────────────
  const root = document.createElement('div');
  root.className = 'pm-root';
  root.style.cssText = `
    position:absolute;
    left:240px;
    top:80px;
    width:900px;
    height:80vh;
    display:none;
    resize:both;
    z-index:9999;
  `;

  root.innerHTML = `
    <div class="pm-header">
      <div>
        <div style="font-weight:600">⚙️ Plugin Manager</div>
        <div id="stats" style="font-size:12px;color:#888"></div>
      </div>
      <div>
        <a href="https://empty-ad9a3406.mintlify.app/" target="_blank" style="margin-right:10px;color:#7c6fff">Docs</a>
        <button id="restart" class="pm-btn secondary">Restart</button>
        <button id="close" class="pm-btn">✕</button>
      </div>
    </div>

    <div class="pm-tabs">
      <button class="pm-tab active" data-tab="installed">Installed</button>
      <button class="pm-tab" data-tab="community">Community</button>
      <button class="pm-tab" data-tab="debug">Debug</button>
    </div>

    <div class="pm-body">
      <div id="installed" class="pm-panel"></div>
      <div id="community" class="pm-panel" style="display:none"></div>
      <div id="debug" class="pm-panel" style="display:none"></div>
    </div>
  `;

  api.boardEl.appendChild(root);
  api.makeDraggable(root);
  api.makeResizable(root);

  // ─────────────────────────────
  // 🪟 MODAL FIX
  // ─────────────────────────────
  function modal(text, onYes) {
    const bg = document.createElement('div');
    bg.className = 'pm-modal-bg';

    bg.innerHTML = `
      <div class="pm-modal">
        <div style="margin-bottom:16px">${text}</div>
        <button id="yes" class="pm-btn primary">Confirm</button>
        <button id="no" class="pm-btn">Cancel</button>
      </div>
    `;

    document.body.appendChild(bg);

    bg.querySelector('#yes').onclick = () => {
      onYes();
      bg.remove();
    };
    bg.querySelector('#no').onclick = () => bg.remove();
  }

  // ─────────────────────────────
  // 📦 INSTALL
  // ─────────────────────────────
  async function install(id, url) {
    await api.installPlugin(id, url, id);
    renderInstalled();
  }

  // ─────────────────────────────
  // 🧩 INSTALLED
  // ─────────────────────────────
  function renderInstalled() {
    const el = root.querySelector('#installed');

    el.innerHTML = api.registry.getAll().map(p => `
      <div class="pm-card">
        <b>${p.name || p.id}</b>
        <div style="font-size:12px;color:#888">${p.id}</div>
        <div style="color:${p.enabled ? '#4caf50' : '#ff6666'}">
          ${p.enabled ? 'Active' : 'Paused'}
        </div>

        ${p.id !== SELF_ID ? `
          <button class="pm-btn secondary" data-act="toggle" data-id="${p.id}">Toggle</button>
          <button class="pm-btn danger" data-act="delete" data-id="${p.id}">Delete</button>
        ` : `<div style="color:#ffaa00">Protected</div>`}
      </div>
    `).join('');

    root.querySelector('#stats').textContent =
      `${api.registry.getAll().length} plugins`;
  }

  // ─────────────────────────────
  // 🌍 COMMUNITY
  // ─────────────────────────────
  async function renderCommunity() {
    const el = root.querySelector('#community');

    const list = await fetch(COMMUNITY_JSON_URL).then(r => r.json());

    el.innerHTML = list.map(p => `
      <div class="pm-card">
        <b>${p.name}</b>
        <div style="font-size:12px;color:#888">${p.author}</div>
        <p>${p.description}</p>
        <button class="pm-btn primary" data-id="${p.id}" data-url="${p.url}">
          Install
        </button>
      </div>
    `).join('');
  }

  // ─────────────────────────────
  // 🧪 DEBUG (NOW USEFUL)
  // ─────────────────────────────
  function renderDebug() {
    const el = root.querySelector('#debug');
    const all = api.registry.getAll();

    el.innerHTML = `
      Total Plugins: ${all.length}<br>
      Enabled: ${all.filter(p => p.enabled).length}<br>
      API Version: ${api.version}<br><br>
      IDs:<br>
      ${all.map(p => p.id).join('<br>')}
    `;
  }

  // ─────────────────────────────
  // 🎯 EVENTS
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
      modal(`Delete ${id}?`, () => {
        api.deletePlugin(id);
        renderInstalled();
      });
    }

    if (btn.dataset.url) {
      modal(`Install ${id}?`, () => install(id, btn.dataset.url));
    }
  };

  // tabs
  root.querySelectorAll('.pm-tab').forEach(tab => {
    tab.onclick = () => {
      root.querySelectorAll('.pm-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      ['installed','community','debug'].forEach(p =>
        root.querySelector('#'+p).style.display = 'none'
      );

      root.querySelector('#'+tab.dataset.tab).style.display = 'block';

      if (tab.dataset.tab === 'community') renderCommunity();
      if (tab.dataset.tab === 'debug') renderDebug();
    };
  });

  // close FIXED
  root.querySelector('#close').onclick = () => {
    root.style.display = 'none';
  };

  root.querySelector('#restart').onclick = () => api.restart();

  // open
  api.boardEl.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.pm-root')) return;
    e.preventDefault();

    root.style.display = 'block';
    renderInstalled();
  });

  console.log('🔥 Plugin Manager v2.5 FIXED');
}

export function teardown() {}