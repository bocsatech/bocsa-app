#!/usr/bin/env python3
"""CatBoost ár-függvény tanítás a fugveny CSV-ből."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from catboost import CatBoostRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

from data_prep import CAT_COLS, FEATURE_COLS, TARGET, load_listings, resolve_csv


def default_out_dir(csv_path: Path) -> Path:
    # CSV mellett: .../uj lista/catboost  vagy .../fugveny/catboost
    parent = csv_path.parent
    if parent.name.lower() in {"uj lista", "uj-lista"}:
        return parent / "catboost"
    return parent / "catboost"


def main() -> None:
    parser = argparse.ArgumentParser(description="CatBoost tanítás — fugveny lista")
    parser.add_argument("--csv", default=None, help="Input CSV (alap: uj-lista.csv)")
    parser.add_argument("--out", default=None, help="Kimenet mappa")
    parser.add_argument("--iterations", type=int, default=800)
    parser.add_argument("--depth", type=int, default=8)
    parser.add_argument("--lr", type=float, default=0.05)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    csv_path = resolve_csv(args.csv)
    out_dir = Path(args.out).expanduser() if args.out else default_out_dir(csv_path)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"CSV:  {csv_path}")
    print(f"Out:  {out_dir}")

    df = load_listings(csv_path)
    print(f"Sorok tanításhoz: {len(df)}")
    if len(df) < 50:
        raise SystemExit("Túl kevés adat (<50). Várj, amíg a scrape több sort ment.")

    X = df[FEATURE_COLS].copy()
    y = df[TARGET].astype(float)
    for c in CAT_COLS:
        X[c] = X[c].astype(str)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=args.seed
    )

    model = CatBoostRegressor(
        loss_function="RMSE",
        iterations=args.iterations,
        depth=args.depth,
        learning_rate=args.lr,
        random_seed=args.seed,
        early_stopping_rounds=50,
        verbose=100,
        allow_writing_files=False,
    )
    model.fit(
        X_train,
        y_train,
        cat_features=CAT_COLS,
        eval_set=(X_test, y_test),
        use_best_model=True,
    )

    pred = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, pred)))
    r2 = float(r2_score(y_test, pred))
    mape = float(np.mean(np.abs((y_test - pred) / np.clip(y_test, 1, None))) * 100)

    metrics = {
        "csv": str(csv_path),
        "n_total": int(len(df)),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "mae_Ft": round(mae),
        "rmse_Ft": round(rmse),
        "mape_pct": round(mape, 2),
        "r2": round(r2, 4),
        "iterations": int(model.tree_count_),
        "features": FEATURE_COLS,
        "cat_features": CAT_COLS,
        "target": TARGET,
    }

    model_path = out_dir / "model.cbm"
    meta_path = out_dir / "metrics.json"
    importance_path = out_dir / "feature_importance.csv"
    pred_path = out_dir / "test_predictions.csv"

    model.save_model(str(model_path))
    (out_dir / "meta.json").write_text(
        json.dumps(
            {"features": FEATURE_COLS, "cat": CAT_COLS, "target": TARGET},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    imp = pd.DataFrame(
        {
            "feature": FEATURE_COLS,
            "importance": model.get_feature_importance(),
        }
    ).sort_values("importance", ascending=False)
    imp.to_csv(importance_path, index=False)

    pd.DataFrame(
        {
            "y_true": y_test.values,
            "y_pred": pred,
            "abs_err": np.abs(y_test.values - pred),
        }
    ).to_csv(pred_path, index=False)

    meta_path.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")

    print("")
    print("Kész — CatBoost függvény")
    print(f"  Modell:  {model_path}")
    print(f"  MAE:     {metrics['mae_Ft']:,} Ft".replace(",", " "))
    print(f"  RMSE:    {metrics['rmse_Ft']:,} Ft".replace(",", " "))
    print(f"  MAPE:    {metrics['mape_pct']} %")
    print(f"  R²:      {metrics['r2']}")
    print(f"  Fontos:  {importance_path}")


if __name__ == "__main__":
    main()
