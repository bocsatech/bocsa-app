import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { canAccessPkwService } from "../../../../lib/pkw-permissions-server.mjs";

/** Benutzerliste für Szerelő-Zuweisung (PKW-Service). */
export async function GET() {
  if (!(await canAccessPkwService("read"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.service.read" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });

  const { data, error } = await db
    .from("users")
    .select("id, username")
    .order("username", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
