"""Render Jinja2 templates to HTML."""

from __future__ import annotations

import datetime as dt
import re
from pathlib import Path
from typing import Any

import markdown as md_lib
from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import Markup


def make_env(templates_dir: Path) -> Environment:
    env = Environment(
        loader=FileSystemLoader(str(templates_dir)),
        autoescape=select_autoescape(["html", "xml"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["citation_authors"] = _citation_authors
    env.filters["year_month"] = _year_month
    env.filters["md"] = _md
    env.filters["md_inline"] = _md_inline
    env.filters["new_tab"] = _new_tab
    return env


# --------------------------------------------------------------------
# Markdown / rich-text filters
# --------------------------------------------------------------------
# You can use Markdown inside blurbs and descriptions:
#   **bold**, *italic*, `code`, [text](url)
# Inline HTML (`<b>`, `<i>`, `<a>`) also passes through for people who
# prefer that syntax.
# External links automatically get target="_blank" and rel="noopener"
# so they open in a new tab.
# --------------------------------------------------------------------

_LINK_RE = re.compile(r'<a\s+href="([^"]+)"(?![^>]*\btarget=)')


def _add_new_tab(html: str) -> str:
    """
    Add target="_blank" to any <a> tag that doesn't already have target=,
    unless the href is a same-page anchor (starts with '#').

    External URLs, local PDF/doc links, and anything else: open in a new tab.
    """
    def _repl(m: re.Match) -> str:
        href = m.group(1)
        if href.startswith("#"):
            return m.group(0)
        return f'<a href="{href}" target="_blank" rel="noopener noreferrer"'
    return _LINK_RE.sub(_repl, html)


def _md(text: Any) -> Markup:
    """Render Markdown. Keeps a wrapping <p> if present (block-level use)."""
    if not text:
        return Markup("")
    html = md_lib.markdown(str(text), extensions=["extra"])
    html = _add_new_tab(html)
    return Markup(html)


def _md_inline(text: Any) -> Markup:
    """Render Markdown and strip the outer <p>...</p> if single paragraph.

    Use this inside existing <p> tags so you don't get nested <p>.
    """
    if not text:
        return Markup("")
    html = md_lib.markdown(str(text), extensions=["extra"]).strip()
    if (html.startswith("<p>") and html.endswith("</p>")
            and html.count("<p>") == 1):
        html = html[3:-4]
    html = _add_new_tab(html)
    return Markup(html)


def _new_tab(url: Any) -> str:
    """
    Return `target="_blank" rel="noopener noreferrer"` for any URL that
    isn't a same-page anchor. Use in attribute position:

        <a href="{{ url }}" {{ url | new_tab }}>...</a>

    This opens external URLs AND local repo files (PDFs, images, etc.) in
    a new tab, so clicking a link never replaces the current page.
    """
    s = str(url) if url else ""
    if not s or s.startswith("#"):
        return Markup("")
    return Markup('target="_blank" rel="noopener noreferrer"')


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
