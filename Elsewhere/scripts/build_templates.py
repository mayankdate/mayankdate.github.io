#!/usr/bin/env python3
"""
Elsewhere · template generator
================================

Regenerates the hand-drawing guides in ``assets/map/templates/`` from the
single source of truth — ``scene.js`` (window.CABIN_SCENE) plus the sprite
and interaction configs. Run it whenever the world geometry changes, then
paint over the guides in Procreate and save them back at the same path.

It produces, all sized to the world at ``tile = 32 px`` (1 tile = 32 px,
so the 64×64-tile island is 2048×2048):

  * ``manifest.json``            — every object's pixel position/size, plus
                                   the interactive-sprite spawn boxes and the
                                   sky sheet layout.
  * ``<object>.png``             — one flat-colour guide per scene object
                                   (walls, stations, mounted art, window
                                   glass). The station "headroom" is left
                                   transparent so you draw the device there.
  * ``ground.png``               — the whole 2048×2048 terrain/floor/stairs
                                   layer as one flat guide.
  * ``sky_template.png``         — a 2048×2048 guide for the weather sky:
                                   sixteen 512×512 cells (4 weather rows ×
                                   4 animation frames). Paint it, then export
                                   as assets/sprites/sky.png.

Interactive sprites (the fireplace flame, the turntable's spinning disc, the
coffee steam) get a labelled placeholder box drawn onto their station's guide,
marking exactly where and how big the animated sprite lands, so you can draw
the station around it.

What it NEVER overwrites (your real art):
  * assets/sprites/sky.png       (the painted sky sheet)
  * assets/map/ground.png        (the painted ground, if you've drawn one)
  * assets/map/templates/window_*_frame.png  (the painted window frames)

Files are only rewritten when their pixels actually change, so re-running
with no world change produces no git noise.

Usage:  python3 scripts/build_templates.py   [--dry-run]
Deps:   Pillow, PyYAML
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import yaml
    from PIL import Image, ImageDraw, ImageFont
except ImportError as e:  # pragma: no cover
    sys.exit(f"missing dependency: {e}. Install with: pip install Pillow PyYAML")

TILE = 32
ROOT = Path(__file__).resolve().parent.parent        # the Elsewhere/ dir
SCENE_JS = ROOT / "scene.js"
CONFIG = ROOT / "config"
TEMPLATES = ROOT / "assets" / "map" / "templates"

# Guide colour for interactive-sprite placeholders — deliberately not a
# palette colour, so it reads as "scaffolding, paint over me".
PLACEHOLDER_RGB = (255, 45, 200)

# Window frame art is painted + lives with the map art now; the generator
# leaves those files alone.
PRESERVE = {"window_cafe_frame.png", "window_library_frame.png"}


def load_scene() -> dict:
    """Pull the CABIN_SCENE object literal out of scene.js."""
    text = SCENE_JS.read_text(encoding="utf-8")
    m = re.search(r"window\.CABIN_SCENE\s*=\s*(\{.*\})\s*;?\s*$", text, re.DOTALL)
    if not m:
        sys.exit("could not find `window.CABIN_SCENE = {...}` in scene.js")
    return json.loads(m.group(1))


def load_yaml(name: str):
    return yaml.safe_load((CONFIG / f"{name}.yaml").read_text(encoding="utf-8"))


def px(v: float) -> int:
    return round(v * TILE)


def write_png_if_changed(img: Image.Image, path: Path, dry: bool) -> bool:
    """Write only when the pixels differ from what's on disk. Returns True
    if the file changed (or would, under --dry-run)."""
    img = img.convert("RGBA")
    if path.exists():
        try:
            old = Image.open(path).convert("RGBA")
            if old.size == img.size and old.tobytes() == img.tobytes():
                return False
        except Exception:
            pass
    if not dry:
        path.parent.mkdir(parents=True, exist_ok=True)
        img.save(path)
    return True


def write_json_if_changed(data, path: Path, dry: bool) -> bool:
    new = json.dumps(data, indent=2) + "\n"
    if path.exists() and path.read_text(encoding="utf-8") == new:
        return False
    if not dry:
        path.write_text(new, encoding="utf-8")
    return True


# --------------------------------------------------------------------------
# Interactive-sprite spawn boxes
# --------------------------------------------------------------------------

def gather_spawns(accents, interactions, sprites):
    """Every animated sprite that lands at a fixed spot in the world, as
    {ref, anim, world_rect:[x,y,w,h]} using the engine's bottom-centre
    foot-anchor. Sources: accents.yaml (always-on / toggled accents) and
    any interaction `spawn` effect with a fixed `at`."""
    spawns = []

    def rect_for(ref, at):
        d = (sprites.get(ref) or {}).get("draw")
        if not d or not at:
            return None
        w, h = d["w"], d["h"]
        return [at[0] - w / 2, at[1] - h, w, h]

    for a in (accents or []):
        r = rect_for(a.get("ref"), a.get("at"))
        if r:
            spawns.append({"ref": a["ref"], "anim": a.get("anim"), "world_rect": r,
                           "label": a.get("id", a["ref"])})

    for cfg in (interactions or {}).values():
        for eff in (cfg.get("effects") or []):
            sp = eff.get("spawn")
            if isinstance(sp, dict) and "at" in sp:
                r = rect_for(sp.get("ref"), sp["at"])
                if r:
                    spawns.append({"ref": sp["ref"], "anim": sp.get("anim"),
                                   "world_rect": r, "label": sp["ref"]})
    return spawns


def station_for(point, objects):
    """The station object whose visual bounds contain the spawn anchor."""
    x, y = point
    for o in objects:
        if o.get("category") != "station":
            continue
        bx, by, bw, bh = o["visualBounds"]
        if bx <= x <= bx + bw and by <= y <= by + bh:
            return o
    return None


# --------------------------------------------------------------------------
# Rendering
# --------------------------------------------------------------------------

def render_object(o, spawns_by_obj):
    """A flat-colour guide for one scene object, sized to its visual bounds.
    Shapes are filled with their palette colour; the area with no shape (a
    station's headroom) stays transparent. Interactive-sprite placeholders
    are drawn on top."""
    vbx, vby, vbw, vbh = o["visualBounds"]
    img = Image.new("RGBA", (px(vbw), px(vbh)), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    ox, oy = vbx * TILE, vby * TILE
    for s in o.get("shapes", []):
        rx, ry, rw, rh = s["rect"]
        x0, y0 = round(rx * TILE - ox), round(ry * TILE - oy)
        draw.rectangle([x0, y0, x0 + px(rw) - 1, y0 + px(rh) - 1], fill=_hex(s["color"]))

    for sp in spawns_by_obj.get(o["id"], []):
        wx, wy, ww, wh = sp["world_rect"]
        x0, y0 = round(wx * TILE - ox), round(wy * TILE - oy)
        x1, y1 = x0 + px(ww) - 1, y0 + px(wh) - 1
        draw.rectangle([x0, y0, x1, y1], fill=PLACEHOLDER_RGB + (70,),
                       outline=PLACEHOLDER_RGB + (255,), width=2)
        _label(draw, sp["ref"], x0, y0, x1, y1)
    return img


def render_ground(scene):
    """The whole terrain/floor/stairs layer as one flat 2048×2048 guide —
    the same thing the engine code-draws when no ground.png is present."""
    size = scene["grid"]["columns"] * TILE
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pal = scene["palette"]

    def rect(r, color):
        x, y, w, h = r
        draw.rectangle([px(x), px(y), px(x + w) - 1, px(y + h) - 1], fill=_hex(color))

    for t in scene["terrain"]:
        if t["id"] == "floor":
            continue
        for r in t["rects"]:
            rect(r, t["color"])
    for f in scene["floors"]:
        draw.polygon([(px(x), px(y)) for x, y in f["polygon"]], fill=_hex(pal["floor"]))
    for t in scene["terrain"]:
        if t["id"] == "floor":
            for r in t["rects"]:
                rect(r, pal["floor"])
    for s in scene["stairs"]:
        for r in s["visualRects"]:
            rect(r, pal["steps"])
    return img


def render_sky_template():
    """A 2048×2048 guide for the weather sky: 4 weather rows × 4 frame
    columns of 512×512 cells, with grid lines + labels. Paint it, then
    export the result as assets/sprites/sky.png."""
    cell, cols, rows = 512, 4, 4
    weathers = ["clear", "rain", "storm", "cloudy"]
    img = Image.new("RGBA", (cols * cell, rows * cell), (22, 24, 34, 255))
    draw = ImageDraw.Draw(img)
    grid = (90, 100, 120, 255)
    for c in range(cols + 1):
        draw.line([(c * cell, 0), (c * cell, rows * cell)], fill=grid, width=3)
    for r in range(rows + 1):
        draw.line([(0, r * cell), (cols * cell, r * cell)], fill=grid, width=3)
    big = _font(34)
    small = _font(24)
    for r in range(rows):
        for c in range(cols):
            x, y = c * cell, r * cell
            if c == 0:
                draw.text((x + 14, y + 12), weathers[r], fill=(220, 225, 235, 255), font=big)
            draw.text((x + 14, y + cell - 36), f"frame {c}", fill=(150, 160, 175, 255), font=small)
    return img


def _hex(s: str):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def _font(size: int):
    for name in ("DejaVuSans.ttf", "Arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()


def _label(draw, text, x0, y0, x1, y1):
    if x1 - x0 < 24 or y1 - y0 < 14:
        return
    font = _font(14)
    try:
        draw.text((x0 + 3, y0 + 2), text, fill=(255, 255, 255, 255), font=font)
    except Exception:
        pass


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Regenerate Elsewhere map templates.")
    ap.add_argument("--dry-run", action="store_true", help="report changes without writing")
    args = ap.parse_args()

    scene = load_scene()
    sprites = load_yaml("sprites")
    accents = load_yaml("accents")
    interactions = load_yaml("interactions")

    spawns = gather_spawns(accents, interactions, sprites)
    objects = scene["objects"]
    spawns_by_obj = {}
    for sp in spawns:
        wx, wy, ww, wh = sp["world_rect"]
        anchor = (wx + ww / 2, wy + wh)                 # bottom-centre = foot
        st = station_for(anchor, objects)
        if st:
            spawns_by_obj.setdefault(st["id"], []).append(sp)
        else:
            print(f"  ! no station contains spawn {sp['ref']} @ {anchor}")

    changed = []

    # Per-object guides + the manifest object list.
    manifest_objects = []
    for o in objects:
        vbx, vby, vbw, vbh = o["visualBounds"]
        entry = {
            "id": o["id"], "file": f"{o['id']}.png",
            "category": o.get("category"), "parent": o.get("parent"),
            "posPx": [px(vbx), px(vby)], "sizePx": [px(vbw), px(vbh)],
            "sortY": o.get("sortY"), "collisionRect": o.get("collisionRect"),
        }
        if o["id"] in spawns_by_obj:
            entry["placeholders"] = [{
                "ref": sp["ref"], "anim": sp["anim"],
                "rectPx": [round(sp["world_rect"][0] * TILE - vbx * TILE),
                           round(sp["world_rect"][1] * TILE - vby * TILE),
                           px(sp["world_rect"][2]), px(sp["world_rect"][3])],
            } for sp in spawns_by_obj[o["id"]]]
        if re.search(r"window", o["id"]) and o.get("category") == "mounted":
            entry["frame"] = f"{o['id']}_frame.png"
        manifest_objects.append(entry)

        if o.get("shapes"):
            img = render_object(o, spawns_by_obj)
            if write_png_if_changed(img, TEMPLATES / f"{o['id']}.png", args.dry_run):
                changed.append(f"{o['id']}.png")

    # Ground guide.
    if write_png_if_changed(render_ground(scene), TEMPLATES / "ground.png", args.dry_run):
        changed.append("ground.png")

    # Sky drawing template.
    if write_png_if_changed(render_sky_template(), TEMPLATES / "sky_template.png", args.dry_run):
        changed.append("sky_template.png")

    # Manifest.
    sky = sprites.get("sky", {})
    fw = sky.get("frameW", 512)
    manifest = {
        "tile": TILE,
        "note": "Generated by scripts/build_templates.py from scene.js + configs. "
                "Paint over the guides; keep the canvas size. Do not edit by hand.",
        "ground": {"file": "ground.png", "sizePx": [scene["grid"]["columns"] * TILE] * 2},
        "sky": {
            "template": "sky_template.png",
            "sheet": "assets/sprites/sky.png",
            "frameSizePx": fw,
            "cols": 4, "rows": 4,
            "weatherRows": {name: a["row"] for name, a in (sky.get("anims") or {}).items()},
        },
        "placeholderColor": "#%02x%02x%02x" % PLACEHOLDER_RGB,
        "objects": manifest_objects,
    }
    if write_json_if_changed(manifest, TEMPLATES / "manifest.json", args.dry_run):
        changed.append("manifest.json")

    verb = "would change" if args.dry_run else "wrote"
    if changed:
        print(f"{verb} {len(changed)} file(s):")
        for c in changed:
            print(f"  - {c}")
    else:
        print("up to date — nothing changed.")
    print(f"placeholders: " + ", ".join(
        f"{oid}({len(v)})" for oid, v in spawns_by_obj.items()) or "none")


if __name__ == "__main__":
    main()
