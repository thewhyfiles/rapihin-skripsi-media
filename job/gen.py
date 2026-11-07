import json

T = json.load(open("out/timing.json", encoding="utf-8"))
GREEN, STAB, INK, RED, BLUE, BG, MUTED = "#0E5C4E", "#FFE45C", "#12201D", "#C23B22", "#3B82B0", "#F6F8F5", "#5d6b66"
CW = 0.6  # perkiraan lebar karakter Plus Jakarta Sans 800 (em)


def pop(l, t0, dy=22, dur=0.45):
    """beri animasi muncul (naik + fade) pada layer l, memakai x/y/opacity asli"""
    y = l.get("y", 0)
    op = l.get("opacity", 1)
    l["keys"] = [{"t": round(t0, 2), "opacity": 0, "y": y + dy}, {"t": round(t0 + dur, 2), "opacity": op, "y": y, "ease": "out"}]
    return l


def rect(x, y, w, h, fill, r=0, **kw):
    d = {"type": "rect", "x": x, "y": y, "w": w, "h": h, "r": r, "fill": fill}
    d.update(kw)
    return d


def text(x, y, s, size, fill=INK, weight=800, **kw):
    d = {"type": "text", "x": x, "y": y, "text": s, "size": size, "weight": weight, "fill": fill}
    d.update(kw)
    return d


