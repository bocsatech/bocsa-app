import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { importListings } from "./lib/import-listings.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "public");
const PORT = 3456;
const HOST = "127.0.0.1";

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
  const filePath = join(PUBLIC, path === "/" ? "hirdetesfeladas.html" : path);
  if (!filePath.startsWith(PUBLIC) || !existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 — nem található");
    return;
  }
  const ext = extname(filePath);
  res.writeHead(200, {
    "Content-Type": MIME[ext] ?? "application/octet-stream",
    "Cache-Control": "no-store, no-cache, must-revalidate",
  });
  res.end(readFileSync(filePath));
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
      connect: body.connect !== false,
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

const server = createServer(async (req, res) => {
  const pathname = req.url?.split("?")[0] || "/";

  if (pathname === "/api/import" && req.method === "POST") {
    await handleImport(req, res);
    return;
  }

  if (pathname.startsWith("/api/")) {
    sendJson(res, 404, { error: "Ismeretlen API." });
    return;
  }

  serveStatic(pathname, res);
});

server.listen(PORT, HOST, () => {
  console.log(`Autosweb: http://${HOST}:${PORT}`);
  console.log("Import: hasznaltauto.hu → helyi űrlap (nem ad fel hirdetést).");
});
