import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { networkInterfaces } from "os";
import { importListings, openChromeForImport } from "./lib/import-listings.mjs";
import { findChromeExecutable } from "./lib/chrome-launcher.mjs";
import {
  saveListing,
  getListing,
  getLatestListing,
  listListingsWithPreview,
  listMyListingsWithPreview,
  deleteListing,
  dbStats,
  listFieldDefs,
  findListingBySourceUrl,
  getDb,
} from "./lib/db.mjs";
import {
  saveListingPhotos,
  resolveListingPhotoFile,
  readListingPhoto,
} from "./lib/listing-photos.mjs";
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
import { estimateValuation, valuationOptions } from "./lib/valuation.mjs";
import {
  ensureVehicleCatalog,
  getVehicleCatalog,
  catalogSummary,
  listModelTypes,
  listModelYears,
} from "./lib/vehicle-catalog.mjs";
import { searchHasznaltauto } from "./lib/ha-search.mjs";
import {
  handleAuthApi,
  initAuthSchema,
  authStats,
  getUserByToken,
  extractBearerToken,
} from "./lib/auth-users.mjs";
import { handleMessagesApi, initMessagingSchema } from "./lib/messaging.mjs";
import { migrateLegacyAutoswebDb, getDbPaths } from "./lib/db-registry.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "public");
const PORT = Number(process.env.PORT ?? 3456);
/** `127.0.0.1` = csak Mac; `0.0.0.0` = ugyanazon Wi‑Fi (telefon). Env: AUTOSWEB_HOST */
const HOST = process.env.AUTOSWEB_HOST ?? "0.0.0.0";

function lanIPv4Addresses() {
  const out = [];
  const nets = networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const net of list ?? []) {
      const family = net.family === "IPv4" || net.family === 4;
      if (family && !net.internal) out.push(net.address);
    }
  }
  return out;
}

let fugvenyBusy = false;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
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

/** Ideiglenes: használtautó.hu keresés az iOS appnak */
async function handleHaSearchApi(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    sendJson(res, 405, { error: "POST vagy GET." });
    return;
  }

  let filter = {};
  let demo = false;
  let maxPages;

  try {
    if (req.method === "POST") {
      const body = await readBody(req);
      filter = body.filter ?? body ?? {};
      demo = Boolean(body.demo);
      maxPages = body.maxPages;
    } else {
      const u = new URL(req.url, `http://${HOST}:${PORT}`);
      demo = u.searchParams.get("demo") === "1";
      const brand = u.searchParams.get("brand");
      if (brand) filter.gyartmanyok = [brand];
      const model = u.searchParams.get("model");
      if (model) filter.modellek = [model];
    }
  } catch {
    sendJson(res, 400, { error: "Érvénytelen JSON." });
    return;
  }

  const logs = [];
  try {
    const result = await searchHasznaltauto(filter, {
      demo,
      maxPages,
      onProgress: (message) => {
        logs.push(message);
        console.log(`[ha-search] ${message}`);
      },
    });
    console.log(
      `[ha-search] kész mode=${result.mode} results=${result.results?.length ?? 0} ok=${result.ok}`
    );
    sendJson(res, 200, { ...result, logs });
  } catch (error) {
    console.error(`[ha-search] hiba: ${error.message}`);
    sendJson(res, 500, {
      ok: false,
      error: error.message ?? String(error),
      logs,
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
  const mineMatch = pathname === "/api/listings/mine";
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

  if (mineMatch && req.method === "GET") {
    const user = getUserByToken(extractBearerToken(req));
    if (!user) {
      sendJson(res, 401, { error: "Nem vagy bejelentkezve." });
      return;
    }
    const url = new URL(req.url ?? "", `http://${HOST}`);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 100), 1), 500);
    sendJson(res, 200, {
      listings: listMyListingsWithPreview(user, { limit }),
    });
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

    const user = getUserByToken(extractBearerToken(req));
    const wantsPhotos = Array.isArray(body.photos) && body.photos.length > 0;
    // Mobil kép-feltöltés: kötelező bejelentkezés → user_id / Hirdetéseim
    if (wantsPhotos && !user) {
      sendJson(res, 401, { error: "Bejelentkezés szükséges a hirdetésfeladáshoz." });
      return;
    }
    const ownerOpts =
      user != null
        ? { status: body.status, userId: user.id }
        : { status: body.status };

    let saved = saveListing(formData, listingId, ownerOpts);
    if (!saved) {
      sendJson(res, 404, { error: "Nincs ilyen hirdetés." });
      return;
    }
    const createdNew = listingId == null;
    if (Array.isArray(body.photos) && body.photos.length > 0) {
      try {
        saved = saveListingPhotos(saved.id, body.photos);
      } catch (error) {
        if (createdNew) {
          try {
            deleteListing(saved.id);
          } catch {
            /* ignore */
          }
        }
        sendJson(res, 400, { error: error.message ?? "Képek mentése sikertelen." });
        return;
      }
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

async function handleVehicleCatalogApi(req, res, pathname) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Csak GET." });
    return;
  }

  const catalog = getVehicleCatalog();
  if (!catalog?.gyartmanyok?.length) {
    sendJson(res, 404, {
      error: "Nincs járműkatalógus. Futtasd: npm run import:catalog -- ~/Desktop/lista.csv",
    });
    return;
  }

  // Márkák + modellek — a típusok nélkül, hogy az oldal gyorsan induljon.
  if (pathname === "/api/vehicle-catalog") {
    sendJson(res, 200, catalogSummary(catalog));
    return;
  }

  // Egy modell évjáratai és típusai.
  if (pathname === "/api/vehicle-catalog/tipusok") {
    const url = new URL(req.url ?? "", `http://${HOST}`);
    const gyartmany = url.searchParams.get("gyartmany") ?? "";
    const modell = url.searchParams.get("modell") ?? "";
    const ev = url.searchParams.get("ev");

    if (!gyartmany || !modell) {
      sendJson(res, 400, { error: "gyartmany és modell kötelező." });
      return;
    }

    sendJson(res, 200, {
      gyartmany,
      modell,
      ev: ev || null,
      evek: listModelYears(catalog, gyartmany, modell),
      tipusok: listModelTypes(catalog, gyartmany, modell, ev),
    });
    return;
  }

  sendJson(res, 404, { error: "Ismeretlen katalógus API." });
}

