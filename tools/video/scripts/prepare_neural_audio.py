"""Neural voice takes, generated per cue without time compression.

uv run --with edge-tts scripts/prepare_neural_audio.py
Each MP3 is stored locally. Voices are synthetic, not cloned from real people.
"""
import asyncio
import json
import hashlib
from pathlib import Path

import edge_tts

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/neural-voice'
VOICES={'global':{'IV':'en-US-AndrewMultilingualNeural','EV1':'en-US-GuyNeural'},'local':{'IV':'es-AR-TomasNeural','EV1':'es-AR-ElenaNeural'}}

async def main():
    OUT.mkdir(exist_ok=True,parents=True)
    data=json.loads((ROOT/'src/narration.json').read_text())
    gate=asyncio.Semaphore(3)
    async def take(kind,index,cue):
        path=OUT/f'{kind}-{index:02d}.mp3'
        voice=VOICES[kind].get(cue.get('role') or 'IV',VOICES[kind]['IV'])
        fingerprint=hashlib.sha256((voice+'|-3%|'+cue['text']).encode()).hexdigest()
        marker=path.with_suffix('.sha256')
        async with gate:
            if not path.exists() or not marker.exists() or marker.read_text()!=fingerprint:
                await edge_tts.Communicate(cue['text'],voice,rate='-3%').save(str(path))
                marker.write_text(fingerprint)
        print(kind,index,voice,flush=True)
    await asyncio.gather(*(take(k,i,c) for k,cs in data.items() for i,c in enumerate(cs)))
    (OUT/'voices.json').write_text(json.dumps(VOICES,indent=2)+'\n')

if __name__=='__main__':asyncio.run(main())
