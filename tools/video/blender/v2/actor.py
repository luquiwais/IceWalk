"""Z2 suit actor: skeleton fitted to the NASA Z2 mesh, smooth weights, CMU mocap retarget.

Retarget method: for every mapped bone, the target bone takes the source bone's
world-space rotation change from its rest pose (twist included) after aligning the
two rest directions. Joint positions follow the target's own bone lengths; root
translation is scaled by the leg-length ratio so feet stay planted.
Mocap: CMU Graphics Lab Motion Capture Database (BVH conversion by B. Hahne).
"""
import math
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[2]
Z2 = ROOT / 'assets/nasa/3d/Z2 Spacesuit.glb'
MOCAP = ROOT / 'assets/mocap/cmu'

# Joint layout measured on the Z2 mesh (metres, facing -Y, .L on +X).
J = {
    'pelvis': ((0, -.03, .93), (0, -.04, 1.12)),
    'spine': ((0, -.04, 1.12), (0, -.05, 1.32)),
    'chest': ((0, -.05, 1.32), (0, -.07, 1.52)),
    'neck': ((0, -.08, 1.55), (0, -.13, 1.66)),
    'head': ((0, -.13, 1.66), (0, -.18, 1.90)),
}
for s, k in (('L', 1), ('R', -1)):
    J |= {
        f'clavicle.{s}': ((.06 * k, -.08, 1.50), (.28 * k, -.10, 1.47)),
        f'upper_arm.{s}': ((.28 * k, -.10, 1.47), (.33 * k, -.38, 1.31)),
        f'forearm.{s}': ((.33 * k, -.38, 1.31), (.28 * k, -.62, 1.16)),
        f'hand.{s}': ((.28 * k, -.62, 1.16), (.28 * k, -.76, 1.06)),
        f'thigh.{s}': ((.12 * k, -.03, .91), (.17 * k, -.07, .52)),
        f'shin.{s}': ((.17 * k, -.07, .52), (.19 * k, -.04, .12)),
        f'foot.{s}': ((.19 * k, -.04, .12), (.19 * k, -.18, .04)),
        f'toe.{s}': ((.19 * k, -.18, .04), (.19 * k, -.27, .03)),
    }
PARENT = {'spine': 'pelvis', 'chest': 'spine', 'neck': 'chest', 'head': 'neck'}
for s in 'LR':
    PARENT |= {f'clavicle.{s}': 'chest', f'upper_arm.{s}': f'clavicle.{s}', f'forearm.{s}': f'upper_arm.{s}',
               f'hand.{s}': f'forearm.{s}', f'thigh.{s}': 'pelvis', f'shin.{s}': f'thigh.{s}',
               f'foot.{s}': f'shin.{s}', f'toe.{s}': f'foot.{s}'}
ORDER = ['pelvis', 'spine', 'chest', 'neck', 'head'] + [f'{b}.{s}' for s in 'LR' for b in
         ('clavicle', 'upper_arm', 'forearm', 'hand', 'thigh', 'shin', 'foot', 'toe')]

# target bone -> (source bone giving rotation, source joint the rest direction aims at)
MAP = {'pelvis': ('Hips', 'Spine'), 'spine': ('LowerBack', 'Spine'), 'chest': ('Spine', 'Neck'),
       'neck': ('Neck', 'Neck1'), 'head': ('Head', None)}
for s, side in (('L', 'Left'), ('R', 'Right')):
    MAP |= {f'clavicle.{s}': (f'{side}Shoulder', f'{side}Arm'), f'upper_arm.{s}': (f'{side}Arm', f'{side}ForeArm'),
            f'forearm.{s}': (f'{side}ForeArm', f'{side}Hand'), f'hand.{s}': (f'{side}Hand', f'{side}HandIndex1'),
            f'thigh.{s}': (f'{side}UpLeg', f'{side}Leg'), f'shin.{s}': (f'{side}Leg', f'{side}Foot'),
            f'foot.{s}': (f'{side}Foot', f'{side}ToeBase'), f'toe.{s}': (f'{side}ToeBase', None)}


