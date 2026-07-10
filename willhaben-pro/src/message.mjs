import { formatMessage } from './parse.mjs';
import { dismissConsent } from './consent.mjs';

async function openMessageForm(page) {
  const textarea = page.locator('[data-testid="mailContent-input"]');
  if (await textarea.isVisible().catch(() => false)) return textarea;

  const openers = [
    page.getByRole('button', { name: /nachricht senden|anfrage senden|kontakt/i }),
    page.locator('[data-testid="contact-seller"]'),
    page.locator('a[href*="nachricht"]'),
  ];

  for (const opener of openers) {
    try {
      if ((await opener.count()) > 0 && (await opener.first().isVisible({ timeout: 1500 }))) {
        await opener.first().click({ timeout: 5000 });
        await page.waitForTimeout(800);
        if (await textarea.isVisible({ timeout: 5000 }).catch(() => false)) {
          return textarea;
        }
      }
    } catch {
      /* try next */
    }
  }

  await textarea.waitFor({ state: 'visible', timeout: 15000 });
  return textarea;
}

export async function sendMessage(page, ad, template, sendDelayMs) {
  await page.goto(ad.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissConsent(page);
  await page.waitForTimeout(1200);

  let textarea;
  try {
    textarea = await openMessageForm(page);
  } catch {
    await dismissConsent(page);
    try {
      textarea = await openMessageForm(page);
    } catch {
      throw new Error(
        'Nincs üzenetmező — valószínűleg nincs bejelentkezve. Futtasd: npm run login'
      );
    }
  }

  const msg = formatMessage(template, ad);
  await textarea.fill(msg);
  await dismissConsent(page);

  const sendBtn = page.locator('[data-testid="ad-request-send-message"]');
  if ((await sendBtn.count()) > 0) {
    await sendBtn.click({ timeout: 15000 });
  } else {
    await page.getByRole('button', { name: /nachricht absenden/i }).click({ timeout: 15000 });
  }

  await page.waitForTimeout(sendDelayMs);
}
