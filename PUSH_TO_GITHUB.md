# Pushing this to GitHub for the first time

This file walks you through the one-time setup to publish the site at
`https://mayankdate.github.io`. After this, updates are just
`git add → commit → push`.

---

## 0. Prerequisites

- A GitHub account at the username **`mayankdate`** (if it's something else, replace every `mayankdate` below with your real username).
- Git installed. On the Mac: `brew install git` or install Xcode Command Line Tools. On Windows: install from <https://git-scm.com/download/win>.
- VSCode (or any editor you like). You never need the terminal if you don't want it — VSCode's Source Control panel does all of this.

---

## 1. Create the empty repo on GitHub

1. Go to <https://github.com/new>
2. **Repository name: `mayankdate.github.io`** — this exact name is what tells GitHub to serve it at that URL.
3. **Owner:** your `mayankdate` user.
4. **Visibility:** Public.
5. **Do NOT** initialize with a README, .gitignore, or license. We already have those locally.
6. Click **Create repository**.

GitHub shows you a page with push instructions. Ignore them — follow the ones below.

---

## 2. Put this folder under git locally

Open a terminal in this folder (`mayankdate.github.io/`) and run:

```bash
git init
git branch -M main
git add .
git commit -m "initial site"
```

Set your name and email on this commit if you haven't already configured git:

```bash
git config user.name  "Mayank Date"
git config user.email "mayank.date@gmail.com"
```

---

## 3. Link it to the GitHub repo and push

Pick one of the two authentication options.

### Option A — HTTPS (easiest if you're new to this)

```bash
git remote add origin https://github.com/mayankdate/mayankdate.github.io.git
git push -u origin main
```

GitHub will prompt for a username and a password. The password is NOT your login password — it's a **personal access token**. Generate one at:

<https://github.com/settings/tokens> → "Generate new token (classic)" → check **`repo`** scope → copy the token and paste it as the password.

(Once GitHub stores the credential, you won't be asked again on this machine.)

### Option B — SSH (preferred if you'll push a lot or use multiple accounts)

If you already have SSH keys set up, just:

```bash
git remote add origin git@github.com:mayankdate/mayankdate.github.io.git
git push -u origin main
```

If you don't have SSH keys, GitHub has a 10-minute setup here:
<https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent>

---

## 4. Turn on GitHub Pages

For a `mayankdate.github.io` repo, GitHub Pages usually turns itself on automatically. If it doesn't:

1. Go to <https://github.com/mayankdate/mayankdate.github.io/settings/pages>
2. Under **Build and deployment → Source**, select **Deploy from a branch**.
3. **Branch:** `main`, **Folder:** `/ (root)`. Save.
4. Wait ~1 minute. The page will say "Your site is live at https://mayankdate.github.io/".

---

## 5. First visit — what you should see

Open <https://mayankdate.github.io> in a browser. You should see your home page.

**Expected on the first live visit:**

- The portrait is a placeholder (navy circle with "MD" in gold). Replace `assets/photo.jpg` with your real photo and push again.
- The CVs are placeholder PDFs. Replace `assets/CV_Academic.pdf` and `assets/CV_OnePage.pdf` with your real files and push again.
- The JHU and MUHS logos are text placeholders. Download the real logos (see paths in `assets/logos/`) and replace them.
- The Research page's "Peer-reviewed articles" and "Preprints" sections will be populated — the local build on your machine will fetch ORCID successfully (unlike the sandbox where this was built, which couldn't reach ORCID).

---

## 6. Everyday workflow after this

Edit a YAML file or swap an asset → rebuild → push:

```bash
# ---- edit config/profile.yaml, say ----

# Then rebuild:
python scripts/build.py            # or run scripts/build.ipynb

# Then push:
git add .
git commit -m "update bio"
git push
```

The live site updates in about a minute.

---

## 7. Troubleshooting

**The CSS is broken / looks unstyled.**
Hard refresh with ⇧⌘R (Mac) or Ctrl+Shift+R (Windows) — browser cached the old version. If still broken, check the browser console (F12 → Console) for 404s on `/static/style.css`.

**ORCID publications aren't showing up.**
Make sure `orcid_id` in `config/profile.yaml` matches your real ORCID iD and your ORCID profile has those works marked **public**. Run `python scripts/build.py` and look at the printed line that starts with `ORCID: fetched N work(s)`.

**A preprint is still showing even though it was published.**
Open `config/publications.yaml` and add it to `orcid_overrides` with `hide: true`, keyed by the preprint's DOI. Rebuild.

**The business-card QR doesn't scan into my phone contacts.**
The QR encodes a vCard 3.0 string. Modern phones recognize it, but some older Android cameras don't. The `.vcf` download link on the contact page is the fallback — anyone can tap it to save your contact directly.
