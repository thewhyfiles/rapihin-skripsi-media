#!/usr/bin/env python3
"""
reels3d.py - 3D "motion illustration" Reels (9:16) from a brand kit + a beats file.

A headless Chrome renders a three.js stage (assets/reels3d/stage.js) once per frame; frames are
piped straight into ffmpeg. Each beat becomes its own mp4 (cached by content hash), then beats
are joined with `-c copy`. Brand identity comes from the kit; the story comes from the beats file.

    python reels3d.py --kit brand-kit.json --beats beats.json --out reel.mp4
    python reels3d.py ... --stills ./stills      # look first: 3 frames per beat + contact sheet
    python reels3d.py ... --only 4               # one beat only (1-based)
    python reels3d.py ... --audio vo.mp3         # mux voiceover/music (video is not re-encoded)
    python reels3d.py ... --size 1080x1920       # default 720x1280
"""
import argparse
import functools
import hashlib
import http.server
import json
import os
import subprocess
import sys
import threading
import urllib.parse

from PIL import Image

VERSION = "1.1"
HERE = os.path.dirname(os.path.abspath(__file__))
STAGE_DIR = os.path.join(os.path.dirname(HERE), "assets", "reels3d")
FONT_DIR = os.path.join(STAGE_DIR, "fonts")        # shared by every stage (story2d.py reuses these fonts)

DEFAULT_PALETTE = {
    "bg_top": "#2b2b2b", "bg_mid": "#1f1f1f", "bg_bottom": "#161616",
    "text": "#f4f2ec", "muted": "#9a9a96", "accent": "#4a63f0",
    "surface": "#cfccc3", "surface_side": "#8f8c84", "surface_line": "#7d7a72", "slot": "#2a2825",
    "pill_text": "#ffffff", "callout_bg": "#f4f2ee", "callout_text": "#141414",
    "caption_gray": "#8c8c88", "sub": "#d6d4cf",
    # semantic colors used by the HUD elements (header, thermometer, tags, cards, simulation)
    "yellow": "#ffd84a", "hot": "#c8441a", "danger": "#dd3429", "blue": "#1b6aad", "purple": "#7b57c9",
    "orange": "#e08a1e", "ink": "#141414", "chip": "#2b2b2b", "head_text": "#f4f2ec", "head_sub": "#9a9a96",
    "cap_box": "rgba(0,0,0,.6)", "cap_text": "#ffffff", "cap_future": "#8c8c88", "cap_hl_text": "#141414",
    "rice_base": "#2a2825", "rice_hi": "#fbf6e8", "rice_lo": "#d9cba5",
}
# light theme: warm cream background, dark text, boxed captions (set with reels.theme = "light")
LIGHT_PALETTE = {
    "bg_top": "#efe9e0", "bg_mid": "#ece4cc", "bg_bottom": "#ece4cc",
    "text": "#1f1d1b", "muted": "#6b665e", "accent": "#1b6aad", "sub": "#4d4a46", "caption_gray": "#8f8c86",
    "ink": "#1f1d1b", "chip": "#292725", "head_text": "#1f1d1b", "head_sub": "#3a3733",
    "cap_box": "#23211f", "cap_text": "#ffffff", "cap_future": "#8f8c86", "cap_hl_text": "#1a1a1a",
    "rice_base": "#ece4cc",
}
BUNDLED_FONTS = [
    ("JakartaSans", 800, "plus-jakarta-sans-latin-800-normal.woff2"),
    ("JakartaSans", 700, "plus-jakarta-sans-latin-700-normal.woff2"),
    ("InterSans", 400, "inter-latin-400-normal.woff2"),
    ("InterSans", 500, "inter-latin-500-normal.woff2"),
    ("DMSerif", 400, "dm-serif-display-latin-400-normal.woff2"),
    ("JetMono", 500, "jetbrains-mono-latin-500-normal.woff2"),
    ("JetMono", 700, "jetbrains-mono-latin-700-normal.woff2"),
]
CHROME_CANDIDATES = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
                     "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]


# ----------------------------------------------------------------- theme from kit
def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgb_hex(c):
    return "#%02x%02x%02x" % tuple(max(0, min(255, int(v))) for v in c)


