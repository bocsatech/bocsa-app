import { NextResponse } from "next/server";
import { currentUserHasPermission, currentUserIsInGroup } from "../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  addGeraetenummerCode,
  loadGeraetenummerCodes,
} from "../../../../lib/geraetenummer-db.mjs";

export async function GET() {
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

  try {
    const codes = await loadGeraetenummerCodes(db);
    return NextResponse.json(codes);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Codes konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  if (!(await currentUserIsInGroup("Admin"))) {
    return NextResponse.json({ error: "Nur Admin." }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const category = String(body.category ?? "").trim();

  try {
    const codes = await addGeraetenummerCode(db, category, body);
    return NextResponse.json(codes);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Code konnte nicht gespeichert werden." },
      { status: 400 }
    );
  }
}
