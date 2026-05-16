import { NextResponse } from "next/server";
import { currentUserCanWriteHours, resolveHoursUsername } from "../../../../lib/auth/hours";
import { getCurrentSession } from "../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

const EINTRAEGE = "arbeitsstunden_eintraege";

export async function DELETE(_request, { params }) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!(await currentUserCanWriteHours())) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const id = (await params)?.id;
  if (!id) {
    return NextResponse.json({ error: "ID fehlt." }, { status: 400 });
  }

  const { data: row, error: loadErr } = await db
    .from(EINTRAEGE)
    .select("id, username, quelle")
    .eq("id", id)
    .maybeSingle();

  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Eintrag nicht gefunden." }, { status: 404 });
  if (row.quelle !== "manuell") {
    return NextResponse.json(
      { error: "Protokoll-Einträge nur über „Protokolle übernehmen“ änderbar." },
      { status: 400 }
    );
  }

  const allowed = await resolveHoursUsername(row.username);
  if (!allowed) {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 403 });
  }

  const { error } = await db.from(EINTRAEGE).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
