"""Static deployment checks only; this does not test gameplay or offline caching."""
from __future__ import annotations

import json
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


class ResourceLinks(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.urls: list[str] = []
        self.has_base = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs = dict(attrs)
        if tag == "base":
            self.has_base = True
        if tag in {"script", "img", "source", "audio", "video"} and attrs.get("src"):
            self.urls.append(attrs["src"])
        if tag == "link" and attrs.get("href"):
            rel = set((attrs.get("rel") or "").lower().split())
            if rel & {"stylesheet", "manifest", "icon", "apple-touch-icon", "preload", "modulepreload"}:
                self.urls.append(attrs["href"])


def validate_site(folder: Path) -> list[str]:
    root = folder.resolve()
    errors: list[str] = []
    if folder.is_symlink():
        return ["The site directory must not be a symbolic link."]
    for name in ("index.html", "manifest.webmanifest", "sw.js"):
        path = root / name
        if not path.is_file() or path.stat().st_size == 0:
            errors.append(f"Missing or empty site/{name}. Import the real game build first.")
    if errors:
        return errors
    for path in root.rglob("*"):
        if path.is_symlink():
            errors.append(f"Symbolic link is not allowed: {path.relative_to(root)}")

    def check_url(value: str, label: str, must_exist: bool = True) -> None:
        try:
            parsed = urlsplit(value)
            if parsed.scheme == "data" and must_exist:
                return
            if parsed.scheme or parsed.netloc or parsed.path.startswith(("/", "\\")):
                errors.append(f"{label}: use a relative URL, not {value!r}.")
                return
            decoded = unquote(parsed.path)
            if "\\" in decoded:
                errors.append(f"{label}: URL must use forward slashes.")
                return
            target = (root / decoded).resolve()
            if not target.is_relative_to(root):
                errors.append(f"{label}: URL escapes site/: {value!r}.")
            elif must_exist and decoded and not target.is_file():
                errors.append(f"{label}: missing local asset {value!r}.")
        except (ValueError, OSError) as exc:
            errors.append(f"{label}: invalid URL {value!r}: {exc}")

    try:
        parser = ResourceLinks()
        parser.feed((root / "index.html").read_text(encoding="utf-8"))
        if parser.has_base:
            errors.append("Remove the base tag; use relative project-site URLs instead.")
        for url in parser.urls:
            check_url(url, "index.html resource")
        manifest = json.loads((root / "manifest.webmanifest").read_text(encoding="utf-8"))
        if not isinstance(manifest, dict):
            raise ValueError("manifest must be a JSON object")
        for key in ("start_url", "scope"):
            value = manifest.get(key, "./")
            if not isinstance(value, str):
                raise ValueError(f"manifest {key} must be a string")
            check_url(value, f"manifest {key}", must_exist=False)
        icons = manifest.get("icons", [])
        if not isinstance(icons, list):
            raise ValueError("manifest icons must be an array")
        for icon in icons:
            if not isinstance(icon, dict) or not isinstance(icon.get("src"), str):
                raise ValueError("each manifest icon must have a string src")
            check_url(icon["src"], "manifest icon")
    except (OSError, UnicodeError, ValueError) as exc:
        errors.append(f"Cannot read website metadata: {exc}")
    return sorted(set(errors))


if __name__ == "__main__":
    issues = validate_site(Path(sys.argv[1] if len(sys.argv) > 1 else "site"))
    for issue in issues:
        print(f"ERROR: {issue}", file=sys.stderr)
    if issues:
        raise SystemExit(1)
    print("Static preflight passed. Browser, gameplay and offline tests are still required.")
