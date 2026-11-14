#!/usr/bin/env python3
"""Build the whole soundtrack: narration, an original score that grows with
history, ambience for every era, and timed effects. One mixed file; the picture
follows it.

usage: /home/user/tts/venv/bin/python tools/build_audio.py film/film.json
writes assets/audio/film.mp3 and src/timeline.js
"""
import json, os, re, subprocess, sys
import numpy as np
import soundfile as sf
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import narrate

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rs = np.random.RandomState(7)
TAU = 2 * np.pi

# ------------------------------------------------------------------ helpers --
def env_ar(n, a, r):
    e = np.ones(n); na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    if nr: e[-nr:] *= np.cos(np.linspace(0, np.pi / 2, nr)) ** 2
    return e

def place(buf, x, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= buf.shape[0] or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    x = x[: buf.shape[0] - i]
    th = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    buf[i:i + len(x), 0] += x * gain * np.cos(th) * 1.414
    buf[i:i + len(x), 1] += x * gain * np.sin(th) * 1.414

def sos(kind, f, order=2): return signal.butter(order, f, kind, fs=SR, output='sos')
def bp(x, lo, hi, order=2): return signal.sosfilt(sos('bandpass', [lo, min(hi, SR / 2 - 100)], order), x)
def lp(x, f, order=2): return signal.sosfilt(sos('lowpass', f, order), x)
def hp(x, f, order=2): return signal.sosfilt(sos('highpass', f, order), x)

def slow_noise(n, rate, seed):
    r = np.random.RandomState(seed); k = max(4, int(n / SR * rate) + 4)
    return np.interp(np.linspace(0, k - 1, n), np.arange(k), r.rand(k))

def curve(n, pts):
    t = np.arange(n) / SR; ts, vs = zip(*pts)
    return np.interp(t, ts, vs)

def reverb(x, rt=2.4, wet=0.3, bright=3200, seed=3, pre=0.012):
    r = np.random.RandomState(seed); n = int(rt * 1.3 * SR)
    out = np.zeros_like(x)
    for ch in range(2):
        ir = r.randn(n) * np.exp(-6.9 * np.arange(n) / (rt * SR))
        ir[: int(pre * SR)] *= np.linspace(0, 1, int(pre * SR))
        ir = lp(ir, bright); ir /= np.sqrt((ir ** 2).sum())
        out[:, ch] = signal.fftconvolve(x[:, ch], ir)[: x.shape[0]]
    return x + out * wet

NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
def hz(name):
    m = re.match(r'([A-G]#?|Bb|Eb)(\d)', name); n = m.group(1)
    n = {'Bb': 'A#', 'Eb': 'D#'}.get(n, n)
    return 440 * 2 ** ((NAMES.index(n) - 9) / 12 + int(m.group(2)) - 4)

def tvec(dur): n = int(dur * SR); return n, np.arange(n) / SR

def vibrato(t, rate=5.0, depth=0.004, delay=0.3, seed=0):
    r = np.random.RandomState(seed)
    return 1 + depth * np.clip((t - delay) / 0.4, 0, 1) * np.sin(TAU * rate * t + r.rand() * 6) + 0.0015 * (slow_noise(len(t), 2, seed) - 0.5)

# -------------------------------------------------------------- instruments --
def flute(f, dur, vel=1.0):
    n, t = tvec(dur + 0.35)
    ph = TAU * np.cumsum(f * vibrato(t, 4.9, 0.0045, 0.25, rs.randint(1e6)) * (1 - 0.018 * np.exp(-t / 0.05))) / SR
    y = np.sin(ph) + 0.30 * np.sin(2 * ph + 0.4) + 0.09 * np.sin(3 * ph) + 0.035 * np.sin(4 * ph)
    breath = bp(rs.randn(n), f * 1.6, min(f * 6, 9000)) * 0.22
    e = env_ar(n, 0.085, 0.3) * (0.82 + 0.18 * np.exp(-t / 0.4))
    chiff = np.exp(-t / 0.03) * bp(rs.randn(n), 900, 3500) * 0.25
    return (y * 0.5 + breath * (0.6 + 0.4 * np.exp(-t / 0.2)) + chiff) * e * vel

def hum(f, dur, vel=1.0, vowel='m'):
    n, t = tvec(dur + 0.5)
    ph = TAU * np.cumsum(f * vibrato(t, 4.6, 0.006, 0.3, rs.randint(1e6))) / SR
    y = np.zeros(n)
    F = [(260, 190, 1), (1050, 220, 0.10), (2300, 300, 0.03)] if vowel == 'm' else [(600, 120, 1), (1040, 150, 0.45), (2400, 250, 0.12)] if vowel == 'o' else [(730, 110, 1), (1090, 140, 0.6), (2440, 200, 0.18)]
    for k in range(1, 22):
        fk = f * k
        if fk > 5000: break
        a = sum(g / (1 + ((fk - c) / b) ** 2) for c, b, g in F)
        y += np.sin(k * ph + k * 0.7) * a / k ** 0.6
    y += bp(rs.randn(n), 400, 3000) * (0.01 if vowel == 'm' else 0.02)
    return y * env_ar(n, 0.22 if vowel == 'm' else 0.35, 0.45) * vel * 0.5

def choir(f, dur, vel=1.0, vowel='a'):
    return sum(hum(f * (1 + d), dur, vel * 0.3, vowel) for d in (-0.0065, -0.0025, 0.0, 0.003, 0.0068))

def drum(vel=1.0, f0=78.0, damp=1.0):
    n, t = tvec(1.1)
    drop = 1 + 0.08 * np.exp(-t / 0.03); y = np.zeros(n)
    for ratio, amp, dec in [(1, 1, 0.42), (1.59, 0.5, 0.2), (2.14, 0.28, 0.14), (2.30, 0.2, 0.12), (2.65, 0.14, 0.09), (2.92, 0.1, 0.08), (3.6, 0.06, 0.05)]:
        y += amp * np.sin(TAU * np.cumsum(f0 * ratio * drop) / SR + rs.rand()) * np.exp(-t / (dec * damp))
    slap = lp(rs.randn(n), 1400) * np.exp(-t / 0.016) * 0.7 + bp(rs.randn(n), 1500, 4500) * np.exp(-t / 0.006) * 0.15
    return (y * 0.6 + slap * vel) * vel * np.minimum(1, t / 0.002)

def timpani(f0=73.4, vel=1.0):
    n, t = tvec(2.6); y = np.zeros(n)
    for ratio, amp, dec in [(1, 1, 1.1), (1.5, 0.6, 0.7), (1.98, 0.35, 0.5), (2.44, 0.2, 0.35)]:
        y += amp * np.sin(TAU * f0 * ratio * t * (1 + 0.02 * np.exp(-t / 0.05)) + rs.rand()) * np.exp(-t / dec)
    return (y * 0.6 + lp(rs.randn(n), 600) * np.exp(-t / 0.03) * 0.4) * vel

def shaker(vel=1.0):
    n, t = tvec(0.12)
    return bp(rs.randn(n), 4000, 10000) * np.exp(-t / 0.03) * np.minimum(1, t / 0.01) * vel * 0.6

def darbuka(kind='tek', vel=1.0):
    n, t = tvec(0.6)
    if kind == 'doum': return (np.sin(TAU * 105 * t * (1 + 0.15 * np.exp(-t / 0.02))) * np.exp(-t / 0.18) + lp(rs.randn(n), 500) * np.exp(-t / 0.01) * 0.3) * vel
    return (bp(rs.randn(n), 1200, 4500) * np.exp(-t / 0.01) * 0.5 + np.sin(TAU * 620 * t) * np.exp(-t / 0.05) * 0.3) * vel

def logdrum(f=220, vel=1.0):
    n, t = tvec(0.8)
    return (np.sin(TAU * f * t) * np.exp(-t / 0.22) + 0.4 * np.sin(TAU * f * 2.42 * t) * np.exp(-t / 0.06) + bp(rs.randn(n), 800, 3000) * np.exp(-t / 0.005) * 0.3) * vel

def additive(f, dur, amps, decays, inharm=0.0, rel=0.08, attack=0.002, pitchdrop=0.0):
    n, t = tvec(dur)
    y = np.zeros(n)
    fm = 1 + pitchdrop * np.exp(-t / 0.03)
    for k, (a, d) in enumerate(zip(amps, decays), 1):
        fk = f * k * np.sqrt(1 + inharm * k * k)
        if fk > 12000: break
        y += a * np.sin(TAU * np.cumsum(fk * fm) / SR + rs.rand() * 6) * np.exp(-t / d)
    return y * env_ar(n, attack, rel)

def pluck(f, dur=1.6, vel=1.0, bright=1.0):
    amps = [vel / k ** 1.2 * np.exp(-(k - 1) * 0.25 / bright) for k in range(1, 14)]
    decs = [1.5 * (300 / f) ** 0.3 / (1 + 0.45 * (k - 1)) for k in range(1, 14)]
    n, t = tvec(dur)
    return additive(f, dur, amps, decs, 0.00008) * 0.6 + bp(rs.randn(n), 2000, 7000) * np.exp(-t / 0.004) * 0.05 * vel

def harpsi(f, dur=1.0, vel=1.0):
    amps = [vel * (0.6 if k == 1 else 1.0) / k ** 0.7 for k in range(1, 20)]
    decs = [0.9 / (1 + 0.15 * (k - 1)) for k in range(1, 20)]
    return additive(f, dur, amps, decs, 0.00003, rel=0.05) * 0.32

def oud(f, dur=1.2, vel=1.0):
    amps = [vel * a for a in [1, 0.8, 0.6, 0.5, 0.3, 0.25, 0.15, 0.1, 0.06]]
    decs = [0.9 / (1 + 0.35 * k) for k in range(9)]
    return additive(f, dur, amps, decs, 0.0001, pitchdrop=0.012) * 0.45

def kalimba(f, dur=1.6, vel=1.0):
    n, t = tvec(dur)
    y = np.sin(TAU * f * t) * np.exp(-t / 1.0) + 0.35 * np.sin(TAU * f * 5.9 * t) * np.exp(-t / 0.08) + 0.15 * np.sin(TAU * f * 3.0 * t) * np.exp(-t / 0.3)
    return y * vel * 0.5 * np.minimum(1, t / 0.002)

def piano(f, dur=3.0, vel=1.0):
    n, t = tvec(dur + 0.3)
    y = np.zeros(n)
    for k in range(1, 16):
        fk = f * k * np.sqrt(1 + 0.0004 * k * k)
        if fk > 10000: break
        a = vel / k ** 1.1 * np.exp(-(k - 1) * (0.35 - 0.15 * vel))
        T = 2.8 * (220 / f) ** 0.45 / (1 + 0.25 * (k - 1))
        for det in (-0.0003, 0.0003):
            y += 0.5 * a * np.sin(TAU * fk * (1 + det) * t + rs.rand()) * (0.65 * np.exp(-t / (T * 0.25)) + 0.35 * np.exp(-t / (T * 1.6)))
    y += lp(rs.randn(n), 2500) * np.exp(-t / 0.008) * 0.06 * vel
    return y * env_ar(n, 0.002, 0.3) * 0.5

def celesta(f, dur=1.6, vel=1.0):
    n, t = tvec(dur)
    idx = 1.6 * np.exp(-t / 0.15)
    y = np.sin(TAU * f * t + idx * np.sin(TAU * f * 4 * t)) * np.exp(-t / 0.9) + 0.2 * np.sin(TAU * f * 2 * t) * np.exp(-t / 0.3)
    return y * vel * 0.4 * np.minimum(1, t / 0.002)

def bell(f, dur=6.0, vel=1.0):
    n, t = tvec(dur); y = np.zeros(n)
    for r_, a, d in [(0.5, 0.6, 4), (1, 1, 3), (1.19, 0.5, 2.2), (1.56, 0.4, 1.6), (2, 0.4, 1.4), (2.51, 0.25, 1.0), (3.01, 0.2, 0.7), (4.1, 0.12, 0.4)]:
        y += a * np.sin(TAU * f * r_ * t + rs.rand()) * np.exp(-t / d)
    return y * vel * 0.25

def bowed(f, dur, vel=1.0, bright=2400, attack=0.35, voices=3, vib=0.004):
    """Strings: a small section of bowed voices. Each player is a little out of tune with
    the next, and every partial drifts in level, the way real bowing never holds still."""
    n, t = tvec(dur + 0.6); y = np.zeros(n)
    for v in range(voices):
        det = 1 + (v - (voices - 1) / 2) * 0.004 + (rs.rand() - 0.5) * 0.002
        ph = TAU * np.cumsum(f * det * vibrato(t, 4.8 + v * 0.45 + rs.rand() * 0.3, vib * (0.8 + 0.4 * rs.rand()), 0.2 + 0.2 * rs.rand(), rs.randint(1e6))) / SR
        for k in range(1, 30):
            fk = f * k
            if fk > 7000: break
            a = (1 / k) / (1 + (fk / bright) ** 2) * (1 + 0.6 / (1 + ((fk - 480) / 200) ** 2) + 0.35 / (1 + ((fk - 2900) / 500) ** 2))
            shimmer = 1 + 0.35 * (slow_noise(n, 2.5 + k * 0.15, rs.randint(1e6)) - 0.5)
            y += a * shimmer * np.sin(k * ph + rs.rand() * 6)
    y += bp(rs.randn(n), 1500, 6000) * 0.012 * voices
    return y * env_ar(n, attack, 0.6) * vel * 0.28 / voices

def reed(f, dur, vel=1.0):
    """A duduk-like reed: dark, breathy, with a slow swell."""
    n, t = tvec(dur + 0.4)
    ph = TAU * np.cumsum(f * vibrato(t, 5.0, 0.005, 0.3, rs.randint(1e6)) * (1 - 0.01 * np.exp(-t / 0.06))) / SR
    y = np.zeros(n)
    for k in range(1, 18):
        fk = f * k
        if fk > 6000: break
        a = (1 / k ** 0.8) * (1.0 / (1 + ((fk - 600) / 300) ** 2) + 0.4 / (1 + ((fk - 1300) / 400) ** 2) + 0.05)
        y += a * np.sin(k * ph)
    y += bp(rs.randn(n), f * 2, f * 8) * 0.04
    swell = env_ar(n, 0.18, 0.35) * (0.8 + 0.2 * np.sin(np.pi * np.clip(t / dur, 0, 1)))
    return y * swell * vel * 0.35

def tri(f, dur=0.35, vel=1.0):
    n, t = tvec(dur)
    y = sum(((-1) ** k) / (2 * k + 1) ** 2 * np.sin(TAU * f * (2 * k + 1) * t) for k in range(6))
    return y * np.exp(-t / (dur * 0.35)) * np.minimum(1, t / 0.004) * vel * 0.6

def drone(n, freqs, seed=1):
    t = np.arange(n) / SR; out = np.zeros((n, 2)); r = np.random.RandomState(seed)
    for f, a in freqs:
        for ch in range(2):
            for det in (-0.35, 0.3):
                swell = 0.55 + 0.45 * slow_noise(n, 0.18, r.randint(1e6))
                ph = TAU * (f + det * (1 + ch * 0.3)) * t + r.rand() * 6
                out[:, ch] += a * swell * (np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)) * 0.5
    return out

