# The engine: how the template works

The template in `assets/template/` is the complete code of "The Long Thread". It contains the
engine, the first film's cut-out library, China's cut-out library, the sound pipeline and every
test tool.

## Contents
1. File map: keep, extend, rewrite
2. The world model
3. `film/film.json` (the script)
4. `src/film.js` (the film): structure, helpers, hooks
5. Cut-outs: the KINDS and Sheet APIs
6. Light, era looks, weather and effects
7. Movement, entrances and exits
8. Performance rules (never by lowering quality)
9. Commands

## 1. File map

**Keep as they are** (the engine; improve only if a new story needs something general):

| File | What it does |
| --- | --- |
| `index.html`, `src/style.css` | Page shell: title card with Begin, captions, end title, control bar, chapter menu. Edit the title text and the link-preview tags. |
| `src/main.js` | Start-up, frame loop, captions, chapters, controls, pause when hidden. Debug hooks: `?t=SECONDS` freezes a frame, `window.__renderAt(t)` renders any time, `window.__stage`. The title screen shows `film.titleT`. |
| `src/engine.js` | The stage: turning disc layers, ground paint, entities with pop-up springs, light pass, glow pass with occlusion, smoke, flames, stars, motes, snow, sun rays, bloom, grade, vignette, grain, the full-planet pull-back, and **windowed sprite building** (cut ~90 s ahead, freed far behind; section 8). |
| `src/paper.js` | The cardboard material: hand-cut outlines, board thickness, lift shadows, grain, blotchy paint, soft shadows, blur without `ctx.filter`. |
| `src/sound.js` | The soundtrack is the clock; live paper flaps; seeking on any host; if a host will not stream the file it fetches it whole and plays it from memory. |
| `src/util.js` | Springs, easing (`sramp`, `smooth`), noise (`fbm`), colours, `monotone` curves, `track` keyframes, seeded `rng`, `hash`. |
| `tools/*` | Contact sheets, close-ups, every test, audio build, publishing (`review.md`, `ship.md`). |

**Libraries to reuse and extend:**

| File | Contents |
| --- | --- |
| `src/people.js` | Jointed paper puppets: one body plan; `LOOKS` set costume, skin, hair, hat, item (book, phone, bowl, medbox, redbook, flute, hoe, ge, shovel, brush, fan, lantern...) and pose (`stand`, `walk`, `sit`, `kneel`). |
| `src/cutouts.js` | The `KINDS` registry; first-fire scene; flames; the sky set. |
| `src/kinds_nature.js`, `kinds_built.js`, `kinds_modern.js` | The first film's library: trees, animals, waves, huts to houses, temples, ships, wheel, press, factory, train, lamps, tower crane, dollhouse cutaways, lab, launch tower, cars... |
| `src/kinds_china.js` | China: round huts, cranes (`redcrane`), karst hills, rice, buffalo, Shang hall and foundry, ding, Sanxingdui bronzes, banners, chariots, halls of every dynasty (`hall` v0–v6), rammed-earth and brick walls, beacons, terracotta army, que towers, paper-making, cliff Buddha, bodhi, pagodas, exam cells, rainbow bridge, junks and treasure ships, yurts and riders, palace walls, thrones, the Canton hongs, steamship, rickshaw, Tiananmen, flags, backyard furnaces, poster wall, blackboard, red-cross sign, loudspeaker, red gates, containers, tanks. Exports helpers `rect`, `tiles`, `glowRects`, `paintRects`, `reach` (two-link arm IK), `roofPts`. |
| `src/kinds_modern_china.js` | Bespoke modern things: Shanghai Tower, Jin Mao, SWFC, Ping An, KK100, Spring Bamboo, Fuxing train (`portal`/`portalEnd` clipping), viaduct piers, tunnel `portal`, Long March 5, dam blocks with spillways, ship lift, UHV pylons, sea-bridge pylons, island, suspension towers, EAST tokamak with field lines, control desk with clock, observatory, supercomputer, humanoid robots (dance, run, fall), gala stage, finish arch, robot arms that weld, car bodies, AGV, factory hall with lamps (`lamp(t, i)`), chimney stack, electric car `ev`. |
| `src/sky_china.js`, `src/sky_borrowed.js` | Close-up cards and hanging props built lazily with `fxGroup([names], (mk) => ({...}))` (getters, so nothing is built until first used): bone flute, oracle bone, slips, coins, seismoscope, compass, paper money, qilin, Moon lander and rover, Tiangong, Micius, quantum computer, panda farm, white `steam` puffs, oracle `GLYPH`s with `glyph()`, fireworks `burst()`, `hang2()`. `sky_borrowed.js` holds the first film's sky props in the same lazy form. |

**Rewrite for each story:** `film/film.json`, `src/film.js`, the score and ambience in
`tools/build_audio.py`, the respellings `SAY` in `tools/narrate.py`, `README.md`,
`assets/share.jpg`, `assets/icon.png`. Generated, never edited by hand: `src/timeline.js` and
`assets/audio/film.mp3`. Story-specific kinds go in a new `kinds_<story>.js`; check
`KINDS[name]` is free first (a new `crane` once replaced the tower crane everywhere).

