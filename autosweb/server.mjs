import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { importListings, openChromeForImport } from "./lib/import-listings.mjs";
import { findChromeExecutable } from "./lib/chrome-launcher.mjs";
import {
  saveListing,
  getListing,
  getLatestListing,
  listListingsWithPreview,
  deleteListing,
  dbStats,
  listFieldDefs,
  findListingBySourceUrl,
} from "./lib/db.mjs";
import { getSiteBlocks, saveSiteBlocks } from "./lib/site-blocks.mjs";
import {
  deleteQuery,
  listFugvenyLists,
  loadQueries,
  predictOne,
  runSavedQuery,
  saveQuery,
  scoreList,
  trainFugvenyModel,
} from "./lib/fugveny-api.mjs";
import {
  deletePartner,
  getPartner,
  getPartnerRecommendations,
  getPostalCode,
  importPartners,
  listPartners,
  listPostalCities,
  partnerStats,
  savePartner,
  upsertPostalCodes,
} from "./lib/partners.mjs";
import { PARTNER_CATEGORIES } from "./lib/partner-categories.mjs";
import { getModels, getTypes, loadJarmuKatalogus } from "./lib/jarmu-katalogus.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "public");
const PORT = 3456;
const HOST = "127.0.0.1";

let fugvenyBusy = false;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

let importRunning = false;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function serveStatic(path, res) {
  const rel = path === "/" ? "index.html" : path.replace(/^\//, "");
  const filePath = join(PUBLIC, rel);
  if (!filePath.startsWith(PUBLIC) || !existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 — nem található");
    return;
  }
  const ext = extname(filePath);
  if (ext === ".html") {
    let html = readFileSync(filePath, "utf8");
    if (html.includes("<!-- AD_FORM -->")) {
      const partialPath = join(PUBLIC, "partials", "ad-form.html");
      if (existsSync(partialPath)) {
        html = html.replace("<!-- AD_FORM -->", readFileSync(partialPath, "utf8"));
      }
    }
    if (html.includes("<!-- HOME_SEARCH_SIDEBAR -->")) {
      html = html.replace(
        "<!-- HOME_SEARCH_SIDEBAR -->",
        readFileSync(join(PUBLIC, "partials", "home-search-sidebar.html"), "utf8")
      );
    }
    if (html.includes("<!-- SITE_SIDE_LEFT -->")) {
      html = html.replace(
        "<!-- SITE_SIDE_LEFT -->",
        readFileSync(join(PUBLIC, "partials", "site-side-left.html"), "utf8")
      );
    }
    if (html.includes("<!-- SITE_SIDE_RIGHT -->")) {
      html = html.replace(
        "<!-- SITE_SIDE_RIGHT -->",
        readFileSync(join(PUBLIC, "partials", "site-side-right.html"), "utf8")
      );
    }
    if (html.includes("<!-- SITE_SIDE_CONTROLS -->")) {
      html = html.replace(
        "<!-- SITE_SIDE_CONTROLS -->",
        readFileSync(join(PUBLIC, "partials", "site-side-controls.html"), "utf8")
      );
    }
    res.writeHead(200, {
      "Content-Type": MIME[".html"],
      "Cache-Control": "no-store, no-cache, must-revalidate",
    });
    res.end(html);
    return;
  }
  res.writeHead(200, {
    "Content-Type": MIME[ext] ?? "application/octet-stream",
    "Cache-Control": "no-store, no-cache, must-revalidate",
  });
  res.end(readFileSync(filePath));
}

async function handleOpenChrome(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    sendJson(res, 400, { error: "Érvénytelen JSON." });
    return;
  }

  const url = String(body.url ?? "https://www.hasznaltauto.hu/szemelyauto").trim();
  const logs = [];

  try {
    await openChromeForImport(url, {
      onProgress: (message) => logs.push(message),
    });
    sendJson(res, 200, { ok: true, logs, chrome: findChromeExecutable() });
  } catch (error) {
    sendJson(res, 500, {
      error: error.message ?? String(error),
      logs,
      chrome: findChromeExecutable(),
    });
  }
}

async function handleImport(req, res) {
  if (importRunning) {
    sendJson(res, 409, { error: "Már fut egy import." });
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    sendJson(res, 400, { error: "Érvénytelen JSON." });
    return;
  }

  const url = String(body.url ?? "").trim();
  if (!url) {
    sendJson(res, 400, { error: "Adj meg hasznaltauto.hu lista- vagy hirdetés URL-t." });
    return;
  }

  importRunning = true;
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-store",
    Connection: "keep-alive",
  });

  const send = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    const result = await importListings(url, {
      limit: body.limit ?? 50,
      onProgress: (message) => send({ type: "log", message }),
    });
    send({ type: "done", result });
  } catch (error) {
    send({ type: "error", message: error.message ?? String(error) });
  } finally {
    importRunning = false;
    res.end();
  }
}

