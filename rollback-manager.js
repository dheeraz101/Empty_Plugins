// ╔════════════════════════════════════════════════════════════╗
// ║  ROLLBACK MANAGER  v2.3.0                                  ║
// ║  • "Manage Snapshots" button in PM sidebar                  ║
// ║  • Single unified popup: select, regenerate, delete, stop   ║
// ║  • Snapshots LOCKED — never auto-overwritten                ║
// ║  • Per-card: ↩ rollback button (when version differs)       ║
// ╚════════════════════════════════════════════════════════════╝

export const meta = {
  id: 'rollback-manager',
  name: 'Rollback Manager',
  version: '2.3.1',
  compat: '>=4.0.0'
};

let apiRef = null;
let style = null;
let originalReloadPlugin = null;
let pollInterval = null;

// ── Constants ─────────────────────────────────────────────────────────────────
const SNAPSHOT_KEY = 'rb_snapshots';
const TRACKED_KEY  = 'rb_tracked';
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
  } catch { return null; }
}

// ── Capture snapshot ──────────────────────────────────────────────────────────
async function captureSnapshot(api, pluginId) {
  const entry = api.registry.getAll().find(p => p.id === pluginId);
  if (!entry) return false;
  const remoteUrl = (entry.originalUrl && !entry.originalUrl.startsWith('blob:') && !entry.originalUrl.startsWith('data:'))
    ? entry.originalUrl : entry.url;
  const code = await fetchCode(remoteUrl);
  if (!code) return false;
  setSnapshot(pluginId, { code, version: entry.version || null, url: remoteUrl, timestamp: Date.now() });
  console.log('[Rollback] Captured ' + pluginId + ' v' + (entry.version || '?'));
  return true;
}

function createDataUrl(code) {
  return 'data:application/javascript;charset=utf-8,' + encodeURIComponent(code);
}

