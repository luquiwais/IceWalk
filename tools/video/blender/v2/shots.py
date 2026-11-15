"""IceWalk Global film: 3D shots. Usage:
blender -b --python blender/v2/shots.py -- <shot> [--preview] [--still N] [--frames A:B]
Frames go to assets/renders/v2/<shot>/####.png at 1920x804 (2.39:1).
"""
import argparse
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import actor  # noqa: E402
import mars  # noqa: E402
import props  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'v3'))
import astronaut  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/renders/v2'
RES = (1920, 804)


def rig_camera(name, keys, lens=35, fstop=2.8, focus_obj=None, shake=0.0, sensor=36):
    """keys: list of (frame, location, target). Track-to target empty; optional handheld noise."""
    cam = mars.camera(name, keys[0][1], keys[0][2], lens=lens, fstop=fstop, focus=3, sensor=sensor)
    tgt = actor.empty(name + ' aim', keys[0][2])
    for f, loc, aim in keys:
        cam.location = loc
        cam.keyframe_insert('location', frame=f)
        tgt.location = aim
        tgt.keyframe_insert('location', frame=f)
    c = cam.constraints.new('TRACK_TO')
    c.target = tgt
    c.track_axis = 'TRACK_NEGATIVE_Z'
    c.up_axis = 'UP_Y'
    cam.data.dof.focus_object = focus_obj or tgt
    for fc in _fcurves(cam):
        for k in fc.keyframe_points:
            k.interpolation = 'BEZIER'
            k.easing = 'EASE_IN_OUT'
    if shake:
        cam.rotation_mode = 'XYZ'
        cam.delta_rotation_euler = (0, 0, 0)
        for i in range(3):
            cam.keyframe_insert('delta_rotation_euler', index=i, frame=1)
        for fc in _fcurves(cam):
            if fc.data_path == 'delta_rotation_euler':
                m = fc.modifiers.new('NOISE')
                m.scale = 22
                m.strength = shake * (1 if fc.array_index != 1 else .4)
                m.phase = fc.array_index * 13.7
    return cam, tgt


def _fcurves(ob):
    ad = ob.animation_data
    if not ad or not ad.action:
        return []
    act = ad.action
    if hasattr(act, 'fcurves') and len(getattr(act, 'fcurves', [])):
        return list(act.fcurves)
    out = []
    for layer in act.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                out += list(cb.fcurves)
    return out


def G(x, y, h):
    """Point h metres above the terrain at (x, y)."""
    return (x, y, mars.ground(x, y) + h)


def place(rig, x, y, tx, ty):
    """Stand a rig at (x, y) on the terrain, facing (tx, ty)."""
    rig.location = (x, y, mars.ground(x, y))
    rig.rotation_euler.z = math.atan2(tx - x, -(ty - y)) if (tx, ty) != (x, y) else 0
    return rig


def regolith_grain_mat():
    return props.pbr('Regolith grain', (.30, .16, .08), .9)


def dust_particles(name, loc, count, start, end, speed=.8, size=.004, spread=.12):
    bpy.ops.mesh.primitive_circle_add(vertices=24, radius=spread, fill_type='NGON', location=loc)
    em = bpy.context.object
    em.name = name
    em.hide_render = False
    ps = em.modifiers.new(name, 'PARTICLE_SYSTEM').particle_system
    st = ps.settings
    st.count = count
    st.frame_start = start
    st.frame_end = end
    st.lifetime = 40
    st.lifetime_random = .6
    st.normal_factor = speed
    st.factor_random = speed * .9
    st.particle_size = size
    st.size_random = .8
    st.render_type = 'OBJECT'
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=(0, 0, -50))
    grain = bpy.context.object
    grain.name = name + ' grain'
    grain.data.materials.append(regolith_grain_mat())
    st.instance_object = grain
    st.use_rotations = True
    st.rotation_factor_random = 1
    em.show_instancer_for_render = False
    st.effector_weights.gravity = 1.0
    return em


def dust_volume(name, loc, size, density=.25, frames=(1, 60)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.object
    ob.name = name
    ob.scale = size
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    n.remove(n['Principled BSDF'])
    vol = n.new('ShaderNodeVolumePrincipled')
    vol.inputs['Color'].default_value = (.55, .34, .2, 1)
    vol.inputs['Anisotropy'].default_value = .5
    co = n.new('ShaderNodeTexCoord')
    noise = n.new('ShaderNodeTexNoise'); noise.noise_dimensions = '4D'; noise.inputs['Scale'].default_value = 2.5
    noise.inputs['Detail'].default_value = 6
    l.new(co.outputs['Generated'], noise.inputs['Vector'])
    noise.inputs['W'].default_value = 0
    noise.inputs['W'].keyframe_insert('default_value', frame=frames[0])
    noise.inputs['W'].default_value = (frames[1] - frames[0]) / 24 * .8
    noise.inputs['W'].keyframe_insert('default_value', frame=frames[1])
    # Falloff from the centre bottom (plume shape).
    grad = n.new('ShaderNodeTexGradient'); grad.gradient_type = 'SPHERICAL'
    mp = n.new('ShaderNodeMapping'); mp.inputs['Location'].default_value = (-.5, -.5, -.05)
    l.new(co.outputs['Generated'], mp.inputs[0]); l.new(mp.outputs[0], grad.inputs[0])
    mr = n.new('ShaderNodeMapRange'); mr.inputs[1].default_value = .45; mr.inputs[2].default_value = .75
    l.new(noise.outputs['Fac'], mr.inputs[0])
    mul = n.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'
    l.new(mr.outputs[0], mul.inputs[0]); l.new(grad.outputs['Fac'], mul.inputs[1])
    mul2 = n.new('ShaderNodeMath'); mul2.operation = 'MULTIPLY'; mul2.inputs[1].default_value = density
    l.new(mul.outputs[0], mul2.inputs[0]); l.new(mul2.outputs[0], vol.inputs['Density'])
    l.new(vol.outputs[0], n['Material Output'].inputs['Volume'])
    ob.data.materials.append(m)
    return ob


def cuttings(center, rnd, n=260, r0=.03, r1=.22):
    grain = regolith_grain_mat()
    for _ in range(n):
        r = r0 + (r1 - r0) * rnd.random() ** 1.8
        a = rnd.uniform(0, math.tau)
        x, y = center[0] + r * math.cos(a), center[1] + r * math.sin(a)
        s = rnd.uniform(.004, .014)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=s, location=(x, y, mars.ground(x, y) + s * .3))
        ob = bpy.context.object
        ob.scale.z = .55
        ob.data.materials.append(grain)
    # Low mound of disturbed, darker regolith around the bore.
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.2, location=(center[0], center[1], mars.ground(*center) - .17))
    mound = bpy.context.object
    mound.scale = (1, 1, .95)
    mound.data.materials.append(props.pbr('Disturbed regolith', (.22, .11, .055), .95))