async function handleListingsApi(req, res, pathname) {
  const latestMatch = pathname === "/api/listings/latest";
  const listMatch = pathname === "/api/listings";
  const idMatch = pathname.match(/^\/api\/listings\/(\d+)$/);

  if (pathname === "/api/db/stats" && req.method === "GET") {
    sendJson(res, 200, dbStats());
    return;
  }

  if (pathname === "/api/field-defs" && req.method === "GET") {
    sendJson(res, 200, { fields: listFieldDefs() });
    return;
  }

  if (latestMatch && req.method === "GET") {
    sendJson(res, 200, { listing: getLatestListing() });
    return;
  }

  if (listMatch && req.method === "GET") {
    const url = new URL(req.url ?? "", `http://${HOST}`);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 500);
    const status = url.searchParams.get("status");
    sendJson(res, 200, { listings: listListingsWithPreview({ limit, status }) });
    return;
  }

  if (idMatch && req.method === "GET") {
    const listing = getListing(Number(idMatch[1]));
    if (!listing) {
      sendJson(res, 404, { error: "Nincs ilyen hirdetés." });
      return;
    }
    sendJson(res, 200, { listing });
    return;
  }

  if (listMatch && req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      sendJson(res, 400, { error: "Érvénytelen JSON." });
      return;
    }

    const formData = body.form ?? body;
    const listingId = body.id != null ? Number(body.id) : null;
    if (!formData || typeof formData !== "object") {
      sendJson(res, 400, { error: "Hiányzó űrlap adat." });
      return;
    }

    const saved = saveListing(formData, listingId, { status: body.status });
    if (!saved) {
      sendJson(res, 404, { error: "Nincs ilyen hirdetés." });
      return;
    }
    sendJson(res, 200, { listing: saved });
    return;
  }

  if (idMatch && req.method === "DELETE") {
    deleteListing(Number(idMatch[1]));
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 405, { error: "Nem támogatott művelet." });
}

async function handleJarmuKatalogusApi(req, res, pathname) {
  try {
    if (pathname === "/api/jarmu-katalogus" && req.method === "GET") {
      const url = new URL(req.url ?? "", `http://${HOST}`);
      const force = url.searchParams.get("force") === "1";
      sendJson(res, 200, loadJarmuKatalogus({ force }));
      return;
    }

    if (pathname === "/api/jarmu-katalogus/models" && req.method === "GET") {
      const url = new URL(req.url ?? "", `http://${HOST}`);
      const gyartmany = url.searchParams.get("gyartmany") ?? "";
      sendJson(res, 200, { gyartmany, models: getModels(gyartmany) });
      return;
    }

    if (pathname === "/api/jarmu-katalogus/types" && req.method === "GET") {
      const url = new URL(req.url ?? "", `http://${HOST}`);
      const gyartmany = url.searchParams.get("gyartmany") ?? "";
      const modell = url.searchParams.get("modell") ?? "";
      sendJson(res, 200, { gyartmany, modell, types: getTypes(gyartmany, modell) });
      return;
    }

    sendJson(res, 405, { error: "Nem támogatott művelet." });
  } catch (error) {
    sendJson(res, 500, { error: error.message ?? String(error) });
  }
}

