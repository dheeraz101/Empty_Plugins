export const meta = {
  id: 'rollback-manager',
  name: 'Rollback Manager',
  version: '1.0.0',
  compat: '>=4.0.0'
};

let apiRef = null;
let style = null;

export function setup(api) {
  apiRef = api;
  const SELF_ID = 'rollback-manager';

  style = document.createElement('style');
  style.textContent = `
  .pm-btn-rollback {
    background: rgba(255, 149, 0, 0.1);
    color: #d97706;
    border: 1px solid rgba(255, 149, 0, 0.15);
  }
  .pm-btn-rollback:hover {
    background: rgba(255, 149, 0, 0.18);
    color: #b45309;
    border-color: rgba(255, 149, 0, 0.25);
  }
  .pm-btn-rollback svg {
    flex-shrink: 0;
  }
  .rollback-confirm-overlay {
    position: fixed; top:0; left:0; right:0; bottom:0;
    background: rgba(0,0,0,0.2);
    backdrop-filter: blur(10px);
    z-index: 2147483647;
    display: flex; align-items: center; justify-content: center;
  }
  .rollback-confirm-box {
    background: rgba(255,255,255,0.97);
    width: 360px; padding: 24px; border-radius: 20px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    border: 1px solid rgba(0,0,0,0.08);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
  }
  .rollback-confirm-title {
    font-size: 18px; font-weight: 600; color: #1d1d1f;
    margin: 0 0 6px 0; letter-spacing: -0.2px;
  }
  .rollback-confirm-desc {
    font-size: 14px; color: #6e6e73; margin: 0 0 20px 0; line-height: 1.4;
  }
  .rollback-confirm-actions {
    display: flex; gap: 10px;
  }
  .rollback-confirm-actions button {
    flex: 1; padding: 10px 16px; border-radius: 999px;
    font-size: 14px; font-weight: 600; border: none; cursor: pointer;
    transition: all 0.2s;
  }
  .rollback-cancel-btn {
    background: rgba(0,0,0,0.05); color: #1d1d1f;
  }
  .rollback-cancel-btn:hover { background: rgba(0,0,0,0.08); }
  .rollback-confirm-btn {
    background: #ff9500; color: white;
  }
  .rollback-confirm-btn:hover { background: #e08600; }

  @media (prefers-color-scheme: dark) {
    .pm-btn-rollback { background: rgba(255, 149, 0, 0.15); color: #ffb340; border-color: rgba(255, 149, 0, 0.2); }
    .pm-btn-rollback:hover { background: rgba(255, 149, 0, 0.25); color: #ffc566; }
    .rollback-confirm-box { background: rgba(44, 44, 46, 0.95); color: #f5f5f7; border-color: rgba(255,255,255,0.1); }
    .rollback-confirm-title { color: #f5f5f7; }
    .rollback-confirm-desc { color: #a1a1a6; }
    .rollback-cancel-btn { background: rgba(255,255,255,0.1); color: #f5f5f7; }
    .rollback-cancel-btn:hover { background: rgba(255,255,255,0.15); }
  }
`;
  document.head.appendChild(style);

  function getStoredPluginCode(pluginId) {
    try {
      const data = localStorage.getItem(`plugin_backup_${pluginId}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function createDataUrl(code) {
    return 'data:application/javascript;charset=utf-8,' + encodeURIComponent(code);
  }

  function injectRollbackButtons() {
    const pmList = document.querySelector('#installed .pm-list');
    if (!pmList) return;

    const registry = api.registry.getAll();

    pmList.querySelectorAll('.plugin-item').forEach((item, index) => {
      if (item.querySelector('[data-rollback]')) return;

      const plugin = registry[index];
      if (!plugin) return;

      const stored = getStoredPluginCode(plugin.id);
      if (!stored?.code || !plugin.previousVersion) return;

      const actionGroup = item.querySelector('.pm-action-group');
      if (!actionGroup) return;

      const btn = document.createElement('button');
      btn.className = 'pm-btn pm-btn-rollback';
      btn.dataset.rollback = plugin.id;
      btn.title = `Rollback to v${plugin.previousVersion}`;
      btn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 14 4 9 9 4"></polyline>
          <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
        </svg>
        v${plugin.previousVersion}
      `;

      const updateBtn = actionGroup.querySelector('[data-update]');
      if (updateBtn) {
        actionGroup.insertBefore(btn, updateBtn);
      } else {
        actionGroup.appendChild(btn);
      }
    });
  }

  function openRollbackConfirm(pluginId) {
    const registry = api.registry.getAll();
    const entry = registry.find(p => p.id === pluginId);
    if (!entry) return;

    const stored = getStoredPluginCode(pluginId);
    if (!stored?.code) return;

    const overlay = document.createElement('div');
    overlay.className = 'rollback-confirm-overlay';
    overlay.innerHTML = `
      <div class="rollback-confirm-box">
        <h3 class="rollback-confirm-title">Rollback ${entry.name || pluginId}</h3>
        <p class="rollback-confirm-desc">Revert to version ${entry.previousVersion}? This will replace the current plugin code and reload it.</p>
        <div class="rollback-confirm-actions">
          <button class="rollback-cancel-btn">Cancel</button>
          <button class="rollback-confirm-btn">Rollback</button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(overlay);

    overlay.querySelector('.rollback-cancel-btn').onclick = () => overlay.remove();
    overlay.querySelector('.rollback-confirm-btn').onclick = async () => {
      overlay.remove();
      await performRollback(pluginId);
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
  }

  async function performRollback(pluginId) {
    const registry = api.registry.getAll();
    const entry = registry.find(p => p.id === pluginId);
    if (!entry) return api.notify('Plugin not found', 'error');

    const stored = getStoredPluginCode(pluginId);
    if (!stored?.code) return api.notify('No rollback code available', 'warning');

    try {
      api.notify(`Rolling back ${entry.name || pluginId} to v${entry.previousVersion}...`, 'info');

      const currentVersion = entry.version;
      const dataUrl = createDataUrl(stored.code);

      entry.url = dataUrl;
      entry.version = entry.previousVersion;
      entry.previousVersion = currentVersion;

      api.registry.save([...registry]);

      await api.reloadPlugin(pluginId);

      api.notify(`Rolled back to v${entry.version}`, 'success');

      setTimeout(() => {
        const pmRoot = document.querySelector('.pm-root');
        if (pmRoot && pmRoot.style.display === 'flex') {
          const list = pmRoot.querySelector('#installed .pm-list');
          if (list) {
            list.querySelectorAll('[data-rollback]').forEach(b => b.remove());
            injectRollbackButtons();
          }
        }
      }, 500);
    } catch (e) {
      console.error('Rollback failed:', e);
      api.notify('Rollback failed', 'error');
    }
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-rollback]');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      openRollbackConfirm(btn.dataset.rollback);
    }
  });

  api.bus.on('plugin:unloaded', () => {
    setTimeout(injectRollbackButtons, 300);
  });

  api.bus.on('plugin:loaded', () => {
    setTimeout(injectRollbackButtons, 300);
  });

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes.length) {
        setTimeout(injectRollbackButtons, 200);
        break;
      }
    }
  });

  const pmList = document.querySelector('#installed .pm-list');
  if (pmList) {
    observer.observe(pmList, { childList: true, subtree: true });
  }

  setTimeout(injectRollbackButtons, 1000);

  console.log('🔙 Rollback Manager v1.0.0 loaded');
}

export function teardown() {
  if (style) {
    style.remove();
    style = null;
  }
  apiRef = null;
}
