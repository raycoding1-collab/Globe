// The whole film: where everything stands on the globe, how the light and the
// sky change, and the special moments. Times come from src/timeline.js, which
// is generated from film/film.json together with the narration.
import { monotone, track, noise, fbm, smooth, sramp, clamp, spring, hash, rng, lerp, mix, shade, rgb, DEG } from './util.js';
import { put } from './paper.js';
import { KINDS } from './cutouts.js';
import { LOOKS } from './people.js';
import './kinds_nature.js';
import './kinds_built.js';
import './kinds_modern.js';
import { bakeFx, drawMark, TABLET_MARKS } from './sky.js';
import { BlurSheet } from './engine.js';
import { EV, DURATION } from './timeline.js';

LOOKS.sahel = { skin: 0, top: 'tunic', topCol: '#c99a4a', hair: 'curly', pose: 'stand', item: 'basket' };
LOOKS.wheelwright.pose = 'walk';

// ------------------------------------------------------------------ camera --
const cam = monotone([
  [0, -64], [4, -45], [9, -22], [13, -9.5], [17, -3.2], [30, -0.9], [46, 2.2], [50, 6], [53, 20], [56, 48], [58.4, 62], [62, 76], [64.5, 96], [68, 120], [70, 138], [73, 148], [76, 158], [78.5, 178], [81, 186], [90, 191],
  [92, 206], [95.2, 216], [99, 224], [102, 233], [105, 246], [107.8, 258], [110.1, 268], [112.7, 279], [116, 290], [121, 300],
  [124, 322], [127, 332], [134, 338], [150, 346], [161, 355], [166, 361],
  [171, 384], [175, 398], [179, 410], [183, 422], [186.5, 434], [190, 450], [193, 478], [196, 503], [204, 512], [207, 540],
  [209.5, 562], [212, 570], [216, 576], [220, 582], [224.5, 592],
  [226.5, 612], [230, 619.5], [236, 624.5], [240, 634], [245, 646],
  [248, 668], [252, 680], [258, 694], [264, 703], [271, 712],
  [274, 742], [277, 746], [283, 750], [289, 758],
  [292, 788], [296, 793], [301, 800], [305.5, 808], [310, 817], [314, 826],
  [317, 846], [321, 856], [325, 864], [328, 875], [333, 883], [338, 891], [342, 899], [347, 905], [351, 912],
  [354, 917], [358, 921.5], [362, 927], [366, 936], [371, 947], [376, 957],
  [379, 972], [382, 976], [385, 982], [388, 990], [392, 997], [396, 1005], [400, 1010], [404, 1016], [408, 1022], [412, 1029], [416, 1034],
  [419, 1042], [422, 1049], [426, 1058], [430, 1067], [434, 1077], [437.5, 1086],
  [441, 1098], [448, 1112], [458, 1126], [472, 1140], [600, 1280],
]);

// ------------------------------------------------- paint and shape of land --
const ZONES = [
  [-200, 50, [201, 158, 92]], [57, 94, [198, 160, 98]], [101, 131, [214, 208, 194]], [137, 159, [62, 104, 138]], [163, 175, [178, 118, 84]],
  [179, 204, [150, 122, 96]], [211, 300, [150, 150, 84]], [306, 372, [204, 170, 118]], [378, 458, [214, 182, 124]], [463, 549, [44, 86, 126]],
  [556, 605, [114, 138, 86]], [611, 659, [192, 156, 104]], [665, 689, [52, 96, 132]], [694, 726, [108, 140, 80]], [734, 778, [98, 114, 90]],
  [784, 836, [126, 134, 104]], [842, 912, [116, 100, 88]], [917, 966, [96, 92, 98]], [970, 985, [188, 168, 126]], [988, 1014, [112, 108, 104]],
  [1016, 1034, [126, 130, 124]], [1040, 1049, [52, 100, 136]], [1052, 1059, [132, 128, 120]], [1061, 1073, [120, 150, 80]], [1075, 1090, [124, 124, 128]], [1095, 9999, [204, 170, 124]],
];
const SEAS = [[137, 159], [463, 549], [665, 689], [1040, 1049]];
function zoneColor(a) {
  for (let i = 0; i < ZONES.length; i++) {
    const [a0, a1, c] = ZONES[i];
    if (a <= a1) {
      if (a >= a0 || i === 0) return c;
      const p = ZONES[i - 1];
      return mix(p[2], c, smooth((a - p[1]) / (a0 - p[1])));
    }
  }
  return ZONES[ZONES.length - 1][2];
}
const water = (a) => { let w = 0; for (const [a0, a1] of SEAS) w = Math.max(w, sramp(a, a0 - 2, a0 + 1) * (1 - sramp(a, a1 - 1, a1 + 2))); return w; };
const SNOW = (a) => sramp(a, 96, 102) * (1 - sramp(a, 131, 136));
function ground(layer, a) {
  const c = zoneColor(a), w = water(a);
  if (layer === 'main') return c;
  if (layer === 'mid') return w > 0.5 ? mix(c, [70, 110, 140], 0.3) : mix(shade(c, 0.06), [196, 186, 172], 0.16);
  if (layer === 'far') return w > 0.5 ? [90, 120, 150] : mix(mix(c, [150, 140, 162], 0.55), [228, 230, 236], SNOW(a) * 0.7);
  if (layer === 'front') return shade(c, w > 0.5 ? -0.25 : -0.32);
  return shade(c, -0.55);
}
const mesas = [[-96, 22, 30], [-52, 16, 44], [-24, 30, 26], [30, 34, 58], [44, 12, 30], [84, 18, 36]];
const peaks = [[104, 7, 110], [112, 6, 80], [121, 8, 130], [129, 6, 90]];
const profile = {
  far: (a) => {
    const land = 1 - water(a);
    let h = (noise(a * 0.07, 5) * 14 + noise(a * 0.31, 6) * 4 + 10) * land;
    for (const [c, w, hh] of mesas) h += hh * smooth(clamp((w / 2 - Math.abs(a - c)) / 7));
    for (const [c, w, hh] of peaks) h += hh * clamp(1 - Math.abs(a - c) / w) ** 1.3;
    h += sramp(a, 556, 570) * (1 - sramp(a, 600, 610)) * (noise(a * 0.2, 31) * 20 + 22);
    h += sramp(a, 734, 740) * (1 - sramp(a, 772, 778)) * 30;
    h += sramp(a, 611, 618) * (1 - sramp(a, 654, 660)) * (noise(a * 0.3, 33) * 22 + 34);
    h += sramp(a, 971, 975) * (1 - sramp(a, 982, 986)) * (noise(a * 0.6, 35) * 10 + 14);
    return h;
  },
  mid: (a) => (1 - water(a)) * (noise(a * 0.33, 3) * 8 + noise(a * 0.1, 4) * 13) - water(a) * 6,
  main: (a) => (1 - water(a)) * (noise(a * 0.9, 1) * 1.6 + noise(a * 0.21, 2) * 3.5) - water(a) * 4,
  front: (a) => noise(a * 0.5, 7) * 4 + noise(a * 0.13, 17) * 6,
  core: (a) => noise(a * 0.2, 8) * 8,
};

// --------------------------------------------------------------- cut-outs --
const E = [];
const add = (kind, layer, a, o = {}) => { const e = { kind, layer, a, ...o }; E.push(e); return e; };
const PS = 1.3, P2 = 1.2;
const after = (t0) => (t) => t >= t0;

// 1. Fire ---------------------------------------------------------------
add('elder', 'main', -8.4, { z: 2, delay: 0.1, scale: PS });
const tender = add('tender', 'main', -3.9, { z: 2, delay: 0.5, scale: PS });
add('logs', 'main', 0, { z: 2, delay: 0.75, wob: 0.4, scale: PS });
add('sitter', 'main', 4.6, { z: 2, flip: true, delay: 0.9, scale: PS });
add('child', 'main', 8.3, { z: 2, flip: true, delay: 1.25, scale: PS });
add('gazelle', 'main', 11.4, { z: 2, flip: true, popAt: EV.gazelleUp, foldAt: EV.pop + 0.12, alert: (t) => 0.25 + 0.75 * sramp(t, EV.gazelleUp + 0.9, EV.gazelleUp + 1.5) });
for (const [a, v, f] of [[-47, 2, 0], [-17.5, 0, 0], [16.5, 1, 1], [46, 2, 0], [72, 0, 0], [86, 1, 1]]) add('acacia', 'main', a, { v, z: 0, flip: !!f });
for (const [a, v, s, f] of [[-58, 1, 0.6, 0], [-33, 0, 0.5, 1], [-14.5, 2, 0.56, 0], [29, 1, 0.62, 1], [55, 0, 0.5, 0], [78, 2, 0.55, 1], [92, 1, 0.5, 0]]) add('acacia', 'mid', a, { v, scale: s, flip: !!f });
for (const [a, f] of [[-27, 0], [-21.5, 1], [24, 1], [37, 0]]) add('gazelle', 'mid', a, { scale: 0.8, flip: !!f, alert: (t) => 0.95 - 0.7 * Math.max(0, Math.sin(t * 0.35 + a)) ** 6 });
for (const [a, v, s] of [[-70, 0, 0.3], [-40, 2, 0.26], [-4, 1, 0.3], [48, 0, 0.28], [88, 2, 0.3], [150, 1, 0.3], [170, 0, 0.28]]) add('acacia', 'far', a, { v, scale: s });
// giraffes and elephants walking the far horizon into the sunset
for (const [k, a, s, p] of [['giraffe', -52, 0.62, 1.5], ['giraffe', -46.5, 0.5, 1.6], ['elephant', -30, 0.62, 1.2], ['elephant', -26, 0.4, 1.3], ['giraffe', 2, 0.56, 1.4]]) add(k, 'far', a, { scale: s, pace: p, y: k === 'elephant' ? -8 : -26, move: (t) => -t * 0.22 });
for (const [a, v] of [[-52, 0], [-28.5, 1], [-10.2, 2], [9.4, 0], [25, 1], [38, 2], [64, 1], [80, 0], [170, 2], [176, 1]]) add('rock', 'main', a, { v, z: 1 });
const R = rng(5);
function grassRun(a0, a1, step, layer, o = {}) { for (let a = a0; a < a1; a += step * (0.7 + R() * 0.8)) { if (o.skip && o.skip(a)) continue; add('grass', layer, a, { v: (R() * 6) | 0, z: R() < 0.5 ? 1 : 3, flip: R() < 0.5, scale: (o.s || 1) * (0.8 + R() * 0.5), loud: 0.25 }); } }
grassRun(-72, 96, 3.6, 'main', { skip: (a) => Math.abs(a) < 2.8 });
grassRun(-80, 98, 8, 'mid', { s: 0.7 });
grassRun(-60, 96, 6, 'front', { s: 2.0 });

// 2. Walking out of Africa -------------------------------------------------
['walkA', 'walkB', 'walkC', 'walkD'].forEach((v, i) => add('person', 'main', 0, { v, scale: P2, z: 3, from: EV.walk + i * 0.2, to: EV.raft - 0.45 + i * 0.08, pace: 7.2, move: (t) => cam(t) + [-6.5, -2.8, 0.4, 3.6][i] }));
add('fossil', 'main', 66, { over: true, y: -3, popAt: EV.walk - 1.2, loud: 0.8 });
add('raft', 'main', 0, { z: 3, from: EV.raft, to: EV.land, move: (t) => cam(t) - 0.6, y: 19 });
for (let a = 103; a < 132; a += 5 + R() * 3) add('conifer', 'main', a, { v: (R() * 3) | 0, z: 0, scale: 0.8 + R() * 0.3 });
for (let a = 98; a < 136; a += 6) add('conifer', 'mid', a, { v: (R() * 3) | 0, scale: 0.55 });
add('mammoth', 'main', 116.5, { z: 2, scale: 0.95, flip: true });
add('mammoth', 'main', 125, { z: 1, scale: 0.7 });
grassRun(98, 132, 4, 'main', { s: 0.8 });
for (let a = 136; a < 161; a += 4.2) add('wave', 'main', a, { v: (R() * 4) | 0, z: 4, loud: 0.3, ground: false, y: -2 });
for (let a = 134; a < 162; a += 6) add('wave', 'front', a, { v: (R() * 4) | 0, scale: 1.6, ground: false, loud: 0.3 });
add('kangaroo', 'main', 168.5, { z: 2 });
add('kangaroo', 'main', 172, { z: 2, scale: 0.75 });
grassRun(163, 178, 3.5, 'main');

// 3. The cave and the hand --------------------------------------------------
const cave = add('cave', 'main', 188, { z: 0, popAt: 77.2 });
add('cavearch', 'main', 188, { z: 5, popAt: 77.0, loud: 1.5 });
add('torchpost', 'main', 193.2, { z: 1, popAt: 77.8, scale: 1.2 });
const blower = add('blower', 'main', 186.2, { z: 2, scale: P2, blowAt: EV.hand, popAt: 78.2 });
{
  // where the painter's hand rests on the rock (computed with the same joints the puppet uses)
  const m = new DOMMatrix().translate(0, -30.5).rotate(12).translate(2, -34.5).rotate(-150).translate(0, 19).rotate(-20);
  const p = m.transformPoint({ x: 0.5, y: 22 });
  blower.handAt = [p.x, p.y];
  const dx = (blower.a - cave.a) * DEG * 1000;
  cave.stencilAt = [dx + p.x * P2, p.y * P2];
}
grassRun(178, 206, 4, 'front', { s: 2 });

// 4. Farming -------------------------------------------------------------------
add('person', 'main', 214.6, { v: 'farmer', scale: P2, z: 2, act: (t) => ({ lean: 30 + Math.max(0, Math.sin((t - EV.seed) * 6)) * 6 * (t > EV.seed - 1 && t < EV.seed + 0.8), front: [-30, -10], back: [-20, -30] }) });
add('sprout', 'main', 216.2, { z: 3, grow: EV.seed + 0.9, scale: 1.4, popAt: EV.seed + 0.9, loud: 0.5 });
const crop = (kind, angles, t0, o = {}) => angles.forEach((a, i) => add(kind, 'main', a, { z: 1, popAt: t0 + i * 0.14, loud: 0.6, v: i % 3, ...o }));
crop('wheat', [226.6, 228.8, 231, 233.2, 235.4, 237.6], EV.crops[0], { scale: 1.6 });
add('person', 'main', 236.8, { v: 'farmer2', scale: P2, z: 2, popAt: EV.crops[0] + 0.5 });
crop('rice', [242, 244.6, 247.2], EV.crops[1], { scale: 1.45 });
crop('millet', [249.6, 251.6], EV.crops[1] + 0.45, { scale: 1.5 });
add('person', 'main', 245.4, { v: 'riceF', scale: P2, z: 2, popAt: EV.crops[1] + 0.3, act: (t) => ({ lean: 26, front: [-40, -20], back: [-30, -20] }) });
crop('maize', [255, 257.6, 260.2], EV.crops[2], { scale: 1.15 });
add('person', 'main', 258.8, { v: 'maizeF', scale: P2, z: 2, popAt: EV.crops[2] + 0.4 });
crop('potato', [265, 267.2, 269.4], EV.crops[3], { over: true, scale: 1.35 });
add('person', 'main', 268.3, { v: 'andean', scale: P2, z: 2, popAt: EV.crops[3] + 0.4 });
crop('sorghum', [276, 278.6, 281.2], EV.crops[4], { scale: 1.2 });
add('person', 'main', 279.6, { v: 'sahel', scale: P2, z: 2, popAt: EV.crops[4] + 0.4 });
for (const [a, v] of [[287, 0], [293.5, 1], [300, 0]]) add('hut', 'main', a, { v, z: 0 });
for (const a of [290.4, 296.8]) add('sheep', 'main', a, { v: (R() * 3) | 0, z: 2 });
for (let a = 212; a < 302; a += 9) add('oak', 'mid', a, { v: 3, scale: 0.5 });
for (const a of [222, 262, 292]) add('hut', 'mid', a, { v: 1, scale: 0.6 });
grassRun(208, 304, 3, 'main', { skip: (a) => a > 225 && a < 284 });
grassRun(206, 304, 7, 'front', { s: 2 });