async function handleFugvenyApi(req, res, pathname) {
  try {
    if (pathname === "/api/fugveny/lists" && req.method === "GET") {
      sendJson(res, 200, listFugvenyLists());
      return;
    }

    if (pathname === "/api/fugveny/queries" && req.method === "GET") {
      sendJson(res, 200, { queries: loadQueries() });
      return;
    }

    if (pathname === "/api/fugveny/queries" && req.method === "POST") {
      const body = await readBody(req);
      sendJson(res, 200, { query: saveQuery(body) });
      return;
    }

    const delMatch = pathname.match(/^\/api\/fugveny\/queries\/([^/]+)$/);
    if (delMatch && req.method === "DELETE") {
      sendJson(res, 200, deleteQuery(decodeURIComponent(delMatch[1])));
      return;
    }

    if (pathname === "/api/fugveny/queries/run" && req.method === "POST") {
      const body = await readBody(req);
      const id = body.id;
      if (!id) {
        sendJson(res, 400, { error: "Hiányzó lekérdezés id." });
        return;
      }
      const result = runSavedQuery(id);
      if (result.mode === "estimate") {
        const pred = await predictOne(result.params || {});
        sendJson(res, 200, { ...result, prediction: pred });
        return;
      }
      sendJson(res, 200, result);
      return;
    }

    if (pathname === "/api/fugveny/predict" && req.method === "POST") {
      const body = await readBody(req);
      const pred = await predictOne(body);
      sendJson(res, 200, pred);
      return;
    }

    if (pathname === "/api/fugveny/train" && req.method === "POST") {
      if (fugvenyBusy) {
        sendJson(res, 409, { error: "Már fut egy tanítás / pontozás." });
        return;
      }
      const body = await readBody(req);
      if (!body.listId) {
        sendJson(res, 400, { error: "Válassz listát (listId)." });
        return;
      }
      fugvenyBusy = true;
      try {
        const result = await trainFugvenyModel(body);
        sendJson(res, 200, result);
      } finally {
        fugvenyBusy = false;
      }
      return;
    }

    if (pathname === "/api/fugveny/score" && req.method === "POST") {
      if (fugvenyBusy) {
        sendJson(res, 409, { error: "Már fut egy tanítás / pontozás." });
        return;
      }
      const body = await readBody(req);
      if (!body.listId) {
        sendJson(res, 400, { error: "Válassz listát (listId)." });
        return;
      }
      fugvenyBusy = true;
      try {
        const result = await scoreList(body);
        sendJson(res, 200, result);
      } finally {
        fugvenyBusy = false;
      }
      return;
    }

    sendJson(res, 404, { error: "Ismeretlen fugveny API." });
  } catch (error) {
    sendJson(res, 500, { error: error.message ?? String(error) });
  }
}

async function handlePartnersApi(req, res, pathname) {
  try {
    const recommendMatch = pathname === "/api/partners/recommendations";

    if (recommendMatch && req.method === "GET") {
      const url = new URL(req.url ?? "", `http://${HOST}`);
      const postalCode = url.searchParams.get("postal_code") ?? url.searchParams.get("iranyitoszam");
      if (!postalCode) {
        sendJson(res, 400, { error: "Hiányzó irányítószám." });
        return;
      }
      sendJson(res, 200, getPartnerRecommendations(postalCode));
      return;
    }

    if (pathname === "/api/partners/categories" && req.method === "GET") {
      sendJson(res, 200, { categories: PARTNER_CATEGORIES });
      return;
    }

    if (pathname === "/api/partners/stats" && req.method === "GET") {
      sendJson(res, 200, partnerStats());
      return;
    }

    if (pathname === "/api/partners" && req.method === "GET") {
      sendJson(res, 200, { partners: listPartners() });
      return;
    }

    if (pathname === "/api/partners/import" && req.method === "POST") {
      let body;
      try {
        body = await readBody(req);
      } catch {
        sendJson(res, 400, { error: "Érvénytelen JSON." });
        return;
      }
      const rows = body.partners ?? body.rows ?? body;
      if (!Array.isArray(rows)) {
        sendJson(res, 400, { error: "Hiányzó partners tömb." });
        return;
      }
      sendJson(res, 200, { results: importPartners(rows) });
      return;
    }

    if (pathname === "/api/postal-codes/lookup" && req.method === "GET") {
      const url = new URL(req.url ?? "", `http://${HOST}`);
      const postalCode = url.searchParams.get("postal_code") ?? url.searchParams.get("iranyitoszam");
      const origin = getPostalCode(postalCode);
      if (!origin) {
        sendJson(res, 404, { error: `Ismeretlen irányítószám: ${postalCode ?? ""}`.trim() });
        return;
      }
      sendJson(res, 200, origin);
      return;
    }

    if (pathname === "/api/postal-codes/cities" && req.method === "GET") {
      sendJson(res, 200, { cities: listPostalCities() });
      return;
    }

    if (pathname === "/api/postal-codes/import" && req.method === "POST") {
      let body;
      try {
        body = await readBody(req);
      } catch {
        sendJson(res, 400, { error: "Érvénytelen JSON." });
        return;
      }
      const rows = body.postal_codes ?? body.rows ?? body;
      if (!Array.isArray(rows)) {
        sendJson(res, 400, { error: "Hiányzó postal_codes tömb." });
        return;
      }
      sendJson(res, 200, upsertPostalCodes(rows));
      return;
    }

    const idMatch = pathname.match(/^\/api\/partners\/(\d+)$/);

    if (idMatch && req.method === "GET") {
      const partner = getPartner(Number(idMatch[1]));
      if (!partner) {
        sendJson(res, 404, { error: "Nincs ilyen partner." });
        return;
      }
      sendJson(res, 200, { partner });
      return;
    }

    if (pathname === "/api/partners" && req.method === "POST") {
      let body;
      try {
        body = await readBody(req);
      } catch {
        sendJson(res, 400, { error: "Érvénytelen JSON." });
        return;
      }
      const partnerId = body.id != null ? Number(body.id) : null;
      try {
        const saved = savePartner(body, partnerId);
        if (!saved) {
          sendJson(res, 404, { error: "Nincs ilyen partner." });
          return;
        }
        sendJson(res, 200, { partner: saved });
      } catch (error) {
        sendJson(res, 400, { error: error.message ?? String(error) });
      }
      return;
    }

    if (idMatch && req.method === "DELETE") {
      deletePartner(Number(idMatch[1]));
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { error: "Ismeretlen partners API." });
  } catch (error) {
    sendJson(res, 500, { error: error.message ?? String(error) });
  }
}

