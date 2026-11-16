"""Global film sound: original procedural score + SFX + processed voices, one 48 kHz mix.

uv run --with numpy --with scipy --with soundfile scripts/sound_global.py
Sources: neural voice takes (assets/neural-voice), NASA Perseverance SuperCam Mars wind
(sol 4, NASA/JPL-Caltech/LANL/CNES/IRAP, public domain). Everything else synthesized here.
Timeline in frames at 24 fps, matching src/GlobalFilm.tsx.
"""
import json
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

ROOT = Path(__file__).resolve().parents[1]
SR = 48000
FPS = 24
DUR = 708 / FPS
N = int(DUR * SR)
rng = np.random.default_rng(7)


def t(n):
    return np.arange(n) / SR


def at(frame):
    return int(frame / FPS * SR)


def env(n, a=.01, r=.1, shape=1.0):
    e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na) ** shape
    e[-nr:] *= np.linspace(1, 0, nr) ** shape
    return e


def bp(x, lo, hi, order=4):
    sos = signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def lp(x, f, order=4):
    return signal.sosfilt(signal.butter(order, f, 'lowpass', fs=SR, output='sos'), x)


def hp(x, f, order=4):
    return signal.sosfilt(signal.butter(order, f, 'highpass', fs=SR, output='sos'), x)


def place(bus, x, frame, gain=1.0):
    i = at(frame)
    j = min(len(bus), i + len(x))
    if j > i:
        bus[i:j] += x[:j - i] * gain


def reverb(x, seconds=1.8, mix=.25, damp=4000):
    n = int(seconds * SR)
    ir = rng.standard_normal(n) * np.exp(-6.9 * t(n) / seconds)
    ir = lp(ir, damp)
    ir /= np.sqrt(np.sum(ir ** 2))
    wet = signal.fftconvolve(x, ir)[:len(x)]
    return x * (1 - mix) + wet * mix


def load(path, sr=SR):
    raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', str(path), '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


# ------------------------------------------------------------------ voices
def radio(x):
    y = .8 * bp(x, 160, 6800, 2) + .2 * x
    y = np.tanh(y * 1.15) / np.tanh(1.15)
    y += rng.standard_normal(len(y)) * .0005
    return y * .9


def quindar(freq):
    n = int(.25 * SR)
    return np.sin(2 * np.pi * freq * t(n)) * env(n, .004, .01) * .16


def voices(cues):
    bus = np.zeros(N)
    for i, c in enumerate(cues):
        x = load(ROOT / f'assets/directed-voice/global-{i:02d}.wav')
        # Trim leading/trailing silence of the synthetic take.
        idx = np.nonzero(np.abs(x) > .01)[0]
        x = x[max(0, idx[0] - 400): idx[-1] + 2400]
        x /= np.max(np.abs(x)) + 1e-9
        if c['role'] in ('EV1', 'IV'):
            place(bus, quindar(2525), c['from'] - 7)
            y = radio(x) * .78
            place(bus, y, c['from'])
            place(bus, quindar(2475), c['from'] + len(y) / SR * FPS + 2)
        else:
            y = hp(x, 70)
            y = reverb(y, .7, .06, 7000) * .82
            place(bus, y, c['from'])
    return bus


# ------------------------------------------------------------------ score
def organ(freq, n, bright=.5):
    """Pipe-organ-like additive tone: octave/fifth ranks, slow tremulant, breath noise."""
    tt = t(n)
    y = np.zeros(n)
    for k, a in ((1, 1), (2, .55), (3, .28 * bright), (4, .3 * bright), (6, .12 * bright), (8, .1 * bright), (.5, .5)):
        ph = rng.uniform(0, 6.28)
        y += a * np.sin(2 * np.pi * freq * k * tt * (1 + .0007 * np.sin(2 * np.pi * .21 * tt + ph)) + ph)
    y *= 1 + .05 * np.sin(2 * np.pi * 5.1 * tt)
    y += lp(rng.standard_normal(n), freq * 3) * .03
    return y


def chord(notes, n, bright=.5):
    return sum(organ(440 * 2 ** ((m - 69) / 12), n, bright) for m in notes) / len(notes)


