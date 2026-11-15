"""Mars surface set for site S1094b, built from the real HiRISE DTM and boulder detections.

Local frame: origin at station E03S24 (grid 300, -2400 m), +Y grid north, Z metres above
the DTM at the origin. Terrain uses Cycles adaptive subdivision with PBR micro-displacement.
HiRISE DTM DTEEC_073578_2155_073077_2155_A01: NASA/JPL-Caltech/UArizona, USGS (CC0).
Textures and rock scans: Poly Haven (CC0).
"""
import json
import math
import random
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SITE = json.loads((ROOT / 'public/site/s1094b-3d.json').read_text())
PH = ROOT / 'assets/polyhaven'
ORIGIN = (300.0, -2400.0)
HAZE = (0.62, 0.43, 0.29)
GRAVITY = 3.721


def dtm():
    lv = SITE['levels']['detail']
    w, h = lv['size']
    a = np.fromfile(ROOT / 'public/site/s1094b-dtm-detail.bin', dtype='<u2').reshape(h, w).astype(np.float32)
    z = lv['z_min_m'] + a * lv['z_scale_m']
    return lv, z


def height_at(lv, z, x, y):
    b = lv['box_m']
    step = lv['step_m']
    h, w = z.shape
    fx = np.clip((x - b['xmin']) / step, 0, w - 1.001)
    fy = np.clip((b['ymax'] - y) / step, 0, h - 1.001)
    x0, y0 = int(fx), int(fy)
    tx, ty = fx - x0, fy - y0
    return (z[y0, x0] * (1 - tx) * (1 - ty) + z[y0, x0 + 1] * tx * (1 - ty) +
            z[y0 + 1, x0] * (1 - tx) * ty + z[y0 + 1, x0 + 1] * tx * ty)


LV, Z = None, None
Z0 = 0.0


def ground(x, y):
    """Local terrain height (m) at local x, y."""
    return float(height_at(LV, Z, x + ORIGIN[0], y + ORIGIN[1]) - Z0)


def tex(n, path, space, vec):
    t = n.new('ShaderNodeTexImage')
    t.image = bpy.data.images.load(str(path), check_existing=True)
    t.image.colorspace_settings.name = space
    t.interpolation = 'Cubic'
    vec and n.id_data.links.new(vec, t.inputs[0])
    return t


def haze(mat, out_socket, strength=1.0, dist=900.0):
    """Aerial perspective: blend toward the dusty sky colour with camera distance."""
    # This emission approximates atmosphere; it is not a terrain/rock light source.
    # Sampling every displaced terrain triangle as a light exhausts GPU memory.
    mat.cycles.emission_sampling = 'NONE'
    n, l = mat.node_tree.nodes, mat.node_tree.links
    out = next(x for x in n if x.bl_idname == 'ShaderNodeOutputMaterial')
    cam = n.new('ShaderNodeCameraData')
    m = n.new('ShaderNodeMath'); m.operation = 'DIVIDE'; m.inputs[1].default_value = dist
    l.new(cam.outputs['View Distance'], m.inputs[0])
    e = n.new('ShaderNodeMath'); e.operation = 'EXPONENT'
    neg = n.new('ShaderNodeMath'); neg.operation = 'MULTIPLY'; neg.inputs[1].default_value = -1
    l.new(m.outputs[0], neg.inputs[0]); l.new(neg.outputs[0], e.inputs[0])
    inv = n.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1
    l.new(e.outputs[0], inv.inputs[1])
    s = n.new('ShaderNodeMath'); s.operation = 'MULTIPLY'; s.inputs[1].default_value = .85 * strength
    l.new(inv.outputs[0], s.inputs[0])
    em = n.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*HAZE, 1); em.inputs['Strength'].default_value = 1.0
    mix = n.new('ShaderNodeMixShader')
    l.new(s.outputs[0], mix.inputs[0]); l.new(out_socket, mix.inputs[1]); l.new(em.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], out.inputs['Surface'])


