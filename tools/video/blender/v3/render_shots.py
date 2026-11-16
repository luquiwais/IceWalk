"""Render distinct camera coverage with the authored astronaut and baked displays.

blender -b --python blender/v3/render_shots.py -- drill [--still 30]
Output remains separate from published clips until all frames are encoded.
"""
import argparse,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'blender/v2'))
import shots,mars,astronaut

MANIFEST=json.loads((ROOT/'src/v2/shot-manifest.json').read_text())
DRILL={'drill','drill_establish','grip','drill_tip','drill_result'}
WALK={'walk','approach','depart'}
POV={'pov','pov_start','pov_mid','pov_end'}

def camera(keys,lens=40,focus=5,fstop=8):
    cam=mars.camera('Coverage',keys[0][1],keys[0][2],lens=lens,fstop=fstop,focus=focus)
    for f,loc,aim in keys:
        cam.location=loc;cam.rotation_euler=(Vector(aim)-Vector(loc)).to_track_quat('-Z','Y').to_euler()
        cam.keyframe_insert('location',frame=f);cam.keyframe_insert('rotation_euler',frame=f)
    return cam

def build(name,n):
    shots.SCREENS.clear();shots.MARKS.clear()
    if name in DRILL:
        base=ROOT/'assets/scenes/drill-v3.blend'
        if base.exists():
            bpy.ops.wm.open_mainfile(filepath=str(base))
            mars.LV,mars.Z=mars.dtm();mars.Z0=float(mars.height_at(mars.LV,mars.Z,*mars.ORIGIN))
        else:shots.shot_drill(False)
        keys={
            'drill':[(1,shots.G(2.5,-4.1,1.05),shots.G(-.25,.35,.96)),(n,shots.G(1.95,-3.4,1.05),shots.G(-.2,.35,.96))],
            'drill_establish':[(1,shots.G(-4.9,-5.8,1.8),shots.G(-.5,.4,1.05)),(n,shots.G(-4.3,-5.3,1.65),shots.G(-.45,.4,1.05))],
            'grip':[(1,shots.G(.7,-1.1,1.45),shots.G(0,0,1.22)),(n,shots.G(.5,-1,1.4),shots.G(0,0,1.18))],
            'drill_tip':[(1,shots.G(.65,-.9,.25),shots.G(0,0,.22)),(n,shots.G(.49,-.75,.19),shots.G(0,0,.17))],
            'drill_result':[(1,shots.G(-.6,-1.3,.8),shots.G(0,0,.62)),(n,shots.G(-.45,-1.2,.72),shots.G(0,0,.57))],
        }[name]
        camera(keys,lens=42 if name in {'grip','drill_tip'} else 35,focus=1.2 if name in {'grip','drill_tip','drill_result'} else 4.5,fstop=8)
        if n>60:
            for actor_name in ('EV1','EV2'):
                rig=bpy.data.objects[actor_name+'_rig']
                meshes=[o for o in bpy.data.objects if o.type=='MESH' and o.parent==rig]
                astronaut.ground_motion(rig,meshes,n,mars.ground)
    elif name in WALK:
        shots.shot_walk(False)
        if name=='approach':
            camera([(1,shots.G(-4.2,-8.8,1.2),shots.G(-.5,-.8,1.05)),(n,shots.G(-4,-9.6,1.25),shots.G(-.5,-2.4,1.05))],lens=40,focus=8)
        elif name=='depart':
            camera([(1,shots.G(-5,4.5,1.45),shots.G(-.6,-1.5,1.1)),(n,shots.G(-4.5,3.5,1.5),shots.G(-.6,-3,1.1))],lens=40,focus=8)
    elif name in POV:
        shots.shot_pov(False)
        cam=bpy.context.scene.camera
        # Distinct helmet gaze and lens coverage. Keep the camera at the helmet:
        # translating it backward would put the wearer's own body in the view.
        if name!='pov':
            yaw={'pov_start':-.09,'pov_mid':.07,'pov_end':-.04}[name]
            for fc in shots._fcurves(cam):
                if fc.data_path=='rotation_euler' and fc.array_index==2:
                    for k in fc.keyframe_points:
                        for v in (k.co,k.handle_left,k.handle_right):v.y+=yaw
            cam.data.lens={'pov_start':20,'pov_mid':22,'pov_end':18}[name]
    elif name.startswith('console_'):
        shots.shot_console_review(False) if name in {'console_pending','console_review'} else shots.shot_console_wide(False)
        if name=='console_tools':
            for key in ('main','right','left'):
                root,w,h=shots.SCREENS[key]
                screen=bpy.data.objects[key+' glass']
                screen.data.materials.clear()
                screen.data.materials.append(shots.display_material(key,'Tools' if key=='main' else 'EvaWindow'))
            camera([(1,(-.95,.6,1.5),(0,-1.38,1.13)),(n,(-.7,.35,1.4),(.02,-1.38,1.13))],lens=33,focus=2)
        elif name=='console_reverse':
            gl=bpy.data.objects['main glass'];gl.data.materials.clear();gl.data.materials.append(shots.display_material('main','ConsoleMapBefore'))
            camera([(1,(1.2,.45,1.3),(.12,-1.3,1.08)),(n,(.95,.2,1.24),(.1,-1.3,1.08))],lens=30,focus=2)
        elif name=='console_pending':
            for key,plate in [('main','ConsoleMapBefore'),('right','Tools')]:
                gl=bpy.data.objects[key+' glass'];gl.data.materials.clear();gl.data.materials.append(shots.display_material(key,plate))
            bpy.data.objects['Cursor pixels'].hide_render=True
            camera([(1,(1,-.5,1.3),(.82,-1.24,1.08)),(n,(.9,-.56,1.25),(.82,-1.24,1.08))],lens=48,focus=.8)
        elif name=='console_replan':
            camera([(1,(-.45,-.18,1.22),(0,-1.38,1.13)),(n,(-.25,-.35,1.2),(0,-1.38,1.13))],lens=42,focus=1.2)
    elif name=='core_profile':
        shots.shot_section(False)
        # A separate, nearly frontal geological profile, continuously moving.
        camera([(1,(-.3,-9.1,-1.45),(0,.1,-1.45)),(n,(-.65,-9.3,-1.45),(0,.1,-1.45))],lens=35,focus=9)
    else:shots.SHOTS[name](False)