def score():
    bus = np.zeros(N)
    # (start_frame, end_frame, midi notes, gain, brightness)
    plan = [
        (0, 96, [45, 52, 57, 60], .10, .2),        # Am: orbit, wonder
        (88, 176, [41, 48, 57, 60], .12, .3),      # F: descent into drill
        (170, 250, [41, 48, 53, 57, 60], .10, .35),  # F add: what a negative means
        (245, 362, [36, 43, 52, 55, 60], .13, .45),  # C: the map updates
        (356, 440, [43, 50, 55, 59, 62], .18, .7),   # G: GO, swell
        (434, 525, [45, 52, 57, 60, 64], .15, .55),  # Am: next step
        (518, 610, [41, 48, 57, 60, 65], .17, .7),   # F: campaign
        (600, 664, [36, 43, 52, 55, 60, 64], .13, .5),  # C: return
    ]
    for a, b, notes, g, br in plan:
        n = at(b) - at(a)
        x = chord(notes, n, br) * env(n, .9, 1.2, 1.5) * g
        place(bus, x, a)
    # Sub pedal under the build.
    n = at(440) - at(240)
    place(bus, np.sin(2 * np.pi * 32.7 * t(n)) * env(n, 3, 1.5) * .12, 240)
    # Clock: soft woody tick every 1.25 s (the EVA budget is time), stops at the GO.
    tick_n = int(.035 * SR)
    tick = bp(rng.standard_normal(tick_n), 1800, 5200) * env(tick_n, .001, .03, 2) * .22
    f = 96
    while f < 432:
        place(bus, tick, f, .55 + .45 * (f - 96) / 336)
        f += 30
    # Final chord after the black beat: IceWalk.
    n = at(708) - at(674)
    place(bus, chord([33, 45, 52, 57, 64, 69], n, .8) * env(n, .05, .8) * .2, 674)
    return hp(reverb(bus, 3.5, .35, 3500), 38)


# ------------------------------------------------------------------ sfx
def wind():
    x = load(ROOT / 'assets/sfx/nasa/45827_SCAM_MIC_SOL004_RUN001.wav')
    x = lp(hp(x, 25), 4500)
    x /= np.max(np.abs(x)) + 1e-9
    reps = int(np.ceil(N / len(x))) + 1
    return np.tile(x, reps)[:N]


def drill_sound(n):
    tt = t(n)
    spin = np.clip(tt / .6, 0, 1) ** .7
    f = 95 + 85 * spin
    ph = 2 * np.pi * np.cumsum(f) / SR
    motor = sum(np.sin(ph * k) / k for k in range(1, 9)) * .35
    whine = np.sin(ph * 14) * .05
    grind = bp(rng.standard_normal(n), 250, 2500) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 7 * tt))) * .45
    # Thin CO2 atmosphere + suit: heard mostly through gloves, muffled.
    y = lp((motor + whine) * spin + grind * spin, 1800)
    return y * env(n, .05, .35)


def breath(n, period=3.6):
    tt = t(n)
    phase = (tt % period) / period
    shape = np.where(phase < .38, np.sin(np.pi * phase / .38), 0) * .9 + np.where(
        (phase > .45) & (phase < .9), np.sin(np.pi * (phase - .45) / .45), 0) * .6
    return bp(rng.standard_normal(n), 300, 1600) * shape * .25


def footstep():
    n = int(.22 * SR)
    thud = np.sin(2 * np.pi * 55 * t(n)) * np.exp(-t(n) * 30)
    crunch = bp(rng.standard_normal(n), 400, 2600) * np.exp(-t(n) * 22) * .5
    return lp(thud + crunch, 2200) * .5


def whoosh(n, rise=True, lo=200, hi=3000):
    x = rng.standard_normal(n)
    out = np.zeros(n)
    blk = 2048
    for i in range(0, n, blk):
        p = i / n if rise else 1 - i / n
        fc = lo * (hi / lo) ** p
        seg = x[max(0, i - 4096): i + blk]
        y = bp(seg, max(30, fc * .6), min(SR / 2 - 100, fc * 1.6), 2)[-min(blk, n - i):]
        out[i:i + len(y)] = y
    return out * (env(n, .6 if rise else .05, .05 if rise else .8, 2))


def boom(n=int(2.2 * SR), f=42):
    tt = t(n)
    y = np.sin(2 * np.pi * f * tt * (1 - .25 * tt / tt[-1])) * np.exp(-tt * 1.6)
    y += lp(rng.standard_normal(n), 180) * np.exp(-tt * 3) * .4
    return y * .9


def ui_tick(f=2200):
    n = int(.06 * SR)
    return np.sin(2 * np.pi * f * t(n)) * np.exp(-t(n) * 70) * .2


