import {
  currentUserHasPermission,
  currentUserIsInGroup,
} from "./auth/permissions";

const IDENTITY_PATCH_KEYS = new Set([
  "geraetenummer",
  "bezeichnung",
  "subgroup",
  "beschreibung",
]);

const MEDIA_PATCH_KEYS = new Set(["kep", "qr_code", "image"]);

async function allowIdentity() {
  if (await currentUserIsInGroup("Admin")) return true;
  return currentUserHasPermission("machines.stammdaten_identity");
}

async function allowMedia() {
  if (await currentUserIsInGroup("Admin")) return true;
  return currentUserHasPermission("machines.media");
}

/**
 * Entfernt Felder aus dem DB-Patch, für die keine Berechtigung besteht.
 * @param {Record<string, unknown>} patch
 * @param {Record<string, unknown>} [body]
 */
export async function filterMachinePatchByPermissions(patch, body = {}) {
  const identity = await allowIdentity();
  const media = await allowMedia();

  if (!identity) {
    for (const key of IDENTITY_PATCH_KEYS) {
      delete patch[key];
    }
    if (patch.machine_tab_data && typeof patch.machine_tab_data === "object") {
      const tab = { ...patch.machine_tab_data };
      delete tab.geraettyp;
      delete tab.geraetenummer;
      delete tab.bezeichnung;
      patch.machine_tab_data = tab;
    }
    if (body.geraetenummer_pick) {
      throw new Error(
        "Keine Berechtigung: machines.stammdaten_identity erforderlich (Gerätenummer)."
      );
    }
  }

  if (!media) {
    for (const key of MEDIA_PATCH_KEYS) {
      delete patch[key];
    }
  }

  return patch;
}

export async function canCreateMachine() {
  if (await currentUserIsInGroup("Admin")) return true;
  return currentUserHasPermission("machines.create");
}

export async function canDeleteMachine() {
  if (await currentUserIsInGroup("Admin")) return true;
  return currentUserHasPermission("machines.delete");
}

export async function canManageMachineMedia() {
  return allowMedia();
}

export async function canManageGeraetenummerCodes() {
  if (await currentUserIsInGroup("Admin")) return true;
  return currentUserHasPermission("machines.geraetenummer_codes");
}