def lighten(h, k):
    return rgb_hex(tuple(v + (255 - v) * k for v in hex_rgb(h)))


def build_theme(kit):
    rk = kit.get("reels", {})
    light = rk.get("theme", "dark") == "light"
    pal = dict(DEFAULT_PALETTE)
    if light:
        pal.update(LIGHT_PALETTE)
    kp = kit.get("palette", {})
    for key in (("accent",) if light else ("accent", "text", "muted")):
        if key in kp:
            pal[key] = kp[key]
    if "accent2" in kp:
        pal["yellow"] = kp["accent2"]
    if "bg" in kp and "bg_bottom" not in rk.get("palette", {}):
        if light:
            pal["bg_top"] = kp["bg"]
        else:
            pal["bg_bottom"], pal["bg_mid"], pal["bg_top"] = kp["bg"], lighten(kp["bg"], 0.06), lighten(kp["bg"], 0.13)
    pal.update(rk.get("palette", {}))
    fonts_cfg = kit.get("reels", {}).get("fonts", {})
    font_css, loads = [], []
    for fam, weight, fn in BUNDLED_FONTS:
        font_css.append(f"@font-face{{font-family:'{fam}';font-weight:{weight};"
                        f"src:url('/fonts/{fn}') format('woff2');}}")
        loads.append(f"{weight} 24px '{fam}'")
    families = {"caption": "'JakartaSans', sans-serif", "sub": "'InterSans', sans-serif", "serif": "'DMSerif', serif",
                "mono": "'JetMono', monospace"}
    for role, spec in fonts_cfg.items():
        if role not in families or not spec:
            continue
        if spec.lower().endswith((".ttf", ".otf", ".woff", ".woff2")):
            name = "Kit" + role.title()
            font_css.append(f"@font-face{{font-family:'{name}';font-weight:100 900;"
                            f"src:url('/kit/{urllib.parse.quote(spec)}');}}")
            loads.append(f"700 24px '{name}'")
            families[role] = f"'{name}', sans-serif"
        else:
            families[role] = f"'{spec}', sans-serif"
    brand = kit.get("brand", {})
    handle = brand.get("handle", "")
    logo = kit.get("logo")
    return {"palette": pal, "bg_top": pal["bg_top"], "bg_mid": pal["bg_mid"], "bg_bottom": pal["bg_bottom"],
            "fonts": families, "handle": handle, "light": rk.get("light", {}),
            "style": "light" if light else "dark",
            "caption_style": rk.get("caption_style", "boxed" if light else "words"),
            "bg_style": rk.get("bg_style", "plain" if light else "speckle"),
            "brand_pill": rk.get("brand_pill", light),
            "brand": {"wordmark": brand.get("wordmark") or brand.get("name") or handle,
                      "logo": ("/kit/" + urllib.parse.quote(logo)) if logo else None}}, \
        "\n".join(font_css), loads


# ----------------------------------------------------------------- local server + browser
def start_server(kit_dir):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def translate_path(self, path):
            path = urllib.parse.unquote(path.split("?", 1)[0])
            if path.startswith("/kit/"):
                return os.path.join(kit_dir, path[5:])
            if path.startswith("/fonts/"):
                return os.path.join(FONT_DIR, path[7:])
            return os.path.join(STAGE_DIR, path.lstrip("/"))

        def do_GET(self):
            if self.path.startswith("/favicon.ico"):   # Chrome asks for it automatically
                self.send_response(204)
                self.end_headers()
                return
            super().do_GET()

        def log_message(self, *a):
            pass
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def find_chrome(explicit=None):
    for p in [explicit, os.environ.get("CHROME_PATH")] + CHROME_CANDIDATES:
        if p and os.path.exists(p):
            return p
    return None


