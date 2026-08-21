import assert from "node:assert/strict";
import { cleanTipusText } from "./clean-tipus.mjs";

const cases = [
  ["1,4 Hybrid GL+ KÉSZLETRŐL!!!", "1,4 Hybrid GL+"],
  ["2,2 e-XDI Club 2WD (Automata) KÉSZLETRŐL!", "2,2 e-XDI Club 2WD (Automata)"],
  [
    "2,0 [B4] MHEV Plus Bright AWD Geartronic 27%-os áfás azámlával!",
    "2,0 [B4] MHEV Plus Bright AWD Geartronic",
  ],
  [
    "1,2 T MHEV Edition (Automata) GS Technológiai és Infotainment csomaggal",
    "1,2 T MHEV Edition (Automata) GS",
  ],
  [
    "1,5 T-DGI PHEV Luxury DHT [7 személy] SZENZÁCIÓS ÁRON A CHERY MAXABONÁL! 2.9% THM",
    "1,5 T-DGI PHEV Luxury DHT [7 személy]",
  ],
  [
    "ALFA ROMEO GIULIETTA 1.4 TB Progression EU6 Friss műszaki vizsgával! Euro 6-os. 117 ezer km!",
    "ALFA ROMEO GIULIETTA 1.4 TB Progression EU6",
  ],
  ["A4 2.0 TDI", "A4 2.0 TDI"],
  ["", ""],
];

for (const [input, expected] of cases) {
  const got = cleanTipusText(input);
  assert.equal(got, expected, `\n  in:  ${input}\n  got: ${got}\n  exp: ${expected}`);
  console.log("✓", expected || "(üres)");
}

console.log("\nclean-tipus tesztek OK");
