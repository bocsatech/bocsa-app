import { readFileSync } from "fs";
import { join } from "path";
import {
  extractListingLinksFromHtml,
  isListPageUrl,
  isListingUrl,
} from "./links.mjs";

const listUrl = "https://www.hasznaltauto.hu/szemelyauto/tesla";
const listingUrl =
  "https://www.hasznaltauto.hu/szemelyauto/tesla/model_3/tesla_model_3_long_range-11111111";

if (!isListPageUrl(listUrl)) throw new Error("lista URL felismerés hibás");
if (!isListingUrl(listingUrl)) throw new Error("hirdetés URL felismerés hibás");

const html = readFileSync(join(process.cwd(), "fixtures", "sample-list-page.html"), "utf8");
const links = extractListingLinksFromHtml(html, listUrl);

if (links.length !== 2) {
  throw new Error(`2 link várható, kaptunk: ${links.length} → ${links.join(", ")}`);
}

console.log("✓ link kinyerés teszt sikeres");
console.log(links.join("\n"));
