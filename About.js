export const meta = {
  id: 'about',
  name: 'About Blank Board',
  version: '0.3.3',
  compat: '>=1.0.0'
};

export function setup(api) {
  const box = document.createElement('div');
  box.className = 'plugin-box';
  box.style.cssText = `
    left: 120px;
    top: 120px;
    width: min(520px, 92vw);
    background: rgba(255,255,255,0.90);
    color: #111;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 24px;
    box-shadow: 0 32px 62px rgba(0,0,0,0.14);
    backdrop-filter: blur(22px);
    overflow: hidden;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  box.innerHTML = `
    <style>
      .about-card { display: grid; gap: 18px; }
      .about-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
      .about-label { font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase; color: #6f6f7c; }
      .about-title { margin-top: 8px; font-size: 22px; font-weight: 800; line-height: 1.1; color: #111; }
      .about-subtitle { margin-top: 12px; font-size: 14px; color: #4b4b58; line-height: 1.7; }
      .about-pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: rgba(124,111,255,0.12); color: #4b4bff; font-size: 12px; font-weight: 600; }
      .about-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 16px; align-items: center; }
      .about-meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 6px; }
      .about-chip { padding: 14px; border-radius: 18px; background: rgba(244,245,247,0.85); border: 1px solid rgba(0,0,0,0.06); color: #28282d; font-size: 13px; line-height: 1.5; }
      .about-chip strong { display: block; margin-bottom: 6px; color: #0f0f14; }
      .about-preview { border-radius: 20px; overflow: hidden; background: #f3f4f7; border: 1px solid rgba(0,0,0,0.08); }
      .about-preview img { width: 100%; display: block; object-fit: cover; }
      .about-actions { display: flex; justify-content: flex-end; }
      .about-close { border: none; padding: 11px 18px; border-radius: 14px; background: #4b4bff; color: #fff; font-weight: 700; cursor: pointer; transition: transform 0.18s ease, box-shadow 0.18s ease; }
      .about-close:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(75,75,255,0.24); }
      @media (prefers-color-scheme: dark) {
        .about-card { color: #f5f5f7; }
        .about-label { color: #9b9cb7; }
        .about-title { color: #ffffff; }
        .about-subtitle { color: #d7d7e6; }
        .about-pill { background: rgba(124,111,255,0.18); color: #dcd8ff; }
        .about-chip { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); color: #e6e6f2; }
        .about-chip strong { color: #ffffff; }
        .about-preview { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); }
        .about-preview img { filter: brightness(1.02); }
        .about-close { background: #7d78ff; }
      }
    </style>

    <div class="about-card">
      <div class="about-header">
        <div>
          <div class="about-label">About Blank Board</div>
          <div class="about-title">A compact, elegant overview.</div>
          <div class="about-subtitle">A minimal plugin host with instant preview and a refined, theme-safe layout.</div>
          <div class="about-pill">Compact · Apple-inspired · light + dark</div>
        </div>
      </div>

      <div class="about-grid">
        <div>
          <div class="about-meta">
            <div class="about-chip"><strong>Modular</strong>Every feature is a plugin.</div>
            <div class="about-chip"><strong>Minimal</strong>Light core, powerful extensions.</div>
            <div class="about-chip"><strong>Community</strong>Plugin ecosystem first.</div>
          </div>
        </div>
        <div class="about-preview">
          <img src="https://raw.githubusercontent.com/dheeraz101/Empty_Plugins/main/main.gif" alt="Blank Board preview">
        </div>
      </div>

      <div class="about-actions">
        <button id="close-about" class="about-close">Close</button>
      </div>
    </div>
  `;

  api.boardEl.appendChild(box);
  api.makeDraggable(box);

  const closeButton = box.querySelector('#close-about');
  closeButton.addEventListener('click', () => box.remove());
}

export function teardown() {}
