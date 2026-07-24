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

## Régi lista

`~/Downloads/fugveny/hirdetesek.csv` — `Inditas.command`
