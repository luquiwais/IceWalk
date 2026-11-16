"""Photographic proof frames for IceWalk. No generated plates.

blender -b --python blender/cinematic.py -- console --preview
blender -b --python blender/cinematic.py -- drill --preview
blender -b --python blender/cinematic.py -- wide --preview

Outputs local public/cinema/<shot>.png and projected screen geometry.
Equipment and habitat interior are illustrative designs, not certified hardware.
"""
import argparse
import json
import math
import os
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/cinema'
DATA = json.loads((ROOT / 'public/data/data.json').read_text())


def material(name, color, rough=.5, metallic=0, micro=0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    bs = n.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metallic
    if micro:
        noise = n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 220
        coords=n.new('ShaderNodeTexCoord');l.new(coords.outputs['Object'],noise.inputs['Vector'])
        bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .16
        bump.inputs['Distance'].default_value = micro
        l.new(noise.outputs['Fac'], bump.inputs['Height']); l.new(bump.outputs['Normal'], bs.inputs['Normal'])
    return m


def box(name, at, size, mat, bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=at)
    ob=bpy.context.object;ob.name=name;ob.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=ob.modifiers.new('Machined edge','BEVEL');mod.width=bevel;mod.segments=3
        ob.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    ob.data.materials.append(mat)
    return ob


def tube(name, a, b, radius, mat, vertices=48):
    a,b=Vector(a),Vector(b);d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=d.length,location=(a+b)/2)
    ob=bpy.context.object;ob.name=name;ob.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    ob.data.materials.append(mat)
    bevel=ob.modifiers.new('Edge radius','BEVEL');bevel.width=min(radius*.13,.003);bevel.segments=3
    for f in ob.data.polygons:f.use_smooth=True
    return ob


def area(name, at, target, watts, color, size):
    light=bpy.data.lights.new(name,'AREA');light.energy=watts;light.color=color;light.shape='DISK';light.size=size
    ob=bpy.data.objects.new(name,light);bpy.context.collection.objects.link(ob)
    ob.location=at;ob.rotation_euler=(Vector(target)-Vector(at)).to_track_quat('-Z','Y').to_euler()
    return ob


def camera(at,target,lens=45,focus=None):
    sc=bpy.context.scene
    cam=bpy.data.cameras.new('CinemaCamera');ob=bpy.data.objects.new('CinemaCamera',cam);sc.collection.objects.link(ob);sc.camera=ob
    ob.location=at;ob.rotation_euler=(Vector(target)-Vector(at)).to_track_quat('-Z','Y').to_euler()
    cam.lens=lens;cam.sensor_width=36;cam.clip_end=30000
    if focus:
        cam.dof.use_dof=True;cam.dof.focus_distance=focus;cam.dof.aperture_fstop=5.6
    return ob


def settings(preview):
    sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=32 if preview else 96
    sc.cycles.use_denoising=True;sc.cycles.max_bounces=6;sc.cycles.transparent_max_bounces=4
    sc.cycles.device='CPU'
    sc.render.threads_mode='FIXED';sc.render.threads=8
    sc.render.resolution_x=1920;sc.render.resolution_y=1080;sc.render.resolution_percentage=50 if preview else 100
    sc.render.image_settings.file_format='PNG';sc.render.film_transparent=False
    sc.view_settings.view_transform='AgX';sc.view_settings.look='AgX - Medium High Contrast';sc.view_settings.exposure=0
    sc.render.fps=24
    # Old scene's mist compositor is disabled for the photographic light proof.
    if hasattr(sc,'compositing_node_group'):sc.compositing_node_group=None


