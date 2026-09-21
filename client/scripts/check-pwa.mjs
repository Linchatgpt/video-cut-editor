import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'public/manifest.webmanifest',
  'public/sw.js',
  'public/icons/icon-192.png',
  'public/icons/icon-512.png',
];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) {
    throw new Error(`缺少 PWA 檔案：${relative}`);
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/manifest.webmanifest'), 'utf8'));
if (manifest.display !== 'standalone' || manifest.start_url !== '/' || manifest.icons?.length < 2) {
  throw new Error('PWA manifest 尚未符合安裝要求');
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const marker of ['manifest.webmanifest', 'apple-touch-icon']) {
  if (!html.includes(marker)) throw new Error(`index.html 缺少 ${marker}`);
}

const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
for (const marker of ['beforeinstallprompt', 'appinstalled', '加入主畫面']) {
  if (!app.includes(marker)) throw new Error(`安裝提示缺少 ${marker}`);
}

console.log('PWA metadata checks passed');