## 2. The world model

- The story is laid out along the planet by **angle** `a` in degrees. It wraps the planet many
  times (The Long Thread runs from about −40° to 2900°); about ±30° is on screen at once.
- **The camera** `cam(t)` maps film time to the angle at the top of the screen through monotone
  keys `[[t, a], ...]`. Slow keys hold a scene; fast keys travel. The camera is the edit.
- **Layers**, back to front: `far` (rf 1.05, half speed, blurred, sky-tinted), `mid` (rf 1.022),
  `main` (rf 1, the story), `front` (rf 0.958, foreground grass and waves) and `core`.
- **Ground**: `ZONES` give ground colours by angle, `SEAS` water, `profile.main/mid/far(a)` hills.
- **Pop-ups**: each cut-out springs up when it comes into view (`tPop`, from the camera) or at
  `popAt`. A timed piece lies flat for 2.5 s before (long flat strips read as debris). `foldAt`
  folds it down, `repopAt` brings it back, `from`/`to` limit when it exists.

## 3. `film/film.json`

```json
{ "name": "film", "duration": 750,
  "voice": { "blend": { "bm_lewis": 0.55, "bm_george": 0.45 }, "speed": 0.91, "lang": "en-gb", "pitch": -1 },
  "chapters": [ { "t": 0, "title": "The bone flute" }, { "t": 46.1, "title": "Bronze and bone" } ],
  "narration": [ { "t": 4.0, "text": "Nine thousand years ago, in a village in central China, ..." } ],
  "events": { "flute": 11.4, "pour": 52.6, "cracks": [63.2, 64.8], "launch": 594.4 } }
```

`narrate.py` voices each line, reports overlaps, and writes `src/timeline.js` (`DURATION`, `EV`,
`CHAPTERS`, `CUES`). Name events after what happens on screen and use `ev('name', default)` in
`film.js` and `EV['name']` in `build_audio.py`, so picture and sound stay in sync. Re-run
`narrate.py` after every change to the events, or `film.js` reads stale times.

## 4. `src/film.js`

Structure, top to bottom:

1. helpers: `ev(k, d)`, `add(kind, layer, a, o)`, `grassRun(a0, a1, step, layer, o)`,
   `drop(t, tIn, tOut)` (spring in and out for hanging cards), `near(a, c, w)`, `flick(t, seed)`,
   and `hook({ lights, sky, ground, over })`, which registers per-chapter drawing code;
2. `cam`, `ZONES`, `SEAS`, `ground()`, `profile`;
3. one block per chapter: `Object.assign(LOOKS, {...})` for its people, constants for its
   angles, its `add(...)` calls, and its own `hook({...})`;
4. tracks: base sky `skyK`, ambient `ambK`, `moteK`, `gradeK`, `SUNS`, `NIGHTS`, `ZOOM`;
5. **era looks** `ERAS` and `eraLook()`, **weather** `WX` and `weather()` (section 6);
6. `state(t, stage)`: everything that changes per frame;
7. `sky()`, `groundFx()`, `overFx()`: the global drawing passes, which call every chapter's hooks;
8. `export const film = { titleT, keepFull, duration, cam, state, entities, byLayer, profile,
   ground, clouds, bake, shadowDx, body, fx: { sky, ground, over } }`.

Hooks (each chapter can register any of them):
- `lights(t, c, L, Em, Sm, stage)`: push light pools `{ a, h, r, k, color }`, flame emitters
  `{ a, h, scale, lit, litAt, seed }` and smoke `{ a, layer, h, t0, t1, size, life, every, rise,
  drift, alpha }`.
- `sky(g, st, t, S)`: behind the world (drone shows, the Milky Way, a space station crossing).
- `ground(g, st, t, S, G)`: in planet units; `G.rad(a, h)`, `G.run(a0, a1, fn)`, `G.river(...)`,
  `G.c` (camera angle): rivers, reservoirs, cracks in fields, threads, rails.
- `over(g, st, t, S)`: screen space, above everything: close-up cards, hanging props, infographic
  cards, spray, confetti, beams. `st.place(layer, a, h, t)` gives the screen position of a world
  point; `st.hang(g, sprite, x, y, scale, swing)` hangs a sprite on a thread; `st.stamp(g,
  st.dot(r, g, b, inner), x, y, radius, alpha)` stamps a cached soft glow. Anything here draws
  above close-up cards too: fade it out before a card comes up.

Entity options (all optional): `z`, `scale`, `flip`, `v`; `popAt`, `from`, `to`, `foldAt`,
`repopAt`; `inside: parent`; `move(t)` (extra angle over time); `lift(t)`, `rot(t)`, `y`;
`ground: false`; `wide` (extra culling margin for long things); `loud` (paper-flap loudness);
`over`; `sharp`; `act(t)` for people (`lean`, `head`, `front`/`back` arm angles, `walk:
undefined` to stand); `pace` (walking speed); plus any kind-specific callbacks (`pour(t)`,
`plasma(t)`, `spill(t)`, `lamp(t, i)`, `blare(t)`, `dance(t)`, `launch`...).

