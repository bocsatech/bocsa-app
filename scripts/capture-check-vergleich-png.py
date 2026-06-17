#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "documents/pdca/check-vergleich.html"
OUT = ROOT / "documents/pdca/check-vergleich.png"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1100, "height": 900})
    page.goto(HTML.as_uri())
    page.wait_for_timeout(400)
    page.screenshot(path=str(OUT), type="png", full_page=True)
    browser.close()
print(f"Kész: {OUT}")
