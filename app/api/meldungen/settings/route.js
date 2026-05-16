import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

const SETTINGS_KEY = "meldung";

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim() : "";
}

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

  const { data, error } = await db
    .from("app_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data?.value ?? { email: "" });
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
  const email = normalizeEmail(body.email);

  const { error } = await db
    .from("app_settings")
    .upsert(
      {
        key: SETTINGS_KEY,
        value: { email },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ email });
}
