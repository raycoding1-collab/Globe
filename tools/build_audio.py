#!/usr/bin/env python3
"""Build the soundtrack for one scene: narration (neural TTS), an original score,
ambience and scripted effects, mixed to a single file the picture then follows.

usage: tts-venv/bin/python tools/build_audio.py film/fire.json
Writes assets/audio/<name>.mp3 and src/cues.js (caption timings measured from the voice).
"""
import json, os, re, subprocess, sys
import numpy as np
import soundfile as sf
from scipy import signal

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TTS_DIR = os.environ.get('TTS_DIR', '/home/user/tts')
rs = np.random.RandomState(7)


# ------------------------------------------------------------------ helpers --
def env_adsr(n, a, r, sr=SR):
    e = np.ones(n)
    na, nr = min(n, int(a * sr)), min(n, int(r * sr))
    if na: e[:na] = np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    if nr: e[-nr:] *= np.cos(np.linspace(0, np.pi / 2, nr)) ** 2
    return e

def place(buf, x, t, gain=1.0, pan=0.0):
    """Mix mono x into stereo buf at time t with equal-power pan (-1..1)."""
    i = int(t * SR)
    if i >= buf.shape[0] or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    x = x[: buf.shape[0] - i]
    th = (pan + 1) * np.pi / 4
    buf[i:i + len(x), 0] += x * gain * np.cos(th)
    buf[i:i + len(x), 1] += x * gain * np.sin(th)

def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'); return signal.sosfilt(sos, x)
def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'highpass', fs=SR, output='sos'), x)

def slow_noise(n, rate, seed):
    """Smooth random curve in [0,1] changing about `rate` times a second."""
    r = np.random.RandomState(seed); k = max(4, int(n / SR * rate) + 4)
    pts = r.rand(k)
    return np.interp(np.linspace(0, k - 1, n), np.arange(k), pts)

def curve(n, pts):
    """Piecewise-smooth gain curve from [(t, v), ...]."""
    t = np.arange(n) / SR
    ts, vs = zip(*pts)
    return np.interp(t, ts, vs)

def reverb(x, rt=2.4, wet=0.3, bright=3200, seed=3):
    r = np.random.RandomState(seed); n = int(rt * 1.3 * SR)
    out = np.zeros((x.shape[0] + n, 2))
    for ch in range(2):
        ir = r.randn(n) * np.exp(-6.9 * np.arange(n) / (rt * SR))
        ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
        ir = lp(ir, bright); ir /= np.sqrt((ir ** 2).sum())
        out[:-1, ch] = signal.fftconvolve(x[:, ch], ir)
    return x + out[: x.shape[0]] * wet


# -------------------------------------------------------------- instruments --
def flute(freq, dur, vel=1.0):
    """A bone flute: nearly a sine, breathy, the pitch scooped into from below."""
    n = int((dur + 0.35) * SR); t = np.arange(n) / SR
    vib = 1 + 0.0045 * np.clip((t - 0.25) / 0.5, 0, 1) * np.sin(2 * np.pi * 4.9 * t + rs.rand() * 6)
    scoop = 1 - 0.018 * np.exp(-t / 0.05)
    ph = 2 * np.pi * np.cumsum(freq * vib * scoop) / SR
    y = np.sin(ph) + 0.30 * np.sin(2 * ph + 0.4) + 0.09 * np.sin(3 * ph) + 0.035 * np.sin(4 * ph)
    breath = bp(rs.randn(n), freq * 1.6, min(freq * 6, 9000)) * 0.22 + bp(rs.randn(n), 2500, 7000) * 0.03
    e = env_adsr(n, 0.085, 0.3) * (0.82 + 0.18 * np.exp(-t / 0.4))
    chiff = np.exp(-t / 0.03) * bp(rs.randn(n), 900, 3500) * 0.25
    return (y * 0.5 + breath * (0.6 + 0.4 * np.exp(-t / 0.2)) + chiff) * e * vel

def hum(freq, dur, vel=1.0):
    """A low hummed voice: closed mouth, soft, slightly unsteady."""
    n = int((dur + 0.5) * SR); t = np.arange(n) / SR
    drift = 1 + 0.004 * (slow_noise(n, 3, rs.randint(1e6)) - 0.5) + 0.006 * np.clip((t - 0.3) / 0.6, 0, 1) * np.sin(2 * np.pi * 4.6 * t)
    ph = 2 * np.pi * np.cumsum(freq * drift) / SR
    y = np.zeros(n)
    for k in range(1, 16):
        f = freq * k
        if f > 4000: break
        # nasal murmur: strong low formant, a dip, a small bump near 1 kHz
        fm = 1 / (1 + ((f - 260) / 190) ** 2) + 0.10 / (1 + ((f - 1050) / 220) ** 2) + 0.03 / (1 + ((f - 2300) / 300) ** 2)
        y += np.sin(k * ph + k * 0.7) * fm / k ** 0.5
    y += bp(rs.randn(n), 300, 1800) * 0.012
    return y * env_adsr(n, 0.22, 0.45) * vel * 0.5

