import bpy, math, sys, os
from mathutils import Vector
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
engine = argv[0] if argv else "EEVEE"
out = argv[1] if len(argv) > 1 else "test"
sc = bpy.context.scene
if engine == "CYCLES":
    sc.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "METAL"; prefs.get_devices()
    for d in prefs.devices: d.use = True
    sc.cycles.device = "GPU"; sc.cycles.samples = 64; sc.cycles.use_denoising = True
cam = sc.camera
cam.location = Vector((22.0, -9.0, 1.55))
target = Vector((0.2, 0.0, 1.0))
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
cam.data.lens = 50
cam.data.dof.use_dof = True; cam.data.dof.focus_distance = (target - cam.location).length; cam.data.dof.aperture_fstop = 4.0
sc.render.filepath = os.path.join(os.path.dirname(__file__), "renders", out + ".png")
bpy.ops.render.render(write_still=True)