def regolith():
    mat = bpy.data.materials.new('Regolith S1094b')
    mat.use_nodes = True
    n, l = mat.node_tree.nodes, mat.node_tree.links
    bs = n['Principled BSDF']
    co = n.new('ShaderNodeTexCoord')
    sc1 = n.new('ShaderNodeMapping'); sc1.inputs['Scale'].default_value = (.42, .42, .42)
    sc2 = n.new('ShaderNodeMapping'); sc2.inputs['Scale'].default_value = (.23, .23, .23)
    sc2.inputs['Rotation'].default_value = (0, 0, .7)
    l.new(co.outputs['Object'], sc1.inputs[0]); l.new(co.outputs['Object'], sc2.inputs[0])
    sand = {k: tex(n, PH / 'red_sand' / f'{k}.jpg', 'sRGB' if k == 'diff' else 'Non-Color', sc1.outputs[0]) for k in ('diff', 'rough', 'disp')}
    rock = {k: tex(n, PH / 'rocky_terrain_02' / f'{k}.jpg', 'sRGB' if k == 'diff' else 'Non-Color', sc2.outputs[0]) for k in ('diff', 'rough', 'disp')}
    # Large-scale mask: patches of pebbly lag deposit within fine dust.
    noise = n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = .05; noise.inputs['Detail'].default_value = 6
    noise.inputs['Roughness'].default_value = .62
    l.new(co.outputs['Object'], noise.inputs['Vector'])
    ramp = n.new('ShaderNodeMapRange'); ramp.inputs[1].default_value = .42; ramp.inputs[2].default_value = .62
    l.new(noise.outputs['Fac'], ramp.inputs[0])
    mixc = n.new('ShaderNodeMix'); mixc.data_type = 'RGBA'
    l.new(ramp.outputs[0], mixc.inputs['Factor']); l.new(sand['diff'].outputs[0], mixc.inputs[6]); l.new(rock['diff'].outputs[0], mixc.inputs[7])
    # Grade toward Mars regolith: keep only the scan's luminance, colour from Mars albedo.
    bw = n.new('ShaderNodeRGBToBW')
    l.new(mixc.outputs[2], bw.inputs[0])
    curve = n.new('ShaderNodeMapRange'); curve.inputs[1].default_value = .05; curve.inputs[2].default_value = .75
    curve.inputs[3].default_value = .35; curve.inputs[4].default_value = 1.25
    l.new(bw.outputs[0], curve.inputs[0])
    var = n.new('ShaderNodeTexNoise'); var.inputs['Scale'].default_value = .9; var.inputs['Detail'].default_value = 4
    l.new(co.outputs['Object'], var.inputs['Vector'])
    pal = n.new('ShaderNodeValToRGB')
    pal.color_ramp.elements[0].color = (.30, .14, .065, 1); pal.color_ramp.elements[1].color = (.42, .23, .12, 1)
    l.new(var.outputs['Fac'], pal.inputs[0])
    tint = n.new('ShaderNodeMix'); tint.data_type = 'RGBA'; tint.blend_type = 'MULTIPLY'; tint.inputs['Factor'].default_value = 1.0
    l.new(pal.outputs[0], tint.inputs[6]); l.new(curve.outputs[0], tint.inputs[7])
    l.new(tint.outputs[2], bs.inputs['Base Color'])
    mixr = n.new('ShaderNodeMix'); mixr.data_type = 'FLOAT'
    l.new(ramp.outputs[0], mixr.inputs['Factor']); l.new(sand['rough'].outputs[0], mixr.inputs[2]); l.new(rock['rough'].outputs[0], mixr.inputs[3])
    rr = n.new('ShaderNodeMapRange'); rr.inputs[3].default_value = .82; rr.inputs[4].default_value = 1.0
    l.new(mixr.outputs[0], rr.inputs[0]); l.new(rr.outputs[0], bs.inputs['Roughness'])
    bs.inputs['Specular IOR Level'].default_value = .2
    # Displacement: fine ripples + pebbles, plus a broad low-frequency undulation.
    mixd = n.new('ShaderNodeMix'); mixd.data_type = 'FLOAT'
    l.new(ramp.outputs[0], mixd.inputs['Factor']); l.new(sand['disp'].outputs[0], mixd.inputs[2]); l.new(rock['disp'].outputs[0], mixd.inputs[3])
    big = n.new('ShaderNodeTexNoise'); big.inputs['Scale'].default_value = .35; big.inputs['Detail'].default_value = 3
    l.new(co.outputs['Object'], big.inputs['Vector'])
    add = n.new('ShaderNodeMath'); add.operation = 'MULTIPLY_ADD'; add.inputs[1].default_value = .35
    l.new(big.outputs['Fac'], add.inputs[0]); l.new(mixd.outputs[0], add.inputs[2])
    disp = n.new('ShaderNodeDisplacement'); disp.inputs['Scale'].default_value = .055; disp.inputs['Midlevel'].default_value = .5
    l.new(add.outputs[0], disp.inputs['Height'])
    out = n['Material Output']
    l.new(disp.outputs[0], out.inputs['Displacement'])
    mat.displacement_method = 'BOTH'
    haze(mat, bs.outputs[0])
    return mat


