const DEFAULT_PREFIXES = ['70', '20', '30'];

export function normalizePhone(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('06')) digits = `36${digits.slice(2)}`;
  if (digits.startsWith('36')) {
    return `+${digits}`;
  }
  if (/^(20|30|70)\d{7}$/.test(digits)) {
    return `+36${digits}`;
  }
  return null;
}

export function isAllowedMobile(phone, allowedPrefixes = DEFAULT_PREFIXES) {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  const prefixes = allowedPrefixes.map((p) => String(p).replace(/\D/g, ''));
  const pattern = new RegExp(`^\\+36(${prefixes.join('|')})\\d{7}$`);
  return pattern.test(normalized);
}

export function pickAllowedPhone(phones, allowedPrefixes) {
  for (const raw of phones) {
    const n = normalizePhone(raw);
    if (n && isAllowedMobile(n, allowedPrefixes)) {
      return n;
    }
  }
  return null;
}

export async function isDealerDetailPage(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText || '';
    if (/Az eladó további járművei/i.test(text)) return true;
    if (/A cégcsoport több mint \d+ éve a partnerünk/i.test(text)) return true;
    if (/Zárva\s*\|?\s*Nyitás:/i.test(text)) return true;
    if (document.querySelector('img[src*="cegfoto"], img[src*="ceglogo"]')) return true;
    return false;
  });
}

const PHONE_TEXT_RE =
  /(?:\(\+36\)|\+36|06)[\s\-/)]*(20|30|70)[\s\-/]*?\d{3}[\s\-/]*?\d{4}/g;

export async function revealPhones(page) {
  const revealLocator = page.locator('a, button').filter({
    hasText: /telefonszám felfedése/i,
  });

  try {
    const count = await revealLocator.count();
    for (let i = 0; i < count; i += 1) {
      try {
        const el = revealLocator.nth(i);
        if (await el.isVisible({ timeout: 800 })) {
          await el.click({ timeout: 5000 });
          await page.waitForTimeout(700);
        }
      } catch {
        /* try next button */
      }
    }
  } catch {
    /* no reveal buttons */
  }

  return page.evaluate((patternSource) => {
    const found = new Set();
    const re = new RegExp(patternSource, 'g');

    document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
      const v = (a.getAttribute('href') || '').replace(/^tel:/i, '').trim();
      if (v) found.add(v);
    });

    const sellerBlocks = [
      ...document.querySelectorAll(
        '#seller, .seller-info, .elado-adatai, [class*="seller"], [id*="seller"]'
      ),
    ];
    const texts = sellerBlocks.length
      ? sellerBlocks.map((el) => el.innerText || '')
      : [document.body?.innerText || ''];

    for (const text of texts) {
      let m;
      while ((m = re.exec(text)) !== null) {
        found.add(m[0]);
      }
    }

    return [...found];
  }, PHONE_TEXT_RE.source);
}

export async function getPhoneForAd(page, adUrl, allowedPrefixes) {
  await page.goto(adUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(1500);

  if (await isDealerDetailPage(page)) {
    return { ok: false, reason: 'kereskedői hirdetés (adatlap)' };
  }

  const phones = await revealPhones(page);
  const mobile = pickAllowedPhone(phones, allowedPrefixes);

  if (!mobile) {
    const hasAny = phones.length > 0;
    return {
      ok: false,
      reason: hasAny
        ? `nincs engedélyezett mobil (+36 70/20/30): ${phones.join(', ')}`
        : 'telefonszám nem felfedhető',
    };
  }

  return { ok: true, phone: mobile, allFound: phones };
}
