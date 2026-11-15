# Review: how to look, what to look for, what to run

## 1. The loop

After every chapter, and again for the whole film:

1. **Contact sheets** at three sizes. Pick 12 times inside the chapter (one per beat), and use a
   frame count that fills the grid exactly (12 frames with 3 or 4 columns; the tool fails on
   gaps):
   ```sh
   node tools/sheet.mjs ch3 "93,97,103,110,118,125,131,137,145,153,161,165.5" 1440x810 3
   node tools/sheet.mjs ch3p "103,125,131,150,162,166" 390x844 6
   node tools/sheet.mjs ch3l "103,131,162" 844x390 3
   ```
2. **Close-ups at 2x** of every focal moment and anything suspicious:
   `node tools/crop.mjs shots/x.png 131 1440x810 2 120,330,700,300`.
3. **Write down every flaw** you see, fix them, re-render, and check the fix at all three sizes.
4. When a fix is good, run the automated checks (section 3), commit, publish.

Captions and the end title in contact sheets can lag (they fade in the page, not the frame).
Trust `tools/playtest.mjs` and `tools/endtest.mjs` for those.

## 1b. The full sweep (before calling anything finished)

Chapter reviews look at chosen beats; the clumsy moments live between them. The second film's
sweep found about fifteen flaws its chapter reviews had missed (a train floating over a city, a
figure standing on a tank, a rider galloping through a later chapter, a monk walking into a
cliff, a cloud showing through a close-up card).

1. **Every 3 seconds of the whole film**, 16 frames per sheet at 1440x810, 4 columns:
   ```sh
   # t from 1.5 to the end in steps of 3; 16 per sheet
   node tools/sheet.mjs sw_0 "1.5,4.5,7.5,...,46.5" 1440x810 4
   ```
   Look at every frame for the checklist in section 2, not only for beauty.
2. **Close-ups** of anything suspicious before deciding (many suspects are fine: a camel walking
   in front of a pagoda is layering, not a flaw).
3. **Motion strips**: for everything that moves (trains, walkers, riders, robots, rockets,
   things leaving), render 8 frames 0.1 s apart and check for jumps, pops and things vanishing.
4. **Code checks**: grep for unbounded movers (`move: (t) => (t -`, `Math.max(0, t`) and give each
   a limit and an exit; list entities without `foldAt`/`to` that are still on screen in the next
   chapter.
5. Fix everything, re-render the fixed moments at desktop and phone size, then run the
   automated checks again.

## 1c. The light script check

Render one frame per era in a single sheet. If two different eras share the same sky, light
and air, give one of them its own look (`ERAS`) and weather (`WX`). Then render the crossfade
moments between eras and check nothing flashes or turns muddy.

## 2. What to look for

- **Movement that never ends**: anything still moving or still standing in the next chapter.
- **Long things**: trains, convoys, walls: do they enter, leave and stay on their supports?
- **Staging of people**: walkers stop short of objects; groups are spaced; nobody stands on or in
  a vehicle, furnace, cliff or wall by accident; famous images are staged as they happened.
- **Contact with the ground**: anything floating (ends of long rigid shapes on the curve), hulls
  hidden in waves, feet under the ground, things standing on air (give a sitting figure a seat).
- **Layering**: people or lights showing through objects; props hidden behind clouds, spires or
  buildings; a prop covering a face.
- **Timing**: every visual lands with its line, not before it (a lab appearing during the wars
  spoils "it also found antibiotics"); nothing lingers into the next beat.
- **Richness**: every era as specific and detailed as the best one; no generic boxes; enough
  life in the frame (people doing things, smoke, animals, light).
- **Readability**: night scenes still read; the focal moment is clear on a phone; captions never
  touch the controls; titles fit narrow phones.
- **Craft**: hand-cut edges, shadows, softness of distant layers; no hard seams or wedges in the
  ground paint; stars fading as day comes.
- **The ending**: the last image is beautiful at every size.
- **The first screen**: the title card over the opening scene is the first thing a friend sees
  from a DM link; screenshot it on a phone and on desktop.
- **Cards**: hanging infographic cards readable in portrait; their numbers right.

## 3. Automated checks

Start both servers first (`python3 -m http.server 8765 &` and
`python3 tools/rangeserver.py . 8766 &`). Each tool exits non-zero when something is wrong.

| Command | Checks |
| --- | --- |
| `node tools/scan.mjs 8765` | Renders every 1.5 s of the film at desktop and phone size; reports any error. |
| `node tools/playtest.mjs 8766` | Begin starts sound; chapter jumps land at the right time with the right caption; pause holds and play resumes. |
| `node tools/endtest.mjs 8766` | Plays the last chapter to the end: end title, controls return, Play replays. |
| `node tools/inapp.mjs 8766` | Instagram's in-app browser on iPhone, Android, sideways and small iPhone: sound on the first tap, controls, captions clear of the controls, pause when leaving, Play on return. |
| `node tools/memory.mjs 8766` | Canvas memory counted the way iPhones count it: at start, at the peak while the whole film plays through (cut ahead, freed behind), and after a rotation rebuild. |
| `node tools/starttrace.mjs 8766 4` | Start-up on a 4x slower phone over slow 4G: when the code is ready and when the first frame draws. |

This machine has no graphics chip, so frame times here are much slower than on a real device
and are not a measure of smoothness. To find wasted work per frame, count drawing calls
instead (build everything first so background building is not counted):

```js
// in page.evaluate, after window.__ready:
const s = window.__stage; s.bakeAhead(0, 1e9); s.bakeBudget = 0;
// wrap CanvasRenderingContext2D.prototype methods (drawImage, fill, stroke, createRadialGradient...)
// with counters, then window.__renderAt(t) and read the counts
```

Hundreds of `drawImage` calls a frame are fine. Thousands of strokes, or more than about 50
new gradients a frame, mean something should be cached.

## 4. Reporting

Say what changed, what was checked and how, and what could not be checked (the sound by ear,
real devices, real Instagram). Never call it perfect while a known flaw remains.
