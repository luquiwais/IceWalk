"""LasquetiSpice rigged astronaut, CC BY 4.0; preserve authored skin and animation.
Source and license: assets/third-party/lasqueti-astronaut/{source.json,license.txt}.
"""
from pathlib import Path
import math
import bpy
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parents[2]
ASSET=ROOT/'assets/third-party/lasqueti-astronaut/scene.gltf'

def curves(action):
    return [fc for layer in action.layers for strip in layer.strips for bag in strip.channelbags for fc in bag.fcurves]

def load(name,clip='idle',height=1.85,speed=.85):
    objects=set(bpy.data.objects);actions=set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=str(ASSET),bone_heuristic='TEMPERANCE')
    created=[o for o in bpy.data.objects if o not in objects]
    rig=next(o for o in created if o.type=='ARMATURE')
    meshes=[o for o in created if o.type=='MESH' and o.parent==rig]
    for o in created:
        if o.type=='MESH' and o not in meshes:bpy.data.objects.remove(o,do_unlink=True)
    authored=[a for a in bpy.data.actions if a not in actions]
    selected=next(a for a in authored if a.name.split('.')[0]==clip)
    rig.animation_data.use_nla=False;rig.animation_data.action=selected
    if selected.slots:rig.animation_data.action_slot=selected.slots[0]
    for fc in curves(selected):
        for k in fc.keyframe_points:
            k.co.x=k.co.x/speed+1
            k.handle_left.x=k.handle_left.x/speed+1
            k.handle_right.x=k.handle_right.x/speed+1
        fc.modifiers.new('CYCLES')
    wrapper=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(wrapper)
    for ob in created:
        if ob.name not in bpy.data.objects:continue
        if ob.parent is None:ob.parent=wrapper
    bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
    dg=bpy.context.evaluated_depsgraph_get()
    pts=[o.evaluated_get(dg).matrix_world@v.co for o in meshes for v in o.evaluated_get(dg).data.vertices]
    lo=min(p.z for p in pts);hi=max(p.z for p in pts)
    scale=height/(hi-lo);wrapper.scale=(scale,scale,scale)
    wrapper.location.z=-lo*scale
    rig.name=name+'_rig'
    for i,m in enumerate(meshes):m.name=f'{name}_mesh_{i}'
    bpy.context.view_layer.update()
    materials(meshes)
    return wrapper,rig,meshes

def bone(rig,prefix):
    return next(b for b in rig.pose.bones if b.name.startswith(prefix+'.') or b.name==prefix)

def bounds(meshes):
    dg=bpy.context.evaluated_depsgraph_get()
    pts=[o.evaluated_get(dg).matrix_world@v.co for o in meshes for v in o.evaluated_get(dg).data.vertices]
    return [(min(p[i] for p in pts),max(p[i] for p in pts)) for i in range(3)]

