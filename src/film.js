// The whole film: where everything stands on the globe, how the light and the
// sky change, and the special moments. Times come from src/timeline.js, which
// is generated from film/film.json together with the narration.
import { monotone, track, noise, fbm, smooth, sramp, clamp, spring, hash, rng, lerp, mix, shade, rgb, DEG } from './util.js';
import { put } from './paper.js';
import { KINDS } from './cutouts.js';
import { LOOKS } from './people.js';
import './kinds_nature.js';
import './kinds_built.js';
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
  [227, 616], [233, 632], [239, 648], [245, 656], [250, 664],
  [253, 694], [259, 700], [266, 708],
  [269, 742], [276, 756], [284, 766], [290, 780], [294, 806],
  [297, 814], [308, 822], [317, 830],
  [321, 864], [327, 872], [333, 880], [338, 888],
  [342, 912], [350, 930], [360, 945], [374, 958], [500, 1100],
]);

// ------------------------------------------------- paint and shape of land --
const ZONES = [
  [-200, 50, [201, 158, 92]], [57, 94, [198, 160, 98]], [101, 131, [214, 208, 194]], [137, 159, [62, 104, 138]], [163, 175, [178, 118, 84]],
  [179, 204, [150, 122, 96]], [211, 300, [150, 150, 84]], [306, 372, [204, 170, 118]], [378, 458, [214, 182, 124]], [463, 549, [44, 86, 126]],
  [556, 605, [114, 138, 86]], [612, 639, [52, 96, 132]], [645, 676, [108, 140, 80]], [684, 728, [98, 114, 90]], [736, 796, [116, 100, 88]],
  [802, 856, [98, 96, 102]], [862, 906, [120, 120, 126]], [912, 3000, [204, 170, 124]],
];
const SEAS = [[137, 159], [463, 549], [612, 639]];
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
    h += sramp(a, 684, 690) * (1 - sramp(a, 722, 728)) * 30;
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
for (const [a, v, s] of [[-70, 0, 0.3], [-40, 2, 0.26], [-4, 1, 0.3], [48, 0, 0.28], [88, 2, 0.3], [150, 1, 0.3], [170, 0, 0.28]]) add('acacia', 'far', a, { v, scale: s });
for (const [a, v] of [[-52, 0], [-28.5, 1], [-10.2, 2], [9.4, 0], [25, 1], [38, 2], [64, 1], [80, 0], [170, 2], [176, 1]]) add('rock', 'main', a, { v, z: 1 });
const R = rng(5);
function grassRun(a0, a1, step, layer, o = {}) { for (let a = a0; a < a1; a += step * (0.7 + R() * 0.8)) { if (o.skip && o.skip(a)) continue; add('grass', layer, a, { v: (R() * 6) | 0, z: R() < 0.5 ? 1 : 3, flip: R() < 0.5, scale: (o.s || 1) * (0.8 + R() * 0.5), loud: 0.25 }); } }
grassRun(-72, 96, 3.6, 'main', { skip: (a) => Math.abs(a) < 2.8 });
grassRun(-80, 98, 8, 'mid', { s: 0.7 });
grassRun(-60, 96, 6, 'front', { s: 2.0 });

// 2. Walking out of Africa -------------------------------------------------
['walkA', 'walkB', 'walkC', 'walkD'].forEach((v, i) => add('person', 'main', 0, { v, scale: P2, z: 3, from: EV.walk + i * 0.2, to: EV.raft - 0.45 + i * 0.08, pace: 7.2, move: (t) => cam(t) + [-6.5, -2.8, 0.4, 3.6][i] }));
add('fossil', 'main', 66, { over: true, y: -3, popAt: EV.walk - 1.2, loud: 0.8 });
add('raft', 'main', 0, { z: 3, from: EV.raft, to: EV.land, move: (t) => cam(t) - 0.6, y: 2 });
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
crop('wheat', [227, 229.2, 231.4, 233.6, 235.8, 238], EV.crops[0]);
add('person', 'main', 236.8, { v: 'farmer2', scale: P2, z: 2, popAt: EV.crops[0] + 0.5 });
crop('rice', [242, 244.6, 247.2], EV.crops[1]);
crop('millet', [249.6, 251.6], EV.crops[1] + 0.45);
add('person', 'main', 245.4, { v: 'riceF', scale: P2, z: 2, popAt: EV.crops[1] + 0.3, act: (t) => ({ lean: 26, front: [-40, -20], back: [-30, -20] }) });
crop('maize', [255, 257.6, 260.2], EV.crops[2]);
add('person', 'main', 258.8, { v: 'maizeF', scale: P2, z: 2, popAt: EV.crops[2] + 0.4 });
crop('potato', [265, 267.2, 269.4], EV.crops[3], { over: true });
add('person', 'main', 268.3, { v: 'andean', scale: P2, z: 2, popAt: EV.crops[3] + 0.4 });
crop('sorghum', [276, 278.6, 281.2], EV.crops[4]);
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
add('person', 'main', 347.2, { v: 'scribe', scale: P2, z: 2 });
add('person', 'main', 359.6, { v: 'wheelwright', scale: P2, z: 2, popAt: EV.wheel - 0.3,
  move: (t) => -clamp((t - EV.roll - 0.7) * 1.6, 0, 2.6),
  act: (t) => { const chase = t > EV.roll + 0.7 && t < EV.roll + 2.3; const after = t > EV.roll + 2.3; return { walk: chase ? t * 9 : undefined, lean: chase ? 12 : 2, head: after ? -6 + Math.sin(t * 2) * 3 : 0, front: after ? [-150, -60] : chase ? [-80, -10] : [-20, -30], back: after ? [-150, -60] : [20, -10] }; } });
