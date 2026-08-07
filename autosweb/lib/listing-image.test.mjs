import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("listing-image: tartós útvonal + resolve", async () => {
  const dir = mkdtempSync(join(tmpdir(), "autosweb-up-"));
  process.env.AUTOSWEB_UPLOADS_PATH = join(dir, "listings");
  const mod = await import(`./listing-image.mjs?t=${Date.now()}`);
  assert.equal(mod.listingImagePublicPath("123.jpg"), "/uploads/listings/123.jpg");
  const uploadDir = mod.listingImageDir();
  assert.ok(existsSync(uploadDir));
  writeFileSync(join(uploadDir, "abc.jpg"), Buffer.alloc(600, 1));
  assert.equal(mod.resolveListingImageFile("/uploads/listings/abc.jpg"), join(uploadDir, "abc.jpg"));
  assert.equal(mod.resolveListingImageFile("/uploads/listings/../secret"), null);
  assert.equal(mod.isListingImageMissing("/uploads/listings/abc.jpg"), false);
  assert.equal(mod.isListingImageMissing("/uploads/listings/hianyzik.jpg"), true);
  assert.equal(mod.isListingImageMissing(""), true);
  rmSync(dir, { recursive: true, force: true });
  delete process.env.AUTOSWEB_UPLOADS_PATH;
});

test("isListingImageMissing: https URL nem hiányzó", async () => {
  const dir = mkdtempSync(join(tmpdir(), "autosweb-up2-"));
  process.env.AUTOSWEB_UPLOADS_PATH = join(dir, "listings");
  const mod = await import(`./listing-image.mjs?t=${Date.now() + 9}`);
  assert.equal(mod.isListingImageMissing("https://cdn.example/a.jpg"), false);
  assert.equal(mod.isListingImageMissing(""), true);
  rmSync(dir, { recursive: true, force: true });
  delete process.env.AUTOSWEB_UPLOADS_PATH;
});

test("listing-image forrás: ~/.autosweb", () => {
  const src = readFileSync(join(__dirname, "listing-image.mjs"), "utf8");
  assert.match(src, /\.autosweb/);
  assert.match(src, /AUTOSWEB_UPLOADS_PATH/);
  assert.match(src, /resolveListingImageFile/);
});

test("import-listings: alap limit 20, max 80", () => {
  const src = readFileSync(join(__dirname, "import-listings.mjs"), "utf8");
  assert.match(src, /DEFAULT_IMPORT_LIMIT = 20/);
  assert.match(src, /MAX_IMPORT_LIMIT = 80/);
});
