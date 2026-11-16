"""Arma la escena del sitio S1094b en Blender (sin interfaz).

Terreno: DTM HiRISE real (apps/web/public/site), texturas PBR CC0 de Poly Haven,
rocas en las posiciones detectadas por la visión de IceWalk, trajes Z2 y hábitat
de NASA 3D Resources, cielo marciano con bruma volumétrica y sol bajo.

Ejes Blender: X = este, Y = norte, Z = arriba; origen en E03S24.
"""
import json
import math
import os
import random

import bpy
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUB = os.path.join(ROOT, "public")
PH = os.path.join(ROOT, "assets", "polyhaven")
SITE = json.load(open(os.path.join(PUB, "site", "s1094b-3d.json")))
DATA = json.load(open(os.path.join(PUB, "data", "data.json")))
ORIGIN = DATA["stations_before"][0]["xy"]  # E03S24
HAB = DATA["route_before_xy"][0][0]


def load_level(name):
    lv = SITE["levels"][name]
    w, h = lv["size"]
    z = np.fromfile(os.path.join(PUB, lv["heightmap"].lstrip("/")), dtype="<u2").astype(np.float32).reshape(h, w) * lv["z_scale_m"]
    return lv, blur(z, 2.5 if name == "detail" else 1.2) + lv["z_min_m"]


def blur(z, sigma):
    """Gauss separable: quita el ruido de correlación del DTM sin mover el relieve general."""
    r = int(sigma * 3)
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2); k /= k.sum()
    pad = np.pad(z, r, mode="edge")
    a = np.apply_along_axis(lambda v: np.convolve(v, k, mode="valid"), 1, pad)
    return np.apply_along_axis(lambda v: np.convolve(v, k, mode="valid"), 0, a)


DET, ZDET = load_level("detail")
OVR, ZOVR = load_level("overview")


def height(x, y, lv=DET, Z=ZDET):
    b, s = lv["box_m"], lv["step_m"]
    h, w = Z.shape
    fx = min(w - 1.001, max(0.0, (x - b["xmin"]) / s))
    fy = min(h - 1.001, max(0.0, (b["ymax"] - y) / s))
    x0, y0 = int(fx), int(fy)
    tx, ty = fx - x0, fy - y0
    return (Z[y0, x0] * (1 - tx) + Z[y0, x0 + 1] * tx) * (1 - ty) + (Z[y0 + 1, x0] * (1 - tx) + Z[y0 + 1, x0 + 1] * tx) * ty


Z0 = height(*ORIGIN)


def ground(x, y):
    """Altura relativa a E03S24 usando el nivel detalle si cae dentro, si no el general."""
    b = DET["box_m"]
    if b["xmin"] <= x <= b["xmax"] and b["ymin"] <= y <= b["ymax"]:
        return height(x, y) - Z0
    return height(x, y, OVR, ZOVR) - Z0


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def grid_mesh(name, lv, Z, hole=None, drop=0.0):
    b, s = lv["box_m"], lv["step_m"]
    h, w = Z.shape
    xs = b["xmin"] + np.arange(w) * s - ORIGIN[0]
    ys = b["ymax"] - np.arange(h) * s - ORIGIN[1]
    X, Y = np.meshgrid(xs, ys)
    verts = np.stack([X, Y, Z - Z0 - drop], axis=-1).reshape(-1, 3)
    idx = np.arange(w * h).reshape(h, w)
    q = np.stack([idx[:-1, :-1], idx[1:, :-1], idx[1:, 1:], idx[:-1, 1:]], axis=-1).reshape(-1, 4)
    if hole is not None:
        cx = (X[:-1, :-1] + X[1:, 1:]) / 2
        cy = (Y[:-1, :-1] + Y[1:, 1:]) / 2
        keep = ~((cx > hole[0]) & (cx < hole[1]) & (cy > hole[2]) & (cy < hole[3]))
        q = q[keep.reshape(-1)]
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(verts))
    me.vertices.foreach_set("co", verts.ravel())
    me.loops.add(q.size)
    me.loops.foreach_set("vertex_index", q.ravel())
    me.polygons.add(len(q))
    me.polygons.foreach_set("loop_start", np.arange(0, q.size, 4))
    me.polygons.foreach_set("loop_total", np.full(len(q), 4))
    # UV de la ortoimagen: u = este, v = norte.
    uv = me.uv_layers.new(name="hirise")
    vx = (verts[:, 0] + ORIGIN[0] - b["xmin"]) / (b["xmax"] - b["xmin"])
    vy = (verts[:, 1] + ORIGIN[1] - b["ymin"]) / (b["ymax"] - b["ymin"])
    luv = np.stack([vx[q.ravel()], vy[q.ravel()]], axis=-1)
    uv.data.foreach_set("uv", luv.ravel())
    me.update()
    me.validate()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def img(path, colorspace="sRGB"):
    im = bpy.data.images.load(path, check_existing=True)
    im.colorspace_settings.name = colorspace
    return im


