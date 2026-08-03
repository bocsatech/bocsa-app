# Add el autod — mobil (Expo)

4 oldalas iPhone-stílusú app: **Hírfolyam → Kiemeltek → Keresés → Mentett keresések**.  
Jobbra–balra húzással váltasz (mint a kezdőképernyő).

**Nem** a Bocsa CRM — az Autosweb / **Add el autod.hu** koncepció mobil héja.

## Mac + iOS Simulator

Előfeltétel: **Xcode** + Simulator (nálad megvan).

```bash
cd ~/bocsa-app/addelautod-mobile   # vagy a repo klónod
npm install
npx expo start --ios
```

Ha a Simulator nem nyílik:

```bash
open -a Simulator
npx expo start --ios
```

Terminálban `i` = iOS Simulator.

## Oldalak

| # | Oldal | Tartalom |
|---|--------|----------|
| 1 | Hírfolyam | Hírek + YouTube (demo) |
| 2 | Kiemeltek | Autós oldal kiemelt hirdetései (demo) |
| 3 | Keresés | iOS Beállítások-menü: márka/modell almenü, extrák **kapcsolóval** |
| 4 | Mentett | Keresési feltételek ikonokra (nem hirdetés) |

Kereső: Márka › → lista → választás → visszalép. Extrák: Switch, nem checkbox.

## Később

- Autosweb API / localhost lista bekötése
- mentesmarka CSV katalógus
- Éles YouTube / hírforrás
