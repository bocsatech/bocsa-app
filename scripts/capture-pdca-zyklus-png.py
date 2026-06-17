#!/usr/bin/env python3
"""PDCA német infografika PNG generálás."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "documents/pdca/pdca-zyklus-de.html"
OUT = ROOT / "documents/pdca/pdca.png"


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1200, "height": 900})
        page.goto(HTML.as_uri())
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT), type="png")
        browser.close()
    print(f"Kész: {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
