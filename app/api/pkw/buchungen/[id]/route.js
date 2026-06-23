import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { canAccessPkwService } from "../../../../../lib/pkw-permissions-server.mjs";
import {
  applyBuchungErsatzteile,
  assertSlotNotInPast,
  assertSlotWithinServiceHours,
  findFreePlatz,
  normalizeBuchungRow,
  normalizeKennzeichen,
  resolveBuchungFahrzeugLink,
} from "../../../../../lib/pkw-server.mjs";

export async function PATCH(request, { params }) {
  const canService = await canAccessPkwService("write");
  const canWarehouse = await currentUserHasPermission("warehouse.write");
  if (!canService && !canWarehouse) {
    return NextResponse.json(
      { error: "Keine Berechtigung: pkw.service.write oder warehouse.write" },
      { status: 403 }
    );
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
  if ("problem_text" in body) patch.problem_text = body.problem_text?.trim() || null;
  if ("kennzeichen" in body) patch.kennzeichen = normalizeKennzeichen(body.kennzeichen);
  if ("km_stand" in body) {
    patch.km_stand = body.km_stand != null && body.km_stand !== "" ? Number(body.km_stand) : null;
  }
  if ("fahrzeug_id" in body) patch.fahrzeug_id = body.fahrzeug_id || null;
  if ("kunde_id" in body) patch.kunde_id = body.kunde_id || null;
  if ("servicearten" in body) {
    patch.servicearten = Array.isArray(body.servicearten) ? body.servicearten : [];
  }
  if ("munkafolyamat" in body) {
    patch.munkafolyamat = Array.isArray(body.munkafolyamat) ? body.munkafolyamat : [];
  }
  if ("slot_start" in body) patch.slot_start = body.slot_start;
  if ("slot_end" in body) patch.slot_end = body.slot_end;

  const needsExisting =
    patch.slot_start ||
    patch.slot_end ||
    "kennzeichen" in body ||
    "fahrzeug_id" in body ||
    "kunde_id" in body ||
    Array.isArray(body.ersatzteile);

  const { data: existing } = needsExisting
    ? await db
        .from("pkw_buchungen")
        .select("slot_start, slot_end, kennzeichen, fahrzeug_id, kunde_id")
        .eq("id", id)
        .single()
    : { data: null };

  if (patch.slot_start && patch.slot_end) {
    try {
      assertSlotWithinServiceHours(patch.slot_start, patch.slot_end);
      if (patch.slot_start !== existing?.slot_start) assertSlotNotInPast(patch.slot_start);
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  } else if (patch.slot_start || patch.slot_end) {
    if (existing) {
      const start = patch.slot_start ?? existing.slot_start;
      const end = patch.slot_end ?? existing.slot_end;
      try {
        assertSlotWithinServiceHours(start, end);
        if (patch.slot_start && patch.slot_start !== existing.slot_start) {
          assertSlotNotInPast(patch.slot_start);
        }
      } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }
  }

  if (body.auto_platz && patch.slot_start) {
    const free = await findFreePlatz(db, patch.slot_start);
    if (free) patch.platz_nummer = free;
  }

  if (
    existing &&
    ("kennzeichen" in body || "fahrzeug_id" in body || "kunde_id" in body)
  ) {
    try {
      const link = await resolveBuchungFahrzeugLink(db, {
        fahrzeug_id: "fahrzeug_id" in body ? body.fahrzeug_id : existing.fahrzeug_id,
        kennzeichen: patch.kennzeichen ?? existing.kennzeichen,
        kunde_id: "kunde_id" in body ? body.kunde_id : existing.kunde_id,
      });
      patch.fahrzeug_id = link.fahrzeug_id;
      patch.kunde_id = link.kunde_id;
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  const fahrzeugIdForParts =
    patch.fahrzeug_id ?? existing?.fahrzeug_id ?? null;
  if (fahrzeugIdForParts && Array.isArray(body.ersatzteile)) {
    try {
      await applyBuchungErsatzteile(db, fahrzeugIdForParts, body.ersatzteile);
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
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

export async function DELETE(_request, { params }) {
  if (!(await canAccessPkwService("write"))) {
    return NextResponse.json(
      { error: "Keine Berechtigung: pkw.service.write" },
      { status: 403 }
    );
  }

  const db = getSupabaseAdmin();
  const id = (await params).id;
  if (!id) {
    return NextResponse.json({ error: "Termin-ID fehlt." }, { status: 400 });
  }

  const { data: existing, error: loadError } = await db
    .from("pkw_buchungen")
    .select("id, kennzeichen, slot_start")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Termin nicht gefunden." }, { status: 404 });
  }

  const { error } = await db.from("pkw_buchungen").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id, kennzeichen: existing.kennzeichen });
}
