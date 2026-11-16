#!/bin/zsh
# Encode complete final Blender sequences to public/v2/<shot>.mp4 (1920x804, 24 fps).
# Optional arguments select shots; previews are never substituted for final renders.
set -eu
setopt null_glob
cd "$(dirname $0)/.."
mkdir -p public/v2
typeset -A need
if [[ -f src/v2/shot-manifest.json ]]; then
  while read -r shot frames; do need[$shot]=$frames; done < <(python3 -c 'import json; d=json.load(open("src/v2/shot-manifest.json")); [print(k,v) for k,v in d.items()]')
else
  # Keep the fail-closed encoder usable in an isolated release check.
  need=(orbit 72 drill 60 section 72 console_wide 64 console_review 80 pov 60 walk 72)
fi
revision=${RENDER_REVISION:-v2}
if (( $# )); then
  shots=("$@")
else
  shots=(orbit drill section console_wide console_review pov walk)
fi
for shot in $shots; do
  if [[ -z ${need[$shot]-} ]]; then
    echo "unknown shot: $shot" >&2
    exit 1
  fi
  n=${need[$shot]}
  src=assets/renders/$revision/$shot
  for (( frame=1; frame<=n; frame++ )); do
    printf -v filename '%04d.png' $frame
    if [[ ! -s $src/$filename ]]; then
      echo "incomplete $shot: missing $filename ($n required)" >&2
      exit 1
    fi
  done
done
for shot in $shots; do
  n=${need[$shot]}
  src=assets/renders/$revision/$shot
  out=public/v2/$shot.mp4
  tmp=public/v2/.$shot-encoding.mp4
  ffmpeg -v error -y -framerate 24 -start_number 1 -i $src/%04d.png -vf "scale=1920:804:flags=lanczos,format=yuv420p" \
    -frames:v $n -c:v libx264 -preset slow -crf 14 -tune film $tmp
  mv -f $tmp $out
  echo "$shot <- $src ($n frames)"
  if [[ $revision == v3 && $shot == console_* ]]; then
    python3 -c 'import json,sys,pathlib; p=pathlib.Path("src/v2/render-status.json"); d=json.loads(p.read_text()); d[sys.argv[1]]=True; p.write_text(json.dumps(d,indent=2)+"\n")' "$shot"
  fi
done
