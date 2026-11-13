// The stage: a small cardboard planet seen from the side, made of stacked discs
// that turn at different speeds, with a paper sky behind and a camera that never
// stops travelling. Everything is a pure function of film time t, so the film
// can be paused, scrubbed and resized without anything drifting.
import { Sheet, put, textures, makeCanvas, KRAFT } from './paper.js';
import { KINDS, bakeFlames, bakeSky } from './cutouts.js';
import { DEG, clamp, lerp, smooth, sramp, hash, noise, fbm, rgb, mix, hex, shade, spring, rng } from './util.js';

// Discs from back to front. rf: rim radius (planet = 1), sf: how fast it turns
// relative to the main disc (distant layers are slower and softer).
export const LAYERS = {
  far: { rf: 1.05, sf: 0.52, alpha: 0.86, blur: 1.8, sh: 0 },
  mid: { rf: 1.022, sf: 0.78, alpha: 1, blur: 0.7, sh: 0.2 },
  main: { rf: 1, sf: 1, alpha: 1, blur: 0, sh: 0.34 },
  front: { rf: 0.958, sf: 1.24, alpha: 1, blur: 2.4, sh: 0.3, tint: 0.5 },
  core: { rf: 0.84, sf: 1.24, alpha: 1, blur: 0, sh: 0 },
};
const ORDER = ['far', 'mid', 'main', 'front', 'core'];

export class Stage {
  constructor(canvas, film) {
    this.canvas = canvas; this.g = canvas.getContext('2d');
    this.film = film;
    this.world = makeCanvas(2, 2); this.wg = this.world.getContext('2d');
    this.mask = makeCanvas(2, 2); this.mg = this.mask.getContext('2d');
    this.lightC = makeCanvas(2, 2); this.lg = this.lightC.getContext('2d');
    this.onFlap = null; this.lastT = -1;
    this.resize();
  }

  resize() {
    const cssW = this.canvas.clientWidth || window.innerWidth, cssH = this.canvas.clientHeight || window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const budget = 2.4e6;
    if (cssW * cssH * dpr * dpr > budget) dpr = Math.sqrt(budget / (cssW * cssH));
    const W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
    if (W === this.W && H === this.H) return;
    this.W = W; this.H = H; this.dpr = dpr;
    for (const c of [this.canvas, this.world, this.mask]) { c.width = W; c.height = H; }
    this.lightC.width = Math.ceil(W / 3); this.lightC.height = Math.ceil(H / 3);
    const aspect = W / H, k = sramp(aspect, 0.6, 1.7);
    this.R = W * lerp(1.06, 0.7, k);
    this.hy = H * lerp(0.665, 0.685, k);
    this.cx = W / 2; this.cy = this.hy + this.R;
    this.u = this.R / 1000;
    this.vis = Math.asin(Math.min(1, (W / 2) / this.R)) / DEG; // half arc on screen, degrees
    this.bake();
    this.schedule();
    this.buildPost();
  }

  // -- bake every sprite at exactly the size it will be shown ---------------
  bake() {
    const u = this.u * 1.3, cache = new Map(); // baked a little oversize so the camera can push in
    this.partsOf = (e) => {
      const L = LAYERS[e.layer], sc = e.scale || 1;
      const key = `${e.kind}|${e.v || 0}|${sc}|${L.blur}`;
      if (!cache.has(key)) {
        const mk = (name, box, o = {}) => new BlurSheet(name + key, box, u * sc, o, L.blur / sc, L.tint || 0);
        cache.set(key, KINDS[e.kind].bake(mk, e.v || 0));
      }
      return cache.get(key);
    };
    for (const e of this.film.entities) e.parts = this.partsOf(e);
    const mk = (name, box, o = {}) => new BlurSheet(name, box, u, o, 0);
    this.flames = bakeFlames(mk);
    this.sky = bakeSky((name, box, o = {}) => new BlurSheet(name, box, u, o, 0.6));
    const { GRAIN, BLOTCH } = textures();
    const tile = makeCanvas(256, 256), tg = tile.getContext('2d');
    tg.drawImage(GRAIN, 0, 0); tg.globalCompositeOperation = 'multiply'; tg.globalAlpha = 0.8; tg.drawImage(BLOTCH, 0, 0);
    this.groundTex = tile;
    // stars: pinholes in the backdrop
    const r = rng(2024); this.stars = [];
    for (let i = 0; i < 420; i++) this.stars.push({ a: r() * 360, d: 1.03 + Math.pow(r(), 0.8) * 1.45, s: 0.5 + Math.pow(r(), 3) * 1.6, ph: r() * 100, warm: r() });
    // a river of fainter stars spiralling slowly outward
    for (let i = 0; i < 900; i++) { const a = r() * 360, w = (r() + r() + r() - 1.5) * 0.16; this.stars.push({ a, d: 1.12 + ((a % 360) / 360) * 1.2 + w, s: 0.34 + r() * 0.42, ph: r() * 100, warm: r() * 0.7, dust: 1 }); }
    this.motes = [];
    for (let i = 0; i < 70; i++) this.motes.push({ x: r(), y: r(), s: 0.6 + r() * 1.6, sp: 0.3 + r(), ph: r() * 100, d: r() });
  }

