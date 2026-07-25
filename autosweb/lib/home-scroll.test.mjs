import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

test("index.html: nincs külön grid viewport scroll", () => {
  const html = readFileSync(join(PUBLIC, "index.html"), "utf8");
  assert.ok(html.includes("home-grid-track"));
  assert.doesNotMatch(html, /home-grid-viewport/);
});

test("home.css: főoldal egyetlen görgetés", () => {
  const css = readFileSync(join(PUBLIC, "css", "home.css"), "utf8");
  assert.doesNotMatch(css, /\.home-grid-viewport\s*\{[^}]*max-height/s);
  assert.doesNotMatch(css, /\.home-grid-viewport\s*\{[^}]*overflow-y:\s*auto/s);
});
