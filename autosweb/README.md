# Autosweb — hirdetésfeladás oldal

Hasznaltauto.hu hirdetésfeladás **helyi weboldal** (7-es minta kinézet).

## Mac telepítés (Letöltések mappa + asztali indító)

A repóból **egyszer** futtasd:

```bash
cd ~/bocsa-app/autosweb/mac
chmod +x telepites.command
./telepites.command
```

Ez:
1. Másolja a projektet → **`~/Downloads/autosweb`**
2. Telepíti a függőségeket (`npm install`)
3. Az asztalra tesz egy **`Autosweb-indito.command`** fájlt

## Használat

Dupla kattintás az asztalon: **Autosweb-indito.command**

Megnyílik: **http://127.0.0.1:3456**

## Fájlok helye a Mac-en

```
~/Downloads/autosweb/
├── public/          ← HTML, CSS, JS
├── server.mjs       ← helyi szerver
└── package.json
```

## Járműkatalógus

Külön program: `~/bocsa-app/mentesmarka` → `data/jarmu-katalogus.json`
