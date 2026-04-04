// ╔════════════════════════════════════════════════════════════╗
// ║  ROLLBACK MANAGER  v2.1.0                                  ║
// ║  • "Manage Snapshots" button injected after "Install via   ║
// ║    URL" in the Plugin Manager sidebar via registerUI       ║
// ║  • Selector popup: choose up to 10 plugins to track       ║
// ║  • Snapshots are LOCKED — never auto-overwritten           ║
// ║  • Per-card: ↩ rollback btn + ⚙ manage btn               ║
// ║  • Manage popup: Regenerate / Delete / Stop Tracking       ║
// ╚════════════════════════════════════════════════════════════╝

export const meta = {
  id: 'rollback-manager',
  name: 'Rollback Manager',
  version: '2.1.0',
  compat: '>=4.0.0'
};

let apiRef = null;
let style = null;
let originalReloadPlugin = null;
let pollInterval = null;

// ── Constants ─────────────────────────────────────────────────────────────────
const SNAPSHOT_KEY = 'rb_snapshots'; // { [id]: { code, version, url, timestamp } }
const TRACKED_KEY  = 'rb_tracked';   // string[]
const MAX_TRACKED  = 10;

// ── Storage helpers ───────────────────────────────────────────────────────────
function loadSnapshots() {
  try { return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}'); } catch { return {}; }
}
function saveSnapshots(obj) {
  try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(obj)); }
  catch(e) { console.error('[Rollback] localStorage quota?', e); }
}
function loadTracked() {
  try { return JSON.parse(localStorage.getItem(TRACKED_KEY) || '[]'); } catch { return []; }
}
function saveTracked(arr) { localStorage.setItem(TRACKED_KEY, JSON.stringify(arr)); }

function getSnapshot(id)       { return loadSnapshots()[id] || null; }
function setSnapshot(id, data) { const a = loadSnapshots(); a[id] = data; saveSnapshots(a); }
function deleteSnapshot(id)    { const a = loadSnapshots(); delete a[id]; saveSnapshots(a); }
function isTracked(id)         { return loadTracked().includes(id); }
function addTracked(id)        { const l = loadTracked(); if (!l.includes(id)) { l.push(id); saveTracked(l); } }
function removeTracked(id)     { saveTracked(loadTracked().filter(x => x !== id)); deleteSnapshot(id); }

