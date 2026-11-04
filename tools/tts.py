"""Buat VO per kalimat dari job/job.json dan cek muat di timeline."""
import json, os, sys
import soundfile as sf
from kokoro_onnx import Kokoro

job = json.load(open("job/job.json"))
k = Kokoro("tools/model/kokoro-v1.0.onnx", "tools/model/voices-v1.0.bin")
os.makedirs("out/audio", exist_ok=True)
v = job["voice"]
total = sum(job["scene_seconds"])
lines = job["lines"]
ok = True
durs = []
for i, l in enumerate(lines, 1):
    s, sr = k.create(l["text"], voice=v["name"], speed=v["speed"], lang=v.get("lang", "en-us"))
    sf.write(f"out/audio/v{i}.wav", s, sr)
    d = len(s) / sr
    durs.append(round(d, 3))
    end = l["at"] + d
    exp = l.get("dur")
    note = f" (diharapkan {exp})" if exp else ""
    print(f"line {i}: {d:.2f}s{note}, selesai di {end:.2f}s dari {total:.2f}s")
    if exp and abs(d - exp) > 0.35:
        print(f"PERINGATAN: durasi line {i} beda >0.35 s dari yang diukur penulis job")
    if end > total - 0.05:
        ok = False
        print(f"ERROR: line {i} melewati akhir video")
    if i < len(lines) and end > lines[i]["at"] - 0.05:
        ok = False
        print(f"ERROR: line {i} bertabrakan dengan line {i + 1}")
json.dump(durs, open("out/audio/durs.json", "w"))
sys.exit(0 if ok else 1)
