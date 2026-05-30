import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { pkwSupabaseErrorResponse } from "../../../../lib/pkw-server.mjs";

export async function GET() {
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });

  const { data, error } = await db
    .from("pkw_servicearten")
    .select("*")
    .eq("aktiv", true)
    .order("sort_order", { ascending: true });

  if (error) return pkwSupabaseErrorResponse(error) ?? NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
