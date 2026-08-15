/**
 * Patch bocsatech/bymy server.mjs during deploy:
 * - activation email: open tracking pixel (megnyitás = aktiválás)
 * - GET /api/auth/activate-open?token=… → 1×1 GIF (vagy redirect loginra)
 */
import { readFileSync, writeFileSync } from "fs";

const path = process.argv[2];
if (!path) {
  console.error("Használat: node patch-activation-open.mjs <server.mjs>");
  process.exit(1);
}

let src = readFileSync(path, "utf8");

const NEW_SEND = `async function sendActivationEmail(email, activationToken, baseUrl) {
  const root = (baseUrl ?? \`http://\${HOST}:\${PORT}\`).replace(/\\/$/, "");
  const openUrl = \`\${root}/api/auth/activate-open?token=\${encodeURIComponent(activationToken)}\`;
  const loginUrl = \`\${root}/belepes.html?activated=1\`;
  console.log(\`Aktiváló open-pixel → \${email}: \${openUrl}\`);
  try {
    await sendMail({
      to: email,
      subject: "Bymy — nyisd meg a levelet a fiók aktiválásához",
      text:
        \`Szia!\\n\\n\` +
        \`Nyisd meg ezt a levelet — ezzel aktiválódik a Bymy fiókod.\\n\` +
        \`Nincs más teendőd; utána lépj be: \${loginUrl}\\n\\n\` +
        \`Ha a leveleződ nem tölti be a képeket, nyisd meg ezt a linket:\\n\${openUrl}&next=/belepes.html\\n\\n\` +
        \`Ha nem te regisztráltál, hagyd figyelmen kívül.\\n\`,
      html:
        \`<p>Szia!</p>\` +
        \`<p><strong>Nyisd meg ezt a levelet</strong> — ezzel aktiválódik a Bymy fiókod. Nincs más kattintás kell.</p>\` +
        \`<p>Utána lépj be: <a href="\${loginUrl}">\${loginUrl}</a></p>\` +
        \`<img src="\${openUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0" />\` +
        \`<p style="color:#888;font-size:12px">Ha a leveleződ blokkolja a képeket: \` +
        \`<a href="\${openUrl}&amp;next=/belepes.html">fiók aktiválása</a>.</p>\` +
        \`<p>Ha nem te regisztráltál, hagyd figyelmen kívül.</p>\`,
    });
    return { sent: true, link: \`\${openUrl}&next=/belepes.html\` };
  } catch (error) {
    if (error.code === "SMTP_NOT_CONFIGURED") {
      return { sent: false, link: \`\${openUrl}&next=/belepes.html\`, error: error.message };
    }
    throw error;
  }
}`;

const NEW_ROUTE = `    if (pathname === "/api/auth/activate-open" && req.method === "GET") {
      const urlObj = new URL(req.url ?? "", \`http://\${HOST}:\${PORT}\`);
      const rawToken = urlObj.searchParams.get("token") || "";
      const nextRaw = urlObj.searchParams.get("next") || "";
      try {
        if (rawToken) await activateUserByToken(rawToken);
      } catch (error) {
        // Már aktiválva / lejárt token: pixelnél ne zavarjuk a levelezőt.
        console.warn("activate-open:", error.message ?? error);
      }
      const nextPath =
        nextRaw.startsWith("/") && !nextRaw.startsWith("//")
          ? nextRaw
          : "";
      if (nextPath) {
        const sep = nextPath.includes("?") ? "&" : "?";
        sendRedirect(res, \`\${nextPath}\${sep}activated=1\`);
        return;
      }
      // 1×1 átlátszó GIF — email megnyitás / képbetöltés
      const gif = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      res.writeHead(200, {
        "Content-Type": "image/gif",
        "Content-Length": gif.length,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      });
      res.end(gif);
      return;
    }

    if (pathname === "/api/auth/activate" && req.method === "POST") {`;

if (!src.includes("async function sendActivationEmail(")) {
  console.error("sendActivationEmail nem található");
  process.exit(1);
}

src = src.replace(
  /async function sendActivationEmail\([\s\S]*?\n\}/,
  NEW_SEND
);

if (!src.includes('pathname === "/api/auth/activate" && req.method === "POST"')) {
  console.error("activate POST route nem található");
  process.exit(1);
}

if (src.includes('pathname === "/api/auth/activate-open"')) {
  console.log("activate-open route már benne van — kihagyva a route beszúrást");
} else {
  src = src.replace(
    /    if \(pathname === "\/api\/auth\/activate" && req\.method === "POST"\) \{/,
    NEW_ROUTE
  );
  if (!src.includes('pathname === "/api/auth/activate-open"')) {
    console.error("activate-open route beszúrása sikertelen");
    process.exit(1);
  }
}

// Fallback linkek a regisztrációnál (ha SMTP nincs): aktivalas.html → activate-open
src = src.replaceAll(
  "/aktivalas.html?token=",
  "/api/auth/activate-open?token="
);
// Ha a fallback linknek még nincs next paramja, tegyük a belepesre
src = src.replace(
  /\$\{siteRoot\}\/api\/auth\/activate-open\?token=\$\{encodeURIComponent\(registered\.activationToken\)\}`/g,
  "${siteRoot}/api/auth/activate-open?token=${encodeURIComponent(registered.activationToken)}&next=/belepes.html`"
);

writeFileSync(path, src);

// Regisztráció / újraküldés üzenetek: megnyitás = aktiválás
let src2 = readFileSync(path, "utf8");
src2 = src2.replaceAll(
  "`Küldtünk aktiváló emailt ide: ${registered.email}`",
  "`Küldtünk emailt ide: ${registered.email} — nyisd meg (a megnyitás aktiválja a fiókot).`"
);
src2 = src2.replaceAll(
  "`Új aktiváló emailt küldtünk: ${created.email}`",
  "`Új emailt küldtünk: ${created.email} — nyisd meg (a megnyitás aktivál).`"
);
writeFileSync(path, src2);
console.log("OK: activation-open patch →", path);
