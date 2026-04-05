export const meta = {
  id: 'logger',
  name: 'Logger',
  version: '1.1.1',
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
// ───────── LOG VIEWER MODAL ─────────
function openLogViewer(api) {
  const logs = getLogs();
  const overlay = document.createElement('div');
  
  // Apple-style Overlay Styling
  overlay.className = 'pm-modal-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.2); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center; z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  `;

  const eventColors = {
    'pm:install-start':      '#007aff',
    'pm:install-success':    '#34c759',
    'pm:install-fail':       '#ff3b30',
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
    const time  = new Date(l.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date  = new Date(l.t).toLocaleDateString([], { month: 'short', day: 'numeric' });
    const color = eventColors[l.event] || '#8e8e93';
    const { t, event, ...rest } = l;
    const detail = Object.keys(rest).length ? JSON.stringify(rest) : '—';
    
    return `
      <tr style="border-bottom: 1px solid rgba(0,0,0,0.05); transition: background 0.2s;">
        <td style="padding: 12px 16px; white-space: nowrap; color: #8e8e93; font-size: 12px;">
          <span style="display:block; font-weight: 500; color: #1d1d1f;">${time}</span>
          <span style="font-size: 10px; opacity: 0.7;">${date}</span>
        </td>
        <td style="padding: 12px 16px;">
          <span style="
            display: inline-block; padding: 2px 8px; border-radius: 6px; 
            background: ${color}15; color: ${color}; 
            font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px;
          ">${event.replace('pm:', '')}</span>
        </td>
        <td style="padding: 12px 16px; font-family: 'SF Mono', Menlo, monospace; font-size: 12px; color: #424245; word-break: break-all;">
          ${detail}
        </td>
      </tr>`;
  }).join('');

  overlay.innerHTML = `
    <div style="
      background: rgba(255, 255, 255, 0.85); 
      backdrop-filter: blur(20px) saturate(180%);
      width: 90%; max-width: 800px; max-height: 85vh;
      border-radius: 18px; border: 1px solid rgba(255,255,255,0.4);
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      display: flex; flex-direction: column; overflow: hidden;
    ">
      <div style="padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.08);">
        <div>
          <h2 style="margin: 0; font-size: 19px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.4px;">System Activity</h2>
          <p style="margin: 2px 0 0; font-size: 13px; color: #86868b;">${logs.length} events recorded</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="pm-log-clear" style="
            background: transparent; border: 1px solid rgba(0,0,0,0.1); 
            padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 500; 
            cursor: pointer; color: #ff3b30; transition: all 0.2s;
          ">Clear</button>
          <button id="pm-log-close" style="
            background: #1d1d1f; color: #fff; border: none; 
            padding: 8px 20px; border-radius: 10px; font-size: 13px; font-weight: 500; 
            cursor: pointer; transition: all 0.2s;
          ">Done</button>
        </div>
      </div>

      <div style="overflow-y: auto; flex: 1; background: rgba(255,255,255,0.3);">
        ${logs.length === 0
          ? '<div style="text-align:center; padding: 60px 0; color: #86868b; font-size: 15px;">No activity logged yet.</div>'
          : `<table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead style="position: sticky; top: 0; background: rgba(255,255,255,0.9); z-index: 1;">
                <tr>
                  <th style="padding: 12px 16px; font-size: 11px; font-weight: 600; color: #86868b; text-transform: uppercase;">Timestamp</th>
                  <th style="padding: 12px 16px; font-size: 11px; font-weight: 600; color: #86868b; text-transform: uppercase;">Type</th>
                  <th style="padding: 12px 16px; font-size: 11px; font-weight: 600; color: #86868b; text-transform: uppercase;">Payload Data</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>`
        }
      </div>

      <div style="padding: 12px 24px; background: rgba(0,0,0,0.02); border-top: 1px solid rgba(0,0,0,0.05); font-size: 11px; color: #86868b; text-align: center;">
        Storage utilization: <b>${Math.round((logs.length / LOG_MAX) * 100)}%</b> — Showing last ${LOG_MAX} events.
      </div>
    </div>
  `;

  document.documentElement.appendChild(overlay);

  // Smooth interaction logic
  const close = () => {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s ease';
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.querySelector('#pm-log-close').onclick = close;
  overlay.querySelector('#pm-log-clear').onclick = () => {
    clearLogs();
    close();
    api.notify('Activity logs cleared', 'success');
  };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}