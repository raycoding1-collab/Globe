// Canvas memory on phone-sized screens, counted the way iPhones count it (a canvas counts until it is freed).
// atStartMB: before Begin; allBuiltMB: once every cut-out is made; peak*: highest at any moment; bakeMs: a rebuild (rotation).
// Keep allBuiltMB and peaks under ~200 MB for in-app browsers on older iPhones.
// usage: node tools/memory.mjs [port=8766]
import { chromium } from 'playwright';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.0 (iPhone14,7; iOS 17_5; en_US; en; scale=3.00; 1170x2532; 0)';
const port = process.argv[2] || '8766';
const b = await chromium.launch();
for (const [name, w, h, dpr] of [['iPhone 14, Instagram', 390, 664, 3], ['iPhone SE, Instagram', 375, 548, 2], ['iPhone 15 Pro Max, Instagram', 430, 760, 3], ['Android, Instagram', 412, 780, 2.625], ['Desktop retina', 1440, 900, 2]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: w < 900, hasTouch: w < 900, userAgent: w < 900 ? UA : undefined });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    window.__live = 0; window.__peak = 0; window.__count = 0; const bytes = new WeakMap();
    const dw = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width'), dh = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height');
    const upd = (c) => { const old = bytes.get(c); if (old === undefined) return; const now = dw.get.call(c) * dh.get.call(c) * 4; window.__live += now - old; bytes.set(c, now); if (window.__live > window.__peak) window.__peak = window.__live; };
    Object.defineProperty(HTMLCanvasElement.prototype, 'width', { get() { return dw.get.call(this); }, set(v) { dw.set.call(this, v); upd(this); }, configurable: true });
    Object.defineProperty(HTMLCanvasElement.prototype, 'height', { get() { return dh.get.call(this); }, set(v) { dh.set.call(this, v); upd(this); }, configurable: true });
    const gc = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...a) { if (!bytes.has(this)) { window.__count++; const n = this.width * this.height * 4; bytes.set(this, n); window.__live += n; if (window.__live > window.__peak) window.__peak = window.__live; } return gc.apply(this, a); };
  });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const t0 = Date.now();
  await p.goto(`http://localhost:${port}/index.html?t=200`);
  await p.waitForFunction('window.__ready === true', null, { timeout: 120000 });
  const load = Date.now() - t0;
  const r = await p.evaluate(() => {
    const s = window.__stage, seen = new Set(); let live = 0, n = 0;
    const walk = (o, d = 0) => { if (!o || typeof o !== 'object' || seen.has(o) || d > 8) return; seen.add(o); if (o instanceof HTMLCanvasElement) { live += o.width * o.height * 4; n++; return; } if (o instanceof CanvasRenderingContext2D || o instanceof Node || o instanceof Window) return; for (const k in o) { try { walk(o[k], d + 1); } catch (e) {} } };
    walk(s); for (const e of s.film.entities) walk(e.parts);
    const atStart = window.__live; s.bakeAhead(0, 1e9); live = 0; seen.clear(); walk(s); for (const e of s.film.entities) walk(e.parts); const peak1 = window.__peak; window.__peak = window.__live; window.__atStart = atStart;
    const t1 = performance.now(); s.W = 0; s.resize(); const bake = performance.now() - t1;
    return { atStartMB: +(window.__atStart / 1e6).toFixed(0), allBuiltMB: +(live / 1e6).toFixed(0), canvases: n, peakFirstMB: +(peak1 / 1e6).toFixed(0), peakRebakeMB: +(window.__peak / 1e6).toFixed(0), unfreedAfterRebakeMB: +(window.__live / 1e6).toFixed(0), W: s.W, H: s.H, dpr: +s.dpr.toFixed(2), bakeMs: Math.round(bake) };
  });
  console.log(name.padEnd(30), JSON.stringify(r), 'first frame ms', load, errs.length ? 'ERR ' + errs[0] : '');
  await ctx.close();
}
await b.close();
