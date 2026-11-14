---
name: paperfilm
description: Make a narrated, animated cardboard film as a website, in the "paperfilm" format first made for "Everything So Far" (the history of humanity on a tiny turning paper planet). A small cardboard globe turns at the bottom of the screen, each stretch of it is a stretch of the story, hand-cut paper cut-outs spring up over the horizon, a calm narrator tells it, an original synthesized score and paper sounds carry it, and it plays like a short film in any browser and in Instagram's in-app browser. Use this skill whenever the user says "paperfilm" (also "paper film", "cardboard film", "like the Globe film", "the Everything So Far format"), or asks to turn any story, history, biography, place, science topic or process into a narrated animated paper/cardboard film or film-like website, even if they do not name the format.
---

# paperfilm

A paperfilm is a short narrated film that runs as a web page. The whole world is a miniature
made of cardboard and filmed on a table: a tiny planet fills the bottom of the screen and never
stops turning. The globe is the story's timeline, so each stretch of it is a stretch of the story
and the next part is always rising over the horizon. Cut-outs come over the horizon lying flat,
spring up with a wobble, and roll away. A warm narrator tells it, the music grows with it, and
the light changes with it. It ends on something open: for a history, blank uncut cardboard.

The working reference is "Everything So Far" (https://tinyurl.com/everything-so-far, source in the
GitHub repo `raycoding1-collab/Globe`). Its complete, tested code is bundled in
`assets/template/`. **Start every paperfilm from that template**: the engine, the paper material,
the puppets, the sound pipeline and every test tool are reusable as they are. A new film means
writing a new story into them, not building a new engine.

## When the user says "paperfilm" + a story

Decide what can be decided and start. The user's standing preferences (below) answer most
questions. Only ask about things that genuinely change the film and that you cannot infer: for
example a hard length limit, or a point of view the story must take. If the user is away, ask
nothing that needs an answer; pick sensible defaults and say what you chose.

## The workflow

Work in this order. Each phase has a reference file with the details; read it when you get there.

1. **Set up.** Copy everything in this skill's `assets/template/` into the new project. Keep the
   engine files as they are. The story files (`film/film.json`, `src/film.js`, the score in
   `tools/build_audio.py`) still hold the first film: keep it running as the worked example and
   replace it chapter by chapter, keeping the same structure and exports
   (`references/engine.md` lists what is engine and what is story). Install the tools:
   Playwright (symlink the global copy: `ln -s "$(npm root -g)/playwright" node_modules/playwright`),
   the voice engine (`references/sound.md` has the exact setup), and start the two local servers:
   `python3 -m http.server 8765` and `python3 tools/rangeserver.py . 8766`.
2. **Research and script.** Get the facts right first. Write `film/film.json`: chapters,
   narration lines and every event time. The writing rules are in `references/brief.md`.
3. **One living scene first.** Build the opening chapter completely, with sound if possible. Look at
   it on desktop and phone and judge it honestly before building the rest: this is where the
   look is set.
4. **The whole world.** Lay every chapter along the globe (`references/engine.md`). Give every
   narrated line its own visual moment, so no sentence is only spoken.
5. **Sound.** Narration, an original score with one recurring theme, ambience per era, paper
   sounds; mix to the levels in `references/sound.md`.
6. **Review rounds.** Contact sheets at desktop, phone and phone-sideways sizes, close-ups of every
   focal moment, and the automated checks. Fix, then go round again (`references/review.md`).
7. **Phones, in-app browsers, publishing.** Run the in-app browser and memory tests, publish to
   GitHub Pages, add the link preview, make a short link (`references/ship.md`).

Report plainly at the end: what changed, what was checked, and what you could not check (you
cannot hear the soundtrack or test on a real phone, so say so).

## The formula in brief

`references/brief.md` holds the full creative brief. The core of it:

