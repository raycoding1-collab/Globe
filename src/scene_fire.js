// Style scene: the first fire. One place, one evening, about a million years ago.
import { monotone, track, noise, fbm, smooth, sramp, clamp, spring, hash, rng, lerp } from './util.js';
import { KINDS } from './cutouts.js';

export const T = { reach: 18.6, blows: [20.6, 21.8, 23.0], lit: 23.6, gazelleUp: 49.2, pop: 52.5, end: 66 };

const cam = monotone([[0, -64], [4, -45], [9, -22], [13, -9.5], [17, -3.2], [30, -0.9], [64, 3.2], [90, 9], [400, 40]]);

const mesas = [[-96, 22, 30], [-52, 16, 44], [-24, 30, 26], [30, 34, 58], [44, 12, 30], [84, 18, 36], [118, 24, 44]];
const profile = {
  far: (a) => { let h = noise(a * 0.07, 5) * 14 + noise(a * 0.31, 6) * 4 + 8; for (const [c, w, hh] of mesas) h += hh * smooth(clamp((w / 2 - Math.abs(a - c)) / 7)) * (1 + noise(a * 0.9, 9) * 0.05); return h; },
  mid: (a) => noise(a * 0.33, 3) * 8 + noise(a * 0.1, 4) * 13,
  main: (a) => noise(a * 0.9, 1) * 1.6 + noise(a * 0.21, 2) * 3.5,
  front: (a) => noise(a * 0.5, 7) * 4 + noise(a * 0.13, 17) * 6,
  core: (a) => noise(a * 0.2, 8) * 8,
};

const E = [], PS = 1.3; // people are drawn a little larger than life: they are the subject
const add = (kind, layer, a, o = {}) => E.push({ kind, layer, a, ...o });
// the band and their fire
add('elder', 'main', -8.4, { z: 2, delay: 0.1, scale: PS });
add('tender', 'main', -3.9, { z: 2, delay: 0.5, scale: PS });
add('logs', 'main', 0, { z: 2, delay: 0.75, wob: 0.4, scale: PS });
add('sitter', 'main', 4.6, { z: 2, flip: true, delay: 0.9, scale: PS });
add('child', 'main', 8.3, { z: 2, flip: true, delay: 1.25, scale: PS });
add('gazelle', 'main', 20.5, { z: 2, flip: true, popAt: T.gazelleUp, foldAt: T.pop + 0.12, alert: (t) => 0.25 + 0.75 * sramp(t, T.gazelleUp + 0.9, T.gazelleUp + 1.5) });
// trees
add('acacia', 'main', -47, { v: 2, z: 0 });
add('acacia', 'main', -17.5, { v: 0, z: 0 });
add('acacia', 'main', 14.2, { v: 1, z: 0, flip: true });
add('acacia', 'main', 46, { v: 2, z: 0 });
for (const [a, v, s, f] of [[-58, 1, 0.6, 0], [-33, 0, 0.5, 1], [-14.5, 2, 0.56, 0], [29, 1, 0.62, 1], [55, 0, 0.5, 0]]) add('acacia', 'mid', a, { v, scale: s, flip: !!f });
for (const [a, v, s] of [[-70, 0, 0.3], [-40, 2, 0.26], [-4, 1, 0.3], [48, 0, 0.28], [88, 2, 0.3]]) add('acacia', 'far', a, { v, scale: s });
// rocks and grass
for (const [a, v] of [[-52, 0], [-28.5, 1], [-10.2, 2], [9.4, 0], [25, 1], [38, 2]]) add('rock', 'main', a, { v, z: 1 });
{
  const r = rng(5);
  for (let a = -72; a < 56; a += 2.2 + r() * 3.6) { if (Math.abs(a) < 2.8) continue; add('grass', 'main', a, { v: (r() * 6) | 0, z: r() < 0.5 ? 1 : 3, flip: r() < 0.5, scale: 0.8 + r() * 0.5 }); }
  for (let a = -80; a < 70; a += 5 + r() * 7) add('grass', 'mid', a, { v: (r() * 6) | 0, scale: 0.7 });
  for (let a = -60; a < 50; a += 3.5 + r() * 6) add('grass', 'front', a, { v: (r() * 6) | 0, scale: 1.7 + r() * 0.9, flip: r() < 0.5 });
}
E.sort((p, q) => (p.z || 0) - (q.z || 0) || p.a - q.a);
const byLayer = {};
for (const e of E) (byLayer[e.layer] ||= []).push(e);
const tender = E.find((e) => e.kind === 'tender');

