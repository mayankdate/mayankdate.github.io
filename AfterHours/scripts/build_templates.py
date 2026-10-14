#!/usr/bin/env python3
"""
AfterHours · map template generator
====================================

Exports every map layer as a full-canvas 2048×2048 "slice" (one per scene
object, plus the island and the house floor), rendered from scene.js and the
configs. That's the whole pipeline — paint each slice in Procreate at full map
size, drop the painted PNG into ``assets/map/painted/`` under the same name,
and it overrides the unpainted export automatically: the engine loads
``painted/<x>.png`` when present, otherwise ``templates/<x>.png``.

Outputs, all in ``assets/map/templates/`` and all 2048×2048:

  * ``island.png``        grass + cliff — the floating island ground.
  * ``floor.png``         the house floor footprint + stairs, painted in a
                          different colour from the island.
  * ``<object>.png``      one slice per scene object (walls, sides, stations,
                          gallery): the object's shapes at their WORLD position,
                          transparent everywhere else. Stations carry a magenta
                          placeholder box where their animated sprite (flame /
                          disc / steam) lands.
  * ``window_<id>_frame.png``  windows export a full-canvas frame guide instead
                          (frame + sill filled, the glass punched open as the
                          live sky viewport), so the frame stacks like any other
                          slice.
  * ``sky_template.png``  the weather-sky drawing grid (4 weather rows × 4
                          frames of 512 px). Paint it, export to
                          assets/sprites/sky.png.
  * ``_painter_reference.png``  a reference layer for Procreate: the unpainted
                          island + floor, red collision strips, and an id label
                          at each object's foot.
  * ``manifest.json``     every object's pixel position / size / sort / collision.

Files are only rewritten when their pixels actually change. Nothing in
``assets/map/painted/`` or ``assets/sprites/sky.png`` is ever touched.

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
ROOT = Path(__file__).resolve().parent.parent        # the AfterHours/ dir
SCENE_JS = ROOT / "scene.js"
CONFIG = ROOT / "config"
TEMPLATES = ROOT / "assets" / "map" / "templates"
PAINTED = ROOT / "assets" / "map" / "painted"

# Guide colour for interactive-sprite placeholders — deliberately not a
# palette colour, so it reads as "scaffolding, paint over me".
PLACEHOLDER_RGB = (255, 45, 200)


# --------------------------------------------------------------------------
# Inputs
# --------------------------------------------------------------------------

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
# Interactive-sprite spawn boxes (drawn onto the station slices)
# --------------------------------------------------------------------------

def gather_spawns(accents, interactions, sprites):
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
            spawns.append({"ref": a["ref"], "anim": a.get("anim"), "world_rect": r})
    for cfg in (interactions or {}).values():
        for eff in (cfg.get("effects") or []):
            sp = eff.get("spawn")
            if isinstance(sp, dict) and "at" in sp:
                r = rect_for(sp.get("ref"), sp["at"])
                if r:
                    spawns.append({"ref": sp["ref"], "anim": sp.get("anim"), "world_rect": r})
    return spawns


def station_for(point, objects):
    x, y = point
    for o in objects:
        if o.get("category") != "station":
            continue
        bx, by, bw, bh = o["visualBounds"]
        if bx <= x <= bx + bw and by <= y <= by + bh:
            return o
    return None


# --------------------------------------------------------------------------
# Rendering (everything full-canvas = tileCount*32 square)
# --------------------------------------------------------------------------

def _size(scene):
    return scene["grid"]["columns"] * TILE


def _canvas(scene):
    img = Image.new("RGBA", (_size(scene),) * 2, (0, 0, 0, 0))
    return img, ImageDraw.Draw(img, "RGBA")


def _rect(draw, r, color):
    x, y, w, h = r
    draw.rectangle([px(x), px(y), px(x + w) - 1, px(y + h) - 1], fill=color if isinstance(color, tuple) else _hex(color))


def _draw_object_world(draw, o, spawns_by_obj):
    """One object's shapes (+ spawn placeholders) at WORLD position."""
    for s in o.get("shapes", []):
        _rect(draw, s["rect"], s["color"])
    for sp in spawns_by_obj.get(o["id"], []):
        wx, wy, ww, wh = sp["world_rect"]
        x0, y0 = px(wx), px(wy)
        x1, y1 = px(wx + ww) - 1, px(wy + wh) - 1
        draw.rectangle([x0, y0, x1, y1], fill=PLACEHOLDER_RGB + (70,),
                       outline=PLACEHOLDER_RGB + (255,), width=2)
        _label(draw, sp["ref"], x0, y0, x1, y1)