def main():
    argv=sys.argv[sys.argv.index('--')+1:]
    ap=argparse.ArgumentParser();ap.add_argument('shot',choices=list(MANIFEST));ap.add_argument('--still',type=int);ap.add_argument('--prepare-only',action='store_true')
    args=ap.parse_args(argv);n=MANIFEST[args.shot];build(args.shot,n)
    sc=bpy.context.scene
    mars.render_settings(res=(1920,804),engine='BLENDER_EEVEE')
    sc.eevee.taa_render_samples=96;sc.eevee.use_raytracing=True
    # EEVEE deformation vectors on the imported segmented skin produced double
    # silhouettes even during the idle cycle. Keep glove and silhouette crisp.
    sc.render.use_motion_blur=False
    # Close surface detail comes from meter-scaled scan textures and normals;
    # retain sufficient terrain tessellation without millions of hidden faces.
    for ob in bpy.data.objects:
        m=ob.modifiers.get('Adaptive')
        if m:m.render_levels=2
    folder=ROOT/'assets/renders/v3'/args.shot;folder.mkdir(parents=True,exist_ok=True)
    sc.frame_start=1;sc.frame_end=n
    if shots.MARKS:shots.export_screens(args.shot,n)
    bpy.ops.wm.save_as_mainfile(filepath=str(folder/(args.shot+'.blend')))
    if args.prepare_only:return
    if args.still:
        sc.frame_set(args.still);sc.render.filepath=str(folder/f'check-{args.still:04d}.png');bpy.ops.render.render(write_still=True)
    else:
        sc.render.filepath=str(folder/'####');bpy.ops.render.render(animation=True)

if __name__=='__main__':main()
