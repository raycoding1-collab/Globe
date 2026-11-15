---
name: paperfilm
description: Make a narrated, animated cardboard film as a website, in the "paperfilm" format of "Everything So Far" (the history of humanity) and "The Long Thread" (the history of China). A tiny cardboard globe turns at the bottom of the screen and each stretch of it is a stretch of the story; hand-cut paper cut-outs spring up over the horizon under light and weather that change with every era; a calm narrator tells it; an original synthesized score and paper sounds carry it; it plays like a short film in any browser and in Instagram's in-app browser. Use this skill whenever the user says "paperfilm" (also "paper film", "cardboard film", "like the Globe film", "make a story with the paperfilm skill about X"), or asks to turn any story, history, biography, place, science topic or process into a narrated animated paper or cardboard film or film-like website, even if they do not name the format.
---

# paperfilm

A paperfilm is a short narrated film that runs as a web page. The whole world is a miniature
made of cardboard and filmed on a table: a tiny planet fills the bottom of the screen and never
stops turning. The globe is the story's timeline, so each stretch of it is a stretch of the story
and the next part is always rising over the horizon. Cut-outs come over the horizon lying flat,
spring up with a wobble, and roll away. A warm narrator tells it, the music grows with it, and
the light and weather change with it. It ends on an open image that turns the film's title into
a picture.

