# The engine: how the template works

## Contents
1. File map: keep, extend, rewrite
2. The world model
3. `film/film.json` (the script)
4. `src/film.js` (the film)
5. Cut-outs: the KINDS and Sheet APIs
6. Light, sky and effects
7. Performance rules (never by lowering quality)
8. Commands

## 1. File map

**Keep as they are** (the engine; improve only if a new story needs something general):

| File | What it does |
| --- | --- |
| `index.html`, `src/style.css` | Page shell: title card with Begin, captions, end title, control bar, chapter menu. Edit the title text and the link-preview tags. |
| `src/main.js` | Start-up, the frame loop, captions, chapter menu, controls, pausing when the page is hidden. Debug hooks: `?t=SECONDS` freezes one frame, `window.__renderAt(t)` renders any time. |
| `src/engine.js` | The stage: turning disc layers, ground paint, entity drawing with pop-up springs, light pass, glow (emissive) pass with occlusion, smoke, flames, stars, motes, bloom, grade, vignette, grain, the full-planet pull-back, lazy sprite building. |
| `src/paper.js` | The cardboard material: hand-cut outlines, board thickness and lift shadows, grain, blotchy paint, soft drop shadows, blur without `ctx.filter`. |
| `src/sound.js` | The soundtrack is the clock; live paper flaps; seeking on any host. |
| `src/util.js` | Maths: springs, easing (`sramp`, `smooth`), noise (`fbm`), colour helpers, `monotone` curves, seeded `rng`, `hash`. |
| `tools/*` | Frame sheets, close-ups, all tests, publishing (see `review.md`, `ship.md`). |

**Libraries to reuse and extend** (story-flavoured, but most pieces are reusable):

| File | Contents |
| --- | --- |
| `src/people.js` | Jointed paper puppets. One body plan; `LOOKS` define costume, skin, hair, hat, item and pose (`stand`, `walk`, `sit`, `kneel`). Add new LOOKS for new characters. |
| `src/cutouts.js` | The `KINDS` registry, plus the first-fire scene (acacia, grass, rock, gazelle, campfire people), flames and the sky set. |
| `src/kinds_nature.js` | Trees, animals (mammoth, camel, sheep/goat, giraffe, elephant, kangaroo), waves, islands, crops, cave. |
| `src/kinds_built.js` | Huts to houses, temples, ships and boats, wheel, press, telescope, factory, train, poles, lamps, market stall, oven, monuments, blank board. |
| `src/kinds_modern.js` | Easel, dome, dollhouse cutaways with lit rooms, cinema, flags, throne, camera, school, aeroplane, lab, launch tower, homes, boats, bus stop. |
| `src/sky.js` | Sky props and close-up cards: planets, clouds, aircraft, satellites, icons, tablet, notebook pages, paper dolls, Moon horizon and lander, Earth, music notes, messages. |

**Rewrite for each story:** `film/film.json`, `src/film.js`, the score and ambience sections of
`tools/build_audio.py`, the respellings in `tools/narrate.py`, `README.md`, and the rendered
`assets/share.jpg` and `assets/icon.png`. Generated, never edited by hand: `src/timeline.js`
(from `narrate.py`) and `assets/audio/film.mp3` (from `build_audio.py`).

## 2. The world model

- The story is laid out along the planet by **angle** `a` in degrees. It may wrap round the
  planet several times (the first film used about −70° to 1300°); only about ±30° is on
  screen at once.
- **The camera** `cam(t)` maps film time to the angle at the top of the screen, through
  monotone keyframes `[[t, a], ...]`. Slow keys hold a scene; fast keys travel. The camera is
  the edit: there are no cuts.
