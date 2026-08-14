import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("home-app.js: partner ajánló külön init scriptben", () => {
  const homeApp = readFileSync(join(__dirname, "..", "public", "js", "home-app.js"), "utf8");
  assert.ok(!homeApp.includes("initPartnerRecommendations"));
  const autoHtml = readFileSync(join(__dirname, "..", "public", "auto.html"), "utf8");
  assert.ok(autoHtml.includes("partner-recommendations-init.js"));
});

test("partner-categories: mobil katalógussal egyező lista + képek", () => {
  const cats = readFileSync(join(__dirname, "..", "lib", "partner-categories.mjs"), "utf8");
  assert.ok(cats.includes("autoatvizsgalas"));
  assert.ok(cats.includes("ajanlas-atiras"));
  const index = readFileSync(join(__dirname, "..", "public", "index.html"), "utf8");
  assert.ok(index.includes("/ajanlasok.html"));
  assert.ok(index.includes("/images/ajanlas/ajanlas-szerelo.png"));
  const ajanlasPage = readFileSync(join(__dirname, "..", "public", "ajanlasok.html"), "utf8");
  assert.ok(ajanlasPage.includes("ajanlasok-app.js"));
});

test("partner-recommendations.js: böngészőben elérhető kategória import", () => {
  const js = readFileSync(
    join(__dirname, "..", "public", "js", "partner-recommendations.js"),
    "utf8"
  );
  assert.ok(js.includes("./partner-categories-data.js"));
  assert.ok(js.includes("home-partner-accordion"));
  assert.ok(js.includes("home-partner-collapse-all"));
  assert.ok(js.includes("bindPartnerAccordion"));
  assert.ok(js.includes("setWidgetExpanded"));
  assert.ok(js.includes("collapseWidget"));
});

test("getPartnerRecommendations: 8000 környékén van találat demo adattal", async () => {
  process.env.BYMY_DB_PATH = join(__dirname, "..", "data", "bymy.db");
  const { getPartnerRecommendations, partnerStats } = await import("./partners.mjs");
  const stats = partnerStats();
  if (stats.activePaid === 0) {
    const { seedDemoPartnersIfEmpty } = await import("../scripts/seed-partners.mjs");
    seedDemoPartnersIfEmpty();
  }
  const result = getPartnerRecommendations("8000");
  assert.equal(result.postal_code, "8000");
  assert.equal(result.city, "Székesfehérvár");
  const withPartners = result.categories.filter((c) => c.partners.length > 0);
  assert.ok(withPartners.length > 0, "legalább egy kategóriában legyen partner");
});
