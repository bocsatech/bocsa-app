function collectAttributeText(attrs) {
  const parts = [];
  const list = Array.isArray(attrs) ? attrs : [];
  for (const a of list) {
    if (a?.values?.length) {
      for (const v of a.values) parts.push(String(v));
    } else if (a?.value != null) {
      parts.push(String(a.value));
    }
  }
  return parts;
}

function findAdvertNode(pp) {
  return (
    pp?.advertDetails ||
    pp?.advertDetail ||
    pp?.advert ||
    pp?.adDetail ||
    pp?.initialAdvertDetails ||
    null
  );
}

export function parseAdDetailFromHtml(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return '';
  try {
    const data = JSON.parse(m[1]);
    const pp = data?.props?.pageProps;
    const ad = findAdvertNode(pp);
    if (!ad) return '';

    const parts = [];
    if (ad.heading) parts.push(String(ad.heading));
    if (ad.description) parts.push(String(ad.description));
    if (ad.body) parts.push(String(ad.body));
    if (ad.title) parts.push(String(ad.title));

    const attrSources = [
      ad.attributes?.attribute,
      ad.attribute,
      ad.advertAttributes?.attribute,
      ad.vehicleData?.attributes?.attribute,
    ];
    for (const src of attrSources) {
      parts.push(...collectAttributeText(src));
    }

    return parts.filter(Boolean).join('\n');
  } catch {
    return '';
  }
}

export async function getAdPageText(page, ad) {
  const chunks = [ad?.title || '', ad?.price || '', ad?.location || ''];
  const html = await page.content();
  chunks.push(parseAdDetailFromHtml(html));

  if (chunks.join('').trim().length < 20) {
    const mainText = await page
      .locator('[data-testid="ad-detail"], main, article')
      .first()
      .innerText({ timeout: 5000 })
      .catch(() => '');
    chunks.push(mainText);
  }

  return chunks.filter(Boolean).join('\n');
}
