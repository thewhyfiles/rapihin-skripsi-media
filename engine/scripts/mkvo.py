#!/usr/bin/env python3
"""mkvo.py script.json out_dir -> out_dir/vo.wav + out_dir/timing.json
script.json = list of English sentences (one per beat).
Voice: Kokoro am_michael (male, English), speed 0.97. Needs kokoro-v1.0.onnx and voices-v1.0.bin in cwd."""
import json, sys, os, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
LEAD, TAIL, TAIL_LAST, MIN_BEAT, SR = 0.25, 0.35, 0.9, 2.8, 24000
sent = json.load(open(sys.argv[1], encoding="utf-8")); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
k = Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")
parts, timing, t0 = [], [], 0.0
for i, s in enumerate(sent):
    a, sr = k.create(s, voice="am_michael", speed=0.97, lang="en-us"); assert sr == SR
    dur = len(a) / sr
    beat = max(MIN_BEAT, LEAD + dur + (TAIL_LAST if i == len(sent) - 1 else TAIL))
    pad = np.zeros(int(round((beat - LEAD - dur) * SR)), dtype=np.float32)
    parts += [np.zeros(int(LEAD * SR), dtype=np.float32), a.astype(np.float32), pad]
    words = s.split(); w = [len(x.strip(".,!?")) + 2 + (3 if x[-1] in ".,!?" else 0) for x in words]
    acc, wt = 0, []
    for x in w: wt.append(round(LEAD + dur * acc / sum(w), 3)); acc += x
    timing.append({"text": s, "start": LEAD, "dur": round(dur, 3), "beat": round(beat, 3), "word_times": wt + [round(LEAD + dur, 3)]})
sf.write(os.path.join(out, "vo.wav"), np.concatenate(parts), SR)
json.dump(timing, open(os.path.join(out, "timing.json"), "w"), indent=1)
print("total", round(sum(t["beat"] for t in timing), 2), "s;", [t["beat"] for t in timing])
