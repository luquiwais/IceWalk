"""Read-only material diagnostics for a saved Blender scene or a shot builder.
blender -b scene.blend --python blender/audit_materials.py -- report.json
blender -b --python blender/audit_materials.py -- report.json --shot orbit
"""
import argparse,json,sys
from pathlib import Path
import bpy

ap=argparse.ArgumentParser();ap.add_argument('report');ap.add_argument('--shot')
a=ap.parse_args(sys.argv[sys.argv.index('--')+1:])
if a.shot:
    sys.path.insert(0,str(Path(__file__).parent/'v2'))
    import shots
    shots.SHOTS[a.shot](False)

used={m for ob in bpy.context.scene.objects if ob.type=='MESH' and not ob.hide_render for m in ob.data.materials if m}
issues=[];materials=[]
for mat in sorted(used,key=lambda m:m.name):
    row={'name':mat.name,'shaders':[],'images':[]}
    if mat.use_nodes:
        for n in mat.node_tree.nodes:
            if n.type=='BSDF_PRINCIPLED':
                values={k:float(n.inputs[k].default_value) for k in ('IOR','Roughness','Metallic')}
                row['shaders'].append(values)
                if values['IOR']>3:issues.append({'material':mat.name,'problem':'Nonphysical imported dielectric IOR','value':values['IOR']})
            if n.type=='TEX_IMAGE' and n.image:
                im=n.image;file=Path(bpy.path.abspath(im.filepath))
                row['images'].append({'name':im.name,'size':list(im.size),'color_space':im.colorspace_settings.name,'packed':bool(im.packed_file)})
                if not im.packed_file and not file.is_file():issues.append({'material':mat.name,'problem':'Missing image','image':im.name})
                if 'normal' in im.name.lower() and im.colorspace_settings.name!='Non-Color':issues.append({'material':mat.name,'problem':'Normal texture is not Non-Color','image':im.name})
    materials.append(row)
report={'scene':bpy.data.filepath,'material_count':len(materials),'issues':issues,'materials':materials}
Path(a.report).write_text(json.dumps(report,indent=2))
print('MATERIAL_AUDIT',len(materials),'materials',json.dumps(issues),flush=True)
