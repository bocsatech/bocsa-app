import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

test("ad-form partial: nincs dupla form tag", () => {
  const partial = readFileSync(join(PUBLIC, "partials", "ad-form.html"), "utf8");
  assert.ok(!partial.includes("<form"), "partial ne tartalmazzon form taget");
  assert.ok(partial.includes('data-step="1"'));
  assert.ok(partial.includes("equipment-sections"));
});

test("import.html és hirdetesfeladas.html: AD_FORM placeholder", () => {
  for (const file of ["import.html", "hirdetesfeladas.html"]) {
    const html = readFileSync(join(PUBLIC, file), "utf8");
    assert.ok(html.includes("<!-- AD_FORM -->"), `${file} placeholder`);
    assert.ok(html.includes('id="ad-form"'));
  }
});

test("serveHtml inject: placeholder helyettesítés", () => {
  const template = readFileSync(join(PUBLIC, "import.html"), "utf8");
  const partial = readFileSync(join(PUBLIC, "partials", "ad-form.html"), "utf8");
  const merged = template.replace("<!-- AD_FORM -->", partial);
  assert.ok(merged.includes("Gyártási év"));
  assert.ok(merged.includes("Km. óra állás"));
  assert.ok(merged.includes("equipment-sections"));
  assert.equal((merged.match(/<form/g) ?? []).length, 1);
});