def ground_material(name, hirise_path, near=True):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    N.clear()
    out = N.new("ShaderNodeOutputMaterial")
    bsdf = N.new("ShaderNodeBsdfPrincipled")
    L.new(bsdf.outputs[0], out.inputs[0])
    bsdf.inputs["Specular IOR Level"].default_value = 0.25
    # Macro: ortoimagen HiRISE (pancromática) → variación de albedo real del sitio.
    uvn = N.new("ShaderNodeUVMap"); uvn.uv_map = "hirise"
    hi = N.new("ShaderNodeTexImage"); hi.image = img(hirise_path, "Non-Color"); hi.interpolation = "Cubic"
    L.new(uvn.outputs[0], hi.inputs[0])
    macro = N.new("ShaderNodeMapRange")
    macro.inputs[1].default_value, macro.inputs[2].default_value = 0.25, 0.85
    macro.inputs[3].default_value, macro.inputs[4].default_value = 0.55, 1.25
    L.new(hi.outputs[0], macro.inputs[0])
    # Micro: texturas PBR con mosaico por coordenadas del objeto.
    tc = N.new("ShaderNodeTexCoord")
    mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (0.45, 0.45, 0.45)
    L.new(tc.outputs["Object"], mp.inputs[0])
    folder = os.path.join(PH, "red_laterite_soil_stones" if near else "rocky_terrain_02")
    diff = N.new("ShaderNodeTexImage"); diff.image = img(os.path.join(folder, "diff.jpg"))
    rough = N.new("ShaderNodeTexImage"); rough.image = img(os.path.join(folder, "rough.jpg"), "Non-Color")
    nor = N.new("ShaderNodeTexImage"); nor.image = img(os.path.join(folder, "nor.jpg"), "Non-Color")
    for t in (diff, rough, nor):
        L.new(mp.outputs[0], t.inputs[0])
    # Tono marciano: menos saturado y más ocre que la laterita terrestre.
    hsv = N.new("ShaderNodeHueSaturation")
    hsv.inputs["Hue"].default_value, hsv.inputs["Saturation"].default_value, hsv.inputs["Value"].default_value = 0.505, 0.78, 0.95
    L.new(diff.outputs[0], hsv.inputs["Color"])
    tint = N.new("ShaderNodeMix"); tint.data_type = "RGBA"; tint.blend_type = "MULTIPLY"; tint.inputs["Factor"].default_value = 0.55
    tint.inputs[7].default_value = (0.82, 0.52, 0.33, 1)
    L.new(hsv.outputs[0], tint.inputs[6])
    mul = N.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
    L.new(tint.outputs[2], mul.inputs[6])
    L.new(macro.outputs[0], mul.inputs[7])
    L.new(mul.outputs[2], bsdf.inputs["Base Color"])
    rr = N.new("ShaderNodeMapRange"); rr.inputs[3].default_value, rr.inputs[4].default_value = 0.75, 1.0
    L.new(rough.outputs[0], rr.inputs[0]); L.new(rr.outputs[0], bsdf.inputs["Roughness"])
    nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 1.2 if near else 0.8
    L.new(nor.outputs[0], nm.inputs["Color"]); L.new(nm.outputs[0], bsdf.inputs["Normal"])
    return m


