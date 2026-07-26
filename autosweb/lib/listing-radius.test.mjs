import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCityIndex,
  filterListingsInRadius,
  listingCityName,
} from "../public/js/listing-radius.js";

const cityIndex = buildCityIndex([
  { city: "Székesfehérvár", lat: 47.186, lon: 18.413 },
  { city: "Miskolc", lat: 48.103, lon: 20.778 },
  { city: "Debrecen", lat: 47.531, lon: 21.627 },
]);

test("listingCityName: település a filterből", () => {
  assert.equal(
    listingCityName({ preview: { filter: { telepules: "Miskolc" }, location: "Miskolc, Borsod" } }),
    "Miskolc"
  );
});

test("filterListingsInRadius: csak a sugáron belüli települések", () => {
  const items = [
    { id: 1, preview: { filter: { telepules: "Székesfehérvár" } } },
    { id: 2, preview: { filter: { telepules: "Debrecen" } } },
  ];
  const filtered = filterListingsInRadius(items, 47.186, 18.413, 30, cityIndex);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 1);
});

test("filterListingsInRadius: nagy sugár több települést is elér", () => {
  const items = [
    { id: 1, preview: { filter: { telepules: "Székesfehérvár" } } },
    { id: 2, preview: { filter: { telepules: "Debrecen" } } },
  ];
  const filtered = filterListingsInRadius(items, 47.186, 18.413, 280, cityIndex);
  assert.equal(filtered.length, 2);
});
