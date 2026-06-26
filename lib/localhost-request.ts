export function isLocalhostHost(host: string) {
  const normalized = host.split(",")[0]?.trim().toLowerCase() ?? "";
  const hostname = normalized.split(":")[0] ?? normalized;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local")
  ) {
    return true;
  }
  return /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostname);
}

export function isLocalhostRequest(request: Request) {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  return isLocalhostHost(host);
}
