import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const MACHINE_TABLE = "maschines";
const STORAGE_BUCKET = "machine-files";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf"]);

const DOCUMENT_TYPES = {
  pruefprotokoll: {
    topLevelField: "pruefprotokoll_url",
    documentationKey: "pruefprotokoll",
    storageDir: "pruefprotokolle",
    prefix: "pruefprotokoll",
  },
  betriebsanleitung: {
    topLevelField: "betriebsanleitung_url",
    documentationKey: "operatingManual",
    storageDir: "betriebsanleitungen",
    prefix: "betriebsanleitung",
  },
  ersatzteilekatalog: {
    documentationKey: "sparePartsCatalog",
    storageDir: "ersatzteilekataloge",
    prefix: "ersatzteilekatalog",
  },
  stromlaufplan: {
    documentationKey: "wiringDiagram",
    storageDir: "stromlaufplaene",
    prefix: "stromlaufplan",
  },
  hydraulikplan: {
    documentationKey: "hydraulicDiagram",
    storageDir: "hydraulikplaene",
    prefix: "hydraulikplan",
  },
  technisches_datenblatt: {
    documentationKey: "technicalDatasheet",
    storageDir: "technische-datenblaetter",
    prefix: "techn_datenblatt",
  },
};

function safeFilePart(value) {
  return String(value || "maschine")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function austrianToday() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear());
  return `${day}.${month}.${year}`;
}

function normalizeMachine(row) {
  if (!row) return row;
  return {
    ...row,
    geraetenummer: row.geraetenummer ?? null,
    serial_number: row.serial_nummer ?? null,
    image: row.kep ?? row.image ?? null,
    qr_code: row.qr_code ?? null,
    damage_status: row.schadensmeldung_status ?? null,
    description: row.beschreibung ?? null,
  };
}

async function saveDocumentFile(db, buffer, filename, storageDir, contentType) {
  const storagePath = `${storageDir}/${filename}`;
  const { error } = await db.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return db.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export async function POST(request, { params }) {
  if (!(await currentUserHasPermission("machines.write"))) {
    return NextResponse.json(
      { error: "Keine Berechtigung: machines.write erforderlich." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("document");
  const type = String(formData?.get("type") ?? "");
  const config = DOCUMENT_TYPES[type];

  if (!config) {
    return NextResponse.json({ error: "Unbekannter Dokumenttyp." }, { status: 400 });
  }

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Keine PDF-Datei gefunden." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Nur PDF-Dateien sind erlaubt." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Die Datei darf maximal 20 MB groß sein." }, { status: 400 });
  }

  const { data: machine, error: loadError } = await db
    .from(MACHINE_TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (loadError || !machine) {
    return NextResponse.json({ error: "Maschine nicht gefunden." }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const datePart = austrianToday();
  const baseName = machine.geraetenummer ?? id;
  const filename = `${safeFilePart(baseName)}_${config.prefix}_${safeFilePart(datePart)}_${safeFilePart(id)}.pdf`;
  const fileUrl = await saveDocumentFile(db, buffer, filename, config.storageDir, file.type);

  const tabData =
    machine.machine_tab_data && typeof machine.machine_tab_data === "object"
      ? machine.machine_tab_data
      : {};
  const documentation =
    tabData.documentation && typeof tabData.documentation === "object" && !Array.isArray(tabData.documentation)
      ? tabData.documentation
      : {};

  const nextMachineTabData = {
    ...tabData,
    ...(config.topLevelField ? { [config.topLevelField]: fileUrl } : {}),
    documentation: {
      ...documentation,
      [config.documentationKey]: fileUrl,
    },
  };

  const { data, error } = await db
    .from(MACHINE_TABLE)
    .update({ machine_tab_data: nextMachineTabData })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(normalizeMachine(data), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
