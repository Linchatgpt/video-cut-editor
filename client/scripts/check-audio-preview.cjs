const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    if (!process.env.PREVIEW_URL) {
      await page.route('**/api/default-video', async route => {
        const response = await route.fetch(); const data = await response.json();
        await route.fulfill({ json: { ...data, videoUrl: 'http://localhost:5173/api/video/default' } });
      });
    }
    await page.addInitScript(() => {
      // Simulate mobile media volume setters being ignored; measure actual graph output.
      Object.defineProperty(HTMLMediaElement.prototype, 'volume', { get: () => 1, set: () => {} });
      const Base = window.AudioContext;
      window.__gains = [];
      window.AudioContext = class extends Base {
        createGain() {
          const gain = super.createGain(); const analyser = this.createAnalyser();
          gain.connect(analyser); window.__gains.push({ gain, analyser }); return gain;
        }
      };
    });
    await page.goto(process.env.PREVIEW_URL || 'http://localhost:5173');
    await page.getByRole('button', { name: '新增片段', exact: true }).click();
    await page.locator('.music-field select').selectOption({ index: 1 });
    await page.locator('.music-controls label').filter({ hasText: '原影片音量' }).locator('input').fill('0');
    // Native video playback path, not the separate preview button.
    await page.locator('video.source-video').evaluate(v => v.play());
    await page.waitForTimeout(700);
    const gains = await page.evaluate(() => window.__gains.map(({gain}) => gain.gain.value));
    assert.ok(gains.includes(0), `Native play did not apply zero gain: ${JSON.stringify(gains)}`);
    await page.locator('.music-controls label').filter({ hasText: '原影片音量' }).locator('input').fill('1');
    await page.waitForTimeout(700);
    const full = await page.evaluate(() => { const a = window.__gains[0].analyser; const b = new Float32Array(a.fftSize); a.getFloatTimeDomainData(b); return Math.max(...b.map(Math.abs)); });
    assert.ok(full > 0.00001, `No measurable source signal: ${full}`);
    await page.locator('.music-controls label').filter({ hasText: '原影片音量' }).locator('input').fill('0');
    await page.waitForTimeout(500);
    const silent = await page.evaluate(() => { const a = window.__gains[0].analyser; const b = new Float32Array(a.fftSize); a.getFloatTimeDomainData(b); return Math.max(...b.map(Math.abs)); });
    assert.ok(silent < 0.000001, `Zero slider still produces sound: ${silent}`);
    await page.locator('video.source-video').evaluate(v => v.pause());
    await page.getByRole('button', { name: '試聽此片段', exact: true }).click();
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.__gains[0].gain.gain.value), 0);
    await page.locator('.music-controls label').filter({ hasText: '原影片音量' }).locator('input').fill('0.5');
    assert.equal(await page.evaluate(() => window.__gains[0].gain.gain.value), 0.5);
    await page.getByRole('button', { name: '暫停試聽', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('audio').paused);
    assert.equal(await page.locator('audio').evaluate(a => a.paused), true);
    console.log(JSON.stringify({ viewport: '390x844', ignoredMediaVolume: true, nativePlayback: 'passed', fullSignalPeak: full, zeroSignalPeak: silent }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