def drum(vel=1.0, f0=78.0, damp=1.0):
    """A skin frame drum struck with the hand."""
    n = int(1.1 * SR); t = np.arange(n) / SR
    drop = 1 + 0.08 * np.exp(-t / 0.03)
    y = np.zeros(n)
    for ratio, amp, dec in [(1, 1, 0.42), (1.59, 0.5, 0.2), (2.14, 0.28, 0.14), (2.30, 0.2, 0.12), (2.65, 0.14, 0.09), (2.92, 0.1, 0.08), (3.6, 0.06, 0.05)]:
        y += amp * np.sin(2 * np.pi * np.cumsum(f0 * ratio * drop) / SR + rs.rand()) * np.exp(-t / (dec * damp))
    slap = lp(rs.randn(n), 1400) * np.exp(-t / 0.016) * 0.7 + bp(rs.randn(n), 1500, 4500) * np.exp(-t / 0.006) * 0.15
    return (y * 0.6 + slap * vel) * vel * np.minimum(1, t / 0.002)

def drone(n, freqs, seed=1):
    t = np.arange(n) / SR; out = np.zeros((n, 2))
    r = np.random.RandomState(seed)
    for f, a in freqs:
        for ch in range(2):
            for det in (-0.35, 0.3):
                swell = 0.55 + 0.45 * slow_noise(n, 0.18, r.randint(1e6))
                ph = 2 * np.pi * (f + det * (1 + ch * 0.3)) * t + r.rand() * 6
                out[:, ch] += a * swell * (np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)) * 0.5
    return out


# -------------------------------------------------------------------- score --
# The theme of the whole film, here in its first and barest form.
NOTE = {n: 440 * 2 ** ((i - 9) / 12) for i, n in enumerate(['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4'])}
def hz(name):
    m = re.match(r'([A-G]#?)(\d)', name); return NOTE[m.group(1) + '4'] * 2 ** (int(m.group(2)) - 4)
THEME_A = [('D4', 1), ('A4', 2), ('G4', 1), ('F4', 1), ('G4', 3)]
THEME_B = [('D4', 1), ('A4', 1), ('C5', 2), ('A4', 1), ('G4', 1), ('F4', 1), ('D4', 4)]

def score(dur, ev):
    n = int(dur * SR); dry = np.zeros((n, 2)); beat = 60 / 52
    # heartbeat drum: starts alone, far away
    t = 3.2; i = 0
    while t < dur - 6:
        lvl = np.interp(t, [3, 12, ev['lit'], ev['lit'] + 6, dur - 14, dur - 6], [0.25, 0.45, 0.45, 0.62, 0.55, 0.2])
        place(dry, drum(0.9, 76), t, lvl, -0.08)
        place(dry, drum(0.55, 80, 0.8), t + beat * 0.5 + rs.randn() * 0.008, lvl * 0.6, 0.1)
        if t > ev['lit'] + 2 and i % 2 == 1: place(dry, drum(0.4, 118, 0.6), t + beat * 1.5 + rs.randn() * 0.01, lvl * 0.5, 0.25)
        t += beat * 2; i += 1
    # drone under everything
    d = drone(n, [(hz('D2'), 0.5), (hz('A2'), 0.3), (hz('D3'), 0.16)])
    dry += d * curve(n, [(0, 0), (5, 0.10), (ev['lit'], 0.13), (ev['lit'] + 5, 0.2), (dur - 10, 0.18), (dur - 1, 0)])[:, None]
    # the theme: a flute answers the fire catching; a hummed voice joins it later
    def phrase(notes, t0, inst, octave=0, gain=1.0, pan=0.0):
        t = t0
        for name, beats in notes:
            f = hz(name) * 2 ** octave
            place(dry, inst(f, beats * beat * 0.96, 0.8 + 0.2 * rs.rand()), t + rs.randn() * 0.012, gain, pan)
            t += beats * beat
        return t
    t1 = phrase(THEME_A, ev['lit'] + 1.2, flute, 0, 0.30, -0.15)
    phrase(THEME_B, 47.2, flute, 0, 0.26, -0.15)
    phrase(THEME_A, 47.2, hum, -2, 0.42, 0.18)
    t2 = phrase(THEME_A, 61.0, hum, -1, 0.30, 0.1)
    phrase([('D4', 1), ('A4', 2), ('G4', 1), ('F4', 1), ('D4', 5)], 61.0, flute, 0, 0.24, -0.15)
    wet = reverb(dry, rt=2.8, wet=0.42, bright=2600)
    return wet