add('wheel', 'main', 361.6, { z: 3, popAt: EV.wheel, loud: 1.2, scale: 1.2, move: (t) => { const d = t - EV.roll; return d <= 0 ? 0 : -(1.7 * d * d + 0.3 * d); } });
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
add('dhow', 'main', 469.5, { z: 2, ground: false, y: -6, move: (t) => (t - 180) * 0.15 });
for (let a = 378; a < 460; a += 8) add('palm', 'mid', a, { v: 0, scale: 0.5 });
for (let a = 462; a < 551; a += 4.4) add('wave', 'main', a, { v: (R() * 4) | 0, z: 4, loud: 0.25, ground: false, y: -2 });
for (let a = 460; a < 552; a += 6) add('wave', 'front', a, { v: (R() * 4) | 0, scale: 1.6, ground: false, loud: 0.2 });
for (const [a, v] of [[489, 0], [521, 1], [541, 0]]) { add('island', 'main', a, { v, z: 1, ground: false, y: -6 }); add('palm', 'main', a - 1.4, { v: 1, z: 1, ground: false, y: 18, scale: 0.75 }); add('palm', 'main', a + 1.6, { v: 1, z: 1, ground: false, y: 20, scale: 0.6, flip: true }); }
add('canoe', 'main', 505, { z: 3, ground: false, y: -6, move: (t) => (t - 192) * 0.35 });

// 7. Printing ---------------------------------------------------------------------
for (const [a, v] of [[562, 0], [568, 1], [589.5, 2], [596, 0]]) add('timber', 'main', a, { v, z: 0 });
add('church', 'main', 603, { z: 0, wide: 8 });
const press = add('press', 'main', 578.2, { z: 1, pulls: EV.press });
add('person', 'main', 574.6, { v: 'printer', scale: P2, z: 2, act: (t) => { const k = EV.press.reduce((s, p) => s + Math.exp(-(((t - p) / 0.35) ** 2)), 0); return { lean: 6 + k * 14, front: [-110 + k * 60, -20], back: [-100 + k * 60, -30] }; } });
add('person', 'main', 584.6, { v: 'reader', scale: P2, z: 2, act: (t) => ({ head: 24, front: [-50, -60], back: [-40, -70] }) });
for (const a of [557, 584, 609]) add('oak', 'main', a, { v: (R() * 3) | 0, z: 0, scale: 0.9 });
for (let a = 552; a < 610; a += 8) add(R() < 0.6 ? 'oak' : 'timber', 'mid', a, { v: (R() * 3) | 0, scale: 0.55 });
grassRun(552, 610, 3.2, 'main', { skip: (a) => a > 572 && a < 588 });
grassRun(552, 610, 7, 'front', { s: 2 });

// 8. Two worlds meet ------------------------------------------------------------------
add('ship', 'main', 625, { z: 3, ground: false, y: -8, move: (t) => (t - 224) * 0.5 });
for (let a = 610; a < 642; a += 4.4) add('wave', 'main', a, { v: (R() * 4) | 0, z: 4, loud: 0.25, ground: false, y: -2 });
for (let a = 608; a < 644; a += 6) add('wave', 'front', a, { v: (R() * 4) | 0, scale: 1.6, ground: false, loud: 0.2 });
add('palm', 'main', 646, { v: 1, z: 0 });
add('person', 'main', 649.4, { v: 'taino', scale: P2, z: 2, foldAt: EV.folds[0] });
crop('maize', [652, 654.4], 0, { popAt: undefined });
add('person', 'main', 655.6, { v: 'maizeF', scale: P2, z: 2, flip: true, foldAt: EV.folds[1] });
crop('potato', [657.6, 659.6], 0, { over: true, popAt: undefined });
add('person', 'main', 662, { v: 'andean', scale: P2, z: 2 });
for (let a = 644; a < 678; a += 7) add('palm', 'mid', a, { v: (R() * 2) | 0, scale: 0.5 });
grassRun(644, 678, 3.5, 'main', { skip: (a) => a > 650 && a < 661 });

