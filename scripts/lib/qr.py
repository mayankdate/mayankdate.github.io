"""Generate QR codes as PNG files using segno."""

from __future__ import annotations

from pathlib import Path

import segno


def write_qr(content: str, out_path: Path, scale: int = 10, dark: str = "#0D2545") -> Path:
    """
    Write a PNG QR code encoding `content` to `out_path`.

    Uses high error correction so the center can tolerate a logo overlay
    if we add one later.  dark = brand navy so the QR fits the palette.
    """
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    qr = segno.make(content, error="h")
    qr.save(
        str(out_path),
        scale=scale,
        border=2,
        dark=dark,
        light="white",
    )
    return out_path


def write_vcf(content: str, out_path: Path) -> Path:
    """Also write the raw .vcf file so phones that can't scan can download it."""
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(content, encoding="utf-8")
    return out_path