# -------------------------------------------------------------------- score --
# The theme of the whole film, in D dorian. It begins as a single flute over a
# heartbeat and returns in each era with what that era had to play it on.
THEME_A = [('D4', 1), ('A4', 2), ('G4', 1), ('F4', 1), ('G4', 3)]
THEME_B = [('D4', 1), ('A4', 1), ('C5', 2), ('A4', 1), ('G4', 1), ('F4', 1), ('D4', 4)]
PROG = [['D3', 'A3', 'D4', 'F4'], ['Bb2', 'F3', 'D4', 'F4'], ['F2', 'C3', 'A3', 'F4'], ['C3', 'G3', 'C4', 'E4']]
PROG_DARK = [['D3', 'A3', 'D4', 'F4'], ['Bb2', 'F3', 'D4', 'F4'], ['G2', 'D3', 'Bb3', 'D4'], ['A2', 'E3', 'C#4', 'E4']]
def tr(name, semis):
    f = hz(name) * 2 ** (semis / 12); return f

class Score:
    def __init__(self, dur):
        self.n = int(dur * SR); self.dry = np.zeros((self.n, 2)); self.wet = np.zeros((self.n, 2))
    def add(self, x, t, g=1.0, pan=0.0, wet=True):
        place(self.wet if wet else self.dry, x, t, g, pan)
    def phrase(self, notes, t0, inst, beat=1.0, oct=0, g=1.0, pan=0.0, legato=0.96, human=0.012, **kw):
        t = t0
        for name, beats in notes:
            if name != 'r': self.add(inst(hz(name) * 2 ** oct, beats * beat * legato, **kw), t + rs.randn() * human, g, pan)
            t += beats * beat
        return t
    def chords(self, t0, bars, inst, prog=PROG, beat=1.0, g=1.0, oct=0, pan=0.0, **kw):
        for b in range(bars):
            for i, name in enumerate(prog[b % len(prog)]):
                self.add(inst(hz(name) * 2 ** oct, 4 * beat * 1.02, **kw), t0 + b * 4 * beat + rs.randn() * 0.01, g, pan + (i - 1.5) * 0.25)
    def arp(self, t0, bars, inst, prog=PROG, beat=1.0, sub=2, pattern=(0, 1, 2, 3, 2, 1, 2, 3), g=1.0, oct=1, pan=0.0, vel=0.8, **kw):
        step = beat / sub
        for b in range(bars):
            ch = prog[b % len(prog)]
            for s in range(int(4 * sub)):
                name = ch[pattern[s % len(pattern)] % len(ch)]
                self.add(inst(hz(name) * 2 ** oct, vel=vel * (1 if s % sub == 0 else 0.75), **kw), t0 + b * 4 * beat + s * step + rs.randn() * 0.006, g, pan + 0.3 * np.sin(s))

