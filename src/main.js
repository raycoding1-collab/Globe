import { Stage } from './engine.js';
import { film } from './scene_fire.js';
import { CUES } from './cues.js';
import { Sound } from './sound.js';

const $ = (id) => document.getElementById(id);
const canvas = $('stage'), stage = new Stage(canvas, film);
const params = new URLSearchParams(location.search);
const sound = new Sound('assets/audio/fire.mp3');
stage.onFlap = (pan, layer, loud) => sound.flap(pan, layer, loud);

let started = false, idleT = 0;
const frozen = params.has('t') ? parseFloat(params.get('t')) : null;

// captions
const cap = $('caption'); let capOn = true, capText = '';
function captions(t) {
  let text = '';
  for (const c of CUES) for (const l of c.lines) if (t >= l.t0 && t < l.t1) text = l.text;
  if (text !== capText) {
    if (text) { cap.textContent = text; cap.classList.add('on'); } else cap.classList.remove('on');
    capText = text;
  }
}

let rz = 0;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { stage.lastT = -1; stage.resize(); if (frozen !== null) stage.render(frozen); }, 120); });

function frame(now) {
  let t;
  if (frozen !== null) t = frozen;
  else if (!started) { idleT = now / 1000; t = 13.2 + Math.sin(idleT * 0.05) * 0.4; } // a quiet, living frame behind the title
  else t = sound.time(now);
  stage.render(t);
  if (started) captions(t);
  if (frozen === null) requestAnimationFrame(frame);
  else window.__ready = true;
}
window.__renderAt = (t) => { stage.lastT = -1; stage.render(t); };
(document.fonts?.ready || Promise.resolve()).then(() => requestAnimationFrame(frame));

// controls: begin, pause, captions, volume -- and nothing else
const bar = $('bar'); let hideTimer = 0;
function wake() { if (!started) return; bar.classList.add('show'); clearTimeout(hideTimer); hideTimer = setTimeout(() => bar.classList.remove('show'), 2600); }
addEventListener('pointermove', wake); addEventListener('pointerdown', wake); addEventListener('keydown', wake);
const setIcon = () => { $('playIcon').setAttribute('d', sound.paused ? 'M8 5v14l11-7z' : 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z'); $('play').setAttribute('aria-label', sound.paused ? 'Play' : 'Pause'); };
function toggle() { if (!started) return; sound.ended ? sound.restart() : sound.toggle(); stage.lastT = -1; setIcon(); }
$('begin').addEventListener('click', async () => {
  await sound.start(); started = true; stage.lastT = -1;
  $('veil').classList.add('gone'); wake();
});
$('play').addEventListener('click', toggle);
canvas.addEventListener('click', () => { if (matchMedia('(hover: hover)').matches) toggle(); else wake(); });
addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); started ? toggle() : $('begin').click(); } });
$('cc').addEventListener('click', () => { capOn = !capOn; $('cc').setAttribute('aria-pressed', capOn); cap.classList.toggle('off', !capOn); });
$('vol').addEventListener('input', (e) => sound.volume(+e.target.value));
document.addEventListener('visibilitychange', () => { if (document.hidden && started && !sound.paused) { sound.toggle(); setIcon(); } });
