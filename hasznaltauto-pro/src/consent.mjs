export async function dismissConsent(page) {
  const selectors = [
    '#didomi-notice-agree-button',
    'button.didomi-components-button--color',
    '#onetrust-accept-btn-handler',
    '.fc-cta-consent',
  ];

  for (const sel of selectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1200 })) {
        await btn.click({ timeout: 3000 });
        await page.waitForTimeout(600);
        return true;
      }
    } catch {
      /* next */
    }
  }

  try {
    const agree = page.getByRole('button', {
      name: /elfogad|összes elfogad|hozzájárul|rendben|accept/i,
    });
    if (await agree.first().isVisible({ timeout: 1000 })) {
      await agree.first().click({ timeout: 3000 });
      await page.waitForTimeout(600);
      return true;
    }
  } catch {
    /* no banner */
  }

  return false;
}

export function setupConsentHandler(page) {
  try {
    page.addLocatorHandler(page.locator('#didomi-notice-agree-button'), async (btn) => {
      await btn.click();
    });
  } catch {
    /* older playwright */
  }
}
