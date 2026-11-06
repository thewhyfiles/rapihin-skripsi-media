import json, math, random
T = json.load(open("out/timing.json"))
ID = ["Di malam cerah, bintang tampak berkelip.",
      "Tapi planet biasanya bersinar tenang. Kenapa?",
      "Cahaya bintang melintasi angkasa tanpa berkelip.",
      "Kelipnya baru muncul di akhir, di udara kita.",
      "Atmosfer penuh kantong udara hangat dan dingin.",
      "Tiap kantong membelokkan cahaya sedikit berbeda.",
      "Bintang begitu jauh, tampak hanya satu titik.",
      "Tiap belokan kecil membuat titik itu melompat.",
      "Planet lebih dekat, tampak seperti cakram kecil.",
      "Kelip banyak titiknya saling meratakan.",
      "Setiap hal punya alasan."]
SRC = "Sumber: EarthSky · Britannica · UCR Physics FAQ"
BLUE, YEL, PAPER, MUTED, LIGHT = "#4f66f5", "#f4c430", "#efede9", "#a5a5a0", "#ffe08a"
R = random.Random(7)

def wrap(s, n=36):
    out, cur = [], ""
    for w in s.split():
        if len(cur) + len(w) + (1 if cur else 0) > n: out.append(cur); cur = w
        else: cur = (cur + " " + w).strip()
    return out + [cur]

def subs(i):
    lines = wrap(T[i]["text"]); h = 34 + 40 * len(lines)
    L = [{"type": "rect", "x": 360, "y": 985, "w": 660, "h": h, "r": 20, "fill": "#171717", "fill_opacity": 0.86, "z": 60,
          "keys": [{"t": 0.1, "opacity": 0}, {"t": 0.35, "opacity": 1}]}]
    y0 = 985 - 20 * (len(lines) - 1) + 10
    for k, ln in enumerate(lines):
        L.append({"type": "text", "x": 360, "y": y0 + 40 * k, "text": ln, "size": 30, "weight": 700, "fill": "#F2F0E9", "z": 61,
                  "keys": [{"t": 0.1, "opacity": 0}, {"t": 0.35, "opacity": 1}]})
    return L

def star_pts(R1, r1, n=4):
    p = []
    for k in range(2 * n):
        a = -math.pi / 2 + k * math.pi / n; rr = R1 if k % 2 == 0 else r1
        p.append([round(rr * math.cos(a), 1), round(rr * math.sin(a), 1)])
    return p

def twinkle(dur, seed, lo=0.25, hi=1.0, step=0.12, scl=None):
    r = random.Random(seed); ks = []; t = 0.0
    while t <= dur:
        k = {"t": round(t, 2), "opacity": round(r.uniform(lo, hi), 2), "ease": "linear"}
        if scl: k["scale"] = round(r.uniform(*scl), 2)
        ks.append(k); t += step
    return ks

def sky(stars=70, top="sky_top", bottom="sky_bottom", to=1300, seed=11):
    return {"type": "sky", "top": top, "bottom": bottom, "to": to, "stars": stars, "seed": seed}

def label(x, y, text, size=24, fill=MUTED, t0=0.4, weight=700):
    return {"type": "text", "x": x, "y": y, "text": text, "size": size, "weight": weight, "fill": fill,
            "keys": [{"t": t0, "opacity": 0, "y": y + 12}, {"t": t0 + 0.4, "opacity": 1, "y": y, "ease": "out"}]}

def ground(y=930):
    return {"type": "rect", "x": 360, "y": y + 250, "w": 1000, "h": 500, "fill": {"grad": [[0, "#151826"], [1, "#07080d"]]}}

beats = []
def add(i, layers, camera=None, fx=None, **kw):
    d = T[i]["beat"]
    b = {"duration": d, "layers": layers + (subs(i) if i < len(T) - 1 else []),
         "caption": {"text": ID[i], "from": T[i]["start"], "to": round(T[i]["start"] + T[i]["dur"], 3)}}
    if camera: b["camera"] = camera
    if fx: b["fx"] = fx
    b.update(kw); beats.append(b)

