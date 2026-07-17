# Mobile.de Pro

Figyeli a **mobile.de** mentett kereséseket (FSBO / magán eladók), kiolvassa a telefonszámot, és **SMS-t küld** Twilio-val (+49 mobil: 15/16/17).

## Orchestrator slot

1. Válassz egy szabad slotot (pl. Slot 4)
2. Program: **Mobile.de Pro**
3. Illeszd be a keresés URL-t (`search.html`, ajánlott: `&st=FSBO`)
4. Twilio beállítás + **💾 Mentés** → **▶ Indítás**

## Példa URL

```
https://suchen.mobile.de/fahrzeuge/search.html?isSearchRequest=true&s=Car&vc=Car&dam=false&fr=2015&ml=%3A175000&ms=24100%3B%3B%3B&p=%3A22500&cn=DE&ft=HYBRID&st=FSBO&ref=dsp
```

## Mac mappa

`~/Downloads/mobilede pro`

## Parancsok

```bash
cd ~/Downloads/mobilede\ pro
npm install
npm start          # önálló (3849)
npm run login      # süti / bejelentkezés
npm run stop
```

Orchestrator slotnál a port **3851–3856** (slotonként).
