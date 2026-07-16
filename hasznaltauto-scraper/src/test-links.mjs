import { readFileSync } from "fs";
import { join } from "path";
import {
  extractListingLinksFromHtml,
  extractSubListLinksFromHtml,
  isListPageUrl,
  isListingUrl,
} from "./links.mjs";

const listUrl = "https://www.hasznaltauto.hu/szemelyauto/tesla";
const listingUrl =
  "https://www.hasznaltauto.hu/szemelyauto/tesla/model_3/tesla_model_3_long_range-11111111";

if (!isListPageUrl(listUrl)) throw new Error("lista URL felismerés hibás");
if (!isListingUrl(listingUrl)) throw new Error("hirdetés URL felismerés hibás");

const listHtml = readFileSync(join(process.cwd(), "fixtures", "sample-list-page.html"), "utf8");
const links = extractListingLinksFromHtml(listHtml, listUrl);
if (links.length !== 2) {
  throw new Error(`2 hirdetés link várható, kaptunk: ${links.length}`);
}

const brandHtml = readFileSync(join(process.cwd(), "fixtures", "sample-brand-page.html"), "utf8");
const subLinks = extractSubListLinksFromHtml(brandHtml, listUrl);
if (subLinks.length !== 2) {
  throw new Error(`2 alkategória várható, kaptunk: ${subLinks.length}`);
}

console.log("✓ link kinyerés teszt sikeres");
console.log("hirdetések:", links.join("\n"));
console.log("alkategóriák:", subLinks.join("\n"));
