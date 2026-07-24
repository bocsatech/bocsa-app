#!/usr/bin/env python3
"""Becslés CatBoost modellel — egy autó vagy CSV."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd
from catboost import CatBoostRegressor

from data_prep import CAT_COLS, FEATURE_COLS, TARGET, load_listings, resolve_csv


def find_model(explicit: str | None = None) -> Path:
    if explicit:
        path = Path(explicit).expanduser()
        if not path.exists():
            raise FileNotFoundError(path)
        return path
    home = Path.home()
    candidates = [
        home / "Downloads" / "fugveny" / "uj lista" / "catboost" / "model.cbm",
        home / "Downloads" / "fugveny" / "catboost" / "model.cbm",
    ]
    for c in candidates:
        if c.exists():
            return c
    raise FileNotFoundError("Nincs model.cbm — futtasd: python train.py")


def main() -> None:
    parser = argparse.ArgumentParser(description="CatBoost árbecslés")
    parser.add_argument("--model", default=None)
    parser.add_argument("--csv", default=None, help="Teljes lista pontozása")
    parser.add_argument("--out", default=None, help="Pontozott CSV kimenet")
    parser.add_argument("--gyartmany", default=None)
    parser.add_argument("--modell", default=None)
    parser.add_argument("--tipus", default=None)
    parser.add_argument("--uzemanyag", default="Diesel")
    parser.add_argument("--ev", type=float, default=None)
    parser.add_argument("--honap", type=float, default=None)
    parser.add_argument("--ccm", type=float, default=None)
    parser.add_argument("--kw", type=float, default=None)
    parser.add_argument("--le", type=float, default=None)
    parser.add_argument("--km", type=float, default=None)
    args = parser.parse_args()

    model_path = find_model(args.model)
    model = CatBoostRegressor()
    model.load_model(str(model_path))
    print(f"Modell: {model_path}")

    if args.csv or (args.gyartmany is None and args.modell is None):
        csv_path = resolve_csv(args.csv)
        df = load_listings(csv_path)
        X = df[FEATURE_COLS].copy()
        for c in CAT_COLS:
            X[c] = X[c].astype(str)
        df["Becsult_ar_Ft"] = model.predict(X)
        if TARGET in df.columns:
            df["Elteres_Ft"] = df["Becsult_ar_Ft"] - df[TARGET]
            df["Elteres_pct"] = (df["Elteres_Ft"] / df[TARGET].clip(lower=1)) * 100

        out = Path(args.out).expanduser() if args.out else csv_path.parent / "catboost" / "scored.csv"
        out.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(out, index=False)
        print(f"Pontozott: {out} ({len(df)} db)")
        if TARGET in df.columns:
            undervalued = df.sort_values("Elteres_pct").head(20)
            print("\nTop 20: piaci ár < becsült (potenciálisan olcsó):")
            cols = [c for c in ["Gyartmany", "Modell", "Tipus", "Ev", "Kmora_allas", TARGET, "Becsult_ar_Ft", "Elteres_pct"] if c in undervalued.columns]
            print(undervalued[cols].to_string(index=False))
        return

    row = {
        "Gyartmany": str(args.gyartmany or "ismeretlen"),
        "Modell": str(args.modell or "ismeretlen"),
        "Tipus": str(args.tipus or "ismeretlen"),
        "Uzemanyag": str(args.uzemanyag or "ismeretlen"),
        "Ev": args.ev,
        "Honap": args.honap,
        "Hengerurtartalom": args.ccm,
        "Teljesitmeny_kW": args.kw,
        "Teljesitmeny_LE": args.le,
        "Kmora_allas": args.km,
    }
    X = pd.DataFrame([row])[FEATURE_COLS]
    for c in CAT_COLS:
        X[c] = X[c].astype(str)
    price = float(model.predict(X)[0])
    print(json.dumps({"becsult_ar_Ft": round(price), "input": row}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