Two finished films are the reference:
- **"Everything So Far"** (https://tinyurl.com/everything-so-far, repo `raycoding1-collab/Globe`):
  humanity, 8 minutes. The first film; most of the brief comes from it.
- **"The Long Thread"** (https://tinyurl.com/the-long-thread, repo `raycoding1-collab/China-`):
  China from a 9,000-year-old bone flute to the far side of the Moon, 12.5 minutes. Its complete,
  tested code is bundled in `assets/template/`: the newest engine (memory windowing, era light,
  weather), both cut-out libraries (the first film's and China's), the sound pipeline with its
  instrument library, and every test tool.

**Start every paperfilm from `assets/template/`.** A new film means writing a new story into it,
not building a new engine.

## When the user says "paperfilm" + a story

Decide what can be decided and start. The user's standing preferences (below) answer most
questions. Only ask about things that genuinely change the film and that you cannot infer: for
example a hard length limit, or a point of view the story must take. If the user is away, ask
nothing that needs an answer; pick sensible defaults and say what you chose.

## The workflow

Work in this order. Each phase has a reference file with the details; read it when you get there.

1. **Set up.** Copy everything in this skill's `assets/template/` into the new project. Keep the
   engine files as they are. The story files (`film/film.json`, `src/film.js`, the score in
   `tools/build_audio.py`) still hold The Long Thread: keep it running as the worked example and
   replace it chapter by chapter (`references/engine.md` lists what is engine and what is story).
   Install the tools: Playwright (`ln -s "$(npm root -g)/playwright" node_modules/playwright`),
   the voice engine (`references/sound.md`), and start the two local servers:
   `python3 -m http.server 8765` and `python3 tools/rangeserver.py .` (port 8766). Restart them
   whenever a test cannot connect: they die when the session's worker restarts.
2. **Research and script.** Get the facts right first. Write `film/film.json`: chapters,
   narration lines and every event time (`references/brief.md`).
3. **One living scene first.** Build the opening chapter completely, with sound if possible. Look at
   it on desktop and phone and judge it honestly before building the rest: this is where the
   look is set.
4. **The whole world.** Lay every chapter along the globe. Give every narrated line its own visual
   moment, and every chapter at least one set piece: something that could only be in this film.
5. **The light script.** Give every era its own sky, light, colour grade and air (an `ERAS` look,
   plus weather from `WX`), so that no two eras share one day (`references/engine.md` section 6).
   This did more for immersion than anything else in the second film.
6. **Sound.** Narration, an original score on one recurring theme played on the story's own
   instruments, ambience per era, sounds for every set piece (`references/sound.md`).
7. **Review rounds.** Contact sheets at desktop, phone and phone-sideways sizes, close-ups of every
   focal moment, the automated checks. Then, before calling it finished, **the full sweep**: a
   frame every 3 seconds of the whole film, close-ups of anything suspicious, and 0.1-second
   motion strips of everything that moves (`references/review.md`). The sweep finds what
   chapter-by-chapter reviews miss.
8. **Phones, in-app browsers, publishing.** In-app and memory tests, GitHub Pages, link preview,
   short link (`references/ship.md`).

Report plainly at the end: what changed, what was checked, and what you could not check (you
cannot hear the soundtrack or test on a real phone, so say so).

## The formula in brief

`references/brief.md` holds the full creative brief. The core of it:

- **A real miniature.** Everything is cardboard: visible edges, board thickness, soft shadows,
  paper grain, imperfect hand-cut shapes. Distant layers are softer and slower.
- **Every era has its own air.** Misty morning for philosophers, a storm for a conquest, snow on a
  frontier, amber dust over an excavation, desert gold with sun rays on a trade road, autumn
  leaves for a declining dynasty, harsh reddened grey for a time of fear. Never let one flat day
  sky run on for more than about 30 seconds.
- **Always alive.** Dust, embers, petals, sand, mist along the ground, birds, stars, fireflies,
  small idle movements. A frame is never frozen, even in quiet moments.
- **Light tells the progress of the story**: fire, candles, gas, electricity, screens, or the
  story's own equivalent. Put the big light moments at night.
- **Every line gets a picture; every chapter gets a set piece.** Prefer a physical paper
  metaphor to a literal illustration (a chain of paper children; a map card that draws a
  railway network year by year with a counter; a drone light show that becomes a dragon; a
  rainbow in a dam's spray; a factory's lamps going out one by one on "with the lights off").
- **Modern subjects are the hardest: make them bespoke.** Model each machine or landmark's real
  signature shape and give it a behaviour that shows what it does (plasma that lights inside
  field lines, a robot arm that welds, a train that leaves a tunnel). Generic boxes are the
  failure mode of every modern chapter.
- **Hard subjects get restraint, not emptiness**: dimmed light, no melody, and a few quiet,
  specific details (cracked fields, empty bowls) instead of a near-empty stage.
- **A film, not a page.** One Begin button, then only pause, chapters, captions and volume.
  Vignette, grain, glow. Real quiet moments. The biggest moments land slowly.
- **The ending turns the title into an image** (the whole timeline wound into a ball of red
  thread), and the film's first sound returns (the bone flute).
- **Truth.** History right; debated claims not presented as settled; famous images staged the
  way they really happened.

## Standing preferences of this user

These came from the user directly. Apply them to every paperfilm without being asked.

- **Never decrease the quality of the animation.** No automatic downgrades. Make it fast instead
  (lazy sprites, freeing far-behind sprites, cached glows; see `references/engine.md`).
- **No high, piercing or chirping sounds.** Lowpass anything bright (under about 2–3 kHz).
- **Every part as rich as the best part**, environments and objects done "incredibly well".
  Later chapters must not fall back to generic boxes.
- **Extra care for the modern era**: each invention and mega-project made creatively, never with
  a generic object, and not left until it looks incredibly impressive.
- **People never appear inside objects by accident.** Lights must not shine through things in
  front of them. Deliberate dollhouse cutaways are fine.
- **It must work the same when opened from an Instagram DM**, on iPhone and Android.
- **Judge honestly.** The user notices clumsy details (a train floating, a figure on top of a
  tank). Never call it perfect while a known flaw remains; say what you could not check.
- **Keep going on long jobs.** The user may be away: do not ask for answers then. Schedule a
  restart after usage resets when asked, and delete it once the work is done.
- **Publishing**: GitHub Pages plus a TinyURL short link, like the first film.

## Pitfalls already paid for

Each of these happened. Check for them on purpose:

- **Runaway movers.** Every `move(t)` must be bounded (`clamp`) and every mover must leave
  (`to` or `foldAt`) before the next scene. Unbounded movers wandered into later chapters: a
  Mongol rider through the Ming palace, a marathon runner into a factory, a car round the whole
  globe. Grep for `move: (t) => (t -` and `Math.max(0, t` before finishing.
- **Long objects need an entrance and an exit.** A 5-car train trails ~47° behind its nose: it
  floated over a city and later ran off its viaduct. Bring it out of a tunnel and into another,
  and clip it (and its glowing windows) by angle. Never let something vanish all at once.
- **Long rigid shapes on the curve** lift off the ground at their ends: bend them piece by piece.
- **People staged wrong**: a monk walking on into a cliff, a figure standing on a tank, officials
  overlapping each other, hungry figures pressed into furnaces. Check groups for spacing and
  every walker for where it stops.
- **Overlays above cards**: anything drawn in `over` after a close-up card shows through it (a
  launch cloud through the Moon card). Fade such effects out before the card arrives.
- **Name collisions**: a new `KINDS.crane` (the bird) silently replaced the template's tower
  crane everywhere. Check `KINDS[name]` before defining a kind; prefix story-specific kinds.
- **Long flat pre-pop strips**: timed cut-outs lie flat for 2.5 s before springing up; longer and
  long walls read as sticks lying about.
- **Generic shared light**: one `DAY` palette across two minutes made four chapters look the same.
- **Weather and cards on phones**: size particles with `max(u, min(W, H) / 820)` so they read on
  narrow screens; check every hanging card in portrait.
- **Boats** disappear behind the front wave strip: raise the hull onto the waves. Animals in water
  scenes belong in the nearer `front` layer.
- **Asking for fullscreen before starting audio** makes Android in-app browsers refuse sound.
- **Building every sprite up front** freezes slow phones; holding every sprite of a long film
  costs 200+ MB. The template cuts ~90 s ahead and frees what is far behind.
- **A prop appearing before its line** spoils the beat. Pop things up with their line.

## Files in this skill

- `references/brief.md`: the creative brief, story-writing rules, set pieces, the narrator.
- `references/engine.md`: the template's files, the entity and cut-out APIs, era light and
  weather, hooks, performance rules.
- `references/sound.md`: narration, score (including building a culture's instruments), ambience,
  mix levels.
- `references/review.md`: the review loop, the full sweep, the clumsiness checklist, automated checks.
- `references/ship.md`: phones and in-app browsers, publishing, link preview, short link.
- `assets/template/`: the complete code of The Long Thread. When unsure how to build something,
  look at how it was done there (search `src/film.js` for the chapter).

## Improving this skill

After a film, fold its lessons back in: edit `skill/paperfilm/` in the `raycoding1-collab/Globe`
repository (branch `ccr-f077ed5e-n128tc`) and rebuild the installable file with
`TEMPLATE=/path/to/newest/film sh tools/make_skill.sh`, which packs the guides plus that film's
code as the template into `skill/paperfilm.skill`.
