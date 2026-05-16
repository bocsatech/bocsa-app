export type PinOperation = "add" | "subtract";

export function normalizePinAnswer(value: string) {
  const trimmed = value.trim();
  if (!/^\d{1,2}$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

export function normalizeSecretPin(pin: unknown) {
  const value = Number(pin);
  if (!Number.isInteger(value) || value < 0 || value > 99) {
    return null;
  }
  return value;
}

/** Ergebnis immer 0–99, nie negativ. */
export function computePinResult(
  secretPin: number,
  challengeValue: number,
  operation: PinOperation
) {
  if (operation === "add") {
    return Math.min(99, secretPin + challengeValue);
  }
  return Math.max(0, secretPin - challengeValue);
}

export function createChallengeForPin(secretPin: number) {
  const operation: PinOperation = Math.random() < 0.5 ? "add" : "subtract";

  if (operation === "subtract") {
    const value = secretPin === 0 ? 0 : Math.floor(Math.random() * (secretPin + 1));
    return { operation, value };
  }

  const maxAdd = 99 - secretPin;
  const value = maxAdd === 0 ? 0 : Math.floor(Math.random() * (maxAdd + 1));
  return { operation, value };
}

/** Kompakt: „+ 9“ / „− 9“ (ohne Hinweis auf die Geheimzahl). */
export function compactChallengeLabel(operation: PinOperation, value: number) {
  return operation === "add" ? `+ ${value}` : `− ${value}`;
}

export function operationLabel(operation: PinOperation, value: number) {
  if (operation === "add") {
    return `Addieren Sie ${value} zu Ihrer Geheimzahl.`;
  }
  return `Subtrahieren Sie ${value} von Ihrer Geheimzahl.`;
}
