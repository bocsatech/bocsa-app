import test from "node:test";
import assert from "node:assert/strict";
import { parseListingCard } from "./parse-listing.mjs";
import { mapListingToForm } from "./map-to-form.mjs";

test("lista kártya összefoglaló → kötelező mezők", () => {
  const card = parseListingCard({
    url: "https://www.hasznaltauto.hu/szemelyauto/ford/kuga/test-99999999",
    title: "FORD KUGA 2.5 PHEV ST-Line",
    text: "10 999 000 Ft Hibrid (Benzin), 2023/7, 2 488 cm³, 112 kW, 152 LE, 50 km",
  });
  const form = mapListingToForm({
    url: card.url,
    cim: card.cim,
    ar: card.ar,
    km: card.km,
    evjarat: card.evjarat,
    nyersAdatok: card.nyersAdatok,
  });

  assert.equal(form.gyartmany, "FORD");
  assert.equal(form.modell, "KUGA");
  assert.equal(form.uzemanyag, "Benzin/elektromos");
  assert.equal(form.gyartasi_ev, "2023");
  assert.equal(form.gyartasi_honap, "7");
  assert.equal(form.allapot, "Normál");
  assert.equal(form.okmany_ervenyesseg, "Érvényes");
});
