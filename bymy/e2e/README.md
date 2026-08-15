# Bymy Playwright e2e

Böngészős tesztek a Bymy webhez (Playwright). Cypress nincs — a repóban már Playwright van.

## Futtatás

```bash
cd bymy
npm install
npx playwright install chromium
npm run test:e2e
```

Alapértelmezett cél: `https://bymy.vercel.app`

Másik URL:

```bash
BYMY_BASE_URL=http://127.0.0.1:3456 npm run test:e2e
```

Csak desktop Chromium:

```bash
npm run test:e2e -- --project=chromium
```

UI mód:

```bash
npm run test:e2e:ui
```

## Mit fed le

- smoke: kezdőlap, belépés, regisztráció, `/api/auth/db` + Google OAuth enabled
- fejléc: logo / menü / hirdetés / téma több oldalon
- üzenetek API: nincs `ENOENT ~/.autosweb` 500
