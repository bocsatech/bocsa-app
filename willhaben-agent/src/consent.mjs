export async function dismissConsent(page) {
  const selectors = [
    '#didomi-notice-agree-button',
    '#didomi-popup .didomi-components-button--color',
    'button[data-testid="notice-agree-button"]',
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
      name: /akzeptieren|zustimmen|alle akzeptieren|einverstanden/i,
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