# ---------------------------------------------------------------- shots

def shot_drill(preview):
    """EV1 drilling at E03S24, EV2 watching. Low 3/4 push-in, dust in backlight."""
    mars.build(near=((0, 0, 40), (0, 0, 10)), near_rocks=2600)
    mars.sky(sun_elevation=17, sun_azimuth=200)
    g = mars.ground(0, 0)
    depth = .25
    drill, spin, grips = props.core_drill()
    drill.location = (0, 0, g - depth)
    for f, a in ((1, 0), (60, math.tau * 7.4)):
        spin.rotation_euler.z = a
        spin.keyframe_insert('rotation_euler', frame=f)
    for fc in _fcurves(spin):
        for k in fc.keyframe_points:
            k.interpolation = 'LINEAR'
    drill.keyframe_insert('location', frame=1)
    drill.location.z -= .22
    drill.keyframe_insert('location', frame=60)
    rnd = random.Random(5)
    cuttings((0, 0), rnd)
    # EV1 holds the T-handle, facing -Y toward camera side.
    ev1, ev1_rig, ev1_meshes = astronaut.load('EV1', 'idle', speed=.85)
    ev1.location.y=.43;ev1.location.z+=mars.ground(0,.43)
    bpy.context.view_layer.update()
    for side in 'LR':
        astronaut.hold_handle(ev1_rig,side,grips[side],drill)
    ev2, ev2_rig, ev2_meshes = astronaut.load('EV2', 'idle', speed=.72)
    ev2.location.x=-1.35;ev2.location.y=.9;ev2.location.z+=mars.ground(-1.35,.9)
    ev2.rotation_euler.z=math.radians(35)
    astronaut.ground_motion(ev1_rig,ev1_meshes,60,mars.ground)
    astronaut.ground_motion(ev2_rig,ev2_meshes,60,mars.ground)
    dust_particles('Drill spoil', (0, 0, g + .01), 900, -40, 60, speed=.35, size=.0025, spread=.04)
    dust_volume('Drill dust', (0, 0, g + .2), (.9, .9, .5), density=.35)
    rig_camera('Drill cam', [(1, G(2.5, -4.1, 1.05), G(-.25, .35, .86)), (60, G(1.95, -3.4, 1.0), G(-.2, .35, .88))],
               lens=30, fstop=2.8, shake=.0018)
    return 60


