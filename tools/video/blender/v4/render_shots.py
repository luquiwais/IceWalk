"""v4 realism pass over the v3 shots (same camera, rig, frames). Output: assets/renders/v4/<shot>/####.png

blender -b --python blender/v4/render_shots.py -- drill [--still 30] [--samples 56]
"""
import argparse,math,random,sys
from pathlib import Path
import bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'blender/v3'));sys.path.insert(0,str(ROOT/'blender/v2'))
import render_shots as r3,shots,mars,astronaut
_mw=astronaut.mocap_walk
def _mocap(rig,frames,clip='17_08',start=61,slow=1.15):
    # CMU BVH frame 1 is a T-pose; start inside the gait instead.
    return _mw(rig,frames,clip=clip,start=(start if start>1 else 6),slow=slow)
astronaut.mocap_walk=_mocap

def upgrade_terrain():
    for mat in bpy.data.materials:
        if not mat.use_nodes or not mat.name.startswith('Regolith'):continue
        n,l=mat.node_tree.nodes,mat.node_tree.links
        bs=n.get('Principled BSDF')
        if not bs:continue
        co=n.new('ShaderNodeTexCoord')
        # Large + medium colour variation: dark basaltic patches and pale dust.
        nz=n.new('ShaderNodeTexNoise');nz.inputs['Scale'].default_value=.18;nz.inputs['Detail'].default_value=5
        l.new(co.outputs['Object'],nz.inputs['Vector'])
        nz2=n.new('ShaderNodeTexNoise');nz2.inputs['Scale'].default_value=3.5;nz2.inputs['Detail'].default_value=7
        l.new(co.outputs['Object'],nz2.inputs['Vector'])
        a=n.new('ShaderNodeMapRange');a.inputs[1].default_value=.35;a.inputs[2].default_value=.65;a.inputs[3].default_value=.62;a.inputs[4].default_value=1.18
        l.new(nz.outputs['Fac'],a.inputs[0])
        b=n.new('ShaderNodeMapRange');b.inputs[1].default_value=.3;b.inputs[2].default_value=.7;b.inputs[3].default_value=.82;b.inputs[4].default_value=1.12
        l.new(nz2.outputs['Fac'],b.inputs[0])
        m1=n.new('ShaderNodeMath');m1.operation='MULTIPLY';l.new(a.outputs[0],m1.inputs[0]);l.new(b.outputs[0],m1.inputs[1])
        lk=[x for x in l if x.to_socket==bs.inputs['Base Color']]
        if lk:
            src=lk[0].from_socket
            mx=n.new('ShaderNodeMix');mx.data_type='RGBA';mx.blend_type='MULTIPLY';mx.inputs['Factor'].default_value=1
            l.new(src,mx.inputs[6]);l.new(m1.outputs[0],mx.inputs[7])
            # warm the pale-dust end, cool-dark the basalt end
            tn=n.new('ShaderNodeMix');tn.data_type='RGBA';tn.blend_type='MULTIPLY'
            tn.inputs['Factor'].default_value=.55;tn.inputs[7].default_value=(1.0,.80,.62,1)
            l.new(mx.outputs[2],tn.inputs[6])
            l.new(tn.outputs[2],bs.inputs['Base Color'])
        # Micro bump from voronoi grains on top of the displacement.
        vo=n.new('ShaderNodeTexVoronoi');vo.inputs['Scale'].default_value=140
        l.new(co.outputs['Object'],vo.inputs['Vector'])
        bp=n.new('ShaderNodeBump');bp.inputs['Strength'].default_value=.18;bp.inputs['Distance'].default_value=.01
        l.new(vo.outputs['Distance'],bp.inputs['Height'])
        l.new(bp.outputs['Normal'],bs.inputs['Normal'])

def world_volume(density=float(__import__('os').environ.get('VOLD','.0006'))):
    w=bpy.context.scene.world;n,l=w.node_tree.nodes,w.node_tree.links
    out=n['World Output']
    vs=n.new('ShaderNodeVolumeScatter');vs.inputs['Color'].default_value=(.95,.66,.38,1)
    vs.inputs['Density'].default_value=density;vs.inputs['Anisotropy'].default_value=.3
    l.new(vs.outputs[0],out.inputs['Volume'])

def lighting(sun_deg=.8):
    for ob in bpy.data.objects:
        if ob.type=='LIGHT' and ob.data.type=='SUN':ob.data.angle=math.radians(sun_deg)