// ── CSS ───────────────────────────────────────────────────────────────────────
function buildCSS() {
  return `
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
      width: 500px;
      max-width: calc(100vw - 40px);
      max-height: 82vh;
      display: flex;
      flex-direction: column;
      animation: rb-su 0.2s cubic-bezier(0.16,1,0.3,1);
    }
    @keyframes rb-su { from { transform:translateY(10px);opacity:0 } to { transform:none;opacity:1 } }

    .rb-title { font-size:20px; font-weight:700; color:#1d1d1f; margin:0 0 3px; letter-spacing:-0.3px; flex-shrink:0; }
    .rb-sub   { font-size:13px; color:#8e8e93; margin:0 0 18px; flex-shrink:0; }
    .rb-hr    { height:1px; background:rgba(0,0,0,0.08); margin:0 0 16px; flex-shrink:0; }

    .rb-list {
      overflow-y: auto; flex:1;
      display: flex; flex-direction: column; gap:10px;
      margin-bottom:18px;
      scrollbar-width:thin; scrollbar-color:rgba(0,0,0,0.1) transparent;
    }

    .rb-row-untracked {
      display:flex; align-items:center; gap:12px;
      padding:11px 14px; border-radius:13px;
      border:1.5px solid rgba(0,0,0,0.07);
      cursor:pointer; transition:all 0.14s; user-select:none;
    }
    .rb-row-untracked:hover { background:rgba(0,0,0,0.025); border-color:rgba(0,0,0,0.12); }
    .rb-row-untracked.rb-sel { background:rgba(0,122,255,0.06); border-color:rgba(0,122,255,0.3); }
    .rb-row-untracked.rb-dis { opacity:0.38; cursor:not-allowed; }

    .rb-chk {
      width:20px; height:20px; border-radius:50%;
      border:2px solid rgba(0,0,0,0.18);
      display:flex; align-items:center; justify-content:center;
      flex-shrink:0; transition:all 0.14s;
    }
    .rb-row-untracked.rb-sel .rb-chk { background:#007AFF; border-color:#007AFF; }
    .rb-dot { width:8px; height:8px; border-radius:50%; background:white; opacity:0; transition:opacity 0.14s; }
    .rb-row-untracked.rb-sel .rb-dot { opacity:1; }

    .rb-row-tracked {
      border:1.5px solid rgba(0,122,255,0.2);
      border-radius:13px;
      background: rgba(0,122,255,0.03);
      overflow:hidden;
    }
    .rb-row-tracked-header {
      display:flex; align-items:center; gap:12px;
      padding:11px 14px;
    }
    .rb-tracked-icon {
      width:8px; height:8px; border-radius:50%;
      background:#007AFF; flex-shrink:0;
    }
    .rb-tracked-actions {
      display:flex; gap:7px;
      padding:0 14px 11px 34px;
    }
    .rb-tracked-actions button {
      padding:5px 12px; border-radius:999px;
      font-size:12px; font-weight:600; border:none; cursor:pointer;
      transition:all 0.15s; display:flex; align-items:center; gap:5px;
    }
    .rb-act-regen  { background:rgba(0,122,255,0.1); color:#0071e3; }
    .rb-act-regen:hover  { background:rgba(0,122,255,0.18); }
    .rb-act-del    { background:rgba(0,0,0,0.05); color:#6e6e73; }
    .rb-act-del:hover    { background:rgba(0,0,0,0.09); }
    .rb-act-stop   { background:rgba(255,59,48,0.08); color:#ff3b30; }
    .rb-act-stop:hover   { background:rgba(255,59,48,0.15); }

    .rb-pname  { font-size:14px; font-weight:600; color:#1d1d1f; }
    .rb-pid    { font-size:12px; color:#8e8e93; }
    .rb-snap-badge {
      margin-left:auto; font-size:11px; font-weight:600; padding:2px 8px;
      border-radius:999px; white-space:nowrap;
    }
    .rb-snap-badge.ok  { background:rgba(52,199,89,0.15); color:#248a3d; }
    .rb-snap-badge.nil { background:rgba(142,142,147,0.15); color:#8e8e93; }

    .rb-limit { font-size:12px; color:#ff9500; text-align:center; margin-bottom:12px; flex-shrink:0; }

    .rb-footer { display:flex; gap:10px; flex-shrink:0; }
    .rb-footer button {
      flex:1; padding:11px 16px; border-radius:999px;
      font-size:14px; font-weight:600; border:none; cursor:pointer; transition:all 0.18s;
    }
    .rb-btn-cancel  { background:rgba(0,0,0,0.05); color:#1d1d1f; }
    .rb-btn-cancel:hover  { background:rgba(0,0,0,0.09); }
    .rb-btn-primary { background:#007AFF; color:white; }
    .rb-btn-primary:hover { background:#0066dd; }

    .rb-ver-old   { color:#8e8e93; text-decoration:line-through; }
    .rb-ver-arrow { color:#8e8e93; margin:0 4px; }
    .rb-ver-new   { color:#ff9500; font-weight:700; }
    .rb-confirm-desc { font-size:14px; color:#6e6e73; margin:12px 0 22px; line-height:1.55; }
    .rb-btn-warn  { background:#ff9500; color:white; }
    .rb-btn-warn:hover { background:#e08600; }

    .rb-spin {
      display:inline-block; width:13px; height:13px;
      border:2px solid rgba(255,255,255,0.35); border-top-color:white;
      border-radius:50%; animation:rb-sp 0.7s linear infinite;
      vertical-align:middle; margin-right:3px;
    }
    .rb-spin.dark {
      border-color:rgba(0,113,227,0.25); border-top-color:#0071e3;
    }
    @keyframes rb-sp { to { transform:rotate(360deg); } }

    @media (prefers-color-scheme: dark) {
      .rb-sidebar-btn { color:#ffb340; background:rgba(255,149,0,0.12); border-color:rgba(255,149,0,0.22); }
      .rb-sidebar-btn:hover { background:rgba(255,149,0,0.2); color:#ffc566; }
      .pm-btn-rollback { background:rgba(255,149,0,0.15); color:#ffb340; border-color:rgba(255,149,0,0.2); }
      .pm-btn-rollback:hover { background:rgba(255,149,0,0.25); color:#ffc566; }
      .rb-modal { background:rgba(30,30,32,0.97); border-color:rgba(255,255,255,0.1); box-shadow:0 24px 60px rgba(0,0,0,0.5); }
      .rb-title { color:#f5f5f7; }
      .rb-sub   { color:#6e6e73; }
      .rb-hr    { background:rgba(255,255,255,0.08); }
      .rb-row-untracked { border-color:rgba(255,255,255,0.09); }
      .rb-row-untracked:hover { background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.14); }
      .rb-row-untracked.rb-sel { background:rgba(0,122,255,0.1); border-color:rgba(10,132,255,0.35); }
      .rb-row-tracked { border-color:rgba(10,132,255,0.25); background:rgba(0,122,255,0.06); }
      .rb-pname { color:#f5f5f7; }
      .rb-act-del { background:rgba(255,255,255,0.08); color:#a1a1a6; }
      .rb-act-del:hover { background:rgba(255,255,255,0.13); }
      .rb-btn-cancel { background:rgba(255,255,255,0.1); color:#f5f5f7; }
      .rb-btn-cancel:hover { background:rgba(255,255,255,0.16); }
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

  // Intercept reloadPlugin — capture BEFORE plugin reloads (only if tracked + no snapshot yet)
  originalReloadPlugin = api.reloadPlugin;
  api.reloadPlugin = async function(id) {
    const entry = api.registry.getAll().find(p => p.id === id);
    const isRollbackReload = entry?.url?.startsWith('data:');
    if (!isRollbackReload && isTracked(id) && !getSnapshot(id)) {
      console.log('[Rollback] Capturing ' + id + ' before reload');
      await captureSnapshot(api, id);
    }
    return originalReloadPlugin.call(api, id);
  };

  // Inject sidebar button + rollback card buttons
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
    btn.onclick = (e) => { e.stopPropagation(); openMainPopup(api); };
    pmActions.appendChild(btn);
  }

  pollInterval = setInterval(() => {
    const pmRoot = document.querySelector('.pm-root');
    if (!pmRoot || pmRoot.style.display === 'none') return;
    tryInjectSidebarButton();
    injectCardButtons(api);
  }, 600);

  // Rollback card button click
  document.addEventListener('click', e => {
    const rb = e.target.closest('[data-rb-rollback]');
    if (rb) {
      e.preventDefault(); e.stopPropagation();
      openRollbackConfirm(api, rb.dataset.rbRollback);
    }
  }, true);

  console.log('\uD83D\uDD19 Rollback Manager v2.3.0 loaded');
}

// ── MAIN POPUP — unified selector + per-plugin management ─────────────────────
function openMainPopup(api) {
  const existing = document.querySelector('.rb-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'rb-overlay';
  document.documentElement.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  const newlySelected = new Set();

  async function render() {
    const registry = api.registry.getAll();
    const eligible = registry.filter(p => p.id !== 'rollback-manager' && p.id !== 'plugin-manager');
    const tracked  = new Set(loadTracked());
    const atLimit  = tracked.size + newlySelected.size >= MAX_TRACKED;

    const trackedPlugins   = eligible.filter(p => tracked.has(p.id));
    const untrackedPlugins = eligible.filter(p => !tracked.has(p.id));

    overlay.innerHTML = `
      <div class="rb-modal">
        <h3 class="rb-title">\uD83D\uDEE1\uFE0F Rollback Manager</h3>
        <p class="rb-sub">
          Tracked plugins get a locked snapshot.
          Max ${MAX_TRACKED} plugins. Manage or add below.
        </p>
        <div class="rb-hr"></div>

        ${(tracked.size + newlySelected.size) >= MAX_TRACKED
          ? `<div class="rb-limit">\u26A0\uFE0F Limit reached (${MAX_TRACKED}). Remove a tracked plugin to add another.</div>`
          : ''}

        <div class="rb-list">

          ${trackedPlugins.length > 0 ? `
            <div style="font-size:11px;font-weight:700;color:#8e8e93;text-transform:uppercase;letter-spacing:.8px;padding:0 2px;margin-bottom:2px">
              Tracked (${trackedPlugins.length})
            </div>
            ${trackedPlugins.map(p => {
              const snap    = getSnapshot(p.id);
              const snapVer = snap?.version || null;
              const snapDate = snap?.timestamp
                ? new Date(snap.timestamp).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' })
                : null;
              return `
                <div class="rb-row-tracked">
                  <div class="rb-row-tracked-header">
                    <div class="rb-tracked-icon"></div>
                    <div style="flex:1;min-width:0">
                      <div class="rb-pname">${p.name || p.id}</div>
                      <div class="rb-pid">${p.id}${p.version ? ' \u00B7 v' + p.version : ''}</div>
                    </div>
                    ${snap
                      ? `<span class="rb-snap-badge ok">\u2713 v${snapVer || '?'}</span>`
                      : `<span class="rb-snap-badge nil">No snapshot</span>`}
                  </div>
                  <div class="rb-tracked-actions">
                    <button class="rb-act-regen" data-regen="${p.id}">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                      </svg>
                      Regenerate${snapDate ? ' \u00B7 ' + snapDate : ''}
                    </button>
                    <button class="rb-act-del" data-delsnap="${p.id}" ${!snap ? 'disabled style="opacity:0.38"' : ''}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                      </svg>
                      Delete
                    </button>
                    <button class="rb-act-stop" data-stoptrack="${p.id}">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Stop Tracking
                    </button>
                  </div>
                </div>`;
            }).join('')}
          ` : ''}

          ${untrackedPlugins.length > 0 ? `
            <div style="font-size:11px;font-weight:700;color:#8e8e93;text-transform:uppercase;letter-spacing:.8px;padding:0 2px;margin-top:${trackedPlugins.length > 0 ? '6' : '0'}px;margin-bottom:2px">
              Not Tracked
            </div>
            ${untrackedPlugins.map(p => {
              const sel = newlySelected.has(p.id);
              const dis = !sel && atLimit;
              return `
                <div class="rb-row-untracked ${sel ? 'rb-sel' : ''} ${dis ? 'rb-dis' : ''}" data-addtrack="${p.id}">
                  <div class="rb-chk"><div class="rb-dot"></div></div>
                  <div style="flex:1;min-width:0">
                    <div class="rb-pname">${p.name || p.id}</div>
                    <div class="rb-pid">${p.id}${p.version ? ' \u00B7 v' + p.version : ''}</div>
                  </div>
                </div>`;
            }).join('')}
          ` : ''}

          ${eligible.length === 0 ? `
            <div style="text-align:center;color:#8e8e93;padding:24px;font-size:14px">
              No eligible plugins installed.
            </div>` : ''}
        </div>

        <div class="rb-footer">
          <button class="rb-btn-cancel" id="rb-main-close">Close</button>
          ${newlySelected.size > 0
            ? `<button class="rb-btn-primary" id="rb-main-save">
                 Capture &amp; Track (${newlySelected.size})
               </button>`
            : ''}
        </div>
      </div>
    `;

    overlay.querySelector('#rb-main-close').onclick = () => overlay.remove();

    const saveBtn = overlay.querySelector('#rb-main-save');
    if (saveBtn) {
      saveBtn.onclick = async () => {
        saveBtn.innerHTML = '<span class="rb-spin"></span> Capturing\u2026';
        saveBtn.disabled = true;
        let captured = 0;
        for (const id of newlySelected) {
          addTracked(id);
          if (!getSnapshot(id)) {
            const ok = await captureSnapshot(api, id);
            if (ok) captured++;
          }
        }
        newlySelected.clear();
        api.notify(`\u2713 ${captured} snapshot(s) saved.`, 'success');
        render();
      };
    }

    overlay.querySelectorAll('[data-addtrack]').forEach(row => {
      row.addEventListener('click', () => {
        if (row.classList.contains('rb-dis')) return;
        const id = row.dataset.addtrack;
        if (newlySelected.has(id)) {
          newlySelected.delete(id);
        } else if (newlySelected.size + tracked.size < MAX_TRACKED) {
          newlySelected.add(id);
        }
        render();
      });
    });

    overlay.querySelectorAll('[data-regen]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.regen;
        btn.innerHTML = '<span class="rb-spin dark"></span> Fetching\u2026';
        btn.disabled = true;
        const ok = await captureSnapshot(api, id);
        if (ok) {
          const ns = getSnapshot(id);
          api.notify(`\u2713 Snapshot regenerated: ${id} v${ns?.version || '?'}`, 'success');
        } else {
          api.notify('Could not fetch source. Check network/URL.', 'error');
        }
        render();
      });
    });

    overlay.querySelectorAll('[data-delsnap]').forEach(btn => {
      btn.addEventListener('click', () => {
        deleteSnapshot(btn.dataset.delsnap);
        api.notify('Snapshot deleted. Plugin still tracked.', 'info');
        render();
      });
    });

    overlay.querySelectorAll('[data-stoptrack]').forEach(btn => {
      btn.addEventListener('click', () => {
        removeTracked(btn.dataset.stoptrack);
        api.notify(btn.dataset.stoptrack + ' removed from tracking.', 'info');
        render();
      });
    });
  }

  render();
}

// ── ROLLBACK CONFIRM ──────────────────────────────────────────────────────────
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
        <span class="rb-ver-arrow">\u2192</span>
        <span class="rb-ver-new">v${snapVer}</span>
      </div>
      <p class="rb-confirm-desc">
        This will replace the current version with <strong>v${snapVer}</strong> and reload the plugin.<br><br>
        <span style="color:#ff9500;font-size:13px">
          \u26A0\uFE0F The snapshot stays locked after rollback.
          Open <strong>Manage Snapshots</strong> to regenerate it.
        </span>
      </p>
      <div class="rb-footer">
        <button class="rb-btn-cancel" id="rb-cf-cancel">Cancel</button>
        <button class="rb-btn-warn" id="rb-cf-ok">Revert to v${snapVer}</button>
      </div>
    </div>
  `;

  document.documentElement.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
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
      ? entry.originalUrl : (snap.url || entry.url);

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

    api.notify(`\u2713 Rolled back ${entry.name || pluginId} to v${snap.version}`, 'success');
  } catch(e) {
    console.error('[Rollback] performRollback failed', e);
    api.notify('Rollback failed \u2014 check console', 'error');
  }
}

// ── Inject ↩ rollback button into each plugin card ────────────────────────────
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

    const snap = getSnapshot(pluginId);
    if (!snap?.code || !snap.version) return;

    const currentVer = plugin.version || plugin.remoteVersion;
    if (!currentVer || snap.version === currentVer) return;

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
    else actionGroup.appendChild(rbBtn);
  });
}

// ── Teardown ──────────────────────────────────────────────────────────────────
export function teardown() {
  if (style)        { style.remove(); style = null; }
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  if (originalReloadPlugin && apiRef) {
    apiRef.reloadPlugin = originalReloadPlugin;
    originalReloadPlugin = null;
  }
  // Remove all injected UI
  document.querySelectorAll('.rb-sidebar-btn').forEach(el => el.remove());
  document.querySelectorAll('[data-rb-rollback]').forEach(el => el.remove());
  document.querySelectorAll('.rb-overlay').forEach(el => el.remove());
  apiRef = null;
}