# 1 stargazer
d = T[0]["beat"]
add(0, [sky(90), ground(930),
        {"type": "glow", "x": 470, "y": 430, "r": 110, "color": LIGHT, "keys": twinkle(d, 1, 0.3, 0.9)},
        {"type": "poly", "x": 470, "y": 430, "points": star_pts(34, 7), "fill": LIGHT, "keys": twinkle(d, 2, 0.35, 1, scl=(0.75, 1.15))},
        {"type": "poly", "x": 230, "y": 520, "points": star_pts(18, 4), "fill": PAPER, "keys": twinkle(d, 3, 0.2, 1, scl=(0.7, 1.1))},
        {"type": "poly", "x": 580, "y": 640, "points": star_pts(14, 3), "fill": PAPER, "keys": twinkle(d, 4, 0.2, 1, scl=(0.7, 1.1))},
        {"type": "person", "x": 330, "y": 930, "h": 300, "outfit": "hero", "face": "smile", "look": [2, -3], "pose": "point_r"}],
    camera={"zoom": [1, 1.06], "origin": [360, 600]}, fade_in=0.3)

# 2 planet vs star
d = T[1]["beat"]
add(1, [sky(50), ground(930),
        {"type": "glow", "x": 220, "y": 470, "r": 120, "color": "#e9d9a8", "opacity": 0.7},
        {"type": "circle", "x": 220, "y": 470, "r": 30, "fill": "#e9d9a8"},
        label(220, 560, "PLANET", 24, PAPER, 0.5),
        {"type": "glow", "x": 500, "y": 470, "r": 110, "color": LIGHT, "keys": twinkle(d, 5, 0.25, 0.9)},
        {"type": "poly", "x": 500, "y": 470, "points": star_pts(30, 6), "fill": LIGHT, "keys": twinkle(d, 6, 0.3, 1, scl=(0.7, 1.15))},
        label(500, 560, "BINTANG", 24, PAPER, 0.5),
        {"type": "text", "x": 360, "y": 760, "text": "?", "size": 150, "weight": 800, "fill": BLUE,
         "keys": [{"t": 2.0, "opacity": 0, "scale": 0.4}, {"t": 2.5, "opacity": 1, "scale": 1, "ease": "back"}]},
        {"type": "person", "x": 360, "y": 930, "h": 150, "outfit": "hero", "faces": [{"t": 0, "face": "neutral"}, {"t": 2.0, "face": "worry"}], "look": [0, -3]}],
    camera={"zoom": [1, 1.04]})

# 3 starlight crossing space
d = T[2]["beat"]
L = [{"type": "rect", "x": 360, "y": 640, "w": 1200, "h": 1600, "fill": {"grad": [[0, "#03040a"], [1, "#0b1030"]]}},
     sky(120, "#03040a", "#0b1030", 1300, 23),
     {"type": "glow", "x": 150, "y": 600, "r": 160, "color": LIGHT},
     {"type": "circle", "x": 150, "y": 600, "r": 40, "fill": LIGHT},
     {"type": "line", "x": 0, "y": 0, "x1": 200, "y1": 600, "x2": 680, "y2": 600, "stroke": LIGHT, "sw": 3, "opacity": 0.35}]
for k in range(3):
    t0 = 0.3 + k * 0.9
    L.append({"type": "circle", "x": 200, "y": 600, "r": 9, "fill": LIGHT,
              "keys": [{"t": 0, "opacity": 0}, {"t": t0, "opacity": 0, "x": 200}, {"t": t0 + 0.05, "opacity": 1},
                       {"t": t0 + 1.9, "x": 680, "opacity": 1, "ease": "linear"}, {"t": t0 + 1.95, "opacity": 0}]})
L += [label(380, 760, "luar angkasa: cahaya tetap stabil", 24, MUTED, 0.6),
      {"type": "text", "x": 150, "y": 680, "text": "bintang", "size": 22, "weight": 700, "fill": PAPER}]
add(2, L, camera={"zoom": [1.0, 1.05], "pan": [[0, 0], [-10, 0]]})

# 4 enters our air
d = T[3]["beat"]
L = [sky(80), {"type": "circle", "x": 360, "y": 1260, "r": 520, "fill": BLUE, "fill_opacity": 0.18, "stroke": BLUE, "sw": 3},
     {"type": "circle", "x": 360, "y": 1260, "r": 450, "fill": {"grad": [[0, "#1f3a6b"], [1, "#0a1428"]]}},
     {"type": "person", "x": 360, "y": 812, "h": 90, "outfit": "hero", "face": "smile", "look": [0, -3]},
     {"type": "poly", "x": 360, "y": 360, "points": star_pts(20, 4), "fill": LIGHT},
     {"type": "line", "x1": 360, "y1": 385, "x2": 360, "y2": 740, "stroke": LIGHT, "sw": 2, "opacity": 0.3},
     label(560, 760, "ATMOSFER", 24, BLUE, 0.3, 800)]
