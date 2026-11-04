#!/usr/bin/env bash
# Build Reels + carousel dari folder job/ (dijalankan di GitHub Actions dari akar repo).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf out && mkdir -p out job/fonts tools/model

# 1. Dependensi
( cd tools && npm install --no-audit --no-fund --silent && npx playwright install --with-deps chromium )
pip install -q kokoro-onnx soundfile

# 2. Font merek (woff2 dari @fontsource) ke job/fonts
F=tools/node_modules/@fontsource
cp $F/bricolage-grotesque/files/bricolage-grotesque-latin-{700,800}-normal.woff2 job/fonts/
cp $F/plus-jakarta-sans/files/plus-jakarta-sans-latin-{500,600,700,800}-normal.woff2 job/fonts/
cp $F/ibm-plex-mono/files/ibm-plex-mono-latin-{600,700}-normal.woff2 job/fonts/
cp $F/tinos/files/tinos-latin-{400,700}-normal.woff2 job/fonts/ 2>/dev/null || true

# 3. Model suara (Kokoro, fp32) dari GitHub releases
curl -sSL --fail -o tools/model/kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -sSL --fail -o tools/model/voices-v1.0.bin https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin

# 4. Render
python3 tools/tts.py
node tools/render_reel.js
node tools/render_carousel.js

# 5. Manifest
python3 - <<'PY'
import json, os, glob
job = json.load(open("job/job.json"))
m = {"source_sha": os.environ.get("SOURCE_SHA", ""), "slug": job["slug"],
     "files": sorted(p[len("out/"):] for p in glob.glob("out/**/*", recursive=True) if os.path.isfile(p))}
json.dump(m, open("out/manifest.json", "w"), indent=1)
print(json.dumps(m, indent=1))
PY
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,sample_rate:format=duration,size -of compact out/reel.mp4