- **Layers**, back to front: `far` (rf 1.05, moves at half speed, blurred, tinted with sky
  colour), `mid` (rf 1.022, 0.78 speed), `main` (rf 1, where the story happens), `front` (rf 0.958,
  faster, blurred foreground grass and waves) and `core` (the planet's body). Distant layers give
  depth for free; use them for skylines, mountains, herds, monuments.
- **Ground**: `ZONES` give each stretch its ground colour ([a0, a1, [r,g,b]]); `SEAS` mark water;
  `profile.main/mid/far(a)` give hills and dunes. `groundFx` draws marks in the ground (paths,
  furrows, canals, rails, cobbles, wires, threads).
- **Pop-ups**: each cut-out springs up when it first comes into view (`tPop`, worked out by the
  engine from the camera), or exactly at `popAt`. Before that it lies flat. `foldAt` folds it
  down, `repopAt` brings it back, `from`/`to` limit when it exists at all.

## 3. `film/film.json`

```json
{ "name": "film", "duration": 472,
  "voice": { "blend": { "bm_lewis": 0.55, "bm_george": 0.45 }, "speed": 0.91, "lang": "en-gb", "pitch": -1 },
  "chapters": [ { "t": 0, "title": "Fire" }, { "t": 53, "title": "Walking out" } ],
  "narration": [ { "t": 3.6, "text": "For millions of years, our ancestors lived as other animals do: ..." } ],
  "events": { "lit": 22.2, "blows": [19.2, 20.4, 21.6], "wheel": 161.8, "roll": 164.0 } }
```

`narrate.py` synthesizes each line, reports where lines overlap, and writes `src/timeline.js`
with `DURATION`, `EV` (the events), `CHAPTERS` and the caption `CUES`. Name events after what
happens on screen and use `EV.name` everywhere in `film.js` and `build_audio.py`, so picture,
sound and music stay in sync when timings move.

## 4. `src/film.js`

In order, it defines:

1. extra LOOKS for this story's people;
2. `cam` (camera keys), `ZONES`, `SEAS`, `profile`, `ground()`;
3. the entities, chapter by chapter, with `add(kind, layer, angle, options)`;
4. tracks over time: sky colours (`skyK`), ambient light (`ambK`), mote colour, colour grade,
   `SUNS`, `NIGHTS`;
5. `state(t)`: everything that changes per frame (see section 6);
6. `sky()`, `groundFx()` and `overFx()`: the drawing hooks for the sky, the ground and the
   foreground (close-up cards, hanging props in front of everything, glows, threads);
7. `export const film = { duration, cam, state, entities, byLayer, profile, ground, clouds, bake,
   shadowDx, body, keepFull, fx: { sky, ground, over } }`.

Entity options (all optional):

| Option | Meaning |
| --- | --- |
| `z` | Order within the layer (higher is nearer). |
| `scale`, `flip`, `v` | Size, mirror, variant of the kind. |
| `popAt`, `delay`, `from`, `to`, `foldAt`, `repopAt` | Timing of springing up, folding and existing (see above). |
| `inside: parent` | Pops up with a building (people in a dollhouse cutaway). |
| `move(t)` | Extra angle over time (walking, driving, sailing). |
| `lift(t)`, `rot(t)`, `y` | Height above the ground, tilt, fixed raise (for boats, raise above the waves). |
| `ground: false` | Ignore the hills profile (things on water). |
| `wide` | Extra degrees before culling, for long cut-outs (trains). |
| `loud` | Loudness of its paper flap (0.2 distant grass to 2 for a temple). |
| `over` | Draw over the main ground rim. |
| `sharp` | No distance blur. |
| `act(t, o)` | For people: override pose (`lean`, `head`, `front`/`back` arm angles, `walk`). |

Patterns from the first film worth reusing:
- **Close-up cards** (clay tablet, Moon horizon): rise from below over a dark veil in
  `overFx`, hold, sink; draw marks or small actors on the card in its own coordinates.
- **Hanging props** on threads (`st.hang(g, sprite, x, y, scale, swing)`): planets, notebook
  pages, prints, paper-doll chains. Use `drop(t, tIn, tOut)` for the spring in and out. Draw
  them in `overFx` when clouds or buildings must not cover them.
- **Threads** between places with small cut-outs riding them (ideas, goods, messages).
- **Lights coming on one by one** (rooms, islands, lamps) as a focal moment.

## 5. Cut-outs: KINDS and Sheet

```js
KINDS.lantern = {
  bake(mk, v = 0) {                       // called once per size; returns the sprites
    const P = {};
    P.body = mk('lantern' + v, [-20, -80, 20, 4])          // name, bounding box [x0, y0, x1, y1]
      .piece([[-12, 0], [12, 0], [10, -60], [-10, -60]], '#6a4a30', { round: 2 })  // a cut piece
      .piece(rect(-6, -50, 6, -20), '#e8c070', { lift: 1, paint: (g) => { /* paint on it */ } })
      .finish({ shadowBlur: 4 });          // bakes edge, grain, shadow
    return P;
  },
  draw(g, P, t, e, env) { put(g, P.body, env.sh); },        // every frame; local coords, y up is negative
  glow(g, P, t, e, env, p) { /* optional: light it emits, drawn in the glow pass */ },
};
```

- Coordinates: a cut-out stands on its origin, facing +x; a person is about 120 units tall.
- `piece(points, colour, { round, rough, seg, lift, thick, rim, paint })`: `round` softens
  corners, `rough` is how wobbly the scissor line is, `lift` how far it sits above the pieces
  under it (its shadow), `thick` the board edge, `paint(g)` paints inside the piece.
- `put(g, sprite, shadowAlpha, dx, dy)` draws a sprite with its soft shadow.
- Animate in `draw` with springs and `fbm` noise, never with linear motion.

## 6. Light, sky and effects (`state(t)` returns)

`fire, lights, emitters, smoke, sky, ambient, stars, sun, cloud, snow, motes, moteColor, emit,
screen, blink, bloom, grade, rays, zoom, pull, fade`:
- `lights`: `{ a, h, r, k, color }` pools of light (fire, lamps, windows, screens) in the light
  pass; `ambient` darkens everything else at night.
- `emitters`: flames (`{ a, h, scale, lit, litAt, seed }`). `smoke`: smoke columns.
- `emit` enables the glow pass, where each nearer cut-out hides the glows behind it. This is
  what stops people and lights showing through objects.
- `zoom` leans the camera in on focal moments; `pull` pulls back to the whole planet at the end;
  `keepFull(a)` keeps the uncut-board colour on the far side of the planet in that shot.

## 7. Performance rules (never by lowering quality)

The user's rule: **never decrease the quality of the animation**. There is no automatic
downgrade, and none may be added. Keep it fast like this instead:
- **Sprites are built lazily**: what is on screen first, the rest in the background between
  frames, soonest first (`bakeAhead`). Never build all sprites in module scope.
- **Free scratch canvases** with `release(canvas)` the moment they are used; iPhones count a
  canvas until it is garbage-collected, and too many blank the page.
- **No new gradients per particle per frame**: stamp a cached soft dot (`stage.dot()` +
  `stage.stamp()`).
- Keep total canvas memory under about 200 MB at phone sizes (`tools/memory.mjs`).
- Sizes: device pixel ratio up to 2, at most about 2.4 million canvas pixels. This fixed limit
  keeps memory safe in in-app browsers; it never changes during playback.

## 8. Commands

```sh
python3 -m http.server 8765 &            # plain server, for frozen frames
python3 tools/rangeserver.py . 8766 &    # behaves like real hosting, for playback tests
node tools/sheet.mjs NAME "30,86.5,150" 1440x810 3     # contact sheet -> shots/sheet_NAME.jpg
node tools/crop.mjs out.png 87 1440x810 2 520,250,420,300   # close-up (x,y,w,h in CSS px)
```
