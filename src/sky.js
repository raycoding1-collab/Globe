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
  // printing in East Asia: a woodblock-printed scroll sheet, and a tray of cast metal type
  {
    const r2 = rng(868);
    S.sutra = mk('sutra', [-92, -64, 92, 64], { pad: 8 }).piece([[-88, -60], [88, -58], [86, 60], [-86, 58]], '#efe3c4', { round: 2, rough: 0.6, paint: (g) => {
      g.fillStyle = 'rgba(40,30,26,.85)';
      // a printed picture panel on the right, then columns of text read right to left
      g.strokeStyle = 'rgba(40,30,26,.8)'; g.lineWidth = 1.4; g.strokeRect(34, -50, 46, 100);
      g.beginPath(); g.arc(57, -14, 10, 0, 7); g.stroke(); g.beginPath(); g.moveTo(42, 30); g.quadraticCurveTo(57, -4, 72, 30); g.closePath(); g.stroke();
      for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(57 + Math.cos(k * 0.7) * 16, -14 + Math.sin(k * 0.7) * 16); g.lineTo(57 + Math.cos(k * 0.7) * 22, -14 + Math.sin(k * 0.7) * 22); g.stroke(); }
      for (let c = 0; c < 9; c++) for (let row = 0; row < 9; row++) {
        const x = 22 - c * 12, y = -50 + row * 11.5; if (r2() < 0.08) continue;
        g.lineWidth = 1.5; g.beginPath();
        for (let st = 0; st < 3 + ((r2() * 3) | 0); st++) { const x0 = x - 4 + r2() * 6, y0 = y + r2() * 7, hz = r2() < 0.5; g.moveTo(x0, y0); g.lineTo(x0 + (hz ? 5 + r2() * 3 : (r2() - 0.5) * 2), y0 + (hz ? (r2() - 0.5) * 1.5 : 4 + r2() * 4)); }
        g.stroke();
      }
      g.fillStyle = 'rgba(178,40,32,.85)'; g.fillRect(-82, 34, 13, 13); g.fillStyle = 'rgba(239,227,196,.9)'; g.fillRect(-79, 37, 3, 7); g.fillRect(-75, 37, 3, 7);
    } }).piece(ellipse(-89, 0, 5, 63, 12), '#8a5a2a', { round: 2, lift: 1.2 }).finish({ shadowBlur: 5 });
    const tray = mk('typetray', [-80, -52, 80, 52], { pad: 8 }).piece([[-76, -48], [76, -48], [76, 48], [-76, 48]], '#6e4e30', { round: 3, rough: 0.5 });
    for (let c = 0; c < 9; c++) for (let row = 0; row < 6; row++) {
      const x = -64 + c * 16, y = -38 + row * 15, col = r2() < 0.5 ? '#6a6458' : '#7a705e';
      tray.piece([[x - 6.5, y - 6], [x + 6.5, y - 6], [x + 6.5, y + 6], [x - 6.5, y + 6]], col, { round: 1, lift: 1.2, thick: 0.8, paint: (g) => { g.strokeStyle = 'rgba(220,210,180,.55)'; g.lineWidth = 1.2; g.beginPath(); for (let st = 0; st < 3; st++) { const hz = r2() < 0.5, x0 = x - 4 + r2() * 4, y0 = y - 4 + r2() * 4; g.moveTo(x0, y0); g.lineTo(x0 + (hz ? 6 : 0.5), y0 + (hz ? 0.5 : 6)); } g.stroke(); } });
    }
    S.typetray = tray.finish({ shadowBlur: 5 });
  }
  // Renaissance notebook pages in sepia: the ancient world, the real one, and the body
  {
    const sep = 'rgba(96,58,30,.85)', page = (name, draw) => mk(name, [-62, -80, 62, 80], { pad: 8 }).piece([[-58, -76], [58, -75], [57, 76], [-57, 75]], '#efe2c2', { round: 2, rough: 0.7, paint: (g) => {
      g.fillStyle = 'rgba(160,120,70,.12)'; g.beginPath(); g.ellipse(30, 50, 26, 18, 0.4, 0, 7); g.fill();
      g.strokeStyle = sep; g.fillStyle = sep; g.lineWidth = 1.3; g.lineCap = 'round'; draw(g);
      g.lineWidth = 0.8; g.strokeStyle = 'rgba(96,58,30,.5)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-48, 52 + i * 5); g.lineTo(-48 + 30 + (i % 2) * 18, 52 + i * 5); g.stroke(); }
    } }).finish({ shadowBlur: 5 });
    S.sketchCol = page('sk-col', (g) => {
      g.beginPath(); g.moveTo(-34, -56); g.lineTo(34, -56); g.moveTo(-30, -48); g.lineTo(30, -48); g.stroke();
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 22, -40, 8, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(sx * 22, -40, 3.5, 0, Math.PI * 2); g.stroke(); }
      g.beginPath(); g.moveTo(-14, -32); g.lineTo(-16, 40); g.moveTo(14, -32); g.lineTo(16, 40); g.stroke();
      for (let x = -10; x <= 10; x += 5) { g.beginPath(); g.moveTo(x, -30); g.lineTo(x * 1.08, 38); g.stroke(); }
      g.beginPath(); g.moveTo(-24, 40); g.lineTo(24, 40); g.moveTo(-28, 46); g.lineTo(28, 46); g.stroke();
      g.lineWidth = 0.7; g.beginPath(); g.moveTo(-40, -56); g.lineTo(-40, 46); g.moveTo(-43, -56); g.lineTo(-37, -56); g.moveTo(-43, 46); g.lineTo(-37, 46); g.stroke();
    });
    S.sketchWing = page('sk-wing', (g) => {
      g.beginPath(); g.moveTo(-44, -10); g.quadraticCurveTo(-10, -60, 44, -54); g.stroke();
      for (let i = 0; i < 9; i++) { const f = i / 8, x = -40 + f * 82, y = -14 - Math.sin(f * 2.6) * 34; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y + 30, x - 4 + f * 10, y + 44 - f * 14); g.stroke(); }
      g.beginPath(); g.moveTo(-44, -10); g.lineTo(-30, 30); g.stroke();
      g.lineWidth = 0.9; g.beginPath(); g.arc(-36, 36, 10, 0, 7); g.moveTo(-26, 36); g.lineTo(10, 36); g.moveTo(-36, 26); g.lineTo(-36, 46); g.stroke();
    });
    S.sketchBody = page('sk-body', (g) => {
      g.beginPath(); g.arc(0, -6, 44, 0, 7); g.stroke(); g.strokeRect(-38, -42, 76, 76);
      g.beginPath(); g.arc(0, -36, 6, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(0, -30); g.lineTo(0, 4); g.moveTo(-38, -22); g.lineTo(38, -22); g.moveTo(-36, -38); g.lineTo(0, -24); g.lineTo(36, -38);
      g.moveTo(0, 4); g.lineTo(-10, 34); g.moveTo(0, 4); g.lineTo(10, 34); g.moveTo(0, 4); g.lineTo(-26, 30); g.moveTo(0, 4); g.lineTo(26, 30); g.stroke();
    });
  }
  // a chain of paper children, cut from one folded strip, holding hands
  {
    const pts = [];
    for (let i = 0; i <= 12; i++) { const a = (115 + (i / 12) * 310) * Math.PI / 180; pts.push([Math.cos(a) * 7.5, -32 + Math.sin(a) * 7.5]); }
    pts.push([3, -25], [19, -21.5], [20.5, -17], [19, -13], [9, -13], [14, 20], [6, 20], [6, 40], [1.5, 40], [1.5, 23], [-1.5, 23], [-1.5, 40], [-6, 40], [-6, 20], [-14, 20], [-9, -13], [-19, -13], [-20.5, -17], [-19, -21.5], [-3, -25]);
    const doll = (name, dress, skin) => mk(name, [-22, -42, 22, 42], { pad: 6 }).piece(pts, dress ? '#efe6d0' : '#e9dfc6', { round: 1.2, rough: 0.35, seg: 60, paint: dress ? (g) => {
      g.fillStyle = skin; g.beginPath(); g.arc(0, -32, 8, 0, 7); g.fill(); g.fillRect(-21, -22, 6, 10); g.fillRect(15, -22, 6, 10); g.fillRect(-7, 20, 14, 21);
      g.fillStyle = dress; g.beginPath(); g.moveTo(-10, -26); g.lineTo(10, -26); g.lineTo(15, -12); g.lineTo(9, -12); g.lineTo(15, 21); g.lineTo(-15, 21); g.lineTo(-9, -12); g.lineTo(-15, -12); g.closePath(); g.fill();
      g.fillStyle = 'rgba(40,28,24,.75)'; g.beginPath(); g.arc(0, -34, 8, Math.PI, 0); g.fill(); g.fillRect(-7, 36, 6, 5); g.fillRect(1, 36, 6, 5);
    } : (g) => { g.strokeStyle = 'rgba(150,130,100,.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-20, -17); g.lineTo(20, -17); g.stroke(); } }).finish({ shadowBlur: 3 });
    S.doll = doll('doll-p');
    S.dollC = [['#c8553d', '#7d5236'], ['#3f6a8a', '#e0b48f'], ['#d8a040', '#5d3a26'], ['#5a8a5a', '#c69a74'], ['#8a4a7a', '#a8774f']].map(([d, sk], i) => doll('doll-c' + i, d, sk));
  }
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
  // the first people on the Moon, and their flag
  S.astro = mk('astro', [-12, -34, 12, 4], { pad: 4 })
    .piece([[-6, 2], [-6, -8], [-7, -20], [7, -20], [6, -8], [6, 2], [2, 2], [1, -6], [-1, -6], [-2, 2]], '#eeeeea', { round: 2, rough: 0.3 })
    .piece(rect(-10, -19, -6, -9), '#d6d6d0', { round: 1, lift: 0.8 })
    .piece(ellipse(1, -25, 6.5, 6.5, 12), '#f2f2ee', { round: 2, lift: 1 })
    .piece(ellipse(3, -25, 4, 3.6, 10), '#c9a24a', { round: 1.5, lift: 0.8 })
    .finish({ shadowBlur: 2 });
  S.flag = mk('flag', [-2, -40, 22, 4], { pad: 4 })
    .piece(strip(0, 2, 0, -38, 1.4, 1.2), '#9a9ca2', { round: 0.5 })
    .piece(rect(1, -37, 20, -26), '#f0ece4', { round: 0.6, rough: 0.2, lift: 0.6, paint: (g) => { g.fillStyle = '#b8332e'; for (let y = -37; y < -26; y += 2.2) g.fillRect(1, y, 19, 1.1); g.fillStyle = '#2c3d6e'; g.fillRect(1, -37, 8, 5.5); } })
    .finish({ shadowBlur: 2 });
  // the Moon up close: a curve of grey card, pocked with craters
  {
    const r3 = rng(1969), top = [];
    for (let i = 0; i <= 64; i++) { const x = -440 + i * 13.75, f = x / 440; top.push([x, -40 + f * f * 70 + (r3() - 0.5) * 3 + (i % 11 === 6 ? -5 : 0)]); }
    S.lunar = mkBig('lunar', [-446, -60, 446, 250], { pad: 10 }).piece([...top, [440, 246], [-440, 246]], '#b9b5ad', { round: 3, rough: 1.2, paint: (g) => {
      for (let i = 0; i < 46; i++) { const x = -420 + r3() * 840, y = -12 + r3() * 240, rx = 5 + r3() * r3() * 34, ry = rx * (0.26 + (y + 40) / 700);
        if (Math.abs(x - 40) < 70 && y < 30) continue;
        g.fillStyle = 'rgba(90,86,82,.35)'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
        g.strokeStyle = 'rgba(235,232,224,.5)'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(x, y + ry * 0.15, rx, ry, 0, 0.1, Math.PI - 0.1); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 600; i++) g.fillRect(-440 + r3() * 880, -40 + r3() * 280, 1.2, 1.2);
      const sh = g.createLinearGradient(0, -40, 0, 246); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(20,18,16,.35)'); g.fillStyle = sh; g.fillRect(-446, -60, 892, 310);
    } }).finish({ shadowBlur: 8 });
    S.lem = mk('lem', [-48, -96, 48, 8], { pad: 6 })
      .piece(strip(-24, -30, -40, 2, 2.6, 2.2), '#8c8a86', { round: 0.8 }).piece(strip(24, -30, 40, 2, 2.6, 2.2), '#8c8a86', { round: 0.8 })
      .piece(ellipse(-41, 3, 6, 2.2, 10), '#a8a49c', { round: 1, lift: 0.8 }).piece(ellipse(41, 3, 6, 2.2, 10), '#a8a49c', { round: 1, lift: 0.8 })
      .piece([[-26, -10], [-30, -36], [30, -36], [26, -10]], '#c9a24a', { round: 2, rough: 0.8, paint: (g) => { g.strokeStyle = 'rgba(120,80,20,.5)'; g.lineWidth = 0.9; for (let i = 0; i < 14; i++) { const x = -28 + i * 4.2; g.beginPath(); g.moveTo(x, -36); g.lineTo(x + 2 - (i % 3), -10); g.stroke(); } g.fillStyle = 'rgba(255,240,190,.35)'; g.fillRect(-24, -33, 10, 20); } })
      .piece(rect(4, -10, 12, 2), '#7a7874', { round: 0.6, lift: 0.6, paint: (g) => { g.fillStyle = 'rgba(40,40,40,.5)'; for (let y = -8; y < 2; y += 3) g.fillRect(4, y, 8, 0.8); } })
      .piece([[-20, -36], [-24, -60], [-12, -74], [14, -74], [24, -58], [20, -36]], '#d8d6d0', { round: 2.5, paint: (g) => { g.fillStyle = '#2a2a30'; g.beginPath(); g.moveTo(-4, -62); g.lineTo(6, -62); g.lineTo(8, -54); g.lineTo(-6, -54); g.closePath(); g.fill(); g.fillStyle = 'rgba(80,80,90,.4)'; g.fillRect(-20, -44, 40, 3); } })
      .piece(strip(10, -74, 14, -92, 1.2, 1), '#8c8a86', { round: 0.4, lift: 0.6 })
      .piece(ellipse(15, -92, 6, 2.4, 10), '#e8e6e0', { round: 0.8, lift: 0.8 })
      .finish({ shadowBlur: 4 });
    // the Earth from out there: our own little cardboard planet
    S.earth = mk('earth', [-40, -40, 40, 40], { pad: 8 }).piece(ellipse(0, 0, 34, 34, 28), '#3d6aa0', { round: 3, paint: (g) => {
      g.fillStyle = '#8a7a4a'; for (const [x, y, rx, ry, a] of [[-12, -8, 12, 16, 0.4], [14, 10, 10, 8, -0.3], [8, -20, 7, 5, 0.2], [-6, 20, 6, 4, 0]]) { g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(110,140,70,.8)'; g.beginPath(); g.ellipse(-12, -4, 7, 9, 0.4, 0, 7); g.fill();
      g.strokeStyle = 'rgba(245,245,240,.85)'; g.lineWidth = 2.6; g.lineCap = 'round'; for (const [x, y, w] of [[-20, -24, 18], [4, -2, 24], [-26, 12, 14], [6, 24, 16]]) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 4, x + w, y); g.stroke(); }
      const sh = g.createLinearGradient(-34, 0, 34, 0); sh.addColorStop(0, 'rgba(10,14,30,0)'); sh.addColorStop(0.55, 'rgba(10,14,30,0)'); sh.addColorStop(0.8, 'rgba(10,14,30,.7)'); g.fillStyle = sh; g.fillRect(-36, -36, 72, 72);
    } }).finish({ shadowBlur: 5 });
  }
  S.jet = mk('jet', [-60, -16, 60, 14])
    .piece([[-56, -2], [-40, -6], [44, -6], [58, 0], [44, 5], [-40, 5]], '#eceae4', { round: 4 })
    .piece([[-6, 0], [-22, 14], [-12, 14], [10, 2]], '#d8d6d0', { round: 1, lift: 1 })
    .piece([[-50, -4], [-58, -16], [-50, -16], [-40, -5]], '#d8d6d0', { round: 1, lift: 1 })
    .finish({ shadowBlur: 3 });
  S.bomber = mk('bomber', [-70, -20, 70, 18])
    .piece([[-64, -2], [-48, -8], [52, -8], [66, 0], [52, 6], [-48, 6]], '#3a3434', { round: 4, rim: 0.2 })
    .piece([[-10, -2], [-30, 18], [-14, 18], [12, 0]], '#2e2a2a', { round: 1, lift: 1, rim: 0.2 })
    .piece([[-56, -4], [-66, -18], [-56, -18], [-46, -6]], '#2e2a2a', { round: 1, lift: 1, rim: 0.2 })
    .finish({ shadowBlur: 3 });
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
  // the scribe's hand: forearm, fingers wrapped round the reed
  S.hand = mkBig('hand', [-30, -330, 40, 30], { pad: 10 })
    .piece([[-14, -10], [-20, -320], [22, -324], [18, -8]], '#a8774f', { round: 6, rough: 0.6 })
    .piece([[-18, -90], [-24, -330], [26, -334], [22, -96]], '#e8dcc0', { round: 4, rough: 0.6, lift: 2, paint: (g) => { g.fillStyle = 'rgba(120,100,70,.25)'; for (let y = -100; y > -330; y -= 9) g.fillRect(-24, y, 50, 1.6); } })
    .piece([[-22, 18], [-26, -6], [-18, -22], [8, -26], [24, -14], [26, 6], [14, 22], [-6, 26]], '#a8774f', { round: 8, rough: 0.5, lift: 2.5, paint: (g) => { g.strokeStyle = 'rgba(70,40,20,.45)'; g.lineWidth = 1.6; for (const y of [-8, 2, 12]) { g.beginPath(); g.moveTo(-20, y); g.lineTo(6, y + 2); g.stroke(); } } })
    .piece([[-24, -2], [-34, 8], [-30, 16], [-20, 10]], '#9a6b45', { round: 4, rough: 0.4, lift: 1.5 })
    .finish({ shadowBlur: 10 });
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
