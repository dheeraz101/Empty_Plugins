export const meta = {
  id: 'logger',
  name: 'Logger',
  version: '1.0.0',
  icon: '📋',
  description: 'Records plugin lifecycle events. Adds a Logs button to Plugin Manager.',
  compat: '>=3.3.0'
};

let listeners = [];
let apiRef = null;

// ───────── CONSTANTS ─────────
const LOG_KEY  = 'pm_logs';
const LOG_MAX  = 100;

// ───────── STORAGE ─────────
function pushLog(event, detail) {
  const entry = { t: new Date().toISOString(), event, ...detail };
  console.log(`%c[LOG] ${event}`, 'color:#5856d6;font-weight:bold', detail || '');
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    logs.push(entry);
    if (logs.length > LOG_MAX) logs.splice(0, logs.length - LOG_MAX);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch { /* quota full — skip silently */ }
}

function getLogs() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); }
  catch { return []; }
}

function clearLogs() {
  localStorage.removeItem(LOG_KEY);
}

// ───────── EVENT WIRING ─────────
// Every pm:* event on the bus gets recorded.
const PM_EVENTS = [
  'pm:loaded',
  'pm:install-start',   'pm:install-success',   'pm:install-fail', 'pm:install-id-mismatch',
  'pm:update-start',    'pm:update-success',     'pm:update-fail',
  'pm:reload-start',    'pm:reload-success',     'pm:reload-fail',
  'pm:retry-start',     'pm:retry-success',      'pm:retry-fail',
  'pm:toggle',          'pm:delete',
  'pm:status-change'
];

export function setup(api) {
  apiRef = api;

  // Subscribe to all PM lifecycle events
  for (const evt of PM_EVENTS) {
    const handler = (data) => pushLog(evt, data || {});
    api.bus.on(evt, handler);
    listeners.push({ evt, handler });
  }

  // Log own startup
  pushLog('logger:loaded', { version: meta.version });

  // ───────── UI: Logs button in PM header ─────────
  if (typeof api.registerUI === 'function') {
    const btn = document.createElement('button');
    btn.className = 'pm-btn pm-btn-secondary';
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
      Logs
    `;
    btn.onclick = () => openLogViewer(api);
    api.registerUI('header-actions', btn, 'logger-btn');
  }
}

export function teardown() {
  // Unsubscribe from all events
  if (apiRef) {
    for (const { evt, handler } of listeners) {
      apiRef.bus.off(evt, handler);
    }
  }
  listeners = [];
  apiRef = null;
}

// ───────── LOG VIEWER MODAL ─────────
function openLogViewer(api) {
  const logs = getLogs();
  const overlay = document.createElement('div');
  overlay.className = 'pm-modal-overlay';

  const eventColors = {
    'pm:install-start':       '#007aff',
    'pm:install-success':     '#34c759',
    'pm:install-fail':        '#ff3b30',
    'pm:install-id-mismatch': '#ff9500',
    'pm:update-start':        '#ff9500',
    'pm:update-success':      '#34c759',
    'pm:update-fail':         '#ff3b30',
    'pm:reload-start':        '#5856d6',
    'pm:reload-success':      '#34c759',
    'pm:reload-fail':         '#ff3b30',
    'pm:retry-start':         '#ff9500',
    'pm:retry-success':       '#34c759',
    'pm:retry-fail':          '#ff3b30',
    'pm:toggle':              '#8e8e93',
    'pm:delete':              '#ff3b30',
    'pm:status-change':       '#5856d6',
    'pm:loaded':              '#007aff',
    'logger:loaded':          '#5856d6'
  };

  const rows = logs.slice().reverse().map(l => {
    const time  = new Date(l.t).toLocaleTimeString();
    const date  = new Date(l.t).toLocaleDateString();
    const color = eventColors[l.event] || '#8e8e93';
    const { t, event, ...rest } = l;
    const detail = Object.keys(rest).length ? JSON.stringify(rest) : '';
    return `<tr>
      <td style="white-space:nowrap;opacity:0.6;font-size:12px;padding:3px 8px;">${date} ${time}</td>
      <td style="padding:3px 8px;"><span style="color:${color};font-weight:600;font-size:12px;">${event}</span></td>
      <td style="font-size:12px;opacity:0.8;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:3px 8px;" title='${detail.replace(/'/g, "&#39;")}'>${detail}</td>
    </tr>`;
  }).join('');

  overlay.innerHTML = `
    <div class="pm-modal-content" style="max-width:560px;max-height:70vh;display:flex;flex-direction:column;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span class="pm-modal-title">Plugin Logs</span>
        <div style="display:flex;gap:8px;">
          <button class="pm-btn pm-btn-secondary" id="pm-log-clear" style="font-size:12px;">Clear</button>
          <button class="pm-btn pm-btn-secondary" id="pm-log-close">Close</button>
        </div>
      </div>
      <div style="overflow-y:auto;flex:1;">
        ${logs.length === 0
          ? '<div style="text-align:center;padding:32px 0;opacity:0.5;">No logs yet</div>'
          : `<table style="width:100%;border-collapse:collapse;">
              <thead><tr style="text-align:left;opacity:0.5;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">
                <th style="padding:3px 8px;">Time</th><th style="padding:3px 8px;">Event</th><th style="padding:3px 8px;">Detail</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>`
        }
      </div>
      <div style="margin-top:8px;font-size:11px;opacity:0.4;text-align:right;">${logs.length} / ${LOG_MAX} entries</div>
    </div>
  `;

  document.documentElement.appendChild(overlay);
  overlay.querySelector('#pm-log-close').onclick = () => overlay.remove();
  overlay.querySelector('#pm-log-clear').onclick = () => {
    clearLogs();
    overlay.remove();
    api.notify('Logs cleared', 'success');
  };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}