def render_object_slice(o, spawns_by_obj, scene):
    img, draw = _canvas(scene)
    _draw_object_world(draw, o, spawns_by_obj)
    return img


def _is_window(o):
    return o.get("category") == "mounted" and "window" in o["id"]


def render_window_frame(o, scene):
    """A full-canvas frame guide for a window: the frame/sill filled, with the
    glass punched transparent (it's a live sky viewport) and outlined. Painted
    full-canvas like every other slice, so it stacks on the map in place."""
    img, draw = _canvas(scene)
    _rect(draw, o["visualBounds"], "#9b7b99")
    glass = next((s for s in o["shapes"] if s.get("role") == "glass"), o["shapes"][0])["rect"]
    gx, gy, gw, gh = glass
    img.paste((0, 0, 0, 0), (px(gx), px(gy), px(gx + gw), px(gy + gh)))
    draw.rectangle([px(gx), px(gy), px(gx + gw) - 1, px(gy + gh) - 1], outline=(70, 80, 110, 255), width=3)
    return img


def render_island(scene):
    """grass + cliff — the floating island ground."""
    img, draw = _canvas(scene)
    for t in scene["terrain"]:
        if t["id"] in ("grass", "cliff"):
            for r in t["rects"]:
                _rect(draw, r, t["color"])
    return img


def render_floor(scene):
    """The house floor footprint (floor terrain + inferred floor polygons) and
    the stairs — painted separately from the island, in different colours."""
    img, draw = _canvas(scene)
    pal = scene["palette"]
    for f in scene["floors"]:
        draw.polygon([(px(x), px(y)) for x, y in f["polygon"]], fill=_hex(pal["floor"]))
    for t in scene["terrain"]:
        if t["id"] == "floor":
            for r in t["rects"]:
                _rect(draw, r, pal["floor"])
    for s in scene["stairs"]:
        for r in s["visualRects"]:
            _rect(draw, r, pal["steps"])
    return img


def render_sky_template():
    cell, cols, rows = 512, 4, 4
    weathers = ["clear", "rain", "storm", "cloudy"]
    img = Image.new("RGBA", (cols * cell, rows * cell), (22, 24, 34, 255))
    draw = ImageDraw.Draw(img)
    grid = (90, 100, 120, 255)
    for c in range(cols + 1):
        draw.line([(c * cell, 0), (c * cell, rows * cell)], fill=grid, width=3)
    for r in range(rows + 1):
        draw.line([(0, r * cell), (cols * cell, r * cell)], fill=grid, width=3)
    big, small = _font(34), _font(24)
    for r in range(rows):
        for c in range(cols):
            x, y = c * cell, r * cell
            if c == 0:
                draw.text((x + 14, y + 12), weathers[r], fill=(220, 225, 235, 255), font=big)
            draw.text((x + 14, y + cell - 36), f"frame {c}", fill=(150, 160, 175, 255), font=small)
    return img


