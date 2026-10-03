"""Fetch recent posts from a Substack RSS feed."""

from __future__ import annotations

import datetime as dt
import re
from dataclasses import dataclass

import requests


@dataclass
class Post:
    title: str
    url: str
    date: dt.date | None
    excerpt: str


def fetch_posts(substack_url: str, limit: int = 3) -> list[Post]:
    """
    Return up to `limit` recent posts.  Returns an empty list if the feed
    can't be reached or substack_url is falsy — the home page section
    then renders nothing and the Writing tab stays hidden.
    """
    if not substack_url:
        return []
    feed_url = substack_url.rstrip("/") + "/feed"
    try:
        r = requests.get(feed_url, timeout=10)
        r.raise_for_status()
    except requests.RequestException:
        return []
    return _parse_rss(r.text, limit=limit)


def _parse_rss(xml: str, limit: int) -> list[Post]:
    import xml.etree.ElementTree as ET
    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return []
    items = root.findall(".//item")[:limit]
    out: list[Post] = []
    for item in items:
        title = (item.findtext("title") or "").strip()
        url = (item.findtext("link") or "").strip()
        pub_date = _parse_rss_date(item.findtext("pubDate"))
        desc = (item.findtext("description") or "").strip()
        excerpt = _strip_html(desc)[:160]
        out.append(Post(title=title, url=url, date=pub_date, excerpt=excerpt))
    return out


def _parse_rss_date(s: str | None) -> dt.date | None:
    if not s:
        return None
    try:
        return dt.datetime.strptime(s[:16], "%a, %d %b %Y").date()
    except ValueError:
        return None


def _strip_html(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s)
