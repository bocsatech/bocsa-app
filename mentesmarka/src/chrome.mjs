import { startChromeWithDebugging, waitForCdpReady } from "./chrome-launcher.mjs";

const startUrl = process.argv[2] ?? "https://www.hasznaltauto.hu/hirdetesfeladas/szemelyauto";

console.log("mentesmarka — Chrome indítása (port 9222)...");
const info = startChromeWithDebugging(startUrl);
console.log("Profil:", info.profileDir);
console.log("URL:", info.startUrl);
console.log("");
console.log("1. Oldd meg a Cloudflare-t");
console.log("2. Töltsd be a hirdetésfeladás űrlapot (bejelentkezés ha kell)");
console.log("3. Másik terminálban: npm run mentesmarka");

const ready = await waitForCdpReady("http://127.0.0.1:9222", {
  onProgress: (msg) => console.log(msg),
});

if (!ready) {
  console.error("Chrome nem válaszol a 9222-es porton.");
  process.exit(1);
}

console.log("Chrome kész. Futtathatod: npm run mentesmarka");
