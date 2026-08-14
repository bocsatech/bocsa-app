# Függvény / átlagszámolás — hasznaltauto lista export

## Új nagy lista (~78566 / ~3143 oldal)

Mentés: `~/Downloads/fugveny/uj lista/`

| Fájl | Szerep |
|------|--------|
| `uj-lista.csv` / `.json` | aktuális teljes / legfrissebb |
| `uj-lista-reszleges.csv` | részeredmény (10 oldanként) |
| `uj-lista-progress.json` | hol tart (folytatáshoz) |

### Indítás (Mac)

```bash
cd ~/bocsa-app && git pull
cd fugveny/mac && ./telepites.command
```

Majd:

1. Másold a list URL-t  
2. Dupla katt: `~/Downloads/fugveny/Inditas-uj-lista.command`  
   (vagy asztal: `Fugveny-uj-lista.command`)  
3. Chrome-ban nyisd meg a listát, Cloudflare → kattints, Enter  

Vagy kézzel:

```bash
cd ~/Downloads/fugveny/program
npm start -- --connect --name "uj lista" --url "https://www.hasznaltauto.hu/talalatilista/..."
```

Megszakítás után automatikusan folytat a progress alapján, vagy:

```bash
npm start -- --connect --name "uj lista" --from-page 500
```

## Mezők

Gyártmány, Modell, Típus, Üzemanyag, Gyártási év, Hengerűrtartalom, kW, LE, Km, Vételár  
(URL és hirdetéskód **nincs**)

## CatBoost ár-függvény

A listából tanult modell becsli a vételárat.

### Webes felület (Bymy)

https://bymy.vercel.app/fugveny.html

- listák betöltése (`~/Downloads/fugveny`)
- CatBoost tanítás / lista pontozás
- árbecslés + mentett lekérdezések

Bymy indítás után nyisd meg a **Függvény** menüpontot.

### Parancssor

```bash
~/Downloads/fugveny/Catboost-tanitas.command
# vagy:
cd ~/bocsa-app/fugveny/catboost && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && python train.py && python predict.py
```

Kimenet: `~/Downloads/fugveny/uj lista/catboost/model.cbm`  
Részletek: [`catboost/README.md`](./catboost/README.md)

## Régi lista

`~/Downloads/fugveny/hirdetesek.csv` — `Inditas.command`
