# Hirdetésfeladás — localhost klón

Teljesen **független** projekt a bocsa-tech-től. Csak helyi gépen fut, **nincs** külső hálózati hívás.

## Indítás

```bash
cd hirdetes-local
npm start
```

Megnyílik: **http://127.0.0.1:3456**

## Mi van benne?

- Hasznaltauto.hu **hirdetésfeladás** oldal egyszerű vizuális klónja
- 4 lépéses varázsló: járműadatok → képek → csomag → kész
- Űrlapmezők, felszereltség jelölőnégyzetek (mint az eredeti)
- Vázlat mentés `localStorage`-ba (offline)

## Következő lépések (később)

- Egyedi design / márkanév
- Backend, aktiválás, import
- Járműkatalógus: külön `mentesmarka` projekt → `data/jarmu-katalogus.json`
