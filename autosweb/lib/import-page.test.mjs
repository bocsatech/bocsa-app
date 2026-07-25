import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

test("ad-form partial: összes fő mezőcsoport", () => {
  const partial = readFileSync(join(PUBLIC, "partials", "ad-form.html"), "utf8");
  assert.ok(partial.includes("Gyártási év"));
  assert.ok(partial.includes("Km. óra állás"));
  assert.ok(partial.includes("Hitel"));
  assert.ok(partial.includes("Egyéb információk"));
  assert.ok(partial.includes("Beszélt nyelvek"));
  assert.ok(partial.includes("egyeb-info-sections"));
});

test("import.html: beépített teljes űrlap", () => {
  const html = readFileSync(join(PUBLIC, "import.html"), "utf8");
  assert.ok(html.includes('id="gyartasi_ev"'), "gyartasi_ev");
  assert.ok(html.includes('id="km"'), "km");
  assert.ok(html.includes("equipment-sections"), "felszereltség");
  assert.ok(html.includes("Hitel"), "hitel");
  assert.ok(!html.includes("<!-- AD_FORM -->"), "nincs placeholder");
});

test("hirdetesfeladas.html: beépített űrlap", () => {
  const html = readFileSync(join(PUBLIC, "hirdetesfeladas.html"), "utf8");
  assert.ok(html.includes('id="gyartasi_ev"'));
  assert.ok(!html.includes("<!-- AD_FORM -->"));
});

test("index.html: főoldal kereső oldalsávval", () => {
  const html = readFileSync(join(PUBLIC, "index.html"), "utf8");
  assert.ok(html.includes("home-quick-filters"));
  assert.ok(html.includes('data-quick-preset="under10m"'));
  assert.ok(html.includes("home-trust-block"));
  assert.ok(html.includes("home-filter-form"));
  assert.doesNotMatch(html, /home-search-form/);
  assert.doesNotMatch(html, /home-result-count/);
  assert.ok(html.includes("home-filter-fuel-btns"));
  assert.ok(html.includes('data-fuel-quick="benzin"'));
  assert.ok(html.includes('data-site-side="left"'));
  assert.ok(html.includes("Hasznos információ"));
  assert.ok(!html.includes("data-center-content"));
  assert.ok(html.includes("home-grid-track"));
  assert.ok(html.includes("home-ad-strip"));
  assert.ok(html.includes('data-ad-slot="header-left"'));
  assert.ok(html.includes('data-site-page="home"'));
  assert.ok(html.includes("home-nearby"));
  assert.ok(html.includes("home-partner-recommendations"));
  assert.ok(html.includes("home-bottom-extra"));
  assert.ok(html.includes("Új hirdetések a közeledben"));
  assert.ok(html.includes("site-content-bar"));
  assert.ok(html.includes("site-side-edit"));
  assert.match(html, /class="[^"]*site-app[^"]*"/);
  assert.match(html, /site-app\.css/);
});

test("import.html: videó oldalsávok", () => {
  const html = readFileSync(join(PUBLIC, "import.html"), "utf8");
  assert.ok(html.includes('data-site-page="import"'));
  assert.doesNotMatch(html, /SITE_SIDE_LEFT/);
  assert.doesNotMatch(html, /data-site-side="left"/);
  assert.doesNotMatch(html, /site-content-bar/);
  assert.ok(html.includes("import-top-alert"));
  assert.match(html, /class="[^"]*site-app[^"]*"/);
  assert.match(html, /site-app\.css/);
  assert.match(html, /Add el autod\.hu/);
  assert.match(html, /site-app-nav/);
  assert.match(html, /site-app-header/);
  assert.doesNotMatch(html, /theme-automax/);
});

test("partners.html: partner admin oldal", () => {
  const html = readFileSync(join(PUBLIC, "partners.html"), "utf8");
  assert.ok(html.includes('data-site-page="partners"'));
  assert.ok(html.includes("partner-form"));
  assert.ok(html.includes("partners-app.js"));
});

test("listings.html: hirdetések oldal", () => {
  const html = readFileSync(join(PUBLIC, "listings.html"), "utf8");
  assert.ok(html.includes('data-site-page="listings"'));
  assert.ok(html.includes("ha-card-feed"));
  assert.ok(html.includes("listings-detail"));
  assert.ok(html.includes('data-listings-filter="mentett"'));
  assert.ok(html.includes('href="/listings.html"'));
  assert.match(html, /class="[^"]*site-app[^"]*"/);
  assert.match(html, /site-app\.css/);
  assert.doesNotMatch(html, /theme-automax/);
});

test("hirdetesfeladas.html: egységes fejléc és wizard", () => {
  const html = readFileSync(join(PUBLIC, "hirdetesfeladas.html"), "utf8");
  assert.match(html, /class="[^"]*site-app[^"]*"/);
  assert.match(html, /site-app-wizard-steps/);
  assert.match(html, /Add el autod\.hu/);
  assert.doesNotMatch(html, /theme-automax/);
});
