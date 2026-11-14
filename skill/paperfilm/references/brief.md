# The paperfilm brief

This is the brief the first film was made to, generalized so it fits any story. Treat it as
the standard every frame is judged against.

## Contents
1. The vision
2. Turning a story into a paperfilm
3. The narrator
4. Atmosphere
5. Sound
6. The standard
7. How to work

## 1. The vision

A website that plays as a cinematic, narrated, animated film about the story, about 5–8 minutes
long. Someone presses Begin and within ten seconds forgets they are on a website.

- A tiny cardboard planet fills the bottom of the screen and never stops turning. The globe is
  time (or the story's path): each stretch of it is one part of the story, and the next part is
  always rising over the horizon.
- Everything is a miniature made of cardboard and paper, filmed on a table: visible cut edges,
  board thickness, soft shadows, paper grain, imperfect hand-cut shapes. Distant layers are
  softer, slower and paler, like real depth of field and air.
- Cut-outs come over the horizon lying flat, spring up with a wobble, and roll away behind.
- It ends on an open, quiet image. For a history that was blank, uncut cardboard rising over the
  horizon ("Ahead, the cardboard is still blank. No one has cut it yet. That part is up to us."),
  then a pull-back to the whole little planet: half of it the story so far, half of it uncut board.

## 2. Turning a story into a paperfilm

1. **Research first.** Collect the facts and dates from good sources. Where scholars disagree,
   say so in the narration ("hints at", "at least", "may have"), never present a debated claim
   as settled. Round numbers honestly ("more than four in ten", "tens of millions").
2. **Choose the beats.** Be selective: a few chapters (about 10–15 for an 8-minute film), each
   with one or two strong moments, not a list of everything. Cover the whole scope the story
   promises (in the first film: the whole world, not one region).
3. **Write the narration** in `film/film.json` as timed lines. Short sentences, one idea each,
   about 6–10 seconds spoken. Leave real gaps (2–5 s) where the picture carries the moment.
   Give the biggest moments room: for the first fire, the first writing and the first electric
   light, the narration stopped and the picture held for several seconds.
4. **Give every line its own visual moment.** List them before building. Prefer a physical paper
   metaphor over a literal picture:
   - a statistic becomes paper objects (a chain of ten paper children, four folding away);
   - "empires rose and fell" became monuments standing up and lying down on the horizon;
   - spreading ideas became small paper objects riding a red thread between places;
   - "books multiplied, so did arguments" became flying pages, then two scholars arguing with
     raised books;
   - a discovery shown in the discoverer's own notes (Galileo's rows of Jupiter and its moons).
   Close-up cards (a tablet, a printed sheet, a Moon horizon) rise from the bottom of the screen
   over a darkened veil for moments that need to be seen up close.
5. **Humour** is quiet and mostly visual: the inventor of the wheel watching it roll away down
   the curve of the world; a gazelle startled by a pop of sap.
6. **Hard subjects** (war, slavery, disease) get restraint: dimmed light, folding paper figures,
   no melody, a few plain words. They also get their counterweight when the story has one
   (medicine after the wars).
7. **Chapters** in `film.json` give the chapter menu. Name them plainly ("Fire", "Farming",
   "The 1800s", "Today").

## 3. The narrator

Calm, warm, deep, educational and accurate, quietly funny. Spoken like a good documentary
narrator, not a salesperson. Numbers are written so they are read naturally ("fourteen
ninety-two"), and hard names get phonetic respellings in `tools/narrate.py`. The narrator
never explains a joke the picture is making.

## 4. Atmosphere

- **Always alive**: dust in the light, embers, smoke, clouds drifting on threads, birds, stars,
  fireflies, sea glints, small idle movements in every figure, a camera that breathes.
- **Light shows progress**: in a history, fire, then torches and candles, gas lamps, electric
  light, screens. Night scenes are where light lands hardest; place the big light moments at
  night.
- **Film look**: vignette, grain, a warm glow (bloom), a gentle colour grade per era, light shafts
  from a low sun, aerial perspective on distant layers.
- **Pacing**: quiet moments between busy ones; the biggest moments land slowly; camera lean-ins
  on focal moments.
- **The Milky Way and big night skies** are worth it for any moment of wonder.

## 5. Sound

Half of the experience. A paper flap for every pop-up (synthesized live, quieter for distant
layers); ambience for every era (wind, fire, sea, crowd, machines) that never competes with the
voice; an original score that grows from one drum or one voice at the start to a full
arrangement, around one recurring theme heard in different instruments across the film. Details
and levels are in `sound.md`.

## 6. The standard

- Every frame should look like an award-winning short film.
- Motion is soft and physical: springs, wobble, sway, never linear slides.
- The story is right.
- It is as good on a phone (upright and sideways) as on a desktop, and in Instagram's in-app
  browser.
- No interface except Begin, pause, chapters, captions and volume.

## 7. How to work

- Build a small living scene first, then one chapter, then the rest.
- Critique your own frames honestly and often, at full resolution, on desktop and phone.
- When the user gives feedback, fix the cause, not just the frame they pointed at, and look for
  the same flaw everywhere else.
