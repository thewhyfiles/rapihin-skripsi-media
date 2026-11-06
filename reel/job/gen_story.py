import json
import os
from PIL import ImageFont

FD = os.environ.get('FONT_WOFF', 'car/node_modules/@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-%d-normal.woff')
OUT = os.environ.get('OUT_DIR', '.')
INK, BG, STAB, GREEN, RED, BLUE, MUTED, WHITE = '#12201D', '#F6F8F5', '#FFE45C', '#0E5C4E', '#C23B22', '#3B82B0', '#5d6b66', '#FFFFFF'
timing = json.load(open(os.environ.get('TIMING', 'out/timing.json')))


def tw(text, size, weight=800):
    return ImageFont.truetype(FD % weight, size).getlength(text)


def ap(t0, dy=18, d=0.4):
    """entrance keys (fade + rise) for an element whose rest y is set later"""
    return {'t0': t0, 'dy': dy, 'd': d}


def L(o, enter=None):
    if enter is not None:
        y = o.get('y', 0)
        t0, dy, d = enter['t0'], enter['dy'], enter['d']
        o['keys'] = [{'t': 0, 'opacity': 0, 'y': y + dy}, {'t': max(t0, 0.001), 'opacity': 0, 'y': y + dy},
                     {'t': t0 + d, 'opacity': o.get('opacity', 1), 'y': y, 'ease': 'out'}]
    return o


def rect(x, y, w, h, fill, r=0, z=0, **kw):
    return dict(type='rect', x=x, y=y, w=w, h=h, r=r, fill=fill, z=z, **kw)


def text(x, y, s, size, fill=INK, weight=800, z=5, **kw):
    return dict(type='text', x=x, y=y, text=s, size=size, weight=weight, fill=fill, z=z, **kw)


def base(wm=True):
    out = [rect(360, 640, 760, 1360, BG, z=-10)]
    if wm:
        out.append(text(360, 109, '@rapihin.skripsi', 30, INK, 700, z=50, opacity=0.45))
    return out


def title(l1, l2, hl=2, size=50, t0=0.05):
    out = []
    for i, (s, y) in enumerate([(l1, 262), (l2, 326)], 1):
        if not s:
            continue
        e = ap(t0 + 0.12 * (i - 1))
        if i == hl:
            w = tw(s, size) + 40
            out.append(L(rect(360, y - 17, w, 64, STAB, r=16, z=1, fill_opacity=0.9), e))
        out.append(L(text(360, y, s, size, INK, 800, z=2), e))
    return out


def wrap(s, n=36):
    lines, cur = [], ''
    for w in s.split():
        if len(cur) + len(w) + (1 if cur else 0) > n:
            lines.append(cur); cur = w
        else:
            cur = (cur + ' ' + w).strip()
    lines.append(cur)
    return lines


def subtitle(s):
    ls = wrap(s)
    n = len(ls)
    e = ap(0.1, 0, 0.25)
    out = [L(rect(360, 985, 660, 34 + 40 * n, INK, r=20, z=60, fill_opacity=0.92), e)]
    for i, l in enumerate(ls):
        out.append(L(text(360, 985 - (n - 1) * 20 + 11 + 40 * i, l, 30, BG, 700, z=61), e))
    return out


def paper(x, y, w, h, t0=0.3, z=10):
    e = ap(t0, 24, 0.45)
    return [L(rect(x + 8, y + 10, w, h, INK, r=10, z=z, opacity=0.1), e),
            L(rect(x, y, w, h, WHITE, r=10, z=z + 1, stroke='#d5dbd7', sw=2), e)]


def bars(x0, y, widths, t0, h=10, z=12, fill='#c9d1cd', gap=24):
    out = []
    for i, w in enumerate(widths):
        out.append(L(rect(x0 + w / 2, y + i * gap, w, h, fill, r=h / 2, z=z), ap(t0, 10, 0.35)))
    return out


def check(cx, cy, r, t0, z=30):
    e = ap(t0, 0, 0.3)
    return [L(dict(type='circle', x=cx, y=cy, r=r, fill=GREEN, z=z), e),
            L(dict(type='path', x=cx, y=cy, d=f'M{-r*0.45:.1f} {r*0.02:.1f} L{-r*0.12:.1f} {r*0.35:.1f} L{r*0.48:.1f} {-r*0.33:.1f}',
                   fill='none', stroke=BG, sw=max(4, r * 0.22), z=z + 1), e)]


def chip(x, y, s, size=28, fill=BLUE, col=WHITE, font='mono', t0=0.5, z=30):
    w = (0.6 * size * len(s) if font == 'mono' else tw(s, size, 700)) + 40
    e = ap(t0, 10, 0.35)
    return [L(rect(x, y, w, size + 26, fill, r=(size + 26) / 2, z=z), e),
            L(text(x, y + size * 0.36, s, size, col, 700, z=z + 1, font=font), e)]


def beat(i, layers, wm=True, extra=None):
    t = timing[i]
    b = {'duration': t['beat'], 'layers': base(wm) + layers + subtitle(t['text']), 'caption': None,
         'watermark': False, 'fx': {'vignette': 0, 'grain': 0}, 'fade_in': 0, 'fade_out': 0}
    if extra:
        b.update(extra)
    return b