class Stage:
    """One headless Chrome page with the stage loaded."""

    def __init__(self, cfg, kit_dir, chrome=None):
        from playwright.sync_api import sync_playwright
        self.cfg, self.errors = cfg, []
        self.srv = start_server(kit_dir)
        self.pw = sync_playwright().start()
        self.browser = self.pw.chromium.launch(
            executable_path=find_chrome(chrome), headless=True,
            args=["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
                  "--ignore-gpu-blocklist", "--hide-scrollbars"])
        self.page = self.browser.new_page(viewport={"width": cfg["width"], "height": cfg["height"]},
                                          device_scale_factor=1)
        self.page.on("pageerror", lambda e: self.errors.append(str(e)))
        self.page.on("console", lambda m: self.errors.append(m.text)
                     if m.type == "error" and not m.text.startswith("Failed to load resource") else None)
        self.page.on("response", lambda r: self.errors.append(f"HTTP {r.status} for {r.url}") if r.status >= 400 else None)
        self.page.goto(f"http://127.0.0.1:{self.srv.server_address[1]}/stage.html")
        self.page.evaluate("cfg => window.initStage(cfg)", cfg)
        self._check()

    def _check(self):
        if self.errors:
            raise RuntimeError("stage error: " + " | ".join(self.errors[:3]))

    def load(self, beat):
        self.page.evaluate("b => window.loadBeat(b)", beat)
        self._check()

    def frame(self, t, fmt="jpeg"):
        self.page.evaluate("t => window.renderAt(t)", t)
        self._check()
        if fmt == "png":
            return self.page.screenshot(type="png")
        return self.page.screenshot(type="jpeg", quality=92)

    def close(self):
        try:
            self.browser.close()
            self.pw.stop()
        finally:
            self.srv.shutdown()


# ----------------------------------------------------------------- rendering
def n_frames(beat, fps):
    return max(1, round(float(beat.get("duration", 3)) * fps))


def encode_beat(stage, beat, fps, crf, out_path):
    stage.load(beat)
    n = n_frames(beat, fps)
    tmp = out_path[:-4] + ".part.mp4"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(fps), "-c:v", "mjpeg",
           "-i", "-", "-c:v", "libx264", "-crf", str(crf), "-preset", "veryfast", "-pix_fmt", "yuv420p",
           "-r", str(fps), "-movflags", "+faststart", tmp]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        for i in range(n):
            p.stdin.write(stage.frame(i / fps))
        p.stdin.close()
    except BrokenPipeError:
        pass
    err = p.stderr.read().decode()
    if p.wait() != 0:
        sys.exit("ffmpeg failed:\n" + err[-1500:])
    os.replace(tmp, out_path)


def worker_main(job_path):
    job = json.load(open(job_path, encoding="utf-8"))
    stage = Stage(job["cfg"], job["kit_dir"], job.get("chrome"))
    try:
        for t in job["tasks"]:
            print(f"beat {t['index'] + 1}: rendering {t['beat'].get('duration', 3)}s ...", flush=True)
            encode_beat(stage, t["beat"], job["fps"], job["crf"], t["out"])
    finally:
        stage.close()


