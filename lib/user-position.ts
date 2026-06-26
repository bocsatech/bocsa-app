export const SUPERVISOR_POSITION = "Vorgesetzter";

export const USER_POSITION_SUGGESTIONS = [
  SUPERVISOR_POSITION,
  "Werkstattleiter",
  "Lagerleiter",
  "Filialleiter",
  "Logistikleiter",
  "Verwaltung",
  "Sekretariat",
  "Buchhalter",
  "Informatiker",
  "Mechaniker",
  "Kleingerätemechaniker",
  "Großgerätemechaniker",
  "Mobilmechaniker",
  "Elektriker",
  "Autoelektriker",
  "Wäscher",
  "Fahrer",
  "Logistiker",
  "Lagerist",
  "Azubi",
  "Praktikant",
] as const;

export function isSupervisorPosition(position: unknown) {
  const normalized = String(position ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return normalized === "vorgesetzter" || normalized.includes("vorgesetzter");
}

export function supervisorUserLabel(user: {
  full_name?: string | null;
  username?: string | null;
}) {
  const fullName = String(user.full_name ?? "").trim();
  const username = String(user.username ?? "").trim();
  if (fullName && username) return `${fullName} (${username})`;
  return fullName || username || "—";
}

export function directManagerSelectValue(user: { id: string }) {
  return user.id;
}

export function resolveDirectManagerFormValue(
  stored: string | null | undefined,
  supervisors: Array<{ id: string; full_name?: string | null; username?: string | null }>
) {
  const value = String(stored ?? "").trim();
  if (!value) return "";

  const byId = supervisors.find((supervisor) => supervisor.id === value);
  if (byId) return byId.id;

  const byLabel = supervisors.find(
    (supervisor) => supervisorUserLabel(supervisor).toLowerCase() === value.toLowerCase()
  );
  if (byLabel) return byLabel.id;

  const byName = supervisors.find((supervisor) => {
    const fullName = String(supervisor.full_name ?? "").trim().toLowerCase();
    const username = String(supervisor.username ?? "").trim().toLowerCase();
    const needle = value.toLowerCase();
    return fullName === needle || username === needle;
  });
  if (byName) return byName.id;

  return value;
}

export function directManagerDisplayLabel(
  stored: string | null | undefined,
  supervisors: Array<{ id: string; full_name?: string | null; username?: string | null }>
) {
  const value = String(stored ?? "").trim();
  if (!value) return "—";
  const match = supervisors.find((supervisor) => supervisor.id === value);
  if (match) return supervisorUserLabel(match);
  return value;
}
