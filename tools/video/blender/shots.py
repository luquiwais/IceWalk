"""Renderiza planos del sitio desde site.blend. Uso:
blender -b blender/site.blend --python blender/shots.py -- SHOT [preview]
Salida: assets/renders/SHOT/####.png (1920x1080, 24 fps)."""
import bpy, math, os, sys
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SHOT = argv[0]
PREVIEW = len(argv) > 1 and argv[1] == "preview"
sc = bpy.context.scene
cam = sc.camera
SUN_ELEV, SUN_AZ = 6.5, 255.0


def set_sun(elev=SUN_ELEV, az=SUN_AZ):
    sun = bpy.data.objects["Sun"]
    sun.rotation_euler = (math.radians(90 - elev), 0, math.radians(az))
    # Disco solar visible (0.35° en Marte) muy lejos, en la dirección opuesta a la luz.
    d = sun.matrix_world.to_quaternion() @ Vector((0, 0, 1))
    if "SunDisk" not in bpy.data.objects:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=32, ring_count=16)
        disk = bpy.context.active_object; disk.name = "SunDisk"
        m = bpy.data.materials.new("SunDisk"); m.use_nodes = True
        n = m.node_tree.nodes; n.clear()
        e = n.new("ShaderNodeEmission"); e.inputs[0].default_value = (1.0, 0.93, 0.85, 1); e.inputs[1].default_value = 60
        o = n.new("ShaderNodeOutputMaterial"); m.node_tree.links.new(e.outputs[0], o.inputs[0])
        disk.data.materials.append(m)
        disk.visible_shadow = False
    disk = bpy.data.objects["SunDisk"]
    dist = 15000
    disk.location = d * dist
    disk.scale = [dist * math.tan(math.radians(0.35 / 2))] * 3


def look(frame, pos, target, lens=50, focus=None, fstop=4.0):
    cam.location = Vector(pos)
    cam.rotation_euler = (Vector(target) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = lens
    cam.data.dof.use_dof = focus is not None
    if focus is not None:
        cam.data.dof.focus_distance = focus
        cam.data.dof.aperture_fstop = fstop
    for prop in ("location", "rotation_euler"):
        cam.keyframe_insert(prop, frame=frame)
    cam.data.keyframe_insert("lens", frame=frame)
    if focus is not None:
        cam.data.dof.keyframe_insert("focus_distance", frame=frame)


def smooth_all():
    ad = cam.animation_data
    if ad and ad.action:
        for layer in getattr(ad.action, "layers", []):
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        for k in fc.keyframe_points:
                            k.interpolation = "BEZIER"; k.easing = "EASE_IN_OUT"


set_sun()
bpy.data.objects["SunDisk"].hide_render = True
if SHOT == "W1":
    # Plano general a contraluz: dos trajes, sombras largas hacia cámara, dolly lateral lento.
    n = 192
    look(1, (26.0, -12.5, 1.45), (0.0, -1.0, 1.15), lens=50, focus=27.0, fstop=5.6)
    look(n, (23.5, -5.5, 1.55), (0.0, -1.2, 1.15), lens=50, focus=24.0, fstop=5.6)
elif SHOT == "W2":
    # Subida a la órbita: de altura de casco a vista cenital (norte arriba) sobre el sitio.
    n = 120
    keys = [(1, (23.5, -5.5, 1.6), (0.0, -1.2, 1.15), 50), (30, (30.0, -10.0, 40.0), (0.0, -2.0, 0.0), 40),
            (70, (6.0, -60.0, 650.0), (0.0, -60.0, 0.0), 35), (n, (0.5, -150.0, 2400.0), (0.0, -150.0, 0.0), 35)]
    for f, p, t, lens in keys:
        look(f, p, t, lens=lens)
    # Al final mirar recto hacia abajo con el norte arriba.
    cam.rotation_euler = (0, 0, 0); cam.keyframe_insert("rotation_euler", frame=n)
    # La neblina se mide por distancia a cámara: al subir hay que alejarla para no tapar el suelo.
    ms = sc.world.mist_settings
    for f, start, depth in [(1, 40.0, 2600.0), (30, 60.0, 3000.0), (70, 500.0, 9000.0), (n, 2200.0, 30000.0)]:
        ms.start, ms.depth = start, depth
        ms.keyframe_insert("start", frame=f); ms.keyframe_insert("depth", frame=f)
elif SHOT == "P1":
    # Subjetivo de EV2: de E03S24 hacia E03S25 (100 m al sur), paso tranquilo con leve balanceo.
    n = 120
    for f in range(1, n + 1, 6):
        t = (f - 1) / (n - 1)
        y = -4.2 - 6.0 * t
        bob = 0.025 * math.sin(t * math.pi * 6)
        sway = 0.02 * math.sin(t * math.pi * 3)
        look(f, (-0.6 + sway, y, 1.66 + bob), (-0.6, y - 30.0, 0.6), lens=24)
else:
    raise SystemExit(f"unknown shot {SHOT}")

smooth_all()
sc.frame_start, sc.frame_end = 1, n
if PREVIEW:
    sc.render.resolution_percentage = 50
    sc.frame_step = 12
outdir = os.path.join(ROOT, "assets", "renders", SHOT + ("_preview" if PREVIEW else ""))
os.makedirs(outdir, exist_ok=True)
sc.render.filepath = os.path.join(outdir, "####")
sc.render.image_settings.file_format = "PNG"
bpy.ops.render.render(animation=True)
print("DONE", SHOT, outdir)