// ── Fetch plugin source ───────────────────────────────────────────────────────
async function fetchCode(url) {
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) return null;
  try {
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(url + sep + 't=' + Date.now());
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

// ── Capture snapshot ──────────────────────────────────────────────────────────
async function captureSnapshot(api, pluginId) {
  const entry = api.registry.getAll().find(p => p.id === pluginId);
  if (!entry) return false;

  const remoteUrl = (entry.originalUrl && !entry.originalUrl.startsWith('blob:') && !entry.originalUrl.startsWith('data:'))
    ? entry.originalUrl
    : entry.url;

  const code = await fetchCode(remoteUrl);
  if (!code) return false;

  setSnapshot(pluginId, {
    code,
    version: entry.version || null,
    url: remoteUrl,
    timestamp: Date.now()
  });

  console.log('[Rollback] Captured ' + pluginId + ' v' + (entry.version || '?'));
  return true;
}

function createDataUrl(code) {
  return 'data:application/javascript;charset=utf-8,' + encodeURIComponent(code);
}

// ── CSS ───────────────────────────────────────────────────────────────────────
function buildCSS() {
  return `
    /* ── Sidebar "Manage Snapshots" button ── */
    .rb-sidebar-btn {
      width: 100%;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 500;
      color: #d97706;
      background: rgba(255,149,0,0.08);
      border: 1px solid rgba(255,149,0,0.18);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 9px;
      transition: all 0.15s ease;
      margin-top: 2px;
    }
    .rb-sidebar-btn:hover {
      background: rgba(255,149,0,0.15);
      color: #b45309;
      border-color: rgba(255,149,0,0.28);
    }

    /* ── Per-card rollback button ── */
    .pm-btn-rollback {
      background: rgba(255,149,0,0.1);
      color: #d97706;
      border: 1px solid rgba(255,149,0,0.15);
      padding: 6px 10px;
      border-radius: 999px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.18s;
      white-space: nowrap;
    }
    .pm-btn-rollback:hover {
      background: rgba(255,149,0,0.18);
      color: #b45309;
      border-color: rgba(255,149,0,0.25);
    }

    /* ── Per-card manage (gear) button ── */
    .pm-btn-rb-gear {
      background: rgba(0,0,0,0.04);
      border: 1px solid rgba(0,0,0,0.08);
      color: #8e8e93;
      width: 30px; height: 30px; min-width: 30px;
      border-radius: 50%;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
      padding: 0;
    }
    .pm-btn-rb-gear:hover { background: rgba(0,0,0,0.08); color: #1d1d1f; }

    /* ── Overlay + modal base ── */
    .rb-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.22);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      animation: rb-fi 0.18s ease;
    }
    @keyframes rb-fi { from { opacity:0 } to { opacity:1 } }

    .rb-modal {
      background: rgba(255,255,255,0.97);
      border-radius: 22px;
      padding: 28px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06);
      border: 1px solid rgba(0,0,0,0.08);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", Helvetica Neue, sans-serif;
      width: 480px;
      max-width: calc(100vw - 40px);
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      animation: rb-su 0.2s cubic-bezier(0.16,1,0.3,1);
    }
    @keyframes rb-su { from { transform:translateY(10px);opacity:0 } to { transform:none;opacity:1 } }

    .rb-title  { font-size:20px; font-weight:700; color:#1d1d1f; margin:0 0 3px; letter-spacing:-0.3px; flex-shrink:0; }
    .rb-sub    { font-size:13px; color:#8e8e93; margin:0 0 18px; flex-shrink:0; }
    .rb-hr     { height:1px; background:rgba(0,0,0,0.08); margin:0 0 18px; flex-shrink:0; }
    .rb-info   { font-size:13px; color:#6e6e73; margin-bottom:18px; line-height:1.65; }
    .rb-info strong { color:#1d1d1f; }

    /* Plugin selector list */
    .rb-list {
      overflow-y: auto; flex:1;
      display: flex; flex-direction: column; gap:8px;
      margin-bottom:18px;
      scrollbar-width:thin; scrollbar-color:rgba(0,0,0,0.1) transparent;
    }
    .rb-row {
      display:flex; align-items:center; gap:12px;
      padding:10px 14px; border-radius:12px;
      border:1.5px solid rgba(0,0,0,0.08);
      cursor:pointer; transition:all 0.14s; user-select:none;
    }
    .rb-row:hover:not(.rb-dis) { background:rgba(0,0,0,0.025); border-color:rgba(0,0,0,0.13); }
    .rb-row.rb-sel { background:rgba(0,122,255,0.06); border-color:rgba(0,122,255,0.35); }
    .rb-row.rb-dis { opacity:0.4; cursor:not-allowed; }

    .rb-chk {
      width:20px; height:20px; border-radius:50%;
      border:2px solid rgba(0,0,0,0.2);
      display:flex; align-items:center; justify-content:center;
      flex-shrink:0; transition:all 0.14s;
    }
    .rb-row.rb-sel .rb-chk { background:#007AFF; border-color:#007AFF; }
    .rb-dot { width:8px; height:8px; border-radius:50%; background:white; opacity:0; transition:opacity 0.14s; }
    .rb-row.rb-sel .rb-dot { opacity:1; }

    .rb-pname { font-size:14px; font-weight:600; color:#1d1d1f; }
    .rb-pid   { font-size:12px; color:#8e8e93; }
    .rb-snap-ok {
      margin-left:auto; font-size:11px; font-weight:600;
      padding:2px 8px; border-radius:999px;
      background:rgba(52,199,89,0.15); color:#248a3d; white-space:nowrap;
    }
    .rb-limit { font-size:12px; color:#ff9500; text-align:center; margin-bottom:13px; flex-shrink:0; }

    /* Action row */
    .rb-actions { display:flex; gap:10px; flex-shrink:0; }
    .rb-actions button {
      flex:1; padding:11px 16px; border-radius:999px;
      font-size:14px; font-weight:600; border:none; cursor:pointer; transition:all 0.18s;
    }
    .rb-cancel { background:rgba(0,0,0,0.05); color:#1d1d1f; }
    .rb-cancel:hover { background:rgba(0,0,0,0.09); }
    .rb-primary { background:#007AFF; color:white; }
    .rb-primary:hover { background:#0066dd; }
    .rb-warn { background:#ff9500; color:white; }
    .rb-warn:hover { background:#e08600; }
    .rb-danger { background:rgba(255,59,48,0.1); color:#ff3b30; border:1px solid rgba(255,59,48,0.18) !important; }
    .rb-danger:hover { background:rgba(255,59,48,0.18); }

    /* Manage grid */
    .rb-mgrid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:18px; }

    /* Version row */
    .rb-ver-old   { color:#8e8e93; text-decoration:line-through; }
    .rb-ver-arrow { color:#8e8e93; margin:0 4px; }
    .rb-ver-new   { color:#ff9500; font-weight:700; }

    .rb-confirm-desc { font-size:14px; color:#6e6e73; margin:12px 0 22px; line-height:1.55; }

    /* Spinner */
    .rb-spin {
      display:inline-block; width:13px; height:13px;
      border:2px solid rgba(255,255,255,0.35); border-top-color:white;
      border-radius:50%; animation:rb-sp 0.7s linear infinite;
      vertical-align:middle; margin-right:4px;
    }
    @keyframes rb-sp { to { transform:rotate(360deg); } }

    /* ── Dark mode ── */
    @media (prefers-color-scheme: dark) {
      .rb-sidebar-btn { color:#ffb340; background:rgba(255,149,0,0.12); border-color:rgba(255,149,0,0.22); }
      .rb-sidebar-btn:hover { background:rgba(255,149,0,0.2); color:#ffc566; }
      .pm-btn-rollback { background:rgba(255,149,0,0.15); color:#ffb340; border-color:rgba(255,149,0,0.2); }
      .pm-btn-rollback:hover { background:rgba(255,149,0,0.25); color:#ffc566; }
      .pm-btn-rb-gear { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.1); color:#8e8e93; }
      .pm-btn-rb-gear:hover { background:rgba(255,255,255,0.14); color:#f5f5f7; }
      .rb-modal { background:rgba(30,30,32,0.97); border-color:rgba(255,255,255,0.1); box-shadow:0 24px 60px rgba(0,0,0,0.5); }
      .rb-title { color:#f5f5f7; }
      .rb-sub   { color:#6e6e73; }
      .rb-hr    { background:rgba(255,255,255,0.08); }
      .rb-info  { color:#a1a1a6; }
      .rb-info strong { color:#f5f5f7; }
      .rb-row { border-color:rgba(255,255,255,0.1); }
      .rb-row:hover:not(.rb-dis) { background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.16); }
      .rb-row.rb-sel { background:rgba(0,122,255,0.12); border-color:rgba(10,132,255,0.4); }
      .rb-pname { color:#f5f5f7; }
      .rb-cancel { background:rgba(255,255,255,0.1); color:#f5f5f7; }
      .rb-cancel:hover { background:rgba(255,255,255,0.16); }
      .rb-limit { color:#ffb340; }
      .rb-confirm-desc { color:#a1a1a6; }
    }
  `;
}

// ── Setup ─────────────────────────────────────────────────────────────────────
export async function setup(api) {
  apiRef = api;

  style = document.createElement('style');
  style.textContent = buildCSS();
  document.head.appendChild(style);

  // ── Intercept reloadPlugin ─────────────────────────────────────────────────
  // ONLY opportunistically captures if tracked but no snapshot exists yet.
  // Snapshots are NEVER auto-overwritten on update — must be manually regenerated.
  originalReloadPlugin = api.reloadPlugin;
  api.reloadPlugin = async function(id) {
    const entry = api.registry.getAll().find(p => p.id === id);
    const isRollbackReload = entry?.url?.startsWith('data:');
    if (!isRollbackReload && isTracked(id) && !getSnapshot(id)) {
      console.log('[Rollback] Opportunistic capture for ' + id);
      await captureSnapshot(api, id);
    }
    return originalReloadPlugin.call(api, id);
  };

  // ── Inject "Manage Snapshots" button after Install via URL ─────────────────
  function tryInjectSidebarButton() {
    const pmActions = document.querySelector('#pm-actions');
    if (!pmActions || pmActions.querySelector('.rb-sidebar-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'rb-sidebar-btn';
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 14 4 9 9 4"/>
        <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
      </svg>
      Manage Snapshots
    `;
    btn.title = 'Manage Rollback Snapshots';
    btn.onclick = (e) => {
      e.stopPropagation();
      openSelectorPopup(api);
    };

    pmActions.appendChild(btn);
  }

  pollInterval = setInterval(() => {
    const pmRoot = document.querySelector('.pm-root');
    if (!pmRoot || pmRoot.style.display === 'none') return;
    tryInjectSidebarButton();
    injectCardButtons(api);
  }, 600);

  document.addEventListener('click', e => {
    const rb = e.target.closest('[data-rb-rollback]');
    if (rb) {
      e.preventDefault();
      e.stopPropagation();
      openRollbackConfirm(api, rb.dataset.rbRollback);
      return;
    }

    const mg = e.target.closest('[data-rb-manage]');
    if (mg) {
      e.preventDefault();
      e.stopPropagation();
      openManagePopup(api, mg.dataset.rbManage);
      return;
    }
  }, true);

  await new Promise(r => setTimeout(r, 700));
  openSelectorPopup(api);

  console.log('🔙 Rollback Manager v2.1.0 loaded');
}

// ── POPUP 1 — Plugin Selector ─────────────────────────────────────────────────
function openSelectorPopup(api) {
  const registry = api.registry.getAll();
  const eligible = registry.filter(p => p.id !== 'rollback-manager' && p.id !== 'plugin-manager');
  const selectedSet = new Set(loadTracked());

  const overlay = document.createElement('div');
  overlay.className = 'rb-overlay';

  function render() {
    const atLimit = selectedSet.size >= MAX_TRACKED;

    overlay.innerHTML = `
      <div class="rb-modal">
        <h3 class="rb-title">🛡️ Rollback Manager</h3>
        <p class="rb-sub">
          Select plugins to protect. Max ${MAX_TRACKED}.
          Snapshots are <strong>locked</strong> until you manually regenerate.
        </p>
        <div class="rb-hr"></div>
        ${atLimit ? `<div class="rb-limit">⚠️ Limit reached (${MAX_TRACKED}). Deselect one to add another.</div>` : ''}
        <div class="rb-list">
          ${eligible.length === 0
            ? `<div style="text-align:center;color:#8e8e93;padding:20px;font-size:14px">No eligible plugins installed.</div>`
            : eligible.map(p => {
                const snap = getSnapshot(p.id);
                const sel  = selectedSet.has(p.id);
                const dis  = !sel && atLimit;
                return `
                  <div class="rb-row ${sel ? 'rb-sel' : ''} ${dis ? 'rb-dis' : ''}" data-rbsel="${p.id}">
                    <div class="rb-chk"><div class="rb-dot"></div></div>
                    <div>
                      <div class="rb-pname">${p.name || p.id}</div>
                      <div class="rb-pid">${p.id}${p.version ? ' · v' + p.version : ''}</div>
                    </div>
                    ${snap ? `<span class="rb-snap-ok">✓ v${snap.version || '?'}</span>` : ''}
                  </div>`;
              }).join('')}
        </div>
        <div class="rb-actions">
          <button class="rb-cancel" id="rb-sel-cancel">Cancel</button>
          <button class="rb-primary" id="rb-sel-save">
            Save &amp; Capture${selectedSet.size > 0 ? ' (' + selectedSet.size + ')' : ''}
          </button>
        </div>
      </div>
    `;

    overlay.querySelectorAll('[data-rbsel]').forEach(row => {
      row.addEventListener('click', () => {
        if (row.classList.contains('rb-dis')) return;
        const id = row.dataset.rbsel;
        selectedSet.has(id) ? selectedSet.delete(id) : (selectedSet.size < MAX_TRACKED && selectedSet.add(id));
        render();
      });
    });

    overlay.querySelector('#rb-sel-cancel').onclick = () => overlay.remove();

    overlay.querySelector('#rb-sel-save').onclick = async () => {
      const btn = overlay.querySelector('#rb-sel-save');
      btn.innerHTML = '<span class="rb-spin"></span> Capturing…';
      btn.disabled = true;

      const prev = new Set(loadTracked());
      for (const id of prev) {
        if (!selectedSet.has(id)) removeTracked(id);
      }

      let captured = 0;
      for (const id of selectedSet) {
        addTracked(id);
        if (!getSnapshot(id)) {
          const ok = await captureSnapshot(api, id);
          if (ok) captured++;
        }
      }

      overlay.remove();
      api.notify(`✓ Tracking ${selectedSet.size} plugin(s). ${captured} new snapshot(s) saved.`, 'success');
    };
  }

  render();
  document.documentElement.appendChild(overlay);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });
}

// ── POPUP 2 — Manage snapshot ─────────────────────────────────────────────────
function openManagePopup(api, pluginId) {
  const entry = api.registry.getAll().find(p => p.id === pluginId);
  if (!entry) return;

  const snap       = getSnapshot(pluginId);
  const currentVer = entry.version || entry.remoteVersion || 'unknown';
  const snapVer    = snap?.version || 'none';
  const snapDate   = snap?.timestamp ? new Date(snap.timestamp).toLocaleString() : '—';

  const overlay = document.createElement('div');
  overlay.className = 'rb-overlay';
  overlay.innerHTML = `
    <div class="rb-modal">
      <h3 class="rb-title">Manage Snapshot</h3>
      <p class="rb-sub">${entry.name || pluginId}</p>
      <div class="rb-hr"></div>
      <div class="rb-info">
        <strong>Plugin ID:</strong> ${pluginId}<br>
        <strong>Installed version:</strong> v${currentVer}<br>
        ${snap
          ? `<strong>Snapshot version:</strong> v${snapVer}<br><strong>Captured:</strong> ${snapDate}`
          : `<span style="color:#ff9500">⚠️ No snapshot saved yet.</span>`}
      </div>
      <div class="rb-mgrid">
        <button class="rb-primary" id="rb-mg-regen">🔄 Regenerate Snapshot</button>
        <button class="rb-cancel" id="rb-mg-del" ${!snap ? 'disabled style="opacity:0.42"' : ''}>🗑 Delete Snapshot</button>
        <button class="rb-danger" id="rb-mg-stop" style="grid-column:1/-1">✕ Stop Tracking This Plugin</button>
      </div>
      <div class="rb-actions">
        <button class="rb-cancel" id="rb-mg-close">Close</button>
      </div>
    </div>
  `;

  document.documentElement.appendChild(overlay);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelector('#rb-mg-close').onclick = () => overlay.remove();

  overlay.querySelector('#rb-mg-regen').onclick = async () => {
    const btn = overlay.querySelector('#rb-mg-regen');
    btn.innerHTML = '<span class="rb-spin"></span> Fetching…';
    btn.disabled = true;

    const ok = await captureSnapshot(api, pluginId);
    overlay.remove();

    if (ok) {
      const ns = getSnapshot(pluginId);
      api.notify(`✓ Snapshot regenerated: ${pluginId} v${ns?.version || '?'}`, 'success');
    } else {
      api.notify('Could not fetch plugin source. Check network/URL.', 'error');
    }
  };

  overlay.querySelector('#rb-mg-del').onclick = () => {
    deleteSnapshot(pluginId);
    overlay.remove();
    api.notify(`Snapshot deleted. ${pluginId} is still tracked.`, 'info');
  };

  overlay.querySelector('#rb-mg-stop').onclick = () => {
    removeTracked(pluginId);
    overlay.remove();
    api.notify(`${pluginId} removed from Rollback tracking.`, 'info');
  };
}

// ── POPUP 3 — Rollback confirm ────────────────────────────────────────────────
function openRollbackConfirm(api, pluginId) {
  const entry = api.registry.getAll().find(p => p.id === pluginId);
  if (!entry) return;

  const snap = getSnapshot(pluginId);
  if (!snap?.code) return api.notify('No snapshot available', 'warning');

  const currentVer = entry.version || entry.remoteVersion || 'unknown';
  const snapVer    = snap.version || 'unknown';

  const overlay = document.createElement('div');
  overlay.className = 'rb-overlay';
  overlay.innerHTML = `
    <div class="rb-modal">
      <h3 class="rb-title">Revert ${entry.name || pluginId}</h3>
      <div class="rb-hr"></div>
      <div style="font-size:14px;margin-bottom:4px">
        <span class="rb-ver-old">v${currentVer}</span>
        <span class="rb-ver-arrow">→</span>
        <span class="rb-ver-new">v${snapVer}</span>
      </div>
      <p class="rb-confirm-desc">
        The plugin will be replaced with the <strong>v${snapVer}</strong> snapshot and reloaded.<br><br>
        <span style="color:#ff9500;font-size:13px">
          ⚠️ Snapshot stays locked after rollback.
          Use ⚙️ Manage Snapshot to regenerate it.
        </span>
      </p>
      <div class="rb-actions">
        <button class="rb-cancel" id="rb-cf-cancel">Cancel</button>
        <button class="rb-warn" id="rb-cf-ok">Revert to v${snapVer}</button>
      </div>
    </div>
  `;

  document.documentElement.appendChild(overlay);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelector('#rb-cf-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#rb-cf-ok').onclick = async () => {
    overlay.remove();
    await performRollback(api, pluginId);
  };
}

// ── Core rollback ─────────────────────────────────────────────────────────────
async function performRollback(api, pluginId) {
  const snap = getSnapshot(pluginId);
  if (!snap?.code) return api.notify('No snapshot to roll back to', 'warning');

  const registry = api.registry.getAll();
  const entry = registry.find(p => p.id === pluginId);
  if (!entry) return api.notify('Plugin not found', 'error');

  try {
    const remoteUrl = (entry.originalUrl && !entry.originalUrl.startsWith('blob:') && !entry.originalUrl.startsWith('data:'))
      ? entry.originalUrl
      : (snap.url || entry.url);

    entry.url = createDataUrl(snap.code);
    entry.originalUrl = remoteUrl;
    entry.version = snap.version;
    api.registry.save([...registry]);

    await originalReloadPlugin.call(api, pluginId);

    const reg2 = api.registry.getAll();
    const ent2 = reg2.find(p => p.id === pluginId);
    if (ent2 && ent2.version !== snap.version) {
      ent2.version = snap.version;
      api.registry.save([...reg2]);
    }

    api.notify(`✓ Rolled back ${entry.name || pluginId} to v${snap.version}`, 'success');
  } catch(e) {
    console.error('[Rollback] performRollback failed', e);
    api.notify('Rollback failed — check console', 'error');
  }
}

// ── Inject per-card buttons ───────────────────────────────────────────────────
function injectCardButtons(api) {
  const pmList = document.querySelector('#installed .pm-list');
  if (!pmList) return;

  const registry = api.registry.getAll();

  pmList.querySelectorAll('.plugin-item').forEach(item => {
    let pluginId = item.dataset.pluginId;
    if (!pluginId) {
      const idSpan = item.querySelector('.plugin-meta span');
      pluginId = idSpan?.textContent?.trim();
    }
    if (!pluginId || !isTracked(pluginId)) return;

    const plugin = registry.find(p => p.id === pluginId);
    if (!plugin) return;

    const actionGroup = item.querySelector('.pm-action-group');
    if (!actionGroup) return;

    actionGroup.querySelector('[data-rb-rollback]')?.remove();
    actionGroup.querySelector('[data-rb-manage]')?.remove();

    const gearBtn = document.createElement('button');
    gearBtn.className = 'pm-btn pm-btn-rb-gear';
    gearBtn.dataset.rbManage = pluginId;
    gearBtn.title = 'Manage Rollback Snapshot';
    gearBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
      </svg>`;
    actionGroup.appendChild(gearBtn);

    const snap = getSnapshot(pluginId);
    if (snap?.code && snap.version) {
      const currentVer = plugin.version || plugin.remoteVersion;
      if (currentVer && snap.version !== currentVer) {
        const rbBtn = document.createElement('button');
        rbBtn.className = 'pm-btn pm-btn-rollback';
        rbBtn.dataset.rbRollback = pluginId;
        rbBtn.title = `Revert to v${snap.version}`;
        rbBtn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 14 4 9 9 4"/>
            <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
          </svg>
          v${snap.version}
        `;
        const updateBtn = actionGroup.querySelector('[data-update]');
        if (updateBtn) actionGroup.insertBefore(rbBtn, updateBtn);
        else actionGroup.insertBefore(rbBtn, gearBtn);
      }
    }
  });
}

// ── Teardown ──────────────────────────────────────────────────────────────────
export function teardown() {
  if (style) {
    style.remove();
    style = null;
  }
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (originalReloadPlugin && apiRef) {
    apiRef.reloadPlugin = originalReloadPlugin;
    originalReloadPlugin = null;
  }
  document.querySelectorAll('.rb-overlay').forEach(el => el.remove());
  apiRef = null;
}