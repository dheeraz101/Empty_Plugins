export const meta = {
  id: 'about',
  name: 'About Blank Board',
  version: '0.3.2',
  compat: '>=1.0.0'
};

export function setup(api) {
  function getAssetUrl(name) {
    try {
      return new URL(name, import.meta.url).href;
    } catch (e) {
      // fallback below
    }

    const script = document.currentScript;
    if (script && script.src) {
      try {
        return new URL(name, script.src).href;
      } catch (e) {
        // ignore
      }
    }

    return name;
  }

  const box = document.createElement('div');
  box.className = 'plugin-box';
  box.style.cssText = `
    left: 120px;
    top: 80px;
    width: min(760px, 92vw);
    background: rgba(255,255,255,0.06);
    color: #f7f7f7;
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: 28px;
    box-shadow: 0 40px 80px rgba(0,0,0,0.24);
    backdrop-filter: blur(18px);
    overflow: hidden;
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  box.innerHTML = `
    <div style="padding:32px 32px 24px 32px; background: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06)); border-bottom: 1px solid rgba(255,255,255,0.14);">
      <div style="font-size:12px; letter-spacing:0.24em; text-transform:uppercase; color:rgba(255,255,255,0.65); margin-bottom:12px;">About Blank Board</div>
      <div style="display:flex; align-items:flex-end; justify-content:space-between; gap:24px; flex-wrap:wrap;">
        <div style="max-width: 52%; min-width: 240px;">
          <div style="font-size:34px; font-weight:800; line-height:1.05; letter-spacing:-0.04em; color:#ffffff;">A blank canvas for adaptive workflows.</div>
          <div style="margin-top:14px; font-size:15px; color:rgba(255,255,255,0.78); line-height:1.7;">
            Every capability is a plugin. Every workspace is yours. Designed for focus, built for extension.
          </div>
        </div>
        <div style="min-width:180px; padding:14px 18px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); border-radius:20px; backdrop-filter: blur(12px);">
          <div style="font-size:13px; color:#d3d3ff; text-transform:uppercase; letter-spacing:0.16em; margin-bottom:10px;">Project at a glance</div>
          <div style="font-size:14px; color:#ffffff; line-height:1.7;">
            Modular. Minimal. Community-first.
          </div>
        </div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns: 1.15fr 0.85fr; gap:24px; padding:28px 32px 24px 32px;">
      <div>
        <div style="display:flex; gap:12px; align-items:center; margin-bottom:20px;">
          <div style="width:10px; height:10px; border-radius:50%; background: #7c6fff;"></div>
          <div style="font-size:13px; text-transform:uppercase; letter-spacing:0.22em; color:#9fa3c2;">The idea</div>
        </div>

        <p style="margin:0 0 18px 0; font-size:15px; color:rgba(255,255,255,0.92); line-height:1.75;">
          Blank Board removes assumptions. It does not decide what you need — it gives you the freedom to create your own productivity system using plugins. The result is a clean, elegant experience with infinite possibility.
        </p>

        <div style="display:grid; gap:16px;">
          <div style="padding:18px; border-radius:22px; background: rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12);">
            <div style="font-size:12px; letter-spacing:0.18em; text-transform:uppercase; color:#bdbff0; margin-bottom:8px;">Minimal by default</div>
            <div style="font-size:14px; color:rgba(255,255,255,0.9); line-height:1.7;">
              Start with a pure canvas. Add exactly what you need with plugins, not presets.
            </div>
          </div>

          <div style="padding:18px; border-radius:22px; background: rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12);">
            <div style="font-size:12px; letter-spacing:0.18em; text-transform:uppercase; color:#bdbff0; margin-bottom:8px;">Modular by design</div>
            <div style="font-size:14px; color:rgba(255,255,255,0.9); line-height:1.7;">
              Every feature is a plugin, so your workspace grows organically with your workflow.
            </div>
          </div>

          <div style="padding:18px; border-radius:22px; background: rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12);">
            <div style="font-size:12px; letter-spacing:0.18em; text-transform:uppercase; color:#bdbff0; margin-bottom:8px;">Community first</div>
            <div style="font-size:14px; color:rgba(255,255,255,0.9); line-height:1.7;">
              Build, share, and discover plugins from creators around the world.
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:18px;">
        <div style="border-radius:24px; overflow:hidden; background: rgba(0,0,0,0.15); border:1px solid rgba(255,255,255,0.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);">
          <img src="${getAssetUrl('main.gif')}" alt="Blank Board overview" style="width:100%; display:block; object-fit:cover;">
        </div>
        <div style="padding:18px; border-radius:22px; background: rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12);">
          <div style="font-size:13px; color:#d3d3ff; text-transform:uppercase; letter-spacing:0.18em; margin-bottom:10px;">Project highlight</div>
          <div style="font-size:14px; color:rgba(255,255,255,0.9); line-height:1.75;">
            main.gif captures the project’s spirit: elegant, effortless, and extensible. It shows the experience, not just the features.
          </div>
        </div>
      </div>
    </div>

    <div style="display:flex; flex-wrap:wrap; gap:16px; align-items:center; justify-content:space-between; padding:22px 32px 28px 32px; background: rgba(255,255,255,0.04); border-top: 1px solid rgba(255,255,255,0.12);">
      <div style="min-width:200px;">
        <div style="font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#9fa3c2; margin-bottom:6px;">Designed with care</div>
        <div style="font-size:13px; color:rgba(255,255,255,0.8); line-height:1.6;">
          A modern aesthetics system with soft light, rounded geometry, and thoughtful spacing.
        </div>
      </div>
      <button id="close-about" style="border:none; padding:12px 20px; border-radius:16px; background:rgba(124,111,255,0.96); color:#fff; font-weight:700; cursor:pointer; box-shadow: 0 16px 32px rgba(124,111,255,0.24); transition: transform 0.2s ease;">
        Close
      </button>
    </div>
  `;

  api.boardEl.appendChild(box);
  api.makeDraggable(box);

  const closeButton = box.querySelector('#close-about');
  closeButton.addEventListener('click', () => box.remove());
  closeButton.addEventListener('mouseover', () => closeButton.style.transform = 'translateY(-1px)');
  closeButton.addEventListener('mouseout', () => closeButton.style.transform = 'translateY(0)');
}

export function teardown() {}