ks = [{"t": 0, "x": 360, "y": 390, "opacity": 0}, {"t": 0.3, "opacity": 1, "x": 360, "y": 390},
      {"t": 1.8, "x": 360, "y": 735, "ease": "linear"}]
t = 1.8; yy = 735; s = 1
while yy < 795:
    t += 0.2; yy += 9; s = -s
    ks.append({"t": round(t, 2), "x": 360 + s * 16, "y": yy, "ease": "inout"})
ks.append({"t": round(t + 0.2, 2), "opacity": 0})
L.append({"type": "circle", "x": 360, "y": 390, "r": 9, "fill": LIGHT, "keys": ks})
L.append({"type": "glow", "x": 360, "y": 760, "r": 90, "color": LIGHT, "keys": [{"t": 1.7, "opacity": 0}, {"t": 2.0, "opacity": 0.8}, {"t": d, "opacity": 0.4}]})
add(3, L, camera={"zoom": [1.0, 1.12], "origin": [360, 760]})

# 5 pockets of warm and cool air
d = T[4]["beat"]
L = [sky(40, "#070a18", "#141a3d")]
for k in range(12):
    warm = k % 2 == 0
    y = 380 + (k * 47) % 520; x = R.uniform(60, 660); v = R.choice([-1, 1]) * R.uniform(25, 55)
    L.append({"type": "ellipse", "x": x, "y": y, "rx": R.uniform(70, 120), "ry": R.uniform(28, 45),
              "fill": YEL if warm else BLUE, "fill_opacity": 0.28, "drift": [v, 0]})
L += [{"type": "rect", "x": 200, "y": 360, "w": 170, "h": 46, "r": 23, "fill": "#2a2410", "stroke": YEL, "sw": 2,
       "keys": [{"t": 0.8, "opacity": 0}, {"t": 1.1, "opacity": 1}]},
      {"type": "text", "x": 200, "y": 369, "text": "HANGAT", "size": 24, "weight": 800, "fill": YEL,
       "keys": [{"t": 0.8, "opacity": 0}, {"t": 1.1, "opacity": 1}]},
      {"type": "rect", "x": 520, "y": 900, "w": 170, "h": 46, "r": 23, "fill": "#10163a", "stroke": BLUE, "sw": 2,
       "keys": [{"t": 1.6, "opacity": 0}, {"t": 1.9, "opacity": 1}]},
      {"type": "text", "x": 520, "y": 909, "text": "DINGIN", "size": 24, "weight": 800, "fill": "#9fb0ff",
       "keys": [{"t": 1.6, "opacity": 0}, {"t": 1.9, "opacity": 1}]}]
add(4, L, camera={"zoom": [1.0, 1.05]})

# 6 bending light through layers
d = T[5]["beat"]
L = [sky(30, "#070a18", "#141a3d")]
bands = [(400, YEL), (520, BLUE), (640, YEL), (760, BLUE), (880, YEL)]
for y, c in bands:
    L.append({"type": "rect", "x": 360, "y": y, "w": 760, "h": 110, "fill": c, "fill_opacity": 0.13})
pts = [(360, 345), (360, 345 + 0)]
xs = [360, 395, 350, 410, 340, 385]; ys = [345, 455, 575, 695, 815, 925]
L.append({"type": "line", "x1": 360, "y1": 345, "x2": 360, "y2": 925, "stroke": MUTED, "sw": 2, "opacity": 0.35})
dpath = "M " + " L ".join(f"{a} {b}" for a, b in zip(xs, ys))
L.append({"type": "path", "d": dpath, "stroke": LIGHT, "sw": 4, "fill": "none",
          "keys": [{"t": 0.2, "opacity": 0}, {"t": 0.6, "opacity": 0.9}]})
ks = [{"t": 0, "x": 360, "y": 345, "opacity": 0}, {"t": 0.4, "opacity": 1}]
for k in range(1, len(xs)):
    ks.append({"t": round(0.4 + k * 0.45, 2), "x": xs[k], "y": ys[k], "ease": "linear"})
L.append({"type": "circle", "x": 360, "y": 345, "r": 10, "fill": LIGHT, "keys": ks})
L.append(label(560, 600, "lurus →", 22, MUTED, 0.8))
L[-1]["x"] = 470; L[-1]["text"] = "garis lurus"
L.append(label(560, 820, "cahaya berbelok", 24, LIGHT, 1.6))
add(5, L)

