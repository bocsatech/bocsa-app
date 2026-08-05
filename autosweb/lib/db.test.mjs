import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { formDataToCells, cellsToFormData } from "./form-field-catalog.mjs";

test("formDataToCells: csak kitöltött mezők és extrák", () => {
  const cells = formDataToCells({
    gyartmany: "FORD",
    km: "45000",
    leiras: "Szép autó.",
    felszereltseg: ["tempomat", "könnyűfém felni"],
  });

  assert.ok(cells.some((c) => c.field_key === "km" && c.label === "Km. óra állás"));
  assert.ok(cells.some((c) => c.field_key === "gyartmany" && c.label === "Gyártmány"));
  assert.ok(cells.some((c) => c.label === "tempomat" && c.value === "1"));
  assert.equal(cells.some((c) => c.label.includes("Segítség")), false);
});

test("cellsToFormData: visszaállítás", () => {
  const cells = formDataToCells({
    modell: "KUGA",
    felszereltseg: ["bluetooth-os kihangosító"],
  });
  const data = cellsToFormData(cells);
  assert.equal(data.modell, "KUGA");
  assert.deepEqual(data.felszereltseg, ["bluetooth-os kihangosító"]);
});

test("saveListing: sqlite fájlba ment", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "autosweb-db-"));
  process.env.AUTOSWEB_DB_PATH = join(tempDir, "test.db");

  const {
    saveListing,
    getListing,
    dbStats,
    listListings,
    listingSourceExists,
    findListingByHasznaltautoId,
    listListingsWithPreview,
  } = await import(`./db.mjs?t=${Date.now()}`);

  const saved = saveListing(
    {
      hirdetes_cime: "Eladó FORD KUGA (2023)",
      gyartmany: "FORD",
      modell: "KUGA",
      km: "45000",
      forras_url: "https://www.hasznaltauto.hu/szemelyauto/ford/kuga/test-12345678",
      hasznaltauto_hirdetes_id: "12345678",
      fo_kep: "/uploads/listings/12345678.jpg",
    },
    null,
    { status: "mentett" }
  );

  assert.ok(saved.id);
  assert.equal(saved.status, "mentett");
  assert.equal(saved.form.km, "45000");
  assert.equal(saved.fo_kep, "/uploads/listings/12345678.jpg");
  assert.ok(saved.cells.some((c) => c.label === "Km. óra állás"));

  const loaded = getListing(saved.id);
  assert.equal(loaded.form.gyartmany, "FORD");
  assert.equal(loaded.fo_kep, "/uploads/listings/12345678.jpg");

  assert.equal(
    listingSourceExists({
      sourceUrl: "https://www.hasznaltauto.hu/szemelyauto/ford/kuga/test-12345678",
    }),
    true
  );
  assert.equal(listingSourceExists({ hasznaltautoId: "12345678" }), true);
  assert.equal(listingSourceExists({ sourceUrl: "https://other.example/x" }), false);
  assert.ok(findListingByHasznaltautoId("12345678"));

  const withPreview = listListingsWithPreview({ limit: 10 });
  assert.equal(withPreview[0].preview.imageUrl, "/uploads/listings/12345678.jpg");

  const stats = dbStats();
  assert.equal(stats.listings, 1);
  assert.equal(stats.mentett, 1);
  assert.ok(stats.cells >= 4);

  const feladott = saveListing({ hirdetes_cime: "Feladott teszt", gyartmany: "BMW" }, null, {
    status: "feladott",
  });
  assert.equal(feladott.status, "feladott");
  assert.equal(listListings({ status: "feladott" }).length, 1);

  rmSync(tempDir, { recursive: true, force: true });
  delete process.env.AUTOSWEB_DB_PATH;
});
