"""Fetch publications from the public ORCID API and normalize them."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

import requests
from rapidfuzz import fuzz

ORCID_API = "https://pub.orcid.org/v3.0"
HEADERS = {"Accept": "application/json"}
TIMEOUT = 20

# ORCID work-type → our normalized type
TYPE_MAP = {
    "journal-article": "journal-article",
    "preprint": "preprint",
    "book-chapter": "book-chapter",
    "book": "book-chapter",
    "conference-paper": "conference-paper",
    "conference-poster": "poster",
    "conference-abstract": "conference-presentation",
    "working-paper": "preprint",
    "report": "other",
    "other": "other",
}

TITLE_SIMILARITY_THRESHOLD = 85  # for preprint ↔ article dedup


@dataclass
class Publication:
    """Normalized shape used by the templates."""
    title: str
    year: int | None
    month: int | None
    authors: list[str]
    venue: str
    type: str
    doi: str | None = None
    url: str | None = None
    award: str | None = None
    note: str | None = None
    links: dict[str, str] = field(default_factory=dict)
    source: str = "orcid"           # "orcid" or "manual"

    @property
    def sort_key(self) -> tuple:
        return (-(self.year or 0), -(self.month or 0), self.title.lower())


def fetch_orcid_works(orcid_id: str) -> list[Publication]:
    """Fetch and normalize all public works for the given ORCID iD."""
    summary = _get(f"{ORCID_API}/{orcid_id}/works")
    pubs: list[Publication] = []
    for group in summary.get("group", []):
        put_code = group["work-summary"][0]["put-code"]
        detail = _get(f"{ORCID_API}/{orcid_id}/work/{put_code}")
        pub = _parse_work(detail)
        if pub is not None:
            pubs.append(pub)
    return pubs


def _get(url: str) -> dict:
    r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()


def _parse_work(w: dict) -> Publication | None:
    title_block = (w.get("title") or {}).get("title") or {}
    title = (title_block.get("value") or "").strip()
    if not title:
        return None

    orcid_type = (w.get("type") or "").lower()
    norm_type = TYPE_MAP.get(orcid_type, "other")

    date = w.get("publication-date") or {}
    year = _int(date.get("year", {}).get("value"))
    month = _int(date.get("month", {}).get("value"))

    doi = None
    url = None
    for eid in (w.get("external-ids") or {}).get("external-id", []) or []:
        if (eid.get("external-id-type") or "").lower() == "doi":
            doi = (eid.get("external-id-value") or "").strip().lower()
            url = (eid.get("external-id-url") or {}).get("value")

    url = url or (w.get("url") or {}).get("value") or (
        f"https://doi.org/{doi}" if doi else None
    )

    authors = _parse_authors(w.get("contributors") or {})
    venue = (w.get("journal-title") or {}).get("value") or ""

    return Publication(
        title=title,
        year=year,
        month=month,
        authors=authors,
        venue=venue,
        type=norm_type,
        doi=doi,
        url=url,
    )


def _parse_authors(contributors: dict) -> list[str]:
    out = []
    for c in contributors.get("contributor", []) or []:
        name = ((c.get("credit-name") or {}).get("value") or "").strip()
        if name:
            out.append(name)
    return out


def _int(v: Any) -> int | None:
    if v is None:
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


# --------------------------------------------------------------------
# Overrides and dedup
# --------------------------------------------------------------------

def apply_overrides(pubs: list[Publication], overrides: dict) -> list[Publication]:
    """
    Overlay fields from `orcid_overrides` onto matching ORCID entries by DOI.

    Overrides may set: note, award, hide (bool), keep_as_preprint (bool).
    """
    overrides = {k.lower(): v for k, v in (overrides or {}).items()}
    out: list[Publication] = []
    for p in pubs:
        if p.doi and p.doi in overrides:
            o = overrides[p.doi] or {}
            if o.get("hide"):
                continue
            if "award" in o:
                p.award = o["award"]
            if "note" in o:
                p.note = o["note"]
            # keep_as_preprint flag is handled in dedup_preprints
            p._keep_as_preprint = o.get("keep_as_preprint", False)
        out.append(p)
    return out


def dedup_preprints(pubs: list[Publication]) -> list[Publication]:
    """
    Hide a preprint when a journal article with ≥85% title similarity exists.
    Respect `_keep_as_preprint` set by overrides.
    """
    articles = [p for p in pubs if p.type == "journal-article"]
    article_titles = [_norm_title(p.title) for p in articles]

    out: list[Publication] = []
    for p in pubs:
        if p.type != "preprint":
            out.append(p)
            continue
        if getattr(p, "_keep_as_preprint", False):
            out.append(p)
            continue
        pt = _norm_title(p.title)
        if any(fuzz.token_set_ratio(pt, at) >= TITLE_SIMILARITY_THRESHOLD
               for at in article_titles):
            # Hidden — a journal version exists
            continue
        out.append(p)
    return out


def _norm_title(t: str) -> str:
    t = t.lower()
    t = re.sub(r"[^a-z0-9 ]+", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def pub_year_counts(pubs: list[Publication]) -> dict[int, int]:
    """Years → count map used by the sparkline on the home page."""
    counts: dict[int, int] = {}
    for p in pubs:
        if p.year is None:
            continue
        counts[p.year] = counts.get(p.year, 0) + 1
    return counts
