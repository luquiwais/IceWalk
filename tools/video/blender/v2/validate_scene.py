"""Blender integration checks for physical contact and visible drilling motion.
blender -b --python blender/v2/validate_scene.py
"""
import json,sys
from pathlib import Path
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
import shots,mars,astronaut
shots.shot_drill(False)
sc=bpy.context.scene
errors=[];feed=[];angles=[];observer=[]
for f in range(1,61):
    sc.frame_set(f);bpy.context.view_layer.update()
    dg=bpy.context.evaluated_depsgraph_get()
    rig=bpy.data.objects['EV1_rig'].evaluated_get(dg)
    for side in 'LR':
        hand=astronaut.bone(rig,side+'_Wrist')
        wrist_rest=rig.data.bones[hand.name]
        finger=rig.data.bones[astronaut.bone(rig,side+'_middle_1').name]
        local=(finger.head_local-wrist_rest.head_local)*.75
        palm=rig.matrix_world@hand.head+(rig.matrix_world@hand.matrix).to_3x3().normalized()@wrist_rest.matrix_local.to_3x3().inverted()@local*rig.matrix_world.to_scale().x+Vector((0,0,-.023))
        drill=bpy.data.objects['Core drill'].evaluated_get(dg)
        target=drill.matrix_world@Vector((.225 if side=='L' else -.225,0,1.5))
        errors.append((palm-target).length)
    other=bpy.data.objects['EV2_rig'].evaluated_get(dg)
    observer.append(tuple(other.matrix_world@astronaut.bone(other,'head').head))
    feed.append(bpy.data.objects['Core drill'].location.z)
    angles.append(bpy.data.objects['Core drill spindle'].rotation_euler.z)
assert max(errors)<.005, f'Palm drifts {max(errors):.4f} m'
assert max(feed)-min(feed)>.18,'No visible feed motion'
assert abs(angles[-1]-angles[0])>25,'No spindle rotation'
assert bpy.data.objects.get('Continuous auger helix'),'Missing asymmetric auger'
assert len(rig.pose.bones)>=91,'Missing authored rig joints'
assert max((Vector(p)-Vector(observer[0])).length for p in observer)>.005,'Observer is frozen'
sc.frame_set(30)
mars.render_settings(samples=48,res=(1920,804),pct=100)
sc.render.use_motion_blur=True;sc.render.motion_blur_shutter=.25
out=shots.ROOT/'assets/scenes/drill-v3.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(out))
report={'frames':60,'palm_max_error_m':max(errors),'feed_m':max(feed)-min(feed),'rotation_rad':angles[-1]-angles[0],'saved_scene':str(out)}
(shots.ROOT/'assets/scenes/drill-v3-checks.json').write_text(json.dumps(report,indent=2))
print('SCENE_CHECKS',json.dumps(report),flush=True)
