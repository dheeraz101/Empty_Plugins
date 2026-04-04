export const meta = {
  id: 'rollback-manager',
  name: 'Rollback Manager',
  version: '1.1.0',
  compat: '>=4.0.0'
};

let apiRef = null;
let style = null;
let originalReloadPlugin = null;
let pollInterval = null;

export function setup(api) {
  apiRef = api;

  style = document.createElement('style');
  style.textContent = `
  .pm-btn-rollback {
    background: rgba(255, 149, 0, 0.1);
    color: #d97706;
    border: 1px solid rgba(255, 149, 0, 0.15);
    padding: 6px 10px;
    border-radius: 999px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  .pm-btn-rollback:hover {
    background: rgba(255, 149, 0, 0.18);
    color: #b45309;
    border-color: rgba(255, 149, 0, 0.25);
  }
  .pm-btn-rollback svg {
    flex-shrink: 0;
  }
  .rb-confirm-overlay {
    position: fixed; top:0; left:0; right:0; bottom:0;
    background: rgba(0,0,0,0.2);
    backdrop-filter: blur(10px);
    z-index: 2147483647;
    display: flex; align-items: center; justify-content: center;
  }
  .rb-confirm-box {
    background: rgba(255,255,255,0.97);
    width: 400px; padding: 28px; border-radius: 20px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    border: 1px solid rgba(0,0,0,0.08);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
  }
  .rb-confirm-title {
    font-size: 20px; font-weight: 600; color: #1d1d1f;
    margin: 0 0 16px 0; letter-spacing: -0.3px;
  }
  .rb-confirm-title::after {
    content: "";
    display: block;
    margin-top: 14px;
    height: 1px;
    width: 100%;
    background: rgba(0,0,0,0.08);
  }
  .rb-version-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 16px 0 4px 0;
    font-size: 14px;
  }
  .rb-version-from {
    color: #8e8e93;
    text-decoration: line-through;
  }
  .rb-version-arrow {
    color: #8e8e93;
  }
  .rb-version-to {
    color: #ff9500;
    font-weight: 600;
  }
  .rb-confirm-desc {
    font-size: 14px; color: #6e6e73; margin: 12px 0 22px 0; line-height: 1.5;
  }
  .rb-confirm-actions {
    display: flex; gap: 10px;
  }
  .rb-confirm-actions button {
    flex: 1; padding: 10px 16px; border-radius: 999px;
    font-size: 14px; font-weight: 600; border: none; cursor: pointer;
    transition: all 0.2s;
  }
  .rb-cancel-btn {
    background: rgba(0,0,0,0.05); color: #1d1d1f;
  }
  .rb-cancel-btn:hover { background: rgba(0,0,0,0.08); }
  .rb-confirm-btn {
    background: #ff9500; color: white;
  }
  .rb-confirm-btn:hover { background: #e08600; }

  @media (prefers-color-scheme: dark) {
    .pm-btn-rollback { background: rgba(255, 149, 0, 0.15); color: #ffb340; border-color: rgba(255, 149, 0, 0.2); }
    .pm-btn-rollback:hover { background: rgba(255, 149, 0, 0.25); color: #ffc566; }
    .rb-confirm-box { background: rgba(44, 44, 46, 0.95); color: #f5f5f7; border-color: rgba(255,255,255,0.1); }
    .rb-confirm-title { color: #f5f5f7; }
    .rb-confirm-title::after { background: rgba(255,255,255,0.08); }
    .rb-version-from { color: #6e6e73; }
    .rb-version-arrow { color: #6e6e73; }
    .rb-version-to { color: #ffb340; }
    .rb-confirm-desc { color: #a1a1a6; }
    .rb-cancel-btn { background: rgba(255,255,255,0.1); color: #f5f5f7; }
    .rb-cancel-btn:hover { background: rgba(255,255,255,0.15); }
  }
`;
  document.head.appendChild(style);

  function getBackup(pluginId) {
    try {
      const data = localStorage.getItem(`rb_${pluginId}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function saveBackup(pluginId, code, version, originalUrl) {
    try {
      const data = {
        code,
        version,
        originalUrl,
        timestamp: Date.now()
      };
      localStorage.setItem(`rb_${pluginId}`, JSON.stringify(data));
    } catch (e) {
      console.error('[Rollback] Failed to save backup:', e);
    }
  }

  function createDataUrl(code) {
    return 'data:application/javascript;charset=utf-8,' + encodeURIComponent(code);
  }

  async function captureBeforeUpdate(pluginId) {
    const registry = api.registry.getAll();
    const entry = registry.find(p => p.id === pluginId);
    if (!entry || !entry.url) {
      console.log(`[Rollback] Cannot capture ${pluginId}: no entry or url`);
      return false;
    }

    const urlToFetch = entry.originalUrl && !entry.originalUrl.startsWith('blob:') && !entry.originalUrl.startsWith('data:')
      ? entry.originalUrl
      : entry.url;

    if (urlToFetch.startsWith('blob:') || urlToFetch.startsWith('data:')) {
      console.log(`[Rollback] Cannot capture ${pluginId}: URL is ${urlToFetch.substring(0, 30)}...`);
      return false;
    }

    try {
      const res = await fetch(urlToFetch + (urlToFetch.includes('?') ? '&' : '?') + 't=' + Date.now());
      if (!res.ok) {
        console.log(`[Rollback] Cannot capture ${pluginId}: HTTP ${res.status}`);
        return false;
      }

      const code = await res.text();
      saveBackup(pluginId, code, entry.version || null, entry.originalUrl || urlToFetch);
      console.log(`[Rollback] Captured ${pluginId} v${entry.version || 'unknown'}`);
      return true;
    } catch (e) {
      console.error('[Rollback] Failed to capture', pluginId, e);
      return false;
    }
  }

  async function performRollback(pluginId) {
    const registry = api.registry.getAll();
    const entry = registry.find(p => p.id === pluginId);
    if (!entry) return api.notify('Plugin not found', 'error');

    const backup = getBackup(pluginId);
    if (!backup?.code) return api.notify('No rollback code available', 'warning');

    try {
      const currentVersion = entry.version;
      const dataUrl = createDataUrl(backup.code);

      entry.url = dataUrl;
      if (!entry.originalUrl || entry.originalUrl.startsWith('blob:') || entry.originalUrl.startsWith('data:')) {
        entry.originalUrl = backup.originalUrl || entry.url;
      }
      entry.version = backup.version;

      api.registry.save([...registry]);

      await api.reloadPlugin(pluginId);

      api.notify(`Rolled back to v${entry.version}`, 'success');

      setTimeout(() => injectButtons(), 800);
    } catch (e) {
      console.error('[Rollback] Rollback failed:', e);
      api.notify('Rollback failed', 'error');
    }
  }

  function openConfirm(pluginId) {
    const registry = api.registry.getAll();
    const entry = registry.find(p => p.id === pluginId);
    if (!entry) return;

    const backup = getBackup(pluginId);
    if (!backup?.code) return;

    const currentVersion = entry.version || entry.remoteVersion || 'unknown';
    const revertVersion = backup.version || 'unknown';

    const overlay = document.createElement('div');
    overlay.className = 'rb-confirm-overlay';
    overlay.innerHTML = `
      <div class="rb-confirm-box">
        <h3 class="rb-confirm-title">Revert ${entry.name || pluginId}</h3>
        <div class="rb-version-row">
          <span class="rb-version-from">v${currentVersion}</span>
          <span class="rb-version-arrow">→</span>
          <span class="rb-version-to">v${revertVersion}</span>
        </div>
        <p class="rb-confirm-desc">This will replace the current version with <strong>v${revertVersion}</strong> and reload the plugin.</p>
        <div class="rb-confirm-actions">
          <button class="rb-cancel-btn">Cancel</button>
          <button class="rb-confirm-btn">Revert to v${revertVersion}</button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(overlay);

    overlay.querySelector('.rb-cancel-btn').onclick = () => overlay.remove();
    overlay.querySelector('.rb-confirm-btn').onclick = async () => {
      overlay.remove();
      await performRollback(pluginId);
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
  }

  function injectButtons() {
    const pmList = document.querySelector('#installed .pm-list');
    if (!pmList) return;

    const registry = api.registry.getAll();
    let injected = 0;

    pmList.querySelectorAll('.plugin-item').forEach((item) => {
      if (item.querySelector('[data-rb]')) return;

      const nameEl = item.querySelector('.plugin-meta span');
      if (!nameEl) return;
      const pluginId = nameEl.textContent.trim();

      const plugin = registry.find(p => p.id === pluginId);
      if (!plugin) return;

      const backup = getBackup(pluginId);
      if (!backup?.code) return;
      if (!backup.version) return;

      const currentVersion = plugin.version || plugin.remoteVersion;
      if (!currentVersion) return;
      if (backup.version === currentVersion) return;

      const actionGroup = item.querySelector('.pm-action-group');
      if (!actionGroup) return;

      const btn = document.createElement('button');
      btn.className = 'pm-btn pm-btn-rollback';
      btn.dataset.rb = pluginId;
      btn.title = `Revert to v${backup.version}`;
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 14 4 9 9 4"></polyline>
          <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
        </svg>
      `;

      const updateBtn = actionGroup.querySelector('[data-update]');
      if (updateBtn) {
        actionGroup.insertBefore(btn, updateBtn);
      } else {
        actionGroup.appendChild(btn);
      }
      injected++;
    });

    if (injected > 0) {
      console.log(`[Rollback] Injected ${injected} button(s)`);
    }
  }

  function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(() => {
      const pmRoot = document.querySelector('.pm-root');
      if (pmRoot && pmRoot.style.display !== 'none') {
        injectButtons();
      }
    }, 600);
  }

  originalReloadPlugin = api.reloadPlugin;
  api.reloadPlugin = async function(id) {
    console.log(`[Rollback] Intercepted reloadPlugin for ${id}`);
    await captureBeforeUpdate(id);
    return originalReloadPlugin.call(api, id);
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-rb]');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      openConfirm(btn.dataset.rb);
      return;
    }
  }, true);

  startPolling();

  console.log('🔙 Rollback Manager v1.1.0 loaded');
}

export function teardown() {
  if (style) {
    style.remove();
    style = null;
  }
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (originalReloadPlugin) {
    apiRef.reloadPlugin = originalReloadPlugin;
    originalReloadPlugin = null;
  }
  apiRef = null;
}
