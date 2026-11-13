// The soundtrack is one mixed file (voice, score, ambience) and it is the clock:
// the picture follows the sound. Paper flaps are played live, because when a
// cut-out springs up depends on the shape of the screen.
export class Sound {
  constructor(src) {
    this.el = new Audio(); this.el.preload = 'auto';
    // load the whole track up front so it can never stall mid-film
    this.ready = fetch(src).then((r) => { if (!r.ok) throw 0; return r.blob(); }).then((b) => { this.el.src = URL.createObjectURL(b); }).catch(() => { this.el.src = src; });
    this.el.addEventListener('error', () => { this.broken = true; });
    this.el.addEventListener('ended', () => { this.ended = true; this.tailFrom = performance.now(); this.tailT = this.el.duration; });
    this.paused = true; this.ended = false; this.vol = 1;
    this.anchorT = 0; this.anchorNow = 0; this.wall0 = 0;
  }
  async start() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      this.ac = new AC(); this.out = this.ac.createGain(); this.out.gain.value = 0.5; this.out.connect(this.ac.destination);
      this.flaps = [0, 1, 2, 3].map((k) => makeFlap(this.ac, k));
      if (this.ac.state === 'suspended') this.ac.resume();
    }
    this.paused = false; this.wall0 = performance.now();
    const playing = this.el.src ? this.el.play() : this.ready.then(() => this.el.play());
    try { await playing; } catch (e) { this.broken = true; }
  }
  // Film time in seconds. Follows the audio element, smoothed with the frame clock.
  time(now) {
    if (this.broken) return this.paused ? this.anchorT : (this.anchorT = this.anchorT + (now - (this.anchorNow || now)) / 1000, this.anchorNow = now, this.anchorT);
    if (this.ended) return this.tailT + (this.paused ? 0 : (now - this.tailFrom) / 1000);
    const a = this.el.currentTime;
    if (this.paused || this.el.paused) { this.anchorT = a; this.anchorNow = now; return a; }
    let t = this.anchorT + (now - this.anchorNow) / 1000;
    if (Math.abs(t - a) > 0.1) { t = a; }
    else t += (a - t) * 0.04;
    this.anchorT = t; this.anchorNow = now;
    return t;
  }
  toggle() {
    this.paused = !this.paused;
    if (this.broken) { this.anchorNow = 0; return; }
    if (this.ended) { this.tailT += this.paused ? (performance.now() - this.tailFrom) / 1000 : 0; this.tailFrom = performance.now(); return; }
    this.paused ? this.el.pause() : this.el.play();
    if (this.ac) this.paused ? this.ac.suspend() : this.ac.resume();
  }
  restart() { this.ended = false; this.paused = false; this.el.currentTime = 0; this.anchorT = 0; this.anchorNow = performance.now(); this.el.play(); if (this.ac) this.ac.resume(); }
  volume(v) { this.vol = v; this.el.volume = v; if (this.out) this.out.gain.value = 0.5 * v; }
  flap(pan, layer, loud = 1) {
    if (!this.ac || this.paused) return;
    const ac = this.ac, s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = this.flaps[(Math.random() * this.flaps.length) | 0];
    const far = layer === 'far' ? 0.22 : layer === 'mid' ? 0.45 : layer === 'front' ? 0.7 : 1;
    s.playbackRate.value = (0.85 + Math.random() * 0.4) * (layer === 'far' ? 1.3 : 1);
    g.gain.value = 0.55 * far * loud * (0.75 + Math.random() * 0.4);
    let node = g;
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan * 0.8)); g.connect(p); node = p; }
    s.connect(g); node.connect(this.out); s.start();
  }
}

// A soft card flap: a papery brush of noise, a tick as the fold snaps, a small thump of air.
function makeFlap(ac, k) {
  const sr = ac.sampleRate, n = Math.floor(sr * 0.22), buf = ac.createBuffer(1, n, sr), d = buf.getChannelData(0);
  let seed = 1234 + k * 977; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  let lp = 0, lp2 = 0, hp = 0;
  const snap = 0.045 + k * 0.012;
  for (let i = 0; i < n; i++) {
    const t = i / sr, w = rnd();
    lp += (w - lp) * 0.42; lp2 += (lp - lp2) * 0.12; hp = lp - lp2; // band of roughly 1-5 kHz
    const brush = Math.min(1, t / 0.012) * Math.exp(-t / 0.05) * 0.55;
    const tick = t > snap ? Math.exp(-(t - snap) / 0.012) * 0.9 : 0;
    const thump = Math.sin(6.283 * (150 - t * 420) * t) * Math.exp(-t / 0.035) * 0.35;
    d[i] = hp * (brush + tick) + thump;
  }
  return buf;
}