// 5. Cities, writing and the wheel ---------------------------------------------
for (const [a, v] of [[309, 0], [314.5, 1], [320, 2], [326, 3], [351.5, 1], [357, 0], [368, 2]]) add('mudhouse', 'main', a, { v, z: 0 });
add('ziggurat', 'main', 341, { z: 0, popAt: EV.city, loud: 2.2, wide: 14, scale: 1.3 });
for (const a of [312, 331, 365.5]) add('palm', 'main', a, { v: 0, z: 1, scale: 0.9 });
add('person', 'main', 333.8, { v: 'sumer', scale: P2, z: 2 });
add('person', 'main', 336.4, { v: 'sumer2', scale: P2, z: 2, flip: true });
add('seat', 'main', 347.0, { z: 1.5, scale: P2 });
add('person', 'main', 347.2, { v: 'scribe', scale: P2, z: 2 });
// the street: bread ovens smoking on the roofs' edge, a market awning, people carrying the day's water and grain
for (const a of [317.2, 354.6]) add('oven', 'main', a, { z: 1, scale: 0.9 });
add('stall', 'main', 329.2, { v: 0, z: 1, scale: 1.55, popAt: EV.city + 0.5, loud: 0.8 });
add('person', 'main', 327.9, { v: 'seller', scale: P2, z: 0.8, popAt: EV.city + 0.8, act: (t) => ({ front: [-60 + Math.sin(t * 1.7) * 12, -50], head: Math.sin(t * 0.6) * 6 }) });
add('stall', 'main', 306.4, { v: 2, z: 1, scale: 1.45 });
add('person', 'main', 304.6, { v: 'jarW', scale: P2, z: 3, pace: 3.6, move: (t) => clamp((t - 116) * 0.26, 0, 30) });
add('person', 'main', 352.4, { v: 'porter', scale: P2, z: 3, pace: 3.9, flip: true, move: (t) => -clamp((t - 120) * 0.2, 0, 30) });
add('person', 'main', 310.2, { v: 'urukKid', scale: P2, z: 3, pace: 6.4, move: (t) => clamp((t - 117) * 0.3, 0, 30) });
for (const [a, v] of [[371.2, 3], [373.4, 4]]) add('sheep', 'main', a, { v, z: 2, scale: 0.85 });
for (let a = 302; a < 376; a += 2.9) add('mudhouse', 'far', a, { v: (R() * 4) | 0, scale: 0.5 });
// the first wheel gets away, rolling on ahead down the curve of the world
add('person', 'main', 358.4, { v: 'wheelwright', scale: P2, z: 4, popAt: EV.wheel - 0.3,
  move: (t) => clamp((t - EV.roll - 0.4) * 1.5, 0, 1.4),
  act: (t) => { const d = t - EV.roll, chase = d > 0.4 && d < 1.35, after = d >= 1.35; return { walk: chase ? t * 10 : undefined, lean: chase ? 16 : d > 0 ? 6 : 2, head: after ? 4 + Math.sin(t * 1.6) * 3 : d > 0 ? 8 : -6, front: after ? [-160, -70] : d > 0 ? [-95, -8] : [-35, -40], back: after ? [-160, -70] : chase ? [-40, -20] : [10, -10] }; } });
add('wheel', 'main', 360.4, { z: 5, popAt: EV.wheel, loud: 1.2, scale: 1.6, move: (t) => { const d = t - EV.roll; return d <= 0 ? 0 : 1.5 * d * d + 0.5 * d; } });
for (let a = 304; a < 372; a += 7) add(R() < 0.5 ? 'mudhouse' : 'palm', 'mid', a, { v: (R() * 4) | 0, scale: 0.55 });
grassRun(304, 372, 7, 'front', { s: 2 });

// 6. Roads and oceans -------------------------------------------------------------
const pagoda = add('pagoda', 'main', 389.5, { z: 0, wide: 10 });
add('person', 'main', 384.5, { v: 'hanM', scale: P2, z: 2 });
add('person', 'main', 395, { v: 'monk', scale: P2, z: 2, pace: 4.6, move: (t) => (t - 168) * 0.25 });
add('camel', 'main', 401, { z: 2, v: 0, move: (t) => (t - 168) * 0.22 });
add('camel', 'main', 407.5, { z: 2, v: 1, move: (t) => (t - 168) * 0.22 });
add('person', 'main', 412, { v: 'merchant', scale: P2, z: 3, pace: 4.6, move: (t) => (t - 168) * 0.22 });
const stupa = add('stupa', 'main', 421, { z: 0, wide: 8 });
const mosque = add('mosque', 'main', 437, { z: 0, wide: 8 });
add('person', 'main', 446, { v: 'maliM', scale: P2, z: 2, flip: true });
const djenne = add('djenne', 'main', 452.5, { z: 0, wide: 10 });
for (const a of [380, 416, 430, 444.5, 459]) add('palm', 'main', a, { v: 0, z: 1, scale: 0.85 });
add('dhow', 'main', 469.5, { z: 2, ground: false, y: 8, move: (t) => (t - 180) * 0.15 });
for (let a = 378; a < 460; a += 8) add('palm', 'mid', a, { v: 0, scale: 0.5 });
// empires rose and fell: monuments in the middle distance stand up and lie down again, one after another
[[366, 0], [376, 1], [386, 2], [396, 3], [406, 0], [416, 1]].forEach(([a, v], i) => add('monument', 'far', a, { v, scale: 1.25, popAt: 170.8 + i * 0.6, foldAt: 173.0 + i * 0.6, loud: 0.5 }));
for (let a = 462; a < 551; a += 4.4) add('wave', 'main', a, { v: (R() * 4) | 0, z: 4, loud: 0.25, ground: false, y: -2 });
for (let a = 460; a < 552; a += 6) add('wave', 'front', a, { v: (R() * 4) | 0, scale: 1.6, ground: false, loud: 0.2 });
for (const [a, v] of [[489, 0], [521, 1], [541, 0]]) { add('island', 'main', a, { v, z: 1, ground: false, y: 2 }); add('palm', 'main', a - 1.4, { v: 1, z: 1, ground: false, y: 26, scale: 0.75 }); add('palm', 'main', a + 1.6, { v: 1, z: 1, ground: false, y: 28, scale: 0.6, flip: true }); }
add('canoe', 'main', 505, { z: 5, ground: false, y: 5, move: (t) => (t - 192) * 0.35 });
// far islands that will light up, one by one, and the rest of the fleet
for (const [a, v] of [[495, 0], [503, 1], [512, 0], [522, 1], [532, 0]]) { add('island', 'far', a, { v, scale: 0.5, ground: false, y: 0 }); add('palm', 'far', a - 0.8, { v: 1, ground: false, y: 12, scale: 0.34 }); }
for (const [a, s] of [[493, 0.5], [517, 0.42]]) add('canoe', 'mid', a, { scale: s, ground: false, y: 2, move: (t) => (t - 192) * 0.3 });

// 7. Printing ---------------------------------------------------------------------
for (const [a, v] of [[562, 0], [568, 1], [589.5, 2], [596, 0]]) add('timber', 'main', a, { v, z: 0 });
add('church', 'main', 603, { z: 0, wide: 8 });
const press = add('press', 'main', 578.2, { z: 1, pulls: EV.press });
add('person', 'main', 574.6, { v: 'printer', scale: P2, z: 2, act: (t) => { const k = EV.press.reduce((s, p) => s + Math.exp(-(((t - p) / 0.35) ** 2)), 0); return { lean: 6 + k * 14, front: [-110 + k * 60, -20], back: [-100 + k * 60, -30] }; } });
add('person', 'main', 584.6, { v: 'reader', scale: P2, z: 2, act: (t) => ({ head: 24, front: [-50, -60], back: [-40, -70] }) });
// ...so did arguments
[['scholarA', 591.5, false, 0], ['scholarB', 595.3, true, 1.3]].forEach(([v, a, flip, ph], i) => add('person', 'main', a, { v, scale: P2, z: 2, flip, popAt: 222.2 + i * 0.35, loud: 0.8, act: (t) => {
  const turn = Math.sin((t - 222.6) * 2.4 + ph) > 0, k = sramp(t, 222.6, 223.2);
  return { lean: 4 + (turn ? 10 : 0) * k, head: (turn ? -6 + Math.sin(t * 9) * 5 : 6) * k, front: turn ? [-120 + Math.sin(t * 8 + ph) * 30, -30] : [-40, -40], back: turn ? [-30 + Math.sin(t * 6) * 20, -40] : [10, -10] };
} }));
for (const a of [557, 584, 609]) add('oak', 'main', a, { v: (R() * 3) | 0, z: 0, scale: 0.9 });
for (let a = 552; a < 610; a += 8) add(R() < 0.6 ? 'oak' : 'timber', 'mid', a, { v: (R() * 3) | 0, scale: 0.55 });
grassRun(552, 610, 3.2, 'main', { skip: (a) => a > 572 && a < 588 });
grassRun(552, 610, 7, 'front', { s: 2 });

// 8. Renaissance ------------------------------------------------------------------
add('person', 'main', 618.2, { v: 'painter', scale: P2, z: 2, act: (t) => { const paint = t > EV.linesAt - 0.5 && t < EV.depthAt + 0.6; return { lean: 6, head: -4 + Math.sin(t * 0.6) * 3, front: paint ? [-100 + Math.sin(t * 3.1) * 14, -20 + Math.sin(t * 4.3) * 10] : [-30, -40], back: [-20, -30] }; } });
add('easel', 'main', 622.6, { z: 2, scale: 1.3, linesAt: EV.linesAt, depthAt: EV.depthAt });
add('person', 'main', 627.4, { v: 'patron', scale: P2, z: 2, flip: true, act: (t) => { const wow = t > EV.depthAt + 0.2 && t < EV.depthAt + 3.2; return { head: wow ? -10 : 6, lean: wow ? -7 : 2, front: wow ? [-150, -10] : [-20, -20] }; } });
add('duomo', 'main', 640.5, { z: 0, wide: 18, popAt: EV.dome, loud: 2.4 });
add('campanile', 'main', 652.5, { z: 0, wide: 6 });
for (const [a, v] of [[612.6, 0], [615.4, 1], [631.4, 1], [647.6, 0], [657.4, 1]]) add('cypress', 'main', a, { v, z: 1 });
for (let a = 611; a < 661; a += 5) add('cypress', 'mid', a, { v: (R() * 2) | 0, scale: 0.55 });
grassRun(611, 660, 3.6, 'main', { skip: (a) => a > 618 && a < 628 });
grassRun(611, 660, 7, 'front', { s: 2 });

// 9. Two worlds meet ----------------------------------------------------------------
add('ship', 'main', 668, { z: 3, ground: false, y: -8, move: (t) => (t - 246) * 0.5 });
for (let a = 663; a < 691; a += 4.4) add('wave', 'main', a, { v: (R() * 4) | 0, z: 4, loud: 0.25, ground: false, y: -2 });
for (let a = 661; a < 693; a += 6) add('wave', 'front', a, { v: (R() * 4) | 0, scale: 1.6, ground: false, loud: 0.2 });
add('palm', 'main', 696, { v: 1, z: 0 });
add('person', 'main', 699.4, { v: 'taino', scale: P2, z: 2, foldAt: EV.folds[0] });
crop('maize', [702, 704.4], 0, { popAt: undefined });
add('person', 'main', 705.6, { v: 'maizeF', scale: P2, z: 2, flip: true, foldAt: EV.folds[1] });
crop('potato', [707.6, 709.6], 0, { over: true, popAt: undefined });
add('person', 'main', 712, { v: 'andean', scale: P2, z: 2 });
for (let a = 694; a < 728; a += 7) add('palm', 'mid', a, { v: (R() * 2) | 0, scale: 0.5 });
grassRun(694, 728, 3.5, 'main', { skip: (a) => a > 700 && a < 711 });

// 10. Science -----------------------------------------------------------------------
add('oak', 'main', 736, { v: 1, z: 0 });
add('timber', 'main', 740.5, { v: 1, z: 0, winOn: (t) => sramp(t, 271, 273) * 0.8, winCol: [255, 190, 110] });
add('lantern', 'main', 745.2, { z: 1 });
add('person', 'main', 748.2, { v: 'galileo', scale: P2, z: 2, act: (t) => { const look = sramp(t, EV.jupiter - 1, EV.jupiter + 1); return { lean: 2 - look * 4, head: -look * 34, front: [-120 - look * 20, -20], back: [-90, -20] }; } });
add('telescope', 'main', 751, { z: 1, aim: (t) => 30 + sramp(t, EV.jupiter - 1.5, EV.jupiter + 0.5) * 18 });
for (const [a, v] of [[762, 0], [770, 2]]) add(v ? 'timber' : 'oak', 'main', a, { v, z: 0 });
for (let a = 734; a < 780; a += 8) add('oak', 'mid', a, { v: (R() * 3) | 0, scale: 0.5 });
grassRun(732, 780, 3.4, 'main', { skip: (a) => a > 743 && a < 754 });

// 11. Enlightenment -------------------------------------------------------------------
add('timber', 'main', 785.6, { v: 2, z: 0 });
const coffee = add('cutaway', 'main', 795, { v: 'coffee', z: 0, wide: 10 });
add('person', 'main', 792.2, { inside: coffee, v: 'debater1', scale: 0.85, z: 2, y: 9, act: (t) => ({ front: [-60 + Math.sin(t * 2.3) * 30, -40 + Math.sin(t * 1.9) * 12], head: Math.sin(t * 1.7) * 6, lean: 4 }) });
add('person', 'main', 797.6, { inside: coffee, delay: 0.2, v: 'debater2', scale: 0.85, z: 2, y: 9, flip: true, act: (t) => ({ head: 10 + Math.sin(t * 1.3) * 5, lean: 2 + Math.sin(t * 0.9) * 2 }) });
add('person', 'main', 795.4, { inside: coffee, delay: 0.4, v: 'reader2', scale: 0.85, z: 2, y: 144, act: (t) => ({ head: 22 }) });
add('throne', 'main', 806.4, { z: 2, fallAt: EV.crown, scale: 1.15 });
const flagIds = [['us', 813], ['fr', 818.6], ['ht', 824.2]];
flagIds.forEach(([v, a], i) => add('flagpole', 'main', a, { v, z: 1, popAt: EV.flags[i] - 0.5, loud: 1.2, raise: (t) => smooth(clamp((t - EV.flags[i]) / 1.4)) }));
add('person', 'main', 815.6, { v: 'citizen', scale: P2, z: 3, act: (t) => (t > EV.flags[0] + 0.4 ? { front: [-165, -10], head: -14 } : {}) });
add('person', 'main', 821.2, { v: 'citizen2', scale: P2, z: 3, flip: true, act: (t) => (t > EV.flags[2] + 0.4 ? { front: [-165, -10], back: [-160, -10], head: -12 } : {}) });
add('timber', 'main', 830.6, { v: 0, z: 0 });
add('oak', 'main', 834.4, { v: 1, z: 0 });
for (let a = 784; a < 838; a += 8) add(R() < 0.5 ? 'timber' : 'oak', 'mid', a, { v: (R() * 3) | 0, scale: 0.55 });
grassRun(784, 838, 3.4, 'main', { skip: (a) => a > 788 && a < 828 });

