export const meta = {
  id: 'logger',
  name: 'Logger',
  version: '1.2.5',
  icon: '📋',
  description: 'Records plugin lifecycle events. Adds a Logs button to Plugin Manager.',
  compat: '>=3.3.0'
};

let listeners = [];
let apiRef = null;
let activeOverlay = null;

const LOG_KEY = 'pm_logs';
const LOG_MAX = 100;
const THEME_KEY = 'logger_theme';

function pushLog(event, detail) {
  const entry = { t: new Date().toISOString(), event, ...detail };
  console.log(`%c[LOG] ${event}`, 'color:#5856d6;font-weight:bold', detail || '');
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    logs.push(entry);
    if (logs.length > LOG_MAX) logs.splice(0, logs.length - LOG_MAX);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch {}
}

function getLogs() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

function clearLogs() {
  localStorage.removeItem(LOG_KEY);
}

const style = document.createElement('style');
style.innerHTML = `
  .logger-theme {
    --pm-bg: rgba(255,255,255,0.85);
    --pm-bg-soft: rgba(255,255,255,0.3);
    --pm-text: #1d1d1f;
    --pm-subtext: #86868b;
    --pm-border: rgba(0,0,0,0.08);
  }

  .logger-theme[data-theme="dark"] {
    --pm-bg: rgba(28,28,30,0.85);
    --pm-bg-soft: rgba(44,44,46,0.3);
    --pm-text: #f5f5f7;
    --pm-subtext: #a1a1a6;
    --pm-border: rgba(255,255,255,0.08);
  }
`;
document.head.appendChild(style);

const PM_EVENTS = [
  'pm:loaded',
  'pm:install-start',
  'pm:install-success',
  'pm:install-fail',
  'pm:install-id-mismatch',
  'pm:update-start',
  'pm:update-success',
  'pm:update-fail',
  'pm:reload-start',
  'pm:reload-success',
  'pm:reload-fail',
  'pm:retry-start',
  'pm:retry-success',
  'pm:retry-fail',
  'pm:toggle',
  'pm:delete',
  'pm:status-change'
];

