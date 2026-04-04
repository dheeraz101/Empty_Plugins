export const meta = {
  id: 'about',
  name: 'About Blank Board',
  version: '0.3.6',
  compat: '>=1.0.0'
};

let box = null;

export function setup(api) {
  if (box) {
    box.remove();
    box = null;
  }

  box = document.createElement('div');
  box.className = 'plugin-box';
  box.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(600px, 94vw);
    background: rgba(255, 255, 255, 0.85);
    color: #000;
    border-radius: 32px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(30px) saturate(180%);
    -webkit-backdrop-filter: blur(30px) saturate(180%);
    border: 1px solid rgba(0, 0, 0, 0.1);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif;
    padding: 32px;
    box-sizing: border-box;
    transition: all 0.3s ease;
  `;

  box.innerHTML = `
    <style>
      .about-container { display: flex; flex-direction: column; gap: 28px; }
      .about-header { text-align: left; }
      
      /* Primary Text Colors - Adjusted for Light Theme Contrast */
      .about-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #6e6e73; margin-bottom: 8px; }
      .about-title { font-size: 32px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; color: #1d1d1f; }
      .about-subtitle { margin-top: 12px; font-size: 16px; color: #424245; line-height: 1.5; font-weight: 400; max-width: 95%; }
      
      .about-grid-main { display: grid; grid-template-columns: 1fr; gap: 24px; margin-top: 4px; }
      
      .about-preview-large { 
        width: 100%; 
        border-radius: 18px; 
        overflow: hidden; 
        background: #f5f5f7; 
        aspect-ratio: 16/9;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        border: 1px solid rgba(0,0,0,0.05);
      }
      .about-preview-large img { width: 100%; height: 100%; object-fit: cover; }

      .about-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
      .about-feature-card {
        padding: 16px;
        background: rgba(0, 0, 0, 0.03);
        border-radius: 18px;
      }
      .about-feature-card strong { display: block; font-size: 14px; font-weight: 600; color: #1d1d1f; margin-bottom: 4px; }
      .about-feature-card p { font-size: 13px; color: #424245; margin: 0; line-height: 1.4; }

      .about-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
      .about-version { font-size: 12px; color: #86868b; font-weight: 500; }
      .about-link { font-size: 12px; color: #0071e3; text-decoration: none; font-weight: 500; }
      .about-link:hover { text-decoration: underline; }

      .about-close { 
        border: none; 
        padding: 8px 20px; 
        border-radius: 999px; 
        background: #1d1d1f; 
        color: #fff; 
        font-size: 14px;
        font-weight: 600; 
        cursor: pointer; 
        transition: all 0.2s ease;
      }

      @media (prefers-color-scheme: dark) {
        .plugin-box { background: rgba(28, 28, 30, 0.8) !important; color: #fff; border: 1px solid rgba(255, 255, 255, 0.1) !important; }
        .about-title { color: #f5f5f7; }
        .about-subtitle { color: #a1a1a6; }
        .about-feature-card { background: rgba(255, 255, 255, 0.05); }
        .about-feature-card strong { color: #f5f5f7; }
        .about-feature-card p { color: #86868b; }
        .about-close { background: #f5f5f7; color: #000; }
        .about-link { color: #64d2ff; }
      }
    </style>

    <div class="about-container">
      <header class="about-header">
        <div class="about-label">Blank Board</div>
        <div class="about-title">A compact, elegant<br/>overview.</div>
        <p class="about-subtitle">A minimal plugin host with instant preview and a refined, theme-safe layout.</p>
      </header>

      <div class="about-grid-main">
        <div class="about-preview-large">
          <img src="https://raw.githubusercontent.com/dheeraz101/Empty_Plugins/main/main.gif" alt="Preview">
        </div>
        
        <div class="about-features">
          <div class="about-feature-card">
            <strong>Modular</strong>
            <p>Every feature is a plugin.</p>
          </div>
          <div class="about-feature-card">
            <strong>Minimal</strong>
            <p>Light core, powerful extensions.</p>
          </div>
          <div class="about-feature-card">
            <strong>Community</strong>
            <p>Ecosystem first design.</p>
          </div>
        </div>
      </div>

      <div class="about-actions">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="about-version">v${meta.version}</span>
          <span style="color: #d1d1d6; font-size: 10px;">•</span>
          <a href="https://github.com/dheeraz101/Empty" target="_blank" class="about-link">GitHub Repository</a>
        </div>
        <button id="close-about" class="about-close">Close</button>
      </div>
    </div>
  `;

  api.boardEl.appendChild(box);
  if (api.makeDraggable) api.makeDraggable(box);

  const closeButton = box.querySelector('#close-about');
  closeButton.addEventListener('click', () => {
    box.style.opacity = '0';
    box.style.transform = 'translate(-50%, -48%) scale(0.95)';
    setTimeout(() => {
      if (box) {
        box.remove();
        box = null;
      }
    }, 200);
  });
}

export function teardown() {
  if (box) {
    box.remove();
    box = null;
  }
}