"""Illustrative EVA hardware: powered hand core drill (concept, not certified hardware)."""
import math

import bpy
from mathutils import Vector


def pbr(name, color, rough=.4, metal=0.0, coat=0.0, aniso=0.0, dust=True):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    bs = n['Principled BSDF']
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metal
    bs.inputs['Coat Weight'].default_value = coat
    if aniso:
        bs.inputs['Anisotropic'].default_value = aniso
    bs.inputs['IOR'].default_value = 1.46
    # Micro-scratches / grain so surfaces never look CG-perfect.
    noise = n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 900; noise.inputs['Detail'].default_value = 8
    mr = n.new('ShaderNodeMapRange'); mr.inputs[3].default_value = rough * .8; mr.inputs[4].default_value = min(1, rough * 1.35)
    l.new(noise.outputs['Fac'], mr.inputs[0]); l.new(mr.outputs[0], bs.inputs['Roughness'])
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .05; bump.inputs['Distance'].default_value = .0005
    l.new(noise.outputs['Fac'], bump.inputs['Height']); l.new(bump.outputs[0], bs.inputs['Normal'])
    # Fine Mars dust settling on upward faces.
    geo = n.new('ShaderNodeNewGeometry'); sep = n.new('ShaderNodeSeparateXYZ'); l.new(geo.outputs['Normal'], sep.inputs[0])
    up = n.new('ShaderNodeMapRange'); up.inputs[1].default_value = .4; up.inputs[2].default_value = 1; up.inputs[4].default_value = .45 if dust else 0
    l.new(sep.outputs['Z'], up.inputs[0])
    dust = n.new('ShaderNodeMix'); dust.data_type = 'RGBA'
    l.new(up.outputs[0], dust.inputs['Factor']); dust.inputs[6].default_value = (*color, 1); dust.inputs[7].default_value = (.38, .21, .11, 1)
    l.new(dust.outputs[2], bs.inputs['Base Color'])
    return m


def _obj(name, mat, parent):
    ob = bpy.context.object
    ob.name = name
    ob.data.materials.append(mat)
    for p in ob.data.polygons:
        p.use_smooth = True
    ob.parent = parent
    return ob


def cyl(name, a, b, r, mat, parent, verts=48, bevel=.002):
    a, b = Vector(a), Vector(b)
    d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d.length, location=(a + b) / 2)
    ob = _obj(name, mat, parent)
    ob.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    if bevel:
        m = ob.modifiers.new('bevel', 'BEVEL'); m.width = bevel; m.segments = 3; m.limit_method = 'ANGLE'
    return ob


def box(name, at, size, mat, parent, bevel=.004):
    bpy.ops.mesh.primitive_cube_add(size=1, location=at)
    ob = _obj(name, mat, parent)
    ob.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    m = ob.modifiers.new('bevel', 'BEVEL'); m.width = bevel; m.segments = 4
    ob.modifiers.new('wn', 'WEIGHTED_NORMAL')
    return ob


def core_drill(name='Core drill'):
    """Origin at the bit tip. T-handles 1.5 m above the tip. Returns (root, spinner, handle points)."""
    root = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(root)
    spin = bpy.data.objects.new(name + ' spindle', None)
    bpy.context.scene.collection.objects.link(spin)
    spin.parent = root
    white = pbr('Drill white powder coat', (.62, .62, .60), .45, 0, .2)
    alu = pbr('Drill anodized aluminium', (.08, .085, .09), .32, 1.0)
    ti = pbr('Drill titanium', (.55, .53, .50), .22, 1.0, aniso=.6)
    rub = pbr('Drill rubber grip', (.015, .015, .016), .8)
    orange = pbr('Drill safety orange', (.75, .22, .03), .5, 0, .3)
    # Core tube with auger flights (spins). 1.1 m tube: the bit reaches 1 m below the collar.
    cyl('Core tube', (0, 0, .0), (0, 0, 1.1), .024, ti, spin)
    # A continuous helical flight carries cuttings upward. Stacked circular rings
    # were rotationally symmetric and hid the spindle motion entirely.
    turns, steps = 8.5, 544
    verts, faces = [], []
    for i in range(steps + 1):
        a = math.tau * turns * i / steps
        z = .035 + 1.02 * i / steps
        for r in (.024, .041):
            verts.append((r * math.cos(a), r * math.sin(a), z))
        if i:
            k = 2 * i
            faces.append((k - 2, k - 1, k + 1, k))
    me = bpy.data.meshes.new('Continuous auger helix')
    me.from_pydata(verts, [], faces)
    flight = bpy.data.objects.new('Continuous auger helix', me)
    bpy.context.scene.collection.objects.link(flight)
    flight.parent = spin
    flight.data.materials.append(ti)
    solid = flight.modifiers.new('Flight thickness', 'SOLIDIFY'); solid.thickness = .0025
    bevel = flight.modifiers.new('Machined flight edge', 'BEVEL'); bevel.width = .0007; bevel.segments = 2
    for p in me.polygons: p.use_smooth = True
    cyl('Cutting crown', (0, 0, -.004), (0, 0, .03), .026, alu, spin, verts=12)
    for i in range(4):
        box('Depth mark', (0, 0, .25 + i * .25), (.05, .05, .006), orange, spin, .001)
    # Drive head, motor, gearbox (static).
    cyl('Chuck', (0, 0, 1.1), (0, 0, 1.17), .034, alu, root)
    cyl('Gearbox', (0, 0, 1.17), (0, 0, 1.25), .062, white, root)
    cyl('Motor housing', (0, 0, 1.25), (0, 0, 1.47), .055, white, root)
    for i in range(10):
        a = i / 10 * math.tau
        box('Cooling fin', (math.cos(a) * .056, math.sin(a) * .056, 1.36), (.006, .006, .16), alu, root, .001).rotation_euler.z = a
    cyl('Motor cap', (0, 0, 1.47), (0, 0, 1.50), .05, alu, root)
    box('Battery pack', (0, .085, 1.35), (.08, .06, .16), white, root)
    box('Battery latch', (0, .117, 1.41), (.05, .008, .02), orange, root, .002)
    box('Status panel', (0, -.06, 1.39), (.045, .006, .06), alu, root, .002)
    # T-handle bar and rubber grips, sized for pressurized gloves.
    cyl('Handle bar', (-.30, 0, 1.5), (.30, 0, 1.5), .016, alu, root)
    cyl('Handle mast', (0, 0, 1.5), (0, 0, 1.55), .02, alu, root)
    cyl('Grip L', (.16, 0, 1.5), (.29, 0, 1.5), .024, rub, root)
    cyl('Grip R', (-.29, 0, 1.5), (-.16, 0, 1.5), .024, rub, root)
    return root, spin, {'L': Vector((.225, 0, 1.5)), 'R': Vector((-.225, 0, 1.5))}