def build_score(EV, dur):
    S = Score(dur)
    # ---- fire: a heartbeat, a drone, then a flute when the fire catches
    t = 3.2
    while t < 54:
        lvl = np.interp(t, [3, 12, EV['lit'], EV['lit'] + 6, 46, 54], [0.25, 0.42, 0.42, 0.6, 0.55, 0.2])
        S.add(drum(0.9, 76), t, lvl, -0.08); S.add(drum(0.55, 80, 0.8), t + 0.5, lvl * 0.6, 0.1)
        t += 2
    S.phrase(THEME_A, EV['lit'] + 1.2, flute, g=0.30, pan=-0.15)
    S.phrase(THEME_A, 33.0, hum, oct=-1, g=0.30, pan=0.15)
    S.phrase(THEME_B, 46.6, flute, g=0.26, pan=-0.15)
    S.phrase(THEME_A, 46.6, hum, oct=-2, g=0.42, pan=0.18)
    # ---- walking out: a travelling rhythm, a lyre joins
    for i in range(int((77 - 56) / 0.5)):
        t = 56 + i * 0.5
        S.add(drum(0.7 if i % 2 == 0 else 0.4, 82 if i % 4 == 0 else 96, 0.7), t, 0.32 if i % 2 == 0 else 0.18, -0.1)
        S.add(shaker(0.6 + 0.3 * (i % 2)), t + 0.25, 0.25, 0.3)
    S.arp(57.0, 5, pluck, beat=1.0, sub=2, g=0.20, oct=0, vel=0.7)
    S.phrase(THEME_A, 64.0, flute, g=0.26, pan=-0.2)
    S.phrase([('A4', 1), ('C5', 2), ('A4', 1), ('G4', 1), ('A4', 3)], 72.0, flute, g=0.24, pan=-0.2)
    # ---- the cave: one voice, alone
    S.phrase([('D4', 3), ('A4', 4), ('G4', 2), ('F4', 2), ('G4', 5)], 80.2, hum, oct=-1, g=0.42, pan=0.0, vowel='o')
    # ---- farming: plucked ostinato, a note for each crop
    S.arp(93.0, 7, kalimba, sub=2, pattern=(0, 2, 1, 3, 2, 1, 3, 2), g=0.22, oct=1, vel=0.7)
    S.chords(93.0, 7, bowed, g=0.10, oct=0, bright=1600, attack=1.2)
    for i, (tc, nm) in enumerate(zip(EV['crops'], ['D5', 'F5', 'G5', 'A5', 'C6'])):
        S.add(celesta(hz(nm), 2.0, 0.9), tc, 0.35, -0.5 + i * 0.25)
    S.phrase(THEME_B, 108.0, flute, g=0.26, pan=-0.2)
    # ---- the first cities: frame drums, a reed, a drone
    for i in range(int((134 - 121) / 0.5)):
        t = 121 + i * 0.5
        S.add(drum(0.8 if i % 4 == 0 else 0.45, 70 if i % 4 == 0 else 110, 0.8), t, 0.35 if i % 4 == 0 else 0.18, 0.1)
    S.add(timpani(73.4, 1.0), EV['city'], 0.6, 0)
    S.phrase(THEME_A, 125.0, reed, g=0.32, pan=-0.1)
    # writing: almost nothing, so each mark can be heard
    S.phrase([('A3', 6), ('G3', 4), ('F3', 6)], 135.6, reed, g=0.20, pan=0.1)
    S.phrase(THEME_B, 145.0, reed, oct=0, g=0.28, pan=-0.1)
    S.chords(145.0, 4, bowed, g=0.08, bright=1400, attack=1.5)
    # the wheel gets away
    for i, nm in enumerate(['A5', 'G5', 'F5', 'E5', 'D5', 'C5', 'A4', 'G4', 'F4', 'D4']):
        S.add(pluck(hz(nm), 1.0, 0.8, 1.5), EV['roll'] + 0.15 + i * 0.16 * (1 - i * 0.04), 0.22, -0.3 + i * 0.12)
    # ---- roads and oceans: oud, hand drums, the reed again
    for i in range(int((190 - 168) / 0.25)):
        t = 168 + i * 0.25; s = i % 8
        if s in (0, 3, 6): S.add(darbuka('doum', 0.8), t, 0.28, -0.15)
        if s in (2, 4, 5, 7): S.add(darbuka('tek', 0.6), t, 0.16, 0.25)
    S.arp(168.0, 5, oud, sub=2, pattern=(0, 2, 3, 2, 1, 2, 3, 2), g=0.32, oct=0, vel=0.8)
    S.phrase(THEME_A, 172.0, reed, g=0.30, pan=-0.2)
    S.phrase(THEME_B, 180.0, reed, g=0.28, pan=-0.2)
    # the Pacific at night: a choir like the sea, a log drum
    S.chords(190.5, 4, choir, g=0.13, oct=0, vowel='o')
    for i in range(16): S.add(logdrum(220 if i % 4 else 165, 0.7), 191 + i * 1.0, 0.18 if i % 4 else 0.26, -0.2)
    S.phrase(THEME_A, 196.0, hum, oct=-1, g=0.34, pan=0.1, vowel='o')
    for i, nm in enumerate(['A4', 'B4', 'D5', 'E5']): S.add(celesta(hz(nm), 2.0, 0.6), 197.85 + i * 0.45, 0.1, 0.5 - i * 0.1)
    for i, (tf, nm) in enumerate([(199.6, 'D4'), (200.3, 'E4'), (201.0, 'A4'), (201.7, 'B3'), (202.4, 'D4'), (203.2, 'A3'), (203.6, 'E4'), (204.6, 'D4')]): S.add(kalimba(hz(nm), 1.6, 0.6), tf, 0.13, -0.5 + i * 0.13)
    # ---- printing: strings and a busy harpsichord, a lift when the pages fly
    S.arp(206.5, 5, harpsi, sub=4, pattern=(0, 1, 2, 3, 2, 3, 1, 2), g=0.20, oct=1, vel=0.8)
    S.chords(206.5, 5, bowed, g=0.14, bright=2600, attack=0.8)
    S.phrase(THEME_A, 212.0, bowed, oct=1, g=0.30, pan=-0.1, attack=0.15, voices=3, vib=0.005)
    S.phrase(THEME_B, 220.6, bowed, oct=1, g=0.32, pan=-0.1, attack=0.12, voices=3, vib=0.005)
    # ---- the Renaissance: a lute and a recorder, and a choir as the dome rises
    S.arp(226.0, 5, pluck, sub=2, pattern=(0, 2, 1, 3, 2, 1, 3, 2), g=0.22, oct=1, vel=0.7, bright=1.4)
    S.chords(226.0, 5, bowed, g=0.10, bright=1800, attack=1.2)
    S.phrase(THEME_A, 228.0, flute, g=0.24, pan=-0.2)
    S.phrase(THEME_B, 236.0, flute, g=0.22, pan=-0.2)
    S.add(timpani(73.4, 0.8), EV['dome'], 0.45)
    S.chords(EV['dome'] - 0.2, 2, choir, g=0.12, vowel='a')
    # ---- two worlds: a cello, gravely; then almost nothing
    S.chords(247.0, 3, bowed, prog=PROG_DARK, g=0.14, oct=-1, bright=1200, attack=1.2)
    S.phrase(THEME_A, 248.0, bowed, oct=-1, g=0.38, pan=-0.1, attack=0.2, voices=1, vib=0.006, bright=1800)
    S.phrase([('D3', 6), ('C3', 4), ('D3', 8)], EV['dim'] - 0.3, hum, g=0.30, pan=0.0)
    S.add(timpani(55.0, 0.5), EV['dim'] - 0.3, 0.35)
    # ---- science: celesta, a sky full of small lights
    S.arp(272.5, 4, celesta, sub=2, pattern=(2, 3, 1, 2, 0, 3, 2, 1), g=0.14, oct=0, vel=0.7)
    S.chords(272.5, 4, bowed, g=0.10, bright=2000, attack=1.4)
    for i, nm in enumerate(['A4', 'D5', 'E5', 'A5']): S.add(celesta(hz(nm), 2.4, 0.9), EV['moons'] + i * 0.18, 0.24, -0.4 + i * 0.3)
    S.phrase(THEME_B, 281.0, flute, g=0.24, pan=-0.2)
    # ---- the Enlightenment: a brighter, classical turn
    S.arp(291.5, 6, harpsi, sub=4, pattern=(0, 2, 1, 2, 0, 2, 1, 2), g=0.17, oct=0, vel=0.8)
    S.chords(291.5, 6, bowed, g=0.13, bright=2600, attack=0.8)
    S.phrase(THEME_A, 293.0, bowed, oct=1, g=0.26, pan=-0.1, attack=0.12, voices=3)
    for i, nm in enumerate(['A4', 'G4', 'F4', 'E4', 'D4', 'C4', 'A3']): S.add(pluck(hz(nm), 0.8, 0.8, 1.2), EV['crown'] + 0.05 + i * 0.09, 0.2, 0.3)
    for i, tf in enumerate(EV['flags']):
        S.add(timpani(73.4 * (1 + i * 0.12), 0.7), tf, 0.32)
        for nm in [['D3', 'A3', 'D4'], ['F3', 'C4', 'F4'], ['A3', 'E4', 'A4']][i]: S.add(bowed(hz(nm), 1.8, 1.0, bright=2400, attack=0.15), tf, 0.16)
    S.phrase(THEME_B, 306.0, bowed, oct=1, g=0.26, pan=-0.1, attack=0.12, voices=3)
    # ---- the 1800s: a machine-like ostinato; the telegraph taps; children burst out of school
    for i in range(int((341.6 - 316) / 0.25)):
        t = 316 + i * 0.25
        S.add(pluck(hz(['D3', 'D3', 'A3', 'D3', 'F3', 'D3', 'A3', 'C4'][i % 8]), 0.5, 0.9, 0.7), t, 0.18, 0.2 * np.sin(i))
        if i % 4 == 0: S.add(timpani(73.4, 0.5), t, 0.22)
    S.chords(316.0, 7, bowed, g=0.13, oct=-1, bright=1800, attack=0.6)
    S.phrase(THEME_A, 318.0, bowed, oct=0, g=0.30, pan=-0.15, attack=0.12, voices=3)
    code = [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1]
    for j, on in enumerate(code):
        if on: S.add(pluck(hz('A3'), 0.25, 0.6, 0.6), EV['telegraph'] + j * 0.14, 0.14, 0.3)
    for i, nm in enumerate(['D4', 'F4', 'G4', 'A4', 'C5', 'D5']): S.add(kalimba(hz(nm), 1.2, 0.8), EV['school'] + 0.2 + i * 0.11, 0.24, -0.3 + i * 0.12)
    S.phrase(THEME_B, 337.5, bowed, oct=0, g=0.28, pan=-0.15, attack=0.12, voices=3)
    for i, nm in enumerate(['D3', 'F3', 'A3']): S.add(bowed(hz(nm), 4.8, 1.0, bright=1400, attack=1.4), 342.4, 0.12, -0.3 + i * 0.3)
    for i, nm in enumerate(['D4', 'F#4', 'A4', 'D5']): S.add(piano(hz(nm), 3.0, 0.55), 347.3 + i * 0.16, 0.2, -0.3 + i * 0.2)
    for i, nm in enumerate(['D3', 'A3', 'F#4']): S.add(bowed(hz(nm), 4.0, 1.0, bright=2200, attack=0.7), 347.2, 0.15, -0.3 + i * 0.3)
    # ---- electric light: one note for the first light, then a note at every house the spark reaches
    S.add(piano(hz('A4'), 4.0, 0.7), EV['firstLight'], 0.5, 0)
    for i, nm in enumerate(['D5', 'F5', 'A5', 'G5', 'C6', 'A5', 'D6', 'A5']): S.add(piano(hz(nm), 2.6, 0.5), EV['spark'] + i * 1.25, 0.24, -0.6 + i * 0.17)
    rr = np.random.RandomState(9); pent = ['D5', 'F5', 'G5', 'A5', 'C6', 'A4', 'G4']
    for i in range(16):
        t = EV['spark'] + 0.6 + rr.rand() * (EV['lightsFull'] - EV['spark'])
        S.add(piano(hz(pent[rr.randint(len(pent))]), 2.0, 0.25 + 0.2 * rr.rand()), t, 0.16, rr.rand() * 1.6 - 0.8)
    S.chords(EV['lightsFull'] - 1.0, 3, bowed, g=0.20, bright=2600, attack=1.0)
    S.chords(EV['lightsFull'] - 1.0, 3, choir, g=0.10, vowel='a')
    S.phrase(THEME_B, EV['lightsFull'], piano, g=0.34, pan=0.1, vel=0.75)
    # ---- the twentieth century
    S.arp(379.0, 2, kalimba, sub=4, pattern=(0, 2, 3, 2, 1, 2, 3, 2), g=0.18, oct=1, vel=0.7)
    S.phrase([('D5', 0.5), ('E5', 0.5), ('F5', 0.5), ('A5', 1.5), ('G5', 1), ('A5', 2)], EV['flyer'], flute, g=0.24, pan=-0.2)
    S.chords(385.0, 2, bowed, g=0.12, bright=2200, attack=0.8)
    # the film's theme, coming out of the family's radio
    rb = Score(dur); rb.phrase(THEME_A, EV['radio'] + 0.3, piano, beat=0.62, g=0.6, vel=0.7)
    radio = bp(rb.wet.mean(axis=1), 350, 2800) + bp(rs.randn(rb.n), 1000, 4000) * 0.004 * curve(rb.n, [(0, 0), (EV['radio'], 0), (EV['radio'] + 0.3, 1), (EV['radio'] + 5, 1), (EV['radio'] + 5.5, 0), (dur, 0)])
    S.dry[:, 0] += radio * 0.5; S.dry[:, 1] += radio * 0.62
    # the wars: no melody, only weight
    S.add(timpani(55.0, 0.9), EV['war'], 0.45)
    for k in range(4): S.add(timpani(49.0, 0.6), EV['war'] + 1.8 + k * 1.9, 0.3)
    S.add(bowed(hz('D2'), 8.0, 1.0, bright=900, attack=2.0, voices=3), EV['war'] + 0.2, 0.3)
    S.add(bowed(hz('A2'), 7.0, 1.0, bright=900, attack=2.5, voices=3), EV['war'] + 1.2, 0.22)
    # medicine: a hopeful lift
    for i, nm in enumerate(['D3', 'A3', 'D4', 'F#4', 'A4']): S.add(bowed(hz(nm), 5.5, 1.0, bright=2400, attack=1.4), EV['dish'] - 0.2, 0.15, -0.4 + i * 0.2)
    S.phrase(THEME_B, EV['saved'] - 0.4, piano, g=0.30, pan=0.1, vel=0.7)
    # the Moon
    S.arp(409.0, 2, celesta, sub=2, pattern=(2, 3, 1, 2, 0, 3, 2, 1), g=0.12, oct=0, vel=0.7)
    S.add(timpani(55.0, 0.8), EV['landing'], 0.3)
    for i, nm in enumerate(['D3', 'A3', 'E4', 'F#4']):
        S.add(bowed(hz(nm), 6.5, 1.0, bright=2000, attack=1.8), EV['landing'] + 0.2, 0.13, -0.4 + i * 0.27)
        S.add(choir(hz(nm), 6.0, 1.0, 'o'), EV['landing'] + 0.5, 0.06, 0.4 - i * 0.27)
    for i, nm in enumerate(['D5', 'E5', 'F#5', 'A5']): S.add(celesta(hz(nm), 2.0, 0.5), EV['landing'] + 2.3 + (16 + 26 * i) / 92 * 2.2, 0.08, 0.2)
    # ---- today: soft arpeggios, piano, strings
    S.arp(419.4, 5, tri, sub=4, pattern=(0, 2, 3, 1, 2, 3, 0, 3), g=0.15, oct=1, vel=0.8)
    S.chords(419.4, 5, bowed, g=0.14, bright=2400, attack=0.8)
    S.phrase(THEME_A, 421.0, piano, g=0.30, pan=0.1, vel=0.7)
    S.phrase(THEME_B, 429.0, piano, g=0.30, pan=0.1, vel=0.7)
    # ---- everything so far: the whole arrangement, then back to the beginning
    S.chords(438.5, 3, bowed, g=0.24, bright=2800, attack=0.9)
    S.chords(438.5, 3, choir, g=0.13, vowel='a')
    S.phrase(THEME_A, 439.0, bowed, oct=1, g=0.30, pan=-0.1, attack=0.15, voices=3)
    S.phrase(THEME_A, 439.0, flute, oct=0, g=0.20, pan=0.2)
    for i in range(6): S.add(drum(0.8, 76), 439 + i * 2, 0.35, -0.08)
    S.add(timpani(73.4, 0.9), 439.0, 0.4)
    S.phrase(THEME_B, 451.0, flute, g=0.26, pan=-0.15)
    S.phrase(THEME_A, 451.0, hum, oct=-2, g=0.40, pan=0.15)
    for i, nm in enumerate(['D3', 'A3', 'D4', 'F#4', 'A4']):
        S.add(bowed(hz(nm), 12.0, 1.0, bright=2200, attack=2.5), 459.0, 0.20, -0.4 + i * 0.2)
        S.add(choir(hz(nm), 11.0, 1.0, 'a'), 459.5, 0.08, 0.4 - i * 0.2)
    S.add(flute(hz('F#5'), 7.0, 0.8), 462.0, 0.18, -0.2)
    # a drone under everything, changing colour with the eras
    n = S.n
    d = drone(n, [(hz('D2'), 0.5), (hz('A2'), 0.3), (hz('D3'), 0.16)])
    S.dry += d * curve(n, [(0, 0), (5, 0.10), (EV['lit'], 0.13), (EV['lit'] + 5, 0.2), (52, 0.18), (60, 0.08), (79, 0.12), (91, 0.16), (95, 0.05), (121, 0.08), (135, 0.16), (160, 0.08), (190, 0.14), (206, 0.05), (226, 0.08), (246, 0.12), (261, 0.2), (272, 0.1), (291, 0.06), (316, 0.06), (352, 0.15), (378, 0.06), (393, 0.22), (402, 0.1), (418, 0.05), (438, 0.12), (465, 0.15), (dur - 1, 0)])[:, None]
    wet = reverb(S.wet, rt=2.8, wet=0.42, bright=2600)
    # the cave gets its own long echo
    cave = curve(n, [(0, 0), (79, 0), (80.5, 1), (90, 1), (92, 0), (dur, 0)])
    wet += reverb(S.wet * cave[:, None], rt=4.5, wet=0.5, bright=2000, seed=11) * 0.6
    return wet + S.dry

