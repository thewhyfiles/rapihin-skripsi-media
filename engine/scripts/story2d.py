#!/usr/bin/env python3
"""
story2d.py - flat-vector "stickfolk" storytelling videos (9:16) from a brand kit + a story file.

Same pipeline as reels3d.py (headless Chrome renders every frame from t, per-beat mp4 cache, concat with
`-c copy`, optional audio mux), but with the SVG engine in assets/story2d: sky/sea/city backgrounds,
rigged people, boats, ships, gulls, fish schools, radar, lights, camera moves and one-word subtitles.

    python story2d.py --kit brand-kit.json --beats story.json --out story.mp4
    python story2d.py ... --stills ./stills      # look first: 3 frames per beat + contact sheet
    python story2d.py ... --only 3               # one beat only (1-based)
    python story2d.py ... --audio vo.mp3         # mux voiceover (video is not re-encoded)

All options are the ones of reels3d.py.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import reels3d as R  # noqa: E402

R.STAGE_DIR = os.path.join(os.path.dirname(HERE), "assets", "story2d")
R.VERSION = "story-1.0"

STORY_PALETTE = {
    "sky_top": "#16121f", "sky_bottom": "#4a2a3a", "sun": "#f0903a", "sea_top": "#1c3a63", "sea_bottom": "#0a1730",
    "skin": "#f1eee6", "shirt": "#d9d5c6", "sleeve": "#cfcab9", "pants": "#37383f", "hero": "#f5b60a",
    "straw": "#d9b45a", "cap": "#d8362b", "cap_dark": "#9c2219", "red": "#d8362b", "tie": "#d8362b",
    "hull": "#3a281c", "stripe": "#d9c9a8", "window": "#e6b85c", "beak": "#ee9b2e", "light": "#ffd27a",
    "accent": "#4f66f5",
}
STORY_DEFAULTS = {"caption_y": 0.44, "caption_size": 19, "wm_size": 40, "wm_opacity": 0.38, "wm_y": 0.085,
                  "vignette": 0.45, "grain": 0.07}


def story_theme(kit):
    theme, css, loads = _orig(kit)
    sk = kit.get("story", {})
    pal = dict(STORY_PALETTE)
    kp = kit.get("palette", {})
    if "accent" in kp:
        pal["accent"] = kp["accent"]
    pal.update(sk.get("palette", {}))
    st = dict(STORY_DEFAULTS)
    st.update({k: v for k, v in sk.items() if k != "palette"})
    st["palette"] = pal
    theme["story"] = st
    return theme, css, loads


_orig = R.build_theme
R.build_theme = story_theme

if __name__ == "__main__":
    R.main()
