export const meta = {
  id: 'plugin-manager',
  name: 'Plugin Manager',
  version: '5.7.7-v4',
  compat: '>=4.0.0',
  permissions: [
    'ui',
    'storage',
    'network',
    'registry',
    'system',
    'global-css'
  ]
};

let root = null;
let style = null;
let escHandler = null;
let contextMenuHandler = null;
let keydownHandler = null;
let pmRegisterUiHandler = null;
let apiRef = null;
let activeMenu = null;
let documentClickHandler = null;
let pmRegisterMenuActionHandler = null;
let externalMenuActions = new Map();

export function setup(api) {
  apiRef = api;

  const SELF_ID = meta.id;
  const COMMUNITY_URL = 'https://raw.githubusercontent.com/dheeraz101/Empty_Plugins/refs/heads/main/plugins.json';
  const DOCS_URL = 'https://empty-ad9a3406.mintlify.app/introduction';
  const CORE_VERSION = String(api.version || '4.0.0');
  const CACHE_TIMEOUT = 10 * 60 * 1000;
  const COMMUNITY_CACHE_KEY = 'pm:community-cache:v2';
  const LOG_KEY = 'pm:logs:v1';
  const SAFE_MODE_KEY = 'pm:safe-mode:v1';

  let lastCheckedTime = 0;
  let updateCount = 0;
  let installedFilter = 'all';
  let communityFilter = 'all';
  let globalSearch = '';
  let activeTab = 'installed';
  let communityCache = [];
  let remoteMetaCache = new Map();
  let slotRegistry = new Map();
  let reloadCooldowns = new Map();

  // ─────────────────────────────────────────────
  // CSS
  // ─────────────────────────────────────────────

  style = document.createElement('style');
  style.textContent = `
  .pm-root {
    --pm-bg: rgba(255,255,255,0.96);
    --pm-card: rgba(255,255,255,0.82);
    --pm-card-strong: rgba(255,255,255,0.94);
    --pm-text: #1d1d1f;
    --pm-muted: #6e6e73;
    --pm-soft-muted: #86868b;
    --pm-border: rgba(0,0,0,0.1);
    --pm-blue: #0071e3;
    --pm-red: #ff3b30;
    --pm-green: #34c759;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 820px;
    height: 600px;
    background: var(--pm-bg);
    backdrop-filter: blur(30px) saturate(180%);
    -webkit-backdrop-filter: blur(30px) saturate(180%);
    border: 1px solid var(--pm-border);
    box-shadow: 0 20px 60px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
    border-radius: 28px;
    display: flex;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--pm-text);
    z-index: 10000;
    isolation: isolate;
  }

  .pm-sidebar {
    width: 220px;
    background: var(--pm-card);
    border-right: 1px solid var(--pm-border);
    padding: 32px 12px 24px 12px;
    display: flex;
    flex-direction: column;
    height: 100%;
    box-sizing: border-box;
  }

  .pm-sidebar-title {
    padding: 0 14px 18px 14px;
    font-size: 12px;
    font-weight: 700;
    color: var(--pm-soft-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .pm-sidebar-footer {
    margin-top: auto;
    padding: 0 2px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .pm-tab {
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 500;
    color: #424245;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
    margin-bottom: 2px;
  }

  .pm-tab.active { background: rgba(0, 0, 0, 0.06); color: #000; font-weight: 600; }
  .pm-tab:hover:not(.active) { background: rgba(0, 0, 0, 0.03); }

  .pm-tab-container { display: flex; align-items: center; justify-content: space-between; width: 100%; }

  .pm-badge {
    background: var(--pm-red);
    color: white;
    font-size: 11px;
    font-weight: 600;
    min-width: 20px;
    height: 20px;
    border-radius: 10px;
    display: none;
    align-items: center;
    justify-content: center;
    margin-left: auto;
    padding: 0 6px;
    box-shadow: 0 2px 5px rgba(255, 59, 48, 0.3);
    letter-spacing: -0.3px;
    line-height: 1;
  }

  .pm-search-sidebar {
    margin: 10px 0 12px 0;
    position: relative;
  }

  .pm-search-sidebar .pm-search-input {
    height: 34px;
    width: 100%;
    padding: 0 34px 0 38px;
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.045);
    font-size: 13.5px;
    font-weight: 500;
    color: #424245;
    outline: none;
    box-sizing: border-box;
    transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  }

  .pm-search-sidebar .pm-search-input::placeholder { color: #86868b; }
  .pm-search-sidebar .pm-search-input:hover { background: rgba(0, 0, 0, 0.065); }
  .pm-search-sidebar .pm-search-input:focus {
    background: rgba(255, 255, 255, 0.72);
    border-color: rgba(0, 113, 227, 0.42);
    box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.12), 0 6px 18px rgba(0, 0, 0, 0.06);
  }

  .pm-sidebar-action-btn,
  #pm-actions .pm-btn {
    width: 100%;
    height: 32px;
    justify-content: flex-start;
    padding: 0 13px;
    gap: 9px;
    font-size: 13.2px;
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1;
  }

  #pm-actions .pm-btn svg {
    width: 15px;
    height: 15px;
    flex: 0 0 15px;
    stroke-width: 2.25;
  }

  #pm-actions .pm-btn span {
    flex: 1 1 auto;
    min-width: 0;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  #close-pm:hover {
    background: #ff3b30 !important;
    color: #fff !important;
    border-color: rgba(255, 59, 48, 0.5) !important;
  }

  .pm-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--pm-soft-muted);
    pointer-events: none;
  }

  .pm-search-clear {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.15);
    border: none;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    color: #424245;
    font-size: 12px;
    line-height: 1;
    font-weight: 700;
  }

  .pm-search-clear.visible { display: flex; }
  .pm-search-clear:hover { background: rgba(0, 0, 0, 0.25); }

  .pm-content {
    flex: 1;
    margin: 0;
    padding: 40px 32px;
    overflow-y: auto;
    scroll-behavior: smooth;
    scrollbar-gutter: stable;
    position: relative;
  }

  .pm-view-title { font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin: 0 0 4px 0; }
  .pm-view-subtitle { font-size: 15px; color: var(--pm-muted); margin: 0 0 24px 0; font-weight: 400; }
  .pm-list { display: flex; flex-direction: column; gap: 12px; position: relative; }

  .pm-toolbar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 0 0 18px 0;
  }

  .pm-filter-bar {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .pm-filter-btn {
    padding: 6px 13px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    background: rgba(0, 0, 0, 0.04);
    color: #424245;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .pm-filter-btn:hover { background: rgba(0, 0, 0, 0.08); }
  .pm-filter-btn.active { background: var(--pm-blue); color: white; }

  .plugin-item {
    background: var(--pm-card);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 20px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
    transition: transform 0.2s cubic-bezier(0.4,0,0.2,1), background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    transform: translateZ(0);
    will-change: transform, background, border-color;
  }

  .plugin-item:hover {
    transform: translateY(-1px);
    background: color-mix(in srgb, var(--pm-card) 85%, white);
    border-color: rgba(0, 0, 0, 0.15);
    box-shadow: 0 8px 20px rgba(0,0,0,0.04);
  }

  .plugin-item.clickable { cursor: pointer; }

  .plugin-icon-box {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #007aff, #00c7ff);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 18px;
    flex-shrink: 0;
    box-shadow: 0 4px 10px rgba(0, 122, 255, 0.2);
    overflow: hidden;
  }

  .plugin-info { flex: 1; min-width: 0; }
  .plugin-name-row { display:flex; align-items:center; gap:8px; min-width:0; }
  .plugin-name { font-weight: 650; font-size: 16px; color: var(--pm-text); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .plugin-meta { font-size: 13px; color: var(--pm-soft-muted); margin-top: 2px; }
  .plugin-desc { font-size: 13px; color: var(--pm-soft-muted); line-height: 1.35; margin-top: 6px; }

  .plugin-badge, .perm-badge, .trust-badge {
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.45px;
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
  }

  .badge-enabled { background: rgba(52, 199, 89, 0.15); color: #248a3d; }
  .badge-disabled { background: rgba(142,142,147,0.15); color: #8e8e93; }
  .badge-installing { background: rgba(0, 122, 255, 0.15); color: #007aff; animation: pm-pulse 1.2s ease-in-out infinite; }
  .badge-updating { background: rgba(255, 149, 0, 0.15); color: #cc7700; animation: pm-pulse 1.2s ease-in-out infinite; }
  .badge-failed, .badge-blocked { background: rgba(255, 59, 48, 0.15); color: #ff3b30; }
  .badge-update { background: rgba(0, 122, 255, 0.15); color: #007aff; }
  .badge-system { background: rgba(88, 86, 214, 0.15); color: #5856d6; }
  .badge-new { background: rgba(255, 149, 0, 0.15); color: #cc7700; }
  .badge-risk { background: rgba(255, 149, 0, 0.14); color: #b76e00; }
  .badge-incompatible { background: rgba(255, 59, 48, 0.14); color: #ff3b30; }

  .pm-badge-row { margin-top: 6px; display:flex; gap: 6px; align-items:center; flex-wrap: wrap; }

  .perm-badge { background: rgba(0,0,0,0.045); color: var(--pm-muted); text-transform: none; font-weight: 650; letter-spacing: 0; }
  .perm-badge.risky { background: rgba(255,149,0,0.12); color: #b76e00; }
  .trust-badge { text-transform: none; letter-spacing: 0; background: rgba(0,0,0,0.045); color: var(--pm-muted); }

  .pm-error-msg {
    font-size: 12px;
    color: var(--pm-red);
    margin-top: 4px;
    max-width: 310px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pm-root.pm-safe-mode-active .pm-sidebar {
    box-shadow: inset 3px 0 0 rgba(52,199,89,0.75);
  }

  .pm-root.pm-safe-mode-active .pm-sidebar-title::after {
    content: "SAFE";
    margin-left: 8px;
    padding: 2px 6px;
    border-radius: 999px;
    background: rgba(52,199,89,0.16);
    color: #34c759;
    font-size: 10px;
    letter-spacing: 0.06em;
  }

  .pm-action-group { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

  .pm-btn {
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 13.5px;
    font-weight: 650;
    border: none;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.15s ease, opacity 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-family: inherit;
    min-height: 30px;
  }

  .pm-btn:hover { transform: translateY(-0.5px); }
  .pm-btn[disabled] { opacity: 0.45; cursor: not-allowed; pointer-events: none; transform: none; }

  .pm-btn-primary { background: var(--pm-blue, #0071e3); color: white; }
  .pm-btn-primary:hover { background: #0077ed; }
  .pm-btn-danger { background: var(--pm-red, #ff3b30); color: white; }
  .pm-btn-danger:hover { background: #ff453a; }
  .pm-btn-secondary {
    background: color-mix(in srgb, var(--pm-card, rgba(255,255,255,0.82)) 70%, black);
    border: 1px solid rgba(0,0,0,0.08);
    color: var(--pm-text, #1d1d1f);
  }
  .pm-btn-secondary:hover { background: color-mix(in srgb, var(--pm-card, rgba(255,255,255,0.82)) 80%, black); }

  .pm-icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    padding: 0;
    border: none;
    background: rgba(0,0,0,0.04);
    color: var(--pm-muted);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .pm-icon-btn:hover { background: rgba(0,0,0,0.08); color: var(--pm-text); }

  .pm-toggle {
    width: 44px; height: 26px; border-radius: 999px; border: none; padding: 2px;
    background: rgba(142,142,147,0.32); cursor: pointer; transition: background 0.2s ease;
    position: relative; flex-shrink: 0;
  }
  .pm-toggle::after {
    content: ""; width: 22px; height: 22px; border-radius: 50%; background: white;
    box-shadow: 0 1px 4px rgba(0,0,0,0.22); position:absolute; top:2px; left:2px;
    transition: transform 0.2s cubic-bezier(0.4,0,0.2,1);
  }
  .pm-toggle.on { background: var(--pm-green); }
  .pm-toggle.on::after { transform: translateX(18px); }

  .pm-action-menu {
    position: fixed;
    min-width: 210px;
    background: rgba(44, 44, 46, 0.96);
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: 0 18px 46px rgba(0,0,0,0.42);
    border-radius: 14px;
    padding: 6px;
    z-index: 2147483647;
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    color: #f5f5f7;
  }

  .pm-menu-item {
    width: 100%;
    height: 36px;
    text-align: left;
    border: none;
    background: transparent;
    color: #f5f5f7;
    border-radius: 10px;
    padding: 0 10px;
    font-size: 13.4px;
    font-weight: 500;
    letter-spacing: -0.01em;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: grid;
    grid-template-columns: 20px 1fr;
    align-items: center;
    column-gap: 9px;
  }
  .pm-menu-item:hover {
    background: rgba(255,255,255,0.09);
  }

  .pm-menu-icon {
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    opacity: 0.82;
  }

  .pm-menu-icon svg {
    width: 15.5px;
    height: 15.5px;
    stroke-width: 2.15;
  }

  .pm-menu-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pm-menu-item.danger {
    color: #ff6961;
  }

  .pm-menu-separator {
    height: 1px;
    background: rgba(255,255,255,0.1);
    margin: 6px 4px;
  }
  .pm-btn-safe-active {
    background: rgba(52,199,89,0.16) !important;
    color: #34c759 !important;
    border-color: rgba(52,199,89,0.28) !important;
    box-shadow: inset 0 0 0 1px rgba(52,199,89,0.18);
  }
  .check-updates.spinning svg { animation: spin 0.8s linear infinite; }

  .pm-divider {
    display: flex; align-items: center; text-align: center;
    margin: 24px 0; color: var(--pm-soft-muted); font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1px;
  }
  .pm-divider::before, .pm-divider::after { content:''; flex:1; border-bottom:1px solid rgba(128,128,128,0.18); }
  .pm-divider:not(:empty)::before { margin-right: 15px; }
  .pm-divider:not(:empty)::after { margin-left: 15px; }

  .pm-no-results, .pm-empty-state {
    text-align: center;
    padding: 42px 20px;
    color: var(--pm-soft-muted);
    font-size: 14px;
  }
  .pm-empty-title { font-size: 17px; color: var(--pm-text); font-weight: 700; margin-bottom: 6px; }
  .pm-empty-subtitle { font-size: 14px; color: var(--pm-soft-muted); line-height: 1.4; margin-bottom: 16px; }

  .pm-modal-overlay {
    position: fixed; inset:0;
    background: rgba(0,0,0,0.22);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: 2147483647;
    display: flex; align-items: center; justify-content: center;
  }
  .pm-modal-content {
    background: rgba(34,34,36,0.96);
    width: 390px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
    overflow: auto;
    padding: 24px;
    border-radius: 24px;
    box-shadow: 0 20px 46px rgba(0,0,0,0.28);
    border: 1px solid rgba(255,255,255,0.12);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #f5f5f7;
  }
  .pm-modal-content.wide { width: 560px; }
  .pm-modal-title {
    margin: 0 0 18px 0;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #f5f5f7;
    line-height: 1.2;
  }
  .pm-modal-title::after {
    content: ""; display:block; margin-top:12px; height:1px; width:100%; background: rgba(128,128,128,0.18);
  }
  .pm-modal-message {
    margin: -2px 0 16px 0;
    font-size: 14px;
    line-height: 1.48;
    color: #c7c7cc;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .pm-modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }

  .pm-modal-actions .pm-btn {
    flex: 1;
    height: 32px;
    font-size: 13.4px;
    font-weight: 650;
  }
  .pm-modal-warning-box {
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(255,69,58,0.12);
    border: 1px solid rgba(255,69,58,0.22);
    color: #ffb4ab;
    font-size: 13.5px;
    font-weight: 550;
    line-height: 1.45;
    margin-bottom: 16px;
  }
  .pm-check-box {
    position: relative;
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
    margin-top: 1px;
  }

  .pm-check-box input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .pm-plugin-icon-actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    width: 100%;
    margin-top: 0;
  }

  .pm-plugin-mini-btn {
    height: 32px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.1);
    color: var(--pm-text);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.18s ease, transform 0.15s ease, border-color 0.18s ease;
    padding: 0;
  }

  .pm-plugin-mini-btn:hover {
    background: rgba(255,255,255,0.16);
    transform: translateY(-0.5px);
  }

  .pm-plugin-mini-btn svg {
    width: 15.5px;
    height: 15.5px;
    stroke-width: 2.25;
  }

  .pm-check-visual {
    position: absolute;
    inset: 0;
    border-radius: 5px;
    border: 1px solid rgba(255,255,255,0.24);
    background: rgba(255,255,255,0.08);
    transition: background 0.16s ease, border-color 0.16s ease;
  }

  .pm-check-box input:checked + .pm-check-visual {
    background: #0a84ff;
    border-color: #0a84ff;
  }

  .pm-check-box input:checked + .pm-check-visual::after {
    content: "";
    position: absolute;
    left: 4px;
    top: 1.5px;
    width: 5px;
    height: 9px;
    border: solid white;
    border-width: 0 1.8px 1.8px 0;
    transform: rotate(45deg);
  }
  .pm-input {
    width: 100%; padding: 12px; border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.1); background: rgba(255,255,255,0.5);
    margin-bottom: 12px; font-size: 14px; outline: none; box-sizing: border-box; transition: border 0.2s, background 0.2s;
    color: var(--pm-text); font-family: inherit;
  }
  .pm-input:focus { border-color: rgba(0,113,227,0.5); background: rgba(255,255,255,0.8); }

  .pm-checkbox-row {
    display:flex; gap:10px; align-items:flex-start; padding: 10px 0 2px; color: var(--pm-muted); font-size: 13.5px; line-height:1.35;
  }
  .pm-checkbox-row input { margin-top: 2px; accent-color: var(--pm-red); }

  .pm-detail-grid {
    display:grid; grid-template-columns: 130px 1fr; gap: 10px 14px;
    font-size: 13.5px; line-height: 1.35; margin: 12px 0;
  }
  .pm-detail-label { color: var(--pm-soft-muted); font-weight: 600; }
  .pm-detail-value { color: var(--pm-text); overflow-wrap:anywhere; }

  .pm-toast {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 2147483647;
    background: rgba(32, 32, 34, 0.94);
    color: #f5f5f7;
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: 0 16px 40px rgba(0,0,0,0.22);
    border-radius: 999px;
    padding: 9px 10px 9px 15px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13.2px;
    font-weight: 500;
    letter-spacing: -0.01em;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
  }

  .pm-toast span {
    white-space: nowrap;
  }

  .pm-toast button {
    border: none;
    background: rgba(255,255,255,0.14);
    color: #fff;
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
    font-family: inherit;
    cursor: pointer;
  }

  .pm-toast button:hover {
    background: rgba(255,255,255,0.22);
  }

  .pm-skeleton-card {
    height: 78px; border-radius:20px; background: rgba(0,0,0,0.045);
    border: 1px solid rgba(0,0,0,0.06); position:relative; overflow:hidden; margin-bottom:12px;
  }
  .pm-skeleton-card::after {
    content:""; position:absolute; inset:0; transform:translateX(-100%);
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.38), transparent);
    animation: pm-shimmer 1.2s infinite;
  }

  .last-checked { font-size: 11px; color: var(--pm-soft-muted); margin-top: 8px; text-align: right; opacity: 0.85; }

  .docs-link {
    display: flex; align-items: center; gap: 8px; padding: 10px 12px;
    font-size: 13px; color: var(--pm-blue); text-decoration: none; font-weight: 550; border-radius: 12px;
    transition: background 0.2s, color 0.2s;
  }
  .docs-link:hover { background: rgba(0, 113, 227, 0.05); }
  .sidebar-footer-text {
    font-size: 12.8px; color: var(--pm-soft-muted); line-height: 1.42; padding: 0 12px; margin: 0 0 2px 0; font-weight: 400;
  }
  .pm-modal-checkbox-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 4px 0 18px 0;
    font-size: 13.5px;
    line-height: 1.35;
    color: #6e6e73;
    user-select: none;
  }

  .pm-modal-checkbox-row input {
    width: 15px;
    height: 15px;
    accent-color: #0071e3;
  }

  .pm-content::-webkit-scrollbar { width: 12px; }
  .pm-content::-webkit-scrollbar-track { background: transparent; }
  .pm-content::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.08);
    border-radius: 20px;
    border: 3px solid transparent;
    background-clip: padding-box;
    min-height: 40px;
    transition: background-color 0.2s;
  }
  .pm-content:hover::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.2); }
  .pm-content { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.1) transparent; }

  @keyframes pm-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes pm-shimmer { 100% { transform:translateX(100%); } }

  @media (prefers-reduced-motion: reduce) {
    .pm-root *, .pm-root *::before, .pm-root *::after {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }

  @media (prefers-color-scheme: dark) {
    .pm-root {
      --pm-bg: rgba(28,28,30,0.75);
      --pm-card: rgba(255,255,255,0.05);
      --pm-card-strong: rgba(44,44,46,0.94);
      --pm-text: #f5f5f7;
      --pm-muted: #a1a1a6;
      --pm-soft-muted: #86868b;
      --pm-border: rgba(255,255,255,0.1);
      --pm-blue: #0a84ff;
      background: var(--pm-bg);
      border-color: var(--pm-border);
      color: var(--pm-text);
    }

    .pm-sidebar { background: var(--pm-card); }
    .pm-tab { color: #a1a1a6; }
    .pm-tab.active { background: rgba(255, 255, 255, 0.1); color: #fff; }
    .pm-tab:hover:not(.active) { background: rgba(255,255,255,0.06); }

    .plugin-item { background: var(--pm-card); border-color: rgba(255,255,255,0.1); }
    .plugin-item:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.16); }
    .plugin-name { color: var(--pm-text); }
    .pm-btn-secondary { background: rgba(255,255,255,0.1); color: var(--pm-text); border-color: rgba(255,255,255,0.1); }
    .pm-btn-secondary:hover { background: rgba(255,255,255,0.15); }
    .pm-icon-btn { background: rgba(255,255,255,0.08); color: var(--pm-muted); }
    .pm-icon-btn:hover { background: rgba(255,255,255,0.14); color: var(--pm-text); }

    .perm-badge, .trust-badge { background: rgba(255,255,255,0.08); color: #c7c7cc; }
    .perm-badge.risky, .badge-risk { background: rgba(255,149,0,0.16); color: #ffb340; }
    .badge-disabled { background: rgba(142,142,147,0.2); color: #98989d; }
    .badge-installing { background: rgba(0,122,255,0.2); color: #409cff; }
    .badge-updating { background: rgba(255,149,0,0.2); color: #ffb340; }
    .badge-failed, .badge-blocked { background: rgba(255,59,48,0.2); color: #ff6961; }
    .badge-system { background: rgba(88,86,214,0.22); color: #a9a7ff; }

    .pm-filter-btn { background: rgba(255,255,255,0.08); color: #a1a1a6; }
    .pm-filter-btn:hover { background: rgba(255,255,255,0.15); }
    .pm-filter-btn.active { background: var(--pm-blue); color: white; }

    .pm-search-sidebar .pm-search-input {
      color: #f5f5f7;
      background: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.08);
    }
    .pm-search-sidebar .pm-search-input::placeholder { color: rgba(245,245,247,0.48); }
    .pm-search-sidebar .pm-search-input:hover { background: rgba(255,255,255,0.105); }
    .pm-search-sidebar .pm-search-input:focus {
      background: rgba(255,255,255,0.13);
      border-color: rgba(10,132,255,0.55);
      box-shadow: 0 0 0 3px rgba(10,132,255,0.18), 0 8px 24px rgba(0,0,0,0.16);
    }
    .pm-search-icon { color: rgba(245,245,247,0.58); }
    .pm-search-clear { background: rgba(255,255,255,0.14); color: rgba(245,245,247,0.72); }
    .pm-search-clear:hover { background: rgba(255,255,255,0.24); color: #fff; }

    .pm-action-menu {
      background: rgba(38,38,40,0.96);
      border-color: rgba(255,255,255,0.12);
      box-shadow: 0 18px 46px rgba(0,0,0,0.42);
    }
    .pm-menu-item { color: #f5f5f7; }
    .pm-menu-item:hover { background: rgba(255,255,255,0.09); }
    .pm-menu-item.danger { color: #ff6961; }
    .pm-menu-separator { background: rgba(255,255,255,0.1); }

    .pm-modal-checkbox-row {
      color: #a1a1a6;
    }

    .pm-modal-content { background: rgba(34,34,36,0.96); color: #f5f5f7; border-color: rgba(255,255,255,0.12); }
    .pm-modal-overlay .pm-btn-secondary { background: rgba(255,255,255,0.11); color: #f5f5f7; border-color: rgba(255,255,255,0.12); }
    .pm-modal-overlay .pm-btn-secondary:hover { background: rgba(255,255,255,0.16); }
    .pm-modal-overlay .pm-btn-primary { background: #0a84ff; color: white; }
    .pm-modal-overlay .pm-btn-danger { background: #ff453a; color: white; }
    .pm-modal-overlay .pm-checkbox-row { color: #a1a1a6; }
    .pm-modal-title { color: #f5f5f7; }
    .pm-modal-title::after { background: rgba(255,255,255,0.08); }
    .pm-modal-message { color: var(--pm-muted); }
    .pm-modal-warning-box { background: rgba(255,69,58,0.12); border-color: rgba(255,69,58,0.22); color: #ffb4ab; }
    .pm-input { background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.1); color: white; }
    .pm-skeleton-card { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.08); }
    .pm-content::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.2); }
    .pm-content::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.35); }
    .pm-content { scrollbar-color: rgba(255,255,255,0.3) transparent; }
  }
`;
  document.head.appendChild(style);

  // ─────────────────────────────────────────────
  // ROOT
  // ─────────────────────────────────────────────

  root = document.createElement('div');
  root.className = 'pm-root';
  root.style.display = 'none';
  root.classList.toggle('pm-safe-mode-active', isSafeModeOn());

  root.innerHTML = `
    <div class="pm-sidebar">
      <div class="pm-sidebar-title">Library</div>

      <div class="pm-tab active" data-tab="installed">
        <div class="pm-tab-container">
          <div style="display:flex;align-items:center;gap:10px;">
            ${iconGrid()}
            <span>Installed</span>
          </div>
          <span id="update-badge-count" class="pm-badge"></span>
        </div>
      </div>

      <div class="pm-tab" data-tab="community">
        ${iconGlobe()}
        <span>Community</span>
      </div>

      <div class="pm-search-sidebar">
        ${iconSearch()}
        <input type="text" class="pm-search-input" id="pm-search" placeholder="Search... (Ctrl+F)" />
        <button class="pm-search-clear" id="pm-search-clear" aria-label="Clear search">&times;</button>
      </div>

      <div id="pm-actions" style="padding: 8px 14px 14px 14px; display:flex; flex-direction:column; gap:10px;"></div>

      <div class="pm-sidebar-footer">
        <a href="${DOCS_URL}" target="_blank" class="docs-link">
          ${iconBook()}
          Developer Portal
        </a>
        <p class="sidebar-footer-text">Add, manage, and control your tools in one place. Plugins extend and reshape your workspace.</p>
        <div style="padding: 0 10px;">
          <button id="close-pm" class="pm-btn pm-btn-secondary" style="width:100%;height:30px;">Close</button>
        </div>
      </div>
    </div>

    <div class="pm-content">
      <div id="installed">
        <h1 class="pm-view-title">Installed Plugins</h1>
        <p class="pm-view-subtitle">Manage and configure your active workspace tools.</p>
        <div class="pm-toolbar-row">
          <div class="pm-filter-bar">
            <button class="pm-filter-btn active" data-filter-installed="all">All</button>
            <button class="pm-filter-btn" data-filter-installed="system">System</button>
            <button class="pm-filter-btn" data-filter-installed="updates">Updates</button>
            <button class="pm-filter-btn" data-filter-installed="failed">Issues</button>
          </div>
        </div>
        <div class="pm-list"></div>
      </div>

      <div id="community" style="display:none;">
        <h1 class="pm-view-title">Discovery</h1>
        <p class="pm-view-subtitle">Explore new extensions built by the community.</p>
        <div class="pm-toolbar-row">
          <div class="pm-filter-bar" id="community-filter-bar">
            <button class="pm-filter-btn active" data-filter-community="all">All</button>
            <button class="pm-filter-btn" data-filter-community="productivity">Productivity</button>
            <button class="pm-filter-btn" data-filter-community="developer">Developer</button>
            <button class="pm-filter-btn" data-filter-community="utilities">Utilities</button>
            <button class="pm-filter-btn" data-filter-community="design">Design</button>
            <button class="pm-filter-btn" data-filter-community="system">System</button>
            <button class="pm-filter-btn" data-filter-community="new">New</button>
          </div>
        </div>
        <div class="pm-list"></div>
      </div>
    </div>
  `;

  api.boardEl.appendChild(root);

  if (typeof api.makeResizable === 'function') {
    api.makeResizable(root);
  }

  const slots = { 'header-actions': root.querySelector('#pm-actions') };
  registerCoreUI();

  // ─────────────────────────────────────────────
  // LISTENERS
  // ─────────────────────────────────────────────

  root.querySelector('#close-pm').onclick = () => {
    root.style.display = 'none';
  };

  keydownHandler = (e) => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (modifier && e.key.toLowerCase() === 'f') {
      const searchInput = root?.querySelector('#pm-search');
      if (searchInput && root && root.style.display !== 'none') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    }
  };
  window.addEventListener('keydown', keydownHandler);

  escHandler = (e) => {
    if (e.key === 'Escape') {
      closeActionMenu();
      if (root?.style.display === 'flex') root.style.display = 'none';
    }
  };
  document.addEventListener('keydown', escHandler);

  pmRegisterUiHandler = (payload = {}) => {
    try {
      const ok = registerPluginManagerUI(payload.slot, payload.element || payload.el, payload.id, payload.owner || payload.pluginId || 'external');
      if (!ok) api.bus.emit('pm:register-ui-failed', { reason: 'Invalid slot or element', slot: payload.slot });
    } catch (err) {
      console.error('[Plugin Manager] register-ui failed:', err);
      api.bus.emit('pm:register-ui-failed', { reason: err.message || 'Unknown error' });
    }
  };
  api.bus.on('pm:register-ui', pmRegisterUiHandler);

  pmRegisterMenuActionHandler = (payload = {}) => {
    try {
      const owner = String(payload.owner || payload.pluginId || payload.__source || 'external');
      const id = String(payload.id || '').trim();

      if (!id) {
        api.bus.emit('pm:register-menu-action-failed', {
          reason: 'Missing action id',
          owner
        });
        return;
      }

      const action = {
        id,
        owner,
        pluginId: payload.targetPluginId || payload.pluginId || '*',
        label: String(payload.label || 'Action'),
        icon: payload.icon || '',
        danger: payload.danger === true,
        showWhen: typeof payload.showWhen === 'function' ? payload.showWhen : null,
        handler: typeof payload.handler === 'function' ? payload.handler : null,
        event: payload.event || null
      };

      if (!externalMenuActions.has(owner)) {
        externalMenuActions.set(owner, new Map());
      }

      externalMenuActions.get(owner).set(id, action);

      api.bus.emit('pm:menu-action-registered', {
        owner,
        id
      });
    } catch (err) {
      console.error('[Plugin Manager] register-menu-action failed:', err);
      api.bus.emit('pm:register-menu-action-failed', {
        reason: err.message || 'Unknown error'
      });
    }
  };

  api.bus.on('pm:register-menu-action', pmRegisterMenuActionHandler);

  root.addEventListener('click', onRootClick);

  root.querySelectorAll('.pm-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.closest('.pm-filter-bar');
      container.querySelectorAll('.pm-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (btn.dataset.filterInstalled) {
        installedFilter = btn.dataset.filterInstalled;
        renderInstalled();
      } else if (btn.dataset.filterCommunity) {
        communityFilter = btn.dataset.filterCommunity;
        renderCommunity();
      }
    });
  });

  const globalSearchInput = root.querySelector('#pm-search');
  const globalSearchClear = root.querySelector('#pm-search-clear');

  globalSearchInput?.addEventListener('input', (e) => {
    globalSearch = e.target.value;
    globalSearchClear?.classList.toggle('visible', globalSearch.length > 0);
    renderInstalled();
    renderCommunity();
  });

  globalSearchClear.onclick = () => {
    globalSearch = '';
    globalSearchInput.value = '';
    globalSearchClear.classList.remove('visible');
    renderInstalled();
    renderCommunity();
  };

  documentClickHandler = (e) => {
    if (
      activeMenu &&
      !e.target.closest('.pm-action-menu') &&
      !e.target.closest('[data-act="menu"]')
    ) {
      closeActionMenu();
    }
  };

  document.addEventListener('click', documentClickHandler);

  contextMenuHandler = (e) => {
    if (e.target.closest('.pm-root')) return;
    e.preventDefault();
    root.style.display = 'flex';
    switchTab('installed');
  };
  api.boardEl.addEventListener('contextmenu', contextMenuHandler);

  loadCommunityFromCache();
  log('pm:loaded', { version: meta.version });
  api.bus.emit('pm:loaded', { version: meta.version });

  // ─────────────────────────────────────────────
  // UI REGISTRATION
  // ─────────────────────────────────────────────

  function registerCoreUI() {
    const actions = root.querySelector('#pm-actions');
    actions.innerHTML = '';

    const checkUpdatesBtn = document.createElement('button');
    checkUpdatesBtn.className = 'pm-btn pm-btn-secondary check-updates';
    checkUpdatesBtn.classList.add('pm-sidebar-action-btn');
    checkUpdatesBtn.innerHTML = `${iconRefresh(15)}<span>Check Updates</span>`;
    checkUpdatesBtn.onclick = async () => {
      const originalHTML = checkUpdatesBtn.innerHTML;

      checkUpdatesBtn.disabled = true;
      checkUpdatesBtn.classList.add('spinning');
      checkUpdatesBtn.innerHTML = `${iconRefresh(15)}<span>Checking…</span>`;

      const startedAt = Date.now();

      await renderInstalled(true);

      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, 2000 - elapsed);

      setTimeout(() => {
        checkUpdatesBtn.classList.remove('spinning');

        if (updateCount > 0) {
        checkUpdatesBtn.innerHTML = `${iconRefresh(15)}<span>${updateCount} Update${updateCount === 1 ? '' : 's'}</span>`;
        } else {
        checkUpdatesBtn.innerHTML = `${iconCheck(15)}<span>You're up to date</span>`;

          setTimeout(() => {
            checkUpdatesBtn.innerHTML = originalHTML;
            checkUpdatesBtn.disabled = false;
          }, 1800);

          return;
        }

        checkUpdatesBtn.disabled = false;
      }, wait);
    };
    actions.appendChild(checkUpdatesBtn);

    const installBtn = document.createElement('button');
    installBtn.className = 'pm-btn pm-btn-primary';
    installBtn.classList.add('pm-sidebar-action-btn');
    installBtn.innerHTML = `${iconPlus(15)}<span>Install via URL</span>`;
    installBtn.onclick = openInstallModal;
    actions.appendChild(installBtn);

    const safeBtn = document.createElement('button');
    safeBtn.className = `pm-btn pm-btn-secondary ${isSafeModeOn() ? 'pm-btn-safe-active' : ''}`;
    safeBtn.classList.add('pm-sidebar-action-btn');
    safeBtn.innerHTML = `${iconShield(15)}<span>${isSafeModeOn() ? 'Safe Mode On' : 'Safe Mode'}</span>`;
    safeBtn.title = isSafeModeOn() ? 'Safe Mode is active. Click to turn it off.' : 'Disable all non-system plugins.';
    safeBtn.onclick = isSafeModeOn() ? disableSafeMode : enableSafeMode;
    actions.appendChild(safeBtn);

    const resetLayoutBtn = document.createElement('button');
    resetLayoutBtn.className = 'pm-btn pm-btn-secondary pm-sidebar-action-btn';
    resetLayoutBtn.innerHTML = `${iconReset(15)}<span>Reset Layout</span>`;
    resetLayoutBtn.onclick = resetPluginManagerLayout;
    actions.appendChild(resetLayoutBtn);

    const pluginIconRow = document.createElement('div');
    pluginIconRow.id = 'pm-plugin-icon-actions';
    pluginIconRow.className = 'pm-plugin-icon-actions';
    actions.appendChild(pluginIconRow);

    slots['sidebar-icons'] = pluginIconRow;

    restoreRegisteredUI('sidebar-icons');

    api.bus.emit('pm:ui-slots-ready', {
      slots: Object.keys(slots)
    });
  }

  function registerPluginManagerUI(slot, el, id, owner = SELF_ID) {
    if (!slot || !slots[slot] || !(el instanceof HTMLElement)) return false;

    const safeOwner = String(owner || 'external');
    const safeId = id ? String(id) : '';

    // Replace old UI from the same owner/id instead of duplicating or keeping stale detached nodes.
    if (safeId && slotRegistry.has(safeOwner)) {
      const oldItems = slotRegistry.get(safeOwner) || [];
      const kept = [];

      oldItems.forEach(oldEl => {
        if (oldEl?.dataset?.uiId === safeId) {
          try { oldEl.remove(); } catch {}
        } else {
          kept.push(oldEl);
        }
      });

      slotRegistry.set(safeOwner, kept);
    }

    if (safeId) el.dataset.uiId = safeId;
    el.dataset.owner = safeOwner;
    el.dataset.pmSlot = slot;
    el.dataset.pluginOwner = safeOwner;

    slots[slot].appendChild(el);

    if (!slotRegistry.has(safeOwner)) slotRegistry.set(safeOwner, []);
    slotRegistry.get(safeOwner).push(el);

    return true;
  }

  function cleanupPluginUI(pluginId) {
    const items = slotRegistry.get(pluginId);
    if (!items) return;
    items.forEach(el => { try { el.remove(); } catch {} });
    slotRegistry.delete(pluginId);
  }

  function restoreRegisteredUI(slotName = null) {
    for (const [owner, items] of slotRegistry.entries()) {
      const kept = [];

      items.forEach(el => {
        if (!el || !(el instanceof HTMLElement)) return;

        const slot = el.dataset.pmSlot;
        if (slotName && slot !== slotName) {
          kept.push(el);
          return;
        }

        const target = slots[slot];
        if (!target) {
          kept.push(el);
          return;
        }

        try {
          if (!el.isConnected) {
            target.appendChild(el);
          }
          kept.push(el);
        } catch {}
      });

      if (kept.length) {
        slotRegistry.set(owner, kept);
      } else {
        slotRegistry.delete(owner);
      }
    }
  }

  // ─────────────────────────────────────────────
  // RENDERING
  // ─────────────────────────────────────────────

  function switchTab(tabName) {
    if (!root) return;

    const installedView = root.querySelector('#installed');
    const communityView = root.querySelector('#community');
    if (!installedView || !communityView) return;

    root.querySelectorAll('.pm-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    installedView.style.display = tabName === 'installed' ? 'block' : 'none';
    communityView.style.display = tabName === 'community' ? 'block' : 'none';

    activeTab = tabName;

    if (tabName === 'installed') renderInstalled();
    if (tabName === 'community') renderCommunity();
  }

  async function renderInstalled(forceCheck = false) {
    if (!root || !document.body.contains(root)) return;

    const listEl = root.querySelector('#installed .pm-list');
    if (!listEl) return;

    let plugins = api.registry.getAll();
    const now = Date.now();
    const shouldCheck = forceCheck || (now - lastCheckedTime > CACHE_TIMEOUT);

    if (shouldCheck) {
      lastCheckedTime = now;
      const results = await Promise.all(plugins.map(p => fetchRemoteMeta(getRemoteUrl(p))));
      const freshRegistry = api.registry.getAll();
      let changed = false;

      results.forEach((metaObj, index) => {
        const item = freshRegistry.find(p => p.id === plugins[index]?.id);
        if (!item || !metaObj || metaObj.__error) return;
        remoteMetaCache.set(item.id, metaObj);
        if (metaObj.version) {
          const installedVersion = normalizeVersionLabel(item.version || '0.0.0');
          const remoteVersion = normalizeVersionLabel(metaObj.version);

          // Always sync the checked remote version so stale registry values stop showing fake updates.
          if (normalizeVersionLabel(item.remoteVersion || '') !== remoteVersion) {
            item.remoteVersion = metaObj.version;
            changed = true;
          }

          // If remote is not newer, clear old update-looking state.
          if (compareVersions(remoteVersion, installedVersion) <= 0 && item.status !== 'updating') {
            item.remoteVersion = metaObj.version;
            changed = true;
          }
        }
      });

      if (changed) api.registry.save(freshRegistry);
      plugins = api.registry.getAll();
    }

    const communityMap = new Map(communityCache.map(p => [p.id, p]));
    let rows = plugins.map((p, index) => {
      const remoteMeta = remoteMetaCache.get(p.id) || null;
      const community = communityMap.get(p.id) || {};
      const merged = { ...community, ...p };
      return { p: merged, remoteMeta, index };
    });

    let availableUpdates = 0;
    rows.forEach(({ p, remoteMeta }) => {
      if (hasPluginUpdate(p, remoteMeta)) availableUpdates++;
    });

    rows = rows.filter(({ p, remoteMeta }) => {
      if (installedFilter === 'system' && !isSystemPlugin(p)) return false;
      if (installedFilter === 'updates' && !hasPluginUpdate(p, remoteMeta)) return false;
      if (installedFilter === 'failed' && !['failed', 'blocked'].includes(getPluginStatus(p))) return false;

      if (globalSearch.trim()) {
        const term = globalSearch.toLowerCase().trim();
        return [p.name, p.id, p.description, p.author].some(v => String(v || '').toLowerCase().includes(term));
      }

      return true;
    });

    if (!rows.length) {
      listEl.innerHTML = emptyStateHTML(
        globalSearch ? `No plugins found for “${escapeHTML(globalSearch)}”` : 'No plugins here',
        globalSearch ? 'Try a different search or clear the search field.' : 'Install a plugin to start shaping your board.',
        globalSearch ? '<button class="pm-btn pm-btn-secondary" data-act="clear-search">Clear Search</button>' : ''
      );
      updateBadge(availableUpdates);
      return;
    }

    const systemRows = rows.filter(({ p }) => isSystemPlugin(p));
    const normalRows = rows.filter(({ p }) => !isSystemPlugin(p));

    let html = '';
    if (systemRows.length) {
      html += systemRows.map(({ p, remoteMeta }) => pluginRowHTML(p, remoteMeta, true)).join('');
    }

    if (systemRows.length && normalRows.length) {
      html += '<div class="pm-divider">Standard Extensions</div>';
    }

    if (normalRows.length) {
      html += normalRows.map(({ p, remoteMeta }) => pluginRowHTML(p, remoteMeta, false)).join('');
    }

    html += lastCheckedTime ? `<div class="last-checked">Last checked ${timeAgo(lastCheckedTime)}</div>` : '';
    listEl.innerHTML = html;
    updateBadge(availableUpdates);
  }

  async function renderCommunity(forceRefresh = false) {
    if (!root || !document.body.contains(root)) return;

    const listEl = root.querySelector('#community .pm-list');
    if (!listEl) return;

    if (!communityCache.length) {
      listEl.innerHTML = skeletonHTML(4);
    }

    if (forceRefresh || !communityCache.length || isCommunityCacheStale()) {
      try {
        await refreshCommunityCache();
      } catch (err) {
        if (!communityCache.length) {
          listEl.innerHTML = emptyStateHTML(
            'Couldn’t load Community Store',
            'Check your connection, then try again.',
            '<button class="pm-btn pm-btn-primary" data-act="retry-community">Retry</button>'
          );
          return;
        }
      }
    }

    const registry = api.registry.getAll();
    const installed = new Set(registry.map(p => p.id));
    const installedVersions = registry.reduce((acc, item) => {
      if (item.version) acc[item.id] = item.version;
      return acc;
    }, {});

    let plugins = [...communityCache];

    plugins = plugins.filter(p => {
      if (communityFilter === 'system' && p.category !== 'system') return false;
      if (communityFilter === 'new' && !isPluginNew(p.date)) return false;
      if (!['all', 'system', 'new'].includes(communityFilter) && normalizeCategory(p.category) !== communityFilter) return false;

      if (globalSearch.trim()) {
        const term = globalSearch.toLowerCase().trim();
        return [p.name, p.id, p.description, p.author, p.category].some(v => String(v || '').toLowerCase().includes(term));
      }

      return true;
    });

    if (!plugins.length) {
      listEl.innerHTML = emptyStateHTML(
        globalSearch ? `No plugins found for “${escapeHTML(globalSearch)}”` : 'No plugins in this category',
        globalSearch ? 'Try a different search or clear the search field.' : 'Try another category.',
        globalSearch ? '<button class="pm-btn pm-btn-secondary" data-act="clear-search">Clear Search</button>' : ''
      );
      return;
    }

    listEl.innerHTML = plugins.map(p => communityRowHTML(p, installed.has(p.id), installedVersions[p.id])).join('');
  }

  function pluginRowHTML(p, remoteMeta, isSystem) {
    const status = p.id === SELF_ID ? 'active' : getPluginStatus(p);
    const displayName = escapeHTML(remoteMeta?.name || p.name || p.id);
    const installedVer = p.version || remoteMeta?.version || p.remoteVersion || null;
    const remoteVer = remoteMeta?.version || p.remoteVersion || null;
    const hasUpdate = hasPluginUpdate(p, remoteMeta);
    const iconContent = p.icon || remoteMeta?.icon || getCommunityIcon(p.id) || '📦';
    const iconBg = pickColor(p.id);
    const busy = isBusy(p);
    const incompatible = !isCompatible(p.compat || remoteMeta?.compat);
    const permissions = normalizePermissions(p.permissions || remoteMeta?.permissions || inferPermissions(p));
    const trust = getTrustLabel(p);
    const sourceBadge = `<span class="trust-badge">${escapeHTML(trust)}</span>`;
    const versionText = installedVer ? `v${escapeHTML(installedVer)}` : 'Version unknown';
    const errorHtml = p.error ? `<div class="pm-error-msg" title="${escapeHTML(p.error)}">⚠ ${escapeHTML(p.error)}</div>` : '';
    const crashHtml = Number(p.crashCount || 0) > 0 ? `<span class="plugin-badge badge-risk">${Number(p.crashCount)} issue${Number(p.crashCount) === 1 ? '' : 's'}</span>` : '';
    const updateBadge = hasUpdate ? '<span class="plugin-badge badge-update">Update Available</span>' : '';
    const systemBadge = isSystem ? '<span class="plugin-badge badge-system">System</span>' : '';
    const statusBadge = statusBadgeHTML(status, isSystem);
    const visiblePermissions = permissions.filter(permission => permission !== 'system');
    const permBadges = visiblePermissions.slice(0, 4).map(permissionBadgeHTML).join('');
    const disabled = busy || incompatible || status === 'blocked';

    return `
      <div class="plugin-item clickable" data-plugin-id="${escapeAttr(p.id)}">
        <div class="plugin-icon-box" style="background:${iconBg};">${iconHTML(iconContent, displayName)}</div>
        <div class="plugin-info">
          <div class="plugin-name-row">
            <span class="plugin-name">${displayName}</span>
            <span class="plugin-badge badge-disabled">${versionText}</span>
          </div>
          <div class="plugin-meta">${escapeHTML(p.id)}</div>
          <div class="pm-badge-row">
            ${statusBadge}
            ${systemBadge}
            ${updateBadge}
            ${incompatible ? '<span class="plugin-badge badge-incompatible">Not Compatible</span>' : ''}
            ${crashHtml}
            ${sourceBadge}
          </div>
          <div class="pm-badge-row">${permBadges}</div>
          ${errorHtml}
        </div>
        <div class="pm-action-group">
          ${hasUpdate && !busy ? `<button class="pm-btn pm-btn-primary" data-update="${escapeAttr(p.id)}">Update</button>` : ''}
          ${p.id === SELF_ID ? '' : `<button class="pm-toggle ${p.enabled ? 'on' : ''}" data-act="toggle" data-id="${escapeAttr(p.id)}" title="${p.enabled ? 'Disable' : 'Enable'}" ${disabled ? 'disabled' : ''}></button>`}
          ${p.id === SELF_ID ? '' : `<button class="pm-icon-btn" data-act="menu" data-id="${escapeAttr(p.id)}" title="More actions" aria-label="More actions">
          ${iconEllipsis(17)}
        </button>`}
        </div>
      </div>
    `;
  }

  function communityRowHTML(p, isInstalled, installedVersion) {
    const displayName = escapeHTML(p.name || p.id);
    const category = normalizeCategory(p.category);
    const permissions = normalizePermissions(p.permissions || inferPermissions(p));
    const incompatible = !isCompatible(p.compat);
    const isNew = isPluginNew(p.date);
    const isSystem = p.category === 'system';
    const displayVersion = p.version || installedVersion;
    const iconBg = pickColor(p.id);

    const badges = [
      isSystem ? '<span class="plugin-badge badge-system">System</span>' : '',
      isNew ? '<span class="plugin-badge badge-new">New</span>' : '',
      incompatible ? '<span class="plugin-badge badge-incompatible">Not Compatible</span>' : '',
      `<span class="trust-badge">${escapeHTML(categoryLabel(category))}</span>`
    ].filter(Boolean).join('');

    const permBadges = permissions.slice(0, 4).map(permissionBadgeHTML).join('');

    return `
      <div class="plugin-item clickable" data-community-id="${escapeAttr(p.id)}">
        <div class="plugin-icon-box" style="background:${iconBg};">${iconHTML(p.icon || '📦', displayName)}</div>
        <div class="plugin-info">
          <div class="plugin-name-row">
            <span class="plugin-name">${displayName}</span>
            ${displayVersion ? `<span class="plugin-badge badge-disabled">v${escapeHTML(displayVersion)}</span>` : ''}
          </div>
          <div class="plugin-meta">${escapeHTML(p.author || 'Unknown')} • ${escapeHTML(p.id)}</div>
          <div class="pm-badge-row">${badges}</div>
          <div class="pm-badge-row">${permBadges}</div>
          <div class="plugin-desc">${escapeHTML(p.description || '')}</div>
        </div>
        <div class="pm-action-group" style="min-width:112px;">
          ${
            isInstalled
              ? `<button class="pm-btn pm-btn-secondary" disabled style="width:100%;">Installed</button>`
              : `<button class="pm-btn pm-btn-primary" style="width:100%;" data-install="${escapeAttr(p.id)}" data-url="${escapeAttr(p.url)}" ${incompatible ? 'disabled title="Not compatible with this Blank Board version"' : ''}>Install</button>`
          }
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────

  async function onRootClick(e) {
    const tab = e.target.closest('.pm-tab');
    if (tab && root.contains(tab)) {
      e.preventDefault();
      switchTab(tab.dataset.tab);
      return;
    }

    const pluginCard = e.target.closest('[data-plugin-id]');
    const communityCard = e.target.closest('[data-community-id]');
    const btn = e.target.closest('button');

    if (btn && root.contains(btn)) {
      await handleButtonClick(btn, e);
      return;
    }

    if (pluginCard && root.contains(pluginCard)) {
      showPluginDetails(pluginCard.dataset.pluginId);
      return;
    }

    if (communityCard && root.contains(communityCard)) {
      showCommunityDetails(communityCard.dataset.communityId);
    }
  }

  async function handleButtonClick(btn, e) {
    const id = btn.dataset.id;

    if (btn.dataset.act === 'clear-search') {
      clearSearch();
      return;
    }

    if (btn.dataset.act === 'retry-community') {
      await renderCommunity(true);
      return;
    }

    if (btn.dataset.act === 'menu') {
      e.preventDefault();
      e.stopPropagation();
      openActionMenu(btn, id);
      return;
    }

    if (btn.dataset.menuAction) {
      e.preventDefault();
      e.stopPropagation();
      closeActionMenu();

      if (btn.dataset.menuAction === 'external') {
        await runExternalMenuAction(
          btn.dataset.externalOwner,
          btn.dataset.externalId,
          btn.dataset.id
        );
        return;
      }

      await handleMenuAction(btn.dataset.menuAction, btn.dataset.id);
      return;
    }

    if (btn.dataset.act === 'toggle') {
      e.preventDefault();
      e.stopPropagation();
      await togglePlugin(id, btn);
      return;
    }

    if (btn.dataset.install) {
      e.preventDefault();
      e.stopPropagation();
      await installCommunityPlugin(btn.dataset.install, btn.dataset.url, btn);
      return;
    }

    if (btn.dataset.update) {
      e.preventDefault();
      e.stopPropagation();
      await updatePlugin(btn.dataset.update, btn);
      return;
    }
  }

  async function handleMenuAction(action, id) {

    if (action === 'details') return showPluginDetails(id);
    if (action === 'whats-new') return showWhatsNewModal(id);
    if (action === 'reload') return reloadPlugin(id);
    if (action === 'delete') return deletePluginWithConfirmation(id);
    if (action === 'logs') return showLogsModal();
    if (action === 'reset-layout') return resetPluginManagerLayout();
    if (action === 'check-update') return checkSingleUpdate(id);
  }

  async function togglePlugin(id, btn) {
    const entry = api.registry.getAll().find(p => p.id === id);
    if (!entry || isBusy(entry)) return;

    if (isSafeModeOn() && !entry.enabled && !isSystemPlugin(entry)) {
      await showConfirmModal({
        title: 'Safe Mode Is On',
        message: `Turn off Safe Mode before enabling “${entry.name || id}”.`,
        warning: 'Safe Mode keeps non-system plugins disabled so a broken plugin cannot keep damaging the board.',
        confirmText: 'OK',
        cancelText: 'Close',
        danger: false
      });
      return;
    }

    setButtonBusy(btn, '');
    try {
      log('pm:toggle', { id, to: entry.enabled ? 'disabled' : 'active' });
      const ok = await api.togglePlugin(id);
      if (!ok) throw new Error(readPluginError(id) || 'Plugin toggle failed');
      cleanupPluginUI(id);
      setPluginStatus(id, entry.enabled ? 'disabled' : 'active');
    } catch (err) {
      setPluginStatus(id, 'failed', err.message || 'Toggle failed');
      api.notify('Toggle failed', 'error');
      log('pm:toggle-fail', { id, error: err.message });
    }
    renderInstalled();
  }

  async function reloadPlugin(id) {
    if (id === SELF_ID) {
      api.notify('Plugin Manager cannot reload itself. Refresh the board instead.', 'warning');
      return;
    }

    const entry = api.registry.getAll().find(p => p.id === id);
    if (!entry || !entry.enabled || isBusy(entry)) return;

    const cooldownMs = 30000;
    const last = reloadCooldowns.get(id) || 0;
    if (Date.now() - last < cooldownMs) {
      api.notify('Please wait before reloading again', 'warning');
      return;
    }

    reloadCooldowns.set(id, Date.now());
    setPluginStatus(id, 'updating');

    try {
      log('pm:reload-start', { id });
      const ok = await api.reloadPlugin(id);
      if (!ok) throw new Error(readPluginError(id) || 'Plugin reload failed');
      setPluginStatus(id, 'active');
      incrementCrash(id, false);
      api.notify(`Reloaded ${entry.name || id}`, 'success');
      log('pm:reload-success', { id });
    } catch (err) {
      handlePluginFailure(id, err, 'Reload failed');
    }

    renderInstalled();
  }

  async function checkSingleUpdate(id) {
    const entry = api.registry.getAll().find(p => p.id === id);
    if (!entry) return;

    const metaObj = await fetchRemoteMeta(getRemoteUrl(entry));
    if (!metaObj || metaObj.__error) {
      api.notify('Could not check for updates', 'error');
      return;
    }

    remoteMetaCache.set(id, metaObj);

    if (hasPluginUpdate(entry, metaObj)) {
      api.notify(`Update available: ${metaObj.version}`, 'info');
    } else {
      api.notify('Plugin is up to date', 'success');
    }

    renderInstalled();
  }

  async function installCommunityPlugin(id, url, btn) {
    if (isSafeModeOn()) {
      await showConfirmModal({
        title: 'Safe Mode Is On',
        message: 'Turn off Safe Mode before installing plugins.',
        warning: 'Safe Mode is designed to keep your board stable by blocking non-system plugin installs and enables.',
        confirmText: 'OK',
        cancelText: 'Close',
        danger: false
      });
      return;
    }
    const community = communityCache.find(p => p.id === id) || {};
    const isManualInstall = !community.id;
    const remoteMeta = await fetchRemoteMeta(url);

    if (!remoteMeta || remoteMeta.__error) {
      api.notify('Invalid plugin. Metadata could not be read.', 'error');
      return;
    }

    const pluginDef = {
      ...community,
      ...remoteMeta,
      id: remoteMeta.id || id,
      url,
      enabled: true,
      source: isManualInstall ? 'manual' : 'registry',
      remoteVersion: remoteMeta.version || community.version || null,
      status: 'installing',
      error: null,
      installedAt: Date.now(),
      trust: community.trust || (isManualInstall ? 'manual' : 'community'),
      permissions: normalizePermissions(remoteMeta.permissions || community.permissions || inferPermissions(community)),
      category: community.category || remoteMeta.category || 'utilities'
    };

    if (pluginDef.id !== id) {
      api.notify(`Plugin ID mismatch: expected "${id}", got "${pluginDef.id}"`, 'error');
      return;
    }

    if (!isCompatible(pluginDef.compat)) {
      api.notify('This plugin is not compatible with your Blank Board version', 'error');
      return;
    }

    if (api.registry.getAll().some(p => p.id === pluginDef.id)) {
      api.notify('Plugin already installed', 'warning');
      return;
    }

    const confirmed = await showInstallConfirm(pluginDef);
    if (!confirmed) return;

    setButtonBusy(btn, 'Installing…');

    try {
      api.registry.save([...api.registry.getAll(), pluginDef]);
      renderInstalled();
      const ok = await api.reloadPlugin(pluginDef.id);
      if (!ok) throw new Error(readPluginError(pluginDef.id) || 'Plugin failed to load');
      setPluginStatus(pluginDef.id, 'active');
      {
        const reg = api.registry.getAll();
        const item = reg.find(p => p.id === pluginDef.id);

        if (item) {
          item.version = remoteMeta.version || item.version || pluginDef.version || '0.0.0';
          item.remoteVersion = remoteMeta.version || item.version;
          item.status = 'active';
          item.error = null;
          api.registry.save(reg);
        }

        remoteMetaCache.set(pluginDef.id, remoteMeta);
      }
      incrementCrash(pluginDef.id, false);
      api.notify(`${pluginDef.name || pluginDef.id} installed`, 'success');
      log('pm:install-success', { id: pluginDef.id, version: pluginDef.version });
    } catch (err) {
      setPluginStatus(pluginDef.id, 'failed', err.message || 'Install failed');
      incrementCrash(pluginDef.id, true);
      api.notify('Install failed', 'error');
      log('pm:install-fail', { id: pluginDef.id, error: err.message });
    }

    renderInstalled();
    renderCommunity();
  }

  async function updatePlugin(id, btn) {
    const entry = api.registry.getAll().find(p => p.id === id);
    if (!entry || isBusy(entry)) return;

    const updateUrl = getRemoteUrl(entry);
    const remoteMeta = await fetchRemoteMeta(updateUrl);

    if (!remoteMeta || remoteMeta.__error) {
      api.notify('Could not read update metadata', 'error');
      return;
    }

    if (!hasPluginUpdate(entry, remoteMeta)) {
      api.notify('Plugin is already up to date', 'success');
      return;
    }

    if (!isCompatible(remoteMeta.compat || entry.compat)) {
      api.notify('This update is not compatible with your Blank Board version', 'error');
      return;
    }

    const confirmed = await showConfirmModal({
      title: `Update ${entry.id === SELF_ID ? 'Plugin Manager' : 'Plugin'}?`,
      message: `${entry.name || id} will update from v${entry.version || 'unknown'} to v${remoteMeta.version || 'latest'}.`,
      warning: entry.id === SELF_ID
        ? 'Plugin Manager will refresh the board after updating.'
        : 'The plugin will reload automatically after the update.',
      confirmText: 'Update',
      cancelText: 'Cancel',
      danger: false
    });

    if (!confirmed.confirmed) {
      log('pm:update-cancelled', { id });
      return;
    }

    setButtonBusy(btn, 'Updating…');
    setPluginStatus(id, 'updating');

    log('pm:update-start', {
      id,
      from: entry.version || null,
      to: remoteMeta.version || null,
      url: getRemoteUrl(entry)
    });

    try {
      api.bus.emit('pm:before-update', {
        id,
        entry: { ...entry },
        remoteMeta: { ...remoteMeta },
        url: getRemoteUrl(entry)
      });
    } catch {}

    try {
      const reg = api.registry.getAll();
      const item = reg.find(p => p.id === id);
      if (item) {
        item.url = updateUrl || item.url;
        item.version = remoteMeta.version || item.version;
        item.remoteVersion = remoteMeta.version || item.remoteVersion;
        item.name = remoteMeta.name || item.name;
        item.icon = remoteMeta.icon || item.icon;
        item.permissions = normalizePermissions(remoteMeta.permissions || item.permissions || inferPermissions(item));
        item.compat = remoteMeta.compat || item.compat;
        item.updatedAt = Date.now();
      }
      api.registry.save(reg);

      const ok = await api.reloadPlugin(id);
      if (!ok) throw new Error(readPluginError(id) || 'Plugin update failed while reloading');
      setPluginStatus(id, 'active');
      {
        const reg = api.registry.getAll();
        const item = reg.find(p => p.id === id);

        if (item) {
          item.version = remoteMeta.version || item.version;
          item.remoteVersion = remoteMeta.version || item.version;
          item.status = 'active';
          item.error = null;
          api.registry.save(reg);
        }

        remoteMetaCache.set(id, remoteMeta);
      }
      incrementCrash(id, false);
      api.notify(`${entry.name || id} updated`, 'success');
      log('pm:update-success', { id, version: remoteMeta.version });

      if (id === SELF_ID) {
        setTimeout(() => window.location.reload(), 350);
        return;
      }
    } catch (err) {
      handlePluginFailure(id, err, 'Update failed');
    }

    renderInstalled(true);
  }

  async function deletePluginWithConfirmation(id) {
    const entry = api.registry.getAll().find(p => p.id === id);
    if (!entry || isBusy(entry) || entry.id === SELF_ID) return;

    const pluginName = entry.name || entry.id;
    const result = await showConfirmModal({
      title: 'Delete Plugin?',
      message: `Remove "${pluginName}" from your board?`,
      warning: 'The plugin will be disabled and removed from your workspace. Your saved data will stay on this device unless you remove it below.',
      confirmText: 'Delete',
      cancelText: 'Keep Plugin',
      danger: true,
      checkbox: {
        label: 'Also remove saved plugin data from this device',
        checked: false
      }
    });

    if (!result.confirmed) {
      log('pm:delete-cancelled', { id });
      return;
    }

    const deletedEntry = { ...entry };

    try {
    const deleted = await api.deletePlugin(id, {
      purgeData: result.checked === true
    });

    if (!deleted) {
      throw new Error(readPluginError(id) || 'Core refused to delete plugin');
    }

    cleanupPluginUI(id);

      log('pm:delete-success', { id, purgeData: result.checked });
      showUndoToast(`${pluginName} deleted`, 'Undo', async () => {
        const reg = api.registry.getAll();
        if (!reg.some(p => p.id === deletedEntry.id)) {
          api.registry.save([...reg, { ...deletedEntry, enabled: false, status: 'disabled' }]);
          api.notify(`${pluginName} restored`, 'success');
          renderInstalled();
        }
      });

    } catch (err) {
      api.notify('Delete failed', 'error');
      log('pm:delete-fail', { id, error: err.message });
    }

    renderInstalled();
    renderCommunity();
  }

  async function enableSafeMode() {
    const confirmed = await showConfirmModal({
      title: 'Enable Safe Mode?',
      message: 'Disable all non-system plugins?',
      warning: 'This is useful when a plugin breaks the board. System plugins like Plugin Manager will stay enabled.',
      confirmText: 'Enable Safe Mode',
      cancelText: 'Cancel',
      danger: false
    });

    if (!confirmed.confirmed) return;

    localStorage.setItem(SAFE_MODE_KEY, '1');
    root?.classList.add('pm-safe-mode-active');
    const registry = api.registry.getAll();
    const targets = registry.filter(p => p.enabled && !isSystemPlugin(p));

    for (const item of targets) {
      try {
        await api.togglePlugin(item.id);

        // Remove any Plugin Manager UI registered by this plugin.
        // This prevents stale sidebar/menu buttons after Safe Mode disables plugins.
        cleanupPluginUI(item.id);

        setPluginStatus(item.id, 'disabled');

        log('pm:safe-mode-disabled-plugin', {
          id: item.id
        });
      } catch (err) {
        setPluginStatus(item.id, 'failed', err.message || 'Could not disable plugin');

        log('pm:safe-mode-disable-failed', {
          id: item.id,
          error: err.message || String(err)
        });
      }
    }

    api.notify(`Safe Mode enabled (${targets.length} plugin${targets.length === 1 ? '' : 's'} disabled)`, 'success');
    log('pm:safe-mode', { disabled: targets.map(p => p.id) });
    registerCoreUI();
    renderInstalled();
  }

  async function disableSafeMode() {
    const result = await showConfirmModal({
      title: 'Turn Off Safe Mode?',
      message: 'You will be able to enable plugins again.',
      warning: 'Only turn this off when you trust the plugins you are enabling.',
      confirmText: 'Turn Off',
      cancelText: 'Keep On',
      danger: false
    });
    if (!result.confirmed) return;
    localStorage.removeItem(SAFE_MODE_KEY);
    root?.classList.remove('pm-safe-mode-active');
    api.notify('Safe Mode turned off', 'success');
    log('pm:safe-mode-off', {});
    registerCoreUI();
    renderInstalled();
  }

  function resetPluginManagerLayout() {
    root.style.width = '';
    root.style.height = '';
    root.style.left = '';
    root.style.top = '';
    root.style.transform = '';
    api.notify('Plugin Manager layout reset', 'success');
    log('pm:layout-reset', {});
  }

  // ─────────────────────────────────────────────
  // MODALS
  // ─────────────────────────────────────────────

  function openInstallModal() {

    if (isSafeModeOn()) {
      showConfirmModal({
        title: 'Safe Mode Is On',
        message: 'Turn off Safe Mode before installing new plugins.',
        warning: 'Safe Mode blocks new plugin installs so a broken or unsafe plugin cannot be added while recovery mode is active.',
        confirmText: 'OK',
        cancelText: 'Close',
        danger: false
      });
      return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'pm-modal-overlay';

    overlay.innerHTML = `
      <div class="pm-modal-content">
        <h3 class="pm-modal-title">Install Extension</h3>
        <input type="text" id="pm-url" class="pm-input" placeholder="https://source.com/plugin.js">
        <input type="text" id="pm-id" class="pm-input" placeholder="Unique Plugin ID">
        <div style="display:flex; gap:10px; margin-top:8px;">
          <button id="pm-cancel" class="pm-btn pm-btn-secondary" style="flex:1">Cancel</button>
          <button id="pm-confirm" class="pm-btn pm-btn-primary" style="flex:1">Continue</button>
        </div>
      </div>
    `;

    document.documentElement.appendChild(overlay);

    overlay.querySelector('#pm-cancel').onclick = () => overlay.remove();
    overlay.querySelector('#pm-confirm').onclick = async () => {
      const confirmBtn = overlay.querySelector('#pm-confirm');
      const url = overlay.querySelector('#pm-url').value.trim();
      const inputId = overlay.querySelector('#pm-id').value.trim();

      if (!url || !inputId) return api.notify('All fields required', 'error');

      setButtonBusy(confirmBtn, 'Checking…');

      try {
        const remoteMeta = await fetchRemoteMeta(url);
        if (!remoteMeta || remoteMeta.__error || !remoteMeta.id) {
          resetButton(confirmBtn, 'Continue');
          return api.notify('Invalid plugin metadata', 'error');
        }

        if (remoteMeta.id !== inputId) {
          resetButton(confirmBtn, 'Continue');
          return api.notify(`ID mismatch: expected "${inputId}", got "${remoteMeta.id}"`, 'error');
        }

        overlay.remove();

        await installCommunityPlugin(inputId, url, null);
      } catch (err) {
        resetButton(confirmBtn, 'Continue');
        api.notify('Install failed', 'error');
      }
    };
  }

  async function showInstallConfirm(pluginDef) {
    const permissions = normalizePermissions(pluginDef.permissions || inferPermissions(pluginDef));
    const permissionList = permissions.length
      ? permissions.map(p => `• ${permissionLabel(p)}`).join('\n')
      : '• Basic UI access';

    const result = await showConfirmModal({
      title: `Install “${pluginDef.name || pluginDef.id}”?`,
      message: `This plugin wants access to:\n${permissionList}`,
      warning: getTrustLabel(pluginDef) === 'Manual URL'
        ? 'Manual URL plugins can run code from outside the community store. Install only if you trust the source.'
        : 'Install only plugins from sources you trust.',
      confirmText: 'Install',
      cancelText: 'Cancel',
      danger: false
    });

    return result.confirmed;
  }

  function showConfirmModal({
    title = 'Are you sure?',
    message = '',
    warning = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false,
    checkbox = null
  } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'pm-modal-overlay';
      overlay.style.zIndex = '2147483647';

      overlay.innerHTML = `
        <div class="pm-modal-content">
          <h3 class="pm-modal-title">${escapeHTML(title)}</h3>
          ${message ? `<p class="pm-modal-message">${escapeHTML(message).replaceAll('\n', '<br>')}</p>` : ''}
          ${warning ? `<div class="pm-modal-warning-box">${escapeHTML(warning).replaceAll('\n', '<br>')}</div>` : ''}
          ${checkbox ? `
            <label class="pm-modal-checkbox-row">
              <span class="pm-check-box">
                <input type="checkbox" data-confirm-checkbox ${checkbox.checked ? 'checked' : ''}>
                <span class="pm-check-visual"></span>
              </span>
              <span>${escapeHTML(checkbox.label || '')}</span>
            </label>
          ` : ''}
          <div class="pm-modal-actions">
            <button class="pm-btn pm-btn-secondary" data-confirm-action="cancel">${escapeHTML(cancelText)}</button>
            <button class="pm-btn ${danger ? 'pm-btn-danger' : 'pm-btn-primary'}" data-confirm-action="confirm">${escapeHTML(confirmText)}</button>
          </div>
        </div>
      `;

      function close(value) {
        const checked = Boolean(overlay.querySelector('[data-confirm-checkbox]')?.checked);
        overlay.remove();
        document.removeEventListener('keydown', onKeyDown);
        resolve({ confirmed: value, checked });
      }

      function onKeyDown(e) {
        if (e.key === 'Escape') close(false);
        if (e.key === 'Enter') close(true);
      }

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          close(false);
          return;
        }

        const btn = e.target.closest('[data-confirm-action]');
        if (!btn) return;

        close(btn.dataset.confirmAction === 'confirm');
      });

      document.addEventListener('keydown', onKeyDown);
      document.documentElement.appendChild(overlay);

      requestAnimationFrame(() => {
        overlay.querySelector('[data-confirm-action="confirm"]')?.focus?.();
      });
    });
  }


  function showWhatsNewModal(id) {
    const registry = api.registry.getAll();
    const entry = registry.find(p => p.id === id);
    const community = communityCache.find(p => p.id === id) || {};
    const remoteMeta = remoteMetaCache.get(id) || {};
    const p = { ...community, ...entry, ...remoteMeta };
    if (!p.id && !id) return;

    const raw = p.whatsNew || p.whatNew || p.releaseNotes || p.changelogText || null;
    const rows = [];
    if (Array.isArray(raw)) {
      raw.forEach((item, i) => {
        if (typeof item === 'string') rows.push([`Update ${i + 1}`, item]);
        else rows.push([item.version || item.title || `Update ${i + 1}`, item.text || item.description || JSON.stringify(item)]);
      });
    } else if (typeof raw === 'string' && raw.trim()) {
      rows.push(['What’s New', raw.trim()]);
    }

    if (p.version || p.remoteVersion) rows.unshift(['Version', p.remoteVersion || p.version]);
    if (p.changelog || remoteMeta.changelog) rows.push(['Changelog Link', p.changelog || remoteMeta.changelog]);
    if (!rows.length) rows.push(['No release notes', 'This plugin has not provided What’s New notes yet.']);

    showInfoModal({
      title: `What’s New in ${p.name || id}`,
      subtitle: 'Release notes provided by the plugin metadata.',
      rows,
      actions: '<button class="pm-btn pm-btn-primary" data-confirm-action="cancel">Done</button>'
    });
  }

  function showPluginDetails(id) {
    const registry = api.registry.getAll();
    const entry = registry.find(p => p.id === id);
    if (!entry) return;

    const community = communityCache.find(p => p.id === id) || {};
    const remoteMeta = remoteMetaCache.get(id) || {};
    const p = { ...community, ...entry };
    const permissions = normalizePermissions(p.permissions || remoteMeta.permissions || inferPermissions(p));
    const details = [
      ['Status', getPluginStatus(p)],
      ['Version', p.version || 'Unknown'],
      ['Remote Version', p.remoteVersion || remoteMeta.version || 'Unknown'],
      ['Author', p.author || 'Unknown'],
      ['Source', getTrustLabel(p)],
      ['Category', categoryLabel(normalizeCategory(p.category))],
      ['Compatibility', p.compat || remoteMeta.compat || 'Not declared'],
      ['Permissions', permissions.map(permissionLabel).join(', ') || 'Basic UI'],
      ['Storage Used', estimatePluginStorage(id)],
      ['Installed URL', getRemoteUrl(p) || p.url || 'Unknown'],
      ['Last Error', p.error || 'None']
    ];

    showInfoModal({
      title: p.name || p.id,
      subtitle: p.description || 'Plugin details and safety information.',
      rows: details,
      actions: `
        <button class="pm-btn pm-btn-secondary" data-confirm-action="whats-new">What’s New</button>
        <button class="pm-btn pm-btn-secondary" data-confirm-action="cancel">Close</button>
      `,
      onAction: async (action) => {
        if (action === 'whats-new') showWhatsNewModal(id);
      }
    });
  }

  function showCommunityDetails(id) {
    const p = communityCache.find(item => item.id === id);
    if (!p) return;

    const permissions = normalizePermissions(p.permissions || inferPermissions(p));
    const details = [
      ['Author', p.author || 'Unknown'],
      ['Category', categoryLabel(normalizeCategory(p.category))],
      ['Compatibility', p.compat || 'Not declared'],
      ['Permissions', permissions.map(permissionLabel).join(', ') || 'Basic UI'],
      ['Source', 'Community Store'],
      ['URL', p.url || 'Unknown']
    ];

    showInfoModal({
      title: p.name || p.id,
      subtitle: p.description || 'Community plugin.',
      rows: details,
      actions: `
        <button class="pm-btn pm-btn-secondary" data-confirm-action="whats-new-community">What’s New</button>
        <button class="pm-btn pm-btn-secondary" data-confirm-action="cancel">Close</button>
        <button class="pm-btn pm-btn-primary" data-confirm-action="install">Install</button>
      `,
      onAction: async (action) => {
        if (action === 'whats-new-community') showWhatsNewModal(p.id);
        if (action === 'install') await installCommunityPlugin(p.id, p.url, null);
      }
    });
  }

  function showInfoModal({ title, subtitle, rows = [], actions = '', onAction = null }) {
    const overlay = document.createElement('div');
    overlay.className = 'pm-modal-overlay';

    overlay.innerHTML = `
      <div class="pm-modal-content wide">
        <h3 class="pm-modal-title">${escapeHTML(title)}</h3>
        ${subtitle ? `<p class="pm-modal-message">${escapeHTML(subtitle)}</p>` : ''}
        <div class="pm-detail-grid">
          ${rows.map(([label, value]) => `
            <div class="pm-detail-label">${escapeHTML(label)}</div>
            <div class="pm-detail-value">${escapeHTML(value)}</div>
          `).join('')}
        </div>
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:18px; flex-wrap:wrap;">
          ${actions || '<button class="pm-btn pm-btn-secondary" data-confirm-action="cancel">Close</button>'}
        </div>
      </div>
    `;

    overlay.addEventListener('click', async (e) => {
      if (e.target === overlay) return overlay.remove();
      const btn = e.target.closest('[data-confirm-action]');
      if (!btn) return;
      const action = btn.dataset.confirmAction;
      overlay.remove();
      if (action !== 'cancel' && onAction) await onAction(action);
    });

    document.documentElement.appendChild(overlay);
  }

  function showLogsModal() {
    const logs = getLogs().slice(-100).reverse();
    showInfoModal({
      title: 'Plugin Logs',
      subtitle: 'Recent Plugin Manager and plugin lifecycle activity.',
      rows: logs.length
        ? logs.map(logItem => [
            new Date(logItem.time).toLocaleTimeString(),
            `${logItem.event}${logItem.data ? ' — ' + JSON.stringify(logItem.data) : ''}`
          ])
        : [['No logs yet', 'Actions and errors will appear here.']],
      actions: `
        <button class="pm-btn pm-btn-secondary" data-confirm-action="clear">Clear Logs</button>
        <button class="pm-btn pm-btn-primary" data-confirm-action="cancel">Done</button>
      `,
      onAction: (action) => {
        if (action === 'clear') {
          localStorage.removeItem(LOG_KEY);
          api.notify('Logs cleared', 'success');
        }
      }
    });
  }

  // ─────────────────────────────────────────────
  // MENUS / TOASTS
  // ─────────────────────────────────────────────

  function getExternalMenuItems(targetPluginId) {
    const entry = api.registry.getAll().find(p => p.id === targetPluginId);
    if (!entry) return [];

    const items = [];

    for (const [owner, actionMap] of externalMenuActions.entries()) {
      for (const action of actionMap.values()) {
        if (action.pluginId !== '*' && action.pluginId !== targetPluginId) continue;

        if (typeof action.showWhen === 'function') {
          try {
            const visible = action.showWhen({
              pluginId: targetPluginId,
              entry,
              registry: api.registry.getAll()
            });

            if (!visible) continue;
          } catch (err) {
            console.warn('[Plugin Manager] external menu showWhen failed:', err);
            continue;
          }
        }

        items.push({ ...action, owner });
      }
    }

    return items;
  }

  async function runExternalMenuAction(owner, actionId, targetPluginId) {
    const action = externalMenuActions.get(owner)?.get(actionId);
    if (!action) return;

    const entry = api.registry.getAll().find(p => p.id === targetPluginId);
    if (!entry) return;

    try {
      if (typeof action.handler === 'function') {
        await action.handler({
          pluginId: targetPluginId,
          entry,
          registry: api.registry.getAll()
        });
        return;
      }

      if (action.event) {
        api.bus.emit(action.event, {
          pluginId: targetPluginId,
          entry
        });
      }
    } catch (err) {
      console.error('[Plugin Manager] external menu action failed:', err);
      api.notify(`${action.label || 'Action'} failed`, 'error');
    }
  }

  function openActionMenu(anchor, id) {
    closeActionMenu();

    const entry = api.registry.getAll().find(p => p.id === id);
    if (!entry) return;

    const rect = anchor.getBoundingClientRect();
    const canReload = entry.enabled && entry.id !== SELF_ID;
    const isSelf = entry.id === SELF_ID;

    activeMenu = document.createElement('div');
    activeMenu.className = 'pm-action-menu';
    const remoteMeta = remoteMetaCache.get(id) || {};
    const hasWhatsNew = Boolean(entry.whatsNew || entry.changelog || remoteMeta.whatsNew || remoteMeta.changelog || remoteMeta.version);
    const externalItems = getExternalMenuItems(id);
    const externalMenu = externalItems.length
      ? `
        <div class="pm-menu-separator"></div>
        ${externalItems.map(action => `
          <button
            class="pm-menu-item ${action.danger ? 'danger' : ''}"
            data-menu-action="external"
            data-external-owner="${escapeAttr(action.owner)}"
            data-external-id="${escapeAttr(action.id)}"
            data-id="${escapeAttr(id)}"
          >
            <span class="pm-menu-icon">${action.icon || menuIcon('sparkle')}</span>
            <span class="pm-menu-label">${escapeHTML(action.label)}</span>
          </button>
        `).join('')}
      `
      : '';
    const systemMenu = isSelf ? `
      <div class="pm-menu-separator"></div>
      <button class="pm-menu-item" data-menu-action="logs" data-id="${escapeAttr(id)}">${menuIcon('logs')}<span class="pm-menu-label">View Logs</span></button>
    ` : '';

    activeMenu.innerHTML = `
      <button class="pm-menu-item" data-menu-action="details" data-id="${escapeAttr(id)}">${menuIcon('details')}<span class="pm-menu-label">View Details</span></button>
      ${hasWhatsNew ? `<button class="pm-menu-item" data-menu-action="whats-new" data-id="${escapeAttr(id)}">${menuIcon('sparkle')}<span class="pm-menu-label">What’s New</span></button>` : ''}
      <button class="pm-menu-item" data-menu-action="check-update" data-id="${escapeAttr(id)}">${menuIcon('update')}<span class="pm-menu-label">Check for Update</span></button>
      ${canReload ? `<button class="pm-menu-item" data-menu-action="reload" data-id="${escapeAttr(id)}">${menuIcon('reload')}<span class="pm-menu-label">Reload</span></button>` : ''}
      ${systemMenu}
      ${externalMenu}
      ${isSelf ? '' : '<div class="pm-menu-separator"></div>'}
      ${isSelf ? '' : `<button class="pm-menu-item danger" data-menu-action="delete" data-id="${escapeAttr(id)}">${menuIcon('delete')}<span class="pm-menu-label">Delete Plugin</span></button>`}
    `;

    document.documentElement.appendChild(activeMenu);
    const menuRect = activeMenu.getBoundingClientRect();
    activeMenu.style.left = Math.min(rect.right - menuRect.width, window.innerWidth - menuRect.width - 12) + 'px';
    activeMenu.style.top = Math.min(rect.bottom + 8, window.innerHeight - menuRect.height - 12) + 'px';

    activeMenu.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-menu-action]');
      if (!btn) return;
      const action = btn.dataset.menuAction;
      const targetId = btn.dataset.id;
      closeActionMenu();
      await handleMenuAction(action, targetId);
    });
  }

  function closeActionMenu() {
    if (activeMenu) {
      activeMenu.remove();
      activeMenu = null;
    }
  }

  function showUndoToast(message, actionText, onAction) {
    const toast = document.createElement('div');
    toast.className = 'pm-toast';
    toast.innerHTML = `<span>${escapeHTML(message)}</span><button>${escapeHTML(actionText)}</button>`;
    document.documentElement.appendChild(toast);

    let done = false;
    const timer = setTimeout(() => {
      if (!done) toast.remove();
    }, 8000);

    toast.querySelector('button').onclick = async () => {
      done = true;
      clearTimeout(timer);
      toast.remove();
      await onAction?.();
    };
  }

  // ─────────────────────────────────────────────
  // COMMUNITY CACHE / META
  // ─────────────────────────────────────────────

  function loadCommunityFromCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(COMMUNITY_CACHE_KEY) || 'null');
      if (cached?.items?.length) {
        communityCache = cached.items;
      }
    } catch {
      communityCache = [];
    }
  }

  function isCommunityCacheStale() {
    try {
      const cached = JSON.parse(localStorage.getItem(COMMUNITY_CACHE_KEY) || 'null');
      return !cached?.time || Date.now() - cached.time > CACHE_TIMEOUT;
    } catch {
      return true;
    }
  }

  async function refreshCommunityCache() {
    const res = await fetch(COMMUNITY_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Community HTTP ${res.status}`);
    const items = await res.json();
    communityCache = Array.isArray(items) ? items : [];
    localStorage.setItem(COMMUNITY_CACHE_KEY, JSON.stringify({ time: Date.now(), items: communityCache }));
    return communityCache;
  }

  async function fetchRemoteMeta(url) {
    if (!url || url.startsWith('blob:') || url.startsWith('data:')) return null;

    try {
      const res = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now());
      if (!res.ok) return { __error: true, status: res.status };
      const code = await res.text();
      const metaMatch = code.match(/export const meta\s*=\s*(\{[\s\S]*?\})(?:;|$)/);
      if (!metaMatch) return null;
      return new Function(`return ${metaMatch[1]}`)();
    } catch (e) {
      console.error('Fetch failed for:', url, e);
      return { __error: true, message: e.message };
    }
  }

  function getRemoteUrl(entry = {}) {
    if (entry.originalUrl && !entry.originalUrl.startsWith('blob:') && !entry.originalUrl.startsWith('data:')) return entry.originalUrl;
    if (entry.url && !entry.url.startsWith('blob:') && !entry.url.startsWith('data:')) return entry.url;
    return null;
  }

  // ─────────────────────────────────────────────
  // STATE / STATUS
  // ─────────────────────────────────────────────

  function setPluginStatus(pluginId, status, error = null) {
    const registry = api.registry.getAll();
    const entry = registry.find(p => p.id === pluginId);
    if (!entry) return;

    const prev = entry.status || 'unknown';
    entry.status = status;
    entry.error = error || null;

    if (status === 'failed') entry.lastFailedAt = Date.now();
    if (status === 'active') entry.lastLoadedAt = Date.now();

    api.registry.save(registry);
    api.bus.emit('pm:status-change', { id: pluginId, from: prev, to: status, ...(error ? { error } : {}) });
  }

  function getPluginStatus(entry = {}) {
    if (entry.status === 'installing' || entry.status === 'updating' || entry.status === 'failed' || entry.status === 'blocked') return entry.status;
    return entry.enabled ? 'active' : 'disabled';
  }

  function isBusy(entry = {}) {
    return entry.status === 'installing' || entry.status === 'updating';
  }

  function handlePluginFailure(id, err, fallback = 'Plugin failed') {
    const count = incrementCrash(id, true);
    const shouldBlock = count >= 3;

    if (shouldBlock) {
      blockPlugin(id, err.message || fallback);
      api.notify('Plugin blocked after repeated failures', 'error');
    } else {
      setPluginStatus(id, 'failed', err.message || fallback);
      api.notify(fallback, 'error');
    }

    log('pm:plugin-fail', { id, error: err.message, crashCount: count });
  }

  function incrementCrash(id, failed) {
    const registry = api.registry.getAll();
    const entry = registry.find(p => p.id === id);
    if (!entry) return 0;

    if (failed) {
      entry.crashCount = Number(entry.crashCount || 0) + 1;
      entry.lastFailedAt = Date.now();
    } else {
      entry.crashCount = 0;
      entry.lastLoadedAt = Date.now();
    }

    api.registry.save(registry);
    return Number(entry.crashCount || 0);
  }

  async function blockPlugin(id, error) {
    const registry = api.registry.getAll();
    const entry = registry.find(p => p.id === id);
    if (!entry) return;

    const wasEnabled = Boolean(entry.enabled);

    entry.enabled = false;
    entry.status = 'blocked';
    entry.error = error || 'Blocked after repeated failures';
    entry.lastFailedAt = Date.now();

    api.registry.save(registry);

    try {
      if (wasEnabled && typeof api.togglePlugin === 'function') {
        // api.togglePlugin flips current registry state, so only use it if the core still has it loaded.
        // If this fails, the registry state above still protects the next boot.
        await api.togglePlugin(id);
        const fresh = api.registry.getAll();
        const freshEntry = fresh.find(p => p.id === id);
        if (freshEntry) {
          freshEntry.enabled = false;
          freshEntry.status = 'blocked';
          freshEntry.error = error || 'Blocked after repeated failures';
          api.registry.save(fresh);
        }
      }
    } catch {}
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  function normalizeVersionLabel(version = '') {
    return String(version || '')
      .trim()
      .replace(/^v/i, '')
      .replace(/\s+/g, '');
  }

  function hasPluginUpdate(entry = {}, remoteMeta = null) {
    const installed = normalizeVersionLabel(entry.version || '0.0.0');
    const remote = normalizeVersionLabel(remoteMeta?.version || entry.remoteVersion || '');

    if (!remote) return false;
    if (!installed) return false;

    return compareVersions(remote, installed) > 0;
  }

  function compareVersions(a = '0.0.0', b = '0.0.0') {
    const pa = String(a).split(/[.-]/).map(n => parseInt(n, 10) || 0);
    const pb = String(b).split(/[.-]/).map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) return 1;
      if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    }
    return 0;
  }

  function isCompatible(range) {
    if (!range) return true;
    const normalized = String(range).trim();
    const match = normalized.match(/^>=\s*([0-9]+(?:\.[0-9]+){0,2})/);
    if (match) return compareVersions(CORE_VERSION, match[1]) >= 0;
    const exact = normalized.match(/^([0-9]+(?:\.[0-9]+){0,2})$/);
    if (exact) return compareVersions(CORE_VERSION, exact[1]) === 0;
    return true;
  }

  function normalizePermissions(perms = []) {
    if (!Array.isArray(perms)) return [];

    const aliases = {
      'global-css': 'globalCSS',
      'global_css': 'globalCSS',
      'globalcss': 'globalCSS',
      'modify-others': 'modifyOthers',
      'move-others': 'moveOthers',
      'raw-board': 'rawBoard'
    };

    return [
      ...new Set(
        perms
          .map(p => String(p).trim())
          .filter(Boolean)
          .map(p => aliases[p] || p)
      )
    ];
  }

  function inferPermissions(p = {}) {
    const category = normalizeCategory(p.category);
    const perms = ['ui'];
    if (/note|todo|kanban|planner|password|counter|quote|timer|clock/i.test(`${p.id} ${p.name} ${p.description}`)) perms.push('storage');
    if (/theme|layout|manager|enhancer/i.test(`${p.id} ${p.name} ${p.description}`)) perms.push('globalCSS');
    if (category === 'system') perms.push('registry', 'system');
    if (/api|quote|community|network/i.test(`${p.id} ${p.name} ${p.description}`)) perms.push('network');
    return normalizePermissions(perms);
  }

  function permissionBadgeHTML(permission) {
    const risky = ['network', 'globalCSS', 'registry', 'system', 'rawBoard', 'modifyOthers', 'moveOthers'].includes(permission);
    return `<span class="perm-badge ${risky ? 'risky' : ''}">${escapeHTML(permissionLabel(permission))}</span>`;
  }

  function permissionLabel(permission) {
    const labels = {
      ui: 'UI',
      storage: 'Storage',
      network: 'Network',
      clipboard: 'Clipboard',
      globalCSS: 'Global CSS',
      'global-css': 'Global CSS',
      registry: 'Registry',
      system: 'System',
      bus: 'bus',
      hooks: 'hooks',
      theme: 'Theme',
      layout: 'Layout',
      modifyOthers: 'Modify Others',
      moveOthers: 'Move Others',
      rawBoard: 'Raw Board'
    };
    return labels[permission] || permission;
  }

  function statusBadgeHTML(status, isSystem) {
    if (status === 'installing') return '<span class="plugin-badge badge-installing">Installing…</span>';
    if (status === 'updating') return '<span class="plugin-badge badge-updating">Updating…</span>';
    if (status === 'failed') return '<span class="plugin-badge badge-failed">Failed</span>';
    if (status === 'blocked') return '<span class="plugin-badge badge-blocked">Blocked</span>';
    if (status === 'disabled') return '<span class="plugin-badge badge-disabled">Inactive</span>';
    return '<span class="plugin-badge badge-enabled">Active</span>';
  }

  function getTrustLabel(p = {}) {
    if (p.id === SELF_ID || p.source === 'system' || p.trust === 'official') return 'Official';
    if (p.source === 'manual' || p.trust === 'manual') return 'Manual URL';
    if (p.source === 'local' || p.trust === 'local') return 'Local';
    return 'Community';
  }

  function isSystemPlugin(plugin = {}) {
    if (plugin.id === SELF_ID) return true;
    if (plugin.category === 'system') return true;
    if (plugin.permissions?.includes?.('system')) return true;
    const communityPlugin = communityCache.find(c => c.id === plugin.id);
    return communityPlugin?.category === 'system';
  }

  function normalizeCategory(category) {
    const c = String(category || '').toLowerCase().trim();
    if (['productivity', 'developer', 'utilities', 'design', 'system'].includes(c)) return c;
    return 'utilities';
  }

  function categoryLabel(category) {
    return {
      productivity: 'Productivity',
      developer: 'Developer',
      utilities: 'Utilities',
      design: 'Design',
      system: 'System'
    }[category] || 'Utilities';
  }

  function isPluginNew(pluginDate) {
    if (!pluginDate) return false;
    const published = new Date(pluginDate).getTime();
    if (!Number.isFinite(published)) return false;
    return Date.now() - published < 6 * 24 * 60 * 60 * 1000;
  }

  function getCommunityIcon(id) {
    const c = communityCache.find(p => p.id === id);
    return c?.icon || null;
  }

  function pickColor(id = '') {
    const colors = ['#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500', '#34C759'];
    return colors[String(id).length % colors.length];
  }

  function iconHTML(icon, alt) {
    const value = String(icon || '📦');
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return `<img src="${escapeAttr(value)}" alt="${escapeAttr(alt)}" style="width:100%;height:100%;border-radius:10px;object-fit:cover;">`;
    }
    return escapeHTML(value);
  }

  function clearSearch() {
    globalSearch = '';
    const input = root.querySelector('#pm-search');
    const clear = root.querySelector('#pm-search-clear');
    if (input) input.value = '';
    clear?.classList.remove('visible');
    renderInstalled();
    renderCommunity();
  }

  function skeletonHTML(count = 3) {
    return Array.from({ length: count }, () => '<div class="pm-skeleton-card"></div>').join('');
  }

  function emptyStateHTML(title, subtitle, action = '') {
    return `<div class="pm-empty-state"><div class="pm-empty-title">${escapeHTML(title)}</div><div class="pm-empty-subtitle">${escapeHTML(subtitle)}</div>${action}</div>`;
  }

  function updateBadge(count) {
    updateCount = count;
    const badge = root.querySelector('#update-badge-count');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  function setButtonBusy(btn, text = 'Working…') {
    if (!btn) return;
    btn.dataset.prevHtml = btn.innerHTML;
    btn.disabled = true;
    if (text) btn.innerHTML = text;
  }

  function resetButton(btn, html = null) {
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = html || btn.dataset.prevHtml || btn.innerHTML;
  }

  function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 30) return 'just now';
    if (seconds < 60) return 'a few seconds ago';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hr ago';
    return Math.floor(seconds / 86400) + ' days ago';
  }

  function estimatePluginStorage(id) {
    let bytes = 0;
    const prefix = `plugin:${id}:`;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix)) bytes += key.length + (localStorage.getItem(key) || '').length;
    }
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function purgePluginData(id) {
    const prefix = `plugin:${id}:`;
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) localStorage.removeItem(key);
    });
    log('pm:purge-data', { id });
  }

  function log(event, data = null) {
    try {
      const logs = getLogs();
      logs.push({ time: Date.now(), event, data });
      localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(-100)));
    } catch {}

    try {
      api.bus.emit(event, data || {});
    } catch {}
  }

  function getLogs() {
    try {
      return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function escapeHTML(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeAttr(value = '') {
    return escapeHTML(value).replaceAll('`', '&#096;');
  }


  function isSafeModeOn() {
    return localStorage.getItem(SAFE_MODE_KEY) === '1';
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function readPluginError(id) {
    try {
      const entry = api.registry.get(id) || api.registry.getAll().find(p => p.id === id);
      return entry?.error || null;
    } catch {
      return null;
    }
  }

  function menuIcon(type) {
    const icons = {
      details: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>',
      sparkle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.7 5.2L19 10l-5.3 1.8L12 17l-1.7-5.2L5 10l5.3-1.8L12 3z"></path></svg>',
      update: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6"></path><path d="M2.5 22v-6h6"></path><path d="M2 11.5a10 10 0 0 1 18.8-4.3"></path><path d="M22 12.5a10 10 0 0 1-18.8 4.2"></path></svg>',
      reload: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v7l4 2"></path>
          <path d="M5.2 9.4A7.5 7.5 0 1 1 4.5 13"></path>
          <path d="M5.2 9.4H2.8V7"></path>
        </svg>
      `,
      logs: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path></svg>',
      reset: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v6h6"></path></svg>',
      delete: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path></svg>'
    };
    return `<span class="pm-menu-icon">${icons[type] || ''}</span>`;
  }

  // ─────────────────────────────────────────────
  // ICONS
  // ─────────────────────────────────────────────

  function iconGrid() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>';
  }

  function iconGlobe() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
  }

  function iconSearch() {
    return '<svg class="pm-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>';
  }

  function iconBook() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>';
  }

  function iconRefresh(size = 16) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>`;
  }

  function iconCheck(size = 16) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
  }

  function iconPlus(size = 16) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`;
  }

  function iconShield(size = 16) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 20 6v6c0 5-3.4 8.7-8 9-4.6-.3-8-4-8-9V6l8-3Z"/><path d="m9.5 12 1.7 1.7L15 10"/></svg>`;
  }

  function iconReset(size = 16) {
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="5" width="16" height="14" rx="3"></rect>
        <path d="M8 9h8"></path>
        <path d="M8 13h4"></path>
        <path d="M17.5 15.5a3.5 3.5 0 1 1-1-2.45"></path>
        <path d="M17.5 12v3.5H14"></path>
      </svg>
    `;
  }

  function iconEllipsis(size = 16) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>`;
  }
}

export function teardown() {
  if (activeMenu) {
    activeMenu.remove();
    activeMenu = null;
  }

  if (root) {
    root.remove();
    root = null;
  }

  if (style) {
    style.remove();
    style = null;
  }

  if (escHandler) {
    document.removeEventListener('keydown', escHandler);
    escHandler = null;
  }

  if (keydownHandler) {
    window.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
  }

  if (contextMenuHandler && apiRef?.boardEl) {
    apiRef.boardEl.removeEventListener('contextmenu', contextMenuHandler);
    contextMenuHandler = null;
  }

  if (pmRegisterUiHandler && apiRef?.bus) {
    apiRef.bus.off('pm:register-ui', pmRegisterUiHandler);
    pmRegisterUiHandler = null;
  }

  if (documentClickHandler) {
    document.removeEventListener('click', documentClickHandler);
    documentClickHandler = null;
  }

  if (pmRegisterMenuActionHandler && apiRef?.bus) {
    apiRef.bus.off('pm:register-menu-action', pmRegisterMenuActionHandler);
    pmRegisterMenuActionHandler = null;
  }

  externalMenuActions.clear();

  apiRef = null;
}
