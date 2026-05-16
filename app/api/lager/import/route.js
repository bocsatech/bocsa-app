import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../lib/auth/permissions";
import { importLagerRecords, parseLagerSpreadsheet } from "../../../../lib/lager-import.mjs";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

export async function POST(request) {
  if (!(await currentUserHasPermission("warehouse.write"))) {
    return NextResponse.json(
      { error: "Keine Berechtigung: warehouse.write erforderlich." },
      { status: 403 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Keine Datei gefunden." }, { status: 400 });
  }

  const filename = file.name || "import.xlsx";
  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return NextResponse.json(
      { error: "Nur Excel (.xlsx, .xls) oder CSV (.csv) sind erlaubt." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Die Datei darf maximal 15 MB groß sein." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { records, errors: parseErrors, sheetName } = parseLagerSpreadsheet(buffer, filename);

    if (!records.length) {
      return NextResponse.json(
        {
          error: "Keine gültigen Zeilen gefunden.",
          parseErrors,
        },
        { status: 400 }
      );
    }

    const result = await importLagerRecords(db, records);

    return NextResponse.json({
      sheetName,
      totalRows: records.length,
      imported: result.imported,
      updated: result.updated,
      parseErrors,
      importErrors: result.errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Import fehlgeschlagen.",
      },
      { status: 500 }
    );
  }
}
