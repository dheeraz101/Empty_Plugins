export const meta = {
  id: 'about',
  name: 'About Blank Board',
  version: '0.4.1',
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
    background: rgba(255, 255, 255, 0.8);
    color: #000;
    border-radius: 32px;
    box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(40px) saturate(200%);
    -webkit-backdrop-filter: blur(40px) saturate(200%);
    border: 1px solid rgba(255, 255, 255, 0.5);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif;
    padding: 40px 32px 32px 32px;
    box-sizing: border-box;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  box.innerHTML = `
    <style>
      .about-container { display: flex; flex-direction: column; gap: 28px; position: relative; }
      
      .about-close-btn {
        position: absolute;
        top: -10px;
        right: -10px;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.05);
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 10;
        color: #1d1d1f;
      }
      .about-close-btn:hover {
        background: rgba(0, 0, 0, 0.1);
        transform: scale(1.05);
      }
      .about-close-btn:active {
        transform: scale(0.95);
      }

      .about-header { text-align: left; }
      .about-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #86868b; margin-bottom: 6px; }
      .about-title { font-size: 34px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.1; color: #1d1d1f; }
      .about-subtitle { margin-top: 14px; font-size: 17px; color: #424245; line-height: 1.47; font-weight: 400; }
      
      .about-preview-large { 
        width: 100%; 
        border-radius: 20px; 
        overflow: hidden; 
        background: #000; 
        aspect-ratio: 16/10;
        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      }
      /* ✅ CHANGED: img → video */
      .about-preview-large video { width: 100%; height: 100%; object-fit: cover; display: block; }

      .about-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .about-feature-card {
        padding: 16px;
        background: rgba(0, 0, 0, 0.04);
        border-radius: 16px;
        text-align: center;
      }
      .about-feature-card strong { display: block; font-size: 14px; font-weight: 600; color: #1d1d1f; margin-bottom: 2px; }
      .about-feature-card p { font-size: 12px; color: #6e6e73; margin: 0; line-height: 1.3; }

      .about-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 20px; }
      .about-version { font-size: 12px; color: #86868b; }
      .about-link { font-size: 12px; color: #0071e3; text-decoration: none; font-weight: 500; }
      .about-link:hover { text-decoration: underline; }

      @media (prefers-color-scheme: dark) {
        .plugin-box { background: rgba(30, 30, 30, 0.7) !important; color: #fff; border: 1px solid rgba(255, 255, 255, 0.1) !important; }
        .about-title { color: #f5f5f7; }
        .about-subtitle { color: #a1a1a6; }
        .about-feature-card { background: rgba(255, 255, 255, 0.08); }
        .about-feature-card strong { color: #f5f5f7; }
        .about-feature-card p { color: #86868b; }
        .about-close-btn { background: rgba(255, 255, 255, 0.1); color: #f5f5f7; }
        .about-close-btn:hover { background: rgba(255, 255, 255, 0.15); }
        .about-footer { border-top-color: rgba(255,255,255,0.1); }
      }
    </style>

    <div class="about-container">
      <button id="close-about" class="about-close-btn" aria-label="Close">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>

      <header class="about-header">
        <div class="about-label">Blank Board</div>
        <div class="about-title">Start empty.<br>Build your own workspace.</div>
        <p class="about-subtitle">A blank grid with no tools. Add only what you need with simple plugins.</p>
      </header>

      <div class="about-preview-large">
        <video autoplay loop muted playsinline>
          <source src="https://raw.githubusercontent.com/dheeraz101/Empty_Plugins/main/empty.mp4" type="video/mp4">
        </video>
      </div>
      
      <div class="about-features">
        <div class="about-feature-card">
          <strong>Modular</strong>
          <p>Everything is a plugin.</p>
        </div>
        <div class="about-feature-card">
          <strong>Minimal</strong>
          <p>A tiny core.</p>
        </div>
        <div class="about-feature-card">
          <strong>Open</strong>
          <p>Built by anyone.</p>
        </div>
      </div>

      <footer class="about-footer">
        <span class="about-version">Version ${meta.version}</span>
        <a href="https://github.com/dheeraz101/Empty" target="_blank" class="about-link">View on GitHub</a>
      </footer>
    </div>
  `;

  api.boardEl.appendChild(box);
  if (api.makeDraggable) api.makeDraggable(box);

  const closeButton = box.querySelector('#close-about');
  closeButton.addEventListener('click', () => {
    box.style.opacity = '0';
    box.style.transform = 'translate(-50%, -45%) scale(0.92)';
    setTimeout(() => {
      if (box) {
        box.remove();
        box = null;
      }
    }, 300);
  });
}

export function teardown() {
  if (box) {
    box.remove();
    box = null;
  }
}