# ----------------------------------------------------------------- ambience --
def ambience(dur, ev):
    n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros((n, 2))
    # wind over grass
    for ch in range(2):
        w = bp(rs.randn(n), 180, 700) * (0.35 + 0.65 * slow_noise(n, 0.25, 40 + ch)) + bp(rs.randn(n), 900, 2600) * 0.12 * slow_noise(n, 0.4, 50 + ch)
        out[:, ch] += w * 0.05 * curve(n, [(0, 0), (2, 1), (16, 0.7), (dur - 4, 0.6), (dur, 0)])
    # crickets come in with the dark
    night = curve(n, [(0, 0), (5, 0.1), (13, 1), (ev['lit'] + 6, 0.75), (dur - 5, 0.7), (dur, 0)])
    for c in range(7):
        f = 3900 + rs.rand() * 1500; rate = 1.4 + rs.rand() * 1.2; pulses = 3 + rs.randint(3); pr = 26 + rs.rand() * 10
        ph = (t * rate + rs.rand()) % 1.0
        chirp = (ph < pulses / pr * rate).astype(float) * (0.5 + 0.5 * np.sin(2 * np.pi * pr * ph / rate - np.pi / 2))
        active = (slow_noise(n, 0.12, 100 + c) > 0.35).astype(float); active = lp(active, 2)
        y = np.sin(2 * np.pi * f * t) * chirp * active * (0.013 + rs.rand() * 0.014)
        place(out, y * night, 0, 1, rs.rand() * 1.8 - 0.9)
    # three breaths on the ember
    for b in ev['blows']:
        m = int(0.75 * SR); e = np.sin(np.linspace(0, np.pi, m)) ** 1.5
        place(out, bp(rs.randn(m), 500, 2600) * e * 0.07, b, 1, -0.1)
    # the fire: a soft catch, then crackle and a low breathing roar
    lit = ev['lit']; m = n - int(lit * SR); tf = np.arange(m) / SR
    grow = (1 - np.exp(-tf / 2.0)) * np.interp(tf, [0, dur - lit - 4, dur - lit], [1, 1, 0])
    whoosh = lp(rs.randn(int(1.4 * SR)), 900) * np.sin(np.linspace(0, np.pi, int(1.4 * SR))) ** 2 * 0.16
    place(out, whoosh, lit - 0.1, 1, 0)
    for ch in range(2):
        roar = lp(rs.randn(m), 420) * (0.5 + 0.5 * slow_noise(m, 5, 60 + ch)) * 0.085
        hiss = bp(rs.randn(m), 2000, 6000) * (0.4 + 0.6 * slow_noise(m, 7, 70 + ch)) * 0.008
        out[int(lit * SR):, ch] += (roar + hiss) * grow
    k = 0.0
    while k < dur - lit - 0.2:
        g = np.interp(k, tf[:: SR // 10], grow[:: SR // 10]); k += rs.exponential(1 / (2 + 9 * g))
        ln = int((0.002 + rs.rand() ** 2 * 0.012) * SR)
        f0 = 900 + rs.rand() ** 2 * 5000
        popn = bp(np.concatenate([rs.randn(ln), np.zeros(600)]), f0, min(f0 * 2.2, 12000)) * np.exp(-np.arange(ln + 600) / (ln * 0.6))
        place(out, popn, lit + k, g * min(0.5, 0.05 + rs.pareto(2.5) * 0.05), rs.randn() * 0.15)
    # one loud pop of sap, which is the end of a gazelle's curiosity
    m = int(0.25 * SR); crack = bp(rs.randn(m), 700, 6000) * np.exp(-np.arange(m) / (0.02 * SR)) * 0.2 + lp(rs.randn(m), 300) * np.exp(-np.arange(m) / (0.05 * SR)) * 0.16
    place(out, crack, ev['pop'], 1, 0.05)
    return reverb(out, rt=0.9, wet=0.08, bright=5000, seed=9)


# ---------------------------------------------------------------- narration --
def narration(spec, dur):
    sys.path.insert(0, TTS_DIR)
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(TTS_DIR, 'kokoro-v1.0.onnx'), os.path.join(TTS_DIR, 'voices-v1.0.bin'))
    v = spec['voice']
    style = sum(k.get_voice_style(name) * w for name, w in v['blend'].items())
    n = int(dur * SR); out = np.zeros((n, 2)); cues = []; gate = np.zeros(n)
    for line in spec['narration']:
        # speak sentence by sentence so the pauses between them are ours to place
        parts = [p.strip() for p in re.split(r'(?<=[.?!])\s+', line['text']) if p.strip()]
        t = line['t']; lines = []
        for p in parts:
            y, sr = k.create(p, voice=style, speed=v['speed'], lang=v['lang'])
            y = signal.resample_poly(y, SR, sr).astype(np.float64)
            idx = np.where(np.abs(y) > 0.01)[0]; y = y[max(0, idx[0] - 400): idx[-1] + 3000]
            y = y / (np.abs(y).max() + 1e-9) * 0.7
            # warmth: lift the chest, soften the very top, gentle compression
            y = y + lp(y, 180) * 0.35; y = y - hp(y, 7500) * 0.35
            y = np.tanh(y * 1.5) / 1.5
            place(out, y, t, 1.0, 0.0)
            d = len(y) / SR
            gate[int(t * SR): int((t + d) * SR)] = 1
            # captions: break long sentences at a comma or colon near the middle
            chunks = [p]
            if len(p) > 62:
                cs = [m.end() for m in re.finditer(r'[,:;]\s', p)]
                if cs:
                    c = min(cs, key=lambda c: abs(c - len(p) / 2)); chunks = [p[:c].strip(), p[c:].strip()]
            tt = t
            for ch in chunks:
                dd = d * len(ch) / sum(len(c) for c in chunks)
                lines.append({'t0': round(tt, 2), 't1': round(tt + dd + (0.5 if ch is chunks[-1] else 0), 2), 'text': ch}); tt += dd
            t += d + 0.42
        cues.append({'t': line['t'], 'end': round(t - 0.42, 2), 'lines': lines})
        print(f"  narration {line['t']:5.1f} -> {t - 0.42:5.1f}  {line['text'][:60]}")
    for a, b in zip(cues, cues[1:]):
        if a['end'] > b['t'] - 0.3: print('  !! overlap', a['end'], b['t'])
    room = reverb(out, rt=0.5, wet=0.05, bright=4000, seed=5)
    return room, cues, gate


def main():
    spec = json.load(open(sys.argv[1])); dur = spec['duration']; ev = spec['events']
    print('narration'); voice, cues, gate = narration(spec, dur)
    print('score'); music = score(dur, ev)
    print('ambience'); amb = ambience(dur, ev)
    # duck the music a little under the voice
    duck = 1 - 0.5 * lp(gate, 1.2, 1).clip(0, 1)
    voice, music, amb = voice * 1.2, music * 0.27, amb * 3.0
    mix = voice + music * duck[:, None] + amb * (0.85 + 0.15 * duck[:, None])
    fade = curve(len(mix), [(0, 0), (1.5, 1), (dur - 3.5, 1), (dur, 0)])
    mix *= fade[:, None]
    def db(x): return 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-12)
    for t0 in range(0, int(dur), 6):
        sl = slice(t0 * SR, (t0 + 6) * SR)
        print(f'   {t0:3d}s  voice {db(voice[sl]):6.1f}  music {db(music[sl]):6.1f}  amb {db(amb[sl]):6.1f}')
    print(f'  levels dBFS rms: voice {db(voice[gate > 0]):.1f}  music {db(music):.1f}  ambience {db(amb):.1f}  mix {db(mix):.1f}  peak {np.abs(mix).max():.2f}')
    mix = np.tanh(mix * 1.05) * 0.95
    os.makedirs(os.path.join(ROOT, 'assets/audio'), exist_ok=True)
    wav = os.path.join(ROOT, f"assets/audio/{spec['name']}.wav")
    sf.write(wav, mix, SR)
    for stem, x in (('voice', voice), ('music', music), ('amb', amb)): sf.write(os.path.join(ROOT, f"assets/audio/_{stem}.wav"), x, SR)
    mp3 = wav[:-4] + '.mp3'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '160k', mp3], check=True)
    with open(os.path.join(ROOT, 'src/cues.js'), 'w') as f:
        f.write('// Generated by tools/build_audio.py -- narration cues with measured timings.\n')
        f.write('export const CUES = ' + json.dumps(cues, indent=1) + ';\n')
    print('wrote', mp3, os.path.getsize(mp3) // 1024, 'kB')

if __name__ == '__main__':
    main()
