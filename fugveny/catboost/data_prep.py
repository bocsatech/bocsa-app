"""CSV → CatBoost tanító tábla (hasznaltauto / fugveny export)."""
from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

CAT_COLS = ["Gyartmany", "Modell", "Tipus", "Uzemanyag"]
NUM_COLS = [
    "Ev",
    "Honap",
    "Hengerurtartalom",
    "Teljesitmeny_kW",
    "Teljesitmeny_LE",
    "Kmora_allas",
]
TARGET = "Vetelar_Ft"

FEATURE_COLS = CAT_COLS + NUM_COLS


def digits(value) -> float | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    m = re.sub(r"[^\d]", "", str(value))
    return float(m) if m else None


def parse_year_month(value) -> tuple[float | None, float | None]:
    text = str(value or "").strip()
    m = re.match(r"((?:19|20)\d{2})(?:/(\d{1,2}))?", text)
    if not m:
        return None, None
    year = float(m.group(1))
    month = float(m.group(2)) if m.group(2) else None
    return year, month


def load_listings(csv_path: str | Path) -> pd.DataFrame:
    path = Path(csv_path)
    df = pd.read_csv(path)

    # régi / új fejléc kompatibilitás
    rename = {}
    for col in df.columns:
        key = col.strip()
        if key.lower() in {"gyartmany", "gyártmány"}:
            rename[col] = "Gyartmany"
        elif key.lower() in {"modell"}:
            rename[col] = "Modell"
        elif key.lower() in {"tipus", "típus"}:
            rename[col] = "Tipus"
        elif key.lower() in {"uzemanyag", "üzemanyag"}:
            rename[col] = "Uzemanyag"
        elif "gyartasi" in key.lower() or "gyártási" in key.lower():
            rename[col] = "Gyartasi_ev"
        elif "henger" in key.lower():
            rename[col] = "Hengerurtartalom"
        elif key.lower().endswith("kw") or "teljesitmeny_kw" in key.lower():
            rename[col] = "Teljesitmeny_kW"
        elif key.lower().endswith("le") or "teljesitmeny_le" in key.lower():
            rename[col] = "Teljesitmeny_LE"
        elif "kmora" in key.lower() or key.lower() == "km":
            rename[col] = "Kmora_allas"
        elif "vetelar" in key.lower() or key.lower() in {"ar", "ár"}:
            rename[col] = "Vetelar"
    df = df.rename(columns=rename)

    out = pd.DataFrame()
    for c in CAT_COLS:
        out[c] = df.get(c, "").fillna("").astype(str).str.strip().replace({"": "ismeretlen"})

    years, months = zip(*(parse_year_month(v) for v in df.get("Gyartasi_ev", [])))
    out["Ev"] = list(years)
    out["Honap"] = list(months)
    out["Hengerurtartalom"] = [digits(v) for v in df.get("Hengerurtartalom", [])]
    out["Teljesitmeny_kW"] = [digits(v) for v in df.get("Teljesitmeny_kW", [])]
    out["Teljesitmeny_LE"] = [digits(v) for v in df.get("Teljesitmeny_LE", [])]
    out["Kmora_allas"] = [digits(v) for v in df.get("Kmora_allas", [])]
    out[TARGET] = [digits(v) for v in df.get("Vetelar", [])]

    out = out.dropna(subset=[TARGET])
    out = out[out[TARGET] > 100_000]
    out = out[out[TARGET] < 200_000_000]

    for c in NUM_COLS:
        out[c] = pd.to_numeric(out[c], errors="coerce")

    return out.reset_index(drop=True)


def default_csv_candidates() -> list[Path]:
    home = Path.home()
    return [
        home / "Downloads" / "fugveny" / "uj lista" / "uj-lista.csv",
        home / "Downloads" / "fugveny" / "uj lista" / "uj-lista-reszleges.csv",
        home / "Downloads" / "fugveny" / "hirdetesek.csv",
        home / "Letöltések" / "fugveny" / "uj lista" / "uj-lista.csv",
    ]


def resolve_csv(explicit: str | None = None) -> Path:
    if explicit:
        path = Path(explicit).expanduser()
        if not path.exists():
            raise FileNotFoundError(path)
        return path
    for cand in default_csv_candidates():
        if cand.exists() and cand.stat().st_size > 100:
            return cand
    raise FileNotFoundError(
        "Nincs CSV. Előbb scrapeld a listát, vagy: python train.py --csv PATH"
    )
