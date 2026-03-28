export const meta = {
  id: 'theme-plugin',
  name: 'Theme Manager',
  version: '1.0.0',
  description: 'Dark/Light theme switcher with custom board backgrounds',
  author: 'Your Name',
  compat: '>=3.3.0'
};

export function setup(api) {
  console.log('🎨 Theme Plugin loaded');

  // Example: Listen to board lifecycle events
  api.bus.on('board:allPluginsLoaded', () => {
    console.log('🎨 All plugins loaded — applying saved theme');
    applySavedTheme();
  });

  // Hook into Plugin Manager to add a custom tab/button
  api.registerHook('manager:addTab', (tabs) => {
    tabs.push({
      id: 'theme-tab',
      label: '🎨 Themes',
      content: createThemePanel()
    });
  });

  // Example: Add custom action button to every installed plugin card
  api.registerHook('manager:renderInstalledCard', (plugin) => {
    if (plugin.id === SELF_ID || plugin.id === 'theme-plugin') return null;
    return `
      <button onclick="applyRandomTheme()" 
              style="margin-top:8px; width:100%; padding:8px; background:#333; color:#fff; border:none; border-radius:8px; cursor:pointer;">
        🎨 Random Theme
      </button>`;
  });

  // Simple theme functions
  function applySavedTheme() {
    const saved = api.storage.getForPlugin('theme-plugin', 'currentTheme') || 'dark';
    document.documentElement.style.setProperty('--board-bg', saved === 'dark' ? '#0f0f0f' : '#f8f9fa');
  }

  window.applyRandomTheme = () => {
    const themes = ['#0f0f0f', '#1a1a2e', '#16213e', '#0f3460', '#f8f9fa'];
    const randomBg = themes[Math.floor(Math.random() * themes.length)];
    
    document.getElementById('board').style.background = randomBg;
    api.storage.setForPlugin('theme-plugin', 'currentTheme', randomBg);
    
    api.notify(`Theme changed to ${randomBg}`, 'success', 2000);
  };

  function createThemePanel() {
    const div = document.createElement('div');
    div.style.padding = '20px';
    div.innerHTML = `
      <h3 style="margin-bottom:16px; color:#fff;">Theme Settings</h3>
      <button onclick="applyRandomTheme()" 
              style="padding:12px 24px; background:#7c6fff; color:white; border:none; border-radius:10px; cursor:pointer; margin-right:12px;">
        Apply Random Background
      </button>
      <button onclick="alert('More theme options coming soon!')" 
              style="padding:12px 24px; background:#333; color:#fff; border:none; border-radius:10px; cursor:pointer;">
        More Themes
      </button>
    `;
    return div;
  }

  // Cleanup
  return {
    teardown: () => {
      console.log('🎨 Theme Plugin unloaded');
    }
  };
}