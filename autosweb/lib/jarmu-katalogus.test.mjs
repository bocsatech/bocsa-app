import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCatalogCsv } from "./jarmu-katalogus.mjs";

test("parseCatalogCsv — Gyartmany/Modell/Tipus fa", () => {
  const csv = [
    "Gyartmany,Modell,Tipus",
    "AUDI,A6,A6 1.8",
    'AUDI,A6,"A6 2.0, Automata"',
    "AUDI,A4,A4 1.9 TDI",
    "BMW,3,320d",
  ].join("\n");

  const { brands, tree, rowCount } = parseCatalogCsv(csv);
  assert.deepEqual(brands, ["AUDI", "BMW"]);
  assert.equal(rowCount, 4);
  assert.deepEqual(tree.AUDI.A6, ["A6 1.8", "A6 2.0, Automata"]);
  assert.deepEqual(tree.AUDI.A4, ["A4 1.9 TDI"]);
  assert.deepEqual(tree.BMW["3"], ["320d"]);
});
