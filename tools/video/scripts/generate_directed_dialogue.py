"""One coherent directed take, two male voices; no per-line TTS cadence."""
import os,sys,json,base64,urllib.request,urllib.error,wave
from pathlib import Path
from prepare_gemini_audio import ROOT,credential
kind=sys.argv[1] if len(sys.argv)>1 else 'local'
lf=ROOT/'assets/gemini-dialogue'/f'{kind}.lines.json'  # optional staged script, e.g. global2 (15/11 cut)
lines=json.loads(lf.read_text()) if lf.exists() else json.loads((ROOT/'src/narration.json').read_text())[kind]
wpm=os.environ.get('PACE_WPM','150')
note=os.environ.get('DIRECTION_NOTE','')
lang='Spanish from Buenos Aires, natural Rioplatense pronunciation, sheísmo' if kind=='local' else 'English'
direction=f'''You are directing a restrained documentary about astronauts working on Mars. Speak in {lang}. Two adult men, both serious, human and composed. Mission: mature low-mid voice, thoughtful, understated, no trailer growl. EV: clear practical radio report, slightly younger. Natural sentence rhythm, subtle breaths, no mechanical list-reading. No overacting. Keep a conversational pace around {wpm} words per minute. A short pause between turns; do not read the speaker names or these directions. Read the transcript verbatim. {note}\n\n'''
transcript='\n'.join(('EV' if c['role']=='EV1' else 'Mission')+': '+c['text'] for c in lines)
legacy_body={'contents':[{'parts':[{'text':direction+transcript}]}], 'generationConfig':{'responseModalities':['AUDIO'],'speechConfig':{'multiSpeakerVoiceConfig':{'speakerVoiceConfigs':[{'speaker':'Mission','voiceConfig':{'prebuiltVoiceConfig':{'voiceName':'Orus'}}},{'speaker':'EV','voiceConfig':{'prebuiltVoiceConfig':{'voiceName':'Charon'}}}]}}}}
model='gemini-3.8-flash-tts'
style='Male, serious restrained documentary narration. Native Rioplatense Spanish from Buenos Aires, natural pauses and diction. Around 150 words per minute. No advertising delivery, no theatrical growl.' if kind=='local' else f'Male, serious restrained documentary narration, calm lower register, natural diction and breath, no theatrical growl. Calm mission-control cadence, about {wpm} words per minute, short pauses, never rushed or clipped. {note}'
body={'model':model,'input':[{'type':'user_input','content':[{'type':'text','text':c['text'],'annotations':[{'type':'speech_metadata','speaker':'EV' if c['role']=='EV1' else 'Mission','style':style}]} for c in lines]}],'response_format':{'type':'audio'},'generation_config':{'speech_config':{'speakers':[{'speaker':'Mission','voice':'Orus'},{'speaker':'EV','voice':'Charon'}]}}}
req=urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/interactions',data=json.dumps(body).encode(),headers={'x-goog-api-key':credential(),'Content-Type':'application/json'})
try:
 with urllib.request.urlopen(req,timeout=180) as r:d=json.load(r)
except urllib.error.HTTPError as e:
 error=json.loads(e.read()).get('error',{});print('Dialogue synthesis failed',e.code,error.get('status'),flush=True);raise SystemExit(1)
blocks=[c for step in d.get('steps',[]) if step.get('type')=='model_output' for c in step.get('content',[]) if c.get('type')=='audio']
if not blocks: print('No audio; response keys',list(d));raise SystemExit(1)
pcm=base64.b64decode(blocks[-1]['data']);rate=24000
out=ROOT/'assets/gemini-dialogue';out.mkdir(parents=True,exist_ok=True)
if pcm[:4]==b'RIFF':
 (out/f'{kind}.wav').write_bytes(pcm)
else:
 with wave.open(str(out/f'{kind}.wav'),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(pcm)
(out/f'{kind}.json').write_text(json.dumps({'model':model,'voices':{'Mission':'Orus','EV':'Charon'},'lines':lines,'duration_s':len(pcm)/2/rate},ensure_ascii=False,indent=2))
print('Dialogue',kind,len(pcm)/2/rate,'seconds',flush=True)
