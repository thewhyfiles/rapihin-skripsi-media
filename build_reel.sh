#!/usr/bin/env bash
# Reel build (Remotion) di GitHub Actions: audio (URL) + job/*.json -> reel.mp4 + cover.jpg -> pub/
set -euo pipefail
ROOT=$PWD
mkdir -p out pub public
if [ -s job/audio.url ]; then
  URL="$(tr -d '\r\n ' < job/audio.url)"
  curl -fsSL --retry 3 -o public/narasi.wav "$URL" || { echo "::error::Unduh audio gagal (URL berbagi Composio hanya berlaku sekitar 1 jam; HTTP 404 = kedaluwarsa). Jalankan ulang scripts/tts_workbench.py untuk URL baru lalu commit ulang."; exit 22; }
  ffprobe -v error -show_entries stream=codec_name,sample_rate,channels -show_entries format=duration -of compact public/narasi.wav
else
  echo "TIDAK ADA job/audio.url -> render tanpa suara"; rm -f public/narasi.wav
fi
npm install --no-audit --no-fund --loglevel=error
node scripts/mkprops.mjs
# cek durasi audio vs timing (toleransi 1,5 dtk)
if [ -f public/narasi.wav ]; then
  node -e "
const t=require('./job/timing.json');const e=t[t.length-1].start+t[t.length-1].dur;
const {execSync}=require('child_process');
const d=parseFloat(execSync('ffprobe -v error -show_entries format=duration -of csv=p=0 public/narasi.wav').toString());
console.log('audio',d,'timing',e);
if(Math.abs(d-e)>1.5){console.error('DURASI AUDIO TIDAK COCOK DENGAN TIMING');process.exit(1)}"
fi
npx remotion render src/index.tsx Reel out/raw.mp4 --concurrency="$(nproc)" --crf=18 --log=error
npx remotion still src/index.tsx Cover out/cover.png --log=error
# normalisasi: limited-range yuv420p, loudnorm ke -14 LUFS, AAC 48 kHz stereo, faststart
if [ -f public/narasi.wav ]; then AF="-af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -ac 2 -c:a aac -b:a 192k"; else AF="-an"; fi
ffmpeg -y -loglevel error -i out/raw.mp4 -vf "scale=in_range=pc:out_range=tv,format=yuv420p" -color_range tv -c:v libx264 -crf 20 -preset medium $AF -movflags +faststart pub/reel.mp4
ffmpeg -y -loglevel error -i out/cover.png -vf scale=1080:1920 -q:v 2 pub/cover.jpg
cp job/timing.json pub/timing.json
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt,sample_rate -show_entries format=duration,size -of compact pub/reel.mp4