const server = createServer(async (req, res) => {
  const pathname = req.url?.split("?")[0] || "/";

  if (pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      version: readFileSync(join(PUBLIC, "version.txt"), "utf8").trim(),
      chrome: findChromeExecutable(),
    });
    return;
  }

  if (pathname === "/api/open-chrome" && req.method === "POST") {
    await handleOpenChrome(req, res);
    return;
  }

  if (pathname === "/api/import" && req.method === "POST") {
    await handleImport(req, res);
    return;
  }

  if (pathname === "/api/site-blocks" && req.method === "GET") {
    const url = new URL(req.url ?? "", `http://${HOST}`);
    const page = url.searchParams.get("page");
    sendJson(res, 200, getSiteBlocks(page));
    return;
  }

  if (pathname === "/api/site-blocks" && req.method === "PUT") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      sendJson(res, 400, { error: "Érvénytelen JSON." });
      return;
    }
    sendJson(res, 200, saveSiteBlocks(body));
    return;
  }

  if (
    pathname === "/api/db/stats" ||
    pathname === "/api/field-defs" ||
    pathname === "/api/listings" ||
    pathname === "/api/listings/latest" ||
    pathname.startsWith("/api/listings/")
  ) {
    await handleListingsApi(req, res, pathname);
    return;
  }

  if (pathname.startsWith("/api/fugveny")) {
    await handleFugvenyApi(req, res, pathname);
    return;
  }

  if (pathname.startsWith("/api/jarmu-katalogus")) {
    await handleJarmuKatalogusApi(req, res, pathname);
    return;
  }

  if (pathname.startsWith("/api/partners") || pathname.startsWith("/api/postal-codes")) {
    await handlePartnersApi(req, res, pathname);
    return;
  }

  if (pathname.startsWith("/api/")) {
    sendJson(res, 404, { error: "Ismeretlen API." });
    return;
  }

  serveStatic(pathname, res);
});

server.listen(PORT, HOST, async () => {
  console.log(`Autosweb: http://${HOST}:${PORT}`);
  console.log("Import: hasznaltauto.hu → helyi űrlap (nem ad fel hirdetést).");
  try {
    const catalog = loadJarmuKatalogus();
    if (catalog.ok) {
      console.log(
        `Járműkatalógus: ${catalog.rowCount} sor, ${catalog.brands.length} gyártmány ← ${catalog.path}`
      );
    } else {
      console.log(`Járműkatalógus: még nincs (${catalog.path})`);
    }
  } catch (error) {
    console.warn("Járműkatalógus:", error.message ?? error);
  }
  try {
    const stats = dbStats();
    console.log(`SQLite: ${stats.path} (${stats.listings} hirdetés, ${stats.cells} cella)`);
  } catch (error) {
    console.warn("SQLite inicializálás:", error.message ?? error);
  }
  try {
    const { seedDemoPartnersIfEmpty } = await import("./scripts/seed-partners.mjs");
    const seedResult = seedDemoPartnersIfEmpty();
    if (seedResult.seeded) {
      console.log(
        `Partnerek: demo adatok betöltve (${seedResult.stats.activePaid} fizetős aktív)`
      );
    }
  } catch (error) {
    console.warn("Partner seed:", error.message ?? error);
  }
});
