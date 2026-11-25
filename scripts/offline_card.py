#!/usr/bin/env python3
"""
Make the offline conference business card: a vCard QR with EVERY email
and phone from config/private.yaml, including ones marked `show: false`.

Run from the repo root:
    uv run python scripts/offline_card.py

Output goes to private/ (gitignored): contact-full.png and contact-full.vcf.
Print the PNG, or keep it on your phone, and show it in person.
Never copy these files into assets/ or commit them.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib import build, qr, vcard  # noqa: E402

if __name__ == "__main__":
    root = build.repo_root()
    if not (root / "config" / "private.yaml").exists():
        sys.exit("config/private.yaml not found. Copy config/private.example.yaml and fill it in.")
    profile = build.load_configs(root)["full_profile"]
    vcf = vcard.build_vcard(profile)
    out = root / "private"
    qr.write_qr(vcf, out / "contact-full.png")
    qr.write_vcf(vcf, out / "contact-full.vcf")
    print(f"Wrote {out / 'contact-full.png'} and {out / 'contact-full.vcf'} (not committed).")