def habitat(at=(4.0, 195.0), yaw=.4):
    """NASA Habitat Demonstration Unit model as the surface habitat (illustrative)."""
    objs = []
    for part in ('Habitat Demonstration Unit (part 1).glb', 'Habitat Demonstration Unit (part 2).glb'):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(ROOT / 'assets/nasa/3d' / part))
        objs += [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new('Habitat', None)
    bpy.context.scene.collection.objects.link(root)
    for o in objs:
        if o.parent is None:
            o.parent = root
    root.scale = (.026, .026, .026)
    root.rotation_euler.z = yaw
    root.location = (at[0], at[1], mars.ground(*at) - .3)
    for o in objs:
        if o.type == 'MESH':
            for m in o.data.materials:
                if m and m.use_nodes and m.node_tree.nodes.get('Principled BSDF'):
                    mars.haze(m, m.node_tree.nodes['Principled BSDF'].outputs[0])
    return root


def footprints(path, rnd, stride=.62, width=.17, mat=None):
    """Boot prints along a polyline of (x, y) points, alternating left/right."""
    mat = mat or props.pbr('Boot print', (.20, .10, .05), .97)
    bpy.ops.mesh.primitive_cube_add(size=1)
    proto = bpy.context.object
    proto.name = 'Boot print proto'
    proto.scale = (.12, .29, .03)
    bpy.ops.object.transform_apply(scale=True)
    b = proto.modifiers.new('b', 'BEVEL'); b.width = .04; b.segments = 4
    proto.data.materials.append(mat)
    proto.hide_render = True
    k = 0
    for (x0, y0), (x1, y1) in zip(path, path[1:]):
        d = Vector((x1 - x0, y1 - y0))
        n = int(d.length / stride)
        side = Vector((-d.y, d.x)).normalized()
        for i in range(n):
            p = Vector((x0, y0)) + d * (i / max(n, 1)) + side * (width / 2) * (1 if k % 2 else -1)
            p += Vector((rnd.uniform(-.03, .03), rnd.uniform(-.03, .03)))
            ob = bpy.data.objects.new('Boot print', proto.data)
            bpy.context.scene.collection.objects.link(ob)
            ob.location = (p.x, p.y, mars.ground(p.x, p.y) - .022)
            ob.rotation_euler.z = math.atan2(d.x, -d.y) + rnd.uniform(-.08, .08)
            k += 1


def walkers(frames, x1=0.0, x2=-1.4, y0=0.0, separation=1.6):
    rigs=[]
    for name,x,y,clip,start in [('EV1',x1,y0,'17_08',61),('EV2',x2,y0-separation,'07_04',1)]:
        wrapper,rig,meshes=astronaut.load(name,'idle')
        wrapper.location.x=x;wrapper.location.y=y
        astronaut.mocap_walk(rig,frames,clip=clip,start=start,slow=1.2)
        astronaut.ground_motion(rig,meshes,frames,mars.ground)
        rigs.append(rig)
    return rigs


def shot_walk(preview):
    """Wide: EV1 and EV2 leave E03S24 toward E03S25; habitat on the horizon behind."""
    mars.build(near=((0, -6, 45),), near_rocks=2600, seed=11)
    mars.sky(sun_elevation=11, sun_azimuth=345)
    habitat()
    rnd = random.Random(9)
    footprints([(0, 40), (0, 2)], rnd)
    footprints([(-1.4, 40), (-1.4, 0)], rnd)
    ev1, ev2 = walkers(72, y0=-1.0)
    # Side tracking dolly, long lens compression toward the habitat.
    rig_camera('Walk cam', [(1, G(2.6, -13.5, 1.0), G(-.6, .5, 1.25)), (72, G(2.4, -14.6, 1.0), G(-.6, -1.2, 1.2))],
               lens=45, fstop=4, shake=.0012)
    return 72


def shot_pov(preview):
    """EV1 helmet POV walking toward E03S25; EV2 ahead. HUD added in Remotion."""
    mars.build(near=((0, -8, 40),), near_rocks=2800, seed=13)
    mars.sky(sun_elevation=13, sun_azimuth=345)
    ev1, ev2 = walkers(60, x2=-.7, y0=0.0, separation=4.0)
    # Flag at E03S25 (100 m south), as a real physical marker the AR label anchors to.
    props.cyl('E03S25 survey flag pole', (0, -100, mars.ground(0, -100)), (0, -100, mars.ground(0, -100) + 1.4), .008,
              props.pbr('Flag pole', (.6, .6, .6), .3, 1), None)
    props.box('E03S25 survey flag', (.17, -100, mars.ground(0, -100) + 1.3), (.3, .005, .18),
              props.pbr('Flag orange', (.8, .25, .03), .5), None)
    cam = mars.camera('POV cam', (0, 0, 1.7), (0, -10, 1.5), lens=18, fstop=11, focus=8)
    sc = bpy.context.scene
    from mathutils import Euler, Matrix
    prev = None
    for f in range(1, 61):
        sc.frame_set(f)
        head = ev1.matrix_world @ astronaut.bone(ev1,'head').head
        # Helmet-stabilized view; torso rotations do not whip the camera around.
        cam.location = head + Vector((0,-.38,.035))
        cam.rotation_euler = Euler((math.radians(80), math.sin(f*.15)*.003,math.pi), 'XYZ')
        cam.keyframe_insert('location', frame=f)
        cam.keyframe_insert('rotation_euler', frame=f)
    return 60


SITE_LAT, SITE_LON = 35.1105, 189.8273


def shot_orbit(preview):
    """MRO passes over Mars near the terminator; scaled planet keeps true angular size."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc['engine'] = 'EEVEE'
    s = 1e-3                      # planet scale about the camera
    R, h = 3389.5e3 * s, 290e3 * s
    # Mars, rotated so the site faces the camera's down-range point.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=256, ring_count=128, radius=R, location=(0, 0, -(R + h)))
    mars_ob = bpy.context.object
    mars_ob.name = 'Mars'
    for p in mars_ob.data.polygons:
        p.use_smooth = True
    m = bpy.data.materials.new('Mars albedo')
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    bs = n['Principled BSDF']
    tx = n.new('ShaderNodeTexImage')
    tx.image = bpy.data.images.load(str(ROOT / 'assets/planet/8k_mars.jpg'))
    tx.interpolation = 'Cubic'
    uv = n.new('ShaderNodeTexCoord'); l.new(uv.outputs['UV'], tx.inputs[0])
    l.new(tx.outputs[0], bs.inputs['Base Color'])
    bw = n.new('ShaderNodeRGBToBW'); l.new(tx.outputs[0], bw.inputs[0])
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .35; bump.inputs['Distance'].default_value = .4
    l.new(bw.outputs[0], bump.inputs['Height']); l.new(bump.outputs[0], bs.inputs['Normal'])
    bs.inputs['Roughness'].default_value = .95
    mars_ob.data.materials.append(m)
    # UV sphere: u = lon/360 from -180; rotate so site longitude/latitude points up (+Z) toward the camera.
    mars_ob.rotation_mode = 'XYZ'
    mars_ob.rotation_euler = (math.radians(90 - SITE_LAT) * 0 + math.radians(-(90 - SITE_LAT)) * 0, 0, 0)
    from mathutils import Euler
    lon = math.radians(SITE_LON - 180)
    lat = math.radians(SITE_LAT)
    site = Vector((math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat)))
    q = site.rotation_difference(Vector((0, .25, 1)).normalized())
    mars_ob.rotation_mode = 'QUATERNION'
    mars_ob.rotation_quaternion = q
    # Thin dusty atmosphere shell: emission on the lit limb only.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=256, ring_count=128, radius=R * 1.0035, location=mars_ob.location)
    atm = bpy.context.object
    atm.name = 'Atmosphere'
    for p in atm.data.polygons:
        p.use_smooth = True
    am = bpy.data.materials.new('Atmosphere')
    am.use_nodes = True
    n, l = am.node_tree.nodes, am.node_tree.links
    n.remove(n['Principled BSDF'])
    lw = n.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = .05
    pw = n.new('ShaderNodeMath'); pw.operation = 'POWER'; pw.inputs[1].default_value = 6.0
    l.new(lw.outputs['Facing'], pw.inputs[0])
    geo = n.new('ShaderNodeNewGeometry')
    dot = n.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
    sun_dir = Vector((.95, .2, .3)).normalized()
    dot.inputs[1].default_value = sun_dir
    l.new(geo.outputs['Normal'], dot.inputs[0])
    lit = n.new('ShaderNodeMapRange'); lit.inputs[1].default_value = -.25; lit.inputs[2].default_value = .6
    l.new(dot.outputs['Value'], lit.inputs[0])
    mul = n.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'
    l.new(pw.outputs[0], mul.inputs[0]); l.new(lit.outputs[0], mul.inputs[1])
    em = n.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (.95, .66, .45, 1); em.inputs['Strength'].default_value = 1.4
    tr = n.new('ShaderNodeBsdfTransparent')
    mix = n.new('ShaderNodeMixShader')
    l.new(mul.outputs[0], mix.inputs[0]); l.new(tr.outputs[0], mix.inputs[1]); l.new(em.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], n['Material Output'].inputs['Surface'])
    am.surface_render_method = 'BLENDED'
    atm.data.materials.append(am)
    # Sun and starfield.
    sun = bpy.data.lights.new('Sun', 'SUN'); sun.energy = 7.0; sun.color = (1, .97, .92)
    so = bpy.data.objects.new('Sun', sun); sc.collection.objects.link(so)
    so.rotation_euler = (-sun_dir).to_track_quat('-Z', 'Y').to_euler()
    w = bpy.data.worlds.new('Space'); sc.world = w; w.use_nodes = True
    n, l = w.node_tree.nodes, w.node_tree.links
    vor = n.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 420; vor.feature = 'F1'
    co = n.new('ShaderNodeTexCoord'); l.new(co.outputs['Normal'], vor.inputs['Vector'])
    st = n.new('ShaderNodeMapRange'); st.inputs[1].default_value = .03; st.inputs[2].default_value = 0.0
    l.new(vor.outputs['Distance'], st.inputs[0])
    pw2 = n.new('ShaderNodeMath'); pw2.operation = 'POWER'; pw2.inputs[1].default_value = 6
    l.new(st.outputs[0], pw2.inputs[0])
    bri = n.new('ShaderNodeMath'); bri.operation = 'MULTIPLY'
    l.new(pw2.outputs[0], bri.inputs[0]); l.new(vor.outputs['Color'], bri.inputs[1])
    n['Background'].inputs['Color'].default_value = (1, 1, 1, 1)
    l.new(bri.outputs[0], n['Background'].inputs['Strength'])
    # MRO: real proportions (13.6 m solar array span), crossing right to left ~25 m from camera.
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / 'assets/nasa/3d/Mars Reconnaissance Orbiter (MRO) (A).glb'))
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        if o.animation_data:
            o.animation_data_clear()
    mro = bpy.data.objects.new('MRO', None); sc.collection.objects.link(mro)
    for o in new:
        if o.parent is None:
            o.parent = mro
    mro.scale = (.152, .152, .152)
    mro.rotation_euler = (math.radians(8), math.radians(-12), math.radians(70))
    mro.location = (14, -40, -11.0)
    mro.keyframe_insert('location', frame=1); mro.keyframe_insert('rotation_euler', frame=1)
    mro.location = (-6, -37, -10.6)
    mro.rotation_euler = (math.radians(4), math.radians(-9), math.radians(82))
    mro.keyframe_insert('location', frame=72); mro.keyframe_insert('rotation_euler', frame=72)
    for fc in _fcurves(mro):
        for k in fc.keyframe_points:
            k.interpolation = 'LINEAR'
    cam = mars.camera('Orbit cam', (0, 0, 0), (0, -60, -22), lens=32, fstop=8, focus=28)
    cam.data.clip_start = .5
    cam.data.clip_end = 20000
    cam.keyframe_insert('rotation_euler', frame=1)
    cam.rotation_euler.z += math.radians(-6)
    cam.rotation_euler.x += math.radians(-3)
    cam.keyframe_insert('rotation_euler', frame=72)
    sc.view_settings.exposure = 1.0
    return 72


def emissive(name, color, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    n.remove(n['Principled BSDF'])
    e = n.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*color, 1); e.inputs['Strength'].default_value = strength
    l.new(e.outputs[0], n['Material Output'].inputs['Surface'])
    return m


def screen_glass():
    """Dark glossy panel; the UI is composited in Remotion with screen blend over these pixels."""
    m = bpy.data.materials.new('Monitor glass')
    m.use_nodes = True
    bs = m.node_tree.nodes['Principled BSDF']
    bs.inputs['Base Color'].default_value = (.004, .005, .006, 1)
    bs.inputs['Roughness'].default_value = .08
    bs.inputs['Coat Weight'].default_value = .6
    return m


SCREENS = {}
MARKS = {}


def baked_ui(name):
    """Display pixels belong to the 3D mesh, so they cannot drift off the glass."""
    source = ROOT / 'assets/ui-plates' / f'{name}.png'
    if not source.exists():
        raise FileNotFoundError(f'Render the UI plate first: {source.name}')
    return bpy.data.images.load(str(source), check_existing=True)


def display_material(name, before, after=None, change_at=None):
    mat = bpy.data.materials.new(name + ' physically integrated display')
    mat.use_nodes = True
    n, l = mat.node_tree.nodes, mat.node_tree.links
    bs = n['Principled BSDF']
    a = n.new('ShaderNodeTexImage'); a.image = baked_ui(before)
    color = a.outputs['Color']
    if after:
        b = n.new('ShaderNodeTexImage'); b.image = baked_ui(after)
        mix = n.new('ShaderNodeMixRGB'); mix.blend_type = 'MIX'
        l.new(color, mix.inputs[1]); l.new(b.outputs['Color'], mix.inputs[2])
        if change_at is None:
            mix.inputs[0].default_value = 1
        else:
            mix.inputs[0].default_value = 0
            mix.inputs[0].keyframe_insert('default_value', frame=change_at)
            mix.inputs[0].default_value = 1
            mix.inputs[0].keyframe_insert('default_value', frame=change_at + 6)
        color = mix.outputs[0]
    l.new(color, bs.inputs['Base Color'])
    l.new(color, bs.inputs['Emission Color'])
    bs.inputs['Emission Strength'].default_value = .8
    bs.inputs['Roughness'].default_value = .22
    bs.inputs['Coat Weight'].default_value = .12
    bs.inputs['IOR'].default_value = 1.46
    return mat


def integrate_displays(review=False):
    for name, (root, w, h) in SCREENS.items():
        gl = bpy.data.objects[name + ' glass']
        # UVs follow the viewing side. Rendering the image on this exact plane
        # includes perspective, occlusion, lens blur and all camera motion.
        me = bpy.data.meshes.new(name + ' display surface')
        me.from_pydata([(w/2,.004,h/2),(-w/2,.004,h/2),(-w/2,.004,-h/2),(w/2,.004,-h/2)], [], [(0,1,2,3)])
        uv = me.uv_layers.new(name='Display UV')
        for i, co in enumerate([(0,1),(1,1),(1,0),(0,0)]):uv.data[i].uv=co
        gl.data = me; gl.location=(0,0,0);gl.rotation_euler=(0,0,0);gl.scale=(1,1,1)
        if name == 'main':
            mat = display_material(name, 'ConsoleMapAfter' if review else 'ConsoleMapBefore', None if review else 'ConsoleMapAfter', None if review else 19)
        elif name == 'right':
            mat = display_material(name, 'Review', 'ReviewConfirmed' if review else None, 57 if review else None)
        else:
            mat = display_material(name, 'EvaWindow')
        gl.data.materials.append(mat)
    bpy.context.scene['baked_displays'] = True
    if review:
        root, w, h = SCREENS['right']
        cursor = actor.empty('Physical screen cursor', (0,.009,0), root)
        points=[(0,0),(0,20),(5,15),(10,24),(13,23),(9,14),(16,14)]
        me=bpy.data.meshes.new('Cursor silhouette')
        me.from_pydata([(-x*3.2/1920*w,0,-y*3.2/1080*h) for x,y in points],[],[tuple(range(len(points)))])
        ob=bpy.data.objects.new('Cursor pixels',me);bpy.context.scene.collection.objects.link(ob);ob.parent=cursor
        ob.data.materials.append(emissive('Cursor white',(.9,.93,.96),.8))
        for frame,x,y in [(1,1180,520),(20,1180,520),(53,1590,834),(80,1590,834)]:
            cursor.location=(w/2-x/1920*w,.009,h/2-y/1080*h)
            cursor.keyframe_insert('location',frame=frame)
        for frame,s in [(1,1),(56,1),(57,.85),(60,.85),(62,1),(80,1)]:
            cursor.scale=(s,s,s);cursor.keyframe_insert('scale',frame=frame)


def monitor(name, center, width, yaw_deg, tilt_deg=6, height=None):
    height = height or width * 9 / 16
    alu = props.pbr('Monitor bezel', (.035, .036, .038), .35, .8, dust=False)
    root = bpy.data.objects.new(name + ' monitor', None)
    bpy.context.scene.collection.objects.link(root)
    root.location = center
    root.rotation_euler = (math.radians(tilt_deg), 0, math.radians(yaw_deg))
    props.box(name + ' bezel', (0, -.02, 0), (width + .035, .03, height + .035), alu, root, .006)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, .004, 0), rotation=(math.pi / 2, 0, 0))
    gl = bpy.context.object
    gl.name = name + ' glass'
    gl.scale = (width, height, 1)
    gl.data.materials.append(screen_glass())
    gl.parent = root
    # Glow: an area light per screen approximates its emitted light on the desk and room.
    li = bpy.data.lights.new(name + ' glow', 'AREA'); li.shape = 'RECTANGLE'; li.size = width; li.size_y = height
    li.energy = 140 * width; li.color = (.75, .85, 1.0)
    lo = bpy.data.objects.new(name + ' glow', li); bpy.context.scene.collection.objects.link(lo)
    lo.parent = root; lo.location = (0, .03, 0); lo.rotation_euler = (math.radians(90), 0, 0)
    lo.visible_glossy = False
    props.box(name + ' stand', (0, -.06, -height / 2 - .12), (.05, .03, .26), alu, root, .004)
    SCREENS[name] = (root, width, height)
    return root


def habitat_interior():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc['engine'] = 'EEVEE'
    panel = props.pbr('Habitat wall panel', (.20, .21, .22), .5, 0, .2, dust=False)
    seam = props.pbr('Panel seam', (.05, .05, .05), .6, dust=False)
    frame = props.pbr('Ring frame', (.16, .17, .18), .4, .6, dust=False)
    desk_m = props.pbr('Desk', (.025, .027, .03), .45, .2, dust=False)
    rubber = props.pbr('Rubber', (.02, .02, .02), .8, dust=False)
    cable_m = props.pbr('Cable sheath', (.04, .045, .05), .6, dust=False)
    yellow = props.pbr('Handrail yellow', (.75, .55, .05), .4, dust=False)
    R = 2.3
    # Cylindrical hull (axis along X), panel tiles with seams.
    for i in range(-10, 11):
        for j in range(-3, 4):
            a = math.radians(-60 + (i + 10) * 8.2)
            x = j * .62
            y, z = R * math.sin(a) * -1, R * math.cos(a)
            if z < .2:
                continue
            props.box('Wall tile', (x, -abs(y) - 0 if False else -R * math.cos(math.radians(90) - a) * 0 + 0, 0), (.6, .02, .32), panel, None, .01)
            ob = bpy.context.object
            ob.location = (x, R * math.sin(a), 1.25 + R * math.cos(a) - R + .9)
            ob.rotation_euler = (a, 0, 0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=R + .03, depth=5, location=(0, 0, 1.25 + .9 - R + 0), rotation=(0, math.pi / 2, 0))
    hull = bpy.context.object; hull.name = 'Hull backing'; hull.data.materials.append(seam)
    for x in (-1.86, 0, 1.86):
        bpy.ops.mesh.primitive_torus_add(major_radius=R - .02, minor_radius=.045, location=(x, 0, 1.25 + .9 - R), rotation=(0, math.pi / 2, 0))
        bpy.context.object.data.materials.append(frame)
    # Floor grating.
    props.box('Floor', (0, 0, 0), (5, 3.4, .04), props.pbr('Floor grating', (.09, .09, .095), .5, .7, dust=False), None, .005)
    # Desk and console.
    props.box('Desk top', (0, -1.1, .74), (2.4, .75, .04), desk_m, None, .008)
    props.box('Desk front', (0, -1.42, .45), (2.4, .05, .55), desk_m, None, .006)
    props.box('Console rack', (0, -1.52, 1.15), (2.6, .12, .9), props.pbr('Rack', (.07, .075, .08), .5, .5, dust=False), None, .01)
    monitor('main', (0, -1.38, 1.13), .86, 0, 4)
    monitor('right', (.82, -1.24, 1.08), .58, -28, 5)
    monitor('left', (-.82, -1.24, 1.08), .58, 28, 5)
    # Keyboard, trackball, headset, notebook, drink pouch.
    props.box('Keyboard', (-.05, -.86, .775), (.44, .14, .022), props.pbr('Keyboard', (.03, .03, .035), .5, dust=False), None, .006)
    for r in range(4):
        for c in range(15):
            props.box('Key', (-.25 + c * .028, -.91 + r * .028, .79), (.022, .022, .008), props.pbr('Keycap', (.06, .06, .065), .6, dust=False), None, .002)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=.03, location=(.32, -.88, .8))
    bpy.context.object.data.materials.append(props.pbr('Trackball', (.1, .12, .14), .25, 0, .8, dust=False))
    props.box('Trackball base', (.32, -.88, .772), (.1, .1, .025), rubber, None, .008)
    bpy.ops.mesh.primitive_torus_add(major_radius=.09, minor_radius=.012, location=(-.62, -.92, .79), rotation=(math.radians(70), 0, .4))
    bpy.context.object.data.materials.append(rubber)
    props.box('Checklist binder', (.62, -.95, .77), (.24, .3, .025), props.pbr('Binder', (.08, .12, .2), .6, dust=False), None, .006)
    props.box('Checklist page', (.62, -.95, .784), (.21, .28, .002), props.pbr('Paper', (.8, .8, .76), .9, dust=False), None, .0005)
    # Cable runs and handrails along the hull.
    for k, z in enumerate((1.95, 2.02)):
        props.cyl('Cable run', (-2.4, -1.5 + k * .06, z), (2.4, -1.5 + k * .06, z), .018, cable_m, None)
    props.cyl('Handrail', (-1.5, -1.62, 1.92), (1.5, -1.62, 1.92), .016, yellow, None)
    # Status LEDs and switch rows on the rack.
    rnd = random.Random(4)
    for i in range(46):
        x = -1.2 + (i % 23) * .108
        z = 1.52 + (i // 23) * .05
        col = rnd.choice([(.2, 1, .35), (.2, 1, .35), (.2, 1, .35), (1, .55, .1), (.3, .6, 1)])
        bpy.ops.mesh.primitive_cylinder_add(radius=.005, depth=.004, location=(x, -1.455, z), rotation=(math.pi / 2, 0, 0))
        bpy.context.object.data.materials.append(emissive(f'LED {col}', col, 6))
        props.box('Switch', (x + .04, -1.458, z), (.012, .01, .02), props.pbr('Switch', (.5, .5, .5), .3, 1, dust=False), None, .002)
    # Porthole to the Mars surface (behind-right of the console).
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=.24, depth=.02, location=(1.75, -1.35, 1.55), rotation=(math.radians(90), 0, math.radians(-40)))
    port = bpy.context.object; port.name = 'Porthole'
    img = ROOT / 'assets/renders/v2/walk-preview/still_0036.png'
    pm = bpy.data.materials.new('Porthole view'); pm.use_nodes = True
    n, l = pm.node_tree.nodes, pm.node_tree.links; n.remove(n['Principled BSDF'])
    tx = n.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(str(img)) if img.exists() else None
    e = n.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = 2.5
    if tx.image:
        l.new(tx.outputs[0], e.inputs['Color'])
    l.new(e.outputs[0], n['Material Output'].inputs['Surface'])
    port.data.materials.append(pm)
    bpy.ops.mesh.primitive_torus_add(major_radius=.26, minor_radius=.035, location=(1.75, -1.34, 1.55), rotation=(math.radians(90), 0, math.radians(-40)))
    bpy.context.object.data.materials.append(frame)
    # Lighting: cool LED strips, low ambient; monitors are the key light on the operator side.
    for x in (-1.2, 1.2):
        li = bpy.data.lights.new('LED strip', 'AREA'); li.shape = 'RECTANGLE'; li.size = 1.4; li.size_y = .05
        li.energy = 35; li.color = (.75, .85, 1.0)
        lo = bpy.data.objects.new('LED strip', li); sc.collection.objects.link(lo); lo.location = (x, -.3, 1.95)
    fill = bpy.data.lights.new('Fill', 'AREA'); fill.size = 2.5; fill.energy = 8; fill.color = (.7, .8, 1.0)
    fo = bpy.data.objects.new('Fill', fill); sc.collection.objects.link(fo); fo.location = (0, 1.2, 1.6)
    fo.rotation_euler = (math.radians(70), 0, math.radians(180))
    sun = bpy.data.lights.new('Mars light', 'SPOT'); sun.energy = 900; sun.color = (1, .62, .36); sun.spot_size = math.radians(40); sun.spot_blend = .6
    so = bpy.data.objects.new('Mars light', sun); sc.collection.objects.link(so)
    so.location = (2.4, -1.9, 1.8); so.rotation_euler = (Vector((.3, 0, .8)) - so.location).to_track_quat('-Z', 'Y').to_euler()
    # Warm under-shelf practical and a cool rim behind the monitors (depth separation).
    lamp = bpy.data.lights.new('Desk practical', 'AREA'); lamp.shape = 'RECTANGLE'; lamp.size = 1.8; lamp.size_y = .04
    lamp.energy = 25; lamp.color = (1, .78, .55)
    lo2 = bpy.data.objects.new('Desk practical', lamp); sc.collection.objects.link(lo2); lo2.location = (0, -1.3, .73)
    lo2.rotation_euler = (math.radians(180), 0, 0)
    rimL = bpy.data.lights.new('Rack rim', 'AREA'); rimL.size = 2.4; rimL.energy = 40; rimL.color = (.5, .7, 1)
    ro2 = bpy.data.objects.new('Rack rim', rimL); sc.collection.objects.link(ro2); ro2.location = (0, -1.45, 1.75)
    ro2.rotation_euler = (math.radians(-60), 0, 0)
    w = bpy.data.worlds.new('Interior'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (.01, .012, .015, 1)
    sc.view_settings.exposure = .2


def export_screens(shot, end):
    from bpy_extras.object_utils import world_to_camera_view
    import json
    sc = bpy.context.scene
    W, H = RES
    frames = []
    for f in range(1, end + 1):
        sc.frame_set(f)
        out = {}
        for name, (root, w, h) in SCREENS.items():
            corners = [root.matrix_world @ Vector((x * w / 2, 0, z * h / 2)) for x, z in ((-1, 1), (1, 1), (1, -1), (-1, -1))]
            out[name] = [[round(v.x * W, 2), round((1 - v.y) * H, 2)] for v in (world_to_camera_view(sc, sc.camera, c) for c in corners)]
        for name, p in MARKS.items():
            v = world_to_camera_view(sc, sc.camera, Vector(p))
            out[name] = [round(v.x * W, 2), round((1 - v.y) * H, 2)]
        frames.append(out)
    (ROOT / f'src/v2/{shot}-screens.json').parent.mkdir(exist_ok=True)
    (ROOT / f'src/v2/{shot}-screens.json').write_text(json.dumps(frames))


def shot_console_wide(preview):
    """IV workstation: slow dolly toward the main monitor; porthole shows the EVA outside."""
    habitat_interior()
    integrate_displays()
    rig_camera('Console wide cam', [(1, (-1.05, .95, 1.35), (.05, -1.3, 1.08)), (64, (-.62, .35, 1.25), (.05, -1.35, 1.1))],
               lens=28, fstop=8.0, shake=.0012)
    bpy.context.scene.camera.data.dof.focus_object = SCREENS['main'][0]
    return 64


def shot_console_review(preview):
    """Right monitor (plan review → GO), slow arc; main monitor soft in the foreground."""
    habitat_interior()
    integrate_displays(review=True)
    rig_camera('Console review cam', [(1, (.05, -.35, 1.2), (.82, -1.24, 1.08)), (80, (.3, -.48, 1.15), (.84, -1.25, 1.08))],
               lens=40, fstop=11.0, shake=.001)
    bpy.context.scene.camera.data.dof.focus_object = SCREENS['right'][0]
    return 80


def strata_material(depths):
    """Section face: dry regolith strata; ice-possible zone as a soft blue band (an estimate, not data)."""
    shallow, median, horizon = depths
    m = bpy.data.materials.new('Section strata')
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    bs = n['Principled BSDF']
    co = n.new('ShaderNodeTexCoord')
    sep = n.new('ShaderNodeSeparateXYZ'); l.new(co.outputs['Object'], sep.inputs[0])
    # Depth below the surface (object z = 0 at the surface, negative downward).
    dz = n.new('ShaderNodeMath'); dz.operation = 'MULTIPLY'; dz.inputs[1].default_value = -1
    l.new(sep.outputs['Z'], dz.inputs[0])
    noise = n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 9; noise.inputs['Detail'].default_value = 10
    l.new(co.outputs['Object'], noise.inputs['Vector'])
    wave = n.new('ShaderNodeTexWave'); wave.wave_type = 'BANDS'; wave.bands_direction = 'Z'
    wave.inputs['Scale'].default_value = 2.4; wave.inputs['Distortion'].default_value = 9; wave.inputs['Detail'].default_value = 4
    l.new(co.outputs['Object'], wave.inputs['Vector'])
    ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (.07, .035, .018, 1); ramp.color_ramp.elements[1].color = (.24, .13, .065, 1)
    wv = n.new('ShaderNodeMath'); wv.operation = 'MULTIPLY'; wv.inputs[1].default_value = .22
    l.new(wave.outputs['Fac'], wv.inputs[0])
    mixf = n.new('ShaderNodeMath'); mixf.operation = 'MULTIPLY_ADD'; mixf.inputs[1].default_value = .9
    l.new(noise.outputs['Fac'], mixf.inputs[0]); l.new(wv.outputs[0], mixf.inputs[2])
    l.new(mixf.outputs[0], ramp.inputs[0])
    # Ice-possible band: smooth rise from `shallow`, peak at `median`, fades past the horizon.
    band = n.new('ShaderNodeFloatCurve')
    c = band.mapping.curves[0]
    c.points[0].location = (0, 0); c.points[1].location = (1, 0)
    for x, y in ((shallow / 4, 0), ((shallow + median) / 8, .45), (median / 4, 1), (horizon / 4, .55), (min(1, (horizon + .5) / 4), 0)):
        c.points.new(x, y)
    band.mapping.update()
    sc4 = n.new('ShaderNodeMath'); sc4.operation = 'DIVIDE'; sc4.inputs[1].default_value = 4
    l.new(dz.outputs[0], sc4.inputs[0]); l.new(sc4.outputs[0], band.inputs['Value'])
    speck = n.new('ShaderNodeTexNoise'); speck.inputs['Scale'].default_value = 60
    l.new(co.outputs['Object'], speck.inputs['Vector'])
    sp = n.new('ShaderNodeMapRange'); sp.inputs[1].default_value = .35; sp.inputs[2].default_value = .75
    l.new(speck.outputs['Fac'], sp.inputs[0])
    ice_f = n.new('ShaderNodeMath'); ice_f.operation = 'MULTIPLY'
    l.new(band.outputs[0], ice_f.inputs[0]); l.new(sp.outputs[0], ice_f.inputs[1])
    ice_f2 = n.new('ShaderNodeMath'); ice_f2.operation = 'MULTIPLY'; ice_f2.inputs[1].default_value = .45
    l.new(ice_f.outputs[0], ice_f2.inputs[0])
    col = n.new('ShaderNodeMix'); col.data_type = 'RGBA'
    l.new(ice_f2.outputs[0], col.inputs['Factor']); l.new(ramp.outputs[0], col.inputs[6]); col.inputs[7].default_value = (.55, .75, .95, 1)
    l.new(col.outputs[2], bs.inputs['Base Color'])
    em = n.new('ShaderNodeMath'); em.operation = 'MULTIPLY'; em.inputs[1].default_value = .25
    l.new(ice_f.outputs[0], em.inputs[0])
    bs.inputs['Emission Color'].default_value = (.35, .6, 1.0, 1)
    l.new(em.outputs[0], bs.inputs['Emission Strength'])
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .6
    l.new(noise.outputs['Fac'], bump.inputs['Height']); l.new(bump.outputs[0], bs.inputs['Normal'])
    bs.inputs['Roughness'].default_value = .95
    return m


def shot_section(preview):
    """Cutaway at E03S24: the core reached 1 m dry; the model still allows ice deeper (estimate)."""
    import json
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc['engine'] = 'EEVEE'
    d = json.loads((ROOT / 'public/data/data.json').read_text())
    st = d['stations_before'][0]
    depths = (st['depth_shallow_m'], st['depth_median_m'], d['site']['threshold_m'])
    # Ground slab, cut on the camera side (y = 0 plane).
    W, D, Hh = 4.0, 3.0, 4.2
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, D / 2, -Hh / 2))
    block = bpy.context.object; block.name = 'Section block'; block.scale = (W, D, Hh)
    bpy.ops.object.transform_apply(scale=True)
    block.data.materials.append(strata_material(depths))
    # Surface: thin regolith skin with micro relief.
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, D / 2, .002))
    top = bpy.context.object; top.scale = (W, D, 1)
    bpy.ops.object.transform_apply(scale=True)
    sub = top.modifiers.new('s', 'SUBSURF'); sub.subdivision_type = 'SIMPLE'; sub.levels = sub.render_levels = 6
    tex = bpy.data.textures.new('relief', 'CLOUDS'); tex.noise_scale = .08
    dm = top.modifiers.new('d', 'DISPLACE'); dm.texture = tex; dm.strength = .03
    top.data.materials.append(props.pbr('Surface regolith', (.40, .21, .1), .95))
    # Bore: 1 m deep half-cylinder cavity on the section face, with the core tube in it.
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=.035, depth=1.0, location=(0, 0, -.5))
    bore = bpy.context.object; bore.name = 'Bore'; bore.data.materials.append(props.pbr('Bore wall', (.10, .05, .025), .95))
    drill, spin, _ = props.core_drill()
    drill.location = (0, -.002, -1.0)
    for f, a in ((1, 0), (72, math.tau * 14)):
        spin.rotation_euler.z = a; spin.keyframe_insert('rotation_euler', frame=f)
    # Depth ticks every 0.5 m (physical markers; labels added in Remotion).
    for k in range(1, 7):
        props.box('Depth tick', (-W / 2 + .12, -.004, -k * .5), (.16 if k % 2 == 0 else .08, .004, .006),
                  emissive('Tick', (.9, .9, .9), 2), None, .0)
    # 1 m line where the measurement stops, and the 3 m model horizon.
    props.box('Measured 1 m', (0, -.006, -1.0), (W, .003, .006), emissive('Measured line', (1, 1, 1), 4), None, 0)
    props.box('Model horizon 3 m', (0, -.006, -depths[2]), (W, .003, .004), emissive('Horizon line', (.5, .7, 1), 3), None, 0)
    # Lighting: key from above-left, cool rim, black void.
    key = bpy.data.lights.new('Key', 'AREA'); key.size = 3; key.energy = 220; key.color = (1, .9, .8)
    ko = bpy.data.objects.new('Key', key); sc.collection.objects.link(ko); ko.location = (-2.5, -2.5, 2.5)
    ko.rotation_euler = (Vector((0, .5, -1.2)) - ko.location).to_track_quat('-Z', 'Y').to_euler()
    rim = bpy.data.lights.new('Rim', 'AREA'); rim.size = 2; rim.energy = 90; rim.color = (.6, .75, 1)
    ro = bpy.data.objects.new('Rim', rim); sc.collection.objects.link(ro); ro.location = (2.8, -1.0, -2.5)
    ro.rotation_euler = (Vector((0, .5, -2)) - ro.location).to_track_quat('-Z', 'Y').to_euler()
    w = bpy.data.worlds.new('Void'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (.004, .004, .005, 1)
    # Camera: starts at the surface on the drill, cranes down past 1 m to the estimate band.
    rig_camera('Section cam', [(1, (1.3, -3.2, .55), (0, 0, -.25)), (30, (1.5, -4.6, -.5), (0, 0, -.9)),
                               (72, (1.2, -7.2, -1.5), (0, 0, -1.75))], lens=35, fstop=8, shake=.0008)
    sc.view_settings.exposure = .2
    MARKS.update({'surface': (-W / 2, -.01, 0), 'measured': (-W / 2, -.01, -1.0), 'median': (-W / 2, -.01, -depths[1]),
                  'shallow': (-W / 2, -.01, -depths[0]), 'horizon': (-W / 2, -.01, -depths[2]), 'bore': (0, -.01, -1.0)})
    return 72


SHOTS = {'section': shot_section, 'console_wide': shot_console_wide, 'console_review': shot_console_review, 'drill': shot_drill, 'walk': shot_walk, 'pov': shot_pov, 'orbit': shot_orbit}


def main():
    global OUT
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('shot', choices=list(SHOTS))
    ap.add_argument('--preview', action='store_true')
    ap.add_argument('--still', type=int)
    ap.add_argument('--frames')
    ap.add_argument('--samples', type=int)
    ap.add_argument('--save', action='store_true')
    ap.add_argument('--layout', action='store_true')
    ap.add_argument('--revision', default='v3', choices=['v2','v3'])
    a = ap.parse_args(argv)
    OUT = ROOT / 'assets/renders' / a.revision
    end = SHOTS[a.shot](a.preview)
    if bpy.context.scene.get('engine') == 'EEVEE' and not a.layout:
        mars.render_settings(res=RES, pct=50 if a.preview else 100, engine='BLENDER_EEVEE')
        bpy.context.scene.eevee.taa_render_samples = 32 if a.preview else 96
        bpy.context.scene.eevee.use_raytracing = True
    elif a.layout:
        mars.render_settings(res=RES, pct=40, engine='BLENDER_EEVEE')
        bpy.context.scene.eevee.taa_render_samples = 8
        a.preview = True
        for ob in bpy.data.objects:
            m = ob.modifiers.get('Adaptive')
            if m:
                m.render_levels = 1
    if bpy.context.scene.get('engine') != 'EEVEE' and not a.layout:
        mars.render_settings(samples=a.samples or (24 if a.preview else 64), res=RES, pct=50 if a.preview else 100)
    sc = bpy.context.scene
    sc.render.use_persistent_data = True
    sc.frame_start, sc.frame_end = 1, end
    if a.frames:
        sc.frame_start, sc.frame_end = map(int, a.frames.split(':'))
    folder = OUT / (a.shot + ('-anim' if a.layout and not a.still else '-preview' if a.preview else ''))
    folder.mkdir(parents=True, exist_ok=True)
    if a.save:
        bpy.ops.wm.save_as_mainfile(filepath=str(folder / f'{a.shot}.blend'))
    if SCREENS or MARKS:
        export_screens(a.shot, end)
    if a.still:
        sc.frame_set(a.still)
        sc.render.filepath = str(folder / f'still_{a.still:04d}.png')
        bpy.ops.render.render(write_still=True)
    else:
        sc.render.filepath = str(folder / '####')
        bpy.ops.render.render(animation=True)


if __name__ == '__main__':
    main()
