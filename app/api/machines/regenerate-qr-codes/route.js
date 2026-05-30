import { NextResponse } from "next/server";
import { currentUserIsInGroup } from "../../../../lib/auth/permissions";
import { generateMachineQrCode } from "../../../../lib/qr-code.mjs";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 300;

const MACHINE_TABLE = "maschines";
const MACHINE_COLUMNS = "*";

function normalizeMachine(row) {
  if (!row) return row;
  return {
    ...row,
    geraetenummer: row.geraetenummer ?? null,
    qr_code: row.qr_code ?? null,
  };
}

/** Admin: alle Maschinen-QR-Codes neu generieren (Label = aktuelle Gerätenummer). */
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
    try {
      const { publicPath } = await generateMachineQrCode(machine, origin, { supabase: db });
      const bustUrl = `${publicPath.replace(/\?.*$/, "")}?v=${Date.now()}`;

      const { error: updateError } = await db
        .from(MACHINE_TABLE)
        .update({ qr_code: bustUrl })
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

  const ok = results.filter((entry) => entry.ok).length;
  const failed = results.filter((entry) => !entry.ok);

  return NextResponse.json({
    total: results.length,
    ok,
    failed: failed.length,
    errors: failed.slice(0, 20),
  });
}
