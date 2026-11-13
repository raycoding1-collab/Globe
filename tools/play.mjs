// Real-time playback test: click Begin, let it run, report frame rate and errors, grab frames.
import { chromium } from 'playwright';
const [size = '1440x810', secs = '12'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
p.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
p.on('pageerror', (e) => console.log('page error:', e.message));
await p.goto('http://localhost:8765/index.html');
await p.waitForTimeout(1500);
await p.screenshot({ path: `shots/title_${size}.png` });
await p.click('#begin');
await p.evaluate(() => { window.__f = 0; const tick = () => { window.__f++; requestAnimationFrame(tick); }; tick(); });
await p.waitForTimeout(+secs * 1000);
const r = await p.evaluate(() => ({ frames: window.__f, t: document.querySelector('audio')?.currentTime, cap: document.getElementById('caption').textContent }));
console.log(size, 'fps', (r.frames / +secs).toFixed(1), 'caption:', r.cap);
await p.screenshot({ path: `shots/play_${size}.png` });
await b.close();
