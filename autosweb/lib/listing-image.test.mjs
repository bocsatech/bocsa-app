import test from "node:test";
import assert from "node:assert/strict";
import { listingImagePublicPath, listingImageDir } from "./listing-image.mjs";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("listingImagePublicPath: feltöltés útvonal", () => {
  assert.equal(listingImagePublicPath("123.jpg"), "/uploads/listings/123.jpg");
});

test("listingImageDir: létrehozza a mappát", () => {
  const dir = listingImageDir();
  assert.ok(existsSync(dir));
  assert.match(dir, /uploads[/\\]listings$/);
});

test("import-listings: alap limit 20, max 80", () => {
  const src = readFileSync(join(__dirname, "import-listings.mjs"), "utf8");
  assert.match(src, /DEFAULT_IMPORT_LIMIT = 20/);
  assert.match(src, /MAX_IMPORT_LIMIT = 80/);
  assert.match(src, /autoSave/);
  assert.match(src, /listingSourceExists/);
  assert.match(src, /downloadMainImage/);
});
