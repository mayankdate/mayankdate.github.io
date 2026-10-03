# mayankdate.github.io

Personal homepage, CV repository, and conference business card for **Mayank Date**.
Hosted at **https://mayankdate.github.io**.

Four pages (home, projects, research, contact), plus a hidden Writing tab
that lights up when `profile.substack.url` is set in `config/profile.yaml`.
On a phone the contact page becomes a swipeable set of business cards with
QR codes for the vCard, the site itself, and LinkedIn.

---

## How this repo is organized

```
mayankdate.github.io/
├── config/           ← edit here to change what appears on the site
│   ├── profile.yaml      bio, phones, emails, education, experience, socials, ORCID
│   ├── tags.yaml         project tag order & labels
│   ├── projects.yaml     project cards
│   └── publications.yaml ORCID overrides + manual (non-ORCID) entries
│
├── assets/           ← files served alongside the site
│   ├── photo.jpg
│   ├── CV_Academic.pdf
│   ├── CV_OnePage.pdf
│   ├── logos/            JHU shield, MUHS mark (SVG preferred)
│   ├── presentations/    posters and slides you link from publications
│   └── qr/               generated at build time; don't edit manually
│
├── templates/        ← Jinja2 page templates
├── static/           ← style.css, theme.js, carousel.js
├── scripts/
│   ├── build.ipynb       the notebook you run to update the site
│   ├── build.py          same thing from the command line
│   └── lib/              Python modules the notebook imports
│
├── index.html        ← built pages, committed to the repo
├── projects.html         GitHub Pages serves these from the repo root
├── research.html
└── contact.html
```

**You edit the YAML files and the assets. The notebook rebuilds the HTML.**

---

## Updating the site

### 1. Edit the content

Change what you want to update in `config/*.yaml`. Common edits:

- Replace `assets/CV_Academic.pdf` and `assets/CV_OnePage.pdf` with your real CVs (keep the filenames so the download links don't break).
- Add a new project to `config/projects.yaml`.
- Add a poster or non-ORCID presentation to the `manual:` list in `config/publications.yaml`.
- Add an award on an ORCID publication via `orcid_overrides` (keyed by DOI).
- Set `substack.url` in `config/profile.yaml` to turn on the Writing tab.

### 2. Rebuild

Either run the notebook:

```bash
jupyter notebook scripts/build.ipynb
```

Or run the CLI:

```bash
python scripts/build.py
```

This:
- Fetches your publications live from ORCID.
- Deduplicates preprints whose published version is also on ORCID.
- Regenerates the vCard QR, site QR, LinkedIn QR, and `mayank-date.vcf`.
- Renders `index.html`, `projects.html`, `research.html`, `contact.html`.

### 3. Preview locally (optional)

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000>.

### 4. Push

```bash
git add .
git commit -m "update"
git push
```

GitHub Pages serves the update at <https://mayankdate.github.io> within a minute or two.

---

## Design system (reference)

- **Fonts.** Fraunces (serif, headings and author names) + Inter (sans, body).
- **Palette.** Hopkins navy for text, warm cream background, bronze gold accent, deep forest green as a quiet secondary.
- **Signature moves.** Thin gold rule under every section heading. Author names in Fraunces bold + gold small caps. A subtle publications-per-year sparkline on the home page hero.
- **Dark mode.** Auto by OS preference; click the sun/moon icon to override.

Everything is driven by CSS variables at the top of `static/style.css` — change the palette there to re-skin the whole site.

---

## Credits

Built with Claude (code) + Mayank Date (ideas, content, design direction).
