#!/usr/bin/env python3
"""
AfterHours · painted-layer fuzzy renamer
========================================

Procreate exports layers with its own layer-naming scheme, so a batch of
painted PNGs lands in ``assets/map/painted/`` with names like
``island-1.png``, ``island-2.png``, ... that have nothing to do with the
template they were painted over (``wall_library.png``, ``coffee.png``, ...).

This script matches each painted PNG to the template whose alpha-mask shape
and position it most resembles, then renames the painted file to that
template's name — so the engine's ``painted/<name>.png`` override just works.

Matching ignores colour; it compares the mask of non-transparent pixels on
each layer, downsampled to 128×128. That's forgiving enough that art which
spills over the template's base shape (grass bleeding past the island
footprint, a drop shadow outside a wall) still lands on the right template.
A greedy best-first assignment on the IoU matrix picks the final 1-to-1
mapping — Hungarian is overkill at 27×27 and keeps the dep list to Pillow.

Usage:
    python3 scripts/match_painted.py            # dry-run (prints the plan)
    python3 scripts/match_painted.py --apply    # actually rename files
    python3 scripts/match_painted.py --apply --no-backup

The script never overwrites: if a target name is already a *template-named*
painted file, it's skipped (assumed already correct). Each renamed file is
first moved to ``painted/_unmatched_backup/`` unless ``--no-backup`` is set.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("missing dependency: Pillow. Install with: uv sync")

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "assets" / "map" / "templates"
PAINTED = ROOT / "assets" / "map" / "painted"

# Files in templates/ that are never valid override targets.
TEMPLATE_SKIP = {"_painter_reference.png", "manifest.json"}

# Downsample resolution for the mask comparison. 128 is plenty — the templates
# are coarse full-canvas slices and we only need coarse shape agreement.
MASK_SIZE = 128

# Alpha threshold: pixels with alpha below this count as transparent.
ALPHA_T = 16


def load_mask(path: Path) -> list[bool]:
    """Return a flat list of booleans: True where alpha > ALPHA_T, downsampled
    to MASK_SIZE × MASK_SIZE. Comparing on this flat list is fast and avoids
    numpy."""
    im = Image.open(path).convert("RGBA")
    im = im.resize((MASK_SIZE, MASK_SIZE), Image.BILINEAR)
    alpha = im.split()[3].tobytes()
    return [a > ALPHA_T for a in alpha]


def iou(a: list[bool], b: list[bool]) -> float:
    inter = union = 0
    for x, y in zip(a, b):
        if x and y:
            inter += 1
            union += 1
        elif x or y:
            union += 1
    return inter / union if union else 0.0


def coverage(painted: list[bool], template: list[bool]) -> float:
    """Fraction of the template mask that the painted mask covers. Used as a
    tie-breaker when a painted layer spills far outside the template (IoU
    drops but coverage stays high)."""
    inter = tmpl = 0
    for p, t in zip(painted, template):
        if t:
            tmpl += 1
            if p:
                inter += 1
    return inter / tmpl if tmpl else 0.0


def score(painted: list[bool], template: list[bool]) -> float:
    """Blend IoU with template-coverage so a painted layer that overpaints
    its template still scores highly, while still rewarding tight matches."""
    return 0.6 * iou(painted, template) + 0.4 * coverage(painted, template)


def collect_pngs(folder: Path, skip: set[str]) -> list[Path]:
    return sorted(p for p in folder.glob("*.png") if p.name not in skip)


def template_names() -> set[str]:
    return {p.name for p in collect_pngs(TEMPLATES, TEMPLATE_SKIP)}


def greedy_assign(scores: dict[tuple[str, str], float],
                  painted: list[str], templates: list[str]
                  ) -> list[tuple[str, str, float]]:
    """Pick the highest-scoring (painted, template) pair, remove both from the
    pool, repeat. For 27×27 this is effectively optimal and dependency-free."""
    remaining_p = set(painted)
    remaining_t = set(templates)
    out: list[tuple[str, str, float]] = []
    pairs = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    for (p, t), s in pairs:
        if p in remaining_p and t in remaining_t:
            out.append((p, t, s))
            remaining_p.discard(p)
            remaining_t.discard(t)
    # Anything left unassigned (painted or template with no partner).
    for p in sorted(remaining_p):
        out.append((p, "", 0.0))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--apply", action="store_true",
                    help="rename files on disk (default: dry-run, prints plan).")
    ap.add_argument("--no-backup", action="store_true",
                    help="do not keep copies of the pre-rename files in "
                         "painted/_unmatched_backup/ before renaming.")
    ap.add_argument("--min-score", type=float, default=0.05,
                    help="warn about any pairing scoring below this (0..1). "
                         "Default 0.05 — matches should normally be far higher.")
    args = ap.parse_args()

    tmpl_names = template_names()
    if not tmpl_names:
        sys.exit(f"no template PNGs under {TEMPLATES}")

    # Painted files whose name is already a template name are already matched.
    all_painted = collect_pngs(PAINTED, skip=set())
    needs_match = [p for p in all_painted if p.name not in tmpl_names]
    already_ok = [p for p in all_painted if p.name in tmpl_names]

    # Templates that still have no painted override are the matching targets.
    taken = {p.name for p in already_ok}
    open_templates = sorted(tmpl_names - taken)

    print(f"templates total:        {len(tmpl_names)}")
    print(f"painted files total:    {len(all_painted)}")
    print(f"  already named right:  {len(already_ok)}")
    print(f"  need matching:        {len(needs_match)}")
    print(f"  open template slots:  {len(open_templates)}")
    print()

    if not needs_match:
        print("nothing to rename. all painted files already use template names.")
        return

    if not open_templates:
        sys.exit("every template already has a painted override — nothing to assign to.")

    # Precompute masks once.
    print(f"loading masks (downsampled to {MASK_SIZE}×{MASK_SIZE})...")
    painted_masks = {p.name: load_mask(p) for p in needs_match}
    tmpl_masks = {name: load_mask(TEMPLATES / name) for name in open_templates}

    # Full score matrix.
    scores: dict[tuple[str, str], float] = {}
    for pn, pm in painted_masks.items():
        for tn, tm in tmpl_masks.items():
            scores[(pn, tn)] = score(pm, tm)

    plan = greedy_assign(scores,
                         [p.name for p in needs_match],
                         open_templates)

    # For transparency, also print each painted layer's top-3 candidates.
    print()
    print("match plan (highest score first):")
    print(f"{'painted':30} -> {'template':32}  score   (runner-ups)")
    print("-" * 100)
    low = []
    for painted_name, tmpl, s in sorted(plan, key=lambda r: -r[2]):
        if not tmpl:
            print(f"{painted_name:30} -> {'(no match left)':32}  -")
            continue
        top3 = sorted(
            ((tn, scores[(painted_name, tn)]) for tn in open_templates
             if tn != tmpl),
            key=lambda kv: -kv[1],
        )[:2]
        rub = ", ".join(f"{tn}:{sc:.2f}" for tn, sc in top3) or "-"
        flag = "  <-- LOW" if s < args.min_score else ""
        print(f"{painted_name:30} -> {tmpl:32}  {s:.3f}  ({rub}){flag}")
        if s < args.min_score:
            low.append((painted_name, tmpl, s))

    print()
    if low:
        print(f"{len(low)} pairing(s) scored below --min-score={args.min_score}; "
              "inspect before applying.")

    if not args.apply:
        print("\ndry run — pass --apply to rename files on disk.")
        return

    backup_dir = PAINTED / "_unmatched_backup"
    if not args.no_backup:
        backup_dir.mkdir(exist_ok=True)

    # Two-phase rename to avoid collisions (A->B and B->C in the same batch).
    tmp_renames: list[tuple[Path, Path, Path]] = []
    for painted_name, tmpl, _ in plan:
        if not tmpl:
            continue
        src = PAINTED / painted_name
        dst = PAINTED / tmpl
        tmp = PAINTED / f"__match_tmp__{tmpl}"
        if not args.no_backup:
            shutil.copy2(src, backup_dir / painted_name)
        src.rename(tmp)
        tmp_renames.append((src, tmp, dst))

    for _, tmp, dst in tmp_renames:
        if dst.exists():
            # Should not happen (open_templates excluded taken names) but be safe.
            print(f"  ! destination {dst.name} already exists; leaving {tmp.name}.")
            continue
        tmp.rename(dst)
        print(f"  renamed -> {dst.name}")

    print(f"\ndone. renamed {len(tmp_renames)} file(s).")
    if not args.no_backup:
        print(f"backup copies in {backup_dir.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
