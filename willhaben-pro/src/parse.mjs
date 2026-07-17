export function extractAdList(data) {
  const pp = data?.props?.pageProps;
  if (!pp) return null;
  const sr = pp.searchResult || pp.initialSearchResult;
  const list = sr?.advertSummaryList?.advertSummary;
  return Array.isArray(list) ? list : null;
}

export function mapAd(ad) {
  const attrs = {};
  for (const a of ad.attributes?.attribute || []) {
    if (a.name && a.values?.[0] != null) attrs[a.name] = a.values[0];
  }
  const seo = attrs.SEO_URL || '';
  const url = seo.startsWith('http')
    ? seo
    : `https://www.willhaben.at/iad/${seo.replace(/^\//, '')}`;
  return {
    id: String(ad.id || attrs.ADID || ''),
    title: attrs.HEADING || ad.description || 'Anzeige',
    price: attrs['PRICE_FOR_DISPLAY'] || attrs.PRICE || '',
    location: attrs.LOCATION || '',
    url,
  };
}

export function parseAdsFromHtml(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]);
    const list = extractAdList(data);
    if (!list) return null;
    return list.map(mapAd).filter((a) => a.id);
  } catch {
    return null;
  }
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
    .replaceAll('{title}', ad.title)
    .replaceAll('{price}', ad.price)
    .replaceAll('{location}', ad.location)
    .replaceAll('{url}', ad.url)
    .replaceAll('{id}', ad.id);
}