const skyK = track([
  [0, ['#34406c', '#80628a', '#dc8c62', '#f6b76a']],
  [6, ['#262f5a', '#57497c', '#b0627a', '#e08f5e']],
  [11, ['#141b3c', '#27294f', '#4f3d63', '#8a5a62']],
  [16, ['#0c1230', '#131c42', '#1e2a56', '#35426e']],
  [30, ['#0a102b', '#11193c', '#1a2650', '#2e3a66']],
]);
const ambK = track([[0, [244, 214, 196]], [6, [176, 150, 164]], [11, [96, 98, 138]], [16, [58, 70, 114]], [30, [48, 60, 104]]]);
const moteK = track([[0, [255, 222, 170]], [12, [150, 170, 225]], [22, [150, 170, 225]], [28, [255, 190, 120]]]);
const GROUND = { far: [150, 128, 138], mid: [170, 140, 96], main: [201, 158, 92], front: [134, 100, 60], core: [92, 68, 46] };

function fireState(t) {
  let blow = 0;
  for (const b of T.blows) blow += Math.exp(-(((t - b - 0.3) / 0.3) ** 2));
  const dt = t - T.lit;
  let lit = dt > 0 ? (1 - Math.exp(-dt / 1.7)) * (1 + 0.1 * Math.exp(-((dt - 3.4) ** 2) / 2)) : 0;
  if (t > T.pop) lit *= 1 + 0.42 * Math.exp(-(t - T.pop) * 3.2);
  return { reach: sramp(t, T.reach, T.reach + 1.5), blow: Math.min(1.2, blow), lit, litAt: T.lit };
}

function state(t) {
  const fire = fireState(t), lights = [], emitters = [];
  const up = clamp(spring(t - tender.tPop, 10.5, 0.46));
  const tip = KINDS.tender.tip(t, fire);
  const emberPos = { a: tender.a + tip[0] * PS / 17.453, h: -tip[1] * PS * up };
  const ember = up * (0.3 + 0.1 * Math.sin(t * 2.3) + fire.blow * 0.75) * (1 - 0.6 * clamp(fire.lit * 1.5));
  const flick = 0.84 + 0.16 * fbm(t * 7.3, 60) + 0.05 * Math.sin(t * 31);
  lights.push({ a: emberPos.a, h: emberPos.h, r: 150 + fire.blow * 160, k: ember * 0.8, color: [255, 130, 60] });
  if (fire.lit > 0) lights.push({ a: 0, h: 34, r: 500 + 620 * Math.min(1.15, fire.lit), k: Math.min(1.3, fire.lit * 1.3) * flick, color: [255, 158, 80] });
  emitters.push({ a: 0, h: 5, scale: PS * 1.25, lit: Math.min(1.3, fire.lit), litAt: T.lit, ember, emberPos });
  const dSun = sramp(t, 0, 11);
  return {
    fire, lights, emitters,
    sky: skyK(t), ambient: ambK(t), ground: GROUND,
    stars: sramp(t, 8, 18),
    sun: t < 13 ? { x: -430, y: lerp(-78, 170, dSun), k: 1 - sramp(t, 4, 11) } : null,
    moon: { x: 0.21, y: lerp(-0.12, 0.17, clamp(spring(t - 12.5, 2.6, 0.5), 0, 1.3)), k: 1, swing: 1 + 3 * Math.exp(-Math.max(0, t - 12.5) / 4) },
    motes: lerp(0.5, 0.3, sramp(t, 4, 14)) + 0.3 * clamp(fire.lit), moteColor: moteK(t),
    fade: 1 - sramp(t, 0.1, 3.4),
    zoom: lerp(1, 1.3, smooth(clamp((t - 6) / 20))),
  };
}

const clouds = [
  { v: 0, x: -520, yf: 0.72, s: 1, par: 2.2, drift: 3.0 },
  { v: 1, x: 260, yf: 0.84, s: 0.8, par: 1.6, drift: 2.2 },
  { v: 2, x: 820, yf: 0.6, s: 1.1, par: 2.6, drift: 3.6 },
  { v: 3, x: -1050, yf: 0.9, s: 0.7, par: 1.4, drift: 1.8 },
];

export const film = { duration: T.end, cam, state, entities: E, byLayer, profile, clouds, T };
