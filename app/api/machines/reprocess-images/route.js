import { NextResponse } from "next/server";
import { currentUserIsInGroup } from "../../../../lib/auth/permissions";
import { normalizeMachineImage } from "../../../../lib/machine-image.mjs";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 300;

const MACHINE_TABLE = "maschines";
const STORAGE_BUCKET = "machine-files";

function storagePathFromPublicUrl(publicUrl) {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

/** Admin: alle Maschinenbilder neu normalisieren (trim + cover, ohne Letterbox). */
export async function POST() {
  if (!(await currentUserIsInGroup("Admin"))) {
    return NextResponse.json({ error: "Nur Admin." }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const { data: machines, error } = await db
    .from(MACHINE_TABLE)
    .select("id, geraetenummer, kep")
    .not("kep", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];

  for (const machine of machines ?? []) {
    const label = machine.geraetenummer || machine.id;
    const storagePath = storagePathFromPublicUrl(machine.kep);

    if (!storagePath) {
      results.push({ id: machine.id, label, ok: false, error: "Unbekannte Bild-URL" });
      continue;
    }

    try {
      const response = await fetch(machine.kep, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = Buffer.from(await response.arrayBuffer());
      const normalized = await normalizeMachineImage(raw);

      const { error: uploadError } = await db.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, normalized, {
          contentType: "image/webp",
          upsert: true,
          cacheControl: "3600",
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const baseUrl = machine.kep.replace(/\?.*$/, "");
      const bustUrl = `${baseUrl}?v=${Date.now()}`;

      const { error: updateError } = await db
        .from(MACHINE_TABLE)
        .update({ kep: bustUrl })
        .eq("id", machine.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      results.push({ id: machine.id, label, ok: true });
    } catch (err) {
      results.push({
        id: machine.id,
        label,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  return NextResponse.json({
    total: results.length,
    ok,
    failed: failed.length,
    errors: failed.slice(0, 20),
  });
}
