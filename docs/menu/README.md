# Oldalmenü — fejlesztési jegyzetek

Itt dokumentáljuk **menüpontonként**, mit kell fejleszteni. Egy menü = egy fájl.

**Kód:** `app/components/AppSidebar.tsx`

**Szabályok:**
- Csak az adott menü fájljába írj — ne keverd a deploy / Supabase témát (az külön agent).
- Ha kész: `[x]` a feladatnál.
- Localhost = igazság; web = ugyanaz a kód + ugyanaz a Supabase (Bocsa.tech).

## Menüpontok

| # | Menü | Fájl | Útvonal |
|---|------|------|---------|
| 1 | Home | [01-home.md](./01-home.md) | `/` |
| 2 | Baumaschinen (Untermenü) | [02-maschinen.md](./02-maschinen.md) | `/maschinen` |
| 2a | ↳ Maschine hinzufügen | *(02-maschinen.md)* | `/maschinen?aktion=hinzufuegen` |
| 2b | ↳ Nummern-Codes | *(02-maschinen.md)* | `/maschinen?aktion=geraetenummer-codes` |
| 2c | ↳ QR-Code scannen | *(02-maschinen.md)* | `/maschinen?aktion=qr` |
| 2d | ↳ Bauarbeitsauftrag | [04-arbeitsauftrag.md](./04-arbeitsauftrag.md) | `/arbeitsauftrag` |
| 2e | ↳ Bauprüfprotokoll | [05-pruefprotokoll.md](./05-pruefprotokoll.md) | `/pruefprotokoll` |
| 3 | Meldungen | [03-meldungen.md](./03-meldungen.md) | `/meldungen` |
| 6 | Lager | [06-lager.md](./06-lager.md) | `/lager` |
| 7 | PKW (Untermenü) | `docs/pkw-modul.md` | Kunden, PKW-Service |
| 8 | Arbeitsstunden | [07-arbeitsstunden.md](./07-arbeitsstunden.md) | `/arbeitsstunden` |
| 9 | Filialen | [08-filialen.md](./08-filialen.md) | `/filialen` |
| 10 | QR-Code | [11-qr-code.md](./11-qr-code.md) | `/qr-code` |
| 11 | Benutzer | [09-users.md](./09-users.md) | `/users` |
| 12 | Gruppen | [10-gruppen.md](./10-gruppen.md) | `/groups` |

## Más témák (ne ide)

| Téma | Hol |
|------|-----|
| Supabase SQL | `supabase/` + külön Cursor agent |
| Web deploy (Vercel) | külön Cursor agent |
| `.env.local` | gépen, nem GitHub |