def chime():
    n = int(1.4 * SR)
    y = sum(np.sin(2 * np.pi * fr * t(n)) * np.exp(-t(n) * d) * a for fr, d, a in ((880, 3, .5), (1318.5, 3.5, .35), (1760, 5, .2)))
    return y * .25


def room_tone(n):
    tt = t(n)
    hum = sum(np.sin(2 * np.pi * 60 * k * tt) / k ** 1.5 for k in range(1, 6)) * .03
    fan = lp(rng.standard_normal(n), 600) * .05
    return hum + fan


def sfx():
    bus = np.zeros(N)
    w = wind()
    # Orbit: low space drone, MRO pass.
    n = at(96)
    place(bus, lp(rng.standard_normal(n), 90) * env(n, 1.5, .5) * .35, 0)
    place(bus, whoosh(at(50) - at(8), True, 80, 900) * .28, 8)
    # Descent: rising whoosh into the surface cut.
    place(bus, whoosh(at(92) - at(56), True, 150, 4500) * .45, 56)
    place(bus, boom(int(1.5 * SR), 38) * .5, 92)
    # Surface beds: Mars wind (real), suit breathing.
    for a, b, g in ((92, 245, .30), (434, 521, .26)):
        n = at(b) - at(a)
        place(bus, w[at(a):at(b)] * env(n, .08, .25), a, g)
    place(bus, breath(at(245) - at(92)) * .6, 92)
    place(bus, breath(at(521) - at(434), 3.1) * 1.0, 434)
    # Drill: spin-up, grind, stop.
    n = at(152) - at(90)
    place(bus, drill_sound(n) * .55, 90)
    place(bus, boom(int(2.6 * SR), 36) * .55, 150)
    # Cross-section: low sweep.
    place(bus, whoosh(at(245) - at(176), False, 120, 1600) * .25, 176)
    # Habitat interior: room tone, UI.
    n = at(434) - at(245)
    place(bus, room_tone(n) * env(n, .05, .1), 245)
    for f in (258, 268, 278, 300, 318, 340, 372, 386, 400):
        place(bus, ui_tick(2000 + (f % 5) * 120), f)
    place(bus, chime(), 412)  # IV clicks CONFIRM: review cut (360) + clickAt (52)
    # POV + walk: footsteps (EV1 close, inside suit; EV2 distant).
    f = 436
    while f < 520:
        place(bus, footstep(), f, .55 if f < 480 else .25)
        f += 13
    # Campaign: counter ticks.
    for f in range(540, 586, 3):
        place(bus, ui_tick(2600), f, .6)
    # Return to orbit.
    place(bus, whoosh(at(640) - at(600), False, 300, 5000) * .35, 600)
    return bus


def main():
    cues = json.loads((ROOT / 'src/narration.json').read_text())['global']
    v, m, s = voices(cues), score(), sfx()
    # Duck music and effects under the voice.
    ve = np.abs(signal.hilbert(lp(np.abs(v), 20))) if False else lp(np.abs(v), 6)
    duck = 1 - .45 * np.clip(ve / (np.max(ve) + 1e-9) * 3, 0, 1)
    # Black beat: silence before IceWalk (frames 664-674) except the voice.
    gate = np.ones(N)
    gate[at(662):at(674)] = 0
    gate = lp(gate, 30)
    mix = v * 1.0 + (m * .9 + s * .8) * duck * gate
    peak = np.max(np.abs(mix))
    mix = mix / peak * .89
    out = ROOT / 'public/audio'
    sf.write(out / 'global-film-mix.wav', mix.astype(np.float32), SR, subtype='PCM_24')
    for name, x in (('voice', v), ('score', m), ('sfx', s)):
        sf.write(ROOT / f'assets/sfx/global-stem-{name}.wav', (x / (np.max(np.abs(x)) + 1e-9) * .9).astype(np.float32), SR)
    # Broadcast/online loudness: -15 LUFS integrated, -1 dBTP.
    tmp = out / 'global-film-mix.wav'
    subprocess.run(['ffmpeg', '-v', 'quiet', '-y', '-i', str(tmp), '-af', 'loudnorm=I=-15:TP=-1.0:LRA=11', '-ar', str(SR),
                    '-c:a', 'pcm_s24le', str(out / 'global-film-mix-norm.wav')], check=True)
    (out / 'global-film-mix-norm.wav').replace(tmp)
    print('MIX', tmp, round(len(mix) / SR, 2), 's peak', round(float(peak), 3))


if __name__ == '__main__':
    main()
