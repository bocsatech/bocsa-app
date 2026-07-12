export function normalizeListUrl(url) {
  let u = url.trim().replace(/\/$/, '');
  if (!/\/page\d+$/i.test(u)) {
    u += '/page1';
  }
  return u;
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
  const listUrl = normalizeListUrl(url);
  await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2500);

  const title = await page.title();
  if (/cloudflare|attention required|just a moment/i.test(title)) {
    throw new Error('Cloudflare blokkol — futtasd a Macen, ne zárd be a Chrome-ot');
  }

  return page.evaluate(() => {
    const rows = [...document.querySelectorAll('.row.talalati-sor, .talalati-sor')];
    return rows
      .map((row) => {
        const link = row.querySelector('.cim-kontener h3 a, h3 a, .talalatisor-kep a');
        const href = link?.getAttribute('href') || '';
        if (!href) return null;

        const fullUrl = href.startsWith('http')
          ? href
          : `https://www.hasznaltauto.hu${href.startsWith('/') ? '' : '/'}${href}`;

        const idEl = row.querySelector('[data-hirkod]');
        const idFromAttr = idEl?.getAttribute('data-hirkod');
        const idFromUrl = href.match(/-(\d+)\/?(?:\?|$)/)?.[1];
        const id = String(idFromAttr || idFromUrl || '').trim();
        if (!id) return null;

        const isDealer =
          !!row.querySelector('img[src*="cegfoto"], img[src*="ceglogo"]') ||
          /\bKereskedés\b/i.test(row.innerText || '');

        return {
          id,
          title: (link?.textContent || '').trim(),
          price: (
            row.querySelector('.pricefield-primary, .vetelar, .price-fields-desktop')?.textContent ||
            ''
          ).trim(),
          location: (
            row.querySelector('.tavolsag_talalati, .talalatisor-info.tavolsaginfo')?.textContent ||
            ''
          ).trim(),
          url: fullUrl.split('?')[0],
          isPrivate: !isDealer,
        };
      })
      .filter(Boolean);
  });
}