beats = []
# 1 hook: three different fonts
L1 = title('Font skripsimu', 'campur aduk?')
L1 += paper(330, 640, 420, 500, 0.25)
rows = [(480, 'serif', 46, '11 pt'), (640, 'sans', 38, '12 pt'), (800, 'mono', 30, '14 pt')]
for k, (y, f, sz, lab) in enumerate(rows):
    t0 = 0.5 + 0.25 * k
    kw = {'font': f} if f != 'sans' else {}
    L1.append(L(text(195, y + sz * 0.35, 'Aa', sz, INK, 400 if f == 'serif' else 800, z=14, **kw), ap(t0)))
    L1 += bars(250, y - 22, [260, 230, 250], t0)
    L1.append(L(dict(type='circle', x=195, y=y, r=46, fill='none', stroke=RED, sw=5, z=20), ap(1.7 + 0.3 * k, 0, 0.25)))
    L1 += chip(625, y, lab, 28, BLUE, WHITE, 'mono', 1.7 + 0.3 * k)
beats.append(beat(0, L1))

# 2 copy-paste brings its own font
L2 = title('Teks salinan', 'bawa font sendiri')
# source card (web)
e = ap(0.3, 20, 0.4)
L2 += [L(rect(196, 470, 250, 170, WHITE, r=14, z=10, stroke='#d5dbd7', sw=2), e),
       L(rect(196, 400, 250, 30, BLUE, r=8, z=11, opacity=0.9), e)]
for k, cx in enumerate([96, 116, 136]):
    L2.append(L(dict(type='circle', x=cx, y=400, r=5, fill=WHITE, z=12), e))
L2.append(L(text(196, 470, 'Aa', 52, BLUE, 400, z=12, font='serif'), e))
L2 += bars(116, 500, [160, 120], 0.3, h=9, z=12)
# arrow
L2.append(L(dict(type='path', x=0, y=0, d='M300 560 C 360 600 380 640 410 660', fill='none', stroke=INK, sw=5, z=15), ap(1.0, 0, 0.3)))
L2.append(L(dict(type='path', x=0, y=0, d='M392 648 L412 662 L414 638', fill='none', stroke=INK, sw=5, z=15), ap(1.0, 0, 0.3)))
L2 += chip(330, 650, 'Ctrl+V', 24, INK, BG, 'mono', 1.0)
# target paper
L2 += paper(520, 690, 300, 400, 0.4)
L2 += bars(400, 540, [230, 210, 240, 150], 0.6)
e = ap(1.5, -20, 0.4)
L2 += [L(rect(520, 705, 260, 110, BLUE, r=8, z=13, opacity=0.14), e)]
for k, w in enumerate([230, 200, 216]):
    L2.append(L(rect(405 + w / 2, 672 + k * 30, w, 15, '#5b6763', r=7, z=14), e))
L2 += bars(400, 790, [240, 200, 236, 120], 0.6)
L2.append(L(dict(type='ellipse', x=520, y=705, rx=158, ry=76, fill='none', stroke=RED, sw=5, z=20), ap(2.6, 0, 0.3)))
L2 += chip(205, 790, 'beda font, beda ukuran', 26, RED, WHITE, 'sans', 2.9)
beats.append(beat(1, L2))

# 3 one font, one size
L3 = title('Pilih satu font,', 'satu ukuran')
L3.append(L(text(360, 382, 'contoh umum, cek pedoman kampus', 26, MUTED, 700, z=5), ap(0.4)))
L3 += paper(330, 620, 420, 400, 0.25)
for k, y in enumerate([500, 620, 740]):
    t0 = 0.6 + 0.2 * k
    L3.append(L(text(195, y + 15, 'Aa', 42, INK, 400, z=14, font='serif'), ap(t0)))
    L3 += bars(250, y - 22, [260, 230, 250], t0)
    L3 += check(195 + 34, y - 30, 16, 1.6 + 0.3 * k)
    L3 += chip(625, y, '12 pt', 28, BLUE, WHITE, 'mono', 1.6 + 0.3 * k)
L3 += chip(360, 865, 'Times New Roman 12', 28, INK, BG, 'mono', 2.6)
beats.append(beat(2, L3))

# 4 set once in Normal style
L4 = title('Atur sekali di', 'Style Normal')
e = ap(0.3, 24, 0.45)
L4 += [L(rect(368, 630, 580, 420, INK, r=18, z=10, opacity=0.1), e),
       L(rect(360, 620, 580, 420, WHITE, r=18, z=11, stroke='#d5dbd7', sw=2), e),
       L(rect(360, 436, 580, 52, GREEN, r=18, z=12), e),
       L(rect(360, 452, 580, 20, GREEN, z=12), e),
       L(text(360, 446, 'Modify Style', 26, BG, 700, z=13), e)]
