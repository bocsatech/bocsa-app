/** Server-side localhost check for Rechnungen API (hostname / private LAN). */

function normalizeHost(raw) {
  const value = String(raw ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (!value) return "";
  return value.split(":")[0];
}

function isLocalHostName(host) {
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".local")) {
    return true;
  }
  return /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(host);
}

export function isLocalHostRequest(request) {
  const host = normalizeHost(
    request.headers.get("x-forwarded-host") || request.headers.get("host")
  );
  return isLocalHostName(host);
}

export function localhostOnlyResponse() {
  return Response.json(
    { error: "Rechnungen sind nur auf localhost verfügbar." },
    { status: 403 }
  );
}