def render_painter_reference(scene, objects):
    """Unpainted island + floor, with red collision strips and an id label at
    each object's foot — the single layer to import into Procreate."""
    img = render_island(scene)
    img.alpha_composite(render_floor(scene))
    draw = ImageDraw.Draw(img, "RGBA")
    for o in objects:
        cr = o.get("collisionRect")
        if cr:
            x, y, w, h = cr
            draw.rectangle([px(x), px(y), px(x + w) - 1, px(y + h) - 1],
                           fill=(255, 40, 40, 90), outline=(255, 40, 40, 230), width=2)
    font = _font(20)
    for o in objects:
        x, y, w, h = o["visualBounds"]
        fx, fy = px(x + w / 2), px(y + h)
        try:
            bb = draw.textbbox((0, 0), o["id"], font=font)
            tw = bb[2] - bb[0]
        except Exception:
            tw = len(o["id"]) * 10
        draw.text((fx - tw / 2, fy - 22), o["id"], font=font, fill=(20, 20, 28, 255),
                  stroke_width=3, stroke_fill=(255, 255, 255, 235))
    draw.rectangle([16, 16, 44, 36], fill=(255, 40, 40, 160), outline=(0, 0, 0, 200))
    draw.text((52, 16), "collision", font=font, fill=(20, 20, 28, 255),
              stroke_width=3, stroke_fill=(255, 255, 255, 235))
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
    try:
        draw.text((x0 + 3, y0 + 2), text, fill=(255, 255, 255, 255), font=_font(14))
    except Exception:
        pass


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Regenerate AfterHours map templates.")
    ap.add_argument("--dry-run", action="store_true", help="report changes without writing")
    args = ap.parse_args()
    dry = args.dry_run

    scene = load_scene()
    sprites = load_yaml("sprites")
    accents = load_yaml("accents")
    interactions = load_yaml("interactions")
    objects = scene["objects"]

    # Map each fixed spawn to the station it lands on.
    spawns_by_obj = {}
    for sp in gather_spawns(accents, interactions, sprites):
        wx, wy, ww, wh = sp["world_rect"]
        st = station_for((wx + ww / 2, wy + wh), objects)
        if st:
            spawns_by_obj.setdefault(st["id"], []).append(sp)
        else:
            print(f"  ! no station contains spawn {sp['ref']}")

    changed = []

    # Ground: island + floor.
    if write_png_if_changed(render_island(scene), TEMPLATES / "island.png", dry):
        changed.append("island.png")
    if write_png_if_changed(render_floor(scene), TEMPLATES / "floor.png", dry):
        changed.append("floor.png")

    # One full-canvas slice per object + the manifest.
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
                "rectPx": [px(sp["world_rect"][0]), px(sp["world_rect"][1]),
                           px(sp["world_rect"][2]), px(sp["world_rect"][3])],
            } for sp in spawns_by_obj[o["id"]]]
        if _is_window(o):
            entry["frame"] = f"{o['id']}_frame.png"
        manifest_objects.append(entry)
        if o.get("shapes"):
            # Windows export a full-canvas FRAME guide (glass left open); every
            # other object exports its full-canvas body slice.
            if _is_window(o):
                img, name = render_window_frame(o, scene), f"{o['id']}_frame.png"
            else:
                img, name = render_object_slice(o, spawns_by_obj, scene), f"{o['id']}.png"
            if write_png_if_changed(img, TEMPLATES / name, dry):
                changed.append(name)

    # Sky drawing grid + painter reference.
    if write_png_if_changed(render_sky_template(), TEMPLATES / "sky_template.png", dry):
        changed.append("sky_template.png")
    if write_png_if_changed(render_painter_reference(scene, objects),
                            TEMPLATES / "_painter_reference.png", dry):
        changed.append("_painter_reference.png")

    # Make sure the painted/ override folder exists (artists drop PNGs here).
    keep = PAINTED / ".gitkeep"
    if not keep.exists():
        changed.append("painted/.gitkeep")
        if not dry:
            PAINTED.mkdir(parents=True, exist_ok=True)
            keep.write_text("# Drop painted <name>.png here to override templates/<name>.png\n",
                            encoding="utf-8")

    sky = sprites.get("sky", {})
    manifest = {
        "tile": TILE,
        "canvasPx": _size(scene),
        "note": "Generated by scripts/build_templates.py from scene.js + configs. "
                "Every layer is a full-canvas slice; paint it and drop the PNG in "
                "assets/map/painted/ to override the export. Do not edit by hand.",
        "ground": {"island": "island.png", "floor": "floor.png"},
        "sky": {
            "template": "sky_template.png",
            "sheet": "assets/sprites/sky.png",
            "frameSizePx": sky.get("frameW", 512),
            "cols": 4, "rows": 4,
            "weatherRows": {name: a["row"] for name, a in (sky.get("anims") or {}).items()},
        },
        "placeholderColor": "#%02x%02x%02x" % PLACEHOLDER_RGB,
        "objects": manifest_objects,
    }
    if write_json_if_changed(manifest, TEMPLATES / "manifest.json", dry):
        changed.append("manifest.json")

    verb = "would change" if dry else "wrote"
    if changed:
        print(f"{verb} {len(changed)} file(s):")
        for c in changed:
            print(f"  - {c}")
    else:
        print("up to date — nothing changed.")
    print("placeholders: " + (", ".join(f"{k}({len(v)})" for k, v in spawns_by_obj.items()) or "none"))


if __name__ == "__main__":
    main()
