export const meta = {
  id: 'plugin-manager',
  name: 'Plugin Manager',
  version: '3.0.0',
  compat: '>=3.3.0'
};

export function setup(api) {
  const SELF_ID = meta.id;
  const COMMUNITY_URL = 'https://raw.githubusercontent.com/dheeraz101/Empty_Plugins/refs/heads/main/plugins.json';

  // ───────── STYLE ─────────
  const style = document.createElement('style');
  style.textContent = `
    .pm-root {
      position: fixed;
      top: 80px;
      left: 240px;
      width: 850px;
      height: 75vh;
      display: none;
      z-index: 10000;

      background: #1c1c1f;
      border-radius: 16px;
      color: #fff;
      font-family: system-ui;
      border: 1px solid rgba(255,255,255,0.08);

      display:flex;
      flex-direction:column;
    }

    .pm-header {
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:14px 18px;
      border-bottom:1px solid rgba(255,255,255,0.08);
    }

    .pm-tabs {
      display:flex;
      border-bottom:1px solid rgba(255,255,255,0.05);
    }

    .pm-tab {
      flex:1;
      padding:12px;
      background:none;
      border:none;
      color:#888;
      cursor:pointer;
    }

    .pm-tab.active {
      color:#fff;
      border-bottom:2px solid #7c6fff;
    }

    .pm-body {
      flex:1;
      overflow:hidden;
    }

    .pm-panel {
      height:100%;
      overflow:auto;
      padding:16px;
    }

    .pm-card {
      background:#2a2a2e;
      padding:14px;
      border-radius:12px;
      margin-bottom:12px;
    }

    .pm-btn {
      margin-top:8px;
      padding:6px 10px;
      border:none;
      border-radius:8px;
      cursor:pointer;
    }

    .primary { background:#7c6fff; color:#fff; }
    .danger { background:#3a1a1a; color:#ff6666; }
    .secondary { background:#333; color:#ddd; }
  `;
  document.head.appendChild(style);

  // ───────── ROOT ─────────
  const root = document.createElement('div');
  root.className = 'pm-root';

  root.innerHTML = `
    <div class="pm-header">
      <div>
        <b>⚙️ Plugin Manager</b>
        <div id="pm-stats" style="font-size:12px;color:#888"></div>
      </div>
      <div>
        <a href="https://empty-ad9a3406.mintlify.app/" target="_blank" style="color:#7c6fff;margin-right:10px">Docs</a>
        <button id="pm-close" class="pm-btn">✕</button>
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

  // ───────── STATE ─────────
  let communityCache = [];

  // ───────── INSTALLED ─────────
  function renderInstalled() {
    const el = root.querySelector('#installed');
    const plugins = api.registry.getAll();

    el.innerHTML = plugins.map(p => `
      <div class="pm-card">
        <b>${p.name || p.id}</b>
        <div style="font-size:12px;color:#888">${p.id}</div>
        <div style="color:${p.enabled ? '#4caf50' : '#ff6666'}">
          ${p.enabled ? 'Active' : 'Paused'}
        </div>

        ${p.id !== SELF_ID ? `
          <button class="pm-btn secondary" data-act="toggle" data-id="${p.id}">
            ${p.enabled ? 'Pause' : 'Resume'}
          </button>
          <button class="pm-btn danger" data-act="delete" data-id="${p.id}">
            Delete
          </button>
        ` : `<div style="color:#ffaa00">Protected</div>`}
      </div>
    `).join('');

    root.querySelector('#pm-stats').textContent =
      `${plugins.length} plugins`;
  }

  // ───────── COMMUNITY ─────────
  async function loadCommunity() {
    if (communityCache.length) return communityCache;

    try {
      communityCache = await fetch(COMMUNITY_URL).then(r => r.json());
    } catch {
      communityCache = [];
    }

    return communityCache;
  }

  async function renderCommunity() {
    const el = root.querySelector('#community');
    const list = await loadCommunity();

    el.innerHTML = list.map(p => `
      <div class="pm-card">
        <div style="font-size:18px">${p.icon || '📦'}</div>
        <b>${p.name}</b>
        <div style="font-size:12px;color:#888">${p.author || 'Unknown'}</div>
        <div style="font-size:13px;margin-top:6px">${p.description || ''}</div>

        <button class="pm-btn primary"
          data-install="${p.id}"
          data-url="${p.url}">
          Install
        </button>
      </div>
    `).join('');
  }

  // ───────── EVENTS ─────────
  root.onclick = async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const id = btn.dataset.id;

    // toggle
    if (btn.dataset.act === 'toggle') {
      await api.togglePlugin(id);
      renderInstalled();
    }

    // delete (no confirm)
    if (btn.dataset.act === 'delete') {
      await api.deletePlugin(id);
      api.storage.remove(`plugin:${id}`);
      renderInstalled();
    }

    // install (no confirm)
    if (btn.dataset.install) {
      await api.installPlugin(btn.dataset.install, btn.dataset.url, btn.dataset.install);
      renderInstalled();
    }
  };

  // tabs
  root.querySelectorAll('.pm-tab').forEach(tab => {
    tab.onclick = () => {
      root.querySelectorAll('.pm-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      root.querySelector('#installed').style.display = 'none';
      root.querySelector('#community').style.display = 'none';

      root.querySelector('#' + tab.dataset.tab).style.display = 'block';

      if (tab.dataset.tab === 'community') renderCommunity();
    };
  });

  // open
  api.boardEl.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.pm-root')) return;
    e.preventDefault();

    root.style.display = 'flex';
    renderInstalled();
  });

  // close
  root.querySelector('#pm-close').onclick = () => {
    root.style.display = 'none';
  };

  console.log('🔥 Minimal Plugin Manager Loaded');
}

export function teardown() {}