// 12. The 1800s ------------------------------------------------------------------------
const dusk = (t, i) => sramp(t, 345.5 + i * 0.3, 346.5 + i * 0.3) * 0.7;
for (const [a, k, v] of [[844, 'terrace', 0], [851.5, 'factory', 0], [860, 'terrace', 1], [867.5, 'factory', 1]]) add(k, 'main', a, { v, z: 0, wide: 8, winOn: dusk, winCol: [255, 190, 110] });
const tgPoles = [873.4, 879.6, 891.4, 897.8].map((a) => add('pole', 'main', a, { z: 1, scale: 0.92 }));
add('camera', 'main', 881.4, { z: 2, flashAt: EV.flash, scale: 1.1 });
add('person', 'main', 879.0, { v: 'photog', scale: P2, z: 3, act: (t) => ({ lean: 14, head: 10, front: t > EV.flash - 1.2 && t < EV.flash + 0.4 ? [-155, -20] : [-70, -40], back: [-40, -30] }) });
const holdStill = (t) => t > EV.telegraph + 1.6 && t < EV.flash + 0.15;
[['father', 885.8, 2], ['child1800', 886.9, 4], ['mother', 888.0, 2]].forEach(([v, a, z]) => add('person', 'main', a, { v, scale: P2, z, flip: true, act: (t) => (holdStill(t) ? { lean: 0, head: 0, front: [-4, -4], back: [4, -4], walk: undefined } : { walk: undefined, head: t > EV.flash && t < EV.flash + 2 ? -10 : 0 }) }));
add('photo', 'main', 893.2, { z: 2, popAt: EV.photo, loud: 1.4, scale: 1.15 });
add('school', 'main', 902.4, { z: 0, wide: 10 });
// with medicine: the doctor comes calling
add('person', 'main', 897.2, { v: 'doctor', scale: P2, z: 3, flip: true, popAt: 336.6, loud: 0.6, pace: 6, move: (t) => -clamp((t - 337.0) * 2.4, 0, 6.6), act: (t) => (t > 339.8 ? { walk: undefined, lean: 6, head: 8 + Math.sin(t * 0.8) * 3, front: [-30, -30], back: [6, -6] } : {}) });
[['child1800', 900.6], ['child1800b', 902.4], ['child1800', 904.2]].forEach(([v, a], i) => add('person', 'main', a, { v, scale: P2, z: 3, popAt: EV.school + i * 0.35, to: 351 + i * 0.3, pace: 9, move: (t) => Math.min(9, Math.max(0, t - EV.school - 0.5 - i * 0.3) * (1.1 + i * 0.25)) }));
add('hoop', 'main', 905.6, { z: 3, popAt: EV.school + 0.7, scale: 1.15, move: (t) => { const d = t - EV.school - 0.9; return d <= 0 ? 0 : 0.8 * d * d + 0.6 * d; } });
const gasLamps = [856, 870.6, 895.2].map((a, i) => add('lamp', 'main', a, { v: 0, z: 2, lit: (t) => sramp(t, EV.lamps[i], EV.lamps[i] + 0.4) }));
add('person', 'main', 852.6, { v: 'worker', scale: P2, z: 2 });
add('person', 'main', 862, { v: 'worker2', scale: P2, z: 3, move: (t) => (t - 316) * 0.3 });
const train = add('train', 'main', 812, { z: 4, scale: 0.9, wide: 18, prof: (a) => profile.main(a), from: 316.2, to: 336, move: (t) => Math.max(0, t - EV.train + 3) * 7.4, winOn: (t) => 0 });
for (let a = 840; a < 912; a += 9) add('factory', 'mid', a, { v: (R() * 2) | 0, scale: 0.5 });

// 13. Electric light: a street of paper dollhouses ----------------------------------------
const ROUTE = [[924, 340], [929.6, 152], [934.6, 270], [942.6, 238], [947.6, 152], [953.4, 336], [959.2, 152], [966, 152]].map(([a, h], i) => ({ a, h, t: EV.spark + i * 1.25 }));
const sparkAt = (i) => ROUTE[i].t;
const homeA = add('cutaway', 'main', 924, { v: 'home', z: 0, wide: 12, scale: 1.1, roomOn: (t, i) => (i === 2 ? sramp(t, EV.firstLight, EV.firstLight + 0.15) : sramp(t, EV.spark + 0.2 + i * 0.3, EV.spark + 0.35 + i * 0.3)) });
add('person', 'main', 920.4, { inside: homeA, v: 'cordwoman', scale: 0.8, z: 2, y: 142, act: (t) => { const pulled = t > EV.firstLight - 0.1; return { lean: -4, head: pulled ? -24 : -16, front: pulled ? [-142, 14] : [-172, 4], back: [8, -6] }; } });
const homeB = add('cutaway', 'main', 934.6, { v: 'home2', z: 0, wide: 10, scale: 1.1, roomOn: (t, i) => sramp(t, sparkAt(2) + i * 0.4, sparkAt(2) + 0.15 + i * 0.4) });
add('person', 'main', 933.2, { inside: homeB, v: 'reader2', scale: 0.8, z: 2, y: 10, act: (t) => ({ head: t > sparkAt(2) && t < sparkAt(2) + 2 ? -20 : 22 }) });
const cinema = add('cinema', 'main', 942.6, { z: 0, wide: 8, on: (t) => sramp(t, sparkAt(3), sparkAt(3) + 0.3) });
const homeC = add('cutaway', 'main', 953.4, { v: 'home3', z: 0, wide: 12, roomOn: (t, i) => sramp(t, sparkAt(5) + i * 0.22, sparkAt(5) + 0.12 + i * 0.22) });
const ePoles = [929.6, 947.6, 959.2, 966].map((a) => add('pole', 'main', a, { z: 1 }));
const eLamps = [[931.8, 1], [939.6, 3], [950.2, 4], [962.4, 6]].map(([a, k]) => add('lamp', 'main', a, { v: 1, z: 2, lit: (t) => sramp(t, sparkAt(k) - 0.6, sparkAt(k) - 0.3) }));
for (let a = 918, i = 0; a < 1000; a += 7 + R() * 5, i++) add('terrace', 'far', a, { v: (R() * 3) | 0, scale: 0.42, winOn: ((k) => (t, w) => (hash(w * 3.3 + k) < 0.45 ? 0 : sramp(t, 368 + hash(w + k) * 6, 368.3 + hash(w + k) * 6) * 0.6))(i * 7.7), winCol: [255, 200, 130] });

// 14. The twentieth century ----------------------------------------------------------------
// Kitty Hawk: sand, a stiff wind, a short wobbling hop
const flyer = add('flyer', 'main', 975, { z: 3, scale: 1.25, startAt: EV.flyer - 1.4, fly: (t) => { const d = t - EV.flyer; return d < 0 ? 0 : d < 0.7 ? smooth(d / 0.7) * 0.8 : d < 3.2 ? 0.8 + Math.sin(d * 3.4) * 0.14 : d < 4.2 ? 0.8 * (1 - smooth((d - 3.2) / 1)) : 0; }, move: (t) => clamp((t - EV.flyer) / 4.2, 0, 1) * 6 });
add('person', 'main', 971.2, { v: 'worker', scale: P2, z: 2, act: (t) => (t > EV.flyer + 0.4 && t < EV.flyer + 5 ? { front: [-160, -20], back: [-150, -30], head: -18 } : {}) });
add('car', 'main', 978, { z: 4, from: EV.cars - 0.6, to: 392.6, move: (t) => Math.max(0, t - EV.cars) * 7, lit: () => 0 });
add('car', 'main', 972, { z: 4, from: EV.cars - 0.2, to: 392.8, move: (t) => Math.max(0, t - EV.cars) * 8, lit: () => 0 });
add('mast', 'mid', 984, { scale: 0.8, popAt: EV.radio - 1.2, loud: 0.8 });
const radioHome = add('cutaway', 'main', 993.6, { v: 'radio', z: 0, wide: 10, scale: 1.05, roomOn: () => 0.5, radioOn: (t) => sramp(t, EV.radio, EV.radio + 0.3) });
add('person', 'main', 990.0, { inside: radioHome, v: 'radioDad', scale: 0.8, z: 2, y: 9.5, act: (t) => ({ head: t > EV.radio ? 10 : 0, lean: t > EV.radio ? 8 : 2 }) });
add('person', 'main', 991.4, { inside: radioHome, delay: 0.2, v: 'radioKid', scale: 0.8, z: 2, y: 9.5, act: (t) => ({ front: t > EV.radio + 0.5 && t < EV.radio + 3 ? [-150, -20] : [-20, -20], head: t > EV.radio ? -10 : 0 }) });
// two world wars: the town folds flat, and is built again
const warTown = [[1002.8, 'terrace', 1], [1007.2, 'timber', 2], [1011.4, 'terrace', 2]].map(([a, k, v], i) => add(k, 'main', a, { v, z: 0, scale: 0.95, foldAt: EV.war + 1.6 + i * 0.9, repopAt: EV.warEnd + 0.4 + i * 0.5, loud: 1.6 }));
const warPeople = [['mother', 1005.0], ['father', 1009.4], ['saved2', 1013.4]].map(([v, a], i) => add('person', 'main', a, { v, scale: P2, z: 2, flip: i === 1, foldAt: EV.war + 2.4 + i * 0.8, repopAt: EV.saved + i * 0.45 }));
add('lab', 'main', 1018.8, { z: 2, scale: 1.1, popAt: EV.dish - 0.7, loud: 1.2, found: (t) => sramp(t, EV.dish, EV.dish + 0.5) * (0.85 + 0.15 * Math.sin(t * 3)) });
add('person', 'main', 1016.4, { v: 'scientist', scale: P2, z: 3, popAt: EV.dish - 0.4, loud: 0.8, act: (t) => ({ lean: 14, head: 16, front: [-70, -40], back: [-50, -30] }) });
[['saved', 1021.6], ['saved3', 1023.8], ['saved2', 1026]].forEach(([v, a], i) => add('person', 'main', a, { v, scale: P2, z: 2, popAt: EV.saved + 0.6 + i * 0.4, loud: 0.9 }));
const gantry = add('gantry', 'main', 1030.6, { z: 1, popAt: EV.rocket - 1.6, loud: 1, to: 421 });
grassRun(970, 985, 3, 'main');
for (let a = 986; a < 1034; a += 8) add('oak', 'mid', a, { v: (R() * 3) | 0, scale: 0.5 });

// 15. Today: people everywhere, joined by threads of light --------------------------------------
const screens = [];
for (let a = 1039.5; a < 1050; a += 4.2) add('wave', 'main', a, { v: (R() * 4) | 0, z: 4, loud: 0.2, ground: false, y: -2 });
for (let a = 1038; a < 1051; a += 6) add('wave', 'front', a, { v: (R() * 4) | 0, scale: 1.6, ground: false, loud: 0.2 });
screens.push(add('boat', 'main', 1044.4, { z: 3, ground: false, y: 15, scale: 1.1, screenAt: EV.screens, hand: 96 }));
const roofHome = add('home', 'main', 1053.6, { v: 0, z: 0, winOn: () => 0.9 });
const kid = add('person', 'main', 1053.2, { inside: roofHome, v: 'kid', scale: 1.0, z: 2, y: 118, act: (t) => ({ head: -36 + Math.sin(t * 0.7) * 3, lean: -6, front: [-150, -12], back: [10, -10] }) });
screens.push(add('person', 'main', 1057.4, { v: 'granny', scale: P2, z: 2, screenAt: EV.screens + 0.7, act: (t) => ({ back: [-155 + Math.sin(t * 7) * 22, -15] }) }));
add('sheep', 'main', 1061.8, { v: 3, z: 2 });
screens.push(add('person', 'main', 1064.4, { v: 'herder', scale: P2, z: 2, screenAt: EV.screens + 1.3 }));
add('sheep', 'main', 1066.8, { v: 4, z: 2, flip: true });
add('oak', 'main', 1069.8, { v: 2, z: 0 });
screens.push(add('laptopper', 'main', 1071, { scale: P2, z: 2, screenAt: EV.screens + 1.9, hand: 70 }));
add('busstop', 'main', 1077.6, { z: 0 });
screens.push(add('person', 'main', 1078.2, { v: 'phoneD', scale: P2, z: 2, screenAt: EV.screens + 2.5 }));
screens.push(add('person', 'main', 1082.6, { v: 'phoneA', scale: P2, z: 2, screenAt: EV.screens + 2.9, flashAt: 431.6, act: (t) => ({ front: [-168, 12], head: -10, lean: -2 }) }));
add('person', 'main', 1084.2, { v: 'phoneC', scale: P2, z: 2, flip: true, screenAt: EV.screens + 3.0, act: (t) => ({ head: t > 430.9 && t < 432.4 ? -14 : 20 }) });
add('home', 'main', 1088.4, { v: 1, z: 0, winOn: () => 0.9 });
for (const a of [1075.4, 1086]) add('lamp', 'main', a, { v: 1, z: 1, lit: () => 1 });
for (const [a, sp, sc] of [[1060, 0.6, 0.85], [1065.5, 0.75, 0.75], [1071, 0.5, 0.9]]) add('turbine', 'mid', a, { speed: sp, scale: sc });
for (let a = 1074; a < 1092; a += 6) add('home', 'mid', a, { v: (R() * 3) | 0, scale: 0.6, winOn: () => 0.7 });
for (let a = 1040, i = 0; a < 1100; a += 6 + R() * 5, i++) add('home', 'far', a, { v: (R() * 3) | 0, scale: 0.45, winOn: ((k) => (t, w) => (hash(w + k) < 0.3 ? 0 : sramp(t, 422 + hash(w * 3 + k) * 6, 422.3 + hash(w * 3 + k) * 6) * 0.6))(i * 3.1) });
grassRun(1052, 1074, 3.2, 'main', { skip: (a) => a > 1060 && a < 1072 });

// 16. Blank card -------------------------------------------------------------------------
for (let a = 1095, i = 0; a < 1185; a += 4.5 + R() * 5, i++) { const tilt = (R() - 0.5) * 7; add('blank', 'main', a, { v: (R() * 5) | 0, z: R() < 0.5 ? 0 : 2, scale: 0.7 + R() * 0.7, loud: 0.9, rot: () => tilt }); }
for (let a = 1092; a < 1195; a += 7) add('blank', 'mid', a, { v: (R() * 5) | 0, scale: 0.55 });
// seen whole, the uncut board runs on around the far side: as much again as everything so far
for (let a = 1189, i = 0; a < 1300; a += 3.6 + R() * 4.2, i++) { const tilt = (R() - 0.5) * 8; add('blank', 'main', a, { v: (R() * 5) | 0, z: R() < 0.5 ? 0 : 2, scale: 0.55 + R() * 0.75, popAt: EV.pull + 4.5 + (a - 1189) * 0.035 + R() * 0.3, loud: 0.25, rot: () => tilt }); }
for (let a = 1196; a < 1300; a += 8) add('blank', 'mid', a, { v: (R() * 5) | 0, scale: 0.5, popAt: EV.pull + 5 + (a - 1196) * 0.035 });
for (let a = 1100; a < 1195; a += 14) add('blank', 'far', a, { v: (R() * 5) | 0, scale: 0.3 });

E.sort((p, q) => (p.z || 0) - (q.z || 0) || p.a - q.a);
const byLayer = {};
for (const e of E) (byLayer[e.layer] ||= []).push(e);

