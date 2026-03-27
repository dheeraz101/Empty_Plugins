# 🧩 Empty Plugins

A community plugin registry for **Empty**. Browse, install, and share plugins to extend your board.

## 📦 Available Plugins

| ID | Name | Author |
|----|------|--------|
| `hello` | Hello Box | Your Name |
| `notes` | Sticky Notes | Community |

## 🚀 How to Use

1. Open **Empty** and go to **Settings → Plugins**
2. Paste the registry URL: https://raw.githubusercontent.com/dheeraz101/Empty_Plugins/main/plugins.json
3. Browse and install any plugin from the list

## ➕ Adding Your Plugin

Want to share your plugin with the community? Open a Pull Request!

1. **Fork** this repo
2. **Edit** `plugins.json` — add your plugin entry:
```json
{
  "id": "your-plugin-id",
  "name": "Your Plugin Name",
  "url": "https://raw.githubusercontent.com/your-username/your-repo/main/plugin.js",
  "author": "Your Name"
}