// 9. Science -----------------------------------------------------------------------
add('oak', 'main', 686, { v: 1, z: 0 });
add('timber', 'main', 690.5, { v: 1, z: 0, winOn: (t) => sramp(t, 250, 252) * 0.8, winCol: [255, 190, 110] });
add('lantern', 'main', 695.2, { z: 1 });
add('person', 'main', 698.2, { v: 'galileo', scale: P2, z: 2, act: (t) => { const look = sramp(t, EV.jupiter - 1, EV.jupiter + 1); return { lean: 2 - look * 4, head: -look * 34, front: [-120 - look * 20, -20], back: [-90, -20] }; } });
add('telescope', 'main', 701, { z: 1, aim: (t) => 30 + sramp(t, EV.jupiter - 1.5, EV.jupiter + 0.5) * 18 });
for (const [a, v] of [[712, 0], [720, 2]]) add(v ? 'timber' : 'oak', 'main', a, { v, z: 0 });
for (let a = 684; a < 730; a += 8) add('oak', 'mid', a, { v: (R() * 3) | 0, scale: 0.5 });
grassRun(682, 730, 3.4, 'main', { skip: (a) => a > 693 && a < 704 });

// 10. Industry ---------------------------------------------------------------------
const dusk = (t, i) => sramp(t, 284 + i * 0.3, 285 + i * 0.3) * 0.7;
for (const [a, k, v] of [[740, 'terrace', 0], [748.5, 'factory', 0], [758, 'terrace', 1], [770.5, 'factory', 1], [786, 'terrace', 2], [794, 'terrace', 0]]) add(k, 'main', a, { v, z: 0, wide: 8, winOn: dusk, winCol: [255, 190, 110] });
const gasLamps = [754, 766, 778].map((a, i) => add('lamp', 'main', a, { v: 0, z: 2, lit: (t) => sramp(t, EV.lamps[i], EV.lamps[i] + 0.4) }));
add('person', 'main', 751, { v: 'worker', scale: P2, z: 2 });
add('person', 'main', 760, { v: 'worker2', scale: P2, z: 3, move: (t) => (t - 266) * 0.3 });
add('person', 'main', 780.5, { v: 'lady', scale: P2, z: 3, pace: 4.4, move: (t) => (t - 266) * 0.2 });
add('person', 'main', 752.2, { v: 'lamplighter', scale: P2, z: 3, pace: 4.6, move: (t) => clamp((t - 283.4) * 9, 0, 1) * 0 + clamp((t - 283.5) / (EV.lamps[2] - 283.5), 0, 1) * 25.2 - 0.2 });
const train = add('train', 'main', 690, { z: 4, scale: 0.9, from: 268, to: 292, move: (t) => Math.max(0, t - EV.train) * 7.4, winOn: (t) => sramp(t, 284, 285) });
for (let a = 734; a < 800; a += 9) add('factory', 'mid', a, { v: (R() * 2) | 0, scale: 0.5 });

// 11. Electric light ------------------------------------------------------------------
const FIRST_WIN = 9;
const cityWin = (seed, first) => (t, i) => {
  if (first && i === FIRST_WIN) return sramp(t, EV.lights, EV.lights + 0.12);
  const on = EV.lights + 2.2 + hash(seed * 97 + i * 13) ** 0.8 * (EV.lightsFull - EV.lights - 2.4);
  return sramp(t, on, on + 0.1) * (0.88 + 0.12 * Math.sin(t * 2 + i));
};
const towers = [[806, 0], [815.5, 1], [828, 2], [840, 3], [851.5, 6]].map(([a, v], i) => add('tower', 'main', a, { v, z: 0, wide: 8, winOn: cityWin(i + 1, i === 1) }));
const poles = [799, 811, 822.5, 834, 846, 858].map((a) => add('pole', 'main', a, { z: 1 }));
const eLamps = [810, 821, 833, 845].map((a, i) => add('lamp', 'main', a, { v: 1, z: 2, lit: (t) => sramp(t, EV.lights + 4 + i * 0.9, EV.lights + 4.3 + i * 0.9) }));
add('person', 'main', 818, { v: 'worker2', scale: P2, z: 3, move: (t) => (t - 291) * 0.25 });
add('person', 'main', 836.5, { v: 'lady', scale: P2, z: 3, flip: true, act: (t) => ({ head: -16, walk: undefined }) });
for (let a = 798; a < 860; a += 6) add('tower', 'mid', a, { v: (R() * 4) | 0, scale: 0.55, winOn: cityWin(40 + a, false) });

