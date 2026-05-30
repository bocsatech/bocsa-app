const STORAGE_BUCKET = "machine-files";

function storagePathFromPublicUrl(publicUrl) {
  if (!publicUrl || typeof publicUrl !== "string") return null;
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length).replace(/\?.*$/, ""));
}

function addUrl(paths, url) {
  const path = storagePathFromPublicUrl(url);
  if (path) paths.add(path);
}

/** Storage-Dateien einer Maschine (Bild, QR, Dokument-URLs). */
export function collectMachineStoragePaths(machine) {
  const paths = new Set();

  addUrl(paths, machine.kep);
  addUrl(paths, machine.qr_code);

  const tab =
    machine.machine_tab_data && typeof machine.machine_tab_data === "object"
      ? machine.machine_tab_data
      : null;

  if (tab) {
    for (const key of [
      "pruefprotokoll_url",
      "betriebsanleitung_url",
      "pruefbericht_url",
      "pruefprotokoll",
      "betriebsanleitung",
    ]) {
      addUrl(paths, tab[key]);
    }

    const documentation = tab.documentation;
    if (documentation && typeof documentation === "object") {
      for (const value of Object.values(documentation)) {
        addUrl(paths, value);
      }
    }
  }

  return [...paths];
}

export async function removeMachineStorageFiles(db, machine) {
  const paths = collectMachineStoragePaths(machine);
  if (!paths.length) return;

  const { error } = await db.storage.from(STORAGE_BUCKET).remove(paths);
  if (error) {
    throw new Error(`Storage konnte nicht bereinigt werden: ${error.message}`);
  }
}
