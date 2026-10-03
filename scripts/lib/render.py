"""Render Jinja2 templates to HTML."""

from __future__ import annotations

import datetime as dt
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape


def make_env(templates_dir: Path) -> Environment:
    env = Environment(
        loader=FileSystemLoader(str(templates_dir)),
        autoescape=select_autoescape(["html", "xml"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["citation_authors"] = _citation_authors
    env.filters["year_month"] = _year_month
    return env


def render_page(env: Environment, template: str, out_path: Path, **ctx: Any) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tpl = env.get_template(template)
    html = tpl.render(
        build_date=dt.date.today().isoformat(),
        **ctx,
    )
    out_path.write_text(html, encoding="utf-8")
    return out_path


def _citation_authors(authors: list[str], highlight_last_name: str = "Date") -> str:
    """
    Return 'Smith J, DATE M, Jones K' with the matching author in
    SMALL CAPS (via a <span class="author-self">).  The template picks
    up the span and the CSS does the small-caps styling.
    """
    if not authors:
        return ""
    rendered = []
    for a in authors:
        if highlight_last_name.lower() in a.lower():
            rendered.append(f'<span class="author-self">{_escape(a)}</span>')
        else:
            rendered.append(_escape(a))
    return ", ".join(rendered)


def _year_month(pub) -> str:
    """Render a '2025, Sept' or '2025' depending on what's known."""
    MONTHS = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sept", "Oct", "Nov", "Dec",
    ]
    y = getattr(pub, "year", None) if not isinstance(pub, dict) else pub.get("year")
    m = getattr(pub, "month", None) if not isinstance(pub, dict) else pub.get("month")
    if y and m and 1 <= m <= 12:
        return f"{y}, {MONTHS[m - 1]}"
    if y:
        return str(y)
    return ""


def _escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