Patterns worth reusing: close-up cards over a dark veil with the scene's light behind them;
hanging cards with animated data (`hsrMap`, `lifeCard`: draw text with the page font
`Fraunces`); threads with things riding them; lights coming on one by one; a ball of thread at
the pull-back (`threadBall`).

## 5. Cut-outs: KINDS and Sheet

```js
KINDS.lantern = {
  bake(mk, v = 0) {                       // called once per size; returns the sprites
    const P = {};
    P.body = mk('lantern' + v, [-20, -80, 20, 4])          // name, bounding box [x0, y0, x1, y1]
      .piece([[-12, 0], [12, 0], [10, -60], [-10, -60]], '#6a4a30', { round: 2 })
      .piece(rect(-6, -50, 6, -20), '#e8c070', { lift: 1, paint: (g) => { /* paint on it */ } })
      .finish({ shadowBlur: 4 });
    return P;
  },
  draw(g, P, t, e, env) { put(g, P.body, env.sh); },   // local coords, facing +x, y up is negative
  glow(g, P, t, e, env, p) { /* light it emits: drawn additively in the glow pass */ },
};
```

- A person is about 120 units tall; 1° of angle on the main layer is about 17.45 units.
- `piece(points, colour, { round, rough, seg, lift, thick, rim, paint })`; `put(g, sprite,
  shadowAlpha, dx, dy)`.
- Animate with springs and noise, never linear slides. Give machines behaviour (`plasma`,
  `weld`, `spill`, `rise`, `launch`, `lamp`) driven by callbacks from `film.js`.
- Glow is additive and drawn after the world: whatever a kind clips in `draw` (a train inside a
  tunnel) it must also clip in `glow`, or the light shows through the hill.

## 6. Light, era looks, weather and effects

`state(t, stage)` returns `fire, lights, emitters, smoke, sky, ambient, stars, sun, cloud, snow,
motes, moteColor, emit, screen, blink, bloom, grade, rays, zoom, pull, rustle, shake, threadLift,
fade`.

- **Base tracks** (`skyK`, `ambK`, `gradeK`, `moteK`) set day, dusk and night.
- **Era looks**: `ERAS` is a list of `[t0, t1, LOOK([4 sky colours top→horizon], [ambient rgb],
  [grade r, g, b, strength], { motes, mote, snow, rays })]`. `eraLook()` crossfades each look over
  the base (±1.2 s), so nights and dusks still come from the base tracks. `rays` makes sun rays
  stream from the hanging paper sun (`PAPER_SUN`; the engine's sun with `noDisc: true`). `snow`
  turns on paper snow. Give every era one; check the crossfades in a contact sheet.
- **Weather** `WX`: `[kind, t0, t1, colour, amount]` with kinds `mist` (a ring around the planet,
  so it follows the curve of the ground, plus drifting banks), `petals`, `sand`, `dust`, `leaves`.
  Particle sizes use `max(u, min(W, H) / 820)` so they read on phones.
- `FLOCKS` (birds), `NIGHTS` (stars), `SUNS` (sunrises and sunsets with rays), `ZOOM` (lean-ins),
  `keepFull(a)` (the far side stays plain board in the pull-back).
- `emit` enables the glow pass with occlusion: nearer cut-outs hide glows behind them.

## 7. Movement, entrances and exits

- **Every `move(t)` is bounded** with `clamp`, and every mover leaves (`to` or `foldAt`) before
  the next scene. Unbounded movers drift for minutes and turn up in later chapters.
- **Long things enter and leave**: a train comes out of a tunnel `portal` and goes into another;
  ships sail into the frame and stop; nothing vanishes all at once mid-move.
- **Stopping walkers**: end the walk with `act: (t) => (t > stop ? { walk: undefined } : {})`
  where its `move` reaches its limit, short of anything solid.
- **Groups** need a figure's width between them (about 2.5–3.6° at main scale).

## 8. Performance rules (never by lowering quality)

The user's rule: **never decrease the quality of the animation**. Keep it fast instead:
- **Windowed sprite building**: `bakeAhead` cuts sprites for the next ~90 s soonest first, and
  `evictBehind` frees sprite sets whose every user is more than 250° (layer-scaled) behind the
  camera; a seek back simply cuts them again. A 12.5-minute film peaks at about 95–140 MB on
  phones. Never build all sprites in module scope; lazy `fxGroup` getters for cards.
- **Free scratch canvases** (`release`) the moment they are used.
- **No new gradients per particle per frame**: stamp cached soft dots.
- Keep peaks under about 200 MB at phone sizes (`tools/memory.mjs` plays the film through).
- Device pixel ratio up to 2, at most about 2.4 million canvas pixels; fixed, never lowered.

## 9. Commands

```sh
python3 -m http.server 8765 &            # plain server, for frozen frames
python3 tools/rangeserver.py . &         # port 8766, behaves like real hosting, for playback tests
node tools/sheet.mjs NAME "30,86.5,150,200" 1440x810 4   # contact sheet; fill the grid exactly
node tools/crop.mjs out.png 87 1440x810 2 520,250,420,300 # close-up (x,y,w,h in CSS px)
```