- **A real miniature.** Everything is cardboard: visible edges, board thickness, soft shadows,
  paper grain, imperfect hand-cut shapes. Distant layers are softer and slower. Nothing looks
  like flat vector art.
- **Always alive.** Dust, embers, firelight, clouds, stars, birds, small idle movements. A frame
  is never frozen, even in quiet moments.
- **Light tells the progress of the story.** In history, fire, then candles, gas, electricity,
  screens. In other stories, find the equivalent.
- **A film, not a page.** One Begin button, then no interface but pause, chapters, captions and
  volume. A soft vignette, grain and glow. Pacing with real quiet moments. The biggest moments
  land slowly.
- **Every line gets a picture.** Prefer a physical paper metaphor to a literal illustration. Some
  that worked: a chain of paper children, four folding away and coming back in colour for a
  child-mortality statistic; island fires lighting one by one across a dark ocean; a close-up card
  that rises like a clay tablet or a Moon horizon; small paper objects riding a red thread between
  places.
- **Sound is half of it.** A paper flap for every pop-up, ambience for every era, and a score that
  grows from a single drum or voice to a full arrangement around one recurring theme.
- **Truth.** History right; debated claims not presented as settled; hard subjects shown with
  restraint, not spectacle.

## Standing preferences of this user

These came from the user directly while making the first film. Apply them to every paperfilm
without being asked.

- **Never decrease the quality of the animation.** No automatic downgrades (no dropping effects
  or resolution on slow devices). Make it fast instead: build sprites lazily, free scratch
  canvases, cache glows (see `references/engine.md`).
- **No high, piercing or chirping sounds.** Bird chirps, bells and clicks above ~2 kHz were
  painful. Keep effects low and soft; lowpass anything bright.
- **Every part as rich as the best part.** Later chapters must not fall back to generic boxes.
  Each era needs its own specific, detailed, creative moments.
- **People never appear inside objects by accident.** Lights must not shine through things in
  front of them. Deliberate dollhouse cutaways are fine.
- **It must work the same when opened from an Instagram DM**, on iPhone and Android.
- **Judge honestly.** Look at the frames closely: the user notices things like a train's last
  carriage floating off the ground. Do not call it finished while you can still see flaws.
- **Keep going on long jobs.** The user may be away, so do not ask for permissions or answers
  then. If asked, schedule restarts after usage resets and continue the work.

## Pitfalls already paid for

Each of these happened in the first film. Check for them on purpose:

- Long rigid shapes on the curved planet (trains, bridges, walls) lift off the ground at their
  ends. Bend them along the curve, piece by piece.
- Boats and rafts disappear behind the front wave strip. Raise them so the hull rides on the
  waves.
- Hanging props and close-up cards drawn in the sky layer get covered by clouds and buildings.
  Draw them in the foreground pass when they must read clearly.
- Asking for fullscreen before starting audio makes Android in-app browsers refuse the sound.
  Start audio first, inside the tap.
- Thousands of temporary canvases blank the page on iPhones. Free each one as soon as it is used.
- Building every sprite before the first frame freezes slow phones for 10–15 seconds. Build what
  is on screen first and the rest in the background.
- A prop's or speaker's next line appearing early (for example the lab before the medicine line)
  spoils the beat. Pop things up with their line.

## Files in this skill

- `references/brief.md`: the full creative brief, the story-writing rules and the narrator's voice.
- `references/engine.md`: how the template works, which files to keep and which to rewrite, the
  entity and cut-out APIs, and the performance rules.
- `references/sound.md`: narration (voice engine setup, voice blend), score, ambience and mix levels.
- `references/review.md`: the review loop, every automated check, and what to look for.
- `references/ship.md`: phones and in-app browsers, publishing to GitHub Pages, the link preview
  and the short link.
- `assets/template/`: the complete code of "Everything So Far" (engine, cut-out library, sound
  tools, test tools). It doubles as a worked example: when unsure how to build something, look at
  how the first film did it.