def load_suit(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(Z2))
    new = [o for o in bpy.data.objects if o not in before]
    mesh = next(o for o in new if o.type == 'MESH')
    for o in new:
        if o is not mesh:
            bpy.data.objects.remove(o)
    mesh.name = name + '_suit'
    mesh.data = mesh.data.copy()
    # The scan ships as one glossy material. Keep its 4K colour/normal maps,
    # but separate cloth, hard hardware and the visor by actual scan geometry.
    base = mesh.data.materials[0].copy()
    base.name = name + ' woven pressure garment'
    bs = base.node_tree.nodes.get('Principled BSDF')
    if bs:
        bs.inputs['Roughness'].default_value = .82
        bs.inputs['IOR'].default_value = 1.46
        bs.inputs['Coat Weight'].default_value = 0
    shell = base.copy(); shell.name = name + ' hard upper torso'
    shell.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .5
    visor = bpy.data.materials.new(name + ' visor glass')
    visor.use_nodes = True
    vb = visor.node_tree.nodes['Principled BSDF']
    vb.inputs['Base Color'].default_value = (.009,.014,.021,1)
    vb.inputs['Metallic'].default_value = .65
    vb.inputs['Roughness'].default_value = .13
    vb.inputs['Coat Weight'].default_value = .75
    vb.inputs['Coat Roughness'].default_value = .08
    mesh.data.materials.clear()
    for mat in (base,shell,visor):mesh.data.materials.append(mat)
    world = mesh.matrix_world
    color_image=next((n.image for n in base.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and 'Color' in n.image.name),None)
    pixels=None
    if color_image:
        pixels=np.empty(len(color_image.pixels),dtype=np.float32)
        color_image.pixels.foreach_get(pixels)
        pixels=pixels.reshape(color_image.size[1],color_image.size[0],4)
    uv=mesh.data.uv_layers.active
    for p in mesh.data.polygons:
        p.use_smooth = True
        center = world @ p.center
        if 1.59 < center.z < 1.79 and center.y < -.23 and abs(center.x) < .19:
            # Do not paint white rim triangles black: classify using the scan's
            # actual colour texture as well as the anatomical visor region.
            if pixels is not None and uv:
                co=sum((uv.data[i].uv for i in p.loop_indices),Vector((0,0)))/len(p.loop_indices)
                rgb=pixels[int(co.y*color_image.size[1])%color_image.size[1],int(co.x*color_image.size[0])%color_image.size[0],:3]
                if float(rgb.mean()) < .13:p.material_index=2
        elif center.y > .05 and center.z > 1.03:
            p.material_index = 1
    return mesh


def build_rig(name):
    arm = bpy.data.armatures.new(name + '_rig')
    rig = bpy.data.objects.new(name + '_rig', arm)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    for b in ORDER:
        e = arm.edit_bones.new(b)
        e.head, e.tail = J[b]
        e.roll = 0
        if b in PARENT:
            e.parent = arm.edit_bones[PARENT[b]]
            e.use_connect = False
    # Non-deforming palm contacts let IK solve the actual grip point, not the wrist.
    for s in 'LR':
        wrist, tip = (Vector(p) for p in J[f'hand.{s}'])
        contact = arm.edit_bones.new(f'grip.{s}')
        contact.head = wrist
        contact.tail = wrist.lerp(tip, .55)
        contact.parent = arm.edit_bones[f'forearm.{s}']
        contact.use_deform = False
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    return rig


def _seg_dist(p, a, b):
    ab = b - a
    t = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1)
    return np.linalg.norm(p - (a + t[:, None] * ab), axis=1)


def skin(mesh, rig):
    """Smooth proximity weights with anatomical exclusions; every vertex sums to 1."""
    co = np.array([mesh.matrix_world @ v.co for v in mesh.data.vertices])
    names = ORDER
    d = np.stack([_seg_dist(co, np.array(J[n][0]), np.array(J[n][1])) for n in names], 1)
    x, y, z = co.T
    big = 1e3
    for i, n in enumerate(names):
        if n.endswith('.L'):
            d[x < -.02, i] = big
        if n.endswith('.R'):
            d[x > .02, i] = big
    helmet = (z > 1.58) & (np.abs(x) < .24) & (y < .02)
    plss = (y > .08) & (z > 1.0)
    for i, n in enumerate(names):
        # The Z2 hard upper torso carries the helmet: it does not turn with the head.
        if n != 'chest':
            d[helmet, i] = big
        if n == 'head':
            d[:, i] = big
        if n not in ('chest', 'spine'):
            d[plss, i] = big
    # Arm chain only takes vertices clearly outside the torso column or in front of it.
    armish = (np.abs(x) > .20) | (y < -.30)
    for i, n in enumerate(names):
        if n.split('.')[0] in ('upper_arm', 'forearm', 'hand'):
            d[~armish & (z > .98), i] = big
            d[z < .98, i] = big
    w = 1.0 / np.maximum(d, 1e-3) ** 8
    top = np.argsort(-w, 1)[:, :3]
    mask = np.zeros_like(w, bool)
    np.put_along_axis(mask, top, True, 1)
    w = np.where(mask, w, 0)
    w /= w.sum(1, keepdims=True)
    mesh.vertex_groups.clear()
    groups = [mesh.vertex_groups.new(name=n) for n in names]
    for vi in range(len(co)):
        for gi in np.nonzero(w[vi] > .01)[0]:
            groups[gi].add([vi], float(w[vi, gi]), 'REPLACE')
    mesh.parent = rig
    mod = mesh.modifiers.new('Skeleton', 'ARMATURE')
    mod.object = rig
    return mesh


