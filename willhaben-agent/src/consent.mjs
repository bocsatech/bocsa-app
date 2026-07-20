export async function dismissConsent(page) {
  for (const sel of [
    '#didomi-notice-agree-button',
    'button[data-testid="notice-agree-button"]',
  ]) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 800 })) {
        await btn.click({ timeout: 3000 });
        await page.waitForTimeout(500);
        return true;
      }
    } catch {
      /* next */
    }
  }
  try {
    const agree = page.getByRole('button', { name: /akzeptieren|zustimmen/i });
    if (await agree.first().isVisible({ timeout: 800 })) {
      await agree.first().click({ timeout: 3000 });
      return true;
    }
  } catch {
    /* none */
  }
  return false;
}