// 12. The networked world --------------------------------------------------------------
const net = (t, i) => hash(i * 7.7 + 3) < 0.5 ? 0 : sramp(t, 316 + hash(i * 7) * 3, 316.5 + hash(i * 7) * 3) * 0.75;
const glassA = add('tower', 'main', 868.5, { v: 4, z: 0, wide: 8, winOn: net, winCol: [200, 225, 255] });
const mast = add('mast', 'main', 878, { z: 0 });
const glassB = add('tower', 'main', 889.5, { v: 5, z: 0, wide: 8, winOn: net, winCol: [200, 225, 255] });
add('tower', 'main', 898, { v: 2, z: 0, winOn: net, winCol: [255, 220, 170] });
const phones = [['phoneA', 865], ['phoneB', 872.6], ['phoneC', 881.4], ['phoneD', 885.6]].map(([v, a], i) => add('person', 'main', a, { v, scale: P2, z: 2, flip: i % 2 === 1 }));
add('person', 'main', 875.2, { v: 'kid', scale: P2, z: 3, act: (t) => ({ head: -34 + Math.sin(t * 0.7) * 4, lean: -4, front: [-150, -20] }) });
for (const a of [863, 893]) add('lamp', 'main', a, { v: 1, z: 1, lit: () => 1 });
for (let a = 860; a < 908; a += 6) add('tower', 'mid', a, { v: 4 + ((R() * 3) | 0), scale: 0.55, winOn: net, winCol: [200, 225, 255] });

// 13. Blank card -------------------------------------------------------------------------
for (let a = 913, i = 0; a < 1000; a += 5 + R() * 4.5, i++) add('blank', 'main', a, { v: (R() * 5) | 0, z: R() < 0.5 ? 0 : 2, scale: 0.8 + R() * 0.6, loud: 0.9 });
for (let a = 910; a < 1010; a += 7) add('blank', 'mid', a, { v: (R() * 5) | 0, scale: 0.55 });
for (let a = 920; a < 1010; a += 14) add('blank', 'far', a, { v: (R() * 5) | 0, scale: 0.3 });

E.sort((p, q) => (p.z || 0) - (q.z || 0) || p.a - q.a);
const byLayer = {};
for (const e of E) (byLayer[e.layer] ||= []).push(e);

// -------------------------------------------------------------------- sky ---
const skyK = track([
  [0, ['#34406c', '#80628a', '#dc8c62', '#f6b76a']], [6, ['#262f5a', '#57497c', '#b0627a', '#e08f5e']], [11, ['#141b3c', '#27294f', '#4f3d63', '#8a5a62']], [16, ['#0c1230', '#131c42', '#1e2a56', '#35426e']],
  [48, ['#0c1230', '#131c42', '#1e2a56', '#35426e']], [53, ['#2c3a6a', '#6c6a96', '#e3a07a', '#f7c98a']], [58, ['#5f93c4', '#8db6d6', '#cfe0e0', '#f2e2c0']], [64, ['#7da2c4', '#a9c3d6', '#dfe6e6', '#eef0ea']],
  [72, ['#5f93c4', '#8db6d6', '#cfe0e0', '#f2e2c0']], [77.5, ['#2e3566', '#6a5a8a', '#d48a6a', '#f0b070']], [81, ['#0c1230', '#131c42', '#1e2a56', '#35426e']], [90, ['#0c1230', '#131c42', '#1e2a56', '#35426e']],
  [93, ['#2c3a6a', '#6c6a96', '#e3a07a', '#f7c98a']], [97, ['#6a9cc8', '#9cc0d8', '#e0e4d0', '#f4e0b0']], [121, ['#6a9cc8', '#9cc0d8', '#e0e4d0', '#f4e0b0']], [128, ['#7aa0c0', '#b0c4cc', '#ecdcb8', '#f6d49a']],
  [136, ['#5a7aa8', '#9a9ab0', '#e8b888', '#f8c886']], [161, ['#6a8cb4', '#a8b4c4', '#ecd0a8', '#f8d098']], [170, ['#6a9cc8', '#a4c4d4', '#e8dcc0', '#f6d8a6']], [186, ['#6a9cc8', '#a4c4d4', '#e8dcc0', '#f6d8a6']],
  [189.5, ['#3a3a70', '#8a6a8a', '#e6906a', '#f8b878']], [194, ['#081028', '#0e1838', '#182a52', '#2a3e6a']], [205, ['#081028', '#0e1838', '#182a52', '#2a3e6a']], [208, ['#3a4a7a', '#8a8aa8', '#eab08a', '#f8d0a0']],
  [212, ['#7aa4cc', '#a8c4d8', '#e2e6e0', '#f0e8d0']], [236, ['#7aa4cc', '#a8c4d8', '#e2e6e0', '#f0e8d0']], [241, ['#5a6270', '#7a808a', '#9a9a9a', '#aaa4a0']], [247, ['#4a5260', '#6a7080', '#8a8a8e', '#9a9490']],
  [250.5, ['#141b3c', '#27294f', '#4f3d63', '#8a5a62']], [253.5, ['#0a102b', '#11193c', '#1a2650', '#2e3a66']], [266, ['#0a102b', '#11193c', '#1a2650', '#2e3a66']], [269, ['#8a8a90', '#a8a49c', '#c8b8a0', '#d8c4a0']],
  [283, ['#8a8a90', '#a8a49c', '#c8b8a0', '#d8c4a0']], [287.5, ['#3a3550', '#6a5060', '#a8705a', '#c88a60']], [292, ['#070a1c', '#0c1228', '#141c38', '#24304e']], [317, ['#070a1c', '#0c1228', '#141c38', '#24304e']],
  [320, ['#05081a', '#0a1028', '#121c3c', '#1e2c50']], [339, ['#05081a', '#0a1028', '#121c3c', '#1e2c50']], [345, ['#101a3c', '#2a3060', '#6a5a7a', '#a87a7a']], [353, ['#2c3a6a', '#6c6a96', '#e3a07a', '#f7c98a']],
  [364, ['#3f6aa0', '#7aa0c8', '#e2c8b0', '#f8d8a8']],
]);
const ambK = track([
  [0, [244, 214, 196]], [6, [176, 150, 164]], [11, [96, 98, 138]], [16, [58, 70, 114]], [48, [58, 70, 114]], [53, [190, 170, 170]], [58, [255, 252, 244]], [76, [255, 250, 240]], [78.5, [170, 140, 150]],
  [81, [44, 50, 88]], [90, [44, 50, 88]], [93, [190, 170, 170]], [97, [255, 252, 244]], [128, [255, 250, 236]], [136, [255, 236, 210]], [161, [255, 244, 226]], [170, [255, 252, 244]], [187, [255, 248, 236]],
  [190, [210, 160, 150]], [194, [98, 116, 168]], [205, [98, 116, 168]], [208, [200, 180, 175]], [212, [255, 252, 244]], [237, [255, 252, 244]], [241, [200, 200, 206]], [247, [176, 176, 186]],
  [250.5, [90, 92, 130]], [253.5, [46, 54, 96]], [266, [46, 54, 96]], [269, [226, 214, 200]], [283, [216, 202, 190]], [288, [140, 112, 124]], [292, [36, 42, 76]], [317, [36, 42, 76]],
  [320, [34, 40, 74]], [339, [34, 40, 74]], [345, [90, 90, 130]], [353, [200, 182, 176]], [364, [255, 250, 240]],
]);
const moteK = track([[0, [255, 222, 170]], [12, [150, 170, 225]], [22, [150, 170, 225]], [28, [255, 190, 120]], [52, [255, 222, 170]], [80, [255, 190, 120]], [92, [255, 222, 170]], [270, [200, 190, 170]], [292, [255, 220, 170]], [318, [160, 200, 255]], [345, [255, 222, 170]]]);
// the sun only shows itself at the edges of the day
const SUNS = [[-1, 13, -430, -78, 170], [50, 58, 430, 170, -60], [74, 80, -430, -40, 170], [90.5, 97, 430, 170, -60], [186, 193, -430, -40, 170], [205, 211, 430, 170, -60], [284, 290, -430, -40, 170], [343, 362, 380, 190, -90]];
const NIGHTS = [[9, 52], [79, 93], [191, 207], [249, 268], [288, 346]];