// -------------------------------------------------------------------- sky ---
const NIGHT = ['#0a102b', '#11193c', '#1a2650', '#2e3a66'], DUSK = ['#141b3c', '#27294f', '#4f3d63', '#8a5a62'], DAWN = ['#3a4a7a', '#9a8aa8', '#f0b88a', '#f8d8a8'], DAY = ['#7aa4cc', '#a8c4d8', '#e2e6e0', '#f0e8d0'];
const skyK = track([
  [0, ['#34406c', '#80628a', '#dc8c62', '#f6b76a']], [6, ['#262f5a', '#57497c', '#b0627a', '#e08f5e']], [11, ['#141b3c', '#27294f', '#4f3d63', '#8a5a62']], [16, ['#0c1230', '#131c42', '#1e2a56', '#35426e']],
  [48, ['#0c1230', '#131c42', '#1e2a56', '#35426e']], [53, ['#2c3a6a', '#6c6a96', '#e3a07a', '#f7c98a']], [58, ['#5f93c4', '#8db6d6', '#cfe0e0', '#f2e2c0']], [64, ['#7da2c4', '#a9c3d6', '#dfe6e6', '#eef0ea']],
  [72, ['#5f93c4', '#8db6d6', '#cfe0e0', '#f2e2c0']], [77.5, ['#2e3566', '#6a5a8a', '#d48a6a', '#f0b070']], [81, ['#0c1230', '#131c42', '#1e2a56', '#35426e']], [90, ['#0c1230', '#131c42', '#1e2a56', '#35426e']],
  [93, ['#2c3a6a', '#6c6a96', '#e3a07a', '#f7c98a']], [97, ['#6a9cc8', '#9cc0d8', '#e0e4d0', '#f4e0b0']], [121, ['#6a9cc8', '#9cc0d8', '#e0e4d0', '#f4e0b0']], [128, ['#7aa0c0', '#b0c4cc', '#ecdcb8', '#f6d49a']],
  [136, ['#5a7aa8', '#9a9ab0', '#e8b888', '#f8c886']], [161, ['#6a8cb4', '#a8b4c4', '#ecd0a8', '#f8d098']], [170, ['#6a9cc8', '#a4c4d4', '#e8dcc0', '#f6d8a6']], [186, ['#6a9cc8', '#a4c4d4', '#e8dcc0', '#f6d8a6']],
  [189.5, ['#3a3a70', '#8a6a8a', '#e6906a', '#f8b878']], [194, ['#081028', '#0e1838', '#182a52', '#2a3e6a']], [205, ['#081028', '#0e1838', '#182a52', '#2a3e6a']], [208, DAWN],
  [212, DAY], [225, DAY], [229, ['#5a86b8', '#9ab4c8', '#ecd4a8', '#f8cc8a']], [244, ['#5a86b8', '#9ab4c8', '#ecd4a8', '#f8cc8a']], [248, DAY], [258, DAY],
  [262.5, ['#5a6270', '#7a808a', '#9a9a9a', '#aaa4a0']], [269, ['#4a5260', '#6a7080', '#8a8a8e', '#9a9490']], [272.5, DUSK], [275, NIGHT], [289, NIGHT],
  [293, DAWN], [298, ['#6aa0d0', '#a8cce0', '#eef0e8', '#f8f0d8']], [313, ['#6aa0d0', '#a8cce0', '#eef0e8', '#f8f0d8']],
  [317, ['#8a8a90', '#a8a49c', '#c8b8a0', '#d8c4a0']], [342, ['#8a8a90', '#a8a49c', '#c8b8a0', '#d8c4a0']], [347, ['#3a3550', '#6a5060', '#a8705a', '#c88a60']], [352, ['#070a1c', '#0c1228', '#141c38', '#24304e']], [376, ['#070a1c', '#0c1228', '#141c38', '#24304e']],
  [379.5, ['#7aa8d4', '#a8cce0', '#e6ecea', '#f4ecd8']], [392, ['#7aa8d4', '#a8cce0', '#e6ecea', '#f4ecd8']], [394.5, ['#3a2a2a', '#5a3a32', '#8a4a3a', '#a86a4a']], [400.5, ['#3a2a2a', '#5a3a32', '#8a4a3a', '#a86a4a']],
  [403.5, ['#6a9cc8', '#a4c4d4', '#e8e0d0', '#f4e8d0']], [407, ['#6a9cc8', '#a4c4d4', '#e8e0d0', '#f4e8d0']], [409.5, DUSK], [412, ['#05081a', '#0a1028', '#121c3c', '#1e2c50']], [436, ['#05081a', '#0a1028', '#121c3c', '#1e2c50']],
  [442, ['#101a3c', '#2a3060', '#6a5a7a', '#a87a7a']], [450, ['#2c3a6a', '#6c6a96', '#e3a07a', '#f7c98a']], [462, ['#3f6aa0', '#7aa0c8', '#e2c8b0', '#f8d8a8']],
]);
const W_ = [255, 252, 244];
const ambK = track([
  [0, [244, 214, 196]], [6, [176, 150, 164]], [11, [96, 98, 138]], [16, [58, 70, 114]], [48, [58, 70, 114]], [53, [190, 170, 170]], [58, W_], [76, [255, 250, 240]], [78.5, [170, 140, 150]],
  [81, [44, 50, 88]], [90, [44, 50, 88]], [93, [190, 170, 170]], [97, W_], [128, [255, 250, 236]], [136, [255, 236, 210]], [161, [255, 244, 226]], [170, W_], [187, [255, 248, 236]],
  [190, [210, 160, 150]], [194, [98, 116, 168]], [205, [98, 116, 168]], [208, [200, 180, 175]], [212, W_], [225, W_], [229, [255, 240, 220]], [244, [255, 240, 220]], [248, W_], [258, W_],
  [262.5, [200, 200, 206]], [269, [176, 176, 186]], [272.5, [90, 92, 130]], [275, [60, 68, 112]], [289, [60, 68, 112]], [293, [210, 190, 185]], [298, W_], [313, W_],
  [317, [226, 214, 200]], [342, [216, 202, 190]], [347, [140, 112, 124]], [352, [36, 42, 76]], [376, [36, 42, 76]], [379.5, W_], [392, W_], [394.5, [190, 140, 120]], [400.5, [180, 135, 118]],
  [403.5, [255, 250, 240]], [407, W_], [409.5, [90, 92, 130]], [412, [34, 40, 74]], [436, [34, 40, 74]], [442, [90, 90, 130]], [450, [200, 182, 176]], [462, [255, 250, 240]],
]);
const moteK = track([[0, [255, 222, 170]], [12, [150, 170, 225]], [22, [150, 170, 225]], [28, [255, 190, 120]], [52, [255, 222, 170]], [80, [255, 190, 120]], [92, [255, 222, 170]], [275, [160, 180, 230]], [294, [255, 230, 190]], [318, [200, 190, 170]], [352, [255, 220, 170]], [380, [255, 230, 190]], [394, [255, 170, 120]], [412, [160, 200, 255]], [444, [255, 222, 170]]]);
const gradeK = track([
  [0, [255, 170, 95, 0.16]], [50, [255, 170, 95, 0.16]], [57, [255, 205, 150, 0.1]], [92, [255, 205, 150, 0.1]], [100, [255, 196, 120, 0.14]], [165, [255, 190, 110, 0.15]],
  [186, [255, 186, 120, 0.12]], [193, [70, 130, 175, 0.2]], [205, [70, 130, 175, 0.2]], [211, [215, 214, 205, 0.08]], [225, [215, 214, 205, 0.08]], [229, [255, 196, 130, 0.15]], [244, [255, 196, 130, 0.15]],
  [249, [215, 214, 205, 0.08]], [258, [215, 214, 205, 0.08]], [262.5, [140, 146, 160, 0.26]], [270, [140, 146, 160, 0.26]], [275, [90, 110, 175, 0.16]], [289, [90, 110, 175, 0.16]],
  [294, [255, 220, 170, 0.1]], [313, [255, 220, 170, 0.1]], [318, [205, 160, 110, 0.26]], [346, [205, 160, 110, 0.26]], [352, [255, 190, 100, 0.16]], [376, [255, 190, 100, 0.16]],
  [380, [255, 214, 160, 0.1]], [392, [255, 214, 160, 0.1]], [394.5, [180, 90, 60, 0.28]], [401, [180, 90, 60, 0.28]], [404, [215, 220, 210, 0.08]], [408, [215, 220, 210, 0.08]],
  [412, [80, 150, 205, 0.2]], [436, [80, 150, 205, 0.2]], [444, [255, 185, 150, 0.16]], [472, [255, 196, 150, 0.14]],
]);
// the sun only shows itself at the edges of the day
const SUNS = [[-1, 13, -430, -78, 170], [50, 58, 430, 170, -60], [74, 80, -430, -40, 170], [90.5, 97, 430, 170, -60], [186, 193, -430, -40, 170], [205, 211, 430, 170, -60], [289.5, 297, 430, 170, -60], [343, 350, -430, -40, 170], [376.5, 382, 430, 170, -60], [406, 411, -430, -40, 170]];
const DOLL_FOLD = [1, 4, 6, 8];
const LUNAR0 = EV.landing + 0.1, LUNAR1 = 419.6;
const lunarVeil = (t) => (t < LUNAR0 ? 0 : clamp(spring(t - LUNAR0, 5.0, 0.6)) * (1 - sramp(t, LUNAR1, LUNAR1 + 1.3)));
const ISLE_MAIN = [[489.6, 199.6, 11], [521.4, 203.2, 12], [541.4, 204.6, 13]];
const ISLE_FAR = [[503, 200.3], [512, 201.0], [495, 201.7], [522, 202.4], [532, 203.6]];
const NIGHTS = [[9, 52], [79, 93], [191, 207], [272, 291], [349, 378], [409, 446]];

function fireState(t) {
  let blow = 0;
  for (const b of EV.blows) blow += Math.exp(-(((t - b - 0.3) / 0.3) ** 2));
  const dt = t - EV.lit;
  let lit = dt > 0 ? (1 - Math.exp(-dt / 1.7)) * (1 + 0.1 * Math.exp(-((dt - 3.4) ** 2) / 2)) : 0;
  if (t > EV.pop) lit *= 1 + 0.42 * Math.exp(-(t - EV.pop) * 3.2);
  return { reach: sramp(t, EV.reach, EV.reach + 1.5), blow: Math.min(1.2, blow), lit, litAt: EV.lit };
}
const near = (a, c, w = 70) => Math.abs(a - c) < w;
// where the spark is on its wire, as an angle and height
function sparkPos(t) {
  if (t < ROUTE[0].t || t > ROUTE[ROUTE.length - 1].t) return null;
  let i = 0; while (i < ROUTE.length - 2 && t > ROUTE[i + 1].t) i++;
  const A = ROUTE[i], B = ROUTE[i + 1], f = (t - A.t) / (B.t - A.t), sag = Math.sin(f * Math.PI) * 22;
  return { a: lerp(A.a, B.a, f), h: lerp(A.h, B.h, f) - sag, seg: i, f };
}

