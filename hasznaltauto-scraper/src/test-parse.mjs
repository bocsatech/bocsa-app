import { readFileSync } from "fs";
import { join } from "path";
import { parseListingHtml } from "./parse.mjs";

const html = readFileSync(join(process.cwd(), "fixtures", "sample-listing.html"), "utf8");
const result = parseListingHtml(html, {
  url: "https://www.hasznaltauto.hu/szemelyauto/volkswagen/golf/test-12345678",
  phone: "+36 30 123 4567",
});

const checks = [
  ["jarmuTipus", "VOLKSWAGEN GOLF Kombi"],
  ["ar", "4 290 000 Ft"],
  ["evjarat", "2018"],
  ["km", "125 000 km"],
  ["telefonszam", "+36 30 123 4567"],
];

let failed = 0;
for (const [key, expected] of checks) {
  const actual = result[key];
  const ok = actual === expected;
  console.log(`${ok ? "✓" : "✗"} ${key}: ${actual}`);
  if (!ok) failed += 1;
}

if (failed > 0) {
  process.exit(1);
}

console.log("Parser teszt sikeres.");
