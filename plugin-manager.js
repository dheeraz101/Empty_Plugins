export const meta = {
  id: 'plugin-manager',
  name: 'Plugin Manager',
  version: '3.4.5',
  compat: '>=3.3.0'
};

export function setup(api) {
  const SELF_ID = meta.id;
  const COMMUNITY_URL = 'https://raw.githubusercontent.com/dheeraz101/Empty_Plugins/refs/heads/main/plugins.json';

  // ───────── STYLE (UNCHANGED UI) ─────────
  const style = document.createElement('style');
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

  `;
  document.head.appendChild(style);

  // ───────── ROOT ─────────
  const root = document.createElement('div');
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

   // ───────── FIX: CLOSE BUTTON ─────────
  root.querySelector('#pm-close').onclick = () => {
    root.style.display = 'none';
  };

  // ───────── FIX: ESC KEY CLOSE ─────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.style.display === 'flex') {
      root.style.display = 'none';
    }
  });

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

    // 🔥 FIX: bring modal above everything
    const overlay = document.querySelector('div[style*="z-index: 100001"]');
    if (overlay) overlay.style.zIndex = 2147483648;

    // ❌ CLOSE BUTTON FIX
    wrap.querySelector('#pm-modal-close').onclick = () => {
      modal.close();
    };

    // INSTALL LOGIC
    wrap.querySelector('#pm-install').onclick = async () => {
      const url = wrap.querySelector('#pm-url').value.trim();
      const id = wrap.querySelector('#pm-id').value.trim();

      if (!url || !id) return api.notify('Missing fields', 'error');

      try {
        cleanupPluginUI(id);
        await api.installPlugin(id, url, id);
        api.notify('Installed', 'success');
        modal.close();
      } catch {
        api.notify('Install failed', 'error');
      }
    };
  }

  const installBtn = document.createElement('button');
  installBtn.className = 'pm-btn primary';
  installBtn.textContent = 'Install via URL';
  installBtn.onclick = openInstallModal;

  root.querySelector('#pm-actions').appendChild(installBtn);

  // ───────── RENDER ─────────
  function renderInstalled() {
    const el = root.querySelector('#installed');
    const plugins = api.registry.getAll();

    el.innerHTML = plugins.map(p => `
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
            
            <div style="font-size:11px;color:#7c6fff;margin-top:2px">
              ${p.author ? 'by ' + p.author : ''}
            </div>

            <div style="font-size:11px;color:#666;margin-top:2px">
              ${p.id}
            </div>
          </div>

        </div>

        <div style="margin-top:12px">
          ${
            p.id !== SELF_ID
              ? `
              <button class="pm-btn secondary" data-act="toggle" data-id="${p.id}">
                ${p.enabled ? 'Pause' : 'Resume'}
              </button>
              <button class="pm-btn danger" data-act="delete" data-id="${p.id}">
                Delete
              </button>`
              : `<span style="color:#ffaa00;font-size:12px">System Protected</span>`
          }
        </div>
      </div>
    `).join('');
  }

  let communityCache = [];

  async function renderCommunity() {
    const el = root.querySelector('#community');

    if (!communityCache.length) {
      try {
        communityCache = await fetch(COMMUNITY_URL).then(r => r.json());
      } catch {
        communityCache = [];
      }
    }

    const installed = new Set(api.registry.getAll().map(p => p.id));

    el.innerHTML = communityCache.map(p => `
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
              : `<button class="pm-btn primary" style="width:100%" data-install="${p.id}" data-url="${p.url}">
                  Install Plugin
                </button>`
          }
        </div>
      </div>
    `).join('');
  }

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

      if (tab.dataset.tab === 'community') renderCommunity();
    };
  });

  api.boardEl.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.pm-root')) return;
    e.preventDefault();
    root.style.display = 'flex';
    renderInstalled();
  });

  console.log('🔥 Plugin Manager v3.4.5 (UI + Core Fixed)');
}

export function teardown() {}