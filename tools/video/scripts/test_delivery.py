"""Release constraints for the video project (standard library only)."""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class DeliveryTests(unittest.TestCase):
    def test_encoding_rejects_incomplete_final_sequence_without_replacing_clip(self):
        import shutil
        import subprocess
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'scripts').mkdir()
            script = root / 'scripts/encode_shots.sh'
            shutil.copyfile(ROOT / 'scripts/encode_shots.sh', script)
            frames = root / 'assets/renders/v2/walk'
            frames.mkdir(parents=True)
            (frames / '0001.png').write_bytes(b'incomplete')
            clips = root / 'public/v2'
            clips.mkdir(parents=True)
            clip = clips / 'walk.mp4'
            clip.write_bytes(b'existing preview')
            result = subprocess.run(['zsh', str(script), 'walk'], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('incomplete', result.stderr.lower())
            self.assertEqual(clip.read_bytes(), b'existing preview')
            default = subprocess.run(['zsh', str(script)], capture_output=True, text=True)
            self.assertNotEqual(default.returncode, 0)
            self.assertIn('incomplete orbit', default.stderr.lower())

    def test_registered_compositions_do_not_use_rejected_higgsfield_media(self):
        todo = [ROOT / 'src/Root.tsx']
        seen = set()
        while todo:
            path = todo.pop()
            if path in seen:
                continue
            seen.add(path)
            source = path.read_text()
            self.assertNotRegex(source, r'plates/|clips/S02|R[1-5]_(?:EV1|EV2|IV|HAB|SITE)|F01_drill')
            for name in re.findall(r'from\s+["\'](\.[^"\']+)["\']', source):
                for suffix in ['.tsx', '.ts']:
                    child = path.parent / (name + suffix)
                    if child.exists():
                        todo.append(child.resolve())

    def test_screen_numbers_still_match_frozen_source_episode(self):
        import hashlib
        data = json.loads((ROOT / 'public/data/data.json').read_text())
        for key, info in data['sources'].items():
            self.assertEqual(hashlib.sha256((ROOT / 'fixtures' / (key + '.json')).read_bytes()).hexdigest(), info['sha256'])
        self.assertEqual(data['measurement']['result'], 'no_ice')
        self.assertEqual(len(data['replan']['stations_kept']), 5)
        self.assertEqual(data['next']['id'], 'E03S25')

    def test_generated_voice_takes_fit_without_time_compression(self):
        for kind in ['global', 'local']:
            path=ROOT/'assets/audio-guide'/f'{kind}-timing.json'
            if not path.exists():
                self.skipTest('Generate local voice assets before timing QA')
            for row in json.loads(path.read_text()):
                self.assertLessEqual(row['duration_frames'],row['window_frames'])
                self.assertEqual(row['tempo'],1.0)

    def test_no_unvalidated_transit_clock_is_shown_by_default(self):
        source=(ROOT/'src/ui/screens.tsx').read_text()
        self.assertIn('showClock = false',source)
        self.assertIn('minusMin = 0',source)


class GlobalFilmTests(unittest.TestCase):
    """The 3D film: every shot use fits its render, and sound events follow the cuts."""

    def film(self):
        return (ROOT / 'src/v2/GlobalFilm.tsx').read_text()

    def test_final_archive_inserts_have_motion_for_the_whole_cut(self):
        import subprocess
        source = (ROOT / 'blender/v3/edit-templates/LocalFilm.tsx.template').read_text()
        cuts = dict((key, int(end) - int(start)) for key, start, end in
                    re.findall(r'(\w+): \[(\d+), (\d+)\]', source.split('LOCAL_EDL')[1].split('};')[0]))
        for key, name, frames in re.findall(r'<S k="([^"]+)"><Archive src="([^"]+)" frames=\{(\d+)\}', source):
            self.assertGreaterEqual(int(frames), cuts[key], (key, 'archive freezes before the cut ends'))
            count = subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0',
                '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', str(ROOT / 'public' / name)], text=True)
            self.assertGreaterEqual(int(count.strip()), cuts[key], key)
        archive = (ROOT / 'src/v2/local.tsx').read_text().split('export const Archive:')[1].split('export const ToolsInsert:')[0]
        self.assertNotIn('<Freeze', archive)

    def test_no_frozen_people_or_reused_footage_in_either_film(self):
        for filename,variable in [('GlobalFilm.tsx','SHOT_USES'),('LocalFilm.tsx','LOCAL_SHOT_USES')]:
            source=(ROOT/'src/v2'/filename).read_text()
            self.assertNotRegex(source,r'<Shot\b[^>]*\bhold\b',filename)
            uses=json.loads(re.search(variable+r' = (\[.*?\]) as const',source,re.S).group(1))
            for i,a in enumerate(uses):
                for b in uses[i+1:]:
                    if a['shot']==b['shot']:
                        self.assertTrue(a['from']+a['frames']<=b['from'] or b['from']+b['frames']<=a['from'],(filename,a,b))

    def test_directed_voices_fit_the_final_subtitle_windows(self):
        import wave,math
        narration=json.loads((ROOT/'src/narration.json').read_text())
        for kind,limit in [('global',708),('local',4320)]:
            cues=narration[kind]
            for i,cue in enumerate(cues):
                audio=ROOT/'assets/directed-voice'/f'{kind}-{i:02d}.wav'
                self.assertTrue(audio.exists(),audio)
                with wave.open(str(audio)) as w:frames=math.ceil(w.getnframes()/w.getframerate()*24)
                self.assertLessEqual(abs(frames-cue['duration']),1,(kind,i))
                self.assertLessEqual(cue['from']+cue['duration'],cues[i+1]['from'] if i+1<len(cues) else limit)

    def test_every_shot_use_fits_inside_its_rendered_frames(self):
        import subprocess
        uses = json.loads(re.search(r'SHOT_USES = (\[.*?\]) as const', self.film(), re.S).group(1))
        renders = json.loads((ROOT/'src/v2/shot-manifest.json').read_text())
        for use in uses:
            self.assertLessEqual(use['from'] + use['frames'], renders[use['shot']], use)
            mp4 = ROOT / 'public/v2' / (use['shot'] + '.mp4')
            if mp4.exists():
                n = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries',
                                        'stream=nb_read_frames', '-of', 'csv=p=0', str(mp4)], capture_output=True, text=True).stdout.strip())
                self.assertGreaterEqual(n, use['from'] + use['frames'], use)

    def test_confirm_click_sound_lands_on_the_iv_click(self):
        film = self.film()
        review_start = int(re.search(r'review: \[(\d+), \d+\]', film).group(1))
        click = int(re.search(r'clickAt=\{(\d+)\}', film).group(1))
        chime = int(re.search(r'place\(bus, chime\(\), (\d+)\)', (ROOT / 'scripts/sound_global.py').read_text()).group(1))
        self.assertLessEqual(abs(review_start + click - chime), 1)

    def test_subtitles_come_from_the_voice_cues(self):
        self.assertIn('narration.global.map', self.film())
        self.assertIn('narration.local.map', (ROOT / 'src/v2/LocalFilm.tsx').read_text())

    def test_local_shot_uses_fit_and_click_is_in_sync(self):
        local = (ROOT / 'src/v2/LocalFilm.tsx').read_text()
        uses = json.loads(re.search(r'LOCAL_SHOT_USES = (\[.*?\]) as const', local, re.S).group(1))
        renders = json.loads((ROOT/'src/v2/shot-manifest.json').read_text())
        for use in uses:
            self.assertLessEqual(use['from'] + use['frames'], renders[use['shot']], use)
        review = int(re.search(r'review: \[(\d+), \d+\]', local).group(1))
        click = int(re.search(r'<S k="review"><ConsoleReview clickAt=\{(\d+)\}', local).group(1))
        chime = int(re.search(r'place\(bus, g.chime\(\), (\d+)\)', (ROOT / 'scripts/sound_local.py').read_text()).group(1))
        self.assertLessEqual(abs(review + click - chime), 1)
        # Every frame of the 180 s film is covered by exactly one cut.
        edl = sorted((int(a), int(b)) for a, b in re.findall(r'\[(\d+), (\d+)\]', local.split('LOCAL_EDL')[1].split('};')[0]))
        self.assertEqual(edl[0][0], 0)
        self.assertEqual(edl[-1][1], 4320)
        for (a0, b0), (a1, b1) in zip(edl, edl[1:]):
            self.assertEqual(b0, a1)


if __name__ == '__main__':
    unittest.main()
