import assert from "assert";
import {
  parseListingCard,
  splitTitle,
  parseSpecsFromText,
  fixAudiModellTipus,
} from "./parse.mjs";

const title =
  "AUDI A1 Sportback 1.6 TDI DPF Ambition S-tronic MAGYARORSZÁGI - 1. TULAJTÓL - FÉNYEZÉSMENTES - ÜLÉSFŰTÉS - 3 ÉV GARANCIA";
const text =
  "2 970 000 Ft GARANCIÁLIS ALUFELNI Dízel, 2014/1, 1 598 cm³, 66 kW, 90 LE, 163 517 km Audi A1 Sportback (Hirdetéskód: 23288177)";

const split = splitTitle(title);
assert.equal(split.gyartmany, "Audi");
assert.match(split.modell.toLowerCase(), /a1.*sportback/);
assert.match(split.tipus, /1,6 TDI DPF Ambition/i);

const a6 = splitTitle("AUDI A6 40 TDI Design S-tronic Magyar! ÁFA-s! Bőrbelső!");
assert.equal(a6.gyartmany, "Audi");
assert.equal(a6.modell, "A6");
assert.match(a6.tipus, /^40 TDI Design/i);

const a6q = splitTitle("AUDI A6 50 TDI Design quattro Tiptronic ic ÁFA-s!");
assert.equal(a6q.modell, "A6");
assert.match(a6q.tipus, /^50 TDI Design/i);

const fixed = fixAudiModellTipus({
  Gyartmany: "Audi",
  Modell: "A6 40",
  Tipus: "TDI Design S- Tronic Magyar! ÁFA-s!",
});
assert.equal(fixed.Modell, "A6");
assert.match(fixed.Tipus, /^40 TDI Design/i);

const specs = parseSpecsFromText(text);
assert.equal(specs.uzemanyag, "Diesel");
assert.equal(specs.gyartasi_ev, "2014/1");
assert.equal(specs.hengerurtartalom, "1598");
assert.equal(specs.teljesitmeny_kw, "66");
assert.equal(specs.teljesitmeny_le, "90");
assert.equal(specs.kmora_allas, "163517");

const row = parseListingCard({
  url: "https://www.hasznaltauto.hu/szemelyauto/audi/a1/x-23288177",
  title,
  text,
});
assert.equal(row.Vetelar, "2970000 Ft");
assert.equal(row.Teljesitmeny_kW, "66 KW");
assert.equal(row.Teljesitmeny_LE, "90 LE");
assert.equal(row.Hirdeteskod, undefined);
assert.equal(row.Url, undefined);

console.log("test:parse OK");
console.log(a6);
console.log(fixed);
