/** Maschinen-Stammdaten mit erhöhten Rechten (standardmäßig nur Gruppe Admin). */

export const MACHINE_PERM = {
  read: "machines.read",
  write: "machines.write",
  create: "machines.create",
  geraetenummerCodes: "machines.geraetenummer_codes",
  stammdatenIdentity: "machines.stammdaten_identity",
  media: "machines.media",
  delete: "machines.delete",
} as const;

export type MachinePermissionKey = (typeof MACHINE_PERM)[keyof typeof MACHINE_PERM];

export const MACHINE_ADMIN_PERMISSION_DEFS: Array<{
  key: MachinePermissionKey;
  label: string;
  description: string;
}> = [
  {
    key: MACHINE_PERM.create,
    label: "Maschine hinzufügen",
    description: "Neue Maschine anlegen (Maschine hinzufügen).",
  },
  {
    key: MACHINE_PERM.geraetenummerCodes,
    label: "Nummern-Codes",
    description: "Marken/Klassen/Arten für die Gerätenummer verwalten.",
  },
  {
    key: MACHINE_PERM.stammdatenIdentity,
    label: "Stammdaten: Nummer, Bezeichnung, Gruppe, Typ",
    description:
      "Gerätenummer, Bezeichnung, Gerätegruppe und Gerättyp bearbeiten.",
  },
  {
    key: MACHINE_PERM.media,
    label: "QR-Code und Bild",
    description: "Maschinenbild und QR-Code ändern oder neu erzeugen.",
  },
  {
    key: MACHINE_PERM.delete,
    label: "Maschine löschen",
    description: "Maschine endgültig löschen.",
  },
];

export const STAMMDATEN_IDENTITY_FIELD_KEYS = new Set([
  "geraetenummer",
  "bezeichnung",
  "subgroup",
  "geraettyp",
]);

export type SessionAuthSlice = {
  permissions?: string[];
  groups?: string[];
  username?: string;
};

export function isAdminSession(auth: SessionAuthSlice) {
  return (
    auth.groups?.includes("Admin") ||
    auth.username?.trim().toLowerCase() === "admin"
  );
}

export function sessionHasPermission(auth: SessionAuthSlice, key: string) {
  if (isAdminSession(auth)) return true;
  return (auth.permissions ?? []).includes(key);
}

export function canMachineCreate(auth: SessionAuthSlice) {
  return sessionHasPermission(auth, MACHINE_PERM.create);
}

export function canMachineGeraetenummerCodes(auth: SessionAuthSlice) {
  return sessionHasPermission(auth, MACHINE_PERM.geraetenummerCodes);
}

export function canMachineStammdatenIdentity(auth: SessionAuthSlice) {
  return sessionHasPermission(auth, MACHINE_PERM.stammdatenIdentity);
}

export function canMachineMedia(auth: SessionAuthSlice) {
  return sessionHasPermission(auth, MACHINE_PERM.media);
}

export function canMachineDelete(auth: SessionAuthSlice) {
  return sessionHasPermission(auth, MACHINE_PERM.delete);
}

export function canMachineWrite(auth: SessionAuthSlice) {
  return sessionHasPermission(auth, MACHINE_PERM.write);
}

/** Feld im Bearbeiten-Modus änderbar? */
export function canEditStammdatenField(
  auth: SessionAuthSlice,
  dbKey: string | undefined,
  isEditing: boolean,
  options?: { creating?: boolean }
) {
  if (!isEditing) return false;
  if (!dbKey || !STAMMDATEN_IDENTITY_FIELD_KEYS.has(dbKey)) {
    return canMachineWrite(auth);
  }
  if (options?.creating) {
    return canMachineCreate(auth) || canMachineStammdatenIdentity(auth);
  }
  return canMachineStammdatenIdentity(auth);
}
