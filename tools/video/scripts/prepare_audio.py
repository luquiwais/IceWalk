"""Mix neural voice takes with original procedural ambience. ffmpeg, standard library.

The speech takes come from prepare_neural_audio.py. No existing music is used.
No time compression or pitch shifting is applied to the neural speech. Cue text and windows live in src/narration.json.
"""
import json
import math
import subprocess
import wave
from pathlib import Path

from array import array
import random

ROOT = Path(__file__).resolve().parents[1]
SR = 24000
RAW = ROOT / 'assets/audio-guide'
OUT = ROOT / 'public/audio'


def duration(path):
    return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(path)],text=True))


def prepare(kind, frames, voice):
    cues=json.loads((ROOT/'src/narration.json').read_text())[kind]
    n=round(frames/24*SR)
    rng=random.Random(90210)
    def sample(i):
        t=i/SR
        hum=.006*math.sin(2*math.pi*49*t)+.003*math.sin(2*math.pi*73.416*t)+.0015*math.sin(2*math.pi*98*t)
        return (hum+rng.uniform(-.003,.003))*min(1,t/2)*min(1,(n/SR-t)/2)
    mix=array('d',(sample(i) for i in range(n)))
    diagnostics=[]
    for i,c in enumerate(cues):
        source=ROOT/'assets/neural-voice'/f'{kind}-{i:02d}.mp3'
        wav=RAW/f'{kind}-{i:02d}.wav'
        seconds=c['duration']/24
        speed=1.0
        trim='silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse'
        filters=[trim,'highpass=f=80','lowpass=f=11000','afade=t=in:st=0:d=0.015']
        if c.get('role'):filters+=['highpass=f=180','lowpass=f=5800']
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(source),'-af',','.join(filters),'-ar',str(SR),'-ac','1','-c:a','pcm_s16le',str(wav)],check=True)
        with wave.open(str(wav)) as w:
            audio=array('h');audio.frombytes(w.readframes(w.getnframes()))
        start=round(c['from']/24*SR);length=min(len(audio),n-start)
        for j in range(length):mix[start+j]+=audio[j]/32768*.85
        if c.get('role'):
            clickn=int(.025*SR);startc=max(0,start-clickn)
            for j in range(min(clickn,n-startc)):mix[startc+j]+=rng.uniform(-.02,.02)*(1-j/clickn)
        diagnostics.append({'cue':i,'from':c['from'],'duration_frames':len(audio)/SR*24,'window_frames':c['duration'],'tempo':round(speed,3),'voice':voice,'synthetic':True,'time_compression':False})
    peak=max(1,max(abs(v) for v in mix)/.94)
    out=array('h',(round(max(-1,min(1,v/peak))*32767) for v in mix))
    with wave.open(str(OUT/f'{kind}-voice.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(out.tobytes())
    (RAW/f'{kind}-timing.json').write_text(json.dumps(diagnostics,indent=2)+'\n')
    print(kind,'seconds',round(n/SR,3),'cues',len(cues),'max tempo',max(x['tempo'] for x in diagnostics),flush=True)


if __name__=='__main__':
    RAW.mkdir(exist_ok=True,parents=True);OUT.mkdir(exist_ok=True,parents=True)
    prepare('global',708,'Microsoft Andrew / Guy Neural')
    prepare('local',4320,'Microsoft Tomas / Elena Neural, es-AR')
