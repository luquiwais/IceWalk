"""Local film sound (180 s, castellano): same palette as the Global, timeline of src/v2/LocalFilm.tsx (v3 edit, real UI).

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
    # Intensity per section (frames): problem, site and plan (UI), measurement and review, support, efficiency, close.
    curve = [(0, .08), (264, .07), (1320, .08), (1840, .10), (2056, .12), (2580, .14), (2724, .11), (3300, .15),
             (3652, .12), (4040, .1), (4188, 0)]
    f = 0
    k = 0
    while f < 4188:
        n_frames = 192
        gain = np.interp(f, [c[0] for c in curve], [c[1] for c in curve])
        n = at(min(4200, f + n_frames + 24)) - at(f)
        x = g.chord(prog[k % 4], n, .3 + gain * 2.5) * env(n, 1.2, 1.4, 1.5) * gain
        place(bus, x, f)
        f += n_frames
        k += 1
    n = at(2724) - at(2056)
    place(bus, np.sin(2 * np.pi * 32.7 * g.t(n)) * env(n, 4, 2) * .1, 2056)
    tick_n = int(.035 * g.SR)
    tick = g.bp(g.rng.standard_normal(tick_n), 1800, 5200) * env(tick_n, .001, .03, 2) * .22
    for fr in range(2800, 3030, 30):
        place(bus, tick, fr, .6)
    n = at(4320) - at(4200)
    place(bus, g.chord([33, 45, 52, 57, 64, 69], n, .8) * env(n, .05, 2.5) * .2, 4200)
    return g.hp(g.reverb(bus, 3.5, .35, 3500), 38)


def sfx():
    bus = np.zeros(N)
    w = g.wind()
    n = at(132)
    place(bus, g.lp(g.rng.standard_normal(n), 90) * env(n, 1.5, .5) * .35, 0)
    place(bus, g.whoosh(at(60) - at(8), True, 80, 900) * .28, 8)
    place(bus, g.boom(int(1.5 * g.SR), 38) * .35, 72)
    for a, b, gn in ((72, 264, .3), (1840, 2056, .3), (2724, 2784, .26)):
        nn = at(b) - at(a)
        place(bus, w[at(a):at(b)] * env(nn, .08, .25), a, gn)
    for a, b in ((192, 264), (1840, 1900), (2724, 2784)):
        place(bus, g.breath(at(b) - at(a), 3.3) * .7, a)
    for a, b in ((72, 192), (1972, 2030)):
        place(bus, g.drill_sound(at(b) - at(a)) * .55, a)
    place(bus, g.boom(int(2.6 * g.SR), 36) * .45, 2056)
    for a, b, gain in ((192, 264, .25), (1840, 1900, .55), (1900, 1972, .25), (2724, 2784, .55)):
        fr = a + 2
        while fr < b:
            place(bus, g.footstep(), fr, gain)
            fr += 13
    nn = at(2724) - at(2580)
    place(bus, g.room_tone(nn) * env(nn, .05, .1), 2580)
    # UI: highlights appear (soft ticks) and cursor clicks (louder), frames from LocalFilm.tsx.
    soft = [444, 506, 564, 950, 1068, 1080, 1172, 1344, 1510, 1690, 1764, 2348, 2868, 3042, 3208, 4060]
    for fr in soft:
        place(bus, g.ui_tick(2000 + (fr % 7) * 90), fr, .5)
    for fr in (624, 1482, 4174):
        place(bus, g.ui_tick(2600), fr, .9)
    place(bus, g.whoosh(at(777) - at(640), True, 200, 2400) * .2, 640)
    place(bus, g.whoosh(at(1680) - at(1572), True, 200, 2000) * .14, 1572)
    place(bus, g.whoosh(at(2332) - at(2260), False, 120, 1600) * .25, 2260)
    place(bus, g.chime(), 2700)  # IV clicks CONFIRM: review cut 2644 + clickAt 56
    for fr in range(3306, 3340, 3):
        place(bus, g.ui_tick(2600), fr, .5)
    place(bus, g.whoosh(at(4240) - at(4200), False, 300, 5000) * .3, 4200)
    return bus


def main():
    cues = json.loads((g.ROOT / 'src/narration.json').read_text())['local']
    v, m, s = voices(cues), score(), sfx()
    ve = g.lp(np.abs(v), 6)
    duck = 1 - .45 * np.clip(ve / (np.max(ve) + 1e-9) * 3, 0, 1)
    gate = np.ones(N)
    gate[at(4188):at(4200)] = 0
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
