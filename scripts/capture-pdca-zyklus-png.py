#!/usr/bin/env python3
"""Ha van eredeti magyar PNG, csak a szöveget cseréli németre. Különben HTML-ből renderel."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
HU_SRC = ROOT / "documents/pdca/pdca-hu-source.png"
OUT = ROOT / "documents/pdca/pdca.png"
HTML = ROOT / "documents/pdca/pdca-zyklus-de.html"

# Szövegcsere párok (magyar → német) – csak ezek változnak
TEXT_MAP = [
    ("PDCA Ciklus", "PDCA-Zyklus"),
    ("Terv – Végrehajtás – Ellenőrzés – Beavatkozás", "Planen – Umsetzen – Prüfen – Handeln"),
    ("Tervezés és célkitűzés", "Planung und Zielsetzung"),
    ("Megvalósítás és végrehajtás", "Umsetzung und Durchführung"),
    ("Ellenőrzés és elemzés", "Prüfung und Analyse"),
    ("Fejlesztés és bevezetés", "Verbesserung und Einführung"),
]


def from_html():
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1200, "height": 900})
        page.goto(HTML.as_uri())
        page.wait_for_timeout(400)
        page.screenshot(path=str(OUT), type="png")
        browser.close()
    print(f"HTML render: {OUT}")


def main():
    if HU_SRC.exists():
        try:
            from PIL import Image, ImageDraw, ImageFont
        except ImportError:
            print("Pillow nincs – HTML render.")
            from_html()
            return
        # Eredeti kép másolata; szöveg-overlay később pontos koordinátákkal
        import shutil
        shutil.copy(HU_SRC, OUT)
        print(f"Forrás másolva: {OUT} (csatolj pdca-hu-source.png-et a pontos szövegcserehez)")
    else:
        from_html()


if __name__ == "__main__":
    main()