def detail_patch(size=60.0, res=0.08):
    """Parche denso alrededor de E03S24 con desplazamiento real de piedras (planos cercanos)."""
    n = int(size / res)
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=n, y_subdivisions=n, size=size, location=(0, 0, 0))
    ob = bpy.context.active_object
    ob.name = "GroundPatch"
    me = ob.data
    co = np.zeros(len(me.vertices) * 3, dtype=np.float32)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    for i in range(len(co)):
        co[i, 2] = ground(co[i, 0] + ORIGIN[0], co[i, 1] + ORIGIN[1])
    me.vertices.foreach_set("co", co.ravel())
    # UV hirise para el macro.
    b = DET["box_m"]
    uv = me.uv_layers.new(name="hirise")
    loops = np.zeros(len(me.loops), dtype=np.int64)
    me.loops.foreach_get("vertex_index", loops)
    u = (co[loops, 0] + ORIGIN[0] - b["xmin"]) / (b["xmax"] - b["xmin"])
    v = (co[loops, 1] + ORIGIN[1] - b["ymin"]) / (b["ymax"] - b["ymin"])
    uv.data.foreach_set("uv", np.stack([u, v], -1).ravel())
    for p in me.polygons:
        p.use_smooth = True
    tex = bpy.data.textures.new("disp", "IMAGE")
    tex.image = img(os.path.join(PH, "red_laterite_soil_stones", "disp.jpg"), "Non-Color")
    mod = ob.modifiers.new("disp", "DISPLACE")
    mod.texture = tex
    mod.texture_coords = "OBJECT"
    mod.strength = 0.09
    mod.mid_level = 0.5
    # El mosaico del desplazamiento tiene que coincidir con el del color (escala 0.45 → 2.22 m).
    empty = bpy.data.objects.new("dispScale", None)
    bpy.context.scene.collection.objects.link(empty)
    empty.scale = (1 / 0.45, 1 / 0.45, 1 / 0.45)
    mod.texture_coords_object = empty
    return ob, size


