# CatBoost — fugveny ár-függvény

A scrapelt listából (`uj-lista.csv`) CatBoost regresszor tanulja a **vételár** függvényét.

## Telepítés (Mac)

```bash
cd ~/bocsa-app/fugveny/catboost
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Vagy: `~/Downloads/fugveny/Catboost-tanitas.command` (telepítés után).

## Tanítás

Ha van elég sor a listában (`~/Downloads/fugveny/uj lista/uj-lista.csv`):

```bash
cd ~/bocsa-app/fugveny/catboost
source .venv/bin/activate
python train.py
```

Kimenet: `~/Downloads/fugveny/uj lista/catboost/`

- `model.cbm` — modell
- `metrics.json` — MAE / RMSE / R²
- `feature_importance.csv`
- `test_predictions.csv`

## Becslés

```bash
# egész lista pontozása + „olcsó” találatok
python predict.py

# egy autó
python predict.py --gyartmany Audi --modell A6 --tipus "40 TDI Design" \
  --uzemanyag Diesel --ev 2019 --kw 150 --le 204 --km 120000 --ccm 1968
```

## Jellemzők

Kategorikus: Gyártmány, Modell, Típus, Üzemanyag  
Szám: Év, Hónap, cm³, kW, LE, km → cél: Vételár (Ft)
