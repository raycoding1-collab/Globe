# Everything So Far

A six-minute narrated film about the history of humanity, made of cardboard and code.
A tiny paper planet turns at the bottom of the screen; each stretch of it is an era,
and the next one is always rising over the horizon.

## Watch it

**https://raycoding1-collab.github.io/Globe/** (published from the `gh-pages` branch; run `tools/publish_pages.sh` to update it).

## Watch it locally

```sh
python3 -m http.server 8765
# open http://localhost:8765/ and press Begin (with sound)
```

`?t=SECONDS` freezes the film on one frame (used for checking frames).

## How it is made

- `film/film.json`: the master script, with narration lines, chapters and the times of every event.
- `src/film.js`: the film itself: the camera path, every cut-out's place on the globe, the paint of each era, sky and light over time, and the special moments.
- `src/engine.js`: the stage: the stacked turning discs, light, smoke, film grain and pop-up springs.
- `src/paper.js`: the cardboard material (hand-cut edges, board thickness, paper grain, uneven paint, shadows).
- `src/people.js`, `src/kinds_nature.js`, `src/kinds_built.js`, `src/cutouts.js`, `src/sky.js`: every cut-out, prop and close-up card.
- `src/sound.js`: playback; the soundtrack is the clock, and paper flaps are played live as cut-outs spring up.
- `src/timeline.js`: generated; do not edit.

## Rebuilding the soundtrack

The narration is synthesised locally with [Kokoro](https://github.com/thewh1teagle/kokoro-onnx)
(a blend of two British male voices); the score, ambience and effects are synthesised in Python.

```sh
python3 -m venv /home/user/tts/venv
/home/user/tts/venv/bin/pip install kokoro-onnx soundfile numpy scipy
# put kokoro-v1.0.onnx and voices-v1.0.bin (release model-files-v1.0) in /home/user/tts
/home/user/tts/venv/bin/python tools/narrate.py film/film.json     # times the narration, writes src/timeline.js
/home/user/tts/venv/bin/python tools/build_audio.py film/film.json # builds assets/audio/film.mp3
```

## Checking frames

```sh
node tools/sheet.mjs NAME "30,86.5,150.8" 1440x810 3   # contact sheet -> shots/sheet_NAME.jpg
node tools/crop.mjs out.png 87 1440x810 1 520,250,420,300
node tools/play.mjs 390x844 8                           # real-time playback test
```

## Make another film in this format: the `paperfilm` skill

Everything that went into this film (the creative brief, the engine, the sound pipeline, the
review and phone checks, and the lessons learned) is packaged as a Claude skill called
`paperfilm`. Install `skill/paperfilm.skill` once (open it in Claude and press Save skill), then
in any new project say "paperfilm" with a story, for example: *paperfilm: the history of flight*.

- `skill/paperfilm/`: the skill's guides (`SKILL.md` and `references/`).
- `sh tools/make_skill.sh`: rebuilds `skill/paperfilm.skill`, bundling this project's code as the template.