def contact_sheet(files, cols, path):
    first = Image.open(files[0])
    tw = 240
    th = int(tw * first.height / first.width)
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGB", (tw * cols, th * rows), (12, 12, 12))
    for i, f in enumerate(files):
        sheet.paste(Image.open(f).convert("RGB").resize((tw, th), Image.LANCZOS), ((i % cols) * tw, (i // cols) * th))
    sheet.save(path)


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit("command failed:\n" + r.stderr[-1500:])


def main():
    ap = argparse.ArgumentParser(description="Render a 3D motion-illustration Reel from a brand kit + beats file.")
    ap.add_argument("--kit", required=True)
    ap.add_argument("--beats", required=True)
    ap.add_argument("--out", default="reel.mp4")
    ap.add_argument("--audio")
    ap.add_argument("--stills", help="directory: 3 stills per beat + contact.png, no video")
    ap.add_argument("--only", type=int, help="1-based beat number")
    ap.add_argument("--size", help="WxH (default from beats meta, else 720x1280)")
    ap.add_argument("--fps", type=int)
    ap.add_argument("--crf", type=int, default=22)
    ap.add_argument("--jobs", type=int, default=0, help="parallel Chrome workers (default: min(2, cpus))")
    ap.add_argument("--workdir")
    ap.add_argument("--chrome", help="path to Chrome/Chromium (else auto-detected)")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--worker", help=argparse.SUPPRESS)
    a = ap.parse_args()
    if a.worker:
        return worker_main(a.worker)

    kit_path = os.path.abspath(a.kit)
    kit_dir = os.path.dirname(kit_path)
    kit = json.load(open(kit_path, encoding="utf-8"))
    spec = json.load(open(a.beats, encoding="utf-8"))
    meta = spec.get("meta", {})
    size = a.size or "x".join(str(v) for v in meta.get("size", [720, 1280]))
    W, H = (int(v) // 2 * 2 for v in size.lower().split("x"))
    fps = a.fps or int(meta.get("fps", 30))
    beats = spec["beats"]
    theme, font_css, loads = build_theme(kit)
    cfg = {"width": W, "height": H, "theme": theme, "fontCss": font_css, "fontLoads": loads}
    picks = [a.only - 1] if a.only else list(range(len(beats)))

    if a.stills:
        os.makedirs(a.stills, exist_ok=True)
        stage = Stage(cfg, kit_dir, a.chrome)
        files = []
        try:
            for k in picks:
                stage.load(beats[k])
                n = n_frames(beats[k], fps)
                for j, frac in enumerate((0.22, 0.58, 0.93)):
                    p = os.path.join(a.stills, f"b{k + 1:02d}_{j}.png")
                    open(p, "wb").write(stage.frame(min(n - 1, int(frac * n)) / fps, "png"))
                    files.append(p)
                print(f"stills: beat {k + 1}", flush=True)
        finally:
            stage.close()
        contact_sheet(files, 6, os.path.join(a.stills, "contact.png"))
        print("contact sheet:", os.path.join(a.stills, "contact.png"))
        return

    out = os.path.abspath(a.out)
    work = a.workdir or os.path.join(os.path.dirname(out), ".reels3d_work")
    os.makedirs(work, exist_ok=True)
    stage_hash = hashlib.sha1(b"".join(open(os.path.join(STAGE_DIR, f), "rb").read()
                                       for f in sorted(os.listdir(STAGE_DIR)) if f.endswith((".js", ".html")))).hexdigest()[:8]
    todo, paths = [], []
    for k in picks:
        key = hashlib.sha1(json.dumps([beats[k], theme, W, H, fps, a.crf, VERSION, stage_hash],
                                      sort_keys=True).encode()).hexdigest()[:12]
        path = os.path.join(work, f"beat_{k + 1:02d}_{key}.mp4")
        paths.append(path)
        if os.path.exists(path) and not a.force:
            print(f"beat {k + 1}/{len(beats)}: cached")
        else:
            todo.append({"index": k, "beat": beats[k], "out": path})

    jobs = max(1, min(a.jobs or min(2, os.cpu_count() or 1), len(todo) or 1))
    procs = []
    for w in range(jobs):
        mine = todo[w::jobs]
        if not mine:
            continue
        jp = os.path.join(work, f"job{w}.json")
        json.dump({"cfg": cfg, "kit_dir": kit_dir, "fps": fps, "crf": a.crf, "chrome": a.chrome, "tasks": mine},
                  open(jp, "w", encoding="utf-8"))
        procs.append(subprocess.Popen([sys.executable, os.path.abspath(sys.argv[0]), "--kit", a.kit, "--beats", a.beats,
                                       "--worker", jp]))
    codes = [p.wait() for p in procs]
    if any(codes):
        sys.exit("a render worker failed (see messages above)")
    if a.only:
        print("beat file:", paths[0])
        return

    lst = os.path.join(work, "concat.txt")
    with open(lst, "w") as fh:
        for p in paths:
            fh.write(f"file '{p}'\n")
    joined = out[:-4] + ".part.mp4"
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", joined])
    if a.audio:
        mux = out[:-4] + ".mux.mp4"
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", joined, "-i", a.audio, "-map", "0:v", "-map", "1:a",
             "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", mux])
        os.remove(joined)
        os.replace(mux, out)
    else:
        os.replace(joined, out)
    total = sum(float(beats[k].get("duration", 3)) for k in picks)
    print(f"done: {out}  ({total:.1f}s, {W}x{H}@{fps})")


if __name__ == "__main__":
    main()
