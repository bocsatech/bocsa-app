import { NextResponse } from "next/server";
import { getPkwPortalSession } from "../../../../../lib/auth/pkw-portal";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

export async function GET() {
  const session = await getPkwPortalSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ authenticated: true, fahrzeug: { kennzeichen: session.kennzeichen } });
  }

  const { data: fahrzeug } = await db
    .from("pkw_fahrzeuge")
    .select("id, kennzeichen, marke, modell, km_stand, kunde_id")
    .eq("id", session.fahrzeugId)
    .maybeSingle();

  return NextResponse.json({
    authenticated: true,
    fahrzeug: fahrzeug ?? { kennzeichen: session.kennzeichen },
    kundeId: session.kundeId,
  });
}