def import_bvh(clip):
    before = set(bpy.data.objects)
    bpy.ops.import_anim.bvh(filepath=str(MOCAP / f'{clip}.bvh'), global_scale=1.0, rotate_mode='NATIVE',
                            axis_forward='-Z', axis_up='Y', use_fps_scale=False, update_scene_fps=False,
                            update_scene_duration=False)
    src = next(o for o in bpy.data.objects if o not in before)
    src.hide_render = True
    return src


def retarget(rig, clip, start, frames, slow=1.0, frame_offset=1, heading=0.0, offset=(0, 0, 0),
             arm_out=math.radians(12), ground=0.0, src=None, lock=False):
    """Bake `frames` target frames (24 fps) from BVH (120 fps) beginning at source frame `start`."""
    src = src or import_bvh(clip)
    sc = bpy.context.scene
    sb = src.data.bones
    tb = rig.data.bones
    k = ((J['thigh.L'][0][2] - J['toe.L'][1][2])) / ((sb['LeftUpLeg'].head_local - sb['LeftToeBase'].head_local).length)
    # Normalise the clip's initial facing to -Y, then apply the requested heading.
    sc.frame_set(int(start))
    hw = (src.matrix_world @ src.pose.bones['Hips'].matrix).to_3x3().normalized()
    hr = (src.matrix_world @ sb['Hips'].matrix_local).to_3x3().normalized()
    fwd = (hw @ hr.inverted()) @ Vector((0, -1, 0))
    yaw = math.atan2(fwd.x, -fwd.y)
    H = Matrix.Rotation(heading - yaw, 3, 'Z')
    A, srest = {}, {}
    for t, (s, aim) in MAP.items():
        sr = (src.matrix_world @ sb[s].matrix_local).to_3x3().normalized()
        srest[t] = sr
        sdir = (sb[aim].head_local - sb[s].head_local) if aim else (sb[s].tail_local - sb[s].head_local)
        sdir = (src.matrix_world.to_3x3() @ sdir).normalized()
        tdir = (tb[t].tail_local - tb[t].head_local).normalized()
        # Preserve the full heading rotation, including twist around vertical
        # torso bones. Reconstructing only a direction dropped that twist and
        # left the chest facing the source clip's original heading.
        A[t] = H @ tdir.rotation_difference(sdir).to_matrix()
    # Source ground: lowest toe over the clip.
    lows = []
    for i in range(frames):
        sf = start + i * 5 / slow
        sc.frame_set(int(sf), subframe=sf % 1)
        lows += [(src.matrix_world @ src.pose.bones[b].head).z for b in ('LeftToeBase', 'RightToeBase')]
    sground = min(lows)
    sc.frame_set(start)
    hip0 = H @ (src.matrix_world @ src.pose.bones['Hips'].head)
    rest_pelvis = Vector(J['pelvis'][0])
    sheight = (sb['Hips'].head_local - sb['LeftToeBase'].head_local).z
    for i in range(frames):
        sf = start + i * 5 / slow
        sc.frame_set(int(sf), subframe=sf % 1)
        pose = {}
        for t in ORDER:
            s, _ = MAP[t]
            spw = (src.matrix_world @ src.pose.bones[s].matrix).to_3x3().normalized()
            delta = H @ (spw @ srest[t].inverted()) @ H.inverted()
            rot = delta @ A[t] @ tb[t].matrix_local.to_3x3()
            if t.startswith('upper_arm'):
                sign = -1 if t.endswith('.L') else 1
                rot = Matrix.Rotation(sign * arm_out, 3, 'Y') @ rot
            if t == 'pelvis':
                hp = H @ (src.matrix_world @ src.pose.bones['Hips'].head)
                rel = (hp - hip0) * k
                if lock:
                    rel.x = rel.y = 0
                hz = (hp.z - sground) / sheight
                head = Vector((rest_pelvis.x + rel.x, rest_pelvis.y + rel.y, rest_pelvis.z * hz + ground))
            else:
                p = PARENT[t]
                local = tb[p].matrix_local.inverted() @ tb[t].head_local
                head = pose[p] @ local
            pose[t] = Matrix.Translation(head) @ rot.to_4x4()
        for t in ORDER:
            pb = rig.pose.bones[t]
            if t in PARENT:
                p = PARENT[t]
                rel_rest = tb[p].matrix_local.inverted() @ tb[t].matrix_local
                basis = rel_rest.inverted() @ pose[p].inverted() @ pose[t]
            else:
                basis = tb[t].matrix_local.inverted() @ pose[t]
            pb.matrix_basis = basis
            f = frame_offset + i
            pb.keyframe_insert('rotation_quaternion', frame=f)
            if t == 'pelvis':
                pb.keyframe_insert('location', frame=f)
    plant(rig, frame_offset, frames, ground)
    rig.location = offset
    return src


