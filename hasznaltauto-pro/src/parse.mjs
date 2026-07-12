import { dismissConsent } from './consent.mjs';

export function normalizeListUrl(url) {
  let u = url.trim();
  if (!u) return u;

  u = u.replace(/\/$/, '');

  // Az 1. oldal NEM használ /page1 suffixet (csak page2-től).
  if (/\/page1$/i.test(u)) {
    u = u.replace(/\/page1$/i, '');
  }

  return u;
}

export function validateWatchUrl(url) {
  const u = url.trim();
  if (!u) return { ok: false, reason: 'üres URL' };
  if (!/hasznaltauto\.hu/i.test(u)) {
    return { ok: false, reason: 'nem hasznaltauto.hu link' };
  }
  if (/\/szemelyauto\//i.test(u) && !/talalatilista/i.test(u)) {
    return {
      ok: false,
      reason: 'ez egy hirdetés link — a mentett keresés talalatilista/... URL kell',
    };
  }
  if (!/talalatilista/i.test(u)) {
    return { ok: false, reason: 'talalatilista/... keresés URL kell' };
  }
  return { ok: true };
}

export function findNewAds(ads, markerId, calibrated) {
  if (!ads.length) return { newAds: [], action: 'empty' };

  if (!calibrated || !markerId) {
    return {
      newAds: [],
      action: 'calibrate',
      newMarker: ads[0].id,
    };
  }

  const idx = ads.findIndex((a) => a.id === markerId);
  if (idx === -1) {
    return {
      newAds: [],
      action: 'recalibrate',
      newMarker: ads[0].id,
    };
  }
  if (idx === 0) {
    return { newAds: [], action: 'none', newMarker: markerId };
  }

  return {
    newAds: ads.slice(0, idx),
    action: 'new',
    newMarker: ads[0].id,
  };
}

export function formatMessage(template, ad) {
  return template
    .replaceAll('{title}', ad.title || '')
    .replaceAll('{price}', ad.price || '')
    .replaceAll('{location}', ad.location || '')
    .replaceAll('{url}', ad.url || '')
    .replaceAll('{id}', ad.id || '');
}

export async function fetchListings(page, url) {
  const check = validateWatchUrl(url);
  if (!check.ok) {
    throw new Error(check.reason);
  }

  const listUrl = normalizeListUrl(url);
  await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await dismissConsent(page);

  try {
    await page.waitForSelector('a[href*="/szemelyauto/"], .cim-kontener, .talalati-sor', {
      timeout: 20000,
    });
  } catch {
    /* continue with diagnostics */
  }

  await page.waitForTimeout(2500);
  await dismissConsent(page);

  const snapshot = await page.evaluate(() => {
    const title = document.title || '';
    const bodyText = (document.body?.innerText || '').slice(0, 1200);
    const linkCount = document.querySelectorAll('a[href*="/szemelyauto/"]').length;
    const rowCount = document.querySelectorAll('.talalati-sor, [class*="talalati-sor"]').length;
    const cimCount = document.querySelectorAll('.cim-kontener').length;
    const zeroHits = /0\s*(?:találat|hirdetés)|nincs találat/i.test(bodyText);
    return { title, linkCount, rowCount, cimCount, zeroHits, path: location.pathname };
  });

  if (/cloudflare|attention required|just a moment/i.test(snapshot.title)) {
    throw new Error('Cloudflare blokkol — futtasd a Macen, ne zárd be a Chrome-ot');
  }

  const ads = await page.evaluate(() => {
    const AD_PATH_RE = /\/szemelyauto\/[^?#]+-(\d+)\/?(?:\?|#|$)/i;

    function rowLooksDealer(row) {
      if (!row) return false;
      const text = row.innerText || '';
      return (
        !!row.querySelector('img[src*="cegfoto"], img[src*="ceglogo"]') ||
        /\bKereskedés\b/i.test(text)
      );
    }

    function buildAdFromContext(link, row) {
      if (!link) return null;
      const href = link.getAttribute('href') || '';
      if (!href || !AD_PATH_RE.test(href)) return null;

      const fullUrl = href.startsWith('http')
        ? href
        : `https://www.hasznaltauto.hu${href.startsWith('/') ? '' : '/'}${href}`;

      const idFromAttr = row?.querySelector('[data-hirkod]')?.getAttribute('data-hirkod');
      const idFromUrl = href.match(/-(\d+)\/?(?:\?|#|$)/i)?.[1];
      const id = String(idFromAttr || idFromUrl || '').trim();
      if (!id) return null;

      const title = (link.textContent || '').replace(/\s+/g, ' ').trim();
      if (!title || title.length < 3) return null;

      return {
        id,
        title,
        price: (
          row?.querySelector(
            '.pricefield-primary, .vetelar, .price-fields-desktop, [class*="price"]'
          )?.textContent || ''
        )
          .replace(/\s+/g, ' ')
          .trim(),
        location: (
          row?.querySelector(
            '.tavolsag_talalati, .talalatisor-info.tavolsaginfo, [class*="tavolsag"]'
          )?.textContent || ''
        )
          .replace(/\s+/g, ' ')
          .trim(),
        url: fullUrl.split('?')[0].split('#')[0],
        isPrivate: !rowLooksDealer(row),
      };
    }

    const ads = [];
    const seen = new Set();
    const pushAd = (ad) => {
      if (!ad || seen.has(ad.id)) return;
      seen.add(ad.id);
      ads.push(ad);
    };

    const rows = [
      ...document.querySelectorAll('.row.talalati-sor, .talalati-sor, [class*="talalati-sor"]'),
    ];
    for (const row of rows) {
      const link = row.querySelector(
        '.cim-kontener h3 a, h3 a, .talalatisor-kep a, a[href*="/szemelyauto/"]'
      );
      pushAd(buildAdFromContext(link, row));
    }

    if (!ads.length) {
      for (const block of document.querySelectorAll('.cim-kontener')) {
        const link = block.querySelector('a[href*="/szemelyauto/"]');
        const row =
          block.closest('.row, .talalati-sor, article, li, [class*="talalat"], [class*="listing"]') ||
          block.parentElement;
        pushAd(buildAdFromContext(link, row));
      }
    }

    if (!ads.length) {
      for (const link of document.querySelectorAll('a[href*="/szemelyauto/"]')) {
        const href = link.getAttribute('href') || '';
        if (!AD_PATH_RE.test(href)) continue;
        const row =
          link.closest('.row, .talalati-sor, article, li, [class*="talalat"], [class*="listing"]') ||
          link.parentElement?.parentElement;
        pushAd(buildAdFromContext(link, row));
      }
    }

    return ads;
  });

  if (!ads.length) {
    const bits = [
      `cím: „${snapshot.title}”`,
      `linkek: ${snapshot.linkCount}`,
      `sorok: ${snapshot.rowCount}`,
      `cim-kontener: ${snapshot.cimCount}`,
    ];
    if (snapshot.zeroHits) bits.push('0 találat az oldalon');
    throw new Error(`Üres találati lista (${bits.join(', ')}) — ellenőrizd a talalatilista URL-t`);
  }

  return ads;
}
