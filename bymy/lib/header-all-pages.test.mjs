import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

/** Autó / eszköz oldalak: teljes fejléc (auth + tool ikonok). */
const TOOL_PAGES = [
  "auto.html",
  "fugveny.html",
  "listings.html",
  "import.html",
  "hirdetesfeladas.html",
  "belepes.html",
  "regisztracio.html",
];

test("autó/eszköz oldalak: fejléc Belépés → Regisztráció → Hirdetésfeladás + ikonok", () => {
  for (const page of TOOL_PAGES) {
    const html = readFileSync(join(PUBLIC, page), "utf8");
    assert.ok(html.includes("site-header-auth-row"), `${page}: auth-row`);
    assert.ok(html.includes('class="site-header-tools"'), `${page}: tools`);
    const login = html.indexOf("data-auth-login");
    const register = html.indexOf("data-auth-register");
    const postAd = html.indexOf("data-auth-guard");
    const tools = html.indexOf('class="site-header-tools"');
    assert.ok(login > 0 && register > login, `${page}: Belépés → Regisztráció`);
    assert.ok(postAd > register, `${page}: Regisztráció → Hirdetésfeladás`);
    assert.ok(tools > postAd, `${page}: ikonok a gombok után`);
  }
});

test("hub kezdőlap + ingatlan: Ingatlan és Autó & Motor elérhető", () => {
  const index = readFileSync(join(PUBLIC, "index.html"), "utf8");
  assert.match(index, /ingatlan\.html/);
  assert.match(index, /auto\.html/);
  assert.match(index, /hub-card--ingatlan/);
  assert.match(index, /hub-card--auto/);
  assert.ok(index.includes("data-auth-login"));
  assert.ok(index.includes("data-auth-register"));
  assert.ok(index.includes("data-auth-guard"));

  const immo = readFileSync(join(PUBLIC, "ingatlan.html"), "utf8");
  assert.match(immo, /Ingatlan/);
  assert.match(immo, /auto\.html/);
  assert.ok(immo.includes("data-auth-login"));
});