def import_gltf(path, name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(root)
    for o in new:
        if o.parent is None:
            o.parent = root
    return root, new


def fit_height(root, objs, h):
    mins, maxs = np.full(3, 1e9), np.full(3, -1e9)
    bpy.context.view_layer.update()
    for o in objs:
        if o.type == "MESH":
            for c in o.bound_box:
                w = o.matrix_world @ __import__("mathutils").Vector(c)
                mins, maxs = np.minimum(mins, w), np.maximum(maxs, w)
    s = h / (maxs[2] - mins[2])
    root.scale = (s, s, s)
    return mins * s, maxs * s


def place(root, mins, x, y, rot):
    root.location = (x - ORIGIN[0], y - ORIGIN[1], ground(x, y) - mins[2] - 0.02)
    root.rotation_euler = (0, 0, rot)


def rocks():
    lib = []
    for r in ["moon_rock_01", "moon_rock_03", "moon_rock_05", "boulder_01"]:
        root, objs = import_gltf(os.path.join(PH, r, f"{r}.gltf"), r)
        meshes = [o for o in objs if o.type == "MESH"]
        for o in meshes:
            o.hide_render = True
            o.hide_viewport = True
            for mat in o.data.materials:
                bsdf = mat.node_tree.nodes.get("Principled BSDF") if mat and mat.use_nodes else None
                if bsdf:
                    bsdf.inputs["Specular IOR Level"].default_value = 0.15
                    nt = mat.node_tree
                    tex = bsdf.inputs["Base Color"].links[0].from_node if bsdf.inputs["Base Color"].links else None
                    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
                    mix.inputs["Factor"].default_value = 1.0; mix.inputs[7].default_value = (0.42, 0.26, 0.18, 1)
                    if tex:
                        nt.links.new(tex.outputs[0], mix.inputs[6])
                    else:
                        mix.inputs[6].default_value = (0.5, 0.5, 0.5, 1)
                    nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
        lib += meshes
    random.seed(7)
    col = bpy.data.collections.new("Boulders")
    bpy.context.scene.collection.children.link(col)
    for lvname in ["detail", "overview"]:
        for b in SITE["levels"][lvname]["boulders"]:
            x, y, d, hgt = b[0], b[1], b[2], b[3]
            if lvname == "overview" and DET["box_m"]["xmin"] <= x <= DET["box_m"]["xmax"] and DET["box_m"]["ymin"] <= y <= DET["box_m"]["ymax"]:
                continue
            src = random.choice(lib)
            o = bpy.data.objects.new("b", src.data)
            col.objects.link(o)
            dims = src.dimensions
            o.scale = (d / max(dims.x, 1e-3), d / max(dims.y, 1e-3), hgt / max(dims.z, 1e-3) * 1.4)
            o.rotation_euler = (0, 0, random.uniform(0, 6.28))
            o.location = (x - ORIGIN[0], y - ORIGIN[1], ground(x, y) - hgt * 0.6)
    # Piedras chicas solo cerca del sitio (los planos cercanos las necesitan).
    for i in range(900):
        r = 28 * math.sqrt(random.random()); a = random.uniform(0, 6.28)
        x, y = r * math.cos(a), r * math.sin(a)
        if abs(x) < 1.2 and abs(y) < 1.2:
            continue
        src = random.choice(lib)
        o = bpy.data.objects.new("p", src.data)
        col.objects.link(o)
        d = random.choice([0.04, 0.06, 0.08, 0.12, 0.18, 0.25, 0.4])
        dims = src.dimensions
        o.scale = (d / dims.x, d / dims.y, d * 0.7 / dims.z)
        o.rotation_euler = (random.uniform(0, 0.4), 0, random.uniform(0, 6.28))
        o.location = (x, y, ground(x + ORIGIN[0], y + ORIGIN[1]) - d * 0.3)


def suits():
    root, objs = import_gltf(os.path.join(PUB, "models", "z2.glb"), "EV1")
    mins, _ = fit_height(root, objs, 1.88)
    place(root, mins, ORIGIN[0] - 0.7, ORIGIN[1] + 0.3, math.radians(40))
    root2, objs2 = import_gltf(os.path.join(PUB, "models", "z2.glb"), "EV2")
    mins2, _ = fit_height(root2, objs2, 1.92)
    place(root2, mins2, ORIGIN[0] + 0.8, ORIGIN[1] - 2.6, math.radians(-120))
    return root, root2


def habitat():
    root, objs = import_gltf(os.path.join(PUB, "models", "hdu1.glb"), "Habitat")
    mins, _ = fit_height(root, objs, 6.5)
    place(root, mins, HAB[0], HAB[1], math.radians(200))
    return root


def world_and_light(sun_elev=11.0, sun_az=255.0):
    sc = bpy.context.scene
    w = bpy.data.worlds.new("Mars"); sc.world = w; w.use_nodes = True
    N, L = w.node_tree.nodes, w.node_tree.links
    N.clear()
    out = N.new("ShaderNodeOutputWorld")
    bg = N.new("ShaderNodeBackground"); bg.inputs[1].default_value = 1.15
    # Cielo marciano diurno: butterscotch, más claro y desaturado hacia el horizonte.
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ")
    L.new(tc.outputs["Generated"], sep.inputs[0])
    ramp = N.new("ShaderNodeValToRGB")
    els = ramp.color_ramp.elements
    els[0].position = 0.0; els[0].color = (0.30, 0.17, 0.10, 1)   # debajo del horizonte
    els[1].position = 0.5; els[1].color = (0.86, 0.66, 0.48, 1)   # horizonte, claro y desaturado
    e = els.new(0.56); e.color = (0.68, 0.47, 0.31, 1)
    e2 = els.new(1.0); e2.color = (0.38, 0.23, 0.14, 1)           # cenit, butterscotch oscuro
    mr = N.new("ShaderNodeMapRange"); mr.inputs[1].default_value, mr.inputs[2].default_value = -1.0, 1.0
    L.new(sep.outputs[2], mr.inputs[0]); L.new(mr.outputs[0], ramp.inputs[0])
    L.new(ramp.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.55
    L.new(bg.outputs[0], out.inputs["Surface"])
    # Perspectiva atmosférica por profundidad (pase Mist) en el compositor; ver compositor_haze().
    sun = bpy.data.lights.new("Sun", "SUN")
    sun.energy = 5.5; sun.angle = math.radians(0.35); sun.color = (1.0, 0.90, 0.80)
    so = bpy.data.objects.new("Sun", sun); sc.collection.objects.link(so)
    so.rotation_euler = (math.radians(90 - sun_elev), 0, math.radians(sun_az))


def compositor_haze(start=40.0, depth=2600.0, color=(0.80, 0.60, 0.44, 1.0), amount=0.82):
    sc = bpy.context.scene
    sc.view_layers[0].use_pass_mist = True
    sc.world.mist_settings.start = start
    sc.world.mist_settings.depth = depth
    sc.world.mist_settings.falloff = "QUADRATIC"
    tree = bpy.data.node_groups.new("Haze", "CompositorNodeTree")
    sc.compositing_node_group = tree
    N, L = tree.nodes, tree.links
    rl = N.new("CompositorNodeRLayers")
    out = N.new("NodeGroupOutput")
    tree.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    mul = N.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = amount
    L.new(rl.outputs["Mist"], mul.inputs[0])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MIX"
    mix.inputs[7].default_value = color
    L.new(mul.outputs[0], mix.inputs["Factor"]); L.new(rl.outputs["Image"], mix.inputs[6])
    L.new(mix.outputs[2], out.inputs[0])


def render_settings(engine="EEVEE", samples=64, res=(1920, 1080)):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.fps = 24
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - High Contrast"
    sc.view_settings.exposure = 0.45
    sc.render.film_transparent = False
    if engine == "CYCLES":
        sc.render.engine = "CYCLES"
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        sc.cycles.device = "GPU"
        sc.cycles.samples = samples
        sc.cycles.use_denoising = True
        sc.cycles.volume_step_rate = 4.0
    else:
        sc.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
        ee = sc.eevee
        ee.taa_render_samples = samples
        for attr, val in [("use_raytracing", True), ("use_shadows", True), ("volumetric_end", 3000.0), ("volumetric_tile_size", "4"), ("use_volumetric_shadows", True)]:
            if hasattr(ee, attr):
                setattr(ee, attr, val)


def build(engine="EEVEE"):
    reset()
    sc = bpy.context.scene
    patch, ps = detail_patch()
    half = ps / 2 - 0.5
    det = grid_mesh("TerrainDetail", DET, ZDET, hole=None, drop=0.07)
    b = DET["box_m"]
    hole = (b["xmin"] - ORIGIN[0] + 4, b["xmax"] - ORIGIN[0] - 4, b["ymin"] - ORIGIN[1] + 4, b["ymax"] - ORIGIN[1] - 4)
    ovr = grid_mesh("TerrainOverview", OVR, ZOVR, hole=None, drop=0.9)
    near = ground_material("GroundNear", os.path.join(PUB, "site", "s1094b-detail.webp"), near=True)
    far = ground_material("GroundFar", os.path.join(PUB, "site", "s1094b-overview.webp"), near=False)
    patch.data.materials.append(near); det.data.materials.append(near); ovr.data.materials.append(far)
    rocks()
    suits()
    habitat()
    world_and_light()
    render_settings(engine)
    try:
        compositor_haze()
    except Exception as e:  # la API del compositor cambió entre versiones; sin bruma igual renderiza
        print("HAZE_FAIL", e)
    cam = bpy.data.cameras.new("Cam"); cam.lens = 35; cam.sensor_width = 36; cam.clip_end = 20000
    co = bpy.data.objects.new("Cam", cam); sc.collection.objects.link(co); sc.camera = co
    return co


if __name__ == "__main__":
    build()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender", "site.blend"))
