"""Group and order projects by the tag_order config."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class TagGroup:
    key: str
    label: str
    description: str
    projects: list[dict]


def group_projects(projects: list[dict], tags_cfg: dict) -> list[TagGroup]:
    """
    Return projects grouped by their primary tag, in tag_order sequence.

    A project appears under its *highest-priority* tag (the one earliest
    in tag_order).  Tags that appear in projects but not in tag_order
    are appended to the end automatically.
    """
    tag_order: list[str] = list(tags_cfg.get("tag_order", []))
    tag_labels: dict = tags_cfg.get("tag_labels", {})
    tag_descriptions: dict = tags_cfg.get("tag_descriptions", {})

    # Discover unknown tags, append to tag_order
    for p in projects:
        for t in p.get("tags", []):
            if t not in tag_order:
                tag_order.append(t)

    index = {t: i for i, t in enumerate(tag_order)}

    def primary_tag(p: dict) -> str:
        tags = p.get("tags", [])
        if not tags:
            return "untagged"
        return min(tags, key=lambda t: index.get(t, 999))

    groups: dict[str, list[dict]] = {t: [] for t in tag_order}
    for p in projects:
        groups[primary_tag(p)].append(p)

    out: list[TagGroup] = []
    for key in tag_order:
        items = sorted(groups[key], key=lambda p: -p.get("year", 0))
        if not items:
            continue
        out.append(TagGroup(
            key=key,
            label=tag_labels.get(key, key.title()),
            description=tag_descriptions.get(key, ""),
            projects=items,
        ))
    return out


def all_tags_in_order(tags: list[str], tags_cfg: dict) -> list[str]:
    """Return the project's tags sorted by tag_order."""
    order = tags_cfg.get("tag_order", [])
    index = {t: i for i, t in enumerate(order)}
    return sorted(tags, key=lambda t: index.get(t, 999))