async function handleValuationApi(req, res, pathname) {
  try {
    if (pathname === "/api/valuation/options" && req.method === "GET") {
      sendJson(res, 200, valuationOptions());
      return;
    }

    if (pathname === "/api/valuation/estimate" && req.method === "GET") {
      const url = new URL(req.url ?? "", `http://${HOST}`);
      const result = estimateValuation({
        gyartmany: url.searchParams.get("gyartmany"),
        modell_tipus: url.searchParams.get("modell_tipus"),
        gyartasi_ev: url.searchParams.get("gyartasi_ev"),
        km: url.searchParams.get("km"),
      });
      if (result.error) {
        sendJson(res, 400, result);
        return;
      }
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, { error: "Ismeretlen értékbecslő API." });
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
    let version = "unknown";
    try {
      version = readFileSync(join(PUBLIC, "version.txt"), "utf8").trim();
    } catch {
      /* ignore */
    }
    let users = 0;
    try {
      users = authStats().users;
    } catch {
      /* ignore */
    }
    sendJson(res, 200, {
      ok: true,
      version,
      chrome: findChromeExecutable(),
      haSearch: true,
      users,
    });
    return;
  }

  if (pathname.startsWith("/api/auth")) {
    await handleAuthApi(req, res, pathname);
    return;
  }

  if (pathname.startsWith("/api/messages")) {
    await handleMessagesApi(req, res, pathname);
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

  if (pathname === "/api/ha-search") {
    await handleHaSearchApi(req, res);
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

  if (pathname.startsWith("/api/valuation")) {
    await handleValuationApi(req, res, pathname);
    return;
  }

  if (pathname.startsWith("/api/vehicle-catalog")) {
    await handleVehicleCatalogApi(req, res, pathname);
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

  if (pathname.startsWith("/uploads/listings/")) {
    const abs = resolveListingPhotoFile(pathname);
    if (!abs) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 — kép nem található");
      return;
    }
    const ext = extname(abs).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=86400",
    });
    res.end(readListingPhoto(abs));
    return;
  }

  serveStatic(pathname, res);
});

server.listen(PORT, HOST, async () => {
  console.log(`Autosweb bind: ${HOST}:${PORT}`);
  console.log(`Helyi:     http://127.0.0.1:${PORT}/`);
  const lans = lanIPv4Addresses();
  if (HOST === "0.0.0.0" || HOST === "::") {
    if (lans.length) {
      for (const ip of lans) {
        console.log(`Wi‑Fi/LAN: http://${ip}:${PORT}/  ← telefonon ezt add meg`);
      }
    } else {
      console.log("Wi‑Fi/LAN: (nincs IPv4 cím) — csatlakozz Wi‑Fi-hez");
    }
  }
  console.log("Import: hasznaltauto.hu → helyi űrlap (nem ad fel hirdetést).");
  try {
    initAuthSchema();
    initMessagingSchema();
    getDb(); // listings.db séma
    const mig = migrateLegacyAutoswebDb();
    const paths = getDbPaths();
    console.log(`DB users:    ${paths.users}`);
    console.log(`DB listings: ${paths.listings}`);
    console.log(`DB messages: ${paths.messages}`);
    if (mig?.migrated) {
      console.log(`Legacy autosweb.db → ${mig.backup}`);
    }
    const auth = authStats();
    console.log(`Fiókok: ${auth.users} felhasználó, ${auth.sessions} aktív session`);
    console.log("Üzenetek API: /api/messages/*");
  } catch (error) {
    console.warn("Auth / DB séma:", error.message ?? error);
  }
  try {
    const stats = dbStats();
    console.log(`Hirdetések: ${stats.listings} db, ${stats.cells} cella (${stats.path})`);
  } catch (error) {
    console.warn("SQLite inicializálás:", error.message ?? error);
  }
  try {
    const catalog = ensureVehicleCatalog();
    if (catalog?.gyartmanyok?.length) {
      const modelCount = Object.values(catalog.modellek ?? {}).reduce(
        (n, arr) => n + arr.length,
        0
      );
      console.log(
        `Járműkatalógus: ${catalog.gyartmanyok.length} márka, ${modelCount} modell (${catalog.source ?? "?"})`
      );
    } else {
      console.warn(
        "Járműkatalógus: nincs — futtasd: npm run import:catalog -- ~/Desktop/lista.csv"
      );
    }
  } catch (error) {
    console.warn("Járműkatalógus:", error.message ?? error);
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
