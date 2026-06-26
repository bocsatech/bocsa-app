import { ANNUAL_URLAUB_DAYS } from "./urlaub-timeline-users";

export function resolveUserAnnualUrlaubDays(
  storedValue: unknown,
  usePerUserQuota: boolean
): number {
  if (!usePerUserQuota) return ANNUAL_URLAUB_DAYS;
  const numeric = Number(storedValue);
  if (!Number.isFinite(numeric) || numeric <= 0) return ANNUAL_URLAUB_DAYS;
  return Math.round(numeric);
}
