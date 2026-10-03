"""Merge ORCID + manual publications and group them by type."""

from __future__ import annotations

from dataclasses import dataclass

from .orcid import Publication


GROUPS = [
    ("journal-article", "Peer-reviewed articles"),
    ("preprint", "Preprints & submitted"),
    ("conference-presentation", "Conference presentations & posters"),
    ("conference-paper", "Conference presentations & posters"),
    ("poster", "Conference presentations & posters"),
    ("book-chapter", "Book chapters"),
    ("copyright-registration", "Other"),
    ("other", "Other"),
]

# Groups rendered on the page in this order:
GROUP_ORDER = [
    "Peer-reviewed articles",
    "Preprints & submitted",
    "Conference presentations & posters",
    "Book chapters",
    "Other",
]


@dataclass
class PubGroup:
    heading: str
    pubs: list[Publication]


def manual_to_publications(manual_entries: list[dict]) -> list[Publication]:
    """Normalize manual YAML entries to the Publication dataclass."""
    out: list[Publication] = []
    for m in manual_entries or []:
        out.append(Publication(
            title=m.get("title", ""),
            year=m.get("year"),
            month=m.get("month"),
            authors=m.get("authors", []),
            venue=m.get("venue", ""),
            type=m.get("type", "other"),
            doi=None,
            url=m.get("url"),
            award=m.get("award"),
            note=m.get("note"),
            links=m.get("links") or {},
            source="manual",
        ))
    return out


def group_publications(pubs: list[Publication]) -> list[PubGroup]:
    """Group by display heading in GROUP_ORDER, sort newest-first inside each."""
    heading_of = {src: head for src, head in GROUPS}
    buckets: dict[str, list[Publication]] = {h: [] for h in GROUP_ORDER}
    for p in pubs:
        heading = heading_of.get(p.type, "Other")
        buckets[heading].append(p)
    out: list[PubGroup] = []
    for heading in GROUP_ORDER:
        if not buckets[heading]:
            continue
        buckets[heading].sort(key=lambda p: p.sort_key)
        out.append(PubGroup(heading=heading, pubs=buckets[heading]))
    return out