function fireState(t) {
  let blow = 0;
  for (const b of EV.blows) blow += Math.exp(-(((t - b - 0.3) / 0.3) ** 2));
  const dt = t - EV.lit;
  let lit = dt > 0 ? (1 - Math.exp(-dt / 1.7)) * (1 + 0.1 * Math.exp(-((dt - 3.4) ** 2) / 2)) : 0;
  if (t > EV.pop) lit *= 1 + 0.42 * Math.exp(-(t - EV.pop) * 3.2);
  return { reach: sramp(t, EV.reach, EV.reach + 1.5), blow: Math.min(1.2, blow), lit, litAt: EV.lit };
}
const near = (a, c, w = 70) => Math.abs(a - c) < w;

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
  if (t > 249 && t < 275) {
    const k = sramp(t, 250, 251.5);
    lights.push({ a: 695.2, h: 54, r: 320, k: 1.0 * k * flick(5), color: [255, 170, 90] });
    emitters.push({ a: 695.2, h: 50, scale: 0.22, small: 1, lit: k, litAt: 250, seed: 5 });
  }
  if (t > 283 && t < 300) {
    gasLamps.forEach((l, i) => { const k = l.lit(t); if (k > 0) lights.push({ a: l.a, h: 140, r: 300, k: 0.9 * k, color: [255, 210, 130] }); });
    for (const a of [748.5, 770.5]) lights.push({ a, h: 60, r: 340, k: 0.5 * sramp(t, 284, 286), color: [255, 180, 100] });
  }
  if (t > 290 && t < 322) {
    towers.forEach((tw, i) => { let n = 0; for (let w = 0; w < 24; w++) n += tw.winOn(t, w); lights.push({ a: tw.a, h: 140, r: 420, k: Math.min(1, n / 12) * 0.85, color: [255, 200, 130] }); });
    eLamps.forEach((l) => { const k = l.lit(t); if (k > 0) lights.push({ a: l.a + 0.3, h: 130, r: 300, k, color: [255, 236, 200] }); });
  }
  const screen = sramp(t, EV.screens, EV.screens + 1.4);
  if (t > 312 && t < 347) {
    for (const tw of [glassA, glassB]) lights.push({ a: tw.a, h: 200, r: 420, k: 0.6 * sramp(t, 316, 319), color: [190, 215, 255] });
    for (const p of phones) lights.push({ a: p.a, h: 110, r: 170, k: 0.9 * screen, color: [130, 180, 255] });
    lights.push({ a: 863, h: 130, r: 280, k: 0.8, color: [255, 236, 210] }, { a: 893, h: 130, r: 280, k: 0.8, color: [255, 236, 210] });
  }
  // smoke from the chimneys and the engine
  if (t > 266 && t < 300) {
    for (const a of [748.5, 770.5]) smoke.push({ a: a + 0.6, h: 272, t0: 262, size: 1.4, life: 7, every: 0.55, rise: 260, drift: 5 });
    if (t > 268) smoke.push({ a: train.a, move: train.move, h: 96, t0: EV.train - 0.5, size: 0.9, life: 3.2, every: 0.18, rise: 120, drift: 0, alpha: 0.9, t1: 292 });
  }
  let nightK = 0; for (const [a0, a1] of NIGHTS) nightK = Math.max(nightK, sramp(t, a0, a0 + 5) * (1 - sramp(t, a1 - 4, a1)));
  let sun = null;
  for (const [t0, t1, x, y0, y1] of SUNS) if (t > t0 && t < t1) sun = { x, y: lerp(y0, y1, smooth((t - t0) / (t1 - t0))), k: 1 };
  if (t > 343) sun = { x: 380, y: lerp(190, -90, smooth((t - 343) / 19)), k: 1 };
  const pull = sramp(t, EV.pull, EV.pull + 12);
  let zoom = 1;
  zoom *= lerp(1, 1.3, smooth(clamp((t - 6) / 20))) * (1 - sramp(t, 46, 55)) + sramp(t, 46, 55);
  zoom *= 1 + 0.2 * sramp(t, 79, 83) * (1 - sramp(t, 89, 92));
  zoom *= 1 + 0.08 * sramp(t, 160, 162) * (1 - sramp(t, 166, 169));
  zoom *= 1 + 0.12 * sramp(t, 296, 300) * (1 - sramp(t, 312, 318));
  return {
    fire, lights, emitters, smoke,
    sky: skyK(t), ambient: ambK(t), ground: null,
    stars: nightK * (t > 191 && t < 207 ? 1.25 : 1) + pull,
    sun, cloud: 1 - nightK * 0.4,
    snow: sramp(t, 61.5, 63.5) * (1 - sramp(t, 68.5, 70)),
    motes: lerp(0.5, 0.3, sramp(t, 4, 14)) + 0.3 * clamp(fire.lit) * (t < 55), moteColor: moteK(t),
    stencil: sramp(t, EV.hand + 0.3, EV.hand + 1.4),
    screen, blink: sramp(t, 300, 302),
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
  guideStar(g, st, t);
  // the moon over the first fire
  if (t > 12 && t < 58) {
    const y = H * lerp(-0.12, 0.17, drop(t, 12.5, 51.5));
    const gl = g.createRadialGradient(W * 0.71, y, 0, W * 0.71, y, 230 * u);
    gl.addColorStop(0, 'rgba(210,222,255,0.2)'); gl.addColorStop(1, 'rgba(200,215,255,0)');
    g.globalCompositeOperation = 'screen'; g.fillStyle = gl; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
    st.hang(g, st.fx.moon, W * 0.71, y, 1, Math.sin(t * 0.5) * 1.6 * DEG * (1 + 3 * Math.exp(-Math.max(0, t - 12.5) / 4)), 1, -0.35);
  }
  // Jupiter, and four moons in a line, as Galileo drew them
  if (t > 253 && t < 270) {
    const k = drop(t, EV.jupiter, 266.5), jx = W * (st.aspectK > 0.4 ? 0.7 : 0.62), jy = H * lerp(-0.2, 0.2, k), s = 1.3;
    const ml = sramp(t, EV.moons, EV.moons + 1.2), sw = Math.sin(t * 0.6) * 1.2 * DEG;
    const moons = [[0.9, 1.7, 0], [1.4, 1.1, 2], [2.1, 0.7, 4.1], [3.0, 0.45, 1.3]].map(([d, sp, ph]) => { const a = t * sp * 0.6 + ph; return { x: Math.cos(a) * d * 50 * s * u, front: Math.sin(a) > 0 }; });
    const drawMoons = (front) => { for (const m of moons) if (m.front === front && ml > 0) { g.save(); g.translate(jx, jy); g.rotate(sw); g.translate(m.x, 0); g.scale(u * 1.2, u * 1.2); g.globalAlpha = ml; put(g, st.fx.moonlet, 0); g.restore(); } };
    drawMoons(false);
    st.hang(g, st.fx.jupiter, jx, jy, s, sw);
    drawMoons(true);
  }
  // an aeroplane on a thread, a rocket pulled up to the Moon, satellites
  if (t > 317 && t < 345) {
    const mx = W * (st.aspectK > 0.4 ? 0.74 : 0.7), my = H * lerp(-0.2, 0.16, drop(t, 319.2, 343));
    const hit = t > EV.landing ? Math.exp(-(t - EV.landing) * 0.9) * Math.sin((t - EV.landing) * 5) * 7 : 0;
    st.hang(g, st.fx.moon, mx, my, 1.25, (Math.sin(t * 0.5) * 1.4 + hit) * DEG, 1, -0.35);
    if (t > EV.rocket - 0.5 && t < 343) {
      const [gx, gy] = st.place('main', 866, 0, t), k = smooth(clamp((t - EV.rocket) / (EV.landing - EV.rocket)));
      const rx = lerp(gx, mx - 18 * u, k), ry = lerp(gy - 20 * u, my - 14 * u, k ** 1.4);
      if (t < EV.landing + 0.2 && t > EV.rocket) { g.globalCompositeOperation = 'screen'; const gr = g.createRadialGradient(rx, ry + 12 * u, 0, rx, ry + 12 * u, 50 * u); gr.addColorStop(0, 'rgba(255,200,120,.9)'); gr.addColorStop(1, 'rgba(255,140,60,0)'); g.fillStyle = gr; g.fillRect(rx - 50 * u, ry - 38 * u, 100 * u, 100 * u); g.globalCompositeOperation = 'source-over'; }
      st.hang(g, st.fx.rocket, rx, ry, 0.8, (hit * 0.6 + (t < EV.landing ? Math.sin(t * 14) * 1.2 : 0)) * DEG, 1, t > EV.landing ? -0.5 * smooth(clamp((t - EV.landing) * 2)) : 0);
    }
    if (t > 317.5 && t < 325) { const k = (t - 317.6) / 6.4; st.hang(g, st.fx.plane, W * lerp(-0.1, 1.15, k), H * (0.3 + Math.sin(t * 2) * 0.01), 0.9, Math.sin(t * 1.7) * 3 * DEG, 1, Math.sin(t * 1.3) * 0.06); }
    for (const [x, y, t0] of [[0.2, 0.17, 329.4], [0.44, 0.08, 330.6]]) if (t > t0) st.hang(g, st.fx.sat, W * x, H * lerp(-0.15, y, drop(t, t0, 343)), 0.8, Math.sin(t * 0.4 + x * 9) * 2 * DEG, 1, Math.sin(t * 0.3 + x) * 0.3);
  }
}

