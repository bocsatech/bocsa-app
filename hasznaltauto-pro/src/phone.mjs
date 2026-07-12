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

export async function revealPhones(page) {
  const buttons = [
    page.getByRole('button', { name: /elsődleges telefonszám felfedése/i }),
    page.getByRole('button', { name: /másodlagos telefonszám felfedése/i }),
    page.getByRole('link', { name: /telefonszám felfedése/i }),
    page.locator('a, button').filter({ hasText: /telefonszám felfedése/i }),
  ];

  for (const locator of buttons) {
    try {
      const el = locator.first();
      if (await el.isVisible({ timeout: 1200 })) {
        await el.click({ timeout: 5000 });
        await page.waitForTimeout(900);
      }
    } catch {
      /* try next */
    }
  }

  return page.evaluate(() => {
    const found = new Set();

    document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
      const v = (a.getAttribute('href') || '').replace(/^tel:/i, '').trim();
      if (v) found.add(v);
    });

    const text = document.body?.innerText || '';
    const re = /(?:\+36|06)[\s\-/]*?(20|30|70)[\s\-/]*?\d{3}[\s\-/]*?\d{4}/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      found.add(m[0]);
    }

    return [...found];
  });
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
