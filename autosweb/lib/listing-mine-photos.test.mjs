import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const tempDir = mkdtempSync(join(tmpdir(), "autosweb-mine-"));
process.env.AUTOSWEB_DATA_DIR = tempDir;

const { initAuthSchema, registerUser } = await import("./auth-users.mjs");
const { saveListing, listListingsWithPreview, getListing } = await import(`./db.mjs?t=${Date.now()}`);
const { saveListingPhotos, listingPhotosDir } = await import(`./listing-photos.mjs?t=${Date.now()}`);

// Minimális érvényes JPEG (1×1, FF D8 … FF D9)
const TINY_JPEG_B64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

test("feladott hirdetés: fotó + user_id → mine lista + fo_kep", () => {
  initAuthSchema();
  const reg = registerUser({
    email: "elado@pelda.hu",
    password: "titok12",
    password_confirm: "titok12",
  });
  assert.ok(reg.user?.id);

  const saved = saveListing(
    {
      hirdetes_cime: "ABARTH 600E (2014)",
      gyartmany: "ABARTH",
      modell: "600E",
      gyartasi_ev: "2014",
      km: "85238",
      vetelar: "1356241",
      uzemanyag: "Benzin",
    },
    null,
    { status: "feladott", userId: reg.user.id }
  );
  assert.equal(saved.user_id, reg.user.id);

  const withPhoto = saveListingPhotos(saved.id, [TINY_JPEG_B64]);
  assert.equal(withPhoto.form.fo_kep, `/uploads/listings/${saved.id}/01.jpg`);
  assert.ok(existsSync(join(listingPhotosDir(), String(saved.id), "01.jpg")));

  // Fotó mentés után a user_id megmarad
  assert.equal(getListing(saved.id).user_id, reg.user.id);

  const mine = listListingsWithPreview({ userId: reg.user.id });
  assert.equal(mine.length, 1);
  assert.equal(mine[0].fo_kep, `/uploads/listings/${saved.id}/01.jpg`);
  assert.equal(mine[0].preview.imageUrl, `/uploads/listings/${saved.id}/01.jpg`);
  assert.ok(mine[0].preview.imageUrls?.includes(`/uploads/listings/${saved.id}/01.jpg`));

  const detail = getListing(saved.id);
  assert.equal(detail.fo_kep, `/uploads/listings/${saved.id}/01.jpg`);
  assert.equal(detail.user_id, reg.user.id);

  assert.equal(listListingsWithPreview({ userId: 999999 }).length, 0);

  rmSync(tempDir, { recursive: true, force: true });
  delete process.env.AUTOSWEB_DATA_DIR;
});
