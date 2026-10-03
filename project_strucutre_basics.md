I want to use github to host my profile. It will be a personal profile page, talk about my vibecoded projects and work projects, and a place to download my CVs for anyone who wants to. 
It will also serve as my business card. When I'm at a conference. It would be cool if I can whip out my phone, go to the contact page on mobile which will have a QR code someone can scan to directly go to the profile page. As well as QR codes to add the contact to their phone.

PROJECT ROOT /
├── .Rproj.user/
├── .venv/ ## VSCode will build this from the requirements only for projects using python
├── data/
│   ├── processed/
│   └── raw/
├── documents/ ## Reference documents, stored files
│   ├── photo ## Photo of me for the page
│   ├── CV_Mayank_Date_Academic.pdf ## Full CV - Will switch out with newer versions as updates happen
│   └── CV_Mayank_Date_1Page.pdf ## A shorter CV - Will switch out with newer versions as updates happen
├── output/
│   ├── profile.html ## Webpage - Presumeably what will be hosted on github?
│   ├── QR_Page.png ## QRCode for the profile
│   ├── QR_Contact.png ## QRCode to put my contact into someone's phone
├── scripts/  ## All code goes here - Any templates, .R, .py .ipynb
│   ├── build_profile.ipynb ## The notebook to run when I want to update the pages and files
│   └── InfoConfig ## The main file I will update. Probably a markdown or whatever is easier to maintain. This is where I can change email, phone number, profile blurb etc. Can even make the config into an excel or csv that lets me edit perproject blurbs and what not? Need to brainstorm the best way to do it
├── .gitignore ## Standard ignore file already covers many basic - Only provide project specific ignores
├── Claude.md ## Also acts as README. Always update this
├── notion_SPECIFIC_token ## Optional Notion token to a specific data based only for projects that need one
├── ProjectName_R.Rproj ## Will be renamed to project root
├── ProjectName_VSCode.code-workspace ## Will be remained to project root
└── requirements.txt ## If project is using python - Write all requirements for venv




Basic gitignore contains:
# ---- Project Specific Ignores ----

# ---- Generated outputs ----
# All artifacts under output/ are regenerable from the notebooks + APIs.
# Flip the leading / off if you want to version them (e.g. for archival).
output/
data/

# Excel atomic-save temp files
*.tmp.xlsx
*.tmp.xls

# ---- Credentials — never commit ----
*.key
*.pem
*_key.txt
*_secret*
.env
.env.*
!.env.example

# ---- Python ----
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
.venv/
venv/
env/
.pytest_cache/
.mypy_cache/
.ruff_cache/
.ipynb_checkpoints/
*.egg-info/

# ---- Jupyter ----
# Keep notebooks, but strip large outputs before committing (see nbstripout).
.jupyter/
profile_default/

# ---- R ----
.Rhistory
.RData
.Ruserdata
.Rproj.user/
*.Rproj

# ---- OS ----
.DS_Store
Thumbs.db
desktop.ini
$RECYCLE.BIN/

# ---- Editors ----
.vscode/
.idea/
*.swp
*.swo
*~

# ---- Logs / caches ----
*.log
logs/
.cache/



How I envision using this:

Desktop mode: Typical webpage I can send someone a link to that acts as my porfolio and website - They can download my CV from there too as pdfs.

Phone mode: This is more interesting.
As a viewer, it would be similar to my profiel page, acting as the profile.
But if you go into the contacts tab on that page it becomes a set of business cards. This is what I would pull out at conferences
The default card has a QR Code that directly adds my contact to their phone
Swipe to the next card, that QR code links to the website itself.


I would also love it if this profile could integrate with ORCID and ResearchGate to show my publications, number of citations, etc...

Basically it is a reflection of me and my skills in an honest way.

I will provide my full academic CV for a comprehensive professional background. My personal projects that I have built with you so far are not part of it obviously but I would like to show the git repos (at least the public one). Not as a showcase of my coding skills- We'll be honest in saying it was all vibecoded by Claude. But the ideas were still mine so I want to show them as being my problem solving and creativity. Skills are might be more valuable in a post AI world anyway.