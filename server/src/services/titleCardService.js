import fs from 'node:fs/promises';
import puppeteer from 'puppeteer';

export async function renderTitleCard({ title, caption, outputPath, style = {} }) {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    const color = style.color || '#2F80ED';
    const fontFamily = style.fontFamily || 'Noto Sans TC, sans-serif';
    const fontSize = Number(style.fontSize || 72);
    const position = style.position || 'bottom';
    await page.setContent(`<!doctype html><style>*{box-sizing:border-box}body{margin:0;width:1080px;height:1920px;background:transparent;font-family:${fontFamily};display:flex;justify-content:center;align-items:${position === 'top' ? 'flex-start' : position === 'center' ? 'center' : 'flex-end'};padding:120px 72px;color:${color};text-align:center}.wrap{font-size:${fontSize}px;font-weight:800;line-height:1.25;text-shadow:0 4px 12px #000,0 2px 3px #000;white-space:pre-wrap}</style><div class="wrap">${escapeHtml(title)}${caption && caption !== title ? `<br><small>${escapeHtml(caption)}</small>` : ''}</div>`);
    await page.screenshot({ path: outputPath, omitBackground: true });
    return outputPath;
  } finally { await browser.close(); }
}

function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }
