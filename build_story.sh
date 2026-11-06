#!/usr/bin/env bash
# Story 2D reel build on GitHub Actions: VO (Kokoro am_michael) -> story.json (job/gen.py) -> render -> cover
set -euo pipefail
ROOT=$PWD; W=$ROOT/w
cat engine/stageparts/p1.js engine/stageparts/p2.js engine/stageparts/p3.js > engine/assets/story2d/stage.js
test "$(git hash-object engine/assets/story2d/stage.js)" = "62e11fd5573055bb029e8b72a68fe94c7e43d648" || echo "WARN: stage.js hash differs"
 rm -rf "$W"; mkdir -p "$W"; cp job/* "$W"/; cd "$W"
pip install -q kokoro-onnx==0.6.1 soundfile playwright pillow numpy
curl -sfL -O https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -sfL -O https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
python "$ROOT/engine/scripts/mkvo.py" script.json out
ffmpeg -y -loglevel error -i out/vo.wav -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 48000 out/vo_n.wav
python gen.py
F="$ROOT/engine/assets/reels3d/fonts"; mkdir -p "$F"
(cd /tmp && npm i -s @fontsource/plus-jakarta-sans@5 @fontsource/inter@5 @fontsource/dm-serif-display@5 @fontsource/jetbrains-mono@5)
for f in plus-jakarta-sans-latin-800-normal plus-jakarta-sans-latin-700-normal inter-latin-400-normal inter-latin-500-normal dm-serif-display-latin-400-normal jetbrains-mono-latin-500-normal jetbrains-mono-latin-700-normal; do
  cp "$(find /tmp/node_modules/@fontsource -name "$f.woff2" | head -1)" "$F/"
done
ls "$F"
S="$ROOT/engine/scripts/story2d.py"
python "$S" --kit brand-kit.json --beats story.json --out "$W/reel.mp4" --workdir "$W/work" --jobs "$(nproc)" --audio "$W/out/vo_n.wav"
# runner ffmpeg tags mjpeg-sourced beats as full-range yuvj420p -> normalize to limited-range yuv420p
ffmpeg -y -loglevel error -i "$W/reel.mp4" -vf "scale=in_range=pc:out_range=tv,format=yuv420p" -color_range tv -c:v libx264 -crf 20 -preset medium -c:a copy -movflags +faststart "$W/reel_tv.mp4" && mv "$W/reel_tv.mp4" "$W/reel.mp4"
python "$S" --kit brand-kit.json --beats cover_story.json --stills "$W/cover"
python -c "from PIL import Image; Image.open('$W/cover/b01_2.png').convert('RGB').resize((1080,1920), Image.LANCZOS).save('$W/cover.jpg', quality=92)"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt -show_entries format=duration -of compact "$W/reel.mp4"
mkdir -p "$ROOT/pub"; cp "$W/reel.mp4" "$W/cover.jpg" "$ROOT/pub/"; cp "$W/out/timing.json" "$ROOT/pub/timing.json"
