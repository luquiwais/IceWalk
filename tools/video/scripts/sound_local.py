"""Local film sound (180 s, castellano): same palette as the Global, timeline of src/v2/LocalFilm.tsx.

uv run --with numpy --with scipy --with soundfile scripts/sound_local.py
"""
import json
import subprocess

import numpy as np
import soundfile as sf

import sound_global as g

FRAMES = 4320
g.N = int(FRAMES / g.FPS * g.SR)
N = g.N
at, place, env = g.at, g.place, g.env


def voices(cues):
    bus = np.zeros(N)
    for i, c in enumerate(cues):
        x = g.load(g.ROOT / f'assets/directed-voice/local-{i:02d}.wav')
        idx = np.nonzero(np.abs(x) > .01)[0]
        x = x[max(0, idx[0] - 400): idx[-1] + 2400]
        x /= np.max(np.abs(x)) + 1e-9
        if c['role'] in ('EV1', 'IV'):
            place(bus, g.quindar(2525), c['from'] - 7)
            y = g.radio(x) * .78
            place(bus, y, c['from'])
            place(bus, g.quindar(2475), c['from'] + len(y) / g.SR * g.FPS + 2)
        else:
            place(bus, g.reverb(g.hp(x, 70), .7, .06, 7000) * .82, c['from'])
    return bus


def score():
    bus = np.zeros(N)
    prog = [[45, 52, 57, 60], [41, 48, 57, 60], [36, 43, 52, 55, 60], [43, 50, 55, 59]]
    # Intensity per section (frames): calm exposition, build to the decision, release, final.
    curve = [(0, .08), (500, .07), (1150, .09), (1750, .07), (2100, .10), (2700, .11), (3050, .14), (3300, .19),
             (3420, .13), (3700, .16), (4060, .1), (4176, 0)]
    f = 0
    k = 0
    while f < 4176:
        n_frames = 192
        gain = np.interp(f, [c[0] for c in curve], [c[1] for c in curve])
        n = at(min(4188, f + n_frames + 24)) - at(f)
        x = g.chord(prog[k % 4], n, .3 + gain * 2.5) * env(n, 1.2, 1.4, 1.5) * gain
        place(bus, x, f)
        f += n_frames
        k += 1
    n = at(3420) - at(2100)
    place(bus, np.sin(2 * np.pi * 32.7 * g.t(n)) * env(n, 4, 2) * .1, 2100)
    tick_n = int(.035 * g.SR)
    tick = g.bp(g.rng.standard_normal(tick_n), 1800, 5200) * env(tick_n, .001, .03, 2) * .22
    for a, b in ((2064, 2376), (3048, 3300)):
        for fr in range(a, b, 30):
            place(bus, tick, fr, .6)
    n = at(4320) - at(4188)
    place(bus, g.chord([33, 45, 52, 57, 64, 69], n, .8) * env(n, .05, 2.5) * .2, 4188)
    return g.hp(g.reverb(bus, 3.5, .35, 3500), 38)


def sfx():
    bus = np.zeros(N)
    w = g.wind()
    n = at(132)
    place(bus, g.lp(g.rng.standard_normal(n), 90) * env(n, 1.5, .5) * .35, 0)
    place(bus, g.whoosh(at(60) - at(8), True, 80, 900) * .28, 8)
    place(bus, g.whoosh(at(132) - at(84), True, 150, 4500) * .45, 84)
    place(bus, g.boom(int(1.5 * g.SR), 38) * .5, 132)
    for a, b, gn in ((132, 324, .3), (1896, 1956, .3), (2064, 2124, .26), (2376, 2520, .3), (3408, 3540, .26)):
        nn = at(b) - at(a)
        place(bus, w[at(a):at(b)] * env(nn, .08, .25), a, gn)
    for a, b in ((132, 324), (2064, 2124), (3408, 3468)):
        place(bus, g.breath(at(b) - at(a), 3.3) * .7, a)
    for a, b in ((130, 192), (1894, 1956), (2374, 2436)):
        place(bus, g.drill_sound(at(b) - at(a)) * .55, a)
    for fr in (2436, 2520):
        place(bus, g.boom(int(2.6 * g.SR), 36) * .5, fr)
    for a, b, gain in ((192, 264, .25), (264, 324, .55), (2064, 2124, .55), (3408, 3468, .55), (3468, 3540, .25)):
        fr = a + 2
        while fr < b:
            place(bus, g.footstep(), fr, gain)
            fr += 13
    for a, b in ((324, 513), (1956, 2064), (2724, 3408)):
        nn = at(b) - at(a)
        place(bus, g.room_tone(nn) * env(nn, .05, .1), a)
    ticks = [400, 430, 470, 560, 600, 700, 760, 870, 900] + [1170 + i * 21 for i in range(7)] + [1480, 1520, 1560, 1620, 1680] + \
        [2790, 2806, 2840, 2900, 2960, 3060, 3120, 3180]
    for fr in ticks:
        place(bus, g.ui_tick(2000 + (fr % 7) * 90), fr, .8)
    place(bus, g.whoosh(at(1464) - at(1330), True, 200, 1800) * .12, 1330)
    for fr in (936, 2520):
        place(bus, g.whoosh(at(fr + 72) - at(fr), False, 120, 1600) * .25, fr)
    place(bus, g.chime(), 3300)  # IV clicks CONFIRM: review cut 3250 + clickAt 50
    for fr in range(3720, 3790, 3):
        place(bus, g.ui_tick(2600), fr, .6)
    place(bus, g.whoosh(at(4120) - at(4080), False, 300, 5000) * .3, 4080)
    return bus


def main():
    cues = json.loads((g.ROOT / 'src/narration.json').read_text())['local']
    v, m, s = voices(cues), score(), sfx()
    ve = g.lp(np.abs(v), 6)
    duck = 1 - .45 * np.clip(ve / (np.max(ve) + 1e-9) * 3, 0, 1)
    gate = np.ones(N)
    gate[at(4176):at(4188)] = 0
    gate = g.lp(gate, 30)
    mix = v + (m * .9 + s * .8) * duck * gate
    mix = mix / np.max(np.abs(mix)) * .89
    out = g.ROOT / 'public/audio'
    tmp = out / 'local-film-mix-pre.wav'
    sf.write(tmp, mix.astype(np.float32), g.SR, subtype='PCM_24')
    subprocess.run(['ffmpeg', '-v', 'quiet', '-y', '-i', str(tmp), '-af', 'loudnorm=I=-15:TP=-1.0:LRA=11', '-ar', str(g.SR),
                    '-c:a', 'pcm_s24le', str(out / 'local-film-mix.wav')], check=True)
    tmp.unlink()
    print('MIX local', round(len(mix) / g.SR, 2), 's')


if __name__ == '__main__':
    main()
