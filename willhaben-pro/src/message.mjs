import { formatMessage } from './parse.mjs';
import { dismissConsent } from './consent.mjs';

export class DealerSkipError extends Error {
  constructor(message = 'Händler hirdetés — csak magán eladóknak küldünk üzenetet') {
    super(message);
    this.name = 'DealerSkipError';
    this.code = 'DEALER_SKIP';
  }
}

export function isDealerSkipError(err) {
  return err?.code === 'DEALER_SKIP' || String(err?.message || '').includes('DEALER_SKIP');
}

async function hasLoggedInMessageField(page) {
  return page
    .locator('[data-testid="mailContent-input"]')
    .isVisible({ timeout: 800 })
    .catch(() => false);
}

async function isDealerGuestForm(page) {
  const dealerHeading = await page
    .getByRole('heading', { name: /Händler kontaktieren/i })
    .isVisible({ timeout: 600 })
    .catch(() => false);
  if (dealerHeading) return true;

  const emailAbsenden = await page
    .getByRole('button', { name: /E-Mail absenden/i })
    .isVisible({ timeout: 600 })
    .catch(() => false);
  if (emailAbsenden && !(await hasLoggedInMessageField(page))) return true;

  const guestName = await page
    .locator('input[name*="name" i], input[placeholder*="Name" i]')
    .first()
    .isVisible({ timeout: 400 })
    .catch(() => false);
  if (guestName && !(await hasLoggedInMessageField(page))) {
    const guestEmail = await page
      .locator('input[type="email"], input[name*="mail" i]')
      .first()
      .isVisible({ timeout: 400 })
      .catch(() => false);
    if (guestEmail) return true;
  }

  return false;
}

async function assertNotDealerForm(page) {
  if (await isDealerGuestForm(page)) {
    throw new DealerSkipError();
  }
}

async function openMessageForm(page) {
  const textarea = page.locator('[data-testid="mailContent-input"]');
  if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
    return textarea;
  }

  await assertNotDealerForm(page);

  // Csak bejelentkezett felhasználó „Nachricht senden” gombja — NEM „Händler kontaktieren” / kontakt
  const openers = [
    page.getByRole('button', { name: /^nachricht senden$/i }),
    page.getByRole('button', { name: /^anfrage senden$/i }),
    page.locator('[data-testid="send-message-button"]'),
  ];

  for (const opener of openers) {
    try {
      if ((await opener.count()) === 0) continue;
      if (!(await opener.first().isVisible({ timeout: 1200 }))) continue;
      await opener.first().click({ timeout: 5000 });
      await page.waitForTimeout(600);
      await assertNotDealerForm(page);
      if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
        return textarea;
      }
    } catch (err) {
      if (isDealerSkipError(err)) throw err;
    }
  }

  await assertNotDealerForm(page);

  if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
    return textarea;
  }

  throw new Error(
    'Nincs bejelentkezett üzenetmező — futtasd: npm run login (orchestrator: 🔑 Bejelentkezés)'
  );
}

export async function sendMessage(page, ad, template, sendDelayMs) {
  if (ad.isDealer) {
    throw new DealerSkipError();
  }

  await page.goto(ad.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissConsent(page);
  await page.waitForTimeout(1000);

  await assertNotDealerForm(page);

  let textarea;
  try {
    textarea = await openMessageForm(page);
  } catch (err) {
    if (isDealerSkipError(err)) throw err;
    await dismissConsent(page);
    try {
      textarea = await openMessageForm(page);
    } catch (err2) {
      if (isDealerSkipError(err2)) throw err2;
      await assertNotDealerForm(page);
      throw new Error(
        'Nincs bejelentkezett üzenetmező — futtasd: npm run login (orchestrator: 🔑 Bejelentkezés)'
      );
    }
  }

  if (!(await textarea.isVisible({ timeout: 2000 }).catch(() => false))) {
    await assertNotDealerForm(page);
    throw new Error(
      'Nincs bejelentkezett üzenetmező — futtasd: npm run login (orchestrator: 🔑 Bejelentkezés)'
    );
  }

  const msg = formatMessage(template, ad);
  await textarea.fill(msg);
  await dismissConsent(page);

  const sendBtn = page.locator('[data-testid="ad-request-send-message"]');
  if ((await sendBtn.count()) > 0) {
    await sendBtn.click({ timeout: 10000 });
  } else {
    const loggedInSend = page.getByRole('button', { name: /nachricht absenden/i });
    if ((await loggedInSend.count()) > 0) {
      await loggedInSend.click({ timeout: 10000 });
    } else {
      await assertNotDealerForm(page);
      throw new DealerSkipError();
    }
  }

  await page.waitForTimeout(sendDelayMs);
}