// Things drawn in the world, in planet units: rails, wires, trade threads.
function groundFx(g, st, t, S) {
  const c = cam(t), rad = (a, h) => { const rel = (a - c) * DEG, r = 1000 + profile.main(a) + h; return [Math.sin(rel) * r, -Math.cos(rel) * r]; };
  if (near(765, c, 90)) {
    g.strokeStyle = 'rgba(40,34,30,.9)'; g.lineWidth = 2.2; g.beginPath();
    for (let a = 728; a < 802; a += 0.4) { const [x, y] = rad(a, 2); a === 728 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
    g.lineWidth = 1.4; g.strokeStyle = 'rgba(70,56,44,.8)';
    for (let a = 728; a < 802; a += 0.6) { const [x0, y0] = rad(a, -1), [x1, y1] = rad(a + 0.2, -1); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  }
  if (near(828, c, 90)) {
    g.strokeStyle = 'rgba(30,26,24,.7)'; g.lineWidth = 0.9;
    for (let i = 0; i < poles.length - 1; i++) {
      const p = poles[i], q = poles[i + 1], k = sramp(t, 299 + i * 0.6, 301 + i * 0.6);
      if (spring(t - p.tPop, 10.5, 0.46) < 0.9 || spring(t - q.tPop, 10.5, 0.46) < 0.9) continue;
      for (const dx of [-17, 17]) { const [x0, y0] = rad(p.a, 160), [x1, y1] = rad(q.a, 160); g.beginPath(); g.moveTo(x0 + dx, y0); g.quadraticCurveTo((x0 + x1) / 2 + dx, (y0 + y1) / 2 + 26, x1 + dx, y1); g.stroke(); }
    }
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
  const { W, H } = st, u = st.eu;
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
        g2.save(); g2.globalAlpha = vis; g2.translate(lerp(x0, x1, k) + 4, lerp(y0, y1, k) - 4 - (1 - press) * 10); g2.rotate(0.55); put(g2, st.fx.stylus, 0.5, 6, 8); g2.restore();
      }
    });
    const rise2 = clamp(spring(t - EV.three[1], 5.5, 0.55), 0, 1.3), rise3 = clamp(spring(t - EV.three[2], 5.5, 0.55), 0, 1.3), s2 = base * (W > H ? 0.62 : 0.46);
    card(st.fx.oracle, W * 0.5, H * 0.38, s2, rise2, 0.04, null);
    card(st.fx.maya, W * (W > H ? 0.8 : 0.78), H * 0.38, s2, rise3, -0.05, null);
  }
  // pages leaving the press like a flock
  if (t > EV.pages - 0.2 && t < EV.pages + 9) {
    const [px, py] = st.place('main', press.a, 120, t);
    for (let i = 0; i < 34; i++) {
      const t0 = EV.pages + i * 0.07, a = t - t0; if (a < 0) continue;
      const hx = 0.35 + hash(i * 3) * 0.9, hy = 0.9 + hash(i * 5) * 0.5, sp = (150 + hash(i * 7) * 120) * u;
      const x = px + (hx * a * sp) + Math.sin(a * 1.7 + i) * 30 * u * Math.min(1, a), y = py - (hy * a * sp * 0.8) + a * a * 6 * u + Math.sin(a * 2.3 + i * 2) * 14 * u;
      if (x > W + 60 || y < -60) continue;
      const flap = Math.sin(t * (9 + hash(i) * 4) + i), s = u * (1.1 + hash(i * 11) * 0.5) * Math.min(1, a * 4);
      g.save(); g.translate(x, y); g.rotate(-0.5 + Math.sin(a + i) * 0.2);
      for (const side of [-1, 1]) { g.save(); g.scale(side * s, s * (0.25 + 0.75 * Math.abs(flap))); g.rotate(flap > 0 ? -0.2 : 0.2); put(g, st.fx.page, 0); g.restore(); }
      g.restore();
    }
  }
  // the network: threads of light between people and places, and beyond the horizon
  if (t > EV.threadsNet - 0.5 && t < 346) {
    const k = sramp(t, EV.threadsNet, EV.threadsNet + 2) * (1 - sramp(t, 340, 345));
    const pts = [...phones.map((p) => st.place('main', p.a, 118, t)), st.place('main', glassA.a, 340, t), st.place('main', mast.a, 255, t), st.place('main', glassB.a, 290, t), [-W * 0.1, H * 0.25], [W * 1.1, H * 0.3], [-W * 0.05, H * 0.55]];
    g.globalCompositeOperation = 'lighter';
    const pairs = [[0, 4], [1, 5], [2, 5], [3, 6], [4, 5], [5, 6], [4, 7], [6, 8], [5, 9], [0, 2], [1, 3], [7, 8]];
    pairs.forEach(([i, j], n) => {
      const [x0, y0] = pts[i], [x1, y1] = pts[j], mx = (x0 + x1) / 2, my = Math.min(y0, y1) - Math.abs(x1 - x0) * 0.35 - 40 * u;
      const kk = clamp(k * 2.2 - n * 0.08); if (kk <= 0) return;
      g.strokeStyle = `rgba(120,190,255,${0.35 * kk})`; g.lineWidth = 1.4 * st.dpr;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx, my, x1, y1); g.stroke();
      const f = ((t * 0.5 + hash(n) ) % 1), a = 1 - f, px = a * a * x0 + 2 * a * f * mx + f * f * x1, py = a * a * y0 + 2 * a * f * my + f * f * y1;
      const gr = g.createRadialGradient(px, py, 0, px, py, 8 * u); gr.addColorStop(0, `rgba(200,235,255,${0.9 * kk})`); gr.addColorStop(1, 'rgba(120,190,255,0)');
      g.fillStyle = gr; g.fillRect(px - 8 * u, py - 8 * u, 16 * u, 16 * u);
    });
    g.globalCompositeOperation = 'source-over';
  }
}

