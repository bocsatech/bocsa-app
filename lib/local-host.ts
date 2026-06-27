/** Custom naptár app-wide; natív csak explicit pickerVariant="native" esetén. */
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
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(host)) {
    return true;
  }
  return false;
}

/** Localhost-first UI (sidebar, Admin, PKW tabs) — also enabled on production. */
export function hasExtendedAppFeatures() {
  return true;
}

export function isLocalAppEnvironment() {
  return isLocalDevEnvironment() || isLocalHostEnvironment();
}

export function getBauArbeitsauftragMenuLabel(): string {
  if (hasExtendedAppFeatures()) {
    return "Arbeitsauftrag";
  }
  return "Bauarbeitsauftrag";
}

export function getBaupruefprotokollMenuLabel(): string {
  if (hasExtendedAppFeatures()) {
    return "Prüfprotokol";
  }
  return "Bauprüfprotokoll";
}

export function resolveLocalhostPickerVariant(
  explicit?: "native" | "calendar"
): "native" | "calendar" {
  if (explicit === "native") return "native";
  return "calendar";
}
