# Config reference

Every piece of content on the site comes from one of the four YAML files
in `config/`. This document lists every field each file supports, what it
does, whether it's required, and shows a worked example.

**Convention used in this guide:**
- 🔴 required — the build errors or renders blank without it
- 🟢 optional — leave it out if you don't need it
- *italic* = a key you type literally, `value` = the thing you put in

---

## Contents

- [`config/profile.yaml`](#configprofileyaml) — identity, contact, experience, education, skills
- [`config/tags.yaml`](#configtagsyaml) — project tag ordering and labels
- [`config/projects.yaml`](#configprojectsyaml) — the project cards
- [`config/publications.yaml`](#configpublicationsyaml) — ORCID overrides and non-ORCID entries
- [Common tasks](#common-tasks) — recipes for the edits you'll actually make

---

## `config/profile.yaml`

The main identity file. Drives the home page, contact page, and header/footer.

### Top-level identity

| Field | Required? | Type | What it does |
|---|---|---|---|
| `name` | 🔴 | string | Shown in the hero, nav brand, footer, and vCard. |
| `title` | 🔴 | string | One-line descriptor under the name in the hero and in the browser tab. |
| `headline` | 🟢 | string | Currently unused by templates — kept for future flexibility. Safe to leave matching `title`. |
| `blurb` | 🔴 | string (multi-line) | The "About" paragraph on the home page. Use `>` for folded multi-line text (preserves readability, folds newlines to spaces). |
| `site_url` | 🔴 | string | Your public URL, e.g. `"https://mayankdate.github.io"`. Encoded into the "visit site" QR on the contact page and used in meta tags. |
| `location` | 🟢 | string | Shown on the contact page, e.g. `"Baltimore, MD / Mumbai, IN"`. |
| `photo` | 🔴 | string path | Relative path to your portrait, e.g. `"assets/photo.jpg"`. Used on home hero and contact page. |

### `emails:` (list)

Each entry can take:

| Field | Required? | Type | What it does |
|---|---|---|---|
| `address` | 🔴 | string | The email address. |
| `label` | 🟢 | string | Shown in the vCard and on the contact page, e.g. `"Personal"`, `"Work"`. |
| `primary` | 🟢 | bool | If `true`, this is the one in the footer and the hero mailto link. First email with `primary: true` wins; otherwise the first entry is used. |

```yaml
emails:
  - address: "mayank.date@gmail.com"
    label: "Personal"
    primary: true
  - address: "mdate1@jhu.edu"
    label: "Work"
```

### `phones:` (list)

Each entry can take:

| Field | Required? | Type | What it does |
|---|---|---|---|
| `number` | 🔴 | string | Full international format recommended (e.g. `"+1-480-280-5530"`). This exact string goes into the vCard. |
| `label` | 🟢 | string | Appears next to the number and in the vCard, e.g. `"US"`, `"India"`. |

```yaml
phones:
  - number: "+1-480-280-5530"
    label: "US"
  - number: "+91-9619439292"
    label: "India"
```

### `socials:` (list)

Buttons on the contact page and small links in the footer. Order here is the order on the page.

| Field | Required? | Type | What it does |
|---|---|---|---|
| `name` | 🔴 | string | Shown on the button and in the footer, e.g. `"LinkedIn"`. Also used to pick which ones go on the Research page (only `"ORCID"`, `"ResearchGate"`, `"Google Scholar"` are shown there). |
| `url` | 🔴 | string | Where the button links to. |
| `icon` | 🟢 | string | Used by the vCard (only `"linkedin"` is currently recognized) and reserved for future icon rendering. Safe to put a reasonable value like `"github"`, `"orcid"`. |

```yaml
socials:
  - name: "LinkedIn"
    url: "https://linkedin.com/in/mayankdate"
    icon: "linkedin"
  - name: "GitHub"
    url: "https://github.com/mayankdate"
    icon: "github"
```

### `orcid_id:` (string)

Your ORCID iD without the URL prefix, e.g. `"0009-0001-0863-5428"`. Used to fetch publications at build time. Required if you want the Research page to pull from ORCID.

### `experience:` (list)

The timeline on the home page. Order newest → oldest.

| Field | Required? | Type | What it does |
|---|---|---|---|
| `role` | 🔴 | string | Job title. Bold on the timeline. |
| `org` | 🔴 | string | Organization name. Shown under the role. |
| `org_sub` | 🟢 | string | A smaller line under `org` — use for a sub-division, a parent org, or multiple affiliated clinics. |
| `start` | 🔴 | int | Start year (e.g. `2023`). |
| `end` | 🟢 | int | End year. Omit if `ongoing: true`. |
| `ongoing` | 🟢 | bool | If `true`, shown as "–present" and `end` is ignored. |

```yaml
experience:
  - role: "Data Analyst, Biostatistics"
    org: "Center for Global Digital Health Innovation"
    org_sub: "Johns Hopkins Bloomberg School of Public Health"
    start: 2023
    ongoing: true
  - role: "Dentist"
    org: "Private practice & clinical rotations"
    org_sub: "Shree Dental Clinic · Advanced Dental Care · MGM Dental College"
    start: 2018
    end: 2021
```

### `education:` (list)

Shown on the home page as cards with institution logos.

| Field | Required? | Type | What it does |
|---|---|---|---|
| `degree` | 🔴 | string | The degree earned, e.g. `"Master of Public Health (MPH)"`. |
| `institution` | 🔴 | string | School name, shown under the degree. |
| `year` | 🔴 | int | Year completed. |
| `logo` | 🟢 | string path | Path to institution logo in `assets/logos/`. If omitted, the card still renders without a logo. |
| `logo_invert_on_dark` | 🟢 | bool | If `true`, the logo auto-inverts in dark mode. Use for navy-on-transparent logos (like the JHU shield). Use `false` for logos that are already light-on-dark or that have brand colors you don't want shifted. |

```yaml
education:
  - degree: "Master of Public Health (MPH)"
    institution: "Johns Hopkins Bloomberg School of Public Health"
    year: 2023
    logo: "assets/logos/jhu-shield.svg"
    logo_invert_on_dark: true
```

### `certifications:` (list)

Shown on the home page below Education. **No logos** — HBS specifically forbids participants from using their logo, and the format works for all certifications uniformly.

| Field | Required? | Type | What it does |
|---|---|---|---|
| `name` | 🔴 | string | The certification name, e.g. `"Credential of Readiness (CORe)"`. Append honors inline if you want, e.g. `"CORe · Pass with High Honors"`. |
| `institution` | 🔴 | string | Issuing body. |
| `year` | 🔴 | int | Year earned (or year completed). |

### `skills:` (map of groups)

Grouped lists of skill chips. The group name becomes the sub-heading; each item becomes a chip.

```yaml
skills:
  Scientific:
    - "Hypothesis testing"
    - "Biostatistics"
  Technical:
    - "R"
    - "Python"
```

Add a new group just by adding a new top-level key — it'll render automatically.

### `cvs:` (list)

Downloadable CV links. The first CV is the one wired to the big "Download CV" button in the hero.

| Field | Required? | Type | What it does |
|---|---|---|---|
| `name` | 🔴 | string | Shown as the button label. |
| `file` | 🔴 | string path | Path to the PDF, usually under `assets/`. |
| `description` | 🟢 | string | Optional tooltip-style description. Currently not surfaced in the UI but kept for future use. |

Keep the file paths stable (e.g. `assets/CV_Academic.pdf`) so email signatures and QR codes don't break when you update the file. Swap the file in place.

### `substack:` (block)

Writing section hook.

| Field | Required? | Type | What it does |
|---|---|---|---|
| `url` | 🟢 | string or null | Your Substack base URL. When `null`, the Writing tab stays hidden and no fetching happens. Set to e.g. `"https://mayankdate.substack.com"` to activate. |
| `max_posts_on_home` | 🟢 | int | How many recent posts to show on the home page. Default 3. |

---

## `config/tags.yaml`

Governs how projects are grouped and ordered on the Projects page.

### `tag_order:` (list of tag keys)

The order in which tag groups appear on the Projects page, and the priority used to decide which group a multi-tagged project belongs to.

```yaml
tag_order:
  - work
  - research
  - idea
  - vibecoded
```

A project with `tags: [research, work]` gets grouped under **Work** because Work ranks higher in `tag_order`. New tag keys that appear in `projects.yaml` but not here get appended to the end automatically — the build never crashes.

### `tag_labels:` (map of key → label)

How the tag chip and the group header text read on the page.

```yaml
tag_labels:
  work: "Work"
  vibecoded: "Vibecoded"
```

### `tag_descriptions:` (map of key → long string)

One-line descriptions shown under each group header on the Projects page. Optional per-tag; omit a key and no description renders for that group.

```yaml
tag_descriptions:
  vibecoded: >
    Projects built with Claude as the engineering partner.
    The code is Claude's, the problem framing and ideas are mine.
```

---

## `config/projects.yaml`

The project cards. One top-level key: `projects:` which is a list.

Each project can take:

| Field | Required? | Type | What it does |
|---|---|---|---|
| `title` | 🔴 | string | Card title (serif, bold). |
| `year` | 🔴 | int | Year shown next to the title. Projects within a tag group sort by year descending. |
| `tags` | 🔴 | list of strings | Tag keys from `tags.yaml`. At least one. Determines grouping (highest-priority tag wins) and which chips show. |
| `blurb` | 🔴 | string | Card body text. Use `>` for multi-line folded. |
| `links` | 🟢 | map of label → url | Named links shown at the bottom of the card. Keys become the link text (`DOI`, `Repo`, `Live`, `Slides`, anything). Values can be external URLs or local paths like `assets/presentations/foo.pdf`. |

```yaml
projects:
  - title: "mPFPH — Mobile-phone Full Pregnancy History"
    year: 2025
    tags: [work, research]
    blurb: >
      Feasibility and validity analysis of a phone-based proxy pregnancy
      history for estimating perinatal mortality in rural Bangladesh.
    links:
      DOI: "https://doi.org/10.1111/tmi.14094"
      Dataset: "https://drive.google.com/..."

  - title: "This website"
    year: 2026
    tags: [vibecoded]
    blurb: "Personal homepage and business card."
    links:
      Repo: "https://github.com/mayankdate/mayankdate.github.io"
      Live: "https://mayankdate.github.io"
```

To omit links entirely, use `links: {}` (empty map) or leave the key out.

---

## `config/publications.yaml`

Two top-level keys:

### `orcid_overrides:` (map of DOI → fields)

Overlay fields onto specific ORCID-fetched publications. Keyed by the publication's DOI in lowercase.

Each override entry can take:

| Field | Type | What it does |
|---|---|---|
| `award` | string | Adds an award chip to that entry on the Research page (e.g. `"Best Paper"`). |
| `note` | string | A small italic note shown below the citation (e.g. `"First author"`, `"Thesis-related"`). |
| `hide` | bool | If `true`, hides this ORCID entry entirely. Useful for preprints whose published version is also on ORCID and the auto-dedup didn't catch it. |
| `keep_as_preprint` | bool | If `true`, force-show a preprint even when a journal article with a similar title exists. Overrides the auto-dedup. |

```yaml
orcid_overrides:
  "10.2196/59968":
    award: "Editor's Pick"
    note: "Co-author · rapid review"
  "10.2196/preprints.109155":
    hide: true
```

### `manual:` (list of entries)

Everything that isn't on ORCID: posters, conference presentations, copyright registrations, invited talks, etc.

Each entry can take:

| Field | Required? | Type | What it does |
|---|---|---|---|
| `type` | 🔴 | string (controlled) | Decides which section the entry appears under on the Research page. See the type table below. |
| `title` | 🔴 | string | Shown bold in the citation. |
| `authors` | 🟢 | list of strings | Shown comma-separated. Any author whose name contains "Date" (case-insensitive) is auto-highlighted in gold small caps. If omitted, only "DATE, M." style attribution is implied. |
| `year` | 🔴 | int | Shown in parentheses. Used to sort within section. |
| `month` | 🟢 | int (1–12) | If present, shown as "2025, Sept" style. If omitted, just the year shows. |
| `venue` | 🟢 | string | Journal, conference, or event name. Rendered in italic. |
| `award` | 🟢 | string | Chip next to the type chip (e.g. `"First Prize"`). |
| `note` | 🟢 | string | Italic note below the citation. |
| `url` | 🟢 | string | Primary external link. If present, a "Link" button is added. |
| `links` | 🟢 | map of label → url | Extra named links (`Slides`, `Preprint`, `Dataset`...). Local paths work: `"assets/presentations/astrodontics.pdf"`. |

#### Valid `type:` values

| Type value | Section it appears under |
|---|---|
| `journal-article` | Peer-reviewed articles |
| `preprint` | Preprints & submitted |
| `conference-paper` | Conference presentations & posters |
| `conference-presentation` | Conference presentations & posters |
| `poster` | Conference presentations & posters |
| `book-chapter` | Book chapters |
| `copyright-registration` | Other |
| `other` | Other |

```yaml
manual:
  - type: poster
    title: "Astrodontics — A study of orodental effects of microgravity"
    authors: ["Date, M."]
    year: 2019
    month: 1
    venue: "72nd Indian Dental Conference, Indore, India"
    award: "Best Paper Presentation"
    links:
      Slides: "assets/presentations/astrodontics.pdf"

  - type: copyright-registration
    title: "Design Thinking in Dental Sciences — A Primer"
    authors: ["Date, M.", "Rajgarhia, R.", "Thakkar, N.", "Jadhav, S.", "Kumar, V."]
    year: 2022
    venue: "Suitradhaar Science Solutions · Copyright L-124516/2023"
```

---

## Common tasks

Quick recipes for the edits you'll actually make.

### Add a new project

Open `config/projects.yaml` and append a new entry under `projects:`:

```yaml
  - title: "A new thing I built"
    year: 2026
    tags: [vibecoded]
    blurb: >
      What it does, in a sentence or two.
    links:
      Repo: "https://github.com/mayankdate/newthing"
      Live: "https://newthing.example.com"
```

Rebuild, commit, push.

### Add a new poster or presentation (not on ORCID)

Open `config/publications.yaml` and append under `manual:`:

```yaml
  - type: poster
    title: "The thing I presented"
    authors: ["Date, M.", "Collaborator, X."]
    year: 2026
    month: 4
    venue: "Some Conference, City, Country"
    award: "First Prize"       # omit if no award
    links:
      Slides: "assets/presentations/the-thing.pdf"
```

If the slides are a `.pptx`, the build auto-converts them to PDF for in-browser viewing (requires LibreOffice installed; otherwise just save the file as PDF yourself and reference the `.pdf` path).

### Hide a preprint whose paper got published

If both appear on the Research page, add the preprint's DOI to `orcid_overrides`:

```yaml
orcid_overrides:
  "10.2196/preprints.109155":
    hide: true
```

### Attach an award to an ORCID-fetched paper

```yaml
orcid_overrides:
  "10.2196/59968":
    award: "Editor's Pick"
    note: "Rapid review"
```

### Add a new experience to the home-page timeline

Open `config/profile.yaml`, add a new entry at the top of `experience:` (newest first):

```yaml
  - role: "Postdoctoral Researcher"
    org: "Some Institute"
    start: 2027
    ongoing: true
```

### Change the project tag ordering

Open `config/tags.yaml` and reorder `tag_order`. Everything else rearranges automatically.

### Add a new tag entirely

Just use it in a project — the build auto-appends unknown tags to the end of `tag_order`. For a nicer label and description, add entries to `tag_labels` and `tag_descriptions`:

```yaml
# tags.yaml
tag_order:
  - work
  - research
  - teaching          # new
  - idea
  - vibecoded

tag_labels:
  teaching: "Teaching"

tag_descriptions:
  teaching: "Courses, workshops, and training materials I've designed."
```

### Turn on the Writing tab (when you start a Substack)

In `config/profile.yaml`:

```yaml
substack:
  url: "https://mayankdate.substack.com"
  max_posts_on_home: 3
```

Rebuild. The Writing nav tab appears automatically and the home page starts showing your latest posts.

### Replace a CV

Just overwrite the file at the same path (`assets/CV_Academic.pdf` or `assets/CV_OnePage.pdf`). No YAML change needed. Rebuild, commit, push.

### Update your portrait

Drop the new image at `assets/photo.jpg` (keep the filename). Any aspect ratio — the CSS crops it to a circle on the home page and contact card.

### Add a social profile

In `config/profile.yaml`, add to `socials:`:

```yaml
  - name: "Mastodon"
    url: "https://scholar.social/@mayankdate"
    icon: "mastodon"
```

It appears as a button on the contact page and a link in the footer. (It won't appear on the Research page unless the name is `"ORCID"`, `"ResearchGate"`, or `"Google Scholar"`.)

---

## After any config change

```powershell
python scripts/build.py
git add .
git commit -m "update: <what changed>"
git push
```

~60 seconds later the live site is updated.