def terrain(half=420.0, step=2.0):
    """DTM mesh around the origin, adaptive micro-displacement in Cycles."""
    global LV, Z, Z0
    LV, Z = dtm()
    Z0 = float(height_at(LV, Z, *ORIGIN))
    xs = np.arange(-half, half + step, step)
    nx = len(xs)
    verts = [(x, y, ground(x, y)) for y in xs for x in xs]
    faces = [(j * nx + i, j * nx + i + 1, (j + 1) * nx + i + 1, (j + 1) * nx + i) for j in range(nx - 1) for i in range(nx - 1)]
    me = bpy.data.meshes.new('Terrain S1094b')
    me.from_pydata(verts, [], faces)
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new('Terrain S1094b', me)
    bpy.context.scene.collection.objects.link(ob)
    sub = ob.modifiers.new('Adaptive', 'SUBSURF'); sub.subdivision_type = 'SIMPLE'
    sub.levels = 0; sub.render_levels = 7
    try:
        sub.use_adaptive_subdivision = True
        sub.adaptive_pixel_size = 1.5
    except AttributeError:
        ob.cycles.use_adaptive_subdivision = True
        ob.cycles.dicing_rate = 1.5
    ob.data.materials.append(regolith())
    return ob


def rock_library():
    lib = bpy.data.collections.new('Rock library')
    bpy.context.scene.collection.children.link(lib)
    lib.hide_render = True
    rocks = []
    for name in ('boulder_01', 'moon_rock_01', 'moon_rock_03', 'moon_rock_05'):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(PH / name / f'{name}.gltf'))
        new = [o for o in bpy.data.objects if o not in before]
        mesh = next(o for o in new if o.type == 'MESH')
        mesh.parent = None
        for o in new:
            for c in o.users_collection:
                c.objects.unlink(o)
            if o is not mesh:
                bpy.data.objects.remove(o)
        lib.objects.link(mesh)
        dims = mesh.dimensions
        s = 1.0 / max(dims.x, dims.y)
        mesh.scale = (s, s, s)
        bpy.context.view_layer.update()
        bb = [mesh.matrix_world @ Vector(c) for c in mesh.bound_box]
        mesh['base'] = min(v.z for v in bb)
        mesh['height'] = max(v.z for v in bb) - mesh['base']
        for m in mesh.data.materials:
            if m and m.use_nodes:
                bs = m.node_tree.nodes.get('Principled BSDF')
                if bs:
                    # Basaltic rock under iron-oxide dust: scan luminance, Mars colour; dust on top faces.
                    src = bs.inputs['Base Color'].links[0].from_socket if bs.inputs['Base Color'].links else None
                    if src:
                        nn, ll = m.node_tree.nodes, m.node_tree.links
                        bw = nn.new('ShaderNodeRGBToBW'); ll.new(src, bw.inputs[0])
                        rock = nn.new('ShaderNodeMix'); rock.data_type = 'RGBA'; rock.blend_type = 'MULTIPLY'; rock.inputs['Factor'].default_value = 1
                        rock.inputs[6].default_value = (.20, .13, .09, 1); ll.new(bw.outputs[0], rock.inputs[7])
                        geo = nn.new('ShaderNodeNewGeometry'); sep = nn.new('ShaderNodeSeparateXYZ'); ll.new(geo.outputs['Normal'], sep.inputs[0])
                        up = nn.new('ShaderNodeMapRange'); up.inputs[1].default_value = .55; up.inputs[2].default_value = .95
                        ll.new(sep.outputs['Z'], up.inputs[0])
                        dust = nn.new('ShaderNodeMix'); dust.data_type = 'RGBA'; ll.new(up.outputs[0], dust.inputs['Factor'])
                        ll.new(rock.outputs[2], dust.inputs[6]); dust.inputs[7].default_value = (.36, .19, .10, 1)
                        ll.new(dust.outputs[2], bs.inputs['Base Color'])
                        bs.inputs['Roughness'].default_value = .85
                    haze(m, bs.outputs[0])
        for p in mesh.data.polygons:
            p.use_smooth = True
        rocks.append(mesh)
    return rocks


