import { readFileSync } from "fs";
import { join } from "path";
import {
  buildListPageUrl,
  extractPaginationFromHtml,
  getPageNumberFromUrl,
  stripPageFromUrl,
} from "./pagination.mjs";

const base =
  "https://www.hasznaltauto.hu/talalatilista/TESTHASH/page1";

if (getPageNumberFromUrl(base) !== 1) throw new Error("page1 szám hibás");
if (getPageNumberFromUrl(`${base.replace("/page1", "")}/page33`) !== 33) {
  throw new Error("page33 szám hibás");
}

const stripped = stripPageFromUrl(base);
if (stripped !== "https://www.hasznaltauto.hu/talalatilista/TESTHASH") {
  throw new Error(`stripPageFromUrl hibás: ${stripped}`);
}

const page5 = buildListPageUrl(stripped, 5);
if (page5 !== "https://www.hasznaltauto.hu/talalatilista/TESTHASH/page5") {
  throw new Error(`buildListPageUrl hibás: ${page5}`);
}

const html = readFileSync(join(process.cwd(), "fixtures", "sample-pagination.html"), "utf8");
const pagination = extractPaginationFromHtml(html, base);
if (pagination.maxPage !== 33) {
  throw new Error(`maxPage 33 várható, kaptunk: ${pagination.maxPage}`);
}
if (!pagination.nextHref?.includes("/page2")) {
  throw new Error(`nextHref hibás: ${pagination.nextHref}`);
}

console.log("✓ lapozás teszt sikeres");
console.log(`maxPage: ${pagination.maxPage}, next: ${pagination.nextHref}`);
