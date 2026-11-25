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
    profile = _yaml(cfg_dir / "profile.yaml")
    private_path = cfg_dir / "private.yaml"
    if private_path.exists():
        private = _yaml(private_path)
        for key in ("emails", "phones"):
            if key in private:
                profile[key] = private[key] or []
    else:
        print("  note: config/private.yaml not found; no emails/phones will be shown")
    return {
        "full_profile": profile,
        "profile": public_profile(profile),
        "projects": _yaml(cfg_dir / "projects.yaml"),
        "publications": _yaml(cfg_dir / "publications.yaml"),
    }


def public_profile(profile: dict) -> dict:
    """
    Copy of the profile with only the contact entries marked `show: true`.

    Everything published (pages, vCard, QR) is built from this, so a
    hidden email or phone can't leak into a committed file. Entries
    without a `show` key count as hidden.
    """
    out = dict(profile)
    for key in ("emails", "phones"):
        out[key] = [e for e in profile.get(key) or [] if e.get("show") is True]
    # Primary email first, so templates can use emails[0].
    out["emails"].sort(key=lambda e: not e.get("primary"))
    if not profile.get("show_location", True):
        out["location"] = ""
    return out


def _yaml(path: Path) -> dict:
    with open(path, encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


# --------------------------------------------------------------------
# ORCID
# --------------------------------------------------------------------

def build_publications(cfg: dict) -> tuple[list[publications_lib.PubGroup], list[orcid_mod.Publication]]:
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

    all_pubs = orcid_pubs + publications_lib.manual_to_publications(manual)
    return publications_lib.group_publications(all_pubs), all_pubs


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
    linkedin = vcard_mod.linkedin_url(profile)
    if linkedin:
        qr_mod.write_qr(linkedin, qr_dir / "linkedin.png")


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

def build_projects(cfg: dict) -> list[projects_lib.TagGroup]:
    projects = cfg["projects"].get("projects") or []
    return projects_lib.group_projects(projects, cfg["projects"].get("tags") or {})


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
        tag_labels=projects_lib.tag_labels(cfg["projects"].get("tags") or {}),
        linkedin_url=vcard_mod.linkedin_url(cfg["profile"]),
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
    render_mod.render_page(
        env, "afterhours.html.j2", root / "afterhours.html",
        **base_ctx,
    )

    print("Build complete.")


def main() -> None:
    root = repo_root()
    cfg = load_configs(root)
    render_all(root, cfg)


if __name__ == "__main__":
    main()
