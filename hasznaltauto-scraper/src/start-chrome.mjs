import { startChromeWithDebugging, waitForCdpReady } from "./chrome-launcher.mjs";

const startUrl = process.argv[2] ?? "https://www.hasznaltauto.hu/szemelyauto/tesla";

console.log("Chrome indítása debug módban (port 9222)...");
const info = startChromeWithDebugging(startUrl);
console.log("Profil:", info.profileDir);
console.log("URL:", info.startUrl);
console.log("");
console.log("Várd meg, amíg betölt az oldal (Cloudflare ha kell).");
console.log("Utána másik terminálban:");
console.log("  npm start -- --connect");

const ready = await waitForCdpReady("http://127.0.0.1:9222", {
  onProgress: (msg) => console.log(msg),
});

if (!ready) {
  console.error("Chrome nem válaszol a 9222-es porton.");
  process.exit(1);
}

console.log("Chrome kész. Futtathatod: npm start -- --connect");