def screen(name, center, width, image, panels, height=None):
    height=height or width*9/16
    dark=bpy.data.materials.get('Anodized magnesium')
    x,y,z=center
    box(name+' bezel',(x,y+.035,z),(width+.065,.065,height+.065),dark,.018)
    bpy.ops.mesh.primitive_plane_add(size=2,location=(x,y-.001,z),rotation=(math.pi/2,0,0))
    ob=bpy.context.object;ob.name=name;ob.scale=(width/2,height/2,1)
    m=bpy.data.materials.new(name+' display');m.use_nodes=True;n,l=m.node_tree.nodes,m.node_tree.links;n.clear()
    tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(image))
    e=n.new('ShaderNodeEmission');e.inputs['Strength'].default_value=.65
    out=n.new('ShaderNodeOutputMaterial');l.new(tex.outputs['Color'],e.inputs['Color']);l.new(e.outputs[0],out.inputs['Surface']);ob.data.materials.append(m)
    panels[name]=[(x-width/2,y-.003,z+height/2),(x+width/2,y-.003,z+height/2),(x+width/2,y-.003,z-height/2),(x-width/2,y-.003,z-height/2)]
    tube(name+' stem',(x,y+.065,.85),(x,y+.065,z-height/2),.025,dark)
    box(name+' foot',(x,y+.01,.855),(.40,.27,.018),dark,.008)


def console():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    dark=material('Anodized magnesium',(.026,.032,.034),.32,.72,.0004)
    rubber=material('Rubber',(.012,.014,.014),.75,0,.001)
    paint=material('Habitat wall',(.19,.205,.20),.8,0,.0005)
    floor=material('Floor',(.035,.04,.041),.7,.1,.001)
    metal=material('Brushed aluminum',(.32,.34,.33),.3,.9,.0002)
    box('Floor',(0,0,-.1),(7,8,.2),floor)
    box('Bulkhead',(0,1.2,1.65),(6,.15,3.3),paint)
    # Actual joins, ribs, bolts and cable trays, with physical scale in metres.
    for x in [-2.3,-1.15,0,1.15,2.3]:
        box('Structural rib',(x,1.06,1.7),(.065,.12,3.2),metal,.012)
    for z in [.45,2.65]:box('Service rail',(0,1.0,z),(6,.09,.07),dark)
    box('Desk',(0,-.1,.80),(3.45,1.05,.08),dark,.035)
    for x in [-1.48,1.48]:box('Desk leg',(x,.14,.39),(.07,.07,.78),dark)
    panels={}
    screen('main',(-.55,.14,1.43),1.58,ROOT/'out/ui/ConsoleMapBefore.png',panels)
    screen('review',(1.00,.23,1.38),1.04,ROOT/'out/ui/Review.png',panels)
    # Keyboard with individually bevelled keys; no fake spacecraft labels.
    box('Keyboard chassis',(-.45,-.35,.873),(.78,.24,.035),dark,.015)
    for row in range(5):
        for col in range(16):
            box('Key',(-.80+col*.047,-.445+row*.043,.902),(.040,.035,.017),rubber,.003)
    box('Trackball housing',(.22,-.36,.90),(.12,.16,.05),dark)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=.029,location=(.22,-.36,.937));bpy.context.object.data.materials.append(rubber)
    # Tablet and radio dock in the foreground create depth without artificial faces.
    tablet=box('Tablet housing',(1.05,-.43,.88),(.44,.28,.035),dark,.02)
    for x in [-1.4,-1.33,-1.26]:tube('Cable',(x,.30,.65),(x,.3,1.11),.009,rubber)
    area('Warm practical',(-2,-.2,2.6),(0,0,.8),130,(1.0,.54,.24),1.1)
    area('Monitor bounce',(-.5,-.1,1.65),(-.4,-1,.6),24,(.46,.64,1),.9)
    area('Cool window',(2.7,.5,2.1),(0,0,1),110,(.58,.72,.9),1.6)
    world=bpy.data.worlds.new('Interior ambient');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.15,.18,1);world.node_tree.nodes['Background'].inputs[1].default_value=.12;bpy.context.scene.world=world
    camera((1.20,-2.75,1.92),(-.05,.10,1.27),41)
    return panels