def dust_motes(center,box,count,frames,seed=5):
    rnd=random.Random(seed)
    import bmesh
    bm=bmesh.new()
    for i in range(count):
        p=Vector((center[0]+rnd.uniform(-box[0],box[0]),center[1]+rnd.uniform(-box[1],box[1]),0))
        p.z=mars.ground(p.x,p.y)+rnd.uniform(.15,box[2])
        r=rnd.uniform(.003,.007)
        bmesh.ops.create_icosphere(bm,subdivisions=1,radius=r,matrix=__import__('mathutils').Matrix.Translation(p))
    me=bpy.data.meshes.new('Dust motes');bm.to_mesh(me);bm.free()
    ob=bpy.data.objects.new('Dust motes',me);bpy.context.scene.collection.objects.link(ob)
    m=bpy.data.materials.new('Dust mote');m.use_nodes=True
    b=m.node_tree.nodes['Principled BSDF'];b.inputs['Base Color'].default_value=(.55,.38,.25,1);b.inputs['Roughness'].default_value=1
    b.inputs['Alpha'].default_value=.3
    m.surface_render_method='BLENDED' if hasattr(m,'surface_render_method') else None
    me.materials.append(m)
    ob.visible_shadow=False
    ob.location=(0,0,0);ob.keyframe_insert('location',frame=1)
    ob.location=(.35,.12,.05);ob.keyframe_insert('location',frame=frames)

def focus(shot):
    cam=bpy.context.scene.camera;d=cam.data;d.dof.use_dof=True
    if shot.startswith('drill'):
        e=bpy.data.objects.new('Focus',None);bpy.context.scene.collection.objects.link(e)
        e.location=shots.G(-.15,.2,1.1);d.dof.focus_object=e;d.dof.aperture_fstop=4.0
    else:
        d.dof.aperture_fstop=4.0   # walk cam already focuses on its aim target

def main():
    argv=sys.argv[sys.argv.index('--')+1:]
    ap=argparse.ArgumentParser();ap.add_argument('shot');ap.add_argument('--still',type=int);ap.add_argument('--samples',type=int,default=56)
    ap.add_argument('--range',type=int,nargs=2);ap.add_argument('--blur',action='store_true');ap.add_argument('--volume',action='store_true');ap.add_argument('--first-only',action='store_true')
    args=ap.parse_args(argv);n=r3.MANIFEST[args.shot];r3.build(args.shot,n)
    sc=bpy.context.scene
    mars.render_settings(res=(1920,804),engine='BLENDER_EEVEE')
    sc.eevee.taa_render_samples=args.samples;sc.eevee.use_raytracing=True
    sc.render.use_motion_blur=args.blur;sc.render.motion_blur_shutter=.5
    for ob in bpy.data.objects:
        m=ob.modifiers.get('Adaptive')
        if m:m.render_levels=2
    sc.frame_start=1;sc.frame_end=n
    upgrade_terrain();lighting()
    if args.volume:
        world_volume()
        ev=sc.eevee
        print('EEVEE ATTRS',[a for a in dir(ev) if 'volum' in a])
        for a,v in (('volumetric_tile_size','4'),('volumetric_samples',48)):
            if hasattr(ev,a):
                try:setattr(ev,a,v if a=='volumetric_tile_size' else int(v))
                except Exception as e:print('vol',a,e)
    focus(args.shot)
    if args.shot=='drill':dust_motes((0,-1),(4,5,3),260,n)
    elif args.shot=='walk':dust_motes((0,-8),(5,9,3),320,n)
    else:dust_motes((0,-1),(3,4,2.5),200,n)
    folder=ROOT/'assets/renders/v4'/args.shot;folder.mkdir(parents=True,exist_ok=True)
    # Evaluate the animated pose first so frame 1 is never the bind/T pose.
    sc.frame_set(2);bpy.context.view_layer.update();sc.frame_set(1);bpy.context.view_layer.update()
    if args.still:
        sc.frame_set(args.still);sc.render.filepath=str(folder/f'check-{args.still:04d}.png');bpy.ops.render.render(write_still=True)
    else:
        if args.range:sc.frame_start,sc.frame_end=args.range
        sc.render.filepath=str(folder/'####');bpy.ops.render.render(animation=True)
if __name__=='__main__':main()
