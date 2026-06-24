export function isLocalHostEnvironment() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

/** Custom-Kalender nur auf localhost; Production behält native Browser-Picker. */
export function resolveLocalhostPickerVariant(
  explicit?: "native" | "calendar"
): "native" | "calendar" {
  if (!isLocalHostEnvironment()) return "native";
  return explicit ?? "calendar";
}