export function setup(api) {
  apiRef = api;

  for (const evt of PM_EVENTS) {
    const handler = (data) => pushLog(evt, data || {});
    api.bus.on(evt, handler);
    listeners.push({ evt, handler });
  }

  pushLog('logger:loaded', { version: meta.version });

  if (typeof api.registerUI === 'function') {
    const btn = document.createElement('button');
    btn.className = 'pm-btn pm-btn-secondary';
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
      Logs
    `;
    btn.onclick = () => openLogViewer(api);
    api.registerUI('header-actions', btn, 'logger-btn');
  }
}

export function teardown() {
  if (apiRef) {
    for (const { evt, handler } of listeners) {
      apiRef.bus.off(evt, handler);
    }
  }

  listeners = [];
  apiRef = null;

  if (activeOverlay && activeOverlay.isConnected) {
    activeOverlay.remove();
  }
  activeOverlay = null;
}

const sunIcon = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
`;

const moonIcon = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
`;

function getThemeState() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark') return true;
  if (saved === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(isDark, overlay, btn) {
  overlay.dataset.theme = isDark ? 'dark' : 'light';

  if (btn) {
    btn.innerHTML = isDark ? sunIcon : moonIcon;
    btn.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }
}

function openLogViewer(api) {
  const logs = getLogs();

  if (activeOverlay && activeOverlay.isConnected) {
    activeOverlay.remove();
  }

  const overlay = document.createElement('div');
  overlay.className = 'pm-modal-overlay logger-theme';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.2);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  activeOverlay = overlay;

  const eventColors = {
    'pm:install-start': '#007aff',
    'pm:install-success': '#34c759',
    'pm:install-fail': '#ff3b30',
    'pm:update-start': '#ff9500',
    'pm:update-success': '#34c759',
    'pm:update-fail': '#ff3b30',
    'pm:reload-start': '#5856d6',
    'pm:reload-success': '#34c759',
    'pm:reload-fail': '#ff3b30',
    'pm:retry-start': '#ff9500',
    'pm:retry-success': '#34c759',
    'pm:retry-fail': '#ff3b30',
    'pm:toggle': '#8e8e93',
    'pm:delete': '#ff3b30',
    'pm:status-change': '#5856d6',
    'pm:loaded': '#007aff',
    'logger:loaded': '#5856d6'
  };

  const rows = logs.slice().reverse().map((l) => {
    const time = new Date(l.t).toLocaleTimeString();
    const date = new Date(l.t).toLocaleDateString();
    const color = eventColors[l.event] || '#8e8e93';
    const { t, event, ...rest } = l;
    const detail = Object.keys(rest).length ? JSON.stringify(rest) : '—';

    return `
      <tr style="border-bottom:1px solid var(--pm-border)">
        <td style="padding:12px;color:var(--pm-subtext)">
          <div style="color:var(--pm-text);font-weight:500">${time}</div>
          <div style="font-size:11px">${date}</div>
        </td>
        <td style="padding:12px">
          <span style="background:${color}15;color:${color};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600">
            ${event.replace('pm:', '')}
          </span>
        </td>
        <td style="padding:12px;color:var(--pm-text);font-family:monospace;font-size:12px">
          ${detail}
        </td>
      </tr>
    `;
  }).join('');

  overlay.innerHTML = `
    <div style="
      background:var(--pm-bg);
      color:var(--pm-text);
      width:90%;
      max-width:800px;
      max-height:85vh;
      border-radius:18px;
      border:1px solid var(--pm-border);
      box-shadow:0 20px 40px rgba(0,0,0,0.2);
      display:flex;
      flex-direction:column;
      overflow:hidden;
    ">
      <div style="padding:20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--pm-border)">
        <div>
          <h2 style="margin:0;font-size:18px;color:var(--pm-text)">System Activity</h2>
          <p style="margin:2px 0 0;color:var(--pm-subtext);font-size:13px">${logs.length} events</p>
        </div>
        <div id="pm-log-actions" style="display:flex;gap:10px">
          <button id="pm-log-clear" style="background:transparent;border:1px solid var(--pm-border);color:#ff3b30;padding:8px 14px;border-radius:10px;cursor:pointer">Clear</button>
          <button id="pm-log-close" style="background:var(--pm-text);color:var(--pm-bg);border:none;padding:8px 16px;border-radius:10px;cursor:pointer">Done</button>
        </div>
      </div>
      <div style="flex:1;overflow:auto;background:var(--pm-bg-soft)">
        ${logs.length === 0 ? `
          <div style="padding:60px;text-align:center;color:var(--pm-subtext)">No activity yet</div>
        ` : `
          <table style="width:100%">
            <thead style="position:sticky;top:0;background:var(--pm-bg)">
              <tr>
                <th style="padding:10px;color:var(--pm-subtext)">Time</th>
                <th style="padding:10px;color:var(--pm-subtext)">Type</th>
                <th style="padding:10px;color:var(--pm-subtext)">Data</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `}
      </div>
      <div style="padding:10px;text-align:center;color:var(--pm-subtext);border-top:1px solid var(--pm-border)">
        Showing latest ${Math.min(LOG_MAX, logs.length)} logs
      </div>
    </div>
  `;

  document.documentElement.appendChild(overlay);

  const actions = overlay.querySelector('#pm-log-actions');
  const themeBtn = document.createElement('button');
  themeBtn.style.cssText = `
    background:transparent;
    border:1px solid var(--pm-border);
    padding:8px 10px;
    border-radius:10px;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
  `;

  let isDark = getThemeState();
  applyTheme(isDark, overlay, themeBtn);

  themeBtn.onclick = () => {
    isDark = !isDark;
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    applyTheme(isDark, overlay, themeBtn);
    api.bus.emit('logger:theme-changed', { dark: isDark });
    pushLog('logger:theme-toggled', { mode: isDark ? 'dark' : 'light' });
  };

  actions.prepend(themeBtn);

  const close = () => {
    overlay.style.opacity = '0';
    overlay.style.transition = '0.2s';
    setTimeout(() => {
      if (activeOverlay === overlay) activeOverlay = null;
      overlay.remove();
    }, 200);
  };

  overlay.querySelector('#pm-log-close').onclick = close;
  overlay.querySelector('#pm-log-clear').onclick = () => {
    clearLogs();
    close();
    api.notify('Logs cleared', 'success');
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };
}