def place_rock(rocks, x, y, diameter, height, rnd, name='Rock'):
    src = rnd.choice(rocks)
    ob = bpy.data.objects.new(name, src.data)
    bpy.context.scene.collection.objects.link(ob)
    s = diameter * src.scale.x
    hz = height / max(src['height'] / src.scale.x * s, 1e-3) if height else rnd.uniform(.45, .8)
    ob.scale = (s, s * rnd.uniform(.8, 1.2), s * hz)
    ob.rotation_euler = (rnd.uniform(-.15, .15), rnd.uniform(-.15, .15), rnd.uniform(0, math.tau))
    ob.location = (x, y, ground(x, y) - (src['base'] / src.scale.x) * s * hz - height * .18 if height else ground(x, y) - diameter * .12)
    return ob


def boulders(rocks, radius=420.0):
    """Real HiRISE boulder detections (diameter, height) around the site."""
    rnd = random.Random(7)
    count = 0
    for x, y, d, h, form, conf in SITE['levels']['detail']['boulders'] + SITE['levels']['overview']['boulders']:
        lx, ly = x - ORIGIN[0], y - ORIGIN[1]
        if abs(lx) < radius and abs(ly) < radius:
            place_rock(rocks, lx, ly, d, h, rnd, 'HiRISE boulder')
            count += 1
    return count


def scatter(rocks, center, radius, n, dmin, dmax, seed=3, avoid=()):
    """Sub-resolution rocks (below HiRISE detection), power-law sizes."""
    rnd = random.Random(seed)
    for _ in range(n):
        r = radius * math.sqrt(rnd.random())
        a = rnd.uniform(0, math.tau)
        x, y = center[0] + r * math.cos(a), center[1] + r * math.sin(a)
        if any((x - ax) ** 2 + (y - ay) ** 2 < ar ** 2 for ax, ay, ar in avoid):
            continue
        u = rnd.random()
        d = dmin * (dmax / dmin) ** (u ** 2.2)
        place_rock(rocks, x, y, d, 0, rnd, 'Scatter rock')