def surface(shot):
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blender/site.blend'))
    sc=bpy.context.scene
    # World normals, rather than Generated coordinates, make the horizon gradient work.
    nodes=sc.world.node_tree.nodes;links=sc.world.node_tree.links
    coord=next(n for n in nodes if n.bl_idname=='ShaderNodeTexCoord');sep=next(n for n in nodes if n.bl_idname=='ShaderNodeSeparateXYZ')
    links.new(coord.outputs['Normal'],sep.inputs[0])
    nodes.get('Background').inputs[1].default_value=.22
    sun=bpy.data.objects['Sun'];sun.data.energy=3.4
    sun.rotation_euler=(math.radians(82),0,math.radians(255))
    # Remove texture decals entirely from visible suits and habitat; keep normal detail.
    for name in ['EV1','EV2','Habitat']:
        root=bpy.data.objects.get(name)
        if not root:continue
        for ob in root.children_recursive:
            if ob.type!='MESH':continue
            for mat in ob.data.materials:
                if not mat or not mat.use_nodes:continue
                bs=next((n for n in mat.node_tree.nodes if n.bl_idname=='ShaderNodeBsdfPrincipled'),None)
                if not bs:continue
                for link in list(bs.inputs['Base Color'].links):mat.node_tree.links.remove(link)
                bs.inputs['Base Color'].default_value=(.36,.34,.29,1)
                bs.inputs['Roughness'].default_value=.68
    # Camera-facing terrain uses the source mesh; hide seam-prone overlapping displacement patch for wide shots.
    bpy.data.objects['GroundPatch'].hide_render=True
    bpy.data.objects['TerrainOverview'].hide_render=True
    terrain=bpy.data.objects['TerrainDetail']
    soil=material('Continuous DTM regolith',(.19,.105,.055),.94,0,.004)
    n,l=soil.node_tree.nodes,soil.node_tree.links
    coords=n.new('ShaderNodeTexCoord');mapping=n.new('ShaderNodeVectorMath');mapping.operation='SCALE';mapping.inputs[3].default_value=.45;l.new(coords.outputs['Object'],mapping.inputs[0])
    bs=n.get('Principled BSDF')
    for filename,target,space in [('diff.jpg','Base Color','sRGB'),('rough.jpg','Roughness','Non-Color')]:
        t=n.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(ROOT/'assets/polyhaven/red_laterite_soil_stones'/filename));t.image.colorspace_settings.name=space;t.projection='BOX';t.projection_blend=.2;l.new(mapping.outputs[0],t.inputs[0]);l.new(t.outputs['Color'],bs.inputs[target])
        if target=='Roughness':
            remap=n.new('ShaderNodeMapRange');remap.inputs[3].default_value=.86;remap.inputs[4].default_value=1.0;l.new(t.outputs['Color'],remap.inputs[0]);l.new(remap.outputs[0],bs.inputs['Roughness'])
    normal=n.new('ShaderNodeTexImage');normal.image=bpy.data.images.load(str(ROOT/'assets/polyhaven/red_laterite_soil_stones/disp.jpg'));normal.image.colorspace_settings.name='Non-Color';normal.projection='BOX';normal.projection_blend=.2;l.new(mapping.outputs[0],normal.inputs[0])
    bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.55;bump.inputs['Distance'].default_value=.018;l.new(normal.outputs['Color'],bump.inputs['Height']);l.new(bump.outputs[0],bs.inputs['Normal'])
    bs.inputs['Specular IOR Level'].default_value=.14
    terrain.data.materials.clear();terrain.data.materials.append(soil)
    # Sun-facing view; silhouettes are distant, never exposed as toy-like portraits.
    if shot in ['wide','walk','cast']:
        for name in ['EV1','EV2']:
            ob=bpy.data.objects[name];ob.location.x+=0
        cam=camera((37,-17,1.24),(0,-1,.9),50,focus=40)
        if shot in ['walk','cast']:
            import sys
            sys.path.insert(0,str(ROOT/'blender'))
            from rig_walk import bind_actor
            bind_actor('EV1',(-.7,.3,-.05));bind_actor('EV2',(.8,-2.6,.04),math.pi)
            cam.keyframe_insert('location',frame=1);cam.location.y-=1.2;cam.keyframe_insert('location',frame=72)
            cam.location=(8,-5,1.3);cam.rotation_euler=(Vector((0,-1,.95))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=45;cam.data.dof.focus_distance=9.5
            cam.animation_data_clear();cam.keyframe_insert('location',frame=1);cam.location.y-=1.2;cam.keyframe_insert('location',frame=72)
            bpy.context.scene.frame_set(13 if shot=='cast' else 1)
        return {}
    for name in ['EV1','EV2']:
        for ob in bpy.data.objects[name].children_recursive:ob.hide_render=True
    dark=material('Drill powder coat',(.16,.17,.17),.42,.5,.0005)
    alloy=material('Drill titanium',(.43,.42,.39),.31,.9,.0002)
    rubber=material('Drill grip',(.012,.016,.018),.75,0,.001)
    # A conceptual core-drilling assembly. No PGT falsely presented as a coring drill.
    tube('Core tube',(0,0,-.08),(0,0,.38),.026,alloy)
    for z in [.06,.14,.22,.30]:tube('Core collar',(0,0,z-.01),(0,0,z+.01),.032,alloy)
    tube('Chuck',(0,0,.36),(0,0,.45),.052,dark)
    tube('Motor housing',(0,0,.44),(0,0,.72),.087,dark)
    tube('Motor cap',(0,0,.69),(0,0,.735),.09,alloy)
    for z in [.49,.55,.61,.67]:
        tube('Housing ring',(0,0,z),(0,0,z+.007),.089,alloy)
    tube('Cross handle',(-.27,0,.62),(.27,0,.62),.018,alloy)
    tube('Left grip',(-.31,0,.62),(-.12,0,.62),.033,rubber)
    tube('Right grip',(.12,0,.62),(.31,0,.62),.033,rubber)
    box('Battery',(0,.12,.56),(.13,.12,.20),dark,.012)
    # Machined fasteners, battery contacts and vent grooves make the object read at physical scale.
    for x in [-.065,.065]:
        for z in [.49,.65]:
            tube('Hex fastener',(x,-.072,z),(x,-.081,z),.006,alloy,vertices=6)
    for i in range(7):box('Motor vent',(0,.083,.48+i*.021),(.075,.006,.006),rubber,.001)
    box('Power switch',(.048,-.065,.64),(.025,.02,.025),rubber,.004)
    area('Sky fill',(1,-2,2.7),(0,0,.4),45,(.70,.78,1),3)
    # Detailed source motor/tool model, with its original texture maps.
    # This is an illustrative adapter assembly, not an assertion that the PGT cores ice.
    for ob in list(bpy.context.scene.objects):
        if ob.name.startswith(('Motor housing','Motor cap','Housing ring','Cross handle','Left grip','Right grip','Battery','Hex fastener','Motor vent','Power switch')):ob.hide_render=True
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/nasa/3d/pistol-grip-tool.glb'))
    imported=[o for o in bpy.data.objects if o not in before]
    parent=bpy.data.objects.new('Illustrative drill drive from NASA source',None);sc.collection.objects.link(parent)
    for ob in imported:
        if ob.parent is None:ob.parent=parent
    parent.scale=(.028,.028,.028);parent.rotation_euler.x=math.pi/2
    bpy.context.view_layer.update()
    corners=[ob.matrix_world@Vector(v) for ob in imported if ob.type=='MESH' for v in ob.bound_box]
    low=Vector(tuple(min(v[k] for v in corners) for k in range(3)));high=Vector(tuple(max(v[k] for v in corners) for k in range(3)))
    parent.location=Vector((0,0,.58))-(low+high)/2
    for ob in imported:
        if ob.type=='MESH':
            for polygon in ob.data.polygons:polygon.use_smooth=True
            for mat in ob.data.materials:
                if mat and mat.use_nodes:
                    bs=mat.node_tree.nodes.get('Principled BSDF')
                    if bs:bs.inputs['Roughness'].default_value=.42
    # Loose regolith ring from the boring, deterministic positions.
    import random
    random.seed(11)
    soil=material('Disturbed regolith',(.115,.065,.035),.95,0,.002)
    for i in range(90):
        ang=random.uniform(0,math.tau);r=random.uniform(.04,.17)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=random.uniform(.003,.014),location=(r*math.cos(ang),r*math.sin(ang),.003))
        ob=bpy.context.object;ob.scale.z=.4;ob.data.materials.append(soil)
    if shot=='drill':camera((1.5,-1.8,1.05),(0,0,.32),45,focus=2.45)
    else:camera((.68,-.95,1.05),(0,0,.04),58,focus=1.22)
    return {}


