import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  addGeraetenummerCode,
  loadGeraetenummerCodes,
  updateGeraetenummerCode,
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
  if (!(await currentUserHasPermission("machines.write"))) {
    return NextResponse.json(
      { error: "Keine Berechtigung: machines.write erforderlich." },
      { status: 403 }
    );
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

export async function PATCH(request) {
  if (!(await currentUserHasPermission("machines.write"))) {
    return NextResponse.json(
      { error: "Keine Berechtigung: machines.write erforderlich." },
      { status: 403 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const category = String(body.category ?? "").trim();
  const code = String(body.code ?? "").trim();

  try {
    const codes = await updateGeraetenummerCode(db, category, code, body);
    return NextResponse.json(codes);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Code konnte nicht aktualisiert werden.",
      },
      { status: 400 }
    );
  }
}