def sky(sun_elevation=20.0, sun_azimuth=235.0, strength=.22):
    sc = bpy.context.scene
    w = bpy.data.worlds.new('Mars sky')
    sc.world = w
    w.use_nodes = True
    n, l = w.node_tree.nodes, w.node_tree.links
    bg = n['Background']
    geo = n.new('ShaderNodeTexCoord')
    sep = n.new('ShaderNodeSeparateXYZ'); l.new(geo.outputs['Normal'], sep.inputs[0])
    ramp = n.new('ShaderNodeValToRGB')
    cr = ramp.color_ramp
    cr.elements[0].position = 0.0; cr.elements[0].color = (.78, .58, .40, 1)
    cr.elements[1].position = .85; cr.elements[1].color = (.22, .13, .08, 1)
    e = cr.elements.new(.06); e.color = (.66, .46, .30, 1)
    e = cr.elements.new(.3); e.color = (.42, .27, .17, 1)
    pw = n.new('ShaderNodeMath'); pw.operation = 'MAXIMUM'; pw.inputs[1].default_value = 0
    l.new(sep.outputs['Z'], pw.inputs[0]); l.new(pw.outputs[0], ramp.inputs[0])
    l.new(ramp.outputs[0], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = strength
    # The camera sees the exposed dusty sky while the weaker sky fill preserves
    # directional sunlight, material contrast and contact shadows on the surface.
    camera_bg = n.new('ShaderNodeBackground')
    l.new(ramp.outputs[0], camera_bg.inputs['Color'])
    camera_bg.inputs['Strength'].default_value = .65
    path = n.new('ShaderNodeLightPath')
    mix = n.new('ShaderNodeMixShader')
    l.new(path.outputs['Is Camera Ray'], mix.inputs[0])
    l.new(bg.outputs[0], mix.inputs[1]); l.new(camera_bg.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], n['World Output'].inputs['Surface'])
    sun = bpy.data.lights.new('Sun', 'SUN')
    sun.energy = 6.0
    sun.color = (1.0, .93, .84)
    sun.angle = math.radians(.35)
    ob = bpy.data.objects.new('Sun', sun)
    sc.collection.objects.link(ob)
    el, az = math.radians(sun_elevation), math.radians(sun_azimuth)
    d = Vector((math.cos(el) * math.sin(az), math.cos(el) * math.cos(az), math.sin(el)))
    ob.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    return ob


def render_settings(samples=96, res=(1920, 1080), pct=100, engine='CYCLES'):
    sc = bpy.context.scene
    sc.render.engine = engine
    if engine == 'CYCLES':
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        sc.cycles.device = 'GPU'
        if hasattr(sc.cycles, 'feature_set'):
            sc.cycles.feature_set = 'EXPERIMENTAL'
        sc.cycles.samples = samples
        sc.cycles.use_denoising = True
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
        sc.cycles.max_bounces = 6
        sc.cycles.diffuse_bounces = 3
        sc.cycles.glossy_bounces = 3
        sc.cycles.use_adaptive_sampling = True
        sc.cycles.adaptive_threshold = .02
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = pct
    sc.render.fps = 24
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Base Contrast'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = .5
    sc.gravity = (0, 0, -GRAVITY)


def camera(name, loc, target, lens=35, fstop=2.8, focus=None, sensor=36):
    cam = bpy.data.cameras.new(name)
    cam.lens = lens
    cam.sensor_width = sensor
    cam.clip_start = .05
    cam.clip_end = 20000
    ob = bpy.data.objects.new(name, cam)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    if focus:
        cam.dof.use_dof = True
        cam.dof.aperture_fstop = fstop
        cam.dof.focus_distance = focus
    bpy.context.scene.camera = ob
    return ob


def build(radius=420.0, near=((0, 0, 60),), near_rocks=2500, seed=3):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    terr = terrain(half=radius)
    rocks = rock_library()
    nb = boulders(rocks, radius)
    for i, (cx, cy, r) in enumerate(near):
        scatter(rocks, (cx, cy), r, near_rocks, .04, .9, seed=seed + i, avoid=[(0, 0, 1.6)])
    print('MARS_SET boulders', nb, 'z0', round(Z0, 2))
    return terr, rocks