def plant(rig, first, frames, ground=0.0, sole=.035):
    """Shift the pelvis track so the lowest boot sole over the shot touches the ground."""
    sc = bpy.context.scene
    low = []
    for f in range(first, first + frames):
        sc.frame_set(f)
        low.append(min((rig.pose.bones[b].tail).z for b in ('toe.L', 'toe.R', 'foot.L', 'foot.R')))
    shift = ground + sole - sorted(low)[len(low) // 10]
    fc = rig.animation_data.action
    for f in range(first, first + frames):
        sc.frame_set(f)
        pb = rig.pose.bones['pelvis']
        # pose location is in bone space; pelvis bone points +Z so world Z maps to bone Y.
        pb.location.y += shift
        pb.keyframe_insert('location', frame=f)
    # Plant each support foot independently. A global pelvis offset alone left
    # boots floating/sliding whenever proportions differed from the mocap actor.
    for side in 'LR':
        path=[]
        for f in range(first, first + frames):
            sc.frame_set(f);bpy.context.view_layer.update()
            path.append(rig.pose.bones[f'foot.{side}'].head.copy())
        floor=min(p.z for p in path)
        target=empty(f'{rig.name} planted ankle {side}',path[0],rig)
        anchor=None
        for i,p in enumerate(path):
            contact=p.z <= floor + .045
            if contact:
                if anchor is None:anchor=Vector((p.x,p.y,ground+.13))
                value=anchor.copy()
            else:
                anchor=None;value=p.copy();value.z=max(value.z,ground+.13)
            target.location=value
            target.keyframe_insert('location',frame=first+i)
        ik=rig.pose.bones[f'shin.{side}'].constraints.new('IK')
        ik.target=target;ik.chain_count=2;ik.use_stretch=False
    return shift


def actor(name, clip, start, frames, slow=1.0, offset=(0, 0, 0), heading=0.0, rotation=0.0, frame_offset=1, lock=False):
    mesh = load_suit(name)
    rig = build_rig(name)
    skin(mesh, rig)
    retarget(rig, clip, start, frames, slow=slow, frame_offset=frame_offset, heading=heading, lock=lock)
    rig.location = offset
    rig.rotation_euler = (0, 0, rotation)
    return rig, mesh


def ik_arm(rig, side, target, pole=None, pole_angle=0.0):
    """Solve to the palm centre and make the glove follow that contact bone."""
    pb = rig.pose.bones[f'grip.{side}']
    c = pb.constraints.new('IK')
    c.target = target
    c.chain_count = 3
    c.use_stretch = False
    if pole:
        c.pole_target = pole
        c.pole_angle = pole_angle
    glove = rig.pose.bones[f'hand.{side}'].constraints.new('COPY_ROTATION')
    glove.target = rig
    glove.subtarget = f'grip.{side}'
    glove.target_space = 'WORLD'
    glove.owner_space = 'WORLD'
    return c


def empty(name, loc, parent=None):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.location = loc
    e.parent = parent
    return e
