"""Local, resumable production. Never uploads or regenerates paid voice takes.

python3 scripts/produce_v3.py [--wait-pid PID] [--no-export]
Each complete shot replaces its preview atomically. Edits are installed only
when every referenced clip exists at the required length. A changed source file
stops the queue instead of mixing revisions or overwriting a new user edit.
"""
import argparse,fcntl,hashlib,json,os,re,shutil,subprocess,time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'out/v3-production';OUT.mkdir(parents=True,exist_ok=True)
MANIFEST=json.loads((ROOT/'src/v2/shot-manifest.json').read_text())
ORDER=['drill','drill_result','walk','pov','console_wide','section','console_review',
       'drill_establish','approach','pov_start','console_tools','grip','console_reverse',
       'console_pending','pov_mid','drill_tip','core_profile','console_replan','pov_end','depart']

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def sources():
    paths=[*sorted((ROOT/'blender/v2').glob('*.py')),*sorted((ROOT/'blender/v3').glob('*.py')),
           *sorted((ROOT/'blender/v3/edit-templates').glob('*.template')),
           ROOT/'src/v2/shot-manifest.json',ROOT/'scripts/encode_shots.sh']
    return {str(p.relative_to(ROOT)):digest(p) for p in paths}

def run(args,log):
    with log.open('a') as f:subprocess.run(args,cwd=ROOT,stdout=f,stderr=subprocess.STDOUT,check=True)

def complete(name):
    folder=ROOT/'assets/renders/v3'/name
    return all((folder/f'{i:04d}.png').is_file() and (folder/f'{i:04d}.png').stat().st_size>0 for i in range(1,MANIFEST[name]+1))

def uses(film):
    text=(ROOT/f'blender/v3/edit-templates/{film}.tsx.template').read_text()
    return json.loads(re.search(r'(?:LOCAL_)?SHOT_USES = (\[.*?\]) as const',text,re.S).group(1))

def check_edit(film):
    rows=uses(film)
    for i,a in enumerate(rows):
        clip=ROOT/'public/v2'/(a['shot']+'.mp4')
        data=subprocess.check_output(['ffprobe','-v','error','-count_frames','-select_streams','v:0',
            '-show_entries','stream=nb_read_frames','-of','csv=p=0',str(clip)],text=True)
        assert int(data.strip())>=a['from']+a['frames'],(film,a)
        for b in rows[i+1:]:
            if a['shot']==b['shot']:
                assert a['from']+a['frames']<=b['from'] or b['from']+b['frames']<=a['from'],(film,a,b)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--wait-pid',type=int);ap.add_argument('--no-export',action='store_true');a=ap.parse_args()
    lock=(OUT/'worker.lock').open('w');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    baseline=sources();initial={film:digest(ROOT/f'src/v2/{film}.tsx') for film in ('GlobalFilm','LocalFilm')}
    sound_digest=digest(ROOT/'scripts/sound_local.py')
    state={'pid':os.getpid(),'started_at':time.time(),'phase':'waiting' if a.wait_pid else 'rendering','done':['orbit'],'published':[]}
    def save():
        p=OUT/'status.json';tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(state,indent=2));tmp.replace(p)
    save()
    try:
        if a.wait_pid:
            while True:
                try:os.kill(a.wait_pid,0)
                except ProcessLookupError:break
                time.sleep(5)
        state['phase']='rendering';save()
        for name in ORDER:
            if sources()!=baseline:raise RuntimeError('Production source changed; stopped before mixing revisions')
            state['shot']=name;save();print('SHOT',name,flush=True)
            if not complete(name):
                run(['blender','-b','--python-exit-code','1','--python','blender/v3/render_shots.py','--',name],OUT/(name+'.log'))
            if not complete(name):raise RuntimeError(f'Incomplete render: {name}')
            env=dict(os.environ,RENDER_REVISION='v3')
            with (OUT/(name+'.log')).open('a') as f:
                subprocess.run(['zsh','scripts/encode_shots.sh',name],cwd=ROOT,env=env,stdout=f,stderr=subprocess.STDOUT,check=True)
            state['done'].append(name);save()
            for film in ('GlobalFilm','LocalFilm'):
                if film in state['published'] or not {u['shot'] for u in uses(film)}<=set(state['done']):continue
                if digest(ROOT/f'src/v2/{film}.tsx')!=initial[film]:raise RuntimeError(f'{film} changed while rendering; preserve the user edit')
                check_edit(film)
                if film=='LocalFilm':
                    sound=ROOT/'scripts/sound_local.py'
                    if digest(sound)!=sound_digest:raise RuntimeError('Local sound script changed while rendering')
                    text=sound.read_text().replace('place(bus, g.chime(), 3300)', 'place(bus, g.chime(), 3306)').replace('review cut 3250 + clickAt 50','review cut 3250 + clickAt 56')
                    sound.write_text(text)
                    run(['uv','run','--with','numpy','--with','scipy','--with','soundfile','scripts/sound_local.py'],OUT/'sound-local.log')
                src=ROOT/f'src/v2/{film}.tsx';shutil.copy2(src,OUT/(film+'.before.tsx.txt'))
                tmp=src.with_suffix('.tsx.tmp');shutil.copyfile(ROOT/f'blender/v3/edit-templates/{film}.tsx.template',tmp);tmp.replace(src)
                run(['bun','run','lint'],OUT/'checks.log')
                state['published'].append(film);save()
                if not a.no_export:
                    state['phase']='exporting';save()
                    run(['zsh','scripts/export_films.sh',film],OUT/(film+'-export.log'))
                    state['phase']='rendering';save()
        run(['python3','-m','unittest','scripts/test_delivery.py'],OUT/'checks.log')
        state['phase']='complete';state['finished_at']=time.time();save()
    except Exception as e:
        state['phase']='failed';state['error']=str(e);save();raise

if __name__=='__main__':main()
