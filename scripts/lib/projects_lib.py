"""Group and order projects by the `tags:` block at the top of projects.yaml."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class TagGroup:
    key: str
    label: str
    description: str
    projects: list[dict]


def tag_labels(tags_cfg: dict) -> dict[str, str]:
    """Map tag key → display label (title-cased key when no label is set)."""
    return {k: (v or {}).get("label", k.title()) for k, v in tags_cfg.items()}


def group_projects(projects: list[dict], tags_cfg: dict) -> list[TagGroup]:
    """
    Return projects grouped by their primary tag, in `tags:` order.

    A project appears under its highest-priority tag (the one listed
    first in `tags:`). Tags used by projects but not listed there are
    appended to the end automatically. Each project also gets
    `tags_ordered`, its own tags sorted the same way, for the chips.
    """
    order: list[str] = list(tags_cfg)
    for p in projects:
        order += [t for t in p.get("tags", []) if t not in order]
    index = {t: i for i, t in enumerate(order)}

    groups: dict[str, list[dict]] = {t: [] for t in order}
    for p in projects:
        tags = sorted(p.get("tags", []), key=index.__getitem__)
        if not tags:
            continue
        p["tags_ordered"] = tags
        groups[tags[0]].append(p)

    out: list[TagGroup] = []
    for key in order:
        if not groups[key]:
            continue
        meta = tags_cfg.get(key) or {}
        out.append(TagGroup(
            key=key,
            label=meta.get("label", key.title()),
            description=meta.get("description", ""),
            projects=sorted(groups[key], key=lambda p: -p.get("year", 0)),
        ))
    return out
