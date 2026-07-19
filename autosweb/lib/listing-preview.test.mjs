import test from "node:test";
import assert from "node:assert/strict";
import { buildListingPreview, buildPreviewFromCells } from "./listing-preview.mjs";

test("buildListingPreview összeállítja a hasznaltauto stílusú mezőket", () => {
  const preview = buildListingPreview(
    {
      hirdetes_cime: "Mercedes-Benz C 220 d 4Matic",
      vetelar: "17799000",
      uzemanyag: "Dízel",
      gyartasi_ev: "2019",
      gyartasi_honap: "3",
      hengerurtartalom: "1995",
      teljesitmeny_kw: "143",
      teljesitmeny_le: "194",
      km: "126000",
      leiras: "Garanciális, frissen szervizelt, első tulajdonos autó.",
      telepules: "Budapest",
      megye: "Pest megye",
      sebessegvalto: "Automata",
      felszereltseg: ["bluetooth-os kihangosító", "tempomat", "ESP"],
    },
    { id: 42, status: "mentett", hasznaltauto_hirdetes_id: "23005301" }
  );

  assert.equal(preview.title, "Mercedes-Benz C 220 d 4Matic");
  assert.equal(preview.price.replace(/\u00a0/g, " "), "17 799 000 Ft");
  assert.match(preview.specLine, /Dízel/);
  assert.match(preview.specLine, /2019\/3/);
  assert.match(preview.specLine, /1995 cm³/);
  assert.match(preview.specLine, /143 kW, 194 LE/);
  assert.equal(preview.km.replace(/\u00a0/g, " "), "126 000 km");
  assert.match(preview.leiras, /Garanciális/);
  assert.equal(preview.hirdeteskod, "23005301");
  assert.match(preview.location, /Budapest/);
  assert.ok(preview.badges.includes("AUTOMATA"));
  assert.ok(preview.badges.includes("BLUETOOTH"));
  assert.equal(preview.status, "mentett");
});

test("buildPreviewFromCells cellákból épít előnézetet", () => {
  const preview = buildPreviewFromCells(
    [
      { field_key: "gyartmany", label: "Gyártmány", value: "FORD", step: 1 },
      { field_key: "modell", label: "Modell", value: "KUGA", step: 1 },
      { field_key: "vetelar", label: "Vételár", value: "10999000", step: 2 },
      { field_key: "uzemanyag", label: "Üzemanyag", value: "Hibrid", step: 3 },
    ],
    { id: 7, status: "feladott" }
  );

  assert.equal(preview.title, "FORD KUGA");
  assert.equal(preview.price.replace(/\u00a0/g, " "), "10 999 000 Ft");
  assert.equal(preview.status, "feladott");
});