def materials(meshes):
    """Convert the imported F0 approximation into physical EVA surface classes.

    Blender imports specular/glossiness with IOR=1000. That approximates colored
    F0 but gives woven cloth the grazing reflections of a conductor. Preserve
    the authored color, baked roughness and normal maps, and use dielectric IOR.
    """
    for mat in {m for ob in meshes for m in ob.data.materials}:
        if mat.get('icewalk_physical'):continue
        mat['icewalk_physical']=True
        n,l=mat.node_tree.nodes,mat.node_tree.links;bs=n.get('Principled BSDF')
        for link in list(bs.inputs['Specular Tint'].links):l.remove(link)
        bs.inputs['Specular Tint'].default_value=(1,1,1,1)
        bs.inputs['IOR'].default_value=1.46
        bs.inputs['Specular IOR Level'].default_value=.5
        cloth=mat.name.startswith('material_2')
        if bs.inputs['Roughness'].is_linked:
            original=bs.inputs['Roughness'].links[0].from_socket
            remap=n.new('ShaderNodeMapRange');remap.label='Physical textile / shell roughness'
            remap.inputs['To Min'].default_value=.55 if cloth else .3
            remap.inputs['To Max'].default_value=.9 if cloth else .72
            l.new(original,remap.inputs['Value']);l.new(remap.outputs['Result'],bs.inputs['Roughness'])
        if cloth:
            bs.inputs['Sheen Weight'].default_value=.15
            bs.inputs['Sheen Roughness'].default_value=.8
            normal=bs.inputs['Normal'].links[0].from_socket if bs.inputs['Normal'].is_linked else None
            co=n.new('ShaderNodeTexCoord');noise=n.new('ShaderNodeTexNoise')
            noise.inputs['Scale'].default_value=750;noise.inputs['Detail'].default_value=2
            l.new(co.outputs['Generated'],noise.inputs['Vector'])
            bump=n.new('ShaderNodeBump');bump.inputs['Distance'].default_value=.00018;bump.inputs['Strength'].default_value=.18
            l.new(noise.outputs['Fac'],bump.inputs['Height'])
            if normal:l.new(normal,bump.inputs['Normal'])
            l.new(bump.outputs['Normal'],bs.inputs['Normal'])
    visor=bpy.data.materials.get('EVA gold visor')
    if not visor:
        visor=bpy.data.materials.new('EVA gold visor');visor.use_nodes=True
        bs=visor.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value=(.44,.30,.13,1)
        bs.inputs['Metallic'].default_value=1;bs.inputs['Roughness'].default_value=.12
        bs.inputs['Coat Weight'].default_value=.5;bs.inputs['Coat Roughness'].default_value=.08
    # Use the authored visor mask per texel, not one sampled color per triangle:
    # polygon selection at the glass edge produces a visible jagged reflection.
    for ob in meshes:
        mat=ob.data.materials[0];bs=mat.node_tree.nodes.get('Principled BSDF')
        if not bs.inputs['Base Color'].is_linked:continue
        head=mat.copy();head.name=mat.name+' helmet surfaces'
        n,l=head.node_tree.nodes,head.node_tree.links;body=n.get('Principled BSDF')
        diffuse=body.inputs['Base Color'].links[0].from_socket
        mask=n.new('ShaderNodeValToRGB')
        mask.color_ramp.elements[0].position=.012;mask.color_ramp.elements[0].color=(1,1,1,1)
        mask.color_ramp.elements[1].position=.035;mask.color_ramp.elements[1].color=(0,0,0,1)
        l.new(diffuse,mask.inputs['Fac'])
        gold=n.new('ShaderNodeBsdfPrincipled')
        for key in ('Base Color','Metallic','Roughness','Coat Weight','Coat Roughness'):
            gold.inputs[key].default_value=visor.node_tree.nodes['Principled BSDF'].inputs[key].default_value
        mix=n.new('ShaderNodeMixShader');l.new(mask.outputs['Color'],mix.inputs[0]);l.new(body.outputs['BSDF'],mix.inputs[1]);l.new(gold.outputs['BSDF'],mix.inputs[2])
        l.new(mix.outputs[0],n.get('Material Output').inputs['Surface'])
        slot=len(ob.data.materials);ob.data.materials.append(head)
        for p in ob.data.polygons:
            centre=sum((ob.matrix_world@ob.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices)
            if centre.z>1.73:p.material_index=slot

def hold_handle(rig, side, contact, parent=None):
    """Two-bone arm IK with an independently oriented, articulated glove.

    Solve to a wrist offset from the physical grip, rather than putting the
    wrist joint in the middle of the handle. Keep the imported twist segments.
    """
    wrist=bone(rig,side+'_Wrist')
    names=[side+'_'+f+'_'+str(i) for f in ('thumb','index','middle','ring','pinky') for i in (1,2,3)]
    controlled=[wrist.name]+[bone(rig,n).name for n in names]
    action=rig.animation_data.action
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for fc in list(bag.fcurves):
                    if any('"'+n+'"' in fc.data_path for n in controlled):bag.fcurves.remove(fc)
    # Hand frame: across the knuckles and toward the middle finger.
    rest=rig.data.bones
    w=rest[wrist.name]
    mid=rest[bone(rig,side+'_middle_1').name].head_local
    idx=rest[bone(rig,side+'_index_1').name].head_local
    pink=rest[bone(rig,side+'_pinky_1').name].head_local
    x=(pink-idx).normalized();y=(mid-w.head_local).normalized()
    z=x.cross(y).normalized();x=y.cross(z).normalized()
    source=Matrix((x,y,z)).transposed()
    dx=Vector((1 if side=='L' else -1,0,0))
    dy=Vector((0,-1,-.15)).normalized();dz=dx.cross(dy).normalized()
    desired=Matrix((dx,dy,dz)).transposed()
    rotation=desired@source.transposed()
    scale=rig.matrix_world.to_scale().x
    palm_local=w.head_local.lerp(mid,.75)-w.head_local
    # Handle passes through the inside of the glove, under the palm surface.
    palm_offset=rotation@palm_local*scale + Vector((0,0,-.023))
    target=bpy.data.objects.new(rig.name+' wrist target '+side,None)
    bpy.context.scene.collection.objects.link(target);target.parent=parent
    target.location=Vector(contact)-palm_offset
    target.rotation_mode='QUATERNION'
    target.rotation_quaternion=(rotation@w.matrix_local.to_3x3()).to_quaternion()
    ik=bone(rig,side+'_Elbow').constraints.new('IK')
    ik.target=target;ik.chain_count=2;ik.use_stretch=False;ik.iterations=128
    orientation=wrist.constraints.new('COPY_ROTATION')
    orientation.target=target;orientation.target_space='WORLD';orientation.owner_space='WORLD'
    # Fingers wrap over the 48 mm EVA grip. The source already has relaxed curl;
    # setting a local flexion makes the contact pose independent of the idle loop.
    for finger in ('index','middle','ring','pinky'):
        for i,angle in ((1,-.32),(2,-.85),(3,-.65)):
            b=bone(rig,side+'_'+finger+'_'+str(i));b.rotation_mode='XYZ';b.rotation_euler=(angle,0,0)
    for i,angle in ((1,-.3),(2,-.65),(3,-.65)):
        b=bone(rig,side+'_thumb_'+str(i));b.rotation_mode='XYZ';b.rotation_euler=(angle,0,0)
    return target,palm_offset

def mocap_walk(rig, frames, clip='17_08', start=61, slow=1.15):
    """Retarget terrestrial walking onto the authored skin, without a new auto-rig.

    The bundled lunar loop has a long airborne phase. CMU locomotion supplies
    continuous weight transfer while this model retains its original deformation
    joints, finger skinning and suit accessories.
    """
    import actor
    src=actor.import_bvh(clip);sc=bpy.context.scene;sb=src.data.bones;tb=rig.data.bones
    mapping={'Center':('Hips','Spine'),'Spine_1':('LowerBack','Spine'),
             'Spine_2':('Spine','Neck'),'Spine_3':('Spine','Neck'),
             'neck':('Neck','Neck1'),'head':('Head',None)}
    for side,word in [('L','Left'),('R','Right')]:
        for t,s,aim in [('Clevicle','Shoulder','Arm'),('Arm','Arm','ForeArm'),('Elbow','ForeArm','Hand'),
                        ('Wrist','Hand','HandIndex1'),('Thigh','UpLeg','Leg'),('Knee','Leg','Foot'),
                        ('Ankle','Foot','ToeBase'),('Toe','ToeBase',None)]:
            mapping[side+'_'+t]=(word+s,word+aim if aim else None)
    mapping={bone(rig,n).name:v for n,v in mapping.items()}
    sc.frame_set(start)
    delta=(src.matrix_world@src.pose.bones['Hips'].matrix).to_3x3().normalized()@(src.matrix_world@sb['Hips'].matrix_local).to_3x3().normalized().inverted()
    fwd=delta@Vector((0,-1,0));H=Matrix.Rotation(-math.atan2(fwd.x,-fwd.y),3,'Z')
    align={};srest={}
    for t,(s,aim) in mapping.items():
        srest[t]=(src.matrix_world@sb[s].matrix_local).to_3x3().normalized()
        sd=src.matrix_world.to_3x3()@((sb[aim].head_local-sb[s].head_local) if aim else sb[s].tail_local-sb[s].head_local)
        td=tb[t].tail_local-tb[t].head_local
        align[t]=H@td.normalized().rotation_difference(sd.normalized()).to_matrix()
    lows=[]
    for i in range(frames):
        sf=start+i*5/slow;sc.frame_set(int(sf),subframe=sf%1)
        lows.extend((src.matrix_world@src.pose.bones[n].head).z for n in ('LeftToeBase','RightToeBase'))
    floor=min(lows);sc.frame_set(start)
    p0=H@(src.matrix_world@src.pose.bones['Hips'].head)
    centre=bone(rig,'Center').name
    k=(tb[centre].head_local.z-tb[bone(rig,'L_Toe').name].tail_local.z)/(sb['Hips'].head_local.z-sb['LeftToeBase'].head_local.z)
    rig.animation_data.action=bpy.data.actions.new(rig.name+' CMU '+clip)
    # Parent-first traversal includes non-deforming glTF roots and twist chains.
    ordered=[]
    def visit(b):
        ordered.append(b)
        for child in b.children:visit(child)
    for b in tb:
        if not b.parent:visit(b)
    for i in range(frames):
        sf=start+i*5/slow;sc.frame_set(int(sf),subframe=sf%1);pose={}
        for b in ordered:
            rest=b.matrix_local
            inherited=pose[b.parent.name]@tb[b.parent.name].matrix_local.inverted()@rest if b.parent else rest.copy()
            if b.name in mapping:
                s,_=mapping[b.name]
                sw=(src.matrix_world@src.pose.bones[s].matrix).to_3x3().normalized()
                rotation=(H@(sw@srest[b.name].inverted())@H.inverted())@align[b.name]@rest.to_3x3()
                head=inherited.translation
                if b.name==centre:
                    p=H@(src.matrix_world@src.pose.bones['Hips'].head)
                    head=Vector((rest.translation.x+(p.x-p0.x)*k,rest.translation.y+(p.y-p0.y)*k,(p.z-floor)*k))
                pose[b.name]=Matrix.Translation(head)@rotation.to_4x4()
            else:pose[b.name]=inherited
            basis=(tb[b.parent.name].matrix_local.inverted()@rest).inverted()@pose[b.parent.name].inverted()@pose[b.name] if b.parent else rest.inverted()@pose[b.name]
            pb=rig.pose.bones[b.name];pb.matrix_basis=basis;pb.rotation_mode='QUATERNION'
            pb.keyframe_insert('rotation_quaternion',frame=i+1)
            if b.name==centre:pb.keyframe_insert('location',frame=i+1)
    sc.frame_set(1);bpy.context.view_layer.update()
    return src

def ground_motion(rig, meshes, frames, ground=lambda x,y:0):
    """Correct retargeted boot clearance against the actual surface every frame."""
    import numpy as np
    sc=bpy.context.scene;centre=bone(rig,'Center')
    for f in range(1,frames+1):
        sc.frame_set(f);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
        lowest=None
        for ob in meshes:
            ev=ob.evaluated_get(dg)
            a=np.empty(len(ev.data.vertices)*3,dtype=np.float32);ev.data.vertices.foreach_get('co',a);a=a.reshape(-1,3)
            mw=np.array(ev.matrix_world);world=a@mw[:3,:3].T+mw[:3,3]
            p=world[world[:,2].argmin()]
            if lowest is None or p[2]<lowest[2]:lowest=p
        dz=ground(float(lowest[0]),float(lowest[1]))-float(lowest[2])+.002
        m=centre.matrix.copy();m.translation.z+=dz/rig.matrix_world.to_scale().z;centre.matrix=m
        centre.keyframe_insert('location',frame=f)
    sc.frame_set(1)
