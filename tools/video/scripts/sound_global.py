"""Global film sound: original procedural score + SFX + processed voices, one 48 kHz mix.

uv run --with numpy --with scipy --with soundfile scripts/sound_global.py
Sources: neural voice takes (assets/neural-voice), NASA Perseverance SuperCam Mars wind
(sol 4, NASA/JPL-Caltech/LANL/CNES/IRAP, public domain). Everything else synthesized here.
Voice takes: assets/directed-voice/global-NN.wav (scripts/assemble_global_cut.py), cues from src/narration.json "global".
Timeline in frames at 24 fps, matching the 15/11 EDL of src/v2/GlobalFilm.tsx (708 frames):
  orbit 0-60 | descent 60-96 | uiPlan 96-216 (full-screen UI) | drill 216-276 | result 276-300 |
  uiUpdate 300-420 (full-screen UI) | review 420-504 (UI card, confirm click at 452, then crew walks) |
  campaign 504-648 | end 648-708 (logo).
Mars wind only under the Mars shots (drill/result, the walk); ducked out of the UI sections.
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
    last_radio_end = -99
    for i, c in enumerate(cues):
        x = load(ROOT / f'assets/directed-voice/global-{i:02d}.wav')  # already trimmed by assemble_global_cut.py
        x /= np.max(np.abs(x)) + 1e-9
        if c['role'] in ('EV1', 'IV'):
            # Squelch: opening pip (skipped when the previous transmission's closing pip is still ringing:
            # back-to-back exchange IV -> EV1), voice, closing pip.
            if c['from'] - 7 >= last_radio_end:
                place(bus, quindar(2525), c['from'] - 7)
            y = radio(x) * .78
            place(bus, y, c['from'])
            last_radio_end = c['from'] + len(y) / SR * FPS + 2 + 6
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
        (0, 100, [45, 52, 57, 60], .10, .2),          # Am: orbit, wonder
        (90, 224, [41, 48, 57, 60], .11, .3),         # F: descent, the map and the stations (uiPlan)
        (216, 304, [41, 48, 53, 57, 60], .10, .35),   # F add: drill, a negative result
        (296, 428, [36, 43, 52, 55, 60], .13, .45),   # C: the map updates (uiUpdate)
        (420, 516, [43, 50, 55, 59, 62], .16, .65),   # G: review, GO, walking on: swell
        (506, 580, [41, 48, 57, 60, 65], .17, .75),   # F: campaign, chart builds
        (572, 650, [45, 52, 57, 60, 64, 67], .20, .9),  # Am9: swell into the result
    ]
    for a, b, notes, g, br in plan:
        n = at(b) - at(a)
        x = chord(notes, n, br) * env(n, .9, 1.2, 1.5) * g
        place(bus, x, a)
    # Sub pedal under the build to the review/GO.
    n = at(452) - at(300)
    place(bus, np.sin(2 * np.pi * 32.7 * t(n)) * env(n, 3, 1.5) * .12, 300)
    # Rising pad under the campaign chart, peaking at the logo cut.
    n = at(650) - at(520)
    place(bus, np.sin(2 * np.pi * 55 * t(n)) * env(n, 4, .3, 2) * .12, 520)
    # Clock: soft woody tick every 1.25 s (the EVA budget is time), stops at the GO click.
    tick_n = int(.035 * SR)
    tick = bp(rng.standard_normal(tick_n), 1800, 5200) * env(tick_n, .001, .03, 2) * .22
    f = 100
    while f < 450:
        place(bus, tick, f, .45 + .35 * (f - 100) / 350)
        f += 30
    # Resolve on the logo (648): open A-minor-add9 / A pedal, tail rings through IceWalk and to the end.
    n = at(708) - at(648)
    place(bus, chord([33, 45, 52, 57, 64, 69], n, .8) * env(n, .12, 1.4) * .26, 648)
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
    n = at(100)
    place(bus, lp(rng.standard_normal(n), 90) * env(n, 1.5, .5) * .35, 0)
    place(bus, whoosh(at(54) - at(6), True, 80, 900) * .28, 6)
    # Descent: rising whoosh into the HiRISE site, soft thud as the full-screen UI takes over (96).
    place(bus, whoosh(at(96) - at(58), True, 150, 4500) * .42, 58)
    place(bus, boom(int(1.2 * SR), 40) * .30, 96)
    # Mars wind (real SuperCam recording) ONLY under the Mars shots: drill/result and the walk.
    # Nothing under uiPlan (96-216), uiUpdate (300-420) or the review card (420-~456).
    for a, b, g in ((214, 308, .30), (456, 510, .26)):
        n = at(b) - at(a)
        place(bus, w[at(a):at(b)] * env(n, .35, .3), a, g)
    # Suit breathing: EV1 drilling, EV1 walking.
    place(bus, breath(at(300) - at(224)) * .6, 224)
    place(bus, breath(at(508) - at(458), 3.1) * 1.0, 458)
    # UI bed: quiet room tone under the full-screen UI, so the silence of the wind is not a hole.
    for a, b in ((96, 218), (298, 456)):
        n = at(b) - at(a)
        place(bus, room_tone(n) * env(n, .2, .3) * .55, a)
    # uiPlan: stations appear on the map.
    for f, g in ((110, .8), (128, .6), (146, .6), (164, .6), (182, .6), (200, .6)):
        place(bus, ui_tick(2000 + (f % 5) * 120), f, g)
    # Cut to the drill: short low sweep, then the core drill (spin-up, grind, stop).
    place(bus, whoosh(at(220) - at(198), True, 100, 1200) * .22, 198)
    n = at(266) - at(216)
    place(bus, drill_sound(n) * .50, 216)
    place(bus, boom(int(1.6 * SR), 36) * .35, 266)
    # Result (276): core out, short low confirmation.
    place(bus, boom(int(1.0 * SR), 52) * .22, 278)
    # uiUpdate: soft tick at the map update (~330), small follow-ups as the plan re-flows.
    place(bus, ui_tick(2400), 330, 1.0)
    place(bus, ui_tick(2000), 340, .5)
    place(bus, ui_tick(2200), 356, .4)
    # Review card: IV clicks CONFIRM at review cut (420) + clickAt (32) = 452.
    place(bus, chime(), 452)
    # Walk to the next station: footsteps (EV1 close, inside the suit).
    f = 458
    while f < 508:
        place(bus, footstep(), f, .5)
        f += 13
    # Campaign: counter ticks while the chart counts 3.32 -> 1.16.
    for f in range(526, 600, 4):
        place(bus, ui_tick(2600), f, .45)
    place(bus, chime(), 602, .6)
    # Logo.
    place(bus, whoosh(at(648) - at(630), True, 300, 5000) * .22, 630)
    return bus


def main():
    cues = json.loads((ROOT / 'src/narration.json').read_text())['global']
    v, m, s = voices(cues), score(), sfx()
    # Duck music and effects under the voice.
    ve = lp(np.abs(v), 6)
    duck = 1 - .45 * np.clip(ve / (np.max(ve) + 1e-9) * 3, 0, 1)
    # Brief score dip just before the logo hit (frames 640-648) so the resolve lands.
    gate = np.ones(N)
    gate[at(641):at(648)] = .35
    gate = lp(gate, 30)
    mix = v * 1.0 + (m * .9 + s * .8) * duck * gate
    peak = np.max(np.abs(mix))
    mix = mix / peak * .89
    out = ROOT / 'public/audio'
    for name, x in (('voice', v), ('score', m), ('sfx', s)):
        sf.write(ROOT / f'assets/sfx/global-stem-{name}.wav', (x / (np.max(np.abs(x)) + 1e-9) * .9).astype(np.float32), SR)
    # Online loudness: -14 LUFS integrated, -1 dBTP (two-pass loudnorm for accuracy on a 30 s file).
    tmp = out / 'global-film-mix.wav'
    sf.write(tmp, mix.astype(np.float32), SR, subtype='PCM_24')
    target = 'I=-14:TP=-1.0:LRA=11'
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-y', '-i', str(tmp), '-af', f'loudnorm={target}:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True, check=True).stderr
    m_ = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
    flt = (f"loudnorm={target}:measured_I={m_['input_i']}:measured_TP={m_['input_tp']}:measured_LRA={m_['input_lra']}"
           f":measured_thresh={m_['input_thresh']}:offset={m_['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-v', 'quiet', '-y', '-i', str(tmp), '-af', flt, '-ar', str(SR),
                    '-c:a', 'pcm_s24le', str(out / 'global-film-mix-norm.wav')], check=True)
    (out / 'global-film-mix-norm.wav').replace(tmp)
    print('MIX', tmp, round(len(mix) / SR, 2), 's peak', round(float(peak), 3))


if __name__ == '__main__':
    main()