# ----------------------------------------------------------------- ambience --
def ambience(dur, EV):
    n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros((n, 2))
    W = lambda pts: curve(n, pts)
    # wind, in different weathers
    wind = W([(0, 0), (2, 1), (16, 0.7), (52, 0.7), (61, 0.8), (63, 1.8), (69, 1.8), (71, 0.9), (78, 0.4), (91, 0.3), (95, 0.8), (121, 0.6), (168, 0.9), (190, 0.9), (206, 0.5), (225, 0.6), (246, 0.8), (262, 1.1), (272, 0.5), (291, 0.5), (316, 0.4), (352, 0.3), (378, 0.9), (385, 0.5), (393, 0.8), (402, 0.5), (418, 0.4), (446, 0.5), (460, 0.8), (dur, 0)])
    for ch in range(2):
        w = bp(rs.randn(n), 180, 700) * (0.35 + 0.65 * slow_noise(n, 0.25, 40 + ch)) + bp(rs.randn(n), 900, 2600) * 0.12 * slow_noise(n, 0.4, 50 + ch)
        out[:, ch] += w * 0.05 * wind
    # crickets in the dark
    night = W([(0, 0), (5, 0.1), (13, 1), (28, 0.75), (50, 0.7), (54, 0), (80, 0), (82, 0.25), (91, 0), (271, 0), (274, 0.8), (288, 0.8), (291, 0), (dur, 0)])
    for c in range(7):
        f = 2900 + rs.rand() * 900; rate = 1.4 + rs.rand() * 1.2; pulses = 3 + rs.randint(3); pr = 26 + rs.rand() * 10
        ph = (t * rate + rs.rand()) % 1.0
        chirp = (ph < pulses / pr * rate).astype(float) * (0.5 + 0.5 * np.sin(TAU * pr * ph / rate - np.pi / 2))
        active = lp((slow_noise(n, 0.12, 100 + c) > 0.35).astype(float), 2)
        place(out, np.sin(TAU * f * t) * chirp * active * (0.005 + rs.rand() * 0.005) * night, 0, 1, rs.rand() * 1.8 - 0.9)
    # birds by day
    birds = W([(0, 0), (54, 0), (57, 1), (61, 0.5), (70, 0), (93, 0), (96, 1), (120, 0.6), (125, 0.3), (168, 0.3), (190, 0), (208, 0), (211, 0.8), (225, 0.2), (232, 0), (269, 0), (346, 0), (352, 1), (dur, 0.6)])
    tt = 0.0
    while tt < dur:
        tt += rs.exponential(0.9)
        if tt >= dur: break
        k = birds[min(n - 1, int(tt * SR))] * 0
        if k < 0.05 or rs.rand() > k: continue
        f0 = 2400 + rs.rand() * 2200; notes = 1 + rs.randint(4)
        for j in range(notes):
            m, tv = tvec(0.06 + rs.rand() * 0.1)
            sweep = f0 * (1 + (rs.rand() - 0.4) * 0.6 * tv / tv[-1])
            y = np.sin(TAU * np.cumsum(sweep) / SR) * np.sin(np.pi * tv / tv[-1]) ** 2
            place(out, y * 0.02, tt + j * 0.13, 1, rs.rand() * 1.6 - 0.8)
    # the sea
    sea = W([(0, 0), (69, 0), (71, 1), (77, 1), (80, 0), (189, 0), (192, 1), (206, 0.8), (209, 0), (245, 0), (247.5, 1), (262, 0.8), (269, 0), (418, 0), (420, 0.6), (428, 0.5), (432, 0), (dur, 0)])
    for ch in range(2):
        swell = 0.35 + 0.65 * (0.5 + 0.5 * np.sin(TAU * t / (6.5 + ch * 1.3) + ch)) ** 2
        out[:, ch] += (lp(rs.randn(n), 500) * 0.06 + bp(rs.randn(n), 800, 4000) * 0.025 * swell) * swell * sea
    # the fire's crackle (and the torch, and the candle)
    fire = W([(0, 0), (EV['lit'] - 0.2, 0), (EV['lit'] + 3, 1), (50, 1), (56, 0.15), (60, 0), (77.8, 0), (78.6, 0.45), (90, 0.45), (93, 0), (199.4, 0), (200.6, 0.07), (206.5, 0.07), (209, 0), (271, 0), (272.5, 0.12), (288, 0.12), (291, 0), (dur, 0)])
    m = int(1.4 * SR)
    place(out, lp(rs.randn(m), 900) * np.sin(np.linspace(0, np.pi, m)) ** 2 * 0.16, EV['lit'] - 0.1)
    for ch in range(2):
        out[:, ch] += (lp(rs.randn(n), 420) * (0.5 + 0.5 * slow_noise(n, 5, 60 + ch)) * 0.085 + bp(rs.randn(n), 2000, 6000) * (0.4 + 0.6 * slow_noise(n, 7, 70 + ch)) * 0.008) * fire
    k = 0.0
    while k < dur:
        k += rs.exponential(1 / 11)
        g = fire[min(n - 1, int(k * SR))]
        if g < 0.02: continue
        ln = int((0.002 + rs.rand() ** 2 * 0.012) * SR); f0 = 900 + rs.rand() ** 2 * 5000
        pop = bp(np.concatenate([rs.randn(ln), np.zeros(600)]), f0, min(f0 * 2.2, 12000)) * np.exp(-np.arange(ln + 600) / (ln * 0.6))
        place(out, pop, k, g * min(0.22, 0.05 + rs.pareto(2.5) * 0.05), rs.randn() * 0.15)
    # breaths on the ember; the pop of sap that ends the gazelle's curiosity
    for b in EV['blows']:
        m = int(0.75 * SR); place(out, bp(rs.randn(m), 500, 2600) * np.sin(np.linspace(0, np.pi, m)) ** 1.5 * 0.07, b, 1, -0.1)
    m = int(0.25 * SR); place(out, bp(rs.randn(m), 700, 6000) * np.exp(-np.arange(m) / (0.02 * SR)) * 0.2 + lp(rs.randn(m), 300) * np.exp(-np.arange(m) / (0.05 * SR)) * 0.16, EV['pop'], 1, 0.05)
    # paddles on the crossing
    for i in range(10):
        m = int(0.4 * SR); place(out, bp(rs.randn(m), 600, 3000) * np.exp(-np.arange(m) / (0.08 * SR)) * 0.05, EV['raft'] + 0.5 + i * 0.6, 1, -0.3)
    # ochre blown through the lips onto the rock
    m = int(2.4 * SR); place(out, bp(rs.randn(m), 500, 2200) * np.sin(np.linspace(0, np.pi, m)) ** 0.8 * (0.6 + 0.4 * np.sin(np.linspace(0, 40, m)) ** 2) * 0.03, EV['hand'] - 2.4, 1, 0)
    # cave drips
    for i in range(7):
        m, tv = tvec(0.3); place(out, np.sin(TAU * (1400 + rs.rand() * 900) * tv * (1 + 0.6 * np.exp(-tv / 0.01))) * np.exp(-tv / 0.04) * 0.04, 80 + i * 1.6 + rs.rand(), 1, rs.rand() - 0.5)
    # sheep
    for tb in []:
        m, tv = tvec(0.7); f = 260 * (1 + 0.04 * np.sin(TAU * 7 * tv))
        y = sum(np.sin(TAU * np.cumsum(f * k) / SR) / k * (1 / (1 + ((f * k - 900) / 300) ** 2) + 0.3) for k in range(1, 14))
        place(out, y * env_ar(m, 0.04, 0.2) * 0.03, tb, 1, 0.5)
    # a city murmuring
    city = W([(0, 0), (122, 0), (125, 1), (160, 0.7), (168, 0.3), (190, 0), (209, 0), (212, 0.4), (224, 0.3), (227, 0.35), (245, 0.3), (247, 0), (291, 0), (294, 0.7), (314, 0.6), (318, 0.6), (346, 0.6), (352, 0.4), (377, 0.3), (380, 0), (385, 0.4), (392, 0.4), (393, 0), (418, 0), (421, 0.35), (437, 0.3), (441, 0), (dur, 0)])
    for ch in range(2):
        babble = sum(bp(rs.randn(n), 300 + 200 * v, 1200 + 300 * v) * (0.5 + 0.5 * np.sin(TAU * (3 + v * 0.7) * t + rs.rand() * 6)) ** 4 for v in range(4))
        out[:, ch] += babble * 0.012 * city
    # clay marks: a soft tok for each impression
    for tm in EV['marks'] + EV['signs'] + EV['tally']:
        m, tv = tvec(0.12); place(out, (lp(rs.randn(m), 700) * np.exp(-tv / 0.012) * 0.5 + np.sin(TAU * 300 * tv) * np.exp(-tv / 0.03) * 0.2) * 0.4, tm - 0.02, 1, rs.rand() * 0.4 - 0.2)
    # the wheel rolling away down the curve
    m, tv = tvec(3.4); rumble = lp(rs.randn(m), 220) * (0.6 + 0.4 * np.sin(TAU * (2 + tv * 2.6) * tv)) * np.exp(-tv / 1.6) * 0.18
    for i in range(m // 4410): place(out, rumble[i * 4410:(i + 1) * 4410], EV['roll'] + i * 0.1, 1, min(0.95, 0.05 + i * 0.04))
    # camel bells on the road
    for i in range(10):
        m, tv = tvec(0.6); f = 520 + rs.rand() * 140
        clonk = (np.sin(TAU * f * tv) + 0.35 * np.sin(TAU * f * 2.3 * tv) * np.exp(-tv / 0.04)) * np.exp(-tv / 0.16) * np.minimum(1, tv / 0.004)
        place(out, lp(clonk, 1600) * 0.022, 169.5 + i * 1.9 + rs.rand() * 0.4, 1, 0.3)
    # the press, and the pages taking flight
    for tp in EV['press']:
        m, tv = tvec(0.6); place(out, (lp(rs.randn(m), 300) * np.exp(-tv / 0.04) * 0.6 + np.sin(TAU * 90 * tv) * np.exp(-tv / 0.08) * 0.4 + bp(rs.randn(m), 1500, 4000) * np.exp(-tv / 0.01) * 0.2) * 0.35, tp + 0.15, 1, 0.1)
        m, tv = tvec(0.5); place(out, bp(rs.randn(m), 300, 1500) * np.sin(np.pi * tv / tv[-1]) * 0.05, tp - 0.3, 1, 0.1)
    for i in range(18):
        m, tv = tvec(0.35); y = bp(rs.randn(m), 350, 2200) * np.sin(np.pi * tv / tv[-1]) ** 2
        place(out, y * 0.03, EV['pages'] + i * 0.14 + rs.rand() * 0.2, 1, rs.rand() * 1.2 - 0.3)
    place(out, bell(hz('D4'), 6, 0.8) * 0.07, 210.5, 1, 0.5); place(out, bell(hz('A3'), 6, 0.8) * 0.06, 213.0, 1, 0.5)
    # ship creaks
    for i in range(8):
        m, tv = tvec(0.7); f = 180 + rs.rand() * 120; y = np.sin(TAU * np.cumsum(f * (1 + 0.3 * tv)) / SR) * (np.sin(TAU * 30 * tv) > 0.2) * np.sin(np.pi * tv / tv[-1])
        place(out, bp(y, 150, 1500) * 0.02, 247 + i * 1.7 + rs.rand(), 1, 0.2)
    # an owl over Galileo's garden
    for i, tb in enumerate([274.2, 274.9, 283.4]):
        m, tv = tvec(0.45); place(out, np.sin(TAU * 380 * tv * (1 - 0.06 * tv)) * np.sin(np.pi * tv / tv[-1]) ** 2 * 0.03, tb, 1, -0.6)
    # industry: machine hum, clanks, steam; the engine and its whistle
    ind = W([(0, 0), (316, 0), (318, 1), (345, 0.8), (351, 0), (dur, 0)])
    for ch in range(2): out[:, ch] += (np.sin(TAU * 55 * t + ch) * 0.012 + lp(rs.randn(n), 140) * 0.024) * ind
    for i in range(30): place(out, lp(bell(500 + rs.rand() * 700, 0.5, 0.4), 1800) * 0.018, 317 + i * 0.85 + rs.rand() * 0.4, 1, rs.rand() * 1.6 - 0.8)
    for i in range(int(18 / 0.3)):
        tt = EV['train'] - 3 + i * 0.32 * (1 - i * 0.004); m, tv = tvec(0.25)
        place(out, bp(rs.randn(m), 300, 1800) * np.exp(-tv / 0.06) * 0.028 * min(1, i / 6) * max(0, 1 - i / 60), tt, 1, -0.7 + i * 0.03)
    m, tv = tvec(1.8); wh = sum(np.sin(TAU * f * tv) for f in (587, 740, 880)) * env_ar(m, 0.08, 0.5) * 0.016
    place(out, lp(wh, 1600), EV['train'] - 1.0, 1, -0.2)
    for tl in EV['lamps']:
        m, tv = tvec(0.6); place(out, lp(rs.randn(m), 800) * np.exp(-tv / 0.15) * np.minimum(1, tv / 0.05) * 0.08, tl, 1, 0.2)
    # electricity: a click, a hum
    m, tv = tvec(0.05); place(out, bp(rs.randn(m), 1500, 7000) * np.exp(-tv / 0.004) * 0.05, EV['firstLight'] - 0.05, 1, 0)
    elec = W([(0, 0), (EV['firstLight'], 0), (EV['lightsFull'], 1), (378, 0.6), (381, 0), (418, 0), (421, 0.5), (437, 0.5), (446, 0), (dur, 0)])
    for ch in range(2): out[:, ch] += (np.sin(TAU * 60 * t) * 0.006 + np.sin(TAU * 120 * t) * 0.004 + np.sin(TAU * 180 * t) * 0.002) * elec
    # the rocket, and a small knock as it lands on the moon
    m, tv = tvec(EV['landing'] - EV['rocket'] + 0.6)
    place(out, lp(rs.randn(m), 160) * env_ar(m, 0.4, 0.5) * 0.17 + bp(rs.randn(m), 400, 1600) * env_ar(m, 0.3, 0.5) * 0.025, EV['rocket'], 1, 0.3)
    m, tv = tvec(0.4); place(out, (np.sin(TAU * 160 * tv) * np.exp(-tv / 0.08) + lp(rs.randn(m), 900) * np.exp(-tv / 0.01) * 0.4) * 0.12, EV['landing'], 1, 0.4)
    m, tv = tvec(0.08); place(out, bp(rs.randn(m), 800, 3000) * np.exp(-tv / 0.01) * 0.05, 431.58, 1, -0.1)
    m, tv = tvec(0.25); place(out, (lp(rs.randn(m), 600) * np.exp(-tv / 0.03) * 0.3 + np.sin(TAU * 180 * tv) * np.exp(-tv / 0.06) * 0.2) * 0.12, EV['landing'] + 1.6, 1, 0.45)
    # the crown hits the seat, then the floor
    for k, dt in enumerate([0.42, 0.9]):
        m, tv = tvec(0.5); place(out, lp(sum(np.sin(TAU * f * tv) * np.exp(-tv / 0.12) for f in (620, 930, 1310)) * 0.3 + lp(rs.randn(m), 900) * np.exp(-tv / 0.01) * 0.4, 2500) * (0.10 if k == 0 else 0.07), EV['crown'] + dt, 1, 0.1)
    # flash powder: a soft whump and a hiss of smoke
    m, tv = tvec(1.2); place(out, (lp(rs.randn(m), 700) * np.exp(-tv / 0.06) * 0.5 + bp(rs.randn(m), 400, 2000) * np.exp(-tv / 0.4) * 0.08), EV['flash'], 1, 0.1)
    # the telegraph key, clicking low
    code = [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1]
    for j, on in enumerate(code):
        if on: m, tv = tvec(0.05); place(out, lp(rs.randn(m), 1500) * np.exp(-tv / 0.006) * 0.08, EV['telegraph'] + j * 0.14, 1, 0.3)
    # a school bell, soft and low, then the door
    place(out, lp(bell(hz('A4'), 2.5, 0.6), 2500) * 0.08, EV['school'] - 0.7, 1, 0.4)
    # the Flyer's engine, putt-putt, and the cars
    fly = W([(0, 0), (EV['flyer'] - 1.4, 0), (EV['flyer'] - 1.0, 1), (EV['landed'], 0.8), (EV['landed'] + 0.6, 0), (dur, 0)])
    for ch in range(2): out[:, ch] += lp(rs.randn(n) * (0.5 + 0.5 * (np.sin(TAU * 11 * t) > 0)), 420) * 0.028 * fly
    cars = W([(0, 0), (EV['cars'] - 0.5, 0), (EV['cars'] + 0.5, 1), (391, 0.8), (392.8, 0), (dur, 0)])
    for ch in range(2): out[:, ch] += lp(rs.randn(n) * (0.6 + 0.4 * np.sin(TAU * 23 * t + ch)), 260) * 0.022 * cars
    # the wars: a low rumble, distant thuds
    war = W([(0, 0), (EV['war'], 0), (EV['war'] + 1.2, 1), (EV['warEnd'] - 0.5, 1), (EV['warEnd'] + 1.0, 0), (dur, 0)])
    for ch in range(2): out[:, ch] += lp(rs.randn(n), 120) * 0.05 * war * (0.6 + 0.4 * slow_noise(n, 1.2, 80 + ch))
    rr2 = np.random.RandomState(31)
    for k in range(10):
        m, tv = tvec(1.4); tb = EV['war'] + 0.8 + rr2.rand() * (EV['warEnd'] - EV['war'] - 1.6)
        place(out, (lp(rr2.randn(m), 160) * np.exp(-tv / 0.35) + np.sin(TAU * 42 * tv) * np.exp(-tv / 0.3) * 0.6) * 0.08, tb, 1, rr2.rand() * 1.6 - 0.8)
    # the spark: a small electric fizz running along the wire
    for i in range(7):
        m, tv = tvec(1.25); fz = bp(rs.randn(m), 700, 2400) * (0.5 + 0.5 * (rs.rand(m) > 0.7)) * np.sin(np.pi * tv / tv[-1])
        place(out, fz * 0.012, EV['spark'] + i * 1.25, 1, -0.7 + i * 0.22)
    # paper: prints and notebook pages lowered on threads, the chain of children
    def flutter(t0, dur=0.9, g=0.035, pan=0.0):
        m, tv = tvec(dur); y = bp(rs.randn(m), 300, 1800) * np.sin(np.pi * tv / tv[-1]) ** 1.5 * (0.55 + 0.45 * np.sin(TAU * (9 + rs.rand() * 4) * tv) ** 2)
        place(out, y * g, t0, 1, pan)
    for tf, pn in [(207.7, -0.3), (209.9, 0.3), (228.5, 0.2), (230.9, 0.5), (236.0, -0.3), (340.5, 0.0)]: flutter(tf, pan=pn)
    m, tv = tvec(0.3); place(out, lp(rs.randn(m), 700) * np.exp(-tv / 0.03) * 0.06, 210.55, 1, 0.3)
    for j in range(4):
        m, tv = tvec(0.25); place(out, lp(rs.randn(m), 1200) * np.exp(-tv / 0.04) * 0.035, 342.9 + j * 0.42 + 0.2, 1, -0.4 + j * 0.25)
    for j in range(4): flutter(347.0 + j * 0.15, 0.5, 0.025, -0.4 + j * 0.25)
    # the Moon up close: the card rising, the lander settling, footsteps in the dust, the flag
    L0 = EV['landing'] + 0.1; land = L0 + 1.3
    m, tv = tvec(1.4); place(out, lp(rs.randn(m), 500) * np.sin(np.pi * tv / tv[-1]) ** 2 * 0.05, L0, 1, 0)
    m, tv = tvec(1.6); place(out, lp(rs.randn(m), 260) * env_ar(m, 0.6, 0.6) * 0.08, land - 1.3, 1, 0.1)
    m, tv = tvec(0.6); place(out, (np.sin(TAU * 70 * tv) * np.exp(-tv / 0.12) + lp(rs.randn(m), 300) * np.exp(-tv / 0.08) * 0.5) * 0.12, land, 1, 0.1)
    for i in range(7):
        m, tv = tvec(0.2); place(out, lp(rs.randn(m), 700) * np.exp(-tv / 0.035) * 0.03, land + 0.9 + (16 + 13 * i) / 92 * 2.2, 1, 0.1 + i * 0.05)
    flutter(land + 3.2, 0.6, 0.02, 0.4)
    # screens waking
    for i in range(6):
        place(out, piano(hz(['A4', 'D5', 'E5', 'A4', 'F#5', 'D5'][i]), 1.6, 0.35) * 0.06, EV['screens'] + i * 0.25, 1, rs.rand() * 1.6 - 0.8)
    return reverb(out, rt=0.9, wet=0.08, bright=5000, seed=9)


def narration(spec, dur):
    tl = narrate.timeline(spec)
    n = int(dur * SR); out = np.zeros((n, 2)); gate = np.zeros(n)
    for L in tl:
        for (t, d, s, y) in L['parts']:
            y = y + lp(y, 180) * 0.35; y = y - hp(y, 7500) * 0.35; y = np.tanh(y * 1.5) / 1.5
            place(out, y, t, 0.71, 0.0)
            gate[int(t * SR): int((t + d) * SR)] = 1
    room = reverb(out, rt=0.5, wet=0.05, bright=4000, seed=5)
    # in the cave, a little of the cave
    cave = curve(n, [(0, 0), (78, 0), (79, 1), (90, 1), (91, 0), (dur, 0)])
    room += reverb(out * cave[:, None], rt=1.6, wet=0.12, bright=3000, seed=6) - out * cave[:, None]
    return room, tl, gate


def main():
    spec = json.load(open(sys.argv[1])); dur = spec['duration']; EV = spec['events']
    print('narration'); voice, tl, gate = narration(spec, dur)
    narrate.write_timeline(spec, tl, os.path.join(ROOT, 'src', 'timeline.js'))
    print('score'); music = build_score(EV, dur)
    print('ambience'); amb = ambience(dur, EV)
    voice, music, amb = voice * 1.2, music * 0.30, amb * 2.6
    duck = 1 - 0.45 * lp(gate, 1.2, 1).clip(0, 1)
    mix = voice + music * duck[:, None] + amb * (0.85 + 0.15 * duck[:, None])
    mix *= curve(len(mix), [(0, 0), (1.5, 1), (dur - 4, 1), (dur, 0)])[:, None]
    db = lambda x: 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-12)
    for t0 in range(0, int(dur), 12):
        sl = slice(t0 * SR, (t0 + 12) * SR)
        print(f'   {t0:3d}s  voice {db(voice[sl]):6.1f}  music {db(music[sl] * duck[sl, None]):6.1f}  amb {db(amb[sl]):6.1f}  mix {db(mix[sl]):6.1f}')
    print(f'  overall: voice {db(voice[gate > 0]):.1f} (while speaking)  music {db(music):.1f}  amb {db(amb):.1f}  mix {db(mix):.1f}  peak {np.abs(mix).max():.2f}')
    # loud enough for a phone speaker, without ever clipping: a look-ahead limiter
    from scipy.ndimage import maximum_filter1d, minimum_filter1d
    mix *= 10 ** (3 / 20)
    env = maximum_filter1d(np.abs(mix).max(axis=1), size=int(0.006 * SR))
    gain = minimum_filter1d(np.minimum(1.0, 0.92 / np.maximum(env, 1e-9)), size=int(0.012 * SR))
    gain = np.minimum(gain, signal.sosfiltfilt(sos('lowpass', 12, 1), gain))
    mix *= gain[:, None]
    print(f'  limiter: max reduction {20 * np.log10(gain.min()):.1f} dB, final rms {db(mix):.1f} dBFS, peak {np.abs(mix).max():.2f}')
    mix = np.clip(mix, -0.98, 0.98)
    os.makedirs(os.path.join(ROOT, 'assets/audio'), exist_ok=True)
    wav = os.path.join(ROOT, '.cache', 'film.wav'); os.makedirs(os.path.dirname(wav), exist_ok=True)
    sf.write(wav, mix, SR)
    for stem, x in (('voice', voice), ('music', music), ('amb', amb)): sf.write(os.path.join(ROOT, '.cache', f'_{stem}.wav'), x, SR)
    mp3 = os.path.join(ROOT, 'assets/audio/film.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '128k', mp3], check=True)
    print('wrote', mp3, os.path.getsize(mp3) // 1024, 'kB')

if __name__ == '__main__':
    main()
