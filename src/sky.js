// Sky props, smoke, and the big close-up cards that rise in front of the camera.
import { ellipse, strip, KRAFT } from './paper.js';
import { bakeFlames, bakeSky } from './cutouts.js';
import { rng, shade, rgb } from './util.js';

const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

export function bakeFx(mk, mkSoft, mkBig) {
  const S = bakeSky(mkSoft);
  S.flames = bakeFlames(mk);
  const r = rng(77);
  S.puffs = [0, 1, 2].map((v) => {
    const pts = []; for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, rr = 16 + r() * 7; pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.8]); }
    return mk('puff' + v, [-26, -24, 26, 24], { pad: 6 }).piece(pts, ['#8e8a86', '#a09a94', '#7a7672'][v], { round: 7, rough: 1.6, seg: 8, rim: 0.3 }).finish({ shadowBlur: 3 });
  });
  // Jupiter and the four moons Galileo saw
  S.jupiter = mkSoft('jupiter', [-46, -46, 46, 46], { pad: 6 }).piece(ellipse(0, 0, 40, 38, 24), '#d6b48a', { round: 8, rough: 0.6, paint: (g) => { for (const [y, h, c] of [[-26, 6, '#b88a62'], [-12, 8, '#a8704e'], [4, 5, '#c79a72'], [14, 9, '#a8704e'], [28, 5, '#b88a62']]) { g.fillStyle = c; g.fillRect(-44, y, 88, h); } g.fillStyle = '#b4523a'; g.beginPath(); g.ellipse(14, 18, 8, 4, 0, 0, 7); g.fill(); } }).finish({ shadowBlur: 5 });
  S.moonlet = mkSoft('moonlet', [-7, -7, 7, 7], { pad: 4 }).piece(ellipse(0, 0, 5.5, 5.5, 10), '#efe6d2', { round: 2 }).finish({ shadowBlur: 2 });
  // the Wright Flyer, more or less
  S.plane = mk('plane', [-70, -30, 70, 26])
    .piece(rect(-64, -22, 64, -16), '#e8dcc0', { round: 2 }).piece(rect(-64, 6, 64, 12), '#e8dcc0', { round: 2, lift: 1.4 })
    .piece(rect(-40, -16, -37, 6), '#5b4331', { round: 0.5, lift: 1 }).piece(rect(-4, -16, -1, 6), '#5b4331', { round: 0.5, lift: 1 }).piece(rect(34, -16, 37, 6), '#5b4331', { round: 0.5, lift: 1 })
    .piece(rect(52, -10, 70, -6), '#e8dcc0', { round: 1, lift: 1 }).piece(rect(-74, -6, -60, 4), '#e8dcc0', { round: 1, lift: 1 })
    .piece(ellipse(-10, -2, 5, 3, 8), '#4a3a30', { round: 1, lift: 1.2 }).finish({ shadowBlur: 4 });
  S.rocket = mk('rocket', [-16, -120, 16, 14])
    .piece([[-10, 10], [-10, -90], [-6, -104], [0, -116], [6, -104], [10, -90], [10, 10]], '#ece8de', { round: 3, paint: (g) => { g.fillStyle = '#2a2628'; g.fillRect(-10, -40, 20, 8); g.fillRect(-10, -6, 20, 6); g.fillRect(-10, -80, 20, 4); } })
    .piece([[-10, 0], [-18, 12], [-10, 10]], '#2a2628', { round: 1, lift: 1 }).piece([[10, 0], [18, 12], [10, 10]], '#2a2628', { round: 1, lift: 1 }).finish({ shadowBlur: 3 });
  // a bird is two wings of dark paper
  S.wing = mk('wing', [-2, -12, 30, 5], { pad: 4 }).piece([[0, -1], [8, -7], [18, -10], [28, -9], [16, -4], [6, 3]], '#2b2420', { round: 2, rough: 0.4, rim: 0.2, thick: 0.6, lift: 0 }).finish({ shadowBlur: 2 });
  S.sat = mk('sat', [-46, -14, 46, 14]).piece(rect(-10, -10, 10, 10), '#c9a24a', { round: 2 }).piece(rect(-44, -6, -14, 6), '#3a5a8a', { round: 1, lift: 1, paint: (g) => { g.strokeStyle = 'rgba(200,220,255,.5)'; g.lineWidth = 0.6; for (let x = -40; x < -14; x += 6) { g.beginPath(); g.moveTo(x, -6); g.lineTo(x, 6); g.stroke(); } } }).piece(rect(14, -6, 44, 6), '#3a5a8a', { round: 1, lift: 1 }).finish({ shadowBlur: 3 });
  // printed pages that fly like birds: one wing, drawn twice
  S.page = mk('page', [-2, -16, 26, 16], { pad: 4 }).piece(rect(0, -14, 24, 14), '#f1e8d2', { round: 1, rough: 0.3, rim: 0.3, paint: (g) => { g.fillStyle = 'rgba(40,30,25,.55)'; for (let y = -10; y < 12; y += 3) g.fillRect(3, y, 17 - (y > 8 ? 8 : 0), 1); } }).finish({ shadowBlur: 2 });
  // what travelled the roads: an idea, a sheet of paper, the numerals
  S.icons = {
    dharma: mk('ic-dharma', [-16, -16, 16, 16], { pad: 4 }).piece(ellipse(0, 0, 14, 14, 18), '#d9a83a', { round: 3, paint: (g) => { g.strokeStyle = '#7a4a1a'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, 10, 0, 7); g.stroke(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.moveTo(Math.cos(a) * 3, Math.sin(a) * 3); g.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); g.stroke(); } g.beginPath(); g.arc(0, 0, 2.6, 0, 7); g.fill(); } }).finish({ shadowBlur: 3 }),
    paper: mk('ic-paper', [-14, -16, 14, 16], { pad: 4 }).piece(rect(-12, -15, 12, 15), '#f3ead2', { round: 1, rim: 0.4, paint: (g) => { g.fillStyle = 'rgba(160,130,90,.3)'; for (let i = 0; i < 30; i++) g.fillRect(-11 + Math.random() * 22, -14 + Math.random() * 28, 2, 0.5); } }).finish({ shadowBlur: 3 }),
    numerals: mk('ic-num', [-24, -14, 24, 14], { pad: 4 }).piece(rect(-22, -12, 22, 12), '#efe4c8', { round: 2, rim: 0.4, paint: (g) => { g.fillStyle = '#3a2a20'; g.font = '600 15px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1 2 3 0', 0, 1); } }).finish({ shadowBlur: 3 }),
    silk: mk('ic-silk', [-18, -12, 18, 12], { pad: 4 }).piece(rect(-16, -8, 16, 8), '#b23a3a', { round: 4, paint: (g) => { g.fillStyle = 'rgba(240,200,90,.7)'; g.fillRect(-16, -2, 32, 3); } }).piece(ellipse(16, 0, 3, 8, 8), '#8a2a2a', { round: 1, lift: 1 }).finish({ shadowBlur: 3 }),
  };
  // ---- close-up cards ------------------------------------------------------
  // A clay tablet from Uruk: round number-impressions, then three incised signs.
  const clay = '#b88a5e';
  S.tablet = mkBig('tablet', [-130, -96, 130, 96], { pad: 14 }).piece([[-120, -80, 18], [120, -86, 18], [124, 84, 18], [-122, 88, 18]], clay, { round: 26, rough: 2.2, seg: 18, rim: 0.2, lift: 4, thick: 4, paint: (g) => { const rr = rng(3); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${rr() < 0.5 ? '90,60,35' : '230,200,160'},${0.06 + rr() * 0.08})`; g.beginPath(); g.arc(-120 + rr() * 240, -86 + rr() * 172, 1 + rr() * 3, 0, 7); g.fill(); } g.strokeStyle = 'rgba(80,50,28,.28)'; g.lineWidth = 2; for (const y of [-26, 30]) { g.beginPath(); g.moveTo(-112, y); g.lineTo(112, y + 2); g.stroke(); } g.beginPath(); g.moveTo(-10, -84); g.lineTo(-8, 86); g.stroke(); } }).finish({ shadowBlur: 10 });
  S.stylus = mkBig('stylus', [-6, -150, 8, 6], { pad: 6 }).piece([[-4, 0], [4, 0], [5, -146], [-3, -146]], '#c9b07a', { round: 2, paint: (g) => { g.fillStyle = 'rgba(120,90,40,.4)'; for (let y = -20; y > -146; y -= 30) g.fillRect(-4, y, 9, 2); } }).finish({ shadowBlur: 5 });
  S.oracle = mkBig('oracle', [-80, -110, 80, 110], { pad: 14 }).piece([[-30, -104], [26, -100], [40, -60], [70, 20], [64, 90], [0, 104], [-60, 90], [-70, 30], [-46, -40]], '#e8dcc0', { round: 18, rough: 2, lift: 4, thick: 4, paint: (g) => { g.strokeStyle = 'rgba(70,50,35,.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-10, -30); g.lineTo(-10, 10); g.lineTo(6, 20); g.moveTo(-10, -10); g.lineTo(-22, 0); g.stroke(); g.strokeStyle = 'rgba(50,35,25,.85)'; g.lineWidth = 3; g.beginPath(); g.arc(-30, 46, 10, 0, 7); g.stroke(); g.beginPath(); g.arc(-30, 46, 1.6, 0, 7); g.stroke(); g.beginPath(); g.moveTo(16, 30); g.lineTo(6, 62); g.moveTo(14, 38); g.lineTo(28, 62); g.stroke(); g.beginPath(); g.moveTo(40, -2); g.lineTo(40, 30); g.moveTo(30, 6); g.lineTo(40, -2); g.lineTo(50, 6); g.moveTo(30, 24); g.lineTo(40, 16); g.lineTo(50, 24); g.stroke(); } }).finish({ shadowBlur: 10 });
  S.maya = mkBig('maya', [-80, -86, 80, 86], { pad: 14 }).piece([[-74, -80, 20], [74, -80, 20], [74, 80, 20], [-74, 80, 20]], '#9aa08e', { round: 26, rough: 1.6, lift: 4, thick: 4, paint: (g) => { g.strokeStyle = 'rgba(40,40,32,.75)'; g.lineWidth = 3.4; g.beginPath(); g.roundRect ? g.roundRect(-56, -60, 112, 92, 22) : g.rect(-56, -60, 112, 92); g.stroke(); g.fillStyle = 'rgba(40,40,32,.75)'; g.beginPath(); g.arc(-18, -24, 9, 0, 7); g.fill(); g.beginPath(); g.arc(20, -24, 9, 0, 7); g.fill(); g.fillRect(-26, 4, 52, 8); g.fillRect(-46, 46, 92, 10); for (const x of [-30, 0, 30]) { g.beginPath(); g.arc(x, 66, 6, 0, 7); g.fill(); } } }).finish({ shadowBlur: 10 });
  return S;
}

// The marks on the tablet, in tablet units: [kind, x, y]
export const TABLET_MARKS = [
  ['dot', -88, -60], ['dot', -66, -60], ['cup', -44, -58], ['dot', -88, -40], ['dot', -66, -40], ['cup', -44, -40], ['cup', 20, -54], ['dot', 44, -56],
  ['barley', -70, 6], ['beer', 30, 4], ['sheep', -66, 60], ['dot', 34, 58], ['dot', 56, 58], ['cup', 80, 58],
];
// Draw one impressed or incised mark into the clay (g in tablet units). k: 0..1 how far pressed.
export function drawMark(g, kind, x, y, k) {
  if (k <= 0) return;
  g.save(); g.translate(x, y); g.globalAlpha *= Math.min(1, k * 1.4);
  const deep = 'rgba(70,42,22,.85)', lit = 'rgba(240,210,170,.55)';
  const imp = (draw) => { g.save(); g.translate(1.2, 1.4); g.strokeStyle = lit; g.fillStyle = lit; draw(); g.restore(); g.strokeStyle = deep; g.fillStyle = deep; draw(); };
  g.lineCap = 'round'; g.lineWidth = 3.2;
  if (kind === 'dot') imp(() => { g.beginPath(); g.arc(0, 0, 7.5, 0, 7); g.fill(); });
  else if (kind === 'cup') imp(() => { g.beginPath(); g.ellipse(0, 0, 6, 9, 0.3, 0, 7); g.fill(); });
  else if (kind === 'barley') imp(() => { g.beginPath(); g.moveTo(0, 22); g.lineTo(0, -24); for (let i = 0; i < 4; i++) { const yy = -18 + i * 9; g.moveTo(-9, yy + 5); g.lineTo(0, yy); g.lineTo(9, yy + 5); } g.stroke(); });
  else if (kind === 'beer') imp(() => { g.beginPath(); g.moveTo(-12, -18); g.lineTo(12, -18); g.lineTo(12, 4); g.lineTo(0, 22); g.lineTo(-12, 4); g.closePath(); g.stroke(); g.beginPath(); for (let i = -8; i <= 8; i += 6) { g.moveTo(i, -14); g.lineTo(i, 2); } g.stroke(); });
  else if (kind === 'sheep') imp(() => { g.beginPath(); g.arc(0, 0, 15, 0, 7); g.moveTo(-15, 0); g.lineTo(15, 0); g.moveTo(0, -15); g.lineTo(0, 15); g.stroke(); });
  g.restore();
}
