# Átlag számolás / Függvény

**Program:** `fugveny/`  
**Kimenet (Mac):** `~/Downloads/fugveny/`

## Cél

Hasznaltauto.hu találati lista (összes oldal, ~739 hirdetés) → CSV/JSON a megjelölt mezőkkel → átlag számolás.

## Mezők

Gyártmány, Modell, Típus, Üzemanyag, Gyártási év, Hengerűrtartalom, Teljesítmény (kW/LE), Kmóra, Vételár

## Futtatás Mac-en

```bash
cd ~/bocsa-app/fugveny/mac && ./telepites.command
# majd:
~/Downloads/fugveny/Inditas.command
```

Cloudflare miatt a scrapelés **helyi Chrome-ban** fut (`--connect`).
