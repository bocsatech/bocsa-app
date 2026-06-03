import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { canAccessPkwService } from "../../../../../lib/pkw-permissions-server.mjs";
import { findFreePlatz, normalizeBuchungRow } from "../../../../../lib/pkw-server.mjs";

export async function PATCH(request, { params }) {
  if (!(await canAccessPkwService("write"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.service.write" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  const id = (await params).id;
  const body = await request.json().catch(() => ({}));
  const patch = { updated_at: new Date().toISOString() };

  if ("status" in body) patch.status = body.status;
  if ("platz_nummer" in body) {
    patch.platz_nummer = body.platz_nummer != null ? Number(body.platz_nummer) : null;
  }
  if ("assigned_user_id" in body) patch.assigned_user_id = body.assigned_user_id || null;
  if ("internal_notes" in body) patch.internal_notes = body.internal_notes?.trim() || null;
  if ("slot_start" in body) patch.slot_start = body.slot_start;
  if ("slot_end" in body) patch.slot_end = body.slot_end;

  if (body.auto_platz && patch.slot_start) {
    const free = await findFreePlatz(db, patch.slot_start);
    if (free) patch.platz_nummer = free;
  }

  const { data, error } = await db
    .from("pkw_buchungen")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalizeBuchungRow(data));
}
