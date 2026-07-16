import { chromium } from "playwright";
import { writeFileSync } from "fs";

const pageUrl = process.argv[2] ?? "https://katalogus.hasznaltauto.hu/";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const captured = [];

page.on("response", async (response) => {
  const url = response.url();
  const type = response.headers()["content-type"] ?? "";
  if (!/json|javascript|text\/plain/i.test(type)) return;
  if (!/ajax|api|modell|marka|gyart|tipus|kivitel|katalog|vehicle|auto|szemely/i.test(url)) return;
  try {
    const text = await response.text();
    if (text.length < 20) return;
    captured.push({ url, status: response.status(), preview: text.slice(0, 500) });
    console.log("CAPTURED", url);
  } catch {
    /* ignore */
  }
});

try {
  await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 90000 });
  console.log("TITLE:", await page.title());

  const selects = await page.locator("select").evaluateAll((els) =>
    els.map((el) => ({
      id: el.id,
      name: el.name,
      optionCount: el.options.length,
      sample: [...el.options].slice(0, 8).map((o) => ({ value: o.value, text: o.textContent?.trim() })),
    }))
  );
  console.log("SELECTS:", JSON.stringify(selects, null, 2));

  const firstSelect = page.locator("select").first();
  if (await firstSelect.count()) {
    const options = await firstSelect.locator("option").evaluateAll((els) =>
      els.map((o) => ({ value: o.value, text: o.textContent?.trim() }))
    );
    const aBrands = options.filter((o) => o.text && /^A/i.test(o.text) && o.value);
    console.log("A_BRANDS_COUNT", aBrands.length);
    console.log("A_BRANDS_SAMPLE", JSON.stringify(aBrands.slice(0, 10), null, 2));

    if (aBrands[0]) {
      await firstSelect.selectOption(aBrands[0].value);
      await page.waitForTimeout(2000);
      const selectsAfter = await page.locator("select").evaluateAll((els) =>
        els.map((el) => ({
          id: el.id,
          name: el.name,
          optionCount: el.options.length,
          sample: [...el.options].slice(0, 5).map((o) => o.textContent?.trim()),
        }))
      );
      console.log("AFTER_BRAND:", JSON.stringify(selectsAfter, null, 2));
    }
  }
} catch (error) {
  console.error("ERROR:", error.message);
}

writeFileSync("probe-taxonomy-captured.json", JSON.stringify(captured, null, 2));
console.log("Saved", captured.length, "responses to probe-taxonomy-captured.json");

await browser.close();
