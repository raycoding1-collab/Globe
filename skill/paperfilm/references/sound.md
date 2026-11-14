# Sound: narration, score, ambience, mix

Everything is made locally: the narrator by a neural voice engine (Kokoro), the music and sound
by additive synthesis in Python. The result is one mixed `assets/audio/film.mp3`, which is also
the film's clock. Paper flaps are the only live sounds (in `src/sound.js`).

## 1. Setup (once per machine)

```sh
python3 -m venv /home/user/tts/venv
/home/user/tts/venv/bin/pip install kokoro-onnx soundfile numpy scipy
# kokoro-v1.0.onnx and voices-v1.0.bin: GitHub release "model-files-v1.0" of thewh1teagle/kokoro-onnx
cd /home/user/tts && curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx \
  && curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

If a download is refused by the network rules, the environment needs those hosts allowed
(github.com and the release-asset host it redirects to). Use the system Python only for the
web server; run the audio tools with the venv's Python.

## 2. Narration (`tools/narrate.py`)

```sh
/home/user/tts/venv/bin/python tools/narrate.py film/film.json
```

- The voice is a blend: `bm_lewis 0.55 + bm_george 0.45`, speed 0.91, British English, then
  pitched one semitone down (`"pitch": -1`). It sounds calm, warm and deep. Keep it unless the
  story wants another voice.
- Each sentence is cached in `.cache/voice/`, so only changed lines are re-synthesized.
- The script reports sentence start times and overlaps: fix overlaps by moving line times in
  `film.json`, not by speeding the voice.
- Respellings: add the story's numbers and hard names to the `spoken = text.replace(...)` line
  ("1492" -> "fourteen ninety-two", "Uruk" -> "Oorook"). Listen-free check: Kokoro's tokenizer
  shows the phonemes it will say.
- It writes `src/timeline.js` (events, chapters and caption cues). Run it after every script
  change, then rebuild the audio.

## 3. Score and ambience (`tools/build_audio.py`)

```sh
/home/user/tts/venv/bin/python tools/build_audio.py film/film.json   # 3-8 minutes; prints levels
```

Keep the instrument library and machinery: `Score` (`add`, `phrase`, `chords`, `arp`),
instruments (`flute`, `hum`, `choir`, `drum`, `timpani`, `pluck`, `harpsi`, `oud`, `kalimba`,
`piano`, `celesta`, `bell`, `bowed`, `reed`, `tri`, darbuka, log drum), `drone`, `reverb`,
`curve`, `place`, the voice ducking and the look-ahead limiter. Rewrite:

- `build_score(EV, dur)`: one section per chapter, timed by `EV`. Start with one instrument (a
  drum or a hummed voice by the fire) and grow to a full arrangement by the end. Use one
  recurring theme (`THEME_A`, with an answering `THEME_B`) in changing instruments: flute by the
  fire, reed on the trade roads, strings in the cities, piano with electric light, the full
  arrangement at the end. Mark focal moments with a single note or chord (a piano note for the
  first electric light, a note for each house the spark reaches). Hard moments get no melody,
  only weight (timpani, low strings). Hush the rhythm under sad lines and bring a warm chord back
  for hope.
- `ambience(dur, EV)`: curves over time for wind, night insects, sea, fire crackle, crowd murmur,
  machines, plus one-off effects (paper flutters for props, a soft thud when something lands).

## 4. Mix targets

The build prints levels per 12-second window and overall. Aim for:
- voice about −21 dB RMS while speaking; music about −27; ambience about −33 overall;
- no ambience window louder than about 4 dB under the voice in that window (war rumble, trains
  and rockets went over this in the first film and had to come down);
- final loudness about −19 dBFS RMS, peaks below −1 dB, 128 kbps MP3.

Measure the separate stems in `.cache/_voice.wav`, `.cache/_music.wav` and `.cache/_amb.wav`
when something sounds too loud on paper.

## 5. The rule about high sounds

The user found high, chirping sounds painful (bird chirps, camel bells, bright clicks). Keep
every effect soft and low:
- no bird song; bells and clinks lowpassed under about 1.6–2.5 kHz and quiet;
- celesta and kalimba notes stay in the middle register;
- after every build, check the 3–8 kHz band for spikes:

```python
import numpy as np, soundfile as sf; from scipy import signal
x, sr = sf.read('.cache/_amb.wav'); x = x.mean(axis=1) if x.ndim > 1 else x
y = signal.sosfilt(signal.butter(4, [3000, 8000], 'bandpass', fs=sr, output='sos'), x)
e = [20 * np.log10(np.sqrt((y[i*sr:(i+1)*sr]**2).mean()) + 1e-9) for i in range(len(y) // sr)]
print(sorted(range(len(e)), key=lambda i: -e[i])[:6])   # the seconds to listen for
```

You cannot hear the result, so say plainly in the report which sounds were checked only by
measurement.
