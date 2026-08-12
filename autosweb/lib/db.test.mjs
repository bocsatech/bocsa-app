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

test("formDataToCells: felszereltseg string nem karaktereződik szét", () => {
  const cells = formDataToCells({
    felszereltseg: "digitális klíma, automata",
  });
  const labels = cells.filter((c) => c.field_key?.startsWith("extra:")).map((c) => c.label);
  assert.deepEqual(labels, ["digitális klíma", "automata"]);
});

test("formDataToCells: egyetlen felszereltseg string egy tétel", () => {
  const cells = formDataToCells({ felszereltseg: "tempomat" });
  const labels = cells.filter((c) => c.field_key?.startsWith("extra:")).map((c) => c.label);
  assert.deepEqual(labels, ["tempomat"]);
});

test("cellsToFormData: 1 betűs extra szemét kiszűrése", () => {
  const data = cellsToFormData([
    { field_key: "extra:digitalis_klima", label: "digitális klíma", value: "1" },
    { field_key: "extra:a", label: "a", value: "1" },
    { field_key: "extra:m", label: "m", value: "1" },
  ]);
  assert.deepEqual(data.felszereltseg, ["digitális klíma"]);
});

test("saveListing: sqlite fájlba ment", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "autosweb-db-"));
  process.env.AUTOSWEB_DB_PATH = join(tempDir, "test.db");

  const { saveListing, getListing, dbStats, listListings } = await import(`./db.mjs?t=${Date.now()}`);

  const saved = saveListing(
    {
      hirdetes_cime: "Eladó FORD KUGA (2023)",
      gyartmany: "FORD",
      modell: "KUGA",
      km: "45000",
      forras_url: "https://www.hasznaltauto.hu/szemelyauto/ford/kuga/test-12345678",
    },
    null,
    { status: "mentett" }
  );

  assert.ok(saved.id);
  assert.equal(saved.status, "mentett");
  assert.equal(saved.form.km, "45000");
  assert.ok(saved.cells.some((c) => c.label === "Km. óra állás"));

  const loaded = getListing(saved.id);
  assert.equal(loaded.form.gyartmany, "FORD");

  const stats = dbStats();
  assert.equal(stats.listings, 1);
  assert.equal(stats.mentett, 1);
  assert.ok(stats.cells >= 4);

  const feladott = saveListing({ hirdetes_cime: "Feladott teszt", gyartmany: "BMW" }, null, {
    status: "feladott",
  });
  assert.equal(feladott.status, "feladott");
  assert.equal(listListings({ status: "feladott" }).length, 1);

  const { setListingStatus } = await import(`./db.mjs?t=${Date.now() + 1}`);
  const inactive = setListingStatus(feladott.id, "inaktiv", 1);
  assert.equal(inactive.status, "inaktiv");
  assert.equal(listListings({ status: "feladott" }).length, 0);
  assert.equal(listListings({ excludeInactive: true }).some((r) => r.id === feladott.id), false);
  assert.equal(listListings({ status: "inaktiv" }).length, 1);
  const reactivated = setListingStatus(feladott.id, "feladott", 1);
  assert.equal(reactivated.status, "feladott");
  assert.equal(listListings({ status: "feladott" }).length, 1);

  rmSync(tempDir, { recursive: true, force: true });
  delete process.env.AUTOSWEB_DB_PATH;
});
