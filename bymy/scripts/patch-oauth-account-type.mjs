/**
 * Patch bocsatech/bymy oauth.mjs + server.mjs:
 * - OAuth state carries accountType (private|business)
 * - start reads ?accountType=
 * - callback passes accountType into findOrCreateOAuthUser
 * - ACCOUNT_TYPE_REQUIRED → regisztracio.html
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";

const root = process.argv[2];
if (!root) {
  console.error("Használat: node patch-oauth-account-type.mjs <bymy-prod-dir>");
  process.exit(1);
}

const oauthPath = join(root, "lib", "oauth.mjs");
const serverPath = join(root, "server.mjs");

let oauth = readFileSync(oauthPath, "utf8");
let server = readFileSync(serverPath, "utf8");

const NEW_CREATE = `export function createOAuthState(provider, nextPath = "/hirdetesfeladas.html", optsOrCfg = {}, maybeCfg) {
  let opts = optsOrCfg;
  let cfg = maybeCfg;
  // Backward compat: createOAuthState(provider, next, cfg)
  if (
    opts &&
    typeof opts === "object" &&
    (opts.google || opts.stateSecret || opts.publicBaseUrl) &&
    opts.accountType === undefined
  ) {
    cfg = opts;
    opts = {};
  }
  cfg = cfg || loadOAuthConfig();
  const next = String(nextPath || "/hirdetesfeladas.html").slice(0, 200);
  const accountType =
    opts?.accountType === "business" ? "business" : opts?.accountType === "private" ? "private" : "";
  const payload = {
    p: String(provider).toLowerCase(),
    n: next,
    m: isMobileOAuthNext(next) ? 1 : 0,
    a: accountType,
    e: Date.now() + 15 * 60 * 1000,
    r: randomBytes(8).toString("hex"),
  };
  const data = b64urlJson(payload);
  const sig = createHmac("sha256", getStateSecret(cfg)).update(data).digest("base64url");
  return \`\${data}.\${sig}\`;
}`;

const NEW_PARSE_RETURN = `  return {
    provider: payload.p,
    next: payload.n || "/hirdetesfeladas.html",
    mobile: Boolean(payload.m) || isMobileOAuthNext(payload.n),
    accountType: payload.a === "business" ? "business" : payload.a === "private" ? "private" : "",
  };`;

if (!oauth.includes("export function createOAuthState(")) {
  console.error("createOAuthState nem található");
  process.exit(1);
}

oauth = oauth.replace(/export function createOAuthState\([\s\S]*?\n\}/, NEW_CREATE);

if (!oauth.includes("accountType: payload.a")) {
  oauth = oauth.replace(
    /return \{\s*provider: payload\.p,\s*next: payload\.n \|\| "\/hirdetesfeladas\.html",\s*mobile: Boolean\(payload\.m\) \|\| isMobileOAuthNext\(payload\.n\),\s*\};/,
    NEW_PARSE_RETURN
  );
}

if (!oauth.includes("accountType: payload.a")) {
  console.error("parseOAuthState accountType beszúrás sikertelen");
  process.exit(1);
}

writeFileSync(oauthPath, oauth);
console.log("OK oauth.mjs");

// --- server.mjs ---
if (!server.includes("createOAuthState(provider, next)")) {
  // may already be patched with accountType
  if (!server.includes("createOAuthState(provider, next, { accountType })")) {
    console.error("createOAuthState(provider, next) hívás nem található a serverben");
    process.exit(1);
  }
} else {
  server = server.replace(
    `const next = mobile
        ? IOS_OAUTH_CALLBACK
        : urlObj.searchParams.get("next") || "/hirdetesfeladas.html";
      try {
        const state = createOAuthState(provider, next);`,
    `const next = mobile
        ? IOS_OAUTH_CALLBACK
        : urlObj.searchParams.get("next") || "/hirdetesfeladas.html";
      const accountTypeRaw = String(urlObj.searchParams.get("accountType") || "").trim();
      const accountType =
        accountTypeRaw === "business" ? "business" : accountTypeRaw === "private" ? "private" : "";
      try {
        const state = createOAuthState(provider, next, { accountType });`
  );
}

// Fix findOrCreateOAuthUser calls:
// 1) callback must pass stateInfo.accountType
// 2) native must NOT reference stateInfo (revert if wrongly patched)
server = server.replace(
  /const \{ user, session \} = await findOrCreateOAuthUser\(identity,\s*\{\s*accountType:\s*stateInfo\.accountType\s*\}\);/g,
  "const { user, session } = await findOrCreateOAuthUser(identity);"
);

if (server.includes("const stateInfo = parseOAuthState(params.state, provider)")) {
  server = server.replace(
    /(const stateInfo = parseOAuthState\(params\.state, provider\);[\s\S]*?)(const \{ user, session \} = await findOrCreateOAuthUser\(identity\);)/,
    `$1const { user, session } = await findOrCreateOAuthUser(identity, { accountType: stateInfo.accountType });`
  );
}

if (
  !server.includes(
    "findOrCreateOAuthUser(identity, { accountType: stateInfo.accountType })"
  )
) {
  console.error("callback findOrCreateOAuthUser accountType patch sikertelen");
  process.exit(1);
}

// Error redirect: ACCOUNT_TYPE_REQUIRED → regisztracio
if (!server.includes("ACCOUNT_TYPE_REQUIRED")) {
  server = server.replace(
    `} else {
          sendRedirect(res, \`/belepes.html?oauth_error=\${msg}\`);
        }
        console.warn("OAuth hiba:", error.message ?? error);
      }
      return;
    }

    if (pathname === "/api/auth/register"`,
    `} else {
          const dest =
            error.code === "ACCOUNT_TYPE_REQUIRED"
              ? \`/regisztracio.html?oauth_error=\${msg}\`
              : \`/belepes.html?oauth_error=\${msg}\`;
          sendRedirect(res, dest);
        }
        console.warn("OAuth hiba:", error.message ?? error);
      }
      return;
    }

    if (pathname === "/api/auth/register"`
  );
}

writeFileSync(serverPath, server);
console.log("OK server.mjs");
console.log("OK: oauth accountType patch →", root);
