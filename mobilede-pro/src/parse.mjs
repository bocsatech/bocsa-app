import { dismissConsent } from './consent.mjs';

export function normalizeListUrl(url) {
  return url.trim().replace(/\/$/, '');
}

export function validateWatchUrl(url) {
  const u = url.trim();
  if (!u) return { ok: false, reason: 'üres URL' };
  if (!/mobile\.de/i.test(u)) {
    return { ok: false, reason: 'nem mobile.de link' };
  }
  if (!/search\.html|fahrzeuge\/search/i.test(u)) {
    return {
      ok: false,
      reason: 'keresés URL kell (search.html) — nem egy autó részletező link',
    };
  }
  return { ok: true };
}

export function mergeSeenIds(seenIds, currentIds) {
  const set = new Set(seenIds || []);
  for (const id of currentIds || []) set.add(id);
  return [...set];
}

export function findNewAds(ads, markerId, calibrated, seenIds = []) {
  const currentIds = ads.map((a) => a.id);
  if (!ads.length) return { newAds: [], action: 'empty', seenIds, newMarker: markerId };

  if (!calibrated || !markerId) {
    return {
      newAds: [],
      action: 'calibrate',
      newMarker: ads[0].id,
      seenIds: mergeSeenIds([], currentIds),
    };
  }

  const known = new Set(seenIds || []);
  const newAds = ads.filter((a) => !known.has(a.id));

  if (!known.size) {
    return {
      newAds: [],
      action: 'calibrate',
      newMarker: ads[0].id,
      seenIds: mergeSeenIds([], currentIds),
    };
  }

  const grownSeen = mergeSeenIds(seenIds, currentIds);
  const idx = ads.findIndex((a) => a.id === markerId);

  if (idx === -1) {
    if (!newAds.length) {
      return { newAds: [], action: 'none', newMarker: markerId, seenIds: grownSeen };
    }
    return { newAds, action: 'new', newMarker: ads[0].id, seenIds: grownSeen };
  }

  if (idx === 0 && !newAds.length) {
    return { newAds: [], action: 'none', newMarker: markerId, seenIds: grownSeen };
  }

  return {
    newAds: newAds.length ? newAds : ads.slice(0, idx),
    action: newAds.length ? 'new' : 'none',
    newMarker: newAds.length ? ads[0].id : markerId,
    seenIds: grownSeen,
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

function extractAdIdFromHref(href) {
  if (!href) return '';
  const idParam = href.match(/[?&]id=(\d+)/i)?.[1];
  if (idParam) return idParam;
  const pathId = href.match(/\/(\d{6,})(?:[/?#]|$)/)?.[1];
  return pathId || '';
}

export async function fetchListings(page, url) {
  const check = validateWatchUrl(url);
  if (!check.ok) throw new Error(check.reason);

  const listUrl = normalizeListUrl(url);
  await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await dismissConsent(page);

  try {
    await page.waitForSelector(
      'a[href*="details.html"], a[href*="id="], article, [data-testid*="result"]',
      { timeout: 25000 }
    );
  } catch {
    /* diagnostics below */
  }

  await page.waitForTimeout(3000);
  await dismissConsent(page);

  const snapshot = await page.evaluate(() => {
    const title = document.title || '';
    const bodyText = (document.body?.innerText || '').slice(0, 1500);
    const detailLinks = document.querySelectorAll(
      'a[href*="details.html"], a[href*="fahrzeuge/details"], a[href*="id="]'
    ).length;
    const blocked = /akamai|access denied|bot|captcha|privacy/i.test(bodyText + title);
    return { title, detailLinks, blocked, path: location.pathname };
  });

  if (snapshot.blocked) {
    throw new Error(
      'mobile.de védelem / captcha — futtasd Macen látható Chrome-ban, npm run login ha kell'
    );
  }

  const ads = await page.evaluate(() => {
    function rowLooksDealer(row) {
      if (!row) return false;
      const text = row.innerText || '';
      return (
        /\bHändler\b/i.test(text) ||
        /\bDealer\b/i.test(text) ||
        /\bGewerblich\b/i.test(text) ||
        !!row.querySelector('[data-testid*="dealer"], [class*="dealer"], img[alt*="Händler"]')
      );
    }

    function buildAd(link, row) {
      if (!link) return null;
      const href = link.getAttribute('href') || '';
      if (!href || !/mobile\.de/i.test(href)) return null;
      if (!/details|id=/i.test(href)) return null;

      const fullUrl = href.startsWith('http')
        ? href
        : `https://www.mobile.de${href.startsWith('/') ? '' : '/'}${href}`;

      const idFromUrl = (() => {
        const m1 = href.match(/[?&]id=(\d+)/i);
        if (m1) return m1[1];
        const m2 = href.match(/\/(\d{6,})(?:[/?#]|$)/);
        return m2 ? m2[1] : '';
      })();
      const id = String(
        link.getAttribute('data-ad-id') ||
          link.closest('[data-ad-id]')?.getAttribute('data-ad-id') ||
          idFromUrl ||
          ''
      ).trim();
      if (!id) return null;

      const title = (
        link.getAttribute('title') ||
        link.textContent ||
        row?.querySelector('h2, h3, [class*="title"]')?.textContent ||
        ''
      )
        .replace(/\s+/g, ' ')
        .trim();
      if (!title || title.length < 3) return null;

      const price = (
        row?.querySelector('[class*="price"], [data-testid*="price"]')?.textContent || ''
      )
        .replace(/\s+/g, ' ')
        .trim();

      const location = (
        row?.querySelector('[class*="location"], [class*="ort"], [data-testid*="location"]')
          ?.textContent || ''
      )
        .replace(/\s+/g, ' ')
        .trim();

      return {
        id,
        title,
        price,
        location,
        url: fullUrl.split('#')[0],
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
      ...document.querySelectorAll(
        'article, li[data-ad-id], [data-testid*="result-list-item"], [class*="result-item"], [class*="cBox-body"]'
      ),
    ];

    for (const row of rows) {
      const link = row.querySelector(
        'a[href*="details.html"], a[href*="fahrzeuge/details"], a[href*="id="]'
      );
      pushAd(buildAd(link, row));
    }

    if (!ads.length) {
      for (const link of document.querySelectorAll(
        'a[href*="details.html"], a[href*="fahrzeuge/details"], a[href*="id="]'
      )) {
        const row =
          link.closest('article, li, [data-testid*="result"], [class*="result"]') ||
          link.parentElement?.parentElement;
        pushAd(buildAd(link, row));
      }
    }

    return ads;
  });

  if (!ads.length) {
    throw new Error(
      `Üres találati lista mobile.de (linkek: ${snapshot.detailLinks}, cím: „${snapshot.title}”) — FSBO keresés URL?`
    );
  }

  return ads.filter((a) => a.isPrivate !== false);
}
