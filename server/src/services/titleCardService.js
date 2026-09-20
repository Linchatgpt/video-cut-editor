import fs from 'node:fs/promises';
import puppeteer from 'puppeteer';

export async function renderTitleCard({ title, caption, outputPath, style = {}, outputAspect = '9:16', originalDimensions }) {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const square = outputAspect === '1:1';
    const width = 1080;
    const height = outputAspect === 'original' && originalDimensions ? Math.round(1080 * originalDimensions.height / originalDimensions.width) : square ? 1080 : 1920;
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    const top = style.topText || { color: '#2F80ED', fontFamily: 'Noto Sans TC', fontSize: 72, x: 50, y: 22 };
    const bottom = style.bottomText || { color: '#2F80ED', fontFamily: 'Noto Sans TC', fontSize: 72, x: 50, y: 52 };
    await page.setContent(`<!doctype html><style>*{box-sizing:border-box}body{margin:0;width:${width}px;height:${height}px;background:transparent;position:relative;text-align:center}.text{position:absolute;transform:translate(-50%,-50%);font-weight:800;line-height:1.25;text-shadow:0 4px 12px #000,0 2px 3px #000;white-space:pre-wrap;max-width:${Math.max(20, Math.min(100, Number(top.width || 88)))}%}</style><div class="text" style="left:${Number(top.x)}%;top:${Number(top.y)}%;max-width:${Math.max(20, Math.min(100, Number(top.width || 88)))}%;color:${escapeCss(top.color)};font-family:${escapeCss(top.fontFamily)},sans-serif;font-size:${Number(top.fontSize)}px">${escapeHtml(title)}</div><div class="text" style="left:${Number(bottom.x)}%;top:${Number(bottom.y)}%;max-width:${Math.max(20, Math.min(100, Number(bottom.width || 88)))}%;color:${escapeCss(bottom.color)};font-family:${escapeCss(bottom.fontFamily)},sans-serif;font-size:${Number(bottom.fontSize)}px">${escapeHtml(caption || '')}</div>`);
    await page.screenshot({ path: outputPath, omitBackground: true });
    return outputPath;
  } finally { await browser.close(); }
}

function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }
function escapeCss(value = '') { return String(value).replace(/[;{}<>]/g, ''); }
