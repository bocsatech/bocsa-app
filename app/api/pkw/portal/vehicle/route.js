import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

/** Öffentlich: Kennzeichen aus QR-Token (ohne Login) */
export async function GET(request) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token fehlt." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });

  const { data, error } = await db
    .from("pkw_fahrzeuge")
    .select("kennzeichen, marke, modell")
    .eq("qr_token", token)
    .eq("aktiv", true)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Fahrzeug nicht gefunden." }, { status: 404 });

  return NextResponse.json(data);
}
