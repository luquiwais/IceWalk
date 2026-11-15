#!/bin/zsh
# Final exports: H.264 1080p24, AAC 320 kb/s. Usage: scripts/export_films.sh [GlobalFilm] [LocalFilm]
set -eu
cd "$(dirname $0)/.."
mkdir -p out
if (( $# )); then
  ids=("$@")
else
  ids=(GlobalFilm LocalFilm)
fi
for id in $ids; do
  out=out/IceWalk-$id.mp4
  tmp=out/.IceWalk-$id-rendering.mp4
  node node_modules/@remotion/cli/remotionb-cli.js render src/index.ts $id $tmp \
    --codec=h264 --crf=16 --audio-codec=aac --audio-bitrate=320k --concurrency=6 --log=error
  ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact $tmp
  mv -f $tmp $out
done
