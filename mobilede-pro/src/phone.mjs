const DEFAULT_PREFIXES = ['15', '16', '17'];

export function normalizePhone(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('49')) {
    return `+${digits}`;
  }
  if (digits.startsWith('0')) {
    return `+49${digits.slice(1)}`;
  }
  if (/^(15|16|17)\d{7,10}$/.test(digits)) {
    return `+49${digits}`;
  }
  return null;
}

export function isAllowedMobile(phone, allowedPrefixes = DEFAULT_PREFIXES) {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  const prefixes = allowedPrefixes.map((p) => String(p).replace(/\D/g, ''));
  const pattern = new RegExp(`^\\+49(${prefixes.join('|')})\\d{7,10}$`);
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
    if (/\bHändler\b/i.test(text) && /\bGewerblich\b/i.test(text)) return true;
    if (/\bProfessioneller Händler\b/i.test(text)) return true;
    if (/\bAutohaus\b/i.test(text) && /\bFahrzeuge\b/i.test(text)) return true;
    if (document.querySelector('[data-testid*="dealer"], [class*="dealer-logo"]')) return true;
    return false;
  });
}

const PHONE_TEXT_RE =
  /(?:\+49|0049|0)[\s\-/)]*(15|16|17)[\s\-/]*?\d[\d\s\-/]{6,12}/g;

export async function revealPhones(page) {
  const revealLocator = page.locator('a, button').filter({
    hasText: /nummer anzeigen|telefonnummer|anrufen|phone/i,
  });

  try {
    const count = await revealLocator.count();
    for (let i = 0; i < count; i += 1) {
      try {
        const el = revealLocator.nth(i);
        if (await el.isVisible({ timeout: 800 })) {
          await el.click({ timeout: 5000 });
          await page.waitForTimeout(800);
        }
      } catch {
        /* next */
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
        '[data-testid*="seller"], [class*="seller"], [class*="contact"], [id*="seller"]'
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
  await page.waitForTimeout(2000);

  if (await isDealerDetailPage(page)) {
    return { ok: false, reason: 'Händler / kereskedő (adatlap)' };
  }

  const phones = await revealPhones(page);
  const mobile = pickAllowedPhone(phones, allowedPrefixes);

  if (!mobile) {
    const hasAny = phones.length > 0;
    return {
      ok: false,
      reason: hasAny
        ? `nincs engedélyezett DE mobil (+49 15/16/17): ${phones.join(', ')}`
        : 'telefonszám nem elérhető',
    };
  }

  return { ok: true, phone: mobile, allFound: phones };
}