function bake(mk, mkSoft, stage) {
  const mkBig = (name, box, o = {}) => new BlurSheet(name, box, Math.max(1.4, Math.min(stage.W * 0.62, stage.H * 0.56) / 270 * 1.15), o, 0);
  return bakeFx(mk, mkSoft, mkBig);
}

// a guide star over the Pacific
function guideStar(g, st, t) {
  if (t < 191 || t > 208) return;
  const k = sramp(t, 193, 196) * (1 - sramp(t, 205, 208)), x = st.W * 0.78, y = st.hy - st.H * 0.3, u = st.eu, tw = 0.8 + 0.2 * Math.sin(t * 2.3);
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y, 0, x, y, 60 * u); gr.addColorStop(0, `rgba(230,240,255,${0.9 * k * tw})`); gr.addColorStop(0.08, `rgba(200,220,255,${0.4 * k})`); gr.addColorStop(1, 'rgba(160,190,255,0)');
  g.fillStyle = gr; g.fillRect(x - 60 * u, y - 60 * u, 120 * u, 120 * u);
  g.fillStyle = `rgba(230,240,255,${0.5 * k * tw})`; g.fillRect(x - 26 * u, y - 0.6 * u, 52 * u, 1.2 * u); g.fillRect(x - 0.6 * u, y - 26 * u, 1.2 * u, 52 * u);
  g.globalCompositeOperation = 'source-over';
}

export const film = { duration: DURATION, cam, state, entities: E, byLayer, profile, ground, clouds, bake, body: [84, 62, 44], fx: { sky, ground: groundFx, over: overFx } };
