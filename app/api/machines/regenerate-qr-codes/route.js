import { NextResponse } from "next/server";
import { currentUserIsInGroup } from "../../../../lib/auth/permissions";
import { isStructuredGeraetenummer } from "../../../../lib/geraetenummer.ts";
import { persistMachineQrCode } from "../../../../lib/machine-qr.mjs";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 300;

const MACHINE_TABLE = "maschines";
const MACHINE_COLUMNS = "*";

/** Admin: QR-Codes für alle Maschinen mit neuem Gerätenummer-Format neu generieren. */
export async function POST(request) {
  if (!(await currentUserIsInGroup("Admin"))) {
    return NextResponse.json({ error: "Nur Admin." }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const { data: machines, error } = await db
    .from(MACHINE_TABLE)
    .select(MACHINE_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const origin = request.headers.get("origin") ?? undefined;
  const results = [];

  for (const machine of machines ?? []) {
    const label = machine.geraetenummer || machine.id;

    if (!isStructuredGeraetenummer(machine.geraetenummer)) {
      results.push({
        id: machine.id,
        label,
        ok: false,
        skipped: true,
        error: "Kein gültiges Format (MARKE-KLASSE-ART-00001).",
      });
      continue;
    }

    try {
      const bustUrl = await persistMachineQrCode(db, machine, origin);
      results.push({ id: machine.id, label, ok: true, qr_code: bustUrl });
    } catch (err) {
      results.push({
        id: machine.id,
        label,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const ok = results.filter((entry) => entry.ok).length;
  const skipped = results.filter((entry) => entry.skipped).length;
  const failed = results.filter((entry) => !entry.ok && !entry.skipped);

  return NextResponse.json({
    total: results.length,
    ok,
    skipped,
    failed: failed.length,
    errors: [...failed, ...results.filter((e) => e.skipped)].slice(0, 30),
  });
}