function state(t, stage) {
  const c = cam(t), lights = [], emitters = [], smoke = [];
  const fire = fireState(t);
  const flick = (s) => 0.84 + 0.16 * fbm(t * 7.3 + s, 60) + 0.05 * Math.sin(t * 31 + s);
  if (near(0, c)) {
    const up = clamp(spring(t - tender.tPop, 10.5, 0.46));
    const tip = KINDS.tender.tip(t, fire);
    const emberPos = { a: tender.a + tip[0] * PS / 17.453, h: -tip[1] * PS * up };
    const ember = up * (0.3 + 0.1 * Math.sin(t * 2.3) + fire.blow * 0.75) * (1 - 0.6 * clamp(fire.lit * 1.5));
    lights.push({ a: emberPos.a, h: emberPos.h, r: 150 + fire.blow * 160, k: ember * 0.8, color: [255, 130, 60] });
    if (fire.lit > 0) lights.push({ a: 0, h: 34, r: 500 + 620 * Math.min(1.15, fire.lit), k: Math.min(1.3, fire.lit * 1.3) * flick(0) * (1 - sramp(t, 52, 57) * 0.7), color: [255, 158, 80] });
    emitters.push({ a: 0, h: 5, scale: PS * 1.25, lit: Math.min(1.3, fire.lit) * (1 - sramp(t, 53, 58) * 0.6), litAt: EV.lit, ember, emberPos });
  }
  if (t > 77 && t < 100) {
    const k = sramp(t, 77.8, 78.6);
    lights.push({ a: 193.2, h: 92, r: 820, k: 1.5 * k * flick(3), color: [255, 150, 74] }, { a: 188, h: 130, r: 560, k: 0.7 * k * flick(4), color: [255, 160, 90] });
    emitters.push({ a: 193.2, h: 84, scale: 0.5, small: 1, lit: k, litAt: 77.8, seed: 3 });
  }
  // a candle in Galileo's garden
  if (t > 270 && t < 296) {
    const k = sramp(t, 271, 272.5);
    lights.push({ a: 745.2, h: 54, r: 320, k: 1.0 * k * flick(5), color: [255, 170, 90] });
    emitters.push({ a: 745.2, h: 50, scale: 0.22, small: 1, lit: k, litAt: 271, seed: 5 });
  }
  // dusk in the 1800s: gas lamps and lit mills
  if (t > 344 && t < 360) {
    gasLamps.forEach((l) => { const k = l.lit(t); if (k > 0) lights.push({ a: l.a, h: 140, r: 300, k: 0.9 * k, color: [255, 210, 130] }); });
    for (const a of [851.5, 867.5]) lights.push({ a, h: 60, r: 340, k: 0.5 * sramp(t, 345, 347), color: [255, 180, 100] });
  }
  // the electric street: each room throws its light into the street
  if (t > 352 && t < 382) {
    for (const [b, n] of [[homeA, 4], [homeB, 2], [homeC, 6]]) { let k = 0; for (let i = 0; i < n; i++) k += b.roomOn(t, i); if (k > 0) lights.push({ a: b.a, h: 120, r: 420, k: Math.min(1, k / n * 1.4) * 0.9, color: [255, 200, 130] }); }
    const first = homeA.roomOn(t, 2); if (first > 0) lights.push({ a: homeA.a - 2.6, h: 230, r: 260, k: 1.1 * first, color: [255, 210, 140] });
    const ck = cinema.on(t); if (ck > 0) lights.push({ a: cinema.a, h: 140, r: 420, k: 0.8 * ck, color: [255, 220, 150] });
    eLamps.forEach((l) => { const k = l.lit(t); if (k > 0) lights.push({ a: l.a + 0.3, h: 130, r: 300, k, color: [255, 236, 200] }); });
    const sp = sparkPos(t); if (sp) lights.push({ a: sp.a, h: sp.h, r: 200, k: 1.2, color: [210, 230, 255] });
  }
  // the radio's dial, the lab's discovery
  if (t > 386 && t < 400) lights.push({ a: 993.6, h: 60, r: 300, k: 0.5 * sramp(t, EV.radio, EV.radio + 0.3), color: [255, 210, 140] });
  if (t > 402 && t < 412) lights.push({ a: 1018.8, h: 70, r: 380, k: 0.8 * sramp(t, EV.dish, EV.dish + 0.5), color: [200, 255, 180] });
  // today: a screen in every hand
  if (t > 414 && t < 446) {
    for (const p of screens) { const k = sramp(t, p.screenAt, p.screenAt + 0.3); if (k > 0) lights.push({ a: p.a + (p.move ? p.move(t) : 0), h: p.hand ?? 110, r: 190, k: 0.95 * k, color: [130, 180, 255] }); }
    lights.push({ a: 1044.4 - 2, h: 60, r: 300, k: 0.8 * flick(9), color: [255, 200, 130] });
    for (const a of [1053.6, 1088.4]) lights.push({ a, h: 60, r: 320, k: 0.7, color: [255, 200, 130] });
    for (const a of [1075.4, 1086, 1077.6]) lights.push({ a, h: 120, r: 280, k: 0.75, color: [235, 240, 255] });
    const fl = Math.exp(-(((t - 431.6) / 0.08) ** 2)); if (fl > 0.01) lights.push({ a: 1082.6, h: 150, r: 700, k: 1.6 * fl, color: [235, 245, 255] });
  }
  // the settled islands light their fires, one after another
  if (t > 198 && t < 210) for (const [a, t0, n] of ISLE_MAIN) {
    const k = sramp(t, t0, t0 + 1.4) * (1 - sramp(t, 207, 209.5)); if (k <= 0) continue;
    lights.push({ a, h: 40, r: 340, k: 1.0 * k * flick(n), color: [255, 150, 74] });
    emitters.push({ a, h: 28, scale: 0.3, small: 1, lit: k, litAt: t0, seed: n });
  }
  // bread ovens in Uruk
  if (t > 110 && t < 172) for (const a of [317.2, 354.6]) smoke.push({ a: a + 0.2, h: 34, t0: 100, size: 0.55, life: 6, every: 0.8, rise: 170, drift: 3, alpha: 0.4 });
  // smoke from mills and the engine; smoke over the burning town
  if (t > 314 && t < 356) {
    for (const a of [851.5, 867.5]) smoke.push({ a: a + 0.6, h: 272, t0: 310, size: 1.4, life: 7, every: 0.55, rise: 260, drift: 5 });
    if (t > 316) smoke.push({ a: train.a, move: train.move, h: 96, t0: 316, size: 0.9, life: 3.2, every: 0.18, rise: 120, drift: 0, alpha: 0.9, t1: 336 });
  }
  if (t > 393 && t < 408) for (const [a, k] of [[1002.8, 0], [1007.2, 1], [1011.4, 2]]) smoke.push({ a, h: 20, t0: EV.war + 1.6 + k * 0.9, t1: EV.warEnd, size: 1.8, life: 6, every: 0.4, rise: 300, drift: 6, alpha: 0.75 });
  let nightK = 0; for (const [a0, a1] of NIGHTS) nightK = Math.max(nightK, sramp(t, a0, a0 + 5) * (1 - sramp(t, a1 - 4, a1)));
  let sun = null;
  for (const [t0, t1, x, y0, y1] of SUNS) if (t > t0 && t < t1) sun = { x, y: lerp(y0, y1, smooth((t - t0) / (t1 - t0))), k: 1 };
  if (t > 443) sun = { x: 380, y: lerp(190, -90, smooth((t - 443) / 19)), k: 1 };
  const pull = sramp(t, EV.pull, EV.pull + 12);
  let zoom = 1;
  zoom *= 1 + 0.15 * sramp(t, 4, 14) + 0.6 * sramp(t, 14.5, 21) - 0.45 * sramp(t, 24.5, 34) - 0.3 * sramp(t, 46, 55);
  zoom *= 1 + 0.2 * sramp(t, 79, 83) * (1 - sramp(t, 89, 92));
  zoom *= 1 + 0.08 * sramp(t, 160, 162) * (1 - sramp(t, 166, 169));
  zoom *= 1 + 0.25 * sramp(t, 211, 215.5) * (1 - sramp(t, 220.2, 223.5));
  zoom *= 1 + 0.42 * sramp(t, 226.5, 230.5) * (1 - sramp(t, 236.4, 239.6));
  zoom *= 1 + 0.22 * sramp(t, 272.5, 276) * (1 - sramp(t, 284, 288.5));
  zoom *= 1 + 0.22 * sramp(t, 328, 331) * (1 - sramp(t, 334, 337.5));
  zoom *= 1 + 0.4 * sramp(t, 353, 358) - 0.4 * sramp(t, 360.5, 370);
  zoom *= 1 + 0.38 * sramp(t, 378.6, 381) * (1 - sramp(t, 384.2, 387));
  return {
    fire, lights, emitters, smoke,
    sky: skyK(t), ambient: ambK(t), ground: null,
    stars: nightK * (t > 191 && t < 207 ? 1.6 : 1) + pull * lerp(1, 0.22, sramp(t, 447, 457)),
    sun, cloud: 1 - nightK * 0.4,
    snow: sramp(t, 61.5, 63.5) * (1 - sramp(t, 68.5, 70)),
    motes: lerp(0.5, 0.3, sramp(t, 4, 14)) + 0.3 * clamp(fire.lit) * (t < 55), moteColor: moteK(t),
    stencil: sramp(t, EV.hand + 0.3, EV.hand + 1.4),
    emit: t > 270, screen: 0, blink: 0, bloom: 0.16 + 0.34 * nightK, grade: gradeK(t), rays: t > 443 ? 1.4 : 1,
    zoom, pull,
    fade: Math.max(1 - sramp(t, 0.1, 3.4), sramp(t, DURATION - 3.5, DURATION)),
  };
}

const clouds = [
  { v: 0, x: -520, yf: 0.72, s: 1, par: 2.2, drift: 3.0 },
  { v: 1, x: 260, yf: 0.84, s: 0.8, par: 1.6, drift: 2.2 },
  { v: 2, x: 820, yf: 0.6, s: 1.1, par: 2.6, drift: 3.6 },
  { v: 3, x: -1050, yf: 0.9, s: 0.7, par: 1.4, drift: 1.8 },
];

