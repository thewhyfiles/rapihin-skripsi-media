#!/usr/bin/env bash
# Render Reels Story 2D (skill dossier-motion) dari reel/job/ di GitHub Actions.
# Input: job/script.json (5 kalimat VO), job/gen_story.py (penulis story.json + cover_story.json),
#        job/brand-kit.json, job/reel.json ({"slug": ...}). Output: out/reel.mp4, out/cover.jpg,
#        out/contact.png, out/manifest.json.
set -euo pipefail
cd "$(dirname "$0")"
R=$(pwd)
rm -rf out work && mkdir -p out work model engine/assets/reels3d/fonts

# 1. Dependensi (SKIP_SETUP=1 untuk uji lokal)
if [ "${SKIP_SETUP:-0}" != "1" ]; then
  npm install --no-audit --no-fund --silent
  pip install -q playwright pillow numpy kokoro-onnx soundfile
  python3 -m playwright install --with-deps chromium
fi

# 2. Font panggung (woff2 dari @fontsource, nama sama dengan font bawaan skill)
F=node_modules/@fontsource
D=engine/assets/reels3d/fonts
cp $F/plus-jakarta-sans/files/plus-jakarta-sans-latin-{700,800}-normal.woff2 $D/
cp $F/inter/files/inter-latin-{400,500}-normal.woff2 $D/
cp $F/dm-serif-display/files/dm-serif-display-latin-400-normal.woff2 $D/
cp $F/jetbrains-mono/files/jetbrains-mono-latin-{500,700}-normal.woff2 $D/

# 3. Voice over (Kokoro am_michael) + waktu beat
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -s model/$f ] || curl -sSL --fail -o model/$f https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f
done
( cd model && python3 "$R/engine/scripts/mkvo.py" "$R/job/script.json" "$R/work/vo" )
ffmpeg -y -loglevel error -i work/vo/vo.wav -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 48000 work/vo/vo_n.wav

# 4. Story + cover dari generator hari ini
( cd job && TIMING="$R/work/vo/timing.json" OUT_DIR="$R/work" \
  FONT_WOFF="$R/$F/plus-jakarta-sans/files/plus-jakarta-sans-latin-%d-normal.woff" python3 gen_story.py )

# 5. Render
S=engine/scripts/story2d.py
python3 $S --kit job/brand-kit.json --beats work/story.json --stills "$R/work/stills"
cp work/stills/contact.png out/contact.png
python3 $S --kit job/brand-kit.json --beats work/story.json --out "$R/out/reel.mp4" --workdir "$R/work/beats" --jobs 2 --audio "$R/work/vo/vo_n.wav"
python3 $S --kit job/brand-kit.json --beats work/cover_story.json --stills "$R/work/cover" --size 1080x1920
# 6. Cover JPEG, pemeriksaan, manifest
python3 finish_reel.py
