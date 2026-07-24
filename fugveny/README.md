# Függvény / átlagszámolás — hasznaltauto lista export

Hasznaltauto.hu **találati lista** összes oldalának beolvasása → CSV/JSON → átlag számolás.

## Mezők (listakártyáról)

Gyártmány, Modell, Típus, Üzemanyag, Gyártási év, Hengerűrtartalom, Teljesítmény kW/LE, Km, Vételár

## Telepítés (Mac)

```bash
cd ~/bocsa-app/fugveny/mac
chmod +x telepites.command
./telepites.command
```

Cél: `~/Downloads/fugveny/` (+ asztali `Fugveny-indito.command`)

## Futtatás

```bash
cd ~/Downloads/fugveny/program
npm start -- --connect
```

1. Megnyílik a Chrome a listával  
2. Ha Cloudflare jön → kattints / oldd meg  
3. A program végigmegy az összes oldalon (1…30)  
4. Mentés: `~/Downloads/fugveny/hirdetesek.csv` + `.json`

Átlagok:

```bash
npm run atlag
```

## Opciók

```bash
npm start -- --url "https://www.hasznaltauto.hu/talalatilista/..."
npm start -- --headed
npm start -- --connect
npm run chrome   # csak Chrome debug port
```