rows = [(520, 'Name', 'Normal', None), (610, 'Font', 'Times New Roman', None), (700, 'Size', '12', STAB)]
for k, (y, lab, val, hl) in enumerate(rows):
    t0 = 0.7 + 0.25 * k
    L4.append(L(text(150, y + 10, lab, 28, MUTED, 700, z=13), ap(t0)))
    L4.append(L(rect(420, y, 360, 56, hl or BG, r=10, z=12, stroke='#b9c3be', sw=2), ap(t0)))
    L4.append(L(text(420, y + 10, val, 28, INK, 700, z=13, font='mono'), ap(t0)))
L4 += check(560, 790, 26, 2.0)
L4.append(L(text(390, 800, 'semua halaman ikut', 26, GREEN, 800, z=13), ap(2.0)))
L4.append(L(text(360, 880, 'Ukuran akhir ikut buku pedoman kampus', 26, MUTED, 700, z=5), ap(2.6)))
beats.append(beat(3, L4))

# 5 brand card
L5 = [rect(360, 640, 760, 1360, GREEN, z=-5)]
e = ap(0.15, 20, 0.45)
L5 += [L(rect(360, 470, 150, 196, BG, r=12, z=10), e), L(rect(306, 470, 42, 196, STAB, z=11), e)]
L5 += bars(340, 410, [70, 70, 70, 50], 0.15, h=8, z=12, fill=INK, gap=26)
L5 += check(420, 560, 28, 0.6)
L5.append(L(text(360, 690, 'Rapihin Skripsi', 64, WHITE, 800, z=10), ap(0.35)))
L5.append(L(text(360, 750, 'Kamu yang menulis, kami yang merapikan.', 28, STAB, 700, z=10), ap(0.6)))
L5.append(L(text(360, 820, '@rapihin.skripsi', 26, BG, 700, z=10, opacity=0.8), ap(0.8)))
beats.append(beat(4, L5, wm=False, extra={'fade_out': 0.4}))

json.dump({'meta': {'size': [720, 1280], 'fps': 30}, 'beats': beats}, open(os.path.join(OUT, 'story.json'), 'w'), indent=1)

# ---------------- cover (1 beat, static)
C = base(False)
C += [dict(type='circle', x=372 - tw('Rapihin Skripsi', 32) / 2 - 22, y=196, r=10, fill=STAB, stroke=GREEN, sw=4, z=5),
      text(372, 207, 'Rapihin Skripsi', 32, GREEN, 800)]
C += [rect(360, 272, tw('TIPS FORMAT', 24, 800) + 48, 50, INK, r=25, z=5), text(360, 281, 'TIPS FORMAT', 24, BG, 800, z=6, ls=2)]
ys = [392, 470, 548]
C.append(text(360, ys[0], 'Kenapa font', 64))
C.append(text(360, ys[1], 'skripsimu', 64))
C.append(rect(360, ys[2] - 22, tw('tidak seragam?', 64) + 44, 80, STAB, r=18, z=1, fill_opacity=0.95))
C.append(text(360, ys[2], 'tidak seragam?', 64, z=2))
# illustration: messy page -> neat page
for (px, neat) in [(205, False), (515, True)]:
    C += [rect(px + 8, 820, 230, 300, INK, r=10, z=8, opacity=0.1), rect(px, 810, 230, 300, WHITE, r=10, z=9, stroke='#d5dbd7', sw=2)]
    specs = [('serif', 40, 400), ('sans', 32, 800), ('mono', 26, 700)] if not neat else [('serif', 34, 400)] * 3
    for k, (f, sz, wt) in enumerate(specs):
        y = 720 + k * 85
        kw = {'font': f} if f != 'sans' else {}
        C.append(text(px - 70, y + 12, 'Aa', sz, INK, wt, z=11, **kw))
        C.append(rect(px + 30, y - 10, 100, 9, '#c9d1cd', r=4, z=11))
        C.append(rect(px + 22, y + 10, 84, 9, '#c9d1cd', r=4, z=11))
    if not neat:
        C.append(dict(type='path', x=px + 95, y=660, d='M-22 -22 L22 22 M22 -22 L-22 22', fill='none', stroke=RED, sw=8, z=20))
C.append(dict(type='path', x=0, y=0, d='M336 810 L382 810 M366 792 L386 810 L366 828', fill='none', stroke=INK, sw=6, z=20))
C += check(610, 960, 30, 0, z=20)
C += [rect(360, 1036, tw('Times New Roman 12', 26, 700) + 60, 46, BLUE, r=23, z=5), text(360, 1045, 'Times New Roman 12', 26, WHITE, 700, z=6, font='mono')]
C.append(text(360, 1098, 'Contoh umum. Ukuran akhir ikut buku pedoman kampus.', 21, MUTED, 700))
json.dump({'meta': {'size': [720, 1280], 'fps': 30}, 'beats': [
    {'duration': 2, 'layers': C, 'caption': None, 'watermark': False, 'fx': {'vignette': 0, 'grain': 0}, 'fade_in': 0, 'fade_out': 0}]},
    open(os.path.join(OUT, 'cover_story.json'), 'w'), indent=1)
print('ok', sum(b['duration'] for b in beats))