# 7 star = single point
d = T[6]["beat"]
L = [sky(60), {"type": "glow", "x": 360, "y": 560, "r": 130, "color": LIGHT, "opacity": 0.8},
     {"type": "circle", "x": 360, "y": 560, "r": 6, "fill": "#ffffff"},
     {"type": "circle", "x": 360, "y": 560, "r": 70, "stroke": BLUE, "sw": 3, "fill": "none",
      "keys": [{"t": 0.8, "opacity": 0, "scale": 2.2}, {"t": 1.5, "opacity": 1, "scale": 1, "ease": "out"}]},
     label(360, 700, "SATU TITIK CAHAYA", 28, PAPER, 1.3, 800),
     ground(930),
     {"type": "person", "x": 150, "y": 930, "h": 130, "outfit": "hero", "face": "neutral", "look": [3, -3]}]
add(6, L, camera={"zoom": [1.0, 1.15], "origin": [360, 560]})

# 8 point jumps and blinks
d = T[7]["beat"]
r2 = random.Random(9); ks = []; t = 0
while t <= d:
    ks.append({"t": round(t, 2), "x": 360 + r2.uniform(-22, 22), "y": 560 + r2.uniform(-18, 18), "opacity": round(r2.uniform(0.25, 1), 2), "ease": "linear"}); t += 0.14
L = [sky(30, "#070a18", "#141a3d"),
     {"type": "glow", "x": 360, "y": 560, "r": 120, "color": LIGHT, "keys": [dict(k) for k in ks]},
     {"type": "poly", "x": 360, "y": 560, "points": star_pts(26, 5), "fill": LIGHT, "keys": [dict(k) for k in ks]}]
for k in range(6):
    L.append({"type": "ellipse", "x": R.uniform(0, 720), "y": 450 + k * 40, "rx": 110, "ry": 36,
              "fill": YEL if k % 2 else BLUE, "fill_opacity": 0.16, "drift": [R.choice([-1, 1]) * 45, 0]})
L += [label(360, 760, "melompat · redup · terang", 26, PAPER, 1.0)]
add(7, L, camera={"zoom": [1.04, 1.04], "shake": 1.5})

# 9 planet = tiny disk with many points
d = T[8]["beat"]
L = [sky(50), {"type": "glow", "x": 360, "y": 590, "r": 260, "color": "#e9d9a8", "opacity": 0.35},
     {"type": "circle", "x": 360, "y": 590, "r": 150, "fill": {"grad": [[0, "#efe2b8"], [1, "#b99a63"]]},
      "keys": [{"t": 0, "scale": 0.2}, {"t": 1.2, "scale": 1, "ease": "out"}]}]
for (a, b, c) in [(-60, 300, 18), (10, 280, 14), (70, 230, 12)]:
    pass
dots = []
for gx in range(-4, 5):
    for gy in range(-4, 5):
        if gx * gx + gy * gy <= 14:
            dots.append((360 + gx * 30, 590 + gy * 30))
for k, (x, y) in enumerate(dots):
    L.append({"type": "circle", "x": x, "y": y, "r": 5, "fill": "#ffffff",
              "keys": [{"t": 1.5 + k * 0.02, "opacity": 0}, {"t": 1.8 + k * 0.02, "opacity": 0.85}]})
L.append(label(360, 800, "BANYAK TITIK CAHAYA", 28, PAPER, 1.6, 800))
add(8, L, camera={"zoom": [1.0, 1.05], "origin": [360, 590]})

# 10 averaging: star jagged vs planet flat
d = T[9]["beat"]
L = [sky(30, "#070a18", "#141a3d"),
     {"type": "glow", "x": 190, "y": 480, "r": 100, "color": LIGHT, "keys": twinkle(d, 11, 0.2, 0.95)},
     {"type": "poly", "x": 190, "y": 480, "points": star_pts(26, 5), "fill": LIGHT, "keys": twinkle(d, 12, 0.25, 1, scl=(0.7, 1.15))},
     {"type": "circle", "x": 530, "y": 480, "r": 70, "fill": "#d8c48e"}]
for k in range(19):
    a = k * 2.399; rr = 58 * math.sqrt((k + 0.5) / 19)
    L.append({"type": "circle", "x": 530 + rr * math.cos(a), "y": 480 + rr * math.sin(a), "r": 5, "fill": "#ffffff",
              "keys": twinkle(d, 100 + k, 0.15, 1, 0.15)})