def wrap(s, n=36):
    import math
    k = math.ceil(len(s) / n)
    for m in range(max(10, len(s) // k), n + 1):
        r = _wrap(s, m)
        if len(r) <= k:
            return r
    return _wrap(s, n)


def _wrap(s, n):
    out, cur = [], ""
    for w in s.split():
        if len(cur) + len(w) + (1 if cur else 0) > n:
            out.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip()
    return out + [cur]


def subs(i):
    lines = wrap(T[i]["text"])
    n = len(lines)
    cy = 985 - 10 * (n - 2) if n > 2 else 985
    L = [rect(360, cy, 660, 34 + 40 * n, INK, 20, fill_opacity=0.92, z=60)]
    y0 = cy - 20 * (n - 1) + 10
    for k, ln in enumerate(lines):
        L.append(text(360, y0 + 40 * k, ln, 30, BG, 700, z=61))
    for l in L:
        l["keys"] = [{"t": 0.1, "opacity": 0}, {"t": 0.35, "opacity": 1}]
    return L


def base(wm=True):
    L = [rect(360, 640, 760, 1360, BG, z=-10)]
    if wm:
        L.append(text(360, 109, "@rapihin.skripsi", 30, INK, 700, opacity=0.45))
    return L


def title(lines, hl=1, size=50):
    """lines: teks per baris; baris hl diberi pil Stabilo di belakangnya"""
    L = []
    for k, s in enumerate(lines):
        y = 268 + 66 * k
        if k == hl:
            w = len(s) * size * CW + 34
            p = rect(360, y - 17, w, size * 1.32, STAB, 16, fill_opacity=0.9)
            L.append(pop(p, 0.15, 14))
        L.append(pop(text(360, y, s, size, INK), 0.2 + 0.12 * k, 16))
    return L


def page(x, y, w, h, num, t0, dim=1.0, head=None, circle=False):
    """halaman kertas: bayangan, kertas, judul bar, garis teks, garis panduan biru, nomor di kaki"""
    L = [rect(x + 7, y + 9, w, h, INK, 8, opacity=0.10 * dim)]
    L.append(rect(x, y, w, h, "#FFFFFF", 8, stroke="#cfd7d2", sw=2, opacity=dim))
    top = y - h / 2
    L.append(rect(x, top + 34, w * 0.55, 13, GREEN, 6, opacity=0.9 * dim))
    for k in range(5):
        ww = w * (0.74 if k != 4 else 0.45)
        L.append(rect(x - (w * 0.74 - ww) / 2, top + 66 + 22 * k, ww, 7, INK, 3, opacity=0.14 * dim))
    gy = y + h / 2 - 50
    L.append({"type": "line", "x": x, "y": gy, "x1": -w * 0.42, "y1": 0, "x2": w * 0.42, "y2": 0, "stroke": BLUE, "sw": 3, "opacity": dim})
    if circle:
        L.append(rect(x, gy + 22, 52, 46, STAB, 23, opacity=dim))
    L.append(text(x, gy + 34, num, 30, INK, 800, opacity=dim))
    for l in L:
        pop(l, t0)
    return L


def beat(i, layers, last=False):
    d = T[i]["beat"]
    return {"duration": d, "layers": base(wm=not last) + layers + subs(i), "caption": None, "watermark": False,
            "fx": {"vignette": 0, "grain": 0}, "camera": {"zoom": [1, 1.03], "origin": [360, 640]}}


beats = []

# 1 hook: dua jenis nomor
L = title(["Kenapa nomor halaman", "ada dua jenis?"], 1)
L += page(200, 650, 250, 350, "iii", 0.6, circle=True) + page(520, 650, 250, 350, "12", 1.0, circle=True)
q = [{"type": "circle", "x": 360, "y": 650, "r": 36, "fill": RED}, text(360, 667, "?", 48, "#FFFFFF", 800)]
for l in q:
    l["keys"] = [{"t": 1.6, "opacity": 0, "scale": 0.4}, {"t": 2.1, "opacity": 1, "scale": 1, "ease": "back"}]
L += q
L += [pop(text(200, 872, "romawi", 30), 1.4, 12), pop(text(520, 872, "angka biasa", 30), 1.7, 12)]
beats.append(beat(0, L))

# 2 bagian awal: romawi
L = title(["Bagian awal pakai", "angka romawi"], 1)
labs = ["Abstrak", "Daftar isi", "Daftar tabel"]
for k, (x, n) in enumerate(zip([145, 360, 575], ["i", "ii", "iii"])):
    L += page(x, 640, 190, 270, n, 0.5 + 0.5 * k, circle=True)
    L.append(pop(text(x, 818, labs[k], 26, INK, 700), 0.8 + 0.5 * k, 10))
L.append(pop(text(360, 862, "contoh umum, urutannya ikut pedoman", 24, MUTED, 600), 2.4, 8))
beats.append(beat(1, L))

# 3 isi mulai dari 1
L = title(["Isi skripsi mulai", "lagi dari angka 1"], 1)
L += page(120, 650, 126, 190, "iii", 0.4, dim=0.5)
ar = [{"type": "line", "x": 0, "y": 650, "x1": 205, "y1": 0, "x2": 262, "y2": 0, "stroke": BLUE, "sw": 5},
      {"type": "poly", "x": 266, "y": 650, "points": [[0, 0], [-16, -12], [-16, 12]], "fill": BLUE}]
for l in ar:
    l["keys"] = [{"t": 1.0, "opacity": 0}, {"t": 1.5, "opacity": 1}]
L += ar
L += page(385, 640, 190, 270, "1", 1.4, circle=True) + page(595, 640, 190, 270, "2", 1.9)
chip = rect(385, 551, 112, 38, GREEN, 19)
chip2 = text(385, 565, "BAB I", 22, BG, 800)
L += [pop(chip, 2.4, 8), pop(chip2, 2.4, 8)]
L.append(pop(text(120, 790, "romawi", 24, MUTED, 600), 0.8, 8))
beats.append(beat(2, L))

# 4 section break
L = title(["Pisahkan dengan", "section break"], 1)
b1 = rect(185, 590, 260, 150, GREEN, 18)
b2 = rect(535, 590, 260, 150, STAB, 18)
L += [pop(b1, 0.5, 20), pop(b2, 0.9, 20)]
for dx, n in [(-70, "i"), (0, "ii"), (70, "iii")]:
    L.append(pop(text(185 + dx, 604, n, 46, BG, 800), 0.8, 10))
for dx, n in [(-60, "1"), (0, "2"), (60, "3")]:
    L.append(pop(text(535 + dx, 604, n, 46, INK, 800), 1.2, 10))
L += [pop(text(185, 660, "bagian awal", 24, BG, 700), 0.9, 10), pop(text(535, 660, "isi skripsi", 24, INK, 700), 1.3, 10)]
for k in range(6):  # garis putus-putus merah
    y1 = 505 + k * 28
    d = {"type": "line", "x": 360, "y": y1, "x1": 0, "y1": 0, "x2": 0, "y2": 16, "stroke": RED, "sw": 5}
    d["keys"] = [{"t": 1.6 + 0.08 * k, "opacity": 0}, {"t": 1.8 + 0.08 * k, "opacity": 1}]
    L.append(d)
L += [pop(rect(360, 760, 250, 52, RED, 26), 2.0, 10), pop(text(360, 778, "section break", 28, "#FFFFFF", 800), 2.0, 10)]
L += [pop(text(360, 840, "Letak dan format nomor:", 26, INK, 700), 2.6, 8), pop(text(360, 874, "ikut buku pedoman kampus", 26, INK, 700), 2.7, 8)]
beats.append(beat(3, L))

# 5 penutup merek
g = rect(360, 640, 760, 1360, GREEN, z=-9)
g["keys"] = [{"t": 0, "opacity": 0}, {"t": 0.3, "opacity": 1}]
L = [g, pop(text(360, 600, "Rapihin Skripsi", 64, "#FFFFFF", 800), 0.2, 16),
     pop(text(360, 680, "Kamu yang menulis,", 34, "#FFFFFF", 600), 0.6, 10),
     pop(text(360, 728, "kami yang merapikan.", 34, "#FFFFFF", 600), 0.75, 10),
     pop(rect(360, 810, 320, 50, STAB, 25), 1.1, 8), pop(text(360, 828, "@rapihin.skripsi", 28, INK, 800), 1.1, 8)]
b = beat(4, L, last=True)
b["fade_out"] = 0.4
beats.append(b)

json.dump({"meta": {"size": [720, 1280], "fps": 30}, "beats": beats}, open("story.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(len(beats), round(sum(x["duration"] for x in beats), 2))

# ---- cover (1 beat, statis; isi penting di y 160-1120)
C = base(wm=False)
C += [text(360, 215, "Rapihin Skripsi", 38, GREEN, 800),
      rect(360, 290, 250, 52, INK, 26), text(360, 308, "TIPS FORMAT", 28, BG, 800)]
tl = ["Kenapa nomor", "halaman skripsi", "pakai angka", "romawi?"]
for k, s in enumerate(tl):
    y = 440 + 88 * k
    if k == 3:
        C.append(rect(360, y - 22, len(s) * 70 * CW + 40, 94, STAB, 20, fill_opacity=0.95))
    C.append(text(360, y, s, 70, INK, 800))
# ilustrasi: dua halaman kecil
C += page(215, 905, 190, 250, "iii", 0.0, circle=True) + page(505, 905, 190, 250, "12", 0.0, circle=True)
C += [rect(360, 905, 70, 70, RED, 35), text(360, 929, "?", 52, "#FFFFFF", 800)]
C += [text(360, 1072, "Contoh umum.", 24, MUTED, 600), text(360, 1102, "Format akhir ikut buku pedoman kampus.", 24, MUTED, 600)]
for l in C:
    l.pop("keys", None)
    if l.get("opacity") == 0:
        l["opacity"] = 1
json.dump({"meta": {"size": [720, 1280], "fps": 30},
           "beats": [{"duration": 2, "layers": C, "caption": None, "watermark": False, "fx": {"vignette": 0, "grain": 0}}]},
          open("cover_story.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
