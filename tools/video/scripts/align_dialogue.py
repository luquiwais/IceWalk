"""Transcribe coherent TTS, align known lines, and split without speeding up voices."""
import argparse,json,re,unicodedata,difflib,subprocess,math
from pathlib import Path
from faster_whisper import WhisperModel
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
def normal(s):return re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',s.lower().replace('metre','meter')).encode('ascii','ignore').decode())
ap=argparse.ArgumentParser();ap.add_argument('kind');a=ap.parse_args()
source=ROOT/'assets/gemini-dialogue'/f'{a.kind}.wav'
cache=source.with_suffix('.words.json')
if cache.exists(): heard=json.loads(cache.read_text())
else:
 model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=6)
 raw=subprocess.run(['ffmpeg','-v','error','-i',str(source),'-ac','1','-ar','16000','-f','f32le','-'],capture_output=True,check=True).stdout
 segments,info=model.transcribe(np.frombuffer(raw,np.float32),language='es' if a.kind.startswith('local') else 'en',word_timestamps=True,beam_size=5,vad_filter=True)
 heard=[{'word':w.word.strip(),'start':w.start,'end':w.end} for s in segments for w in s.words]
 cache.write_text(json.dumps(heard,ensure_ascii=False,indent=2))
merged=[]
for word in heard:
 if merged and normal(merged[-1]['word'])=='ice' and normal(word['word'])=='walk':
  merged[-1]={'word':'IceWalk','start':merged[-1]['start'],'end':word['end']}
 else:merged.append(word)
heard=merged
expected=json.loads((source.with_suffix('.json')).read_text())['lines']
tokens=[];ranges=[]
for line in expected:
 text=line['text'].replace('three point three','3 ,3').replace('one point two','1 ,2').replace('tres coma treinta y dos','3 ,32').replace('uno coma dieciséis','1 ,16').replace('twenty-five','25').replace('veinticinco','25')
 start=len(tokens);tokens.extend(normal(w) for w in text.split());ranges.append((start,len(tokens)))
observed=[normal(w['word']) for w in heard]
mapping={}
for b in difflib.SequenceMatcher(None,tokens,observed,autojunk=False).get_matching_blocks():
 for k in range(b.size):mapping[b.a+k]=b.b+k
out=ROOT/'assets/directed-voice';out.mkdir(parents=True,exist_ok=True)
report=[]
for i,(lo,hi) in enumerate(ranges):
 matched=[mapping[k] for k in range(lo,hi) if k in mapping]
 coverage=len(matched)/(hi-lo)
 if coverage<.6:raise RuntimeError(f'Line {i} has only {coverage:.0%} transcript coverage')
 start=max(0,heard[min(matched)]['start']-.06)
 end=heard[max(matched)]['end']+.12
 if i+1<len(ranges):
  nextmatch=next((mapping[k] for k in range(hi,len(tokens)) if k in mapping),None)
  if nextmatch is not None:end=min(end,heard[nextmatch]['start'])
 path=out/f'{a.kind}-{i:02d}.wav'
 subprocess.run(['ffmpeg','-v','error','-y','-ss',str(start),'-t',str(end-start),'-i',str(source),'-ar','48000',str(path)],check=True)
 report.append({'index':i,'text':expected[i]['text'],'role':expected[i]['role'],'duration_frames':math.ceil((end-start)*24),'window_frames':expected[i]['duration'],'coverage':round(coverage,3),'source_start_s':start,'source_end_s':end,'tempo':1.0})
 print(i,round(end-start,2),'s',round(coverage,2),expected[i]['text'],flush=True)
(out/f'{a.kind}-timing.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