  // -- when does each cut-out spring up? ------------------------------------
  schedule() {
    const cam = this.film.cam;
    for (const e of this.film.entities) {
      if (e.popAt !== undefined) { e.tPop = e.popAt; continue; }
      const L = LAYERS[e.layer];
      const relPop = Math.asin(Math.min(0.999, (0.74 * this.W / 2) / (this.R * L.rf))) / DEG;
      const target = e.a - relPop / L.sf;
      if (cam(0) >= target) { e.tPop = -100; continue; }
      let lo = 0, hi = this.film.duration + 60;
      if (cam(hi) < target) { e.tPop = 1e9; continue; }
      for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; cam(m) < target ? (lo = m) : (hi = m); }
      e.tPop = hi + (e.delay ?? hash(Math.round(e.a * 131) + 7) * 0.4);
    }
  }

  buildPost() {
    const { W, H } = this;
    const v = makeCanvas(W / 4, H / 4), g = v.getContext('2d');
    const gr = g.createRadialGradient(v.width / 2, v.height * 0.52, Math.min(v.width, v.height) * 0.25, v.width / 2, v.height * 0.52, Math.hypot(v.width, v.height) * 0.62);
    gr.addColorStop(0, 'rgba(14,8,6,0)'); gr.addColorStop(0.6, 'rgba(14,8,6,0.12)'); gr.addColorStop(1, 'rgba(10,5,4,0.55)');
    g.fillStyle = gr; g.fillRect(0, 0, v.width, v.height);
    this.vignette = v;
    // three frames of film grain
    this.grainTiles = [0, 1, 2].map((k) => {
      const N = 256, c = makeCanvas(N, N), cg = c.getContext('2d'), id = cg.createImageData(N, N), r = rng(900 + k);
      for (let i = 0; i < N * N; i++) { const n = (r() + r() + r()) / 3; const val = n < 0.5 ? 0 : 255; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = val; id.data[i * 4 + 3] = Math.abs(n - 0.5) * 2 * 255 * 0.55; }
      cg.putImageData(id, 0, 0); return c;
    });
  }

  // screen position (device px) of a point on a layer: angle a (deg), height h (units)
  place(layer, a, h, t) {
    const L = LAYERS[layer], rel = L.sf * (a - this.film.cam(t)) * DEG, rad = (L.rf * 1000 + h) * this.eu;
    return [this.cx + Math.sin(rel) * rad, this.ecy - Math.cos(rel) * rad, rel];
  }

  // -- one disc of the planet ------------------------------------------------
  ring(g, name, cam, colors, t) {
    const L = LAYERS[name], f = this.film, prof = f.profile[name] || (() => 0);
    const R0 = L.rf * 1000, span = 89, vis = this.vis + 4;
    const path = new Path2D(), rim = new Path2D();
    for (let rel = -span; rel <= span + 0.001; rel += (Math.abs(rel) > vis ? 2 : 0.3)) {
      const a = cam + rel / L.sf, rr = R0 + prof(a);
      const x = Math.sin(rel * DEG) * rr, y = -Math.cos(rel * DEG) * rr;
      if (rel === -span) { path.moveTo(x, y); rim.moveTo(x, y); } else { path.lineTo(x, y); rim.lineTo(x, y); }
    }
    const depth = (this.H - this.ecy) / this.eu + 40;
    path.lineTo(1400, depth); path.lineTo(-1400, depth); path.closePath();
    // soft contact shadow on the disc behind
    if (name !== 'far') {
      g.save(); g.lineJoin = 'round';
      for (const [w, al] of [[46, 0.05], [26, 0.06], [12, 0.08], [5, 0.1]]) { g.strokeStyle = `rgba(26,14,8,${al})`; g.lineWidth = w; g.stroke(rim); }
      g.restore();
    }
    g.save();
    g.globalAlpha = L.alpha;
    g.fillStyle = rgb(colors[name]); g.fill(path);
    g.clip(path);
    // painted light: a little brighter along the top of each disc
    const gr = g.createRadialGradient(0, 0, R0 - 150, 0, 0, R0 + 80);
    gr.addColorStop(0, 'rgba(20,10,6,0.20)'); gr.addColorStop(0.75, 'rgba(20,10,6,0)'); gr.addColorStop(1, 'rgba(255,240,210,0.07)');
    g.fillStyle = gr; g.fillRect(-1400, -1400, 2800, 2800);
    // paper texture that turns with the disc
    g.rotate(-L.sf * cam * DEG);
    g.scale(1 / this.u, 1 / this.u);
    g.globalCompositeOperation = 'overlay'; g.globalAlpha = L.alpha * (name === 'far' ? 0.35 : 0.6);
    if (!this.texPat) this.texPat = g.createPattern(this.groundTex, 'repeat');
    g.fillStyle = this.texPat;
    const big = 1500 * this.u * 1.4; g.fillRect(-big, -big, big * 2, big * 2);
    g.restore();
    // the cut edge catching the light
    if (name !== 'core') {
      g.save(); g.globalAlpha = L.alpha * 0.5; g.lineJoin = 'round';
      g.strokeStyle = rgb(mix(KRAFT, colors[name], 0.35)); g.lineWidth = name === 'far' ? 1.2 : 2; g.stroke(rim);
      g.restore();
    }
  }

  drawEntity(g, e, t, cam, env) {
    const L = LAYERS[e.layer], rel = L.sf * (e.a - cam);
    if (Math.abs(rel) > this.vis + 14) return;
    const prof = this.film.profile[e.layer];
    const tau = t - e.tPop;
    // pop: flat on the ground, then up with overshoot and a wobble that dies away
    let p = spring(tau, 10.5, 0.46), wob = tau > 0 ? Math.exp(-2.1 * tau) * Math.sin(8.2 * tau) * 11 : 0;
    if (e.foldAt !== undefined && t > e.foldAt) { const k = clamp((t - e.foldAt) / 0.22); p *= 1 - k * k; wob = 0; }
    const sy = 0.045 + 0.955 * p;
    g.save();
    g.rotate(rel * DEG);
    g.translate(0, -(L.rf * 1000 + (prof ? prof(e.a) : 0) + (e.y || 0)));
    g.rotate(wob * DEG * (e.wob ?? 1));
    g.scale((e.flip ? -1 : 1) * (1 - (sy - 1) * 0.35), sy);
    if (e.scale) g.scale(e.scale, e.scale);
    env.sh = L.sh * clamp(p * 1.4);
    if (!e.emissive || true) KINDS[e.kind].draw(g, e.parts, t, e, env);
    g.restore();
    // paper flap as it springs
    if (this.onFlap && this.lastT >= 0 && this.lastT < e.tPop && t >= e.tPop && t - this.lastT < 0.3) {
      this.onFlap(Math.sin(rel * DEG) * this.eR / (this.W / 2), e.layer, e.loud ?? 1);
    }
    if (this.onFlap && e.foldAt !== undefined && this.lastT >= 0 && this.lastT < e.foldAt && t >= e.foldAt && t - this.lastT < 0.3) this.onFlap(Math.sin(rel * DEG) * this.R / (this.W / 2), e.layer, 1.2);
  }

  render(t) {
    const { g, wg, W, H, cx, film } = this;
    const cam = film.cam(t), S = film.state(t);
    const z = S.zoom || 1, u = this.u * z, cy = this.hy + this.R * z;
    this.eu = u; this.ecy = cy; this.eR = this.R * z;
    const env = { fire: S.fire, sh: 0.3 };

    // ---- sky backdrop -------------------------------------------------------
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    const sk = S.sky, bottom = this.hy + H * 0.06;
    const sg = g.createLinearGradient(0, 0, 0, bottom);
    sg.addColorStop(0, rgb(sk[0])); sg.addColorStop(0.42, rgb(sk[1])); sg.addColorStop(0.78, rgb(sk[2])); sg.addColorStop(1, rgb(sk[3]));
    g.fillStyle = sg; g.fillRect(0, 0, W, H);
    // stars turn about the planet's axis
    if (S.stars > 0.01) {
      const rot = (-cam * 0.3 - t * 0.22) * DEG;
      for (const s of this.stars) {
        const a = s.a * DEG + rot, d = s.d * this.R, x = cx + Math.sin(a) * d, y = cy - Math.cos(a) * d;
        if (x < -4 || x > W + 4 || y < -4 || y > this.hy + 30) continue;
        const tw = 0.62 + 0.38 * Math.sin(t * (0.8 + s.s) + s.ph) * Math.sin(t * 0.37 + s.ph * 2);
        const hz = clamp((this.hy - y) / (H * 0.22)); // fade toward the horizon haze
        const al = S.stars * (s.dust ? 0.6 + 0.4 * tw : tw) * hz * (s.dust ? 0.75 : 0.5 + s.s * 0.4), rad = Math.max(0.7, s.s * this.dpr * 0.85);
        g.fillStyle = s.warm > 0.8 ? `rgba(255,226,190,${al})` : `rgba(226,236,255,${al})`;
        g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
        if (s.s > 1.3) { g.fillStyle = `rgba(210,225,255,${al * 0.07})`; g.beginPath(); g.arc(x, y, rad * 2.6, 0, 7); g.fill(); }
      }
    }
    // the sun is a painted disc that slides behind the hills
    if (S.sun) {
      const sx = cx + S.sun.x * u, sy = this.hy + S.sun.y * u;
      const gl = g.createRadialGradient(sx, sy, 0, sx, sy, 520 * u);
      gl.addColorStop(0, `rgba(255,206,130,${0.55 * S.sun.k})`); gl.addColorStop(0.25, `rgba(255,170,96,${0.22 * S.sun.k})`); gl.addColorStop(1, 'rgba(255,150,80,0)');
      g.fillStyle = gl; g.fillRect(0, 0, W, H);
      g.save(); g.translate(sx, sy); g.scale(u, u); g.rotate(t * 0.02); put(g, this.sky.sun, 0.25, 4, 6); g.restore();
      g.globalCompositeOperation = 'screen';
      const g2 = g.createRadialGradient(sx, sy, 0, sx, sy, 90 * u);
      g2.addColorStop(0, `rgba(255,200,120,${0.5 * S.sun.k})`); g2.addColorStop(0.5, `rgba(255,170,90,${0.3 * S.sun.k})`); g2.addColorStop(1, 'rgba(255,150,80,0)');
      g.fillStyle = g2; g.fillRect(sx - 90 * u, sy - 90 * u, 180 * u, 180 * u); g.globalCompositeOperation = 'source-over';
    }
    // paper grain of the backdrop itself
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.3;
    if (!this.skyPat) this.skyPat = g.createPattern(textures().GRAIN, 'repeat');
    g.fillStyle = this.skyPat; g.fillRect(0, 0, W, this.hy + 40); g.restore();

    // ---- the world, on its own sheet so light can fall on it ------------------
    wg.setTransform(1, 0, 0, 1, 0, 0); wg.globalCompositeOperation = 'source-over'; wg.globalAlpha = 1;
    wg.clearRect(0, 0, W, H);
    // clouds hang from threads
    for (const c of film.clouds) {
      const spr = this.sky.clouds[c.v], x = cx + (((c.x - cam * c.par - t * c.drift) % 2400 + 3600) % 2400 - 1200) * u;
      const y = this.hy * (1 - c.yf), sw = Math.sin(t * 0.33 + c.v * 2.1) * 1.4 * DEG;
      if (x < -300 * u || x > W + 300 * u) continue;
      wg.save(); wg.translate(x, -20); wg.rotate(sw);
      wg.strokeStyle = 'rgba(70,52,40,0.4)'; wg.lineWidth = Math.max(1, 0.7 * u);
      const len = y + 20;
      for (const dx of [-spr.w * 0.45, spr.w * 0.4]) { wg.beginPath(); wg.moveTo(dx * u * c.s, 0); wg.lineTo(dx * u * c.s, len - 12 * u * c.s); wg.stroke(); }
      wg.translate(0, len); wg.scale(u * c.s, u * c.s); wg.globalAlpha = c.al ?? 1;
      put(wg, spr.spr, 0.18, 6, 9);
      wg.restore();
    }
    wg.setTransform(u, 0, 0, u, cx, cy);
    const byLayer = film.byLayer;
    const amb = S.ambient, dark = amb[0] < 250 || amb[1] < 250 || amb[2] < 250 || S.lights.length;
    const drawLayer = (name) => {
      // things stand behind the rim of their own disc, so draw them first
      if (name !== 'front' && name !== 'core') for (const e of byLayer[name] || []) { wg.globalAlpha = LAYERS[name].alpha; this.drawEntity(wg, e, t, cam, env); }
      wg.globalAlpha = 1;
      this.ring(wg, name, cam, S.ground, t);
      if (name === 'front') for (const e of byLayer[name] || []) this.drawEntity(wg, e, t, cam, env);
    };
    // distant things only feel the colour of the air
    drawLayer('far');
    if (dark) {
      const lum = (amb[0] * 0.3 + amb[1] * 0.5 + amb[2] * 0.2) / 255;
      wg.setTransform(1, 0, 0, 1, 0, 0); wg.globalCompositeOperation = 'source-atop';
      wg.fillStyle = rgb([amb[0] * 0.3, amb[1] * 0.32, amb[2] * 0.36], clamp(1 - lum) * 0.96); wg.fillRect(0, 0, W, H);
      wg.globalCompositeOperation = 'source-over';
    }
    g.drawImage(this.world, 0, 0);
    wg.setTransform(1, 0, 0, 1, 0, 0); wg.clearRect(0, 0, W, H);
    wg.setTransform(u, 0, 0, u, cx, cy);
    for (const name of ['mid', 'main', 'front', 'core']) drawLayer(name);

    // ---- light ----------------------------------------------------------------
    if (dark) {
      const lg = this.lg, lw = this.lightC.width, lh = this.lightC.height, k = lw / W;
      lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-over';
      lg.fillStyle = rgb(amb); lg.fillRect(0, 0, lw, lh);
      lg.globalCompositeOperation = 'lighter';
      for (const l of S.lights) {
        const [x, y] = this.place(l.layer || 'main', l.a, l.h, t), rad = l.r * u * k;
        if (rad < 0.5 || l.k <= 0) continue;
        const gr = lg.createRadialGradient(x * k, y * k, 0, x * k, y * k, rad), c = l.color;
        gr.addColorStop(0, rgb(c, Math.min(1, l.k))); gr.addColorStop(0.1, rgb(c, Math.min(1, l.k * 0.74))); gr.addColorStop(0.24, rgb(c, l.k * 0.36)); gr.addColorStop(0.45, rgb(c, l.k * 0.13)); gr.addColorStop(0.72, rgb(c, l.k * 0.035)); gr.addColorStop(1, rgb(c, 0));
        lg.fillStyle = gr; lg.fillRect(x * k - rad, y * k - rad, rad * 2, rad * 2);
      }
      if (S.lights.length) {
        lg.globalCompositeOperation = 'source-over';
        const rr = LAYERS.front.rf * 1000 * u * k, sh = lg.createRadialGradient(cx * k, cy * k, rr * 0.9, cx * k, cy * k, rr * 1.004);
        const a2 = rgb([amb[0] * 1.5, amb[1] * 1.3, amb[2] * 1.15], 0.5);
        sh.addColorStop(0, a2); sh.addColorStop(0.985, a2); sh.addColorStop(1, rgb(amb, 0));
        lg.fillStyle = sh; lg.beginPath(); lg.arc(cx * k, cy * k, rr * 1.004, 0, 7); lg.fill();
      }
      const mg = this.mg;
      mg.setTransform(1, 0, 0, 1, 0, 0); mg.globalCompositeOperation = 'copy'; mg.imageSmoothingQuality = 'high';
      mg.drawImage(this.lightC, 0, 0, W, H);
      mg.globalCompositeOperation = 'destination-in'; mg.drawImage(this.world, 0, 0);
      wg.setTransform(1, 0, 0, 1, 0, 0); wg.globalCompositeOperation = 'multiply'; wg.drawImage(this.mask, 0, 0);
      wg.globalCompositeOperation = 'source-over';
    }
    g.drawImage(this.world, 0, 0);

    // ---- things that give light ---------------------------------------------
    if (S.moon && S.moon.k > 0.01) {
      const mx = cx + S.moon.x * W, len = S.moon.y * H, sw = Math.sin(t * 0.5) * 1.6 * DEG * S.moon.swing;
      g.save(); g.translate(mx, -10); g.rotate(sw);
      g.strokeStyle = `rgba(200,205,225,${0.22 * S.moon.k})`; g.lineWidth = Math.max(1, 0.6 * u);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, len - 26 * u); g.stroke();
      g.translate(0, len);
      const gl = g.createRadialGradient(0, 0, 0, 0, 0, 230 * u);
      gl.addColorStop(0, `rgba(210,222,255,${0.2 * S.moon.k})`); gl.addColorStop(1, 'rgba(200,215,255,0)');
      g.globalCompositeOperation = 'screen'; g.fillStyle = gl; g.fillRect(-240 * u, -240 * u, 480 * u, 480 * u);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = S.moon.k;
      g.scale(u, u); g.rotate(-0.35); put(g, this.sky.moon, 0);
      g.restore();
    }
    for (const em of S.emitters) this.fire(g, em, t);

    // dust in the air, catching whatever light there is
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'screen';
    const mc = S.moteColor;
    for (const m of this.motes) {
      const x = ((m.x + t * 0.006 * m.sp + Math.sin(t * 0.21 * m.sp + m.ph) * 0.02 - cam * 0.0016 * (0.5 + m.d)) % 1 + 1) % 1 * W;
      const band = 380 * u, y = this.hy + 50 * u - (((m.y + Math.sin(t * 0.17 + m.ph) * 0.03 + t * 0.004 * m.sp) % 1 + 1) % 1) ** 1.6 * band;
      const al = S.motes * (0.35 + 0.65 * Math.sin(t * 0.7 * m.sp + m.ph) ** 2) * (0.2 + m.d * 0.4) * clamp(1 - Math.abs(x - cx) / (W * 0.55) * 0.6);
      const rad = m.s * u * (1.0 + m.d * 1.5);
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, rgb(mc, al)); gr.addColorStop(1, rgb(mc, 0));
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }

    // ---- the camera and the film stock ----------------------------------------
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.imageSmoothingQuality = 'high';
    g.drawImage(this.vignette, 0, 0, W, H);
    const fr = Math.floor(t * 18);
    g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.16;
    const tile = this.grainTiles[((fr % 3) + 3) % 3], ox = Math.floor(hash(fr) * 256), oy = Math.floor(hash(fr + 99) * 256), gs = Math.max(1, Math.round(this.dpr * 0.9)) * 256;
    for (let y = -oy * gs / 256; y < H; y += gs) for (let x = -ox * gs / 256; x < W; x += gs) g.drawImage(tile, x, y, gs, gs);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    if (S.fade > 0.003) { g.fillStyle = `rgba(6,4,5,${S.fade})`; g.fillRect(0, 0, W, H); }
    this.lastT = t;
  }

  // Fire: a glow, three wobbling paper tongues, and embers climbing into the dark.
  fire(g, em, t) {
    const u = this.eu, [x, y, rel] = this.place(em.layer || 'main', em.a, em.h || 0, t);
    g.setTransform(1, 0, 0, 1, 0, 0);
    const flick = 0.86 + 0.14 * fbm(t * 7.3, 60) + 0.05 * Math.sin(t * 31);
    if (em.ember > 0.01) { // the carried ember on the end of the stick
      const [ex, ey] = this.place('main', em.emberPos.a, em.emberPos.h, t), r = (10 + em.ember * 26) * u;
      g.globalCompositeOperation = 'screen';
      const gr = g.createRadialGradient(ex, ey, 0, ex, ey, r);
      gr.addColorStop(0, `rgba(255,214,150,${Math.min(1, 0.55 + em.ember * 0.5)})`); gr.addColorStop(0.16, `rgba(255,128,48,${0.6 * Math.min(1, em.ember + 0.3)})`); gr.addColorStop(1, 'rgba(255,90,20,0)');
      g.fillStyle = gr; g.fillRect(ex - r, ey - r, r * 2, r * 2);
    }
    const lit = em.lit;
    if (lit > 0.002) {
      g.globalCompositeOperation = 'screen';
      for (const [rad, al, col] of [[560, 0.16, '255,150,70'], [210, 0.36, '255,170,80'], [80, 0.55, '255,214,140']]) {
        const r = rad * u * (0.35 + 0.65 * lit) * flick, yy = y - 26 * u * lit;
        const gr = g.createRadialGradient(x, yy, 0, x, yy, r);
        gr.addColorStop(0, `rgba(${col},${al * lit * flick})`); gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr; g.fillRect(x - r, yy - r, r * 2, r * 2);
      }
      g.globalCompositeOperation = 'source-over';
      g.save(); g.translate(x, y); g.rotate(rel); g.scale(u * (em.scale || 1), u * (em.scale || 1));
      this.flames.forEach((f, i) => {
        g.save();
        g.translate([-2, 3, 0][i] + fbm(t * 2.2 + i * 9, 70) * 2.5, -3);
        g.rotate((fbm(t * 3.4 + i * 5.1, 71) * 10 + Math.sin(t * 11 + i * 2) * 2.5) * DEG);
        const grow = clamp(lit * 1.25 - i * 0.12) ;
        g.scale(grow * (1 + fbm(t * 4.1 + i * 3, 72) * 0.1), grow * (1 + fbm(t * 5.7 + i * 7, 73) * 0.24 + Math.sin(t * 17 + i) * 0.04));
        put(g, f, 0);
        g.restore();
      });
      g.restore();
      // hot core over the tongues
      g.globalCompositeOperation = 'screen';
      const r = 46 * u * lit * flick, gr = g.createRadialGradient(x, y - 14 * u, 0, x, y - 14 * u, r);
      gr.addColorStop(0, `rgba(255,236,170,${0.6 * lit})`); gr.addColorStop(1, 'rgba(255,190,90,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - 14 * u - r, r * 2, r * 2);
      // embers
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 44; i++) {
        const per = 2.6 + hash(i * 3 + 1) * 3.4, ph = hash(i * 7 + 2) * per, age = ((t + ph) % per) / per;
        const born = t - age * per; if (born < em.litAt) continue;
        const strength = clamp((born - em.litAt) / 4) * lit;
        const rise = (60 + hash(i * 11) * 330) * Math.pow(age, 0.82), dx = (hash(i * 13) - 0.5) * 30 + Math.sin(age * (5 + hash(i) * 6) + i) * (10 + age * 26) + age * age * 60 * (hash(i * 5) - 0.35);
        const px = x + (dx * Math.cos(rel) + rise * Math.sin(rel)) * u, py = y - 18 * u + (dx * Math.sin(rel) - rise * Math.cos(rel)) * u;
        const al = Math.min(1, age * 9) * Math.pow(1 - age, 1.6) * strength * (0.6 + 0.4 * Math.sin(t * 9 + i));
        const sz = (0.9 + hash(i * 17) * 1.5) * u * (1 - age * 0.5);
        g.fillStyle = `rgba(255,${(200 - age * 110) | 0},${(120 - age * 100) | 0},${al})`;
        g.beginPath(); g.arc(px, py, sz, 0, 7); g.fill();
        g.fillStyle = `rgba(255,140,50,${al * 0.18})`; g.beginPath(); g.arc(px, py, sz * 3.6, 0, 7); g.fill();
      }
    }
    g.globalCompositeOperation = 'source-over';
  }
}

// A Sheet that can come out slightly out of focus (distant and very near layers).
class BlurSheet extends Sheet {
  constructor(name, box, scale, o, blur, tint = 0) { super(name, box, scale, o); this.blurAmt = blur; this.tint = tint; }
  finish(o = {}) {
    if (this.tint) { const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(44,28,18,${this.tint})`; g.fillRect(0, 0, this.c.width, this.c.height); }
    return super.finish({ ...o, blur: this.blurAmt > 0.05 ? this.blurAmt : 0 });
  }
}
