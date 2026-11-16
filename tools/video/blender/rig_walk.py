"""Bind the textured NASA Z2 mesh to a deforming humanoid skeleton and animate a walk.

This is a rig/locomotion proof; not a finished actor performance.
Executed from cinematic.py after loading and shading the source terrain.
"""
import math
import bpy
from mathutils import Vector


def bind_actor(root_name, location, phase=0):
    root=bpy.data.objects[root_name]
    root.location=(0,0,0);root.rotation_euler=(0,0,0)
    meshes=[o for o in root.children_recursive if o.type=='MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:o.hide_set(False);o.hide_render=False;o.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0]
    bpy.ops.object.join();mesh=bpy.context.object
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    # Keep full original diffuse and normal textures. Silhouette lighting, no visible close-up decals.
    for mat in mesh.data.materials:
        if not mat or not mat.use_nodes:continue
        n,l=mat.node_tree.nodes,mat.node_tree.links;bs=n.get('Principled BSDF')
        color=next((t for t in n if t.bl_idname=='ShaderNodeTexImage' and t.image and 'Color' in t.image.name),None)
        if bs and color:l.new(color.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=.82
    # Apply parent scale/coordinate system to get anatomy in metres at the origin.
    world=mesh.matrix_world.copy();mesh.parent=None;mesh.matrix_world=world
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    box=[mesh.matrix_world@Vector(v) for v in mesh.bound_box]
    zmin=min(v.z for v in box);cx=(min(v.x for v in box)+max(v.x for v in box))/2;cy=(min(v.y for v in box)+max(v.y for v in box))/2
    for v in mesh.data.vertices:v.co-=Vector((cx,cy,zmin))
    bpy.ops.object.armature_add(enter_editmode=True,location=(0,0,0))
    rig=bpy.context.object;rig.name=root_name+'_Skeleton';bones=rig.data.edit_bones
    bones.remove(bones[0])
    specs=[('pelvis',(0,0,.85),(0,0,1.03),None),('spine',(0,0,1.03),(0,0,1.42),'pelvis'),('head',(0,0,1.42),(0,0,1.88),'spine')]
    for side,sign in [('L',1),('R',-1)]:
        specs += [(f'thigh.{side}',(.12*sign,0,.91),(.12*sign,0,.51),'pelvis'),(f'shin.{side}',(.12*sign,0,.51),(.12*sign,0,.12),f'thigh.{side}'),(f'foot.{side}',(.12*sign,0,.12),(.12*sign,-.20,.08),f'shin.{side}'),(f'upper_arm.{side}',(.22*sign,0,1.4),(.29*sign,-.25,1.16),'spine'),(f'forearm.{side}',(.29*sign,-.25,1.16),(.28*sign,-.50,1.0),f'upper_arm.{side}')]
    for name,a,b,parent in specs:
        bone=bones.new(name);bone.head=a;bone.tail=b
        if parent:bone.parent=bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    # Explicit smooth anatomical weights: the scanned suit has disconnected hard parts,
    # for which Blender's heat-weight solver fails. Every vertex receives normalized weights.
    mesh.parent=rig
    mod=mesh.modifiers.new('Humanoid skin','ARMATURE');mod.object=rig
    mesh.vertex_groups.clear()
    groups={name:mesh.vertex_groups.new(name=name) for name,_,_,_ in specs}
    for v in mesh.data.vertices:
        x,y,z=v.co;side='L' if x>=0 else 'R'
        if z>1.48:weights={'head':1.0}
        elif z<.92:
            if z<.16:weights={f'foot.{side}':1.0}
            elif z<.42:weights={f'shin.{side}':1.0}
            elif z<.62:
                t=(z-.42)/.20;weights={f'shin.{side}':1-t,f'thigh.{side}':t}
            else:weights={f'thigh.{side}':1.0}
        elif (abs(x)>.24 or (abs(x)>.15 and y<-.18)) and y<.18:
            t=max(0,min(1,(z-1.04)/.22));weights={f'forearm.{side}':1-t,f'upper_arm.{side}':t}
        else:weights={'spine':1.0}
        for name,weight in weights.items():
            if weight>0:groups[name].add([v.index],weight,'REPLACE')
    assert all(sum(g.weight for g in v.groups)>.999 for v in mesh.data.vertices)
    rig.location=location
    for f in range(1,75,3):
        t=(f-1)/24;angle=t*math.tau*.9+phase
        for side,offset in [('L',0),('R',math.pi)]:
            swing=math.sin(angle+offset)
            for name,theta in [(f'thigh.{side}',.24*swing),(f'shin.{side}',-.30*max(0,-swing)),(f'foot.{side}',-.08*swing),(f'upper_arm.{side}',.65-.12*swing),(f'forearm.{side}',-.08)]:
                b=rig.pose.bones[name];b.rotation_mode='XYZ';b.rotation_euler.x=theta;b.keyframe_insert('rotation_euler',frame=f)
        rig.location=(location[0],location[1]-.4*t,location[2]+.009*(1-math.cos(2*angle)))
        bpy.context.scene.frame_set(f);bpy.context.view_layer.update()
        evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
        lowest=min(v.co.z for v in evaluated.data.vertices)
        rig.location.z=location[2]-lowest
        rig.keyframe_insert('location',frame=f)
    # Confirm deformation, excluding the root's translation through the scene.
    scene=bpy.context.scene
    scene.frame_set(1);bpy.context.view_layer.update()
    evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());first=[v.co.copy() for v in evaluated.data.vertices]
    scene.frame_set(13);bpy.context.view_layer.update()
    evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
    delta=max((v.co-first[i]).length for i,v in enumerate(evaluated.data.vertices))
    assert delta>.01, 'Skeleton is not deforming the suit mesh'
    print('RIG_VALIDATED',root_name,'bones',len(rig.pose.bones),'max_local_deformation_m',round(delta,4))
    scene.frame_set(1)
    mesh.name=root_name+'_SkinnedMesh'
    assert any(m.type=='ARMATURE' for m in mesh.modifiers)
    assert len(mesh.vertex_groups)>=len(specs)
    return rig
