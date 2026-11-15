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
8. Set pieces: making each chapter unforgettable
9. Modern subjects: making technology impressive
10. Hard chapters
11. Endings

## 1. The vision

A website that plays as a cinematic, narrated, animated film about the story, about 6–13 minutes
long (8 for humanity, 12.5 for China's long history). Someone presses Begin and within ten seconds forgets they are on a website.

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
  The second film's pull-back wound the whole timeline (7.6 laps of the globe) into a ball of red
  thread, the film's title made literal (section 11).

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

- **Every era has its own air.** Write a light script before building: for each era, a sky, an
  ambient light, a colour grade and the air in it (dust, mist, snow, sand, petals, leaves, sun
  rays). Match it to what the era *felt* like, not only the time of day: misty morning for
  philosophers, a storm sky for a conquest and the sun coming out for the new emperor, snow on a
  northern frontier, amber dust over an excavated army, desert gold on a trade road, canal mist at
  dawn, a golden capital, a cold steppe wind, sea haze for a fleet, autumn leaves for a dynasty in
  decline, a harsh reddened grey for a time of fear. A run of identical "day" sky was the single
  thing that made chapters feel generic; the era looks fixed it more than any new prop.
- **Always alive**: dust in the light, embers, smoke, clouds drifting on threads, birds, stars,
  fireflies, sea glints, small idle movements in every figure, a camera that breathes.
- **Light shows progress**: in a history, fire, then torches and candles, gas lamps, electric
  light, screens. Night scenes are where light lands hardest; place the big light moments at
  night.
- **Film look**: vignette, grain, a warm glow (bloom), a gentle colour grade per era, light shafts
  from a low sun, aerial perspective on distant layers.
- **Pacing**: quiet moments between busy ones; the biggest moments land slowly; camera lean-ins
  on focal moments.
- **The Milky Way and big night skies** are worth it for any moment of wonder (first music,
  electricity reaching the last villages, a satellite crossing).
- **Close-up cards never sit on empty darkness**: behind them put the scene's own light (the
  diviner's fire glowing from below, embers, the signs being carved drifting faintly at the edges).

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

## 8. Set pieces: making each chapter unforgettable

Every chapter needs at least one moment that could only be in this film, built with care until
it looks impressive at phone size. Ones that worked:

- **Data you can watch grow**: a paper map of the country drawing its high-speed railways year by
  year with a year and kilometre counter; a small card where life expectancy grows from 35 to 65
  as two paper bars. Numbers must be accurate; label them plainly.
- **A light show**: hundreds of drone lights rising off a river front and forming a flying dragon.
- **Nature answering engineering**: a rainbow standing in a dam's spray; pink dolphins leaping by
  the sea bridge whose towers were shaped like them; a sea of cloud in a gorge under the world's
  highest bridge; birds returning over new forests.
- **A switch**: a factory hall lit while robots are introduced, then its lamps going out one by
  one on "with the lights off", leaving only welding sparks and status LEDs.
- **A wave of light**: a spark running pole to pole, then a village lit, then hundreds of hamlets
  lighting up across the dark hills under the Milky Way.
- **The thing itself, up close**: an oracle bone with the crack spreading and the question carved
  beside it; a seismoscope dropping its ball into a toad's mouth; a 9,000-year-old flute played.
- **A cameo nobody names**: a space station drifting across the night sky above the trains.

## 9. Modern subjects: making technology impressive

The modern era is where films drift into generic towers and boxes. For each invention or
mega-project:

1. **Find its signature silhouette** and cut that: the twisting notch of a skyscraper, a bottle-
   opener aperture, a bullet train's long nose and red stripe, a tokamak's D-shaped coils and
   cryostat, a six-axis arm's joints, a launch tower beside a fat-booster rocket.
2. **Give it a behaviour that shows what it does**: plasma lighting inside spinning field lines;
   a robot arm reaching down to weld in a burst of sparks; spillways opening one by one; a train
   leaving a tunnel and entering the next; a rocket lifting out of a billowing paper steam cloud.
3. **Add the human scale**: engineers at the desk, physicists pointing, people with phones.
4. **Add one wonder around it** (section 8): the rainbow, the dolphins, the cloud sea, the drones.
5. **Light it**: most modern scenes are better at night or dusk, where screens, windows,
   headlights and glows carry the image.
6. Check it at phone size; stop only when it looks incredibly impressive, not merely present.

## 10. Hard chapters

Famine, war, persecution, massacres: restraint, not spectacle, and not emptiness either. Dim and
desaturate the light, drop the melody, and show a few quiet, specific details: cracked fields and
people holding empty bowls; furnaces going cold; posters, loudspeakers and raised little books;
one man standing in front of a column of tanks, staged exactly as the real image. Give the
counterweight its moment when the story has one (a cure found in an old book; schools and clinics).

## 11. Endings

The last image should turn the film's title or central metaphor into a picture, and bring back the
film's first sound. In The Long Thread the red thread stitched through every chapter winds, during
the pull-back, into a ball around the whole planet while the bone flute from the first scene plays
again. Then the title, then quiet.