def main():
    import sys
    argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    parser=argparse.ArgumentParser();parser.add_argument('shot',choices=['console','wide','drill','hole','walk','cast']);parser.add_argument('--preview',action='store_true');parser.add_argument('--motion',action='store_true')
    args=parser.parse_args(argv)
    OUT.mkdir(exist_ok=True)
    panels=console() if args.shot=='console' else surface(args.shot)
    settings(args.preview)
    sc=bpy.context.scene
    if args.shot!='console':sc.view_settings.exposure=.45
    bpy.context.view_layer.update()
    projected={}
    for name,corners in panels.items():
        pts=[world_to_camera_view(sc,sc.camera,Vector(v)) for v in corners]
        projected[name]=[[round(v.x*1920,3),round((1-v.y)*1080,3)] for v in pts]
    if projected:
        (OUT/'console-screens.json').write_text(json.dumps(projected,indent=2)+'\n')
        (ROOT/'src/scene-geometry.json').write_text(json.dumps(projected,indent=2)+'\n')
    sc.render.filepath=str(OUT/(args.shot+('-proof' if args.preview else '')+'.png'))
    if args.motion:
        cam=sc.camera
        cam.keyframe_insert('location',frame=1)
        cam.location.x-=.08;cam.location.y+=.12;cam.keyframe_insert('location',frame=72)
        if args.shot=='drill':
            shaft=bpy.data.objects['Core tube'];shaft.rotation_mode='XYZ'
            for frame,angle in [(1,0),(36,math.tau*8),(44,math.tau*8+.3),(72,math.tau*8+.3)]:
                shaft.rotation_euler.z=angle;shaft.keyframe_insert('rotation_euler',frame=frame)
        if panels:
            projected_frames=[]
            for frame in range(1,73):
                sc.frame_set(frame);bpy.context.view_layer.update()
                projected_frames.append({name:[[round(v.x*1920,3),round((1-v.y)*1080,3)] for v in [world_to_camera_view(sc,sc.camera,Vector(c)) for c in corners]] for name,corners in panels.items()})
            (ROOT/'src/scene-motion.json').write_text(json.dumps(projected_frames)+'\n')
        sc.frame_set(1)
    if args.shot=='walk' or args.motion:
        sc.render.engine='BLENDER_EEVEE';sc.eevee.taa_render_samples=32
        sc.frame_start=1;sc.frame_end=72
        folder=ROOT/'assets/renders'/('walk-rig' if args.shot=='walk' else args.shot+'-motion');folder.mkdir(exist_ok=True,parents=True)
        sc.render.filepath=str(folder/'####')
        bpy.ops.render.render(animation=True)
    else:bpy.ops.render.render(write_still=True)


if __name__=='__main__':main()
