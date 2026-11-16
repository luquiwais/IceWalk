"""Directed male mission voices. Key: environment or ignored .env; audio stays local."""
import argparse,base64,json,os,time,urllib.request,urllib.error,wave
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
MODEL='gemini-3.1-flash-tts-preview'

def credential():
    if os.environ.get('GEMINI_API_KEY'): return os.environ['GEMINI_API_KEY']
    p=ROOT/'.env'
    for line in p.read_text().splitlines() if p.exists() else []:
        if line.startswith('GEMINI_API_KEY='): return line.partition('=')[2].strip().strip('"')
    raise SystemExit('GEMINI_API_KEY is not configured')

def generate(text,language,voice,path):
    style=('Voz masculina adulta, registro medio-grave, seria y serena. Español rioplatense natural de Buenos Aires, con sheísmo. Interpretación sobria de un operador de misión, cercano y reflexivo, con pausas orgánicas. Sin tono publicitario, sin impostar voz de tráiler, sin cantar y sin pronunciar las instrucciones. ' if language=='local' else 'Adult male voice, a grounded lower register, calm and serious. Restrained mission operator, thoughtful documentary delivery, natural breaths and phrasing. No trailer growl, no advertising voice, no robotic rhythm. ')
    body={'contents':[{'parts':[{'text':style+'Read only this exact line: '+text}]}], 'generationConfig':{'responseModalities':['AUDIO'],'speechConfig':{'voiceConfig':{'prebuiltVoiceConfig':{'voiceName':voice}}}}}
    req=urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent',data=json.dumps(body).encode(),headers={'x-goog-api-key':credential(),'Content-Type':'application/json'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req,timeout=60) as response: data=json.load(response)
            break
        except urllib.error.HTTPError as e:
            error=json.loads(e.read()).get('error',{})
            details=error.get('details',[])
            violations=[v for d in details for v in d.get('violations',[])]
            metrics=[v.get('quotaId',v.get('quotaMetric','')) for v in violations]
            print('TTS request:',e.code,error.get('status'),metrics,flush=True)
            daily=any('day' in m.lower() for m in metrics)
            if e.code!=429 or daily or attempt==3: raise SystemExit(1)
            delay=next((d.get('retryDelay') for d in details if d.get('retryDelay')), '30s')
            seconds=min(55,max(15,float(delay.rstrip('s'))+1))
            print('Retry after',seconds,'seconds',flush=True);time.sleep(seconds)
    parts=data.get('candidates',[{}])[0].get('content',{}).get('parts',[])
    item=next((p['inlineData'] for p in parts if 'inlineData' in p),None)
    if not item: raise SystemExit('No audio in TTS response')
    rate=int(item.get('mimeType','').partition('rate=')[2].split(';')[0] or 24000)
    pcm=base64.b64decode(item['data']);path.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(path),'wb') as out:
        out.setnchannels(1);out.setsampwidth(2);out.setframerate(rate);out.writeframes(pcm)
    print(path.name,round(len(pcm)/(2*rate),2),'seconds',voice,flush=True)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--kind',choices=['local','global'],default='local');ap.add_argument('--sample',action='store_true');ap.add_argument('--voice',default='Orus');ap.add_argument('--start',type=int,default=0);ap.add_argument('--limit',type=int,default=1);a=ap.parse_args()
    lines=json.loads((ROOT/'src/narration.json').read_text())[a.kind]
    for i,cue in enumerate(lines[a.start:a.start+a.limit],a.start):
        voice='Charon' if cue['role']=='EV1' else a.voice
        out=ROOT/'assets/gemini-voice'/f'{a.kind}-{i:02d}-{voice}.wav'
        if out.exists():print(out.name,'already generated');continue
        generate(cue['text'],a.kind,voice,out)
        time.sleep(12)
    (ROOT/'assets/gemini-voice/provider.json').write_text(json.dumps({'provider':'Google Gemini','model':MODEL,'voice':a.voice,'direction':'Adult male, calm serious mission operator; native Rioplatense for Spanish','status':'audition, not approved'},indent=2))

if __name__=='__main__':main()
