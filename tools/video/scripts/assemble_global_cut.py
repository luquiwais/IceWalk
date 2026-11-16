"""Assemble the 8 voice takes of the 30 s Global cut (15/11 EDL) and measure them.

Sources (all Gemini Orus/Charon directed takes, aligned by align_dialogue.py):
  new:   global2-00/01 (hook, product), g3b-00 (IV review), g7a-00 (campaign)
  reuse (archived originals in archive-global-v1/): global-01 (EV1 "One metre. No ice."), global-02 (map updates), global-04 (Copy.), global-06 (IceWalk.)
Only the IV take gets its internal pauses tightened (silences > GAP_MAX cut down to GAP_MAX, 15 ms
crossfade); no take is time-stretched. Writes assets/directed-voice/global-NN.wav (the layout test_delivery expects) (trimmed,
48 kHz mono) and global-cut-timing.json (cue table with measured duration in 24 fps frames).
"""
import json, math
from pathlib import Path
import numpy as np, soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
V = ROOT / 'assets/directed-voice'
SR = 48000
GAP_MAX = .12
CUES = [  # (source stem, role, from, max_end, text, tighten)
    ('global2-00', '', 4, 92, 'Every EVA on Mars is limited. Where should the crew measure?', False),
    ('global2-01', '', 102, 214, 'IceWalk maps where ice is likely, and how sure we are. Then it plans the stations.', False),
    ('archive-global-v1/global-01', 'EV1', 232, 290, 'One metre. No ice.', False),
    ('archive-global-v1/global-02', '', 306, 410, 'Each measurement updates the map and the plan.', False),
    ('g3b-00', 'IV', 426, 492, 'Plan reviewed. EV1, you are GO for the next station.', True),
    ('archive-global-v1/global-04', 'EV1', 494, 506, 'Copy.', False),
    ('g7a-00', '', 512, 640, 'In our simulation, radar first cuts the expected EVAs from three point three to one point two.', False),
    ('archive-global-v1/global-06', '', 668, 700, 'IceWalk.', False),
]


def trim(x):
    idx = np.nonzero(np.abs(x) > .01)[0]
    return x[max(0, idx[0] - 400): idx[-1] + 2400]


def tighten(x, gap_max=GAP_MAX, thr_db=-42, xf=.015):
    hop = int(.005 * SR)
    n = len(x) // hop
    rms = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1))
    quiet = 20 * np.log10(rms / (np.max(rms) + 1e-12) + 1e-12) < thr_db
    out, i, keep_from = [], 0, 0
    first = np.argmax(~quiet); last = n - np.argmax(~quiet[::-1])
    while i < n:
        if quiet[i] and first < i < last:
            j = i
            while j < n and quiet[j]: j += 1
            if (j - i) * hop > gap_max * SR * 1.1:
                cut_a = i * hop + int(gap_max * SR / 2); cut_b = j * hop - int(gap_max * SR / 2)
                out.append(x[keep_from:cut_a]); keep_from = cut_b
            i = j
        else:
            i += 1
    out.append(x[keep_from:])
    # crossfade-join
    y = out[0]; c = int(xf * SR)
    for seg in out[1:]:
        w = np.linspace(0, 1, c)
        y = np.concatenate([y[:-c], y[-c:] * (1 - w) + seg[:c] * w, seg[c:]])
    return y


def main():
    table = []
    for k, (stem, role, frm, max_end, text, tight) in enumerate(CUES):
        x, sr = sf.read(V / f'{stem}.wav')
        assert sr == SR, (stem, sr)
        if x.ndim > 1: x = x.mean(axis=1)
        x = trim(x)
        if tight: x = tighten(x)
        sf.write(V / f'global-{k:02d}.wav', x.astype(np.float32), SR)
        dur = math.ceil(len(x) / SR * 24)
        table.append({'index': k, 'source': stem, 'role': role, 'from': frm, 'duration': dur, 'max_end': max_end,
                      'fits': frm + dur <= max_end, 'text': text})
        print(k, stem, role or 'NARR', frm, dur, 'end', frm + dur, '<=', max_end, 'OK' if frm + dur <= max_end else 'TOO LONG')
    (V / 'global-cut-timing.json').write_text(json.dumps(table, indent=1, ensure_ascii=False))


if __name__ == '__main__':
    main()
