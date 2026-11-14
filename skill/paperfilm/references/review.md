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

Captions in contact sheets can lag (they come from the page, not the frame). Trust
`tools/playtest.mjs` for captions.

## 2. What to look for

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

## 3. Automated checks

Start both servers first (`python3 -m http.server 8765 &` and
`python3 tools/rangeserver.py . 8766 &`). Each tool exits non-zero when something is wrong.

| Command | Checks |
| --- | --- |
| `node tools/scan.mjs 8765` | Renders every 1.5 s of the film at desktop and phone size; reports any error. |
| `node tools/playtest.mjs 8766` | Begin starts sound; chapter jumps land at the right time with the right caption; pause holds and play resumes. |
| `node tools/endtest.mjs 8766` | Plays the last chapter to the end: end title, controls return, Play replays. |
| `node tools/inapp.mjs 8766` | Instagram's in-app browser on iPhone, Android, sideways and small iPhone: sound on the first tap, controls, captions clear of the controls, pause when leaving, Play on return. |
| `node tools/memory.mjs 8766` | Canvas memory at start, when everything is built, and at its peak, counted the way iPhones count it. |
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
