import { formatMessage } from './parse.mjs';

export async function sendMessage(page, ad, template, sendDelayMs) {
  await page.goto(ad.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1500);

  const textarea = page.locator('[data-testid="mailContent-input"]');
  await textarea.waitFor({ state: 'visible', timeout: 20000 });

  const msg = formatMessage(template, ad);
  await textarea.fill(msg);

  const sendBtn = page.locator('[data-testid="ad-request-send-message"]');
  const hasBtn = (await sendBtn.count()) > 0;
  if (hasBtn) {
    await sendBtn.click();
  } else {
    await page.getByRole('button', { name: /nachricht absenden/i }).click();
  }

  await page.waitForTimeout(sendDelayMs);
}