// -------------------------------------------------------------- moments ---
// Drop-in for things on threads: falls from above, bounces, settles.
const drop = (t, t0, t1 = 1e9) => clamp(spring(t - t0, 5.5, 0.42), 0, 1.4) - (t > t1 ? spring(t - t1, 4, 0.7) * 1.4 : 0);
function sky(g, st, t, S) {
  const { W, H } = st, u = st.eu;
  g.setTransform(1, 0, 0, 1, 0, 0);
  // the Milky Way, over the first fire and over the open Pacific
  const mw = Math.max(0.65 * sramp(t, 13, 18) * (1 - sramp(t, 22.5, 27)) + 0.3 * sramp(t, 27, 30) * (1 - sramp(t, 48, 53)), sramp(t, 192.5, 196) * (1 - sramp(t, 205.5, 208.5)));
  if (mw > 0.01) milkyWay(g, st, t, mw * (1 - S.pull), t < 100 ? 0 : 1);
  guideStar(g, st, t);
  birds(g, st, t);
  // the moon over the first fire
  if (t > 12 && t < 58) {
    const y = H * lerp(-0.12, 0.17, drop(t, 12.5, 51.5));
    const gl = g.createRadialGradient(W * 0.71, y, 0, W * 0.71, y, 230 * u);
    gl.addColorStop(0, 'rgba(210,222,255,0.2)'); gl.addColorStop(1, 'rgba(200,215,255,0)');
    g.globalCompositeOperation = 'screen'; g.fillStyle = gl; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
    st.hang(g, st.fx.moon, W * 0.71, y, 1, Math.sin(t * 0.5) * 1.6 * DEG * (1 + 3 * Math.exp(-Math.max(0, t - 12.5) / 4)), 1, -0.35);
  }
  // in the long days a paper sun hangs on its thread
  for (const [t0, t1] of [[99, 184], [213, 244], [249, 259], [300, 315], [383, 392]]) {
    if (t < t0 - 0.5 || t > t1 + 3) continue;
    const k = drop(t, t0, t1), sx = W * (st.aspectK > 0.4 ? 0.16 : 0.2), sy = H * lerp(-0.25, 0.13, k);
    g.globalCompositeOperation = 'screen';
    const gl = g.createRadialGradient(sx, sy, 0, sx, sy, 300 * u); gl.addColorStop(0, `rgba(255,236,190,${0.35 * clamp(k)})`); gl.addColorStop(1, 'rgba(255,230,180,0)');
    g.fillStyle = gl; g.fillRect(sx - 300 * u, sy - 300 * u, 600 * u, 600 * u); g.globalCompositeOperation = 'source-over';
    st.hang(g, st.fx.sun, sx, sy, 0.75, Math.sin(t * 0.4) * 1.2 * DEG, 1, t * 0.03);
  }
  // Jupiter, and four moons in a line, as Galileo drew them
  // aircraft over the wars, dark against the smoke
  if (t > EV.war && t < EV.warEnd) {
    for (const [d, y, sp, s] of [[0.3, 0.2, 0.15, 1.35], [1.4, 0.3, 0.12, 1.05], [2.8, 0.14, 0.17, 1.5], [4.2, 0.34, 0.13, 1.1]]) {
      const k = (t - EV.war - d) * sp; if (k < 0 || k > 1.25) continue;
      g.save(); g.globalAlpha = 0.9; st.hang(g, st.fx.bomber, W * lerp(1.15, -0.15, k), H * y, s, Math.sin(t * 1.4 + d) * 1.2 * DEG, 0.9, Math.PI); g.restore();
    }
  }
  // the Moon, a rocket pulled up to it on a thread, and the first people there
  if (t > 408 && t < 440) {
    const mx = W * (st.aspectK > 0.4 ? 0.74 : 0.7), my = H * lerp(-0.2, 0.16, drop(t, 408.6, 437));
    const hit = t > EV.landing ? Math.exp(-(t - EV.landing) * 0.9) * Math.sin((t - EV.landing) * 5) * 7 : 0;
    const mv = 1 - 0.85 * lunarVeil(t);
    g.globalAlpha = mv;
    st.hang(g, st.fx.moon, mx, my, 1.25, (Math.sin(t * 0.5) * 1.4 + hit) * DEG, mv, -0.35);
    if (t > EV.rocket - 0.5 && t < 437) {
      const [gx, gy] = st.place('main', gantry.a + 0.9, 0, t), k = smooth(clamp((t - EV.rocket) / (EV.landing - EV.rocket)));
      const rx = lerp(gx, mx - 18 * u, k), ry = lerp(gy - 20 * u, my - 14 * u, k ** 1.4);
      if (t < EV.landing + 0.2 && t > EV.rocket) { g.globalCompositeOperation = 'screen'; const gr = g.createRadialGradient(rx, ry + 12 * u, 0, rx, ry + 12 * u, 50 * u); gr.addColorStop(0, 'rgba(255,200,120,.9)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = gr; g.fillRect(rx - 50 * u, ry - 38 * u, 100 * u, 100 * u); g.globalCompositeOperation = 'source-over'; }
      st.hang(g, st.fx.rocket, rx, ry, 0.8, (hit * 0.6 + (t < EV.landing ? Math.sin(t * 14) * 1.2 : 0)) * DEG, mv, t > EV.landing ? -0.5 * smooth(clamp((t - EV.landing) * 2)) : 0);
      if (t > EV.landing + 0.6) {
        const sw = (Math.sin(t * 0.5) * 1.4 + hit) * DEG, len = my + 20, mxx = mx - Math.sin(sw) * len, myy = -20 + Math.cos(sw) * len;
        g.save(); g.translate(mxx, myy); g.rotate(sw - 0.35); g.scale(u * 1.25, u * 1.25);
        const pa = clamp(spring(t - EV.landing - 0.6, 9, 0.45), 0, 1.3), pf = clamp(spring(t - EV.landing - 1.6, 9, 0.45), 0, 1.3);
        g.save(); g.translate(9, -26); g.rotate(-0.25); g.scale(1, pa); put(g, st.fx.astro, 0); g.restore();
        if (pf > 0) { g.save(); g.translate(-4, -29); g.rotate(-0.55); g.scale(1, pf); put(g, st.fx.flag, 0); g.restore(); }
        g.restore();
      }
    }
    g.globalAlpha = 1;
    for (const [x, y, t0] of SATS) if (t > t0) st.hang(g, st.fx.sat, W * x, H * lerp(-0.15, y, drop(t, t0, 437)), 0.8, Math.sin(t * 0.4 + x * 9) * 2 * DEG, 1, Math.sin(t * 0.3 + x) * 0.3);
    if (t > 425 && t < 434) {
      const k = (t - 425) / 9, jx = W * lerp(1.12, -0.12, k), jy = H * (0.11 + Math.sin(t * 0.8) * 0.005);
      st.hang(g, st.fx.jet, jx, jy, 0.55, Math.sin(t * 1.2) * 1.5 * DEG, 1, Math.PI);
      if ((t * 1.3) % 1 < 0.18) { g.globalCompositeOperation = 'lighter'; for (const [dx, c] of [[-14, '255,70,60'], [14, '90,255,140']]) { const gr = g.createRadialGradient(jx + dx * u, jy, 0, jx + dx * u, jy, 9 * u); gr.addColorStop(0, `rgba(${c},.95)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(jx + dx * u - 9 * u, jy - 9 * u, 18 * u, 18 * u); } g.globalCompositeOperation = 'source-over'; }
    }
  }
}

// Things drawn in the world, in planet units: paths, rails, wires, trade threads.
function groundFx(g, st, t, S) {
  const c = cam(t), rad = (a, h) => { const rel = (a - c) * DEG, r = 1000 + profile.main(a) + h; return [Math.sin(rel) * r, -Math.cos(rel) * r]; };
  const vis = st.visE + 4, from = c - vis, to = c + vis;
  const run = (a0, a1, fn) => { const s0 = Math.max(a0, from), s1 = Math.min(a1, to); if (s0 < s1) fn(s0, s1); };
  const along = (a0, a1, step, fn) => { for (let a = Math.ceil(a0 / step) * step; a < a1; a += step) fn(a); };
  const arc = (a0, a1, h, w, style, dash) => { g.save(); g.strokeStyle = style; g.lineWidth = w; if (dash) g.setLineDash(dash); g.beginPath(); for (let a = a0; a <= a1; a += 0.3) { const [x, y] = rad(a, h); a === a0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); g.restore(); };
  const cobbles = (a0, a1, col) => along(a0, a1, 0.32, (a) => { const [x, y] = rad(a, -6 - (Math.round(a * 3) % 2) * 5); g.fillStyle = col; g.beginPath(); g.ellipse(x, y, 3.2, 2.2, 0, 0, 7); g.fill(); });
  // the ground carries the marks of the people on it
  run(-70, 96, (a0, a1) => arc(a0, a1, -9, 2.2, 'rgba(120,84,46,.35)', [7, 9]));
  run(212, 300, (a0, a1) => along(a0, a1, 0.55, (a) => { const [x0, y0] = rad(a, -4), [x1, y1] = rad(a + 0.25, -16); g.strokeStyle = 'rgba(70,82,40,.42)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }));
  run(303, 371, (a0, a1) => { arc(a0, a1, -10, 6, 'rgba(70,120,150,.75)'); arc(a0, a1, -8, 1.2, 'rgba(220,240,250,.5)', [10, 14]); });
  run(378, 460, (a0, a1) => arc(a0, a1, -8, 3, 'rgba(150,110,70,.3)', [3, 5]));
  // the long swell of the open ocean, the navigators' other compass
  run(463, 551, (a0, a1) => {
    const nk = S.stars > 0.3 ? 1 : 0.5, rd = sramp(t, 197.8, 199.4) * (1 - sramp(t, 206, 209));
    [[-16, 0.22, 46, 0], [-34, 0.17, 64, 1], [-58, 0.12, 90, 2]].forEach(([h, al, d, i]) => {
      g.save(); g.strokeStyle = `rgba(200,225,255,${(al + rd * 0.2) * nk})`; g.lineWidth = 2.2 - i * 0.4; g.setLineDash([d, d * 0.8]); g.lineDashOffset = -t * (16 - i * 4) - i * 30;
      g.beginPath(); for (let a = a0; a <= a1; a += 0.3) { const [x, y] = rad(a, h + Math.sin(a * 0.9 + t * 0.8 + i) * 3); a === a0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); g.restore();
    });
  });
  run(556, 606, (a0, a1) => cobbles(a0, a1, 'rgba(80,80,70,.35)'));
  run(611, 660, (a0, a1) => arc(a0, a1, -9, 2.6, 'rgba(150,90,60,.4)', [6, 8]));
  run(784, 838, (a0, a1) => cobbles(a0, a1, 'rgba(80,80,70,.35)'));
  run(916, 968, (a0, a1) => cobbles(a0, a1, 'rgba(40,40,46,.45)'));
  run(986, 1014, (a0, a1) => { arc(a0, a1, -10, 12, 'rgba(48,46,50,.85)'); arc(a0, a1, -10, 1.4, 'rgba(230,214,160,.65)', [12, 12]); });
  run(1052, 1060, (a0, a1) => arc(a0, a1, -8, 3, 'rgba(120,100,80,.4)', [4, 5]));
  run(1074, 1092, (a0, a1) => { arc(a0, a1, -10, 12, 'rgba(48,46,50,.85)'); arc(a0, a1, -10, 1.4, 'rgba(230,214,160,.65)', [12, 12]); });
  // the railway of the 1800s
  if (near(876, c, 80)) {
    g.strokeStyle = 'rgba(40,34,30,.9)'; g.lineWidth = 2.2; g.beginPath();
    for (let a = 838; a < 914; a += 0.4) { const [x, y] = rad(a, 2); a === 838 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
    g.lineWidth = 1.4; g.strokeStyle = 'rgba(70,56,44,.8)';
    for (let a = 838; a < 914; a += 0.6) { const [x0, y0] = rad(a, -1), [x1, y1] = rad(a + 0.2, -1); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  }
  const sag = (p0, p1, s, dx = 0) => { g.beginPath(); g.moveTo(p0[0] + dx, p0[1]); g.quadraticCurveTo((p0[0] + p1[0]) / 2 + dx, (p0[1] + p1[1]) / 2 + s, p1[0] + dx, p1[1]); g.stroke(); };
  // telegraph wires
  if (near(886, c, 60)) {
    g.strokeStyle = 'rgba(30,26,24,.65)'; g.lineWidth = 0.9;
    for (let i = 0; i < tgPoles.length - 1; i++) { const p = tgPoles[i], q = tgPoles[i + 1]; if (spring(t - p.tPop, 10.5, 0.46) < 0.9 || spring(t - q.tPop, 10.5, 0.46) < 0.9) continue; for (const dx of [-15, 15]) sag(rad(p.a, 148), rad(q.a, 148), 20, dx); }
  }
  // the wire that carries the light from house to house
  if (near(945, c, 70)) {
    g.strokeStyle = 'rgba(28,24,22,.7)'; g.lineWidth = 1;
    for (let i = 0; i < ROUTE.length - 1; i++) sag(rad(ROUTE[i].a, ROUTE[i].h), rad(ROUTE[i + 1].a, ROUTE[i + 1].h), 22);
  }
  // maize and potatoes set off from the Americas, back across the ocean, to feed much of the world
  if (t > 256.6 && t < 263) {
    const grow = sramp(t, 256.8, 258.2), fade = 1 - sramp(t, 260.6, 262.4), [x0, y0] = rad(706, 150), [x1, y1] = rad(678, 230), [x2, y2] = rad(650, 200);
    const segs = [[x0, y0, (x0 + x1) / 2, Math.min(y0, y1) - 70, x1, y1], [x1, y1, (x1 + x2) / 2, Math.min(y1, y2) - 70, x2, y2]];
    const pt = (s2, k) => { const [a0, b0, mx, my, a1, b1] = s2, a = 1 - k; return [a * a * a0 + 2 * a * k * mx + k * k * a1, a * a * b0 + 2 * a * k * my + k * k * b1]; };
    g.save(); g.globalAlpha = fade; g.strokeStyle = 'rgba(170,40,36,.85)'; g.lineWidth = 1.6;
    segs.forEach((s2, i) => { const k = clamp(grow * 2 - i); if (k <= 0) return; g.beginPath(); g.moveTo(s2[0], s2[1]); for (let j = 1; j <= 24; j++) { const [x, y] = pt(s2, (j / 24) * k); g.lineTo(x, y); } g.stroke(); });
    for (const [icon, t0, dur] of [['maize', 257.4, 3.6], ['potato', 258.1, 3.6]]) {
      if (t < t0) continue; const pos = clamp((t - t0) / dur) * 2, i = Math.min(1, Math.floor(Math.min(pos, 1.999))), [x, y] = pt(segs[i], pos - i), sc = sramp(t, t0, t0 + 0.4);
      g.save(); g.translate(x, y + 14); g.rotate(Math.sin(t * 3) * 0.08); g.scale(1.4 * sc, 1.4 * sc); put(g, st.fx.icons[icon], 0.3, 2, 3); g.restore();
    }
    g.restore();
  }
  if (near(420, c, 80) && t > EV.threads) {
    const tops = [[pagoda, 296], [stupa, 182], [mosque, 214], [djenne, 196]].map(([e, h]) => rad(e.a, h));
    const grow = sramp(t, EV.threads, EV.threads + 2.5);
    g.strokeStyle = 'rgba(170,40,36,.85)'; g.lineWidth = 1.6;
    const seg = (i, k) => { const [x0, y0] = tops[i], [x1, y1] = tops[i + 1], mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 60; return [x0, y0, mx, my, x1, y1, k]; };
    const pt = (s, k) => { const [x0, y0, mx, my, x1, y1] = s, a = 1 - k; return [a * a * x0 + 2 * a * k * mx + k * k * x1, a * a * y0 + 2 * a * k * my + k * k * y1]; };
    for (let i = 0; i < 3; i++) {
      const k = clamp(grow * 3 - i), s = seg(i);
      if (k <= 0) continue;
      g.beginPath(); g.moveTo(s[0], s[1]);
      for (let j = 1; j <= 24; j++) { const [x, y] = pt(s, (j / 24) * k); g.lineTo(x, y); }
      g.stroke();
    }
    // what moved along them
    const ride = (icon, from, to, t0, dur) => {
      if (t < t0) return; const k = clamp((t - t0) / dur), pos = from + (to - from) * k, i = Math.min(2, Math.floor(Math.min(pos, 2.999))), f = pos - i;
      const [x, y] = pt(seg(i), f), sc = sramp(t, t0, t0 + 0.4);
      g.save(); g.translate(x, y + 14); g.rotate(Math.sin(t * 3) * 0.08); g.scale(1.4 * sc, 1.4 * sc); put(g, st.fx.icons[icon], 0.3, 2, 3); g.restore();
    };
    ride('silk', 0, 3, EV.threads + 1.5, 6.5);
    ride('dharma', 1, 0, EV.ideas[0], 2.6);
    ride('paper', 0, 2, EV.ideas[1], 3.2);
    ride('numerals', 1, 3, EV.ideas[2], 3.6);
  }
}

function overFx(g, st, t, S) {
  const { W, H } = st, u = st.eu, c = cam(t);
  // light glinting on the sea
  if (water(c) > 0.2 || water(c - 25) > 0.2 || water(c + 25) > 0.2) {
    g.globalCompositeOperation = 'screen';
    const vis = st.visE + 5, night = S.stars > 0.5;
    for (let a = Math.floor(c - vis), i = 0; a < c + vis; a += 0.45, i++) {
      if (water(a) < 0.9) continue;
      const id = Math.round(a * 10), tw = Math.max(0, Math.sin(t * (1.6 + hash(id) * 1.4) + hash(id * 3) * 40)) ** 14;
      if (tw < 0.04) continue;
      const [x, y, rel] = st.place('main', a, -2 - hash(id * 5) * 3, t), w = (4 + hash(id * 7) * 6) * u;
      g.save(); g.translate(x, y); g.rotate(rel);
      g.fillStyle = night ? `rgba(200,220,255,${0.55 * tw})` : `rgba(255,250,235,${0.85 * tw})`; g.fillRect(-w / 2, -0.8 * u, w, 1.6 * u);
      g.restore();
    }
    g.globalCompositeOperation = 'source-over';
  }

  g.setTransform(1, 0, 0, 1, 0, 0);
  // printing began in China; movable type in China and Korea
  if (t > 207.4 && t < 215.5) {
    const k1 = drop(t, 207.8, 212.8), k2 = drop(t, 210.0, 213.2), por = st.aspectK > 0.4 ? 0 : 1;
    if (k1 > -1.3) st.hang(g, st.fx.sutra, W * (por ? 0.5 : 0.33), H * lerp(-0.25, por ? 0.23 : 0.21, k1), por ? 1.0 : 1.55, Math.sin(t * 0.7) * 2.2 * DEG + (1 - Math.min(1, k1)) * 0.05);
    if (k2 > -1.3) st.hang(g, st.fx.typetray, W * (por ? 0.5 : 0.66), H * lerp(-0.25, por ? 0.39 : 0.26, k2), por ? 0.85 : 1.3, Math.sin(t * 0.8 + 1) * 2 * DEG);
  }
  // notebook pages: the ancient world, the real one, the body drawn from life
  if (t > 228 && t < 241.5) {
    const por = st.aspectK > 0.4 ? 0 : 1, sc = por ? 0.8 : 1.15;
    [[st.fx.sketchCol, 228.6, por ? 0.26 : 0.58, por ? 0.29 : 0.16], [st.fx.sketchWing, 231.0, por ? 0.76 : 0.84, por ? 0.31 : 0.19], [st.fx.sketchBody, 236.1, por ? 0.5 : 0.3, por ? 0.15 : 0.16]].forEach(([spr, t0, x, y], i) => {
      const k = drop(t, t0, 238.9 + i * 0.25); if (t < t0 - 0.1) return;
      st.hang(g, spr, W * x, H * lerp(-0.3, y * (W / H > 2 ? 0.55 : 1), k), sc * (W / H > 2 ? 0.85 : 1), Math.sin(t * 0.6 + i * 2) * 2.4 * DEG + (i - 1) * 0.04);
    });
  }
  // In 1800, more than four in ten children died before five; today, fewer than one in twenty
  if (t > 340.2 && t < 352.2) {
    const por = st.aspectK > 0.4 ? 0 : 1, n = 10, s = por ? 1.05 : 1.3, sp = 40 * s * u;
    const k = drop(t, 340.6, 350.3), y = H * lerp(-0.32, por ? 0.25 : 0.19, k), x0 = W / 2 - ((n - 1) / 2) * sp, sw = Math.sin(t * 0.7) * 0.012;
    g.save(); g.translate(W / 2, y); g.rotate(sw); g.translate(-W / 2, -y);
    g.strokeStyle = 'rgba(200,190,175,0.32)'; g.lineWidth = Math.max(1, 0.6 * u);
    for (const xx of [x0 - sp * 0.5, x0 + (n - 0.5) * sp]) { g.beginPath(); g.moveTo(xx, -20); g.lineTo(xx, y - 17 * s * u); g.stroke(); }
    const col = sramp(t, 347.3, 348.8);
    for (let i = 0; i < n; i++) {
      const j = DOLL_FOLD.indexOf(i), f = j < 0 ? 0 : sramp(t, 342.9 + j * 0.42, 343.6 + j * 0.42) * (1 - sramp(t, 347.0 + j * 0.15, 347.8 + j * 0.15));
      const bob = Math.sin(t * 1.1 + i * 0.7) * 1.2 * u;
      g.save(); g.translate(x0 + i * sp, y + bob - 17 * s * u); g.scale(s * u, s * u * (1 - 0.9 * f)); g.translate(0, 17);
      g.globalAlpha = 1 - 0.45 * f; put(g, st.fx.doll, 0.25, 2, 3);
      if (col > 0) { g.globalAlpha = col; put(g, st.fx.dollC[(i * 3) % 5], 0, 2, 3); }
      g.restore();
    }
    g.restore(); g.globalAlpha = 1;
  }
  // look carefully, test the idea, trust the evidence: his notes, night after night
  if (t > 283 && t < 290.5) {
    const por = st.aspectK > 0.4 ? 0 : 1, k = drop(t, 283.4, 288.6);
    st.hang(g, st.fx.sidereus, W * (por ? 0.3 : 0.3), H * lerp(-0.3, por ? 0.24 : 0.19, k), por ? 0.85 : 1.2, Math.sin(t * 0.6) * 2 * DEG - 0.03);
  }
  // radio: waves rippling out from the mast, and the music drifting out of the family's front room
  if (t > EV.radio - 0.2 && t < EV.radio + 8) {
    const [mx, my] = st.place('mid', 984, 248 * 0.8, t), fade = 1 - sramp(t, EV.war - 1.4, EV.war - 0.2);
    g.save(); g.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const age = t - EV.radio - i * 0.55; if (age < 0 || age > 3.2) continue;
      const r = (14 + age * 70) * u, al = (1 - age / 3.2) * 0.5 * fade;
      g.strokeStyle = `rgba(74,62,56,${al})`; g.lineWidth = Math.max(1, 1.8 * u); g.setLineDash([10 * u, 6 * u]);
      for (const side of [-1, 1]) { g.beginPath(); g.arc(mx, my, r, side > 0 ? -0.6 : Math.PI - 0.6 + 0.6, side > 0 ? 0.35 : Math.PI + 0.6, false); g.stroke(); }
    }
    g.setLineDash([]); g.restore();
    for (let i = 0; i < 12; i++) {
      const born = EV.radio + 0.3 + i * 0.45, age = t - born; if (age < 0 || age > 3.4 || born > EV.war - 2.6) continue;
      const [hx, hy] = st.place('main', 993.6 + 1.2, 74, t), k = age / 3.4;
      const x = hx + (age * 26 + Math.sin(age * 2.4 + i) * 10) * u, y = hy - age * 34 * u;
      g.save(); g.translate(x, y); g.rotate(Math.sin(age * 2 + i) * 0.25); const sc = u * 1.1 * Math.min(1, age * 3); g.scale(sc, sc);
      g.globalAlpha = Math.min(1, (1 - k) * 1.6) * fade; put(g, st.fx.notes[i % 2], 0.25, 1, 2); g.restore();
    }
    g.globalAlpha = 1;
  }
  // Jupiter and its moons hang in front of the clouds
  if (t > EV.jupiter - 1 && t < 292) {
    const k = drop(t, EV.jupiter, 288.5), jx = W * (st.aspectK > 0.4 ? 0.7 : 0.62), jy = H * lerp(-0.2, 0.2, k), s = 1.3;
    const ml = sramp(t, EV.moons, EV.moons + 1.2), sw = Math.sin(t * 0.6) * 1.2 * DEG;
    const moons = [[0.9, 1.7, 0], [1.4, 1.1, 2], [2.1, 0.7, 4.1], [3.0, 0.45, 1.3]].map(([d, sp, ph]) => { const a = t * sp * 0.6 + ph; return { x: Math.cos(a) * d * 50 * s * u, front: Math.sin(a) > 0 }; });
    const drawMoons = (front) => { for (const m of moons) if (m.front === front && ml > 0) { g.save(); g.translate(jx, jy); g.rotate(sw); g.translate(m.x, 0); g.scale(u * 1.2, u * 1.2); g.globalAlpha = ml; put(g, st.fx.moonlet, 0); g.restore(); } };
    // a soft halo: it is the brightest thing in the night
    g.globalCompositeOperation = 'screen'; const hr = 120 * s * u, hg = g.createRadialGradient(jx, jy, 0, jx, jy, hr); hg.addColorStop(0, `rgba(255,236,200,${0.22 * clamp(k, 0, 1)})`); hg.addColorStop(1, 'rgba(255,236,200,0)'); g.fillStyle = hg; g.fillRect(jx - hr, jy - hr, hr * 2, hr * 2); g.globalCompositeOperation = 'source-over';
    drawMoons(false);
    st.hang(g, st.fx.jupiter, jx, jy, s, sw);
    drawMoons(true);
  }
  // the Pacific: a glowing wake behind the canoe, and fires on far islands, one by one
  if (t > 192 && t < 210) {
    const nk = sramp(t, 193, 195) * (1 - sramp(t, 206, 209)), ca = 505 + (t - 192) * 0.35;
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const a = ca - 6.6 - i * 0.3 - hash(i * 5) * 0.2, h = -2 - hash(i * 3) * 9, tw = 0.5 + 0.5 * Math.sin(t * (2 + hash(i) * 3) + i * 1.7);
      const al = nk * (1 - i / 46) ** 1.4 * tw * 0.8; if (al < 0.03) continue;
      const [x, y] = st.place('main', a, h, t), r = (3 + hash(i * 9) * 3) * u;
      st.stamp(g, st.dot(90, 220, 200, '170,255,230'), x, y, r, al);
    }
    ISLE_FAR.forEach(([a, t0], n) => {
      const k = sramp(t, t0, t0 + 1.2) * (1 - sramp(t, 207, 209.5)); if (k <= 0) return;
      const [x, y] = st.place('far', a + 0.3, 14, t), fl = 0.8 + 0.2 * fbm(t * 6 + n * 9, 40), r = 16 * u;
      let gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,214,140,${0.95 * k * fl})`); gr.addColorStop(0.2, `rgba(255,150,70,${0.45 * k})`); gr.addColorStop(1, 'rgba(255,120,50,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      gr = g.createLinearGradient(x, y + 3 * u, x, y + 30 * u); gr.addColorStop(0, `rgba(255,170,90,${0.35 * k * fl})`); gr.addColorStop(1, 'rgba(255,150,80,0)');
      g.fillStyle = gr; for (let j = 0; j < 4; j++) { const w = (3.5 - j * 0.7) * u, yy = y + (5 + j * 6) * u; g.fillRect(x - w + Math.sin(t * 2 + j + n) * u, yy, w * 2, 2.2 * u); }
    });
    g.globalCompositeOperation = 'source-over';
  }

  // fireflies in Galileo's garden
  if (t > 271 && t < 293) {
    const k = sramp(t, 272, 274) * (1 - sramp(t, 288, 292));
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const a = 734 + hash(i * 11) * 36 + Math.sin(t * 0.3 + i) * 0.6, h = 14 + hash(i * 13) * 110 + Math.sin(t * 0.7 + i * 2) * 10;
      const pulse = Math.max(0, Math.sin(t * (1.1 + hash(i) * 0.8) + i * 2.1)) ** 3 * k;
      if (pulse < 0.03) continue;
      const [x, y] = st.place('main', a, h, t), r = 9 * u;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(230,255,150,${pulse})`); gr.addColorStop(0.25, `rgba(190,240,110,${pulse * 0.4})`); gr.addColorStop(1, 'rgba(160,220,90,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = 'source-over';
  }
  // soot settling over the first industrial towns
  if (t > 316 && t < 350) {
    const k = sramp(t, 317, 320) * (1 - sramp(t, 346, 350));
    for (let i = 0; i < 70; i++) {
      const x = ((hash(i * 3) + Math.sin(t * 0.3 + i) * 0.01 - c * 0.002) % 1 + 1) % 1 * W, y = ((hash(i * 7) + t * 0.025 * (0.6 + hash(i))) % 1) * H * 0.85;
      g.fillStyle = `rgba(48,40,36,${0.5 * k})`; g.save(); g.translate(x, y); g.rotate(t * (0.5 + hash(i)) + i); g.fillRect(-1.6 * u, -1 * u, 3.2 * u, 2 * u); g.restore();
    }
  }
  // close-ups: the tablet, then the three inventions of writing
  if (t > EV.tablet - 0.2 && t < EV.tabletOut + 1.4) {
    const up = clamp(spring(t - EV.tablet, 5.2, 0.55), 0, 1.3), out = sramp(t, EV.tabletOut, EV.tabletOut + 1.1);
    const veil = clamp(up) * (1 - out);
    g.fillStyle = `rgba(14,9,6,${0.42 * veil})`; g.fillRect(0, 0, W, H);
    const three = sramp(t, EV.three[0] - 0.4, EV.three[0] + 0.6);
    const base = Math.min(W * 0.62, H * 0.56) / 270;
    const card = (spr, cx, cy, s, rise, rot, marks) => {
      if (rise <= 0.001) return;
      const y = cy + (1 - rise) * H * 0.9 + out * H * 0.9;
      g.save(); g.translate(cx, y); g.rotate(rot + (1 - Math.min(1, rise)) * 0.25); g.scale(s, s);
      put(g, spr, 0.6, 8, 12);
      if (marks) marks(g);
      g.restore();
    };
    const tx = lerp(W * 0.5, W * (W > H ? 0.2 : 0.22), three), ty = lerp(H * 0.42, H * 0.38, three), ts = base * lerp(1, W > H ? 0.6 : 0.42, three);
    card(st.fx.tablet, tx, ty, ts, up, -0.03, (g2) => {
      TABLET_MARKS.forEach(([kind, x, y], i) => {
        const tm = i < 8 ? EV.marks[i] : i < 11 ? EV.signs[i - 8] : EV.tally[i - 11];
        drawMark(g2, kind, x, y, clamp((t - tm) * 6));
      });
      // the reed stylus, pressing each mark in turn
      const times = [...EV.marks, ...EV.signs, ...EV.tally];
      let j = times.findIndex((tm) => t < tm + 0.35); if (j < 0) j = times.length - 1;
      const vis = sramp(t, EV.marks[0] - 1.2, EV.marks[0] - 0.6) * (1 - sramp(t, EV.tally[2] + 0.5, EV.tally[2] + 1.2));
      if (vis > 0.01) {
        const [, x1, y1] = TABLET_MARKS[j], [, x0, y0] = TABLET_MARKS[Math.max(0, j - 1)], prev = j ? times[j - 1] : times[0] - 1;
        const k = smooth(clamp((t - prev - 0.15) / Math.max(0.2, times[j] - prev - 0.3))), press = Math.exp(-(((t - times[j]) / 0.11) ** 2));
        g2.save(); g2.globalAlpha = vis; g2.translate(lerp(x0, x1, k) + 4, lerp(y0, y1, k) - 4 - (1 - press) * 10 - (1 - vis) * 120); g2.rotate(0.55); put(g2, st.fx.stylus, 0.5, 6, 8);
        g2.translate(1, -58); g2.rotate(-0.12 + Math.sin(t * 1.3) * 0.02); put(g2, st.fx.hand, 0.5, 10, 14); g2.restore();
      }
    });
    const rise2 = clamp(spring(t - EV.three[1], 5.5, 0.55), 0, 1.3), rise3 = clamp(spring(t - EV.three[2], 5.5, 0.55), 0, 1.3), s2 = base * (W > H ? 0.62 : 0.46);
    card(st.fx.oracle, W * 0.5, H * 0.38, s2, rise2, 0.04, null);
    card(st.fx.maya, W * (W > H ? 0.8 : 0.78), H * 0.38, s2, rise3, -0.05, null);
  }

  // the Moon, up close: the lander settles, a person steps down, bootprints, a flag, and the Earth in the black
  if (t > LUNAR0 - 0.2 && t < LUNAR1 + 1.6) {
    const up = clamp(spring(t - LUNAR0, 5.0, 0.6), 0, 1.25), out = sramp(t, LUNAR1, LUNAR1 + 1.3), veil = clamp(up) * (1 - out);
    g.fillStyle = `rgba(4,5,10,${0.74 * veil})`; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 110; i++) {
      const x = hash(i * 17 + 3) * W, y = hash(i * 29 + 7) * H * 0.62, tw = 0.6 + 0.4 * Math.sin(t * (1 + hash(i)) + i), rr = (0.8 + hash(i * 3) * 1.3) * st.dpr * 0.6;
      g.fillStyle = `rgba(230,236,255,${0.75 * veil * tw * (0.3 + hash(i * 5) * 0.7)})`; g.fillRect(x, y, rr, rr);
    }
    g.globalCompositeOperation = 'source-over';
    const por = W < H, base = por ? W * 1.5 / 470 : Math.max(W / 760, H * 0.95 / 470);
    const ek = drop(t, LUNAR0 + 0.6, LUNAR1 - 0.3);
    if (t > LUNAR0 + 0.5) st.hang(g, st.fx.earth, W * (por ? 0.28 : 0.22), H * lerp(-0.25, por ? 0.22 : 0.2, ek), por ? 1.5 : 2.0, Math.sin(t * 0.4) * 1.5 * DEG, 1, t * 0.03);
    const cx = W * 0.5 - (por ? 97 : 50) * base, cy = H * (por ? 0.64 : 0.68) + (1 - Math.min(1, up)) * H * 0.9 + out * H * 0.9;
    g.save(); g.translate(cx, cy); g.rotate((1 - Math.min(1, up)) * 0.2); g.scale(base, base);
    put(g, st.fx.lunar, 0.6, 8, 12);
    const ys = (x) => -40 + (x / 440) ** 2 * 70, land = LUNAR0 + 1.3, lk = smooth(clamp((t - (land - 1.4)) / 1.4));
    // bootprints, pressed in as the walker passes
    const ax = 52 + clamp((t - (land + 0.9)) / 2.2) * 92;
    for (let i = 0; i < 7; i++) {
      const px = 64 + i * 13, pk = clamp((ax - px - 4) / 5); if (pk <= 0) continue;
      const py = ys(px) + 7 + (i % 2) * 5;
      g.save(); g.translate(px, py); g.globalAlpha = pk;
      g.fillStyle = 'rgba(64,60,58,.7)'; g.beginPath(); g.ellipse(0, 0, 6.5, 2.4, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(210,206,198,.55)'; g.lineWidth = 0.8; for (let x = -4.5; x <= 4.5; x += 1.8) { g.beginPath(); g.moveTo(x, -1.7); g.lineTo(x, 1.7); g.stroke(); }
      g.restore();
    }
    // the lander comes down on its thread
    const lx = 36, ly = ys(36) + 2 - (1 - lk) * 760;
    g.strokeStyle = `rgba(210,205,195,${0.35 * (1 - out)})`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(lx + 20, ly - 125); g.lineTo(lx + 20, -900); g.stroke();
    if (t < land + 0.2) { const fl = 0.8 + 0.2 * Math.sin(t * 40), gr = g.createRadialGradient(lx, ly + 4, 0, lx, ly + 4, 40); gr.addColorStop(0, `rgba(255,220,170,${0.6 * fl * clamp((land + 0.2 - t) * 3)})`); gr.addColorStop(1, 'rgba(255,180,120,0)'); g.globalCompositeOperation = 'screen'; g.fillStyle = gr; g.fillRect(lx - 40, ly - 36, 80, 80); g.globalCompositeOperation = 'source-over'; }
    g.save(); g.translate(lx, ly); g.scale(1.35, 1.35); put(g, st.fx.lem, 0.5, 4, 6); g.restore();
    // dust, thrown out sideways where it touched
    if (t > land && t < land + 2.2) for (let i = 0; i < 8; i++) {
      const k = (t - land) / 2.2, dir = i % 2 ? 1 : -1, x = lx + dir * (20 + k * (40 + i * 9)), y = ys(x) + 2 - k * (6 + i);
      g.save(); g.translate(x, y); g.scale(0.5 + k * 0.6, 0.35 + k * 0.4); g.globalAlpha = (1 - k) * 0.55; put(g, st.fx.puffs[i % 3], 0); g.restore();
    }
    // a person, stepping down and walking out, light on their feet
    if (t > land + 0.5) {
      const pa = clamp(spring(t - land - 0.5, 9, 0.45), 0, 1.3), walking = t > land + 0.9 && t < land + 3.1, hop = walking ? Math.abs(Math.sin((t - land - 0.9) * Math.PI * 1.6)) * 7 : 0;
      g.save(); g.translate(ax, ys(ax) + 6 - hop); g.rotate(walking ? 0.08 : 0); g.scale(1.9, 1.9 * pa); put(g, st.fx.astro, 0.4, 2, 3); g.restore();
    }
    const pf = clamp(spring(t - (land + 3.2), 9, 0.45), 0, 1.3);
    if (pf > 0) { g.save(); g.translate(158, ys(158) + 5); g.scale(2.1, 2.1 * pf); put(g, st.fx.flag, 0.4, 2, 3); g.restore(); }
    g.restore();
  }

  // printed pages and pamphlets, leaving like a flock
  for (const [t0f, a0, h0, n] of [[EV.pages, press.a, 120, 34], [EV.pamphlets, coffee.a + 2, 270, 22]]) {
    if (t < t0f - 0.2 || t > t0f + 9) continue;
    const [px, py] = st.place('main', a0, h0, t);
    for (let i = 0; i < n; i++) {
      const t0 = t0f + i * 0.07, a = t - t0; if (a < 0) continue;
      const hx = 0.35 + hash(i * 3) * 0.9, hy = 0.9 + hash(i * 5) * 0.5, sp = (150 + hash(i * 7) * 120) * u;
      const x = px + (hx * a * sp) + Math.sin(a * 1.7 + i) * 30 * u * Math.min(1, a), y = py - (hy * a * sp * 0.8) + a * a * 6 * u + Math.sin(a * 2.3 + i * 2) * 14 * u;
      if (x > W + 60 || y < -60) continue;
      const flap = Math.sin(t * (9 + hash(i) * 4) + i), s = u * (1.1 + hash(i * 11) * 0.5) * Math.min(1, a * 4);
      g.save(); g.translate(x, y); g.rotate(-0.5 + Math.sin(a + i) * 0.2);
      for (const side of [-1, 1]) { g.save(); g.scale(side * s, s * (0.25 + 0.75 * Math.abs(flap))); g.rotate(flap > 0 ? -0.2 : 0.2); put(g, st.fx.page, 0); g.restore(); }
      g.restore();
    }
  }
  // the telegraph: dots and dashes running along the wire
  if (t > EV.telegraph - 0.2 && t < EV.telegraph + 7) {
    g.globalCompositeOperation = 'lighter';
    const code = [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1];
    for (let i = 0; i < tgPoles.length - 1; i++) {
      const p = tgPoles[i], q = tgPoles[i + 1];
      for (let j = 0; j < code.length; j++) {
        if (!code[j]) continue;
        const f = (t - EV.telegraph) * 0.9 - j * 0.07 - i * 0.6; if (f < 0 || f > 1) continue;
        const [x0, y0] = st.place('main', p.a, 148 * 0.92, t), [x1, y1] = st.place('main', q.a, 148 * 0.92, t), mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + 20 * u;
        const a2 = 1 - f, x = a2 * a2 * x0 + 2 * a2 * f * mx + f * f * x1 - 15 * u, y = a2 * a2 * y0 + 2 * a2 * f * my + f * f * y1, r = 6 * u;
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,240,200,.95)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    g.globalCompositeOperation = 'source-over';
  }
  // the spark: the wire glows where it has passed, and the spark leads the way
  if (t > EV.spark - 0.2 && t < ROUTE[ROUTE.length - 1].t + 2) {
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < ROUTE.length - 1; i++) {
      const A = ROUTE[i], B = ROUTE[i + 1], f = clamp((t - A.t) / (B.t - A.t)); if (f <= 0) continue;
      g.strokeStyle = `rgba(255,220,160,${0.35 * (1 - sramp(t, B.t + 3, B.t + 6))})`; g.lineWidth = Math.max(1, 1.6 * st.dpr); g.beginPath();
      for (let q = 0; q <= 16; q++) { const ff = (q / 16) * f, [x, y] = st.place('main', lerp(A.a, B.a, ff), lerp(A.h, B.h, ff) - Math.sin(ff * Math.PI) * 22, t); q ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    const sp = sparkPos(t);
    if (sp) { const [x, y] = st.place('main', sp.a, sp.h, t), r = 22 * u; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(220,235,255,.8)'); gr.addColorStop(1, 'rgba(160,200,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.globalCompositeOperation = 'source-over';
  }
  // distant fire during the wars, flickering along the horizon
  if (t > EV.war + 0.5 && t < EV.warEnd + 1) {
    const k = sramp(t, EV.war + 0.5, EV.war + 1.5) * (1 - sramp(t, EV.warEnd, EV.warEnd + 1));
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const per = 1.3 + hash(i) * 1.6, ph = ((t + hash(i * 3) * per) % per) / per, fl = Math.exp(-ph * 6) * k; if (fl < 0.03) continue;
      const [x, y] = st.place('far', c + (hash(i * 7 + Math.floor((t + hash(i * 3) * per) / per)) - 0.5) * 70, 20, t), r = (60 + hash(i * 5) * 80) * u;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,170,90,${0.7 * fl})`); gr.addColorStop(1, 'rgba(255,120,60,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = 'source-over';
  }
  // the network: a thread of light from every hand up to the satellites, between them, and on over the horizon
  if (t > EV.threadsNet - 0.5 && t < 444) {
    const k = sramp(t, EV.threadsNet - 0.3, EV.threadsNet + 2.2) * (1 - sramp(t, 438, 443));
    const sats = SATS.map((_, i) => satPos(st, t, i)).filter(Boolean);
    if (sats.length) {
      const hands = screens.map((p) => st.place('main', p.a + (p.move ? p.move(t) : 0), p.hand ?? 128, t));
      const far = [[-W * 0.08, H * 0.42], [W * 1.08, H * 0.38], [-W * 0.06, H * 0.12], [W * 1.06, H * 0.08], [W * 0.5, -H * 0.1]];
      const links = [];
      hands.forEach((h, i) => { links.push([h, sats[i % sats.length], i * 0.12]); if (i) links.push([hands[i - 1], h, 0.3 + i * 0.1, 1]); });
      for (let i = 0; i < sats.length; i++) for (let j = i + 1; j < sats.length; j++) links.push([sats[i], sats[j], 0.6 + i * 0.1]);
      sats.forEach((sp, i) => { links.push([sp, far[i % far.length], 0.9 + i * 0.15]); links.push([sp, far[(i + 2) % far.length], 1.1 + i * 0.15]); });
      g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      const mail = [];
      links.forEach(([[x0, y0], [x1, y1], d, hh], n) => {
        const kk = clamp(k * 1.8 - d * 0.5); if (kk <= 0) return;
        const mx = (x0 + x1) / 2 + (hash(n) - 0.5) * 60 * u, my = Math.min(y0, y1) - Math.abs(x1 - x0) * 0.18 - 30 * u;
        const grow = clamp(kk * 1.3);
        const P = (f) => { const a2 = 1 - f; return [a2 * a2 * x0 + 2 * a2 * f * mx + f * f * x1, a2 * a2 * y0 + 2 * a2 * f * my + f * f * y1]; };
        g.strokeStyle = `rgba(130,200,255,${0.32 * kk})`; g.lineWidth = Math.max(1, 1.3 * st.dpr);
        g.beginPath(); g.moveTo(x0, y0); for (let q = 1; q <= 24; q++) { const [x, y] = P((q / 24) * grow); g.lineTo(x, y); } g.stroke();
        for (let m = 0; m < 2; m++) {
          const f = (t * (0.35 + hash(n * 3) * 0.3) + hash(n * 7) + m * 0.5) % 1; if (f > grow) continue;
          const [px, py] = P(n % 2 ? f : 1 - f), r = 7 * u;
          st.stamp(g, st.dot(130, 200, 255, '215,240,255'), px, py, r, 0.95 * kk);
        }
        // now and then, a small paper message rides the thread from one hand to the next
        if (hh && t > EV.threadsNet + 1.2 && kk > 0.9) {
          const f = ((t - EV.threadsNet) * 0.16 + hash(n * 5)) % 1.6; if (f < 1) mail.push([P(n % 2 ? f : 1 - f), n, Math.sin(f * Math.PI)]);
        }
      });
      g.globalCompositeOperation = 'source-over';
      for (const [[px, py], n, vis] of mail) {
        g.save(); g.translate(px, py - 6 * u); g.rotate(Math.sin(t * 2 + n) * 0.18); const sc = u * 1.15 * clamp(vis * 3); g.scale(sc, sc);
        put(g, st.fx.msg[n % 4], 0.3, 1, 2); g.restore();
      }
    }
  }
}

// shadows fall away from the strongest light nearby: the fire, the torch, a low sun
function shadowDx(e, a, t, S) {
  let dx = 0;
  const lit = S.fire ? Math.min(1, S.fire.lit) : 0;
  if (lit > 0.02 && Math.abs(a) < 18) dx += clamp(a / 3.5, -1, 1) * 11 * lit * (1 - clamp((Math.abs(a) - 7) / 11));
  if (t > 77.8 && t < 100 && Math.abs(a - 193.2) < 12) dx += clamp((a - 193.2) / 3, -1, 1) * 9 * sramp(t, 77.8, 78.6);
  if (S.sun && S.sun.k > 0) dx -= Math.sign(S.sun.x) * 7 * S.sun.k * clamp((S.sun.y + 120) / 260);
  return e.flip ? -dx : dx;
}

// flocks of paper birds at dusk and dawn
const FLOCKS = [[1.5, 12, -1, 0.3, 9], [53, 63, 1, 0.24, 7], [95, 105, 1, 0.2, 6], [208, 217, -1, 0.22, 7], [229, 238, 1, 0.22, 6], [294, 303, 1, 0.22, 8], [380, 388, -1, 0.22, 6], [446, 460, 1, 0.26, 11]];
function birds(g, st, t) {
  const { W, H } = st, u = st.eu * 1.1;
  for (const [t0, t1, dir, yf, n] of FLOCKS) {
    if (t < t0 || t > t1) continue;
    const k = (t - t0) / (t1 - t0);
    for (let i = 0; i < n; i++) {
      const lag = i * 0.035 + hash(i * 3 + t0) * 0.03, kk = k - lag; if (kk < 0 || kk > 1) continue;
      const x = dir > 0 ? lerp(-0.1, 1.1, kk) * W : lerp(1.1, -0.1, kk) * W, row = (i % 2 ? 1 : -1) * Math.ceil(i / 2);
      const y = st.hy * yf + row * 14 * u + Math.abs(row) * 8 * u * 0 + Math.sin(t * 1.3 + i) * 6 * u + (Math.abs(row) * 10 * u);
      const flap = Math.sin(t * (7 + hash(i) * 2) + i * 1.7), s = u * (0.7 + hash(i * 7) * 0.3);
      g.save(); g.translate(x - dir * Math.abs(row) * 18 * u, y);
      for (const side of [-1, 1]) { g.save(); g.scale(side * s, s * (0.2 + 0.8 * Math.abs(flap)) * (flap > 0 ? 1 : -0.6)); put(g, st.fx.wing, 0); g.restore(); }
      g.fillStyle = '#2b2420'; g.beginPath(); g.ellipse(0, 0, 4 * s, 2.2 * s, 0, 0, 7); g.fill();
      g.restore();
    }
  }
}

// a river of light across the sky: a soft band, a darker dust lane, and thousands of faint stars
let MW = null;
function milkyWay(g, st, t, k, v) {
  const { W, H } = st, u = st.eu, D = Math.hypot(W, H);
  if (!MW) { const r = rng(777); MW = []; for (let i = 0; i < 1400; i++) { const s = r(), w = (r() + r() + r() + r() - 2) * 0.5; MW.push([s, w, 0.3 + r() * r() * 1.4, r() * 50, r()]); } }
  const ang = (v ? -0.42 : -0.3) + Math.sin(t * 0.01) * 0.02, cx = W * (v ? 0.46 : 0.58), cy = st.hy - H * (v ? 0.36 : 0.42), wid = H * (v ? 0.11 : 0.09);
  g.save(); g.translate(cx, cy); g.rotate(ang);
  g.globalCompositeOperation = 'screen';
  for (const [sc, al, col] of [[1, 0.13, '170,180,235'], [0.45, 0.12, '215,205,235'], [0.18, 0.1, '240,230,240']]) {
    g.save(); g.scale(1, (wid / (D * 0.5)) * sc * 2.4);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, D * 0.5); gr.addColorStop(0, `rgba(${col},${al * k})`); gr.addColorStop(0.55, `rgba(${col},${al * k * 0.5})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fillRect(-D * 0.5, -D * 0.5, D, D); g.restore();
  }
  // brighter star clouds along it
  for (let i = 0; i < 7; i++) {
    const x = (hash(i * 13 + 5) - 0.5) * D * 0.9, y = (hash(i * 7 + 1) - 0.5) * wid * 0.8, rx = D * (0.04 + hash(i * 3) * 0.05);
    g.save(); g.translate(x, y); g.scale(1, 0.45);
    const cg = g.createRadialGradient(0, 0, 0, 0, 0, rx); cg.addColorStop(0, `rgba(225,225,245,${0.09 * k})`); cg.addColorStop(1, 'rgba(225,225,245,0)');
    g.fillStyle = cg; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore();
  }
  // the dark lane of dust along its middle
  g.globalCompositeOperation = 'multiply';
  g.save(); g.translate(D * 0.05, wid * 0.12); g.scale(1, (wid / (D * 0.5)) * 0.35);
  const dg = g.createRadialGradient(0, 0, 0, 0, 0, D * 0.4); dg.addColorStop(0, `rgba(120,120,150,${0.5 * k})`); dg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = dg; g.fillRect(-D * 0.4, -D * 0.4, D * 0.8, D * 0.8); g.restore();
  g.globalCompositeOperation = 'lighter';
  for (const [s, w, sz, ph, c] of MW) {
    const x = (s - 0.5) * D * 1.1, y = w * wid * 1.2 * (1 + Math.abs(s - 0.5)), tw = 0.6 + 0.4 * Math.sin(t * (0.6 + c) + ph);
    const al = k * tw * (0.25 + 0.5 * (1 - Math.abs(w))) * (sz > 1 ? 1 : 0.6); if (al < 0.03) continue;
    g.fillStyle = c > 0.85 ? `rgba(255,228,200,${al})` : `rgba(220,230,255,${al})`;
    const rr = Math.max(0.7, sz * 0.85 * st.dpr); g.fillRect(x - rr / 2, y - rr / 2, rr, rr);
  }
  g.restore(); g.globalCompositeOperation = 'source-over';
}

// a guide star over the Pacific
function guideStar(g, st, t) {
  if (t < 191 || t > 208) return;
  const k = sramp(t, 193, 196) * (1 - sramp(t, 205, 208)), x = st.W * 0.78, y = st.hy - st.H * 0.3, u = st.eu, tw = 0.8 + 0.2 * Math.sin(t * 2.3);
  g.globalCompositeOperation = 'lighter';
  // a star path: the stars that rise, one after another, over the island ahead
  const [ix, iy] = st.place('far', 522.3, 26, t), pk = sramp(t, 197.0, 199.4) * (1 - sramp(t, 205, 208));
  if (pk > 0) {
    const mx = (x + ix) / 2 + st.W * 0.04, my = (y + iy) / 2, P = (f) => [(1 - f) * (1 - f) * x + 2 * (1 - f) * f * mx + f * f * ix, (1 - f) * (1 - f) * y + 2 * (1 - f) * f * my + f * f * iy];
    g.strokeStyle = `rgba(225,236,255,${0.5 * pk})`; g.lineWidth = Math.max(1.2, 1.3 * u); g.setLineDash([2.5 * u, 6 * u]);
    g.beginPath(); for (let f = 0; f <= pk + 0.001; f += 0.02) { const [px, py] = P(Math.min(f, pk)); f === 0 ? g.moveTo(px, py) : g.lineTo(px, py); } g.stroke(); g.setLineDash([]);
    for (let i = 1; i <= 4; i++) {
      const f = i / 5, sk = sramp(t, 197.4 + i * 0.45, 197.8 + i * 0.45) * (1 - sramp(t, 205, 208)); if (sk <= 0) continue;
      const [px, py] = P(f), r = (11 + (i % 2) * 4) * u, tt = 0.75 + 0.25 * Math.sin(t * 3 + i * 2);
      const gr = g.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(235,242,255,${0.9 * sk * tt})`); gr.addColorStop(0.3, `rgba(200,220,255,${0.3 * sk})`); gr.addColorStop(1, 'rgba(180,200,255,0)');
      g.fillStyle = gr; g.fillRect(px - r, py - r, r * 2, r * 2);
    }
  }
  // one falling star
  if (t > 195.9 && t < 197.1) {
    const f = (t - 195.9) / 1.2, sx = st.W * lerp(0.2, 0.42, f), sy = st.H * lerp(0.08, 0.2, f), al = Math.sin(f * Math.PI);
    const gr = g.createLinearGradient(sx, sy, sx - st.W * 0.07, sy - st.H * 0.035); gr.addColorStop(0, `rgba(240,246,255,${0.9 * al})`); gr.addColorStop(1, 'rgba(200,220,255,0)');
    g.strokeStyle = gr; g.lineWidth = 1.6 * u; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - st.W * 0.07, sy - st.H * 0.035); g.stroke();
  }
  const gr = g.createRadialGradient(x, y, 0, x, y, 60 * u); gr.addColorStop(0, `rgba(230,240,255,${0.9 * k * tw})`); gr.addColorStop(0.08, `rgba(200,220,255,${0.4 * k})`); gr.addColorStop(1, 'rgba(160,190,255,0)');
  g.fillStyle = gr; g.fillRect(x - 60 * u, y - 60 * u, 120 * u, 120 * u);
  g.fillStyle = `rgba(230,240,255,${0.5 * k * tw})`; g.fillRect(x - 26 * u, y - 0.6 * u, 52 * u, 1.2 * u); g.fillRect(x - 0.6 * u, y - 26 * u, 1.2 * u, 52 * u);
  g.globalCompositeOperation = 'source-over';
}


// satellites hang where the threads of light can find them
const SATS = [[0.18, 0.16, 421.8], [0.42, 0.07, 422.6], [0.58, 0.2, 423.4]];
function satPos(st, t, i) {
  const [x, y, t0] = SATS[i]; if (t < t0) return null;
  const yy = st.H * lerp(-0.15, y, drop(t, t0, 437)), sw = Math.sin(t * 0.4 + x * 9) * 2 * DEG, len = yy + 20;
  return [st.W * x - Math.sin(sw) * len, -20 + Math.cos(sw) * len];
}

function bake(mk, mkSoft, stage) {
  const mkBig = (name, box, o = {}) => new BlurSheet(name, box, Math.max(1.4, Math.min(stage.W * 0.62, stage.H * 0.56) / 270 * 1.15), o, 0);
  return bakeFx(mk, mkSoft, mkBig);
}

export const film = { keepFull: (a) => a > 1093, duration: DURATION, cam, state, entities: E, byLayer, profile, ground, clouds, bake, shadowDx, body: [110, 80, 52], fx: { sky, ground: groundFx, over: overFx } };