L += [label(190, 600, "BINTANG", 24, PAPER, 0.3, 800), label(530, 600, "PLANET", 24, PAPER, 0.3, 800)]
# brightness graphs
r3 = random.Random(5)
jag = "M 80 760 " + " ".join(f"L {80 + 11 * k} {760 + r3.uniform(-45, 45):.0f}" for k in range(1, 21))
flat = "M 420 760 " + " ".join(f"L {420 + 11 * k} {760 + r3.uniform(-5, 5):.0f}" for k in range(1, 21))
L += [{"type": "rect", "x": 190, "y": 760, "w": 260, "h": 150, "r": 16, "fill": "#0d1024", "stroke": "#2a2f52", "sw": 2},
      {"type": "rect", "x": 530, "y": 760, "w": 260, "h": 150, "r": 16, "fill": "#0d1024", "stroke": "#2a2f52", "sw": 2},
      {"type": "path", "d": jag, "stroke": LIGHT, "sw": 4, "fill": "none", "keys": [{"t": 0.8, "opacity": 0}, {"t": 1.3, "opacity": 1}]},
      {"type": "path", "d": flat, "stroke": BLUE, "sw": 5, "fill": "none", "keys": [{"t": 1.8, "opacity": 0}, {"t": 2.3, "opacity": 1}]},
      label(190, 870, "naik-turun", 22, MUTED, 1.0), label(530, 870, "rata, stabil", 22, BLUE, 2.0)]
add(9, L)

# 11 end card
d = T[10]["beat"]
add(10, [{"type": "rect", "x": 360, "y": 640, "w": 1200, "h": 1600, "fill": {"grad": [[0, "#05060d"], [1, "#141a3d"]]}},
         sky(60, "#05060d", "#141a3d", 1300, 31),
         {"type": "glow", "x": 360, "y": 560, "r": 340, "color": BLUE, "keys": [{"t": 0, "opacity": 0}, {"t": 1.0, "opacity": 0.75}]},
         {"type": "text", "x": 360, "y": 580, "text": "The Why Files ID", "size": 66, "weight": 800, "fill": "#ffffff",
          "keys": [{"t": 0.15, "opacity": 0, "y": 600}, {"t": 0.8, "opacity": 1, "y": 580, "ease": "out"}]},
         {"type": "text", "x": 360, "y": 650, "text": "Segala hal punya alasan.", "size": 30, "weight": 500, "fill": "#cfd3e6",
          "keys": [{"t": 0.5, "opacity": 0}, {"t": 1.1, "opacity": 0.95}]},
         {"type": "text", "x": 360, "y": 1130, "text": SRC, "size": 18, "weight": 500, "fill": MUTED,
          "keys": [{"t": 0.6, "opacity": 0}, {"t": 1.1, "opacity": 0.8}]}],
    fade_in=0.3, fade_out=0.4)

json.dump({"meta": {"size": [720, 1280], "fps": 30}, "beats": beats}, open("story.json", "w"), indent=1)
print(len(beats), round(sum(b["duration"] for b in beats), 2))

# cover
C = [{"type": "rect", "x": 360, "y": 640, "w": 1200, "h": 1600, "fill": {"grad": [[0, "#05060d"], [1, "#141a3d"]]}},
     sky(110, "#05060d", "#141a3d", 1300, 41),
     {"type": "glow", "x": 250, "y": 450, "r": 200, "color": LIGHT, "opacity": 0.9},
     {"type": "poly", "x": 250, "y": 450, "points": star_pts(80, 15), "fill": LIGHT},
     {"type": "glow", "x": 510, "y": 520, "r": 170, "color": "#e9d9a8", "opacity": 0.45},
     {"type": "circle", "x": 510, "y": 520, "r": 78, "fill": {"grad": [[0, "#efe2b8"], [1, "#b99a63"]]}},
     {"type": "rect", "x": 360, "y": 236, "w": 150, "h": 48, "r": 24, "fill": "#10163a", "stroke": BLUE, "sw": 2},
     {"type": "text", "x": 360, "y": 245, "text": "SAINS", "size": 26, "weight": 800, "fill": "#9fb0ff"},
     {"type": "text", "x": 360, "y": 760, "text": "Kenapa bintang", "size": 70, "weight": 800, "fill": "#efede9"},
     {"type": "text", "x": 360, "y": 845, "text": "berkelip,", "size": 70, "weight": 800, "fill": YEL},
     {"type": "text", "x": 360, "y": 930, "text": "planet tidak?", "size": 70, "weight": 800, "fill": "#efede9"},
     {"type": "text", "x": 360, "y": 1050, "text": "Setiap hal punya alasan.", "size": 28, "weight": 500, "fill": MUTED}]
json.dump({"meta": {"size": [720, 1280], "fps": 30}, "beats": [{"duration": 2, "layers": C, "caption": None}]}, open("cover_story.json", "w"), indent=1)
