import test from "node:test";
import assert from "node:assert/strict";
import { parseCsvText, buildVehicleCatalog } from "./vehicle-catalog.mjs";

test("buildVehicleCatalog: gyártmány és modell a CSV-ből", () => {
  const rows = parseCsvText(`Gyartmany,Modell,Tipus
Audi,A4,2.0 TDI
Audi,A6,40 TDI
BMW,320,d
BMW,320,320d
`);
  const catalog = buildVehicleCatalog(rows, "test.csv");
  assert.deepEqual(catalog.gyartmanyok, ["AUDI", "BMW"]);
  assert.deepEqual(catalog.modellek.AUDI, ["A4", "A6"]);
  assert.deepEqual(catalog.modellek.BMW, ["320"]);
  assert.deepEqual(catalog.tipusok["AUDI|A4"], ["2.0 TDI"]);
});

test("parseCsvText: pontosvesszővel is", () => {
  const rows = parseCsvText("Gyártmány;Modell\nFord;Kuga\n");
  assert.equal(rows[0].gyartmany, "Ford");
  assert.equal(rows[0].modell, "Kuga");
});
