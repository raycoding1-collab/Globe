// The soundtrack is one mixed file (voice, score, ambience) and it is the clock:
// the picture follows the sound. Paper flaps are played live, because when a
// cut-out springs up depends on the shape of the screen.
export class Sound {
  constructor(src, duration) {
    this.duration = duration;
    this.el = new Audio(); this.el.preload = 'auto';
    this.ready = fetch(src).then((r) => { if (!r.ok) throw 0; return r.blob(); }).then((b) => { this.el.src = URL.createObjectURL(b); }).catch(() => { this.el.src = src; });
    this.el.addEventListener('error', () => { this.broken = true; });
    this.el.addEventListener('ended', () => { this.ended = true; this.paused = true; });
    this.paused = true; this.ended = false; this.vol = 1;
    this.anchorT = 0; this.anchorNow = 0; this.lastFlap = 0;
  }
  async start() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      this.ac = new AC(); this.out = this.ac.createGain(); this.out.gain.value = 0.5; this.out.connect(this.ac.destination);
      this.flaps = [0, 1, 2, 3, 4, 5].map((k) => makeFlap(this.ac, k));
      if (this.ac.state === 'suspended') this.ac.resume();
    }
    this.paused = false; this.anchorNow = performance.now();
    if (!this.el.src) await this.ready;
    try { await this.el.play(); } catch (e) { this.broken = true; }
  }
  // Film time in seconds. Follows the audio element, smoothed with the frame clock.
  time(now) {
    if (this.broken) {
      if (!this.paused) this.anchorT = Math.min(this.duration, this.anchorT + (now - this.anchorNow) / 1000);
      this.anchorNow = now; return this.anchorT;
    }
    const a = this.el.currentTime;
    if (this.paused || this.el.paused) { this.anchorT = a; this.anchorNow = now; return a; }
    let t = this.anchorT + (now - this.anchorNow) / 1000;
    if (Math.abs(t - a) > 0.12) t = a; else t += (a - t) * 0.04;
    this.anchorT = t; this.anchorNow = now;
    return t;
  }
  toggle() {
    this.paused = !this.paused; this.anchorNow = performance.now();
    if (this.broken) return;
    this.paused ? this.el.pause() : this.el.play().catch(() => {});
    if (this.ac) this.paused ? this.ac.suspend() : this.ac.resume();
  }
  seek(t) {
    this.ended = false; this.paused = false; this.anchorT = t; this.anchorNow = performance.now();
    if (!this.broken) { this.el.currentTime = t; this.el.play().catch(() => {}); }
    if (this.ac) this.ac.resume();
  }
  volume(v) { this.vol = v; this.el.volume = v; if (this.out) this.out.gain.value = 0.5 * v; }
  flap(pan, layer, loud = 1) {
    if (!this.ac || this.paused) return;
    const now = this.ac.currentTime;
    if (now - this.lastFlap < 0.05) return; // a crowd of cut-outs should rustle, not rattle
    this.lastFlap = now;
    const ac = this.ac, s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = this.flaps[(Math.random() * this.flaps.length) | 0];
    const far = layer === 'far' ? 0.2 : layer === 'mid' ? 0.4 : layer === 'front' ? 0.6 : 1;
    s.playbackRate.value = (0.85 + Math.random() * 0.4) * (layer === 'far' ? 1.3 : 1) / Math.sqrt(Math.max(0.5, loud));
    g.gain.value = Math.min(1.1, 0.5 * far * loud * (0.75 + Math.random() * 0.4));
    let node = g;
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan * 0.8)); g.connect(p); node = p; }
    s.connect(g); node.connect(this.out); s.start();
  }
}

// A soft card flap: a papery brush of noise, a tick as the fold snaps, a small thump of air.
function makeFlap(ac, k) {
  const sr = ac.sampleRate, n = Math.floor(sr * 0.24), buf = ac.createBuffer(1, n, sr), d = buf.getChannelData(0);
  let seed = 1234 + k * 977; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  let lp = 0, lp2 = 0, hp = 0;
  const snap = 0.04 + k * 0.01;
  for (let i = 0; i < n; i++) {
    const t = i / sr, w = rnd();
    lp += (w - lp) * 0.42; lp2 += (lp - lp2) * 0.12; hp = lp - lp2;
    const brush = Math.min(1, t / 0.012) * Math.exp(-t / 0.05) * 0.55;
    const tick = t > snap ? Math.exp(-(t - snap) / 0.012) * 0.9 : 0;
    const thump = Math.sin(6.283 * (150 - t * 420) * t) * Math.exp(-t / 0.035) * 0.35;
    d[i] = hp * (brush + tick) + thump;
  }
  return buf;
}
