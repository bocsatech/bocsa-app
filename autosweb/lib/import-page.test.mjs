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
  assert.ok(partial.includes("Egyéb modell"));
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

test("index.html: főoldal feladott hirdetésekkel", () => {
  const html = readFileSync(join(PUBLIC, "index.html"), "utf8");
  assert.ok(html.includes("home-grid"));
  assert.ok(html.includes("home-search"));
  assert.ok(html.includes('data-home-side="left"'));
  assert.ok(html.includes('data-home-side="right"'));
});

test("listings.html: hirdetések oldal", () => {
  const html = readFileSync(join(PUBLIC, "listings.html"), "utf8");
  assert.ok(html.includes("ha-card-feed"));
  assert.ok(html.includes("listings-detail"));
  assert.ok(html.includes('data-listings-filter="mentett"'));
  assert.ok(html.includes('href="/listings.html"'));
});
