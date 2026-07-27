#!/usr/bin/env node
/** Folytatás-teszt: --from-brand / --from-model ugrás. */
import assert from "node:assert/strict";
import { parseArgs, sliceFromName, optionMatchesName } from "./mentesmarka.mjs";

const brands = ["ABARTH", "ALFA ROMEO", "AUDI", "BMW", "CHRYSLER", "CITROEN", "DACIA"].map(
  (text) => ({ value: text, text })
);

const fromChrysler = sliceFromName(brands, "Chrysler", "Márka");
assert.deepEqual(
  fromChrysler.map((b) => b.text),
  ["CHRYSLER", "CITROEN", "DACIA"]
);

const fromCitroen = sliceFromName(brands, "Citroen", "Márka");
assert.equal(fromCitroen[0].text, "CITROEN");

// Ismeretlen márka → nem hagy ki semmit
assert.equal(sliceFromName(brands, "Nincsilyen", "Márka").length, brands.length);
assert.equal(sliceFromName(brands, null, "Márka").length, brands.length);

// Ékezet és kis/nagybetű mindegy
assert.ok(optionMatchesName("SKODA", "skoda"));
assert.ok(optionMatchesName("ALFA ROMEO", "alfa"));
assert.ok(!optionMatchesName("AUDI", "bmw"));

const models = ["C1", "C3", "C4", "C5", "GRAND C4"].map((text) => ({ value: text, text }));
assert.deepEqual(
  sliceFromName(models, "C4", "Modell").map((m) => m.text),
  ["C4", "C5", "GRAND C4"]
);

// --from-brand nem törölheti a meglévő mentést
const options = parseArgs(["--connect", "--fresh", "--from-brand", "Citroen"]);
assert.equal(options.fromBrand, "Citroen");
assert.equal(options.fresh, false);

const plain = parseArgs(["--connect", "--fresh"]);
assert.equal(plain.fresh, true);
assert.equal(plain.fromBrand, null);

console.log("✓ from-brand / from-model teszt OK");
