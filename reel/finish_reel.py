"""Langkah akhir build_reel.sh: cover.jpg, pemeriksaan video, manifest.json (dijalankan dari folder reel/)."""
import glob
import json
import os
import subprocess
import sys

from PIL import Image

im = Image.open("work/cover/b01_2.png").convert("RGB")
if im.size != (1080, 1920):
    im = im.resize((1080, 1920), Image.LANCZOS)
im.save("out/cover.jpg", quality=92)


def probe(*args):
    return subprocess.check_output(["ffprobe", "-v", "error", *args, "out/reel.mp4"]).decode()


dur = float(probe("-show_entries", "format=duration", "-of", "csv=p=0"))
v = json.loads(probe("-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,pix_fmt,r_frame_rate", "-of", "json"))["streams"][0]
a = probe("-select_streams", "a:0", "-show_entries", "stream=codec_name", "-of", "csv=p=0").strip()
log = subprocess.run(["ffmpeg", "-i", "out/reel.mp4", "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
mean = float(log.split("mean_volume:")[1].split("dB")[0])
mx = float(log.split("max_volume:")[1].split("dB")[0])
print(f"durasi {dur:.3f} s, video {v}, audio {a}, mean {mean} dB, max {mx} dB")
errs = []
if not 26 <= dur <= 34:
    errs.append(f"durasi {dur:.2f} s di luar 26-34")
if (v["codec_name"], v["width"], v["height"], v["pix_fmt"], v["r_frame_rate"]) != ("h264", 720, 1280, "yuv420p", "30/1"):
    errs.append(f"video {v}")
if a != "aac":
    errs.append(f"audio {a!r}")
if mx > -1.0 or mean < -40:
    errs.append(f"volume mean {mean} max {mx}")
if errs:
    sys.exit("ERROR: " + "; ".join(errs))
job = json.load(open("job/reel.json"))
m = {"source_sha": os.environ.get("SOURCE_SHA", ""), "slug": job["slug"], "duration": round(dur, 3),
     "volume": {"mean": mean, "max": mx},
     "files": sorted(p[len("out/"):] for p in glob.glob("out/**/*", recursive=True) if os.path.isfile(p)) + ["manifest.json"]}
json.dump(m, open("out/manifest.json", "w"), indent=1)
print(json.dumps(m, indent=1))
