export const meta = {
  id: 'about',
  name: 'About Blank Board',
  version: '0.3.0',
  compat: '>=1.0.0'
};

export function setup(api) {
  const box = document.createElement('div');
  box.className = 'plugin-box';
  box.style.cssText = `
    left: 180px;
    top: 120px;
    width: 440px;
    background: var(--board-surface, #111);
    color: var(--board-text, #e8e8e8);
    border: 1px solid var(--board-border, rgba(255,255,255,0.08));
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    overflow: hidden;
    font-family: system-ui, sans-serif;
  `;

  box.innerHTML = `
    <div style="padding:20px 24px;background:rgba(255,255,255,0.02);border-bottom:1px solid var(--board-border, rgba(255,255,255,0.08));">
      <div style="font-size:18px;font-weight:700;letter-spacing:-0.02em;">Blank Board</div>
      <div style="font-size:13px;color:var(--board-muted, #888);">Everything is a plugin • Fully extensible</div>
    </div>

    <div style="padding:24px;line-height:1.6;font-size:14px;">
      <p style="margin:0 0 18px 0;">
        A minimal, blank canvas where <strong>every feature is a plugin</strong>.<br>
        No bloat. No built-in tools. Just pure freedom.
      </p>

      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--board-border, rgba(255,255,255,0.06));border-radius:12px;padding:16px;margin-bottom:18px;">
        <strong style="color:var(--board-accent, #7c6fff);">Vision</strong><br>
        <span style="color:var(--board-muted, #aaa);font-size:13px;">
          Build the ultimate personal workspace together with the community.<br>
          Anyone can create and share plugins — from notes to kanban, AI tools, games, or full layouts.
        </span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:13px;">
        <div>
          <strong>Author</strong><br>
          <span style="color:var(--board-muted, #888);">DRD (@dhvsnv)</span>
        </div>
        <div>
          <strong>Tech</strong><br>
          <span style="color:var(--board-muted, #888);">Vanilla JS • ES Modules • Micro-kernel</span>
        </div>
      </div>

      <div style="margin-top:20px;font-size:13px;color:var(--board-muted, #888);">
        Hosted on Netlify • Community plugins via GitHub
      </div>
    </div>

    <div style="padding:16px 24px;background:rgba(255,255,255,0.02);border-top:1px solid var(--board-border, rgba(255,255,255,0.08));display:flex;gap:12px;justify-content:flex-end;">
      <button id="close-about" class="pm-btn secondary">Close</button>
    </div>
  `;

  api.boardEl.appendChild(box);
  api.makeDraggable(box);

  box.querySelector('#close-about').addEventListener('click', () => {
    box.remove();
  });
}

export function teardown() {}
