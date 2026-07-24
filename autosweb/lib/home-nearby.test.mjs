import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  haversineKm,
  findNearestCity,
  filterListingsNearby,
  NEARBY_RADIUS_KM,
} from "../public/js/home-nearby.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("haversineKm: Székesfehérvár – Dabas távolság", () => {
  const km = haversineKm(47.186, 18.413, 47.186, 19.308);
  assert.ok(km > 60 && km < 80);
});

test("findNearestCity: Székesfehérvár közelében", () => {
  const nearest = findNearestCity(47.19, 18.42);
  assert.equal(nearest.name, "Székesfehérvár");
});

test("filterListingsNearby: település alapján szűr", () => {
  const items = [
    {
      preview: {
        location: "Székesfehérvár",
        filter: { telepules: "Székesfehérvár" },
      },
    },
    {
      preview: {
        location: "Debrecen",
        filter: { telepules: "Debrecen" },
      },
    },
  ];
  const filtered = filterListingsNearby(items, 47.19, 18.42, NEARBY_RADIUS_KM);
  assert.equal(filtered.length, 1);
  assert.match(filtered[0].preview.location, /Székesfehérvár/);
});

test("index.html: közelben widget magyar felirattal", () => {
  const html = readFileSync(join(__dirname, "..", "public", "index.html"), "utf8");
  assert.ok(html.includes("home-nearby"));
  assert.ok(html.includes("Új hirdetések a közeledben"));
  assert.ok(html.includes("Helymeghatározás engedélyezése"));
  assert.ok(html.includes("home-nearby-map"));
});
