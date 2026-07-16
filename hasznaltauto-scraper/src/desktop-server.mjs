import { createServer } from "http";
import { spawn } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { readDesktopConfig, writeDesktopConfig } from "./desktop-config.mjs";
import { buildOutputPath } from "./output-path.mjs";
import { scrapeUrl } from "./scrape.mjs";
import { startChromeWithDebugging, waitForCdpReady } from "./chrome-launcher.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DESKTOP_DIR = join(__dirname, "..", "desktop");
const PORT = 39281;
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8"));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

let running = false;
let lastResult = null;
const logListeners = new Set();

function broadcast(type, payload) {
  const line = JSON.stringify({ type, ...payload, at: Date.now() });
  for (const listener of logListeners) {
    listener(line);
  }
}

function pushLog(message) {
  broadcast("log", { message });
}

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
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function serveStatic(pathname, res) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = join(DESKTOP_DIR, safePath);

  if (!filePath.startsWith(DESKTOP_DIR) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end("Nem található");
    return;
  }

  const ext = extname(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
  res.end(readFileSync(filePath));
}

function validateUrl(url) {
  if (!/^https?:\/\/(www\.)?hasznaltauto\.hu\//i.test(url)) {
    throw new Error("Csak hasznaltauto.hu link adható meg.");
  }
}

async function handleChromeStart(config) {
  validateUrl(config.url);
  pushLog(`Chrome indítása: ${config.url}`);
  startChromeWithDebugging(config.url);
  const ready = await waitForCdpReady("http://127.0.0.1:9222", {
    onProgress: (msg) => pushLog(msg),
  });
  if (!ready) throw new Error("Chrome nem indult el időben.");
  pushLog("Chrome kész. Oldd meg a Cloudflare-t, majd indítsd a beolvasást.");
  return { ok: true };
}

async function handleScrape(config) {
  if (running) throw new Error("Már fut egy beolvasás.");
  running = true;
  lastResult = null;
  pushLog("Beolvasás indul...");

  try {
    const result = await scrapeUrl(config.url, {
      connect: true,
      manualReady: true,
      fetchPhones: config.fetchPhones,
      paginate: config.paginate,
      onProgress: (message) => pushLog(message),
    });

    const outputPath = buildOutputPath(config.url ?? result.listUrl, null);
    mkdirSync(join(process.cwd(), "output"), { recursive: true });
    writeFileSync(outputPath, `${result.text}\n`, "utf8");

    lastResult = {
      outputPath,
      count: result.results?.length ?? 0,
      pagesScraped: result.pagesScraped ?? 1,
      preview: result.text.slice(0, 1200),
    };

    pushLog(`Kész! Mentve: ${outputPath}`);
    pushLog(`Hirdetések: ${lastResult.count} db (${lastResult.pagesScraped} oldal)`);
    broadcast("done", { result: lastResult });
    return lastResult;
  } finally {
    running = false;
  }
}

function openDesktopUi() {
  const url = `http://127.0.0.1:${PORT}`;
  const platform = process.platform;

  if (platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  if (platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (req.method === "GET" && url.pathname === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify({ type: "hello", version: pkg.version })}\n\n`);

    const listener = (line) => {
      res.write(`data: ${line}\n\n`);
    };
    logListeners.add(listener);
    req.on("close", () => logListeners.delete(listener));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    return sendJson(res, 200, {
      version: pkg.version,
      running,
      config: readDesktopConfig(),
      lastResult,
    });
  }

  if (req.method === "GET" && url.pathname === "/api/config") {
    return sendJson(res, 200, readDesktopConfig());
  }

  if (req.method === "PUT" && url.pathname === "/api/config") {
    try {
      const body = await readBody(req);
      if (body.url) validateUrl(body.url);
      const config = writeDesktopConfig(body);
      pushLog("Beállítások mentve.");
      return sendJson(res, 200, config);
    } catch (error) {
      return sendJson(res, 400, { error: error.message ?? String(error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/chrome") {
    try {
      const body = await readBody(req);
      const config = writeDesktopConfig(body);
      const result = await handleChromeStart(config);
      return sendJson(res, 200, result);
    } catch (error) {
      pushLog(`Hiba: ${error.message ?? error}`);
      return sendJson(res, 500, { error: error.message ?? String(error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/scrape") {
    try {
      const body = await readBody(req);
      const config = writeDesktopConfig(body);
      const result = await handleScrape(config);
      return sendJson(res, 200, { ok: true, result });
    } catch (error) {
      pushLog(`Hiba: ${error.message ?? error}`);
      broadcast("error", { message: error.message ?? String(error) });
      return sendJson(res, 500, { error: error.message ?? String(error) });
    }
  }

  if (req.method === "GET") {
    return serveStatic(url.pathname, res);
  }

  res.writeHead(405);
  res.end("Nem támogatott");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Hasznaltauto Scraper asztali felület: http://127.0.0.1:${PORT}`);
  console.log(`Verzió: v${pkg.version}`);
  openDesktopUi();
});
