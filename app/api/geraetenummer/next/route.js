import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  loadGeraetenummerCodes,
  previewNextGeraetenummer,
} from "../../../../lib/geraetenummer-db.mjs";
import { validateGeraetenummerPick } from "../../../../lib/geraetenummer.ts";

export async function GET(request) {
  if (!(await currentUserHasPermission("machines.read"))) {
    return NextResponse.json(
      { error: "Keine Berechtigung: machines.read erforderlich." },
      { status: 403 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const pick = {
    marke: searchParams.get("marke") ?? "",
    klasse: searchParams.get("klasse") ?? "",
    art: searchParams.get("art") ?? "",
  };

  try {
    const codes = await loadGeraetenummerCodes(db);
    const validationError = validateGeraetenummerPick(codes, pick);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const preview = await previewNextGeraetenummer(db, pick);
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Vorschau fehlgeschlagen." },
      { status: 500 }
    );
  }
}
