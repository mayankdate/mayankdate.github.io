# mayankdate.github.io

Personal site, CV repository, and digital business card for **Mayank Date** —
public health researcher · global digital health analytics (Johns Hopkins /
Center for Global Digital Health Innovations).

Live at **<https://mayankdate.github.io>**.

Four content pages — **home, projects, research, contact** — are rendered
from YAML configs by a small Python + Jinja2 build script. Beside them lives
**Elsewhere**, a small explorable pixel-art cabin at `/Elsewhere/` embedded
into the site. GitHub Pages serves the built HTML directly from this repo —
no CI, no backend.

---

## At a glance

```
mayankdate.github.io/
├── config/                YAML content — bio, projects, publications, tags
├── templates/             Jinja2 templates for the four content pages
├── static/                CSS, theme toggle, carousel
├── assets/                photos, CVs, QRs, logos
├── scripts/build.py       builds the HTML; pulls publications live from ORCID
├── index.html             ← built output (committed; GitHub Pages serves it)
├── projects.html
├── research.html
├── contact.html
├── elsewhere.html         ← wrapper that iframes the Elsewhere subsite
└── Elsewhere/             the pixel cabin — fully self-contained, own README
```

---

## Changing something

- **Content** → a file in `config/` (bio, projects, publications, tag order).
- **Appearance** → the CSS variables at the top of `static/style.css`.
- **The pixel cabin** → `Elsewhere/config/*.yaml` or paint over
  `Elsewhere/assets/map/templates/*.png`.

Then rebuild and push:

```bash
python scripts/build.py                 # rebuilds the four content pages
git add . && git commit -m "update"
git push
```

GitHub Pages serves the update within a minute or two. Preview locally first
with `python -m http.server 8000` from the repo root. The Elsewhere subsite is
static and does **not** need rebuilding — the build script only touches the
four content pages.

---

## Deeper docs

| What you need | Where it lives |
|---|---|
| Full walkthrough of editing, building, and pushing | **[CLAUDE.md](CLAUDE.md)** |
| Every YAML field each config file supports | **[CONFIG_GUIDE.md](CONFIG_GUIDE.md)** |
| First-time setup (new machine, new GitHub account) | **[PUSH_TO_GITHUB.md](PUSH_TO_GITHUB.md)** |
| The Elsewhere subsite — engine, systems, art pipeline | **[Elsewhere/README.md](Elsewhere/README.md)** |

---

## Stack

- **Python 3** + **Jinja2** for templating; **PyYAML** for config.
- **ORCID** API for the live publications list, deduplicated against
  preprints with **rapidfuzz**.
- **segno** generates the vCard / site / LinkedIn QR codes at build time.
- **GitHub Pages** serves the committed HTML.
- The **Elsewhere** subsite is plain HTML + Canvas 2D + ES modules; the only
  CDN scripts it uses are **js-yaml** and **marked**.

Dependencies in `requirements.txt`.

---

## For a fresh Claude session

Start with **CLAUDE.md** — it has the full repo map and the edit-rebuild-push
loop. For the pixel cabin, read **Elsewhere/README.md** — it's a different
mental model (a canvas engine with data-driven interactions) and lives in its
own folder on purpose. Field-level config reference is in **CONFIG_GUIDE.md**.

---

## Credits

Built by Mayank Date (ideas, content, design direction) with Claude (code).
