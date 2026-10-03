#!/usr/bin/env python3
"""
CLI entry point for building the site.

Run from the repo root:
    python scripts/build.py

Or run the notebook `scripts/build.ipynb` instead — same output.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure `scripts/` is on the path so `import lib...` works
sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib import build  # noqa: E402

if __name__ == "__main__":
    build.main()
