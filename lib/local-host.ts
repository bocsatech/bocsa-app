/** npm run dev → custom naptár; production → natív picker (kivéve explicit calendar). */
export function isLocalDevEnvironment() {
  return process.env.NODE_ENV === "development";
}

export function isLocalHostEnvironment() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".local")
  ) {
    return true;
  }
  if (isLocalDevEnvironment()) {
    return /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(host);
  }
  return false;
}

export function resolveLocalhostPickerVariant(
  explicit?: "native" | "calendar"
): "native" | "calendar" {
  if (explicit === "native") return "native";
  if (explicit === "calendar") return "calendar";
  if (isLocalDevEnvironment()) return "calendar";
  if (typeof window !== "undefined" && isLocalHostEnvironment()) return "calendar";
  return "native";
}
