"""Build a vCard 3.0 string from the profile config."""

from __future__ import annotations


def build_vcard(profile: dict) -> str:
    """
    Return a vCard 3.0 string containing all phones and emails.

    Scanning the QR of this string on a modern phone opens the Contacts
    app with a pre-filled new contact that includes every phone and
    email label.
    """
    name = profile["name"]
    parts = name.split()
    given = parts[0]
    family = " ".join(parts[1:]) if len(parts) > 1 else ""

    org = "Johns Hopkins Bloomberg School of Public Health"
    title = profile.get("title", "")
    url = profile.get("site_url", "")

    lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        f"N:{family};{given};;;",
        f"FN:{name}",
        f"ORG:{org}",
        f"TITLE:{_vcard_escape(title)}",
    ]

    for phone in profile.get("phones", []):
        label = phone.get("label", "").upper() or "CELL"
        lines.append(f"TEL;TYPE=CELL,{label}:{phone['number']}")

    for email in profile.get("emails", []):
        label = email.get("label", "").upper() or "INTERNET"
        lines.append(f"EMAIL;TYPE=INTERNET,{label}:{email['address']}")

    if url:
        lines.append(f"URL:{url}")

    for social in profile.get("socials", []):
        if social.get("icon") == "linkedin":
            lines.append(f"URL;TYPE=LinkedIn:{social['url']}")

    lines.append("END:VCARD")
    return "\r\n".join(lines) + "\r\n"


def _vcard_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace(",", r"\,").replace(";", r"\;")
