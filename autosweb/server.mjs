import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

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

const server = createServer((req, res) => {
  const path = req.url?.split("?")[0] || "/";
  const filePath = join(PUBLIC, path === "/" ? "hirdetesfeladas.html" : path);

  if (!filePath.startsWith(PUBLIC) || !existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 — nem található");
    return;
  }

  const ext = extname(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
  res.end(readFileSync(filePath));
});

server.listen(PORT, HOST, () => {
  console.log(`Hirdetésfeladás (localhost): http://${HOST}:${PORT}`);
  console.log("Csak helyi hálózat — nincs külső kapcsolat.");
});
