"""
End-to-end build orchestration.

This module is called from the notebook (and from the CLI during dev).
It reads config, fetches ORCID, generates QR codes, renders all pages
and writes the final HTML files to the repo root.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from . import orcid as orcid_mod
from . import projects_lib
from . import publications_lib
from . import qr as qr_mod
from . import render as render_mod
from . import substack as substack_mod
from . import vcard as vcard_mod


# --------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------

def repo_root() -> Path:
    """
    The build script lives at scripts/lib/build.py, so the repo root is
    two directories up.
    """
    return Path(__file__).resolve().parent.parent.parent


# --------------------------------------------------------------------
# Load configs
# --------------------------------------------------------------------

def load_configs(root: Path) -> dict[str, Any]:
    cfg_dir = root / "config"
    return {
        "profile": _yaml(cfg_dir / "profile.yaml"),
        "tags": _yaml(cfg_dir / "tags.yaml"),
        "projects": _yaml(cfg_dir / "projects.yaml"),
        "publications": _yaml(cfg_dir / "publications.yaml"),
    }


def _yaml(path: Path) -> dict:
    with open(path, encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


# --------------------------------------------------------------------
# ORCID
# --------------------------------------------------------------------

def build_publications(cfg: dict) -> list[publications_lib.PubGroup]:
    orcid_id = cfg["profile"].get("orcid_id")
    overrides = cfg["publications"].get("orcid_overrides") or {}
    manual = cfg["publications"].get("manual") or []

    orcid_pubs: list[orcid_mod.Publication] = []
    if orcid_id:
        try:
            orcid_pubs = orcid_mod.fetch_orcid_works(orcid_id)
            print(f"  ORCID: fetched {len(orcid_pubs)} work(s)")
        except Exception as exc:
            print(f"  ORCID fetch failed: {exc}")

    orcid_pubs = orcid_mod.apply_overrides(orcid_pubs, overrides)
    orcid_pubs = orcid_mod.dedup_preprints(orcid_pubs)

    manual_pubs = publications_lib.manual_to_publications(manual)
    all_pubs = orcid_pubs + manual_pubs
    return publications_lib.group_publications(all_pubs), orcid_pubs + manual_pubs


# --------------------------------------------------------------------
# QRs
# --------------------------------------------------------------------

def build_qrs(root: Path, profile: dict) -> None:
    qr_dir = root / "assets" / "qr"
    qr_dir.mkdir(parents=True, exist_ok=True)

    # vCard
    vcf = vcard_mod.build_vcard(profile)
    qr_mod.write_qr(vcf, qr_dir / "vcard.png")
    qr_mod.write_vcf(vcf, qr_dir / "mayank-date.vcf")

    # Site URL
    qr_mod.write_qr(profile["site_url"], qr_dir / "site.png")

    # LinkedIn
    for s in profile.get("socials", []):
        if s.get("icon") == "linkedin":
            qr_mod.write_qr(s["url"], qr_dir / "linkedin.png")
            break


# --------------------------------------------------------------------
# Sparkline SVG
# --------------------------------------------------------------------

def build_sparkline(pubs: list[orcid_mod.Publication]) -> str | None:
    counts = orcid_mod.pub_year_counts(pubs)
    if not counts:
        return None
    min_y = min(counts)
    max_y = max(counts)
    years = list(range(min_y, max_y + 1))
    values = [counts.get(y, 0) for y in years]

    width = 220
    height = 50
    gap = 3
    n = len(years)
    bar_w = max((width - gap * (n - 1)) / n, 2)
    max_v = max(values) or 1

    bars = []
    for i, v in enumerate(values):
        bh = (v / max_v) * (height - 10) if v else 2
        x = i * (bar_w + gap)
        y = height - bh
        bars.append(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{bar_w:.1f}" height="{bh:.1f}" rx="1.5" fill="var(--gold)"/>'
        )

    svg = (
        f'<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" '
        f'xmlns="http://www.w3.org/2000/svg">'
        f'<title>Publications by year, {min_y}–{max_y}</title>'
        + "".join(bars)
        + f'<text x="0" y="{height + 11}" font-size="9" fill="var(--text-muted)" '
        f'font-family="Inter, sans-serif">{min_y}</text>'
        f'<text x="{width}" y="{height + 11}" text-anchor="end" font-size="9" '
        f'fill="var(--text-muted)" font-family="Inter, sans-serif">{max_y}</text>'
        f'</svg>'
    )
    return svg


# --------------------------------------------------------------------
# Projects
# --------------------------------------------------------------------

def build_projects(cfg: dict):
    tags_cfg = cfg["tags"]
    projects = cfg["projects"].get("projects") or []
    groups = projects_lib.group_projects(projects, tags_cfg)
    # Order each project's tags for display
    for g in groups:
        for p in g.projects:
            p["tags_ordered"] = projects_lib.all_tags_in_order(p.get("tags", []), tags_cfg)
    return groups


# --------------------------------------------------------------------
# Substack
# --------------------------------------------------------------------

def build_substack_posts(profile: dict) -> list:
    url = (profile.get("substack") or {}).get("url")
    limit = (profile.get("substack") or {}).get("max_posts_on_home", 3)
    return substack_mod.fetch_posts(url, limit=limit) if url else []


# --------------------------------------------------------------------
# Render pages
# --------------------------------------------------------------------

def render_all(root: Path, cfg: dict) -> None:
    print("Fetching publications...")
    pub_groups, all_pubs = build_publications(cfg)

    print("Building QR codes & vCard...")
    build_qrs(root, cfg["profile"])

    print("Grouping projects...")
    project_groups = build_projects(cfg)

    print("Fetching Substack posts (if configured)...")
    substack_posts = build_substack_posts(cfg["profile"])

    print("Rendering sparkline...")
    sparkline_svg = build_sparkline(all_pubs)

    print("Rendering templates...")
    env = render_mod.make_env(root / "templates")

    base_ctx = dict(
        profile=cfg["profile"],
        tag_labels=cfg["tags"].get("tag_labels", {}),
        tag_descriptions=cfg["tags"].get("tag_descriptions", {}),
        show_writing_tab=bool(substack_posts),
    )

    render_mod.render_page(
        env, "index.html.j2", root / "index.html",
        substack_posts=substack_posts,
        sparkline_svg=sparkline_svg,
        **base_ctx,
    )
    render_mod.render_page(
        env, "projects.html.j2", root / "projects.html",
        project_groups=project_groups,
        **base_ctx,
    )
    render_mod.render_page(
        env, "research.html.j2", root / "research.html",
        pub_groups=pub_groups,
        **base_ctx,
    )
    render_mod.render_page(
        env, "contact.html.j2", root / "contact.html",
        **base_ctx,
    )

    print("Build complete.")


def main() -> None:
    root = repo_root()
    cfg = load_configs(root)
    render_all(root, cfg)


if __name__ == "__main__